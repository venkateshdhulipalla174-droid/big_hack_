from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from ..schemas import (
    CandidateInfo,
    ChatRequest,
    ChatResponse,
    LatencyMetrics,
    TokenMetrics,
)
from ..services.gemini_client import (
    GeminiConfigError,
    GeminiRateLimitError,
    GeminiService,
    GeminiServiceError,
    GeminiTimeoutError,
)
from ..services.optimizer_adapter import run_optimizer

router = APIRouter()
gemini_service = GeminiService()


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    """
    K-SMART chat endpoint per API Contract v1.
    Integrates Member 3's K-SMART optimizer with Member 2's Gemini service.
    """
    cleaned_prompt = request.prompt.strip()
    if not cleaned_prompt:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "invalid_request",
                    "message": "Prompt cannot be empty or whitespace",
                    "retry_after_s": None,
                }
            },
        )

    # 1. Prompt optimization phase
    if request.optimize:
        opt_result = run_optimizer(
            prompt=cleaned_prompt,
            gemini_service=gemini_service,
            include_candidates=request.include_candidates,
        )
        processed_prompt = opt_result.optimized_prompt
        chosen_candidate = opt_result.chosen_candidate
        candidates = opt_result.candidates
        optimizer_latency_ms = opt_result.latency_ms
        orig_tokens = opt_result.original_input_tokens
        opt_tokens = opt_result.optimized_input_tokens
        saved_tokens = opt_result.tokens_saved
        saved_pct = opt_result.saved_percent
    else:
        # Optimization bypassed (E0 baseline run)
        processed_prompt = cleaned_prompt
        chosen_candidate = "original"
        optimizer_latency_ms = 0.0

        raw_tokens = None
        try:
            raw_tokens = gemini_service.count_tokens(cleaned_prompt)
        except Exception:
            raw_tokens = None

        orig_tokens = raw_tokens
        opt_tokens = raw_tokens
        saved_tokens = 0 if raw_tokens is not None else None
        saved_pct = 0.0 if raw_tokens is not None else None

        candidates = []
        if request.include_candidates:
            candidates = [
                CandidateInfo(
                    name="original",
                    text=cleaned_prompt,
                    tokens=raw_tokens,
                    guard_passed=True,
                    guard_failures=[],
                )
            ]

    # 2. Call Gemini generation with the processed prompt
    try:
        result = gemini_service.generate(prompt=processed_prompt, temperature=0.0)
    except GeminiRateLimitError as err:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": {
                    "code": "rate_limited",
                    "message": "Gemini rate limit exceeded. Please retry later.",
                    "retry_after_s": getattr(err, "retry_after_s", None),
                }
            },
        )
    except GeminiTimeoutError:
        return JSONResponse(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            content={
                "error": {
                    "code": "llm_timeout",
                    "message": "Gemini did not respond within timeout (60s)",
                    "retry_after_s": None,
                }
            },
        )
    except GeminiConfigError:
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={
                "error": {
                    "code": "llm_unavailable",
                    "message": "Gemini API key is not configured on the backend",
                    "retry_after_s": None,
                }
            },
        )
    except GeminiServiceError:
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={
                "error": {
                    "code": "llm_unavailable",
                    "message": "Gemini API service is currently unavailable",
                    "retry_after_s": None,
                }
            },
        )
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "optimizer_error",
                    "message": "An unexpected server error occurred",
                    "retry_after_s": None,
                }
            },
        )

    # 3. Assemble TokenMetrics and LatencyMetrics per Contract v1
    token_metrics = TokenMetrics(
        tokenizer="gemini-countTokens",
        original_input=orig_tokens,
        optimized_input=opt_tokens,
        saved=saved_tokens,
        saved_percent=saved_pct,
        llm_prompt_tokens=result.usage.prompt_tokens,
        llm_output_tokens=result.usage.output_tokens,
        llm_thinking_tokens=result.usage.thinking_tokens,
        llm_total_tokens=result.usage.total_tokens,
    )

    total_latency = round(optimizer_latency_ms + result.latency_ms, 2)
    latency_metrics = LatencyMetrics(
        optimizer=optimizer_latency_ms,
        llm=result.latency_ms,
        total=total_latency,
    )

    return ChatResponse(
        prompt=processed_prompt,
        original_prompt=cleaned_prompt,
        optimized_prompt=processed_prompt,
        chosen_candidate=chosen_candidate,
        candidates=candidates,
        tokens=token_metrics,
        response=result.text,
        latency_ms=latency_metrics,
        model=result.model,
        error=None,
    )
