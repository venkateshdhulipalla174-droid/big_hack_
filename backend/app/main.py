import os
from dotenv import load_dotenv

# Load environment variables before reading any configuration
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")
print("Groq key loaded:", bool(os.getenv("GROQ_API_KEY")))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.chat import router as chat_router
from .api.health import router as health_router

app = FastAPI(
    title="K-SMART API",
    version="0.1.0",
    description="Kannada Semantic-preserving Minimization and Adaptive Representation Technique API",
)

# Parse CORS origins from environment variable, ensuring local frontend origins are always permitted
cors_origins_env = os.getenv(
    "BACKEND_CORS_ORIGINS",
    "http://127.0.0.1:5173,http://localhost:5173,http://localhost:3000",
)
allowed_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
for default_origin in ["http://127.0.0.1:5173", "http://localhost:5173", "http://localhost:3000"]:
    if default_origin not in allowed_origins:
        allowed_origins.append(default_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(health_router, prefix="/api")
app.include_router(health_router, prefix="/api/v1")
app.include_router(chat_router)
app.include_router(chat_router, prefix="/api")
app.include_router(chat_router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "ksmart-backend",
        "version": "0.1.0",
    }
