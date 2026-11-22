import hashlib
import os
import logging

logger = logging.getLogger(__name__)
import time
from dataclasses import dataclass
from typing import Any, Optional

from google import genai
from google.genai import errors, types


@dataclass(frozen=True)
class LLMTokenUsage:
    """Token usage metrics extracted directly from Gemini usage metadata."""
    prompt_tokens: int = 0
    output_tokens: int = 0
    thinking_tokens: int = 0
    total_tokens: int = 0


@dataclass(frozen=True)
class GeminiResult:
    """Structured result returned from Gemini generation."""
    text: str
    model: str
    latency_ms: float
    usage: LLMTokenUsage
    finish_reason: str = "STOP"


class GeminiServiceError(Exception):
    """Base error for Gemini service with standard machine-readable codes."""
    def __init__(self, message: str, code: str = "llm_unavailable", retry_after_s: Optional[float] = None):
        super().__init__(message)
        self.code = code
        self.retry_after_s = retry_after_s


class GeminiConfigError(GeminiServiceError):
    """Raised when GEMINI_API_KEY environment variable is missing or empty."""
    def __init__(self, message: str = "GEMINI_API_KEY environment variable is not configured"):
        super().__init__(message, code="llm_unavailable")


class GeminiTimeoutError(GeminiServiceError):
    """Raised when request exceeds configured timeout."""
    def __init__(self, message: str = "Gemini request exceeded timeout"):
        super().__init__(message, code="llm_timeout")


class GeminiRateLimitError(GeminiServiceError):
    """Raised when rate limit/quota is exceeded (HTTP 429)."""
    def __init__(self, message: str = "Gemini rate limit exceeded", retry_after_s: Optional[float] = None):
        super().__init__(message, code="rate_limited", retry_after_s=retry_after_s)


class GeminiAPIError(GeminiServiceError):
    """Raised on non-retryable or persistent Gemini API errors."""
    def __init__(self, message: str, code: str = "llm_unavailable", status_code: Optional[int] = None):
        super().__init__(message, code=code)
        self.status_code = status_code


