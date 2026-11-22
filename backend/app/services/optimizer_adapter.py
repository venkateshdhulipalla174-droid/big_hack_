"""Adapter module integrating Member 3's K-SMART prompt optimization pipeline."""

import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

# Ensure core package directory is in sys.path when running standalone or via uvicorn
_core_dir = Path(__file__).resolve().parents[2] / "core"
if _core_dir.is_dir() and str(_core_dir) not in sys.path:
    sys.path.insert(0, str(_core_dir))

from ksmart.config import PipelineConfig
from ksmart.pipeline import PipelineResult, optimize as ksmart_optimize

from ..schemas import CandidateInfo
from .gemini_client import GeminiService


@dataclass(frozen=True)
class OptimizerResult:
    """Standardized result produced by the optimizer adapter."""
    optimized_prompt: str
    chosen_candidate: str
    original_input_tokens: Optional[int]
    optimized_input_tokens: Optional[int]
    tokens_saved: Optional[int]
    saved_percent: Optional[float]
    latency_ms: float
    fallback_used: bool
    candidates: List[CandidateInfo] = field(default_factory=list)


def run_optimizer(
    prompt: str,
    gemini_service: GeminiService,
    include_candidates: bool = True,
) -> OptimizerResult:
    """
    Executes Member 3's K-SMART optimization pipeline using the existing GeminiService client.

    If Gemini is not configured, or if the optimizer pipeline throws any exception,
    safely falls back to the original prompt with fallback_used=True without crashing.
    """
    start_time = time.perf_counter()

    # If Gemini is not configured, fall back immediately without failing
    # (The generation call will surface the appropriate 502 error)
    if not gemini_service.is_configured():
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        candidates = []
        if include_candidates:
            candidates = [
                CandidateInfo(
                    name="original",
                    text=prompt,
                    tokens=None,
                    guard_passed=True,
                    guard_failures=[],
                )
            ]
        return OptimizerResult(
            optimized_prompt=prompt,
            chosen_candidate="original",
            original_input_tokens=None,
            optimized_input_tokens=None,
            tokens_saved=None,
            saved_percent=None,
            latency_ms=elapsed_ms,
            fallback_used=True,
            candidates=candidates,
        )

    try:
        config = PipelineConfig(tokenizer=gemini_service.model)
        result: PipelineResult = ksmart_optimize(
            prompt=prompt,
            client=gemini_service.client,
            config=config,
        )
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        meta = result.metadata or {}
        orig_tokens = meta.get("original_token_count")
        opt_tokens = meta.get("optimized_token_count")
        tokens_saved = meta.get("tokens_saved")
        saved_percent = meta.get("percentage_saved")

        candidates: List[CandidateInfo] = []
        if include_candidates:
            # Baseline original candidate
            candidates.append(
                CandidateInfo(
                    name="original",
                    text=prompt,
                    tokens=orig_tokens,
                    guard_passed=True,
                    guard_failures=[],
                )
            )
            # Winning candidate if different from original
            if result.candidate.strategy != "original":
                candidates.append(
                    CandidateInfo(
                        name=result.candidate.strategy,
                        text=result.candidate.text,
                        tokens=opt_tokens,
                        guard_passed=True,
                        guard_failures=[],
                    )
                )

        return OptimizerResult(
            optimized_prompt=result.candidate.text,
            chosen_candidate=result.candidate.strategy,
            original_input_tokens=orig_tokens,
            optimized_input_tokens=opt_tokens,
            tokens_saved=tokens_saved,
            saved_percent=saved_percent,
            latency_ms=elapsed_ms,
            fallback_used=False,
            candidates=candidates,
        )

    except Exception:
        # Fall back cleanly to the original prompt on any optimizer exception
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        raw_tokens = None
        try:
            raw_tokens = gemini_service.count_tokens(prompt)
        except Exception:
            raw_tokens = None

        candidates = []
        if include_candidates:
            candidates = [
                CandidateInfo(
                    name="original",
                    text=prompt,
                    tokens=raw_tokens,
                    guard_passed=True,
                    guard_failures=[],
                )
            ]

        return OptimizerResult(
            optimized_prompt=prompt,
            chosen_candidate="original",
            original_input_tokens=raw_tokens,
            optimized_input_tokens=raw_tokens,
            tokens_saved=0 if raw_tokens is not None else None,
            saved_percent=0.0 if raw_tokens is not None else None,
            latency_ms=elapsed_ms,
            fallback_used=True,
            candidates=candidates,
        )
