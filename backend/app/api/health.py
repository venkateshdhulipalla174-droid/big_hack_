import os
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health():
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    return {
        "status": "ok",
        "service": "ksmart-backend",
        "gemini_configured": bool(api_key),
        "model": model,
    }