class GeminiService:
    """Service wrapper for Google Gemini API via official google-genai SDK."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: float = 60.0,
        max_retries: int = 3,
        base_retry_delay: float = 0.5,
        max_retry_delay: float = 5.0,
    ):
        raw_key = api_key if api_key is not None else os.getenv("GEMINI_API_KEY", "")
        self._api_key = raw_key.strip()
        self.model = (model or os.getenv("GEMINI_MODEL", "gemini-2.5-flash")).strip()
        self.timeout = timeout
        self.max_retries = max_retries
        self.base_retry_delay = base_retry_delay
        self.max_retry_delay = max_retry_delay
        self._token_cache: dict[str, int] = {}
        self._client: Optional[genai.Client] = None

    def __repr__(self) -> str:
        # Mask API key to guarantee it is never exposed in logs or debugger inspections
        configured = bool(self._api_key)
        return f"GeminiService(model={self.model!r}, configured={configured}, timeout={self.timeout})"

    def __str__(self) -> str:
        return self.__repr__()

    def is_configured(self) -> bool:
        """Returns True if a non-empty API key is present."""
        return bool(self._api_key)

    def _get_client(self) -> genai.Client:
        """Instantiates or returns the cached SDK client with real timeout configured."""
        if not self.is_configured():
            raise GeminiConfigError()

        if self._client is None:
            # Configure real SDK request timeout in milliseconds
            timeout_ms = int(self.timeout * 1000)
            http_options = types.HttpOptions(timeout=timeout_ms)
            self._client = genai.Client(
                api_key=self._api_key,
                http_options=http_options,
            )
        return self._client

    @property
    def client(self) -> genai.Client:
        """Safely exposes the lazily initialized official SDK client."""
        return self._get_client()

    def _is_transient_error(self, err: Exception) -> tuple[bool, Optional[float]]:
        """
        Determines whether an error is transient and eligible for retry.
        Retries ONLY 429 and 5xx errors, plus network timeouts/connection resets.
        Returns (is_retryable, retry_after_s).
        """
        if isinstance(err, errors.APIError):
            code = getattr(err, "code", None)
            if code == 429:
                return True, None
            if code is not None and 500 <= code <= 599:
                return True, None
            return False, None

        if isinstance(err, (TimeoutError, ConnectionError)):
            return True, None

        err_type_name = type(err).__name__.lower()
        if "timeout" in err_type_name or "connect" in err_type_name:
            return True, None

        return False, None

    def generate(
        self,
        prompt: str,
        temperature: float = 0.0,
    ) -> GeminiResult:
        """
        Generates response using Gemini API with retry logic, latency measurement,
        and usage metadata extraction.
        """
        if not prompt or not prompt.strip():
            raise ValueError("Prompt must be a non-empty string")

        client = self._get_client()

        config = types.GenerateContentConfig(
            temperature=temperature,
        )

        attempts = 0
        last_error: Optional[Exception] = None

        while attempts < self.max_retries:
            attempts += 1
            start_time = time.perf_counter()
            try:
                response = client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=config,
                )
                latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

                # Extract generated text safely
                text = ""
                finish_reason = "STOP"
                if response and response.candidates:
                    candidate = response.candidates[0]
                    finish_reason = getattr(candidate, "finish_reason", "STOP")
                    if candidate.content and candidate.content.parts:
                        text_parts = [
                            part.text for part in candidate.content.parts
                            if getattr(part, "text", None) is not None
                        ]
                        text = "".join(text_parts)
                elif hasattr(response, "text") and response.text:
                    text = response.text

                # Extract token usage metadata from response
                usage_meta = getattr(response, "usage_metadata", None)
                if usage_meta is not None:
                    prompt_tokens = getattr(usage_meta, "prompt_token_count", 0) or 0
                    output_tokens = getattr(usage_meta, "candidates_token_count", 0) or 0
                    thinking_tokens = getattr(usage_meta, "thoughts_token_count", 0) or 0
                    total_tokens = getattr(usage_meta, "total_token_count", 0) or 0
                    usage = LLMTokenUsage(
                        prompt_tokens=prompt_tokens,
                        output_tokens=output_tokens,
                        thinking_tokens=thinking_tokens,
                        total_tokens=total_tokens,
                    )
                else:
                    usage = LLMTokenUsage()

                return GeminiResult(
                    text=text,
                    model=self.model,
                    latency_ms=latency_ms,
                    usage=usage,
                    finish_reason=str(finish_reason),
                )

            except Exception as err:
                last_error = err
                is_transient, retry_after = self._is_transient_error(err)

                if is_transient and attempts < self.max_retries:
                    # Bounded exponential backoff: delay = min(base * 2^(attempt-1), max)
                    delay = retry_after if retry_after is not None else min(
                        self.base_retry_delay * (2 ** (attempts - 1)),
                        self.max_retry_delay,
                    )
                    time.sleep(delay)
                    continue

                # Not retryable or max retries reached: map to standard exceptions
                self._map_and_raise_error(err)

        if last_error:
            self._map_and_raise_error(last_error)
        raise GeminiServiceError("Generation failed after retries")

    def count_tokens(self, text: str) -> int:
        """
        Counts exact tokens using the official Gemini countTokens API.
        Results are cached by SHA-256 of text (K-SMART API Contract Rule 7).
        Never fabricates counts on failure.
        """
        if not text:
            return 0

        # Check in-memory SHA-256 cache
        cache_key = hashlib.sha256(text.encode("utf-8")).hexdigest()
        if cache_key in self._token_cache:
            return self._token_cache[cache_key]

        client = self._get_client()

        try:
            resp = client.models.count_tokens(
                model=self.model,
                contents=text,
            )
            total = getattr(resp, "total_tokens", None)
            if total is None:
                raise GeminiServiceError(
                    "Gemini API did not return total_tokens in countTokens response",
                    code="llm_unavailable",
                )
            self._token_cache[cache_key] = int(total)
            return int(total)
        except GeminiServiceError:
            raise
        except Exception as err:
            self._map_and_raise_error(err)

    def _map_and_raise_error(self, err: Exception) -> None:
        """Maps SDK/HTTP exceptions to K-SMART standardized errors without leaking secrets."""
        err_msg = str(err)
        # Redact any accidental API key occurrences in error string
        if self._api_key and self._api_key in err_msg:
            err_msg = err_msg.replace(self._api_key, "[REDACTED_API_KEY]")
            logger.error(
            "Gemini request failed | type=%s | status=%s | detail=%s",
            type(err).__name__,
            getattr(err, "code", None),
            err_msg,
        )

        if isinstance(err, errors.APIError):
            code = getattr(err, "code", None)
            if code == 429:
                raise GeminiRateLimitError(
                    message="Gemini rate limit exceeded (quota exhausted)",
                ) from None
            if code == 504 or "timeout" in err_msg.lower():
                raise GeminiTimeoutError(
                    message=f"Gemini request timed out: {err_msg}",
                ) from None
            raise GeminiAPIError(
                message=f"Gemini API error ({code}): {err_msg}",
                code="llm_unavailable",
                status_code=code,
            ) from None

        err_type = type(err).__name__.lower()
        if "timeout" in err_type:
            raise GeminiTimeoutError(
                message=f"Gemini request timed out: {err_msg}",
            ) from None

        raise GeminiServiceError(
            message=f"Gemini service error: {err_msg}",
            code="llm_unavailable",
        ) from None
