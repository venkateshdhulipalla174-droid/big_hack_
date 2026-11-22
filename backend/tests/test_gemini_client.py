from unittest.mock import MagicMock, patch

import pytest
from google.genai import errors

from app.services.gemini_client import (
    GeminiConfigError,
    GeminiRateLimitError,
    GeminiResult,
    GeminiService,
    GeminiServiceError,
    GeminiTimeoutError,
    LLMTokenUsage,
)


def _create_mock_response(
    text: str = "Test response text",
    prompt_tokens: int = 15,
    output_tokens: int = 40,
    thinking_tokens: int = 0,
    total_tokens: int = 55,
    finish_reason: str = "STOP",
):
    """Helper to create a structured mock Gemini response."""
    mock_resp = MagicMock()
    mock_part = MagicMock()
    mock_part.text = text

    mock_candidate = MagicMock()
    mock_candidate.content.parts = [mock_part]
    mock_candidate.finish_reason = finish_reason

    mock_resp.candidates = [mock_candidate]
    mock_resp.text = text

    mock_usage = MagicMock()
    mock_usage.prompt_token_count = prompt_tokens
    mock_usage.candidates_token_count = output_tokens
    mock_usage.thoughts_token_count = thinking_tokens
    mock_usage.total_token_count = total_tokens
    mock_resp.usage_metadata = mock_usage

    return mock_resp


def test_service_init_and_repr_safe():
    dummy_key = "secret-super-private-api-key-12345"
    service = GeminiService(api_key=dummy_key, model="gemini-2.5-flash")

    assert service.is_configured() is True
    assert service.model == "gemini-2.5-flash"

    # API key secrecy: assert key is never present in string representations
    assert dummy_key not in repr(service)
    assert dummy_key not in str(service)


def test_generate_missing_api_key():
    service = GeminiService(api_key="")
    assert service.is_configured() is False

    with pytest.raises(GeminiConfigError) as exc_info:
        service.generate("Hello")
    assert exc_info.value.code == "llm_unavailable"


def test_generate_empty_prompt():
    service = GeminiService(api_key="valid-dummy-key")
    with pytest.raises(ValueError, match="Prompt must be a non-empty string"):
        service.generate("   ")


