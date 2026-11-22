from typing import List, Optional
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """K-SMART chat request schema per API Contract v1."""
    prompt: str = Field(
        ...,
        min_length=1,
        max_length=4000,
        description="Non-empty user prompt in Kannada or English (max 4000 chars)",
    )
    optimize: bool = Field(
        default=True,
        description="Default true. false = baseline run (experiment E0)",
    )
    include_candidates: bool = Field(
        default=True,
        description="Default true. false = smaller response without candidate breakdown",
    )
    mode: Optional[str] = Field(
        default="adaptive",
        description="Optional optimization mode from frontend (e.g. adaptive)",
    )


class CandidateInfo(BaseModel):
    """Candidate representation detail."""
    name: str
    text: str
    tokens: Optional[int] = None
    guard_passed: bool = True
    guard_failures: List[str] = Field(default_factory=list)


class TokenMetrics(BaseModel):
    """Granular token counts per K-SMART API Contract v1 Rule 1 & 2."""
    tokenizer: str = "gemini-countTokens"
    original_input: Optional[int] = None
    optimized_input: Optional[int] = None
    saved: Optional[int] = None
    saved_percent: Optional[float] = None
    llm_prompt_tokens: Optional[int] = None
    llm_output_tokens: Optional[int] = None
    llm_thinking_tokens: Optional[int] = None
    llm_total_tokens: Optional[int] = None


class LatencyMetrics(BaseModel):
    """Segmented execution latency in milliseconds."""
    optimizer: Optional[float] = None
    llm: Optional[float] = None
    total: Optional[float] = None


class ErrorDetail(BaseModel):
    """Standardized machine-readable error payload."""
    code: str
    message: str
    retry_after_s: Optional[float] = None


class ChatResponse(BaseModel):
    """K-SMART v1 response envelope (with backward-compatible prompt field)."""
    prompt: str
    original_prompt: str
    optimized_prompt: str
    chosen_candidate: str = "original"
    candidates: List[CandidateInfo] = Field(default_factory=list)
    tokens: TokenMetrics
    response: Optional[str] = None
    latency_ms: LatencyMetrics
    model: str
    error: Optional[ErrorDetail] = None


class ErrorResponse(BaseModel):
    """Standard error response format matching API Contract v1."""
    error: ErrorDetail