@patch("google.genai.Client")
def test_generate_success_with_tokens_and_latency(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    mock_response = _create_mock_response(
        text="ಕ್ವಾಂಟಮ್ ಕಂಪ್ಯೂಟಿಂಗ್",
        prompt_tokens=20,
        output_tokens=50,
        thinking_tokens=5,
        total_tokens=75,
    )
    mock_client.models.generate_content.return_value = mock_response

    service = GeminiService(api_key="valid-dummy-key", model="gemini-2.5-flash")
    result = service.generate("ಕ್ವಾಂಟಮ್ ಎಂದರೇನು?")

    assert isinstance(result, GeminiResult)
    assert result.text == "ಕ್ವಾಂಟಮ್ ಕಂಪ್ಯೂಟಿಂಗ್"
    assert result.model == "gemini-2.5-flash"
    assert result.latency_ms >= 0
    assert result.finish_reason == "STOP"

    # Usage metadata verification
    assert isinstance(result.usage, LLMTokenUsage)
    assert result.usage.prompt_tokens == 20
    assert result.usage.output_tokens == 50
    assert result.usage.thinking_tokens == 5
    assert result.usage.total_tokens == 75

    # Check SDK call config
    mock_client.models.generate_content.assert_called_once()
    call_kwargs = mock_client.models.generate_content.call_args.kwargs
    assert call_kwargs["model"] == "gemini-2.5-flash"
    assert call_kwargs["contents"] == "ಕ್ವಾಂಟಮ್ ಎಂದರೇನು?"
    assert call_kwargs["config"].temperature == 0.0


@patch("google.genai.Client")
def test_generate_empty_response(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    mock_resp = MagicMock()
    mock_resp.candidates = []
    mock_resp.text = ""
    mock_resp.usage_metadata = None
    mock_client.models.generate_content.return_value = mock_resp

    service = GeminiService(api_key="valid-dummy-key")
    result = service.generate("Hello")

    assert result.text == ""
    assert result.usage.total_tokens == 0


@patch("google.genai.Client")
def test_generate_transient_retry_success(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    # First attempt: 429 rate limit error; Second attempt: Success
    error_429 = errors.APIError(429, "Rate limit exceeded")
    success_resp = _create_mock_response(text="Recovered from 429")

    mock_client.models.generate_content.side_effect = [error_429, success_resp]

    service = GeminiService(
        api_key="valid-dummy-key",
        max_retries=3,
        base_retry_delay=0.01,
    )
    result = service.generate("Prompt")

    assert result.text == "Recovered from 429"
    assert mock_client.models.generate_content.call_count == 2


@patch("google.genai.Client")
def test_generate_non_transient_error_fails_immediately(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    # 400 Bad Request error is not transient
    error_400 = errors.APIError(400, "Bad Request: invalid argument")
    mock_client.models.generate_content.side_effect = error_400

    service = GeminiService(
        api_key="valid-dummy-key",
        max_retries=3,
        base_retry_delay=0.01,
    )

    with pytest.raises(GeminiServiceError):
        service.generate("Prompt")

    # Must NOT retry non-transient 400 error
    assert mock_client.models.generate_content.call_count == 1


@patch("google.genai.Client")
def test_generate_rate_limit_exhausted(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    error_429 = errors.APIError(429, "Resource exhausted")
    mock_client.models.generate_content.side_effect = error_429

    service = GeminiService(
        api_key="valid-dummy-key",
        max_retries=2,
        base_retry_delay=0.01,
    )

    with pytest.raises(GeminiRateLimitError) as exc_info:
        service.generate("Prompt")

    assert exc_info.value.code == "rate_limited"
    assert mock_client.models.generate_content.call_count == 2


@patch("google.genai.Client")
def test_generate_timeout_error(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    mock_client.models.generate_content.side_effect = TimeoutError("Request timed out after 60s")

    service = GeminiService(
        api_key="valid-dummy-key",
        max_retries=1,
    )

    with pytest.raises(GeminiTimeoutError) as exc_info:
        service.generate("Prompt")

    assert exc_info.value.code == "llm_timeout"


@patch("google.genai.Client")
def test_count_tokens_exact_and_cached(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    mock_count_resp = MagicMock()
    mock_count_resp.total_tokens = 24
    mock_client.models.count_tokens.return_value = mock_count_resp

    service = GeminiService(api_key="valid-dummy-key")
    prompt = "ಕ್ವಾಂಟಮ್ ಕಂಪ್ಯೂಟಿಂಗ್"

    # First call: calls SDK
    tokens1 = service.count_tokens(prompt)
    assert tokens1 == 24
    assert mock_client.models.count_tokens.call_count == 1

    # Second call with same text: hits cache, 0 extra SDK calls
    tokens2 = service.count_tokens(prompt)
    assert tokens2 == 24
    assert mock_client.models.count_tokens.call_count == 1

    # Empty text returns 0 without calling SDK
    assert service.count_tokens("") == 0
    assert mock_client.models.count_tokens.call_count == 1


@patch("google.genai.Client")
def test_count_tokens_failure_never_fabricates(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    mock_client.models.count_tokens.side_effect = errors.APIError(500, "Internal Server Error")

    service = GeminiService(api_key="valid-dummy-key")

    with pytest.raises(GeminiServiceError):
        service.count_tokens("Some text")


@patch("google.genai.Client")
def test_secret_leakage_safety_in_error_message(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    leaky_key = "super-secret-gemini-key-xyz"
    # Simulate an error string that accidentally includes the raw API key
    error_with_key = errors.APIError(500, f"Error with key {leaky_key} failed to authorize")
    mock_client.models.generate_content.side_effect = error_with_key

    service = GeminiService(api_key=leaky_key, max_retries=1)

    with pytest.raises(GeminiServiceError) as exc_info:
        service.generate("Prompt")

    # Assert raw key is redacted and never in exception string
    err_text = str(exc_info.value)
    assert leaky_key not in err_text
    assert "[REDACTED_API_KEY]" in err_text
