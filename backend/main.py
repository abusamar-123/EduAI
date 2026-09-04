"""
EduAI - FastAPI Backend
Main application entry point.

Run with: uvicorn main:app --reload --port 8000
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routes.auth import router as auth_router
from routes.doubt import router as doubt_router
from routes.questions import router as questions_router

# ── App Setup ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="EduAI",
    description="AI-powered Science tutor for CBSE Class 9 students and teachers",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(doubt_router)
app.include_router(questions_router)


# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "app": "EduAI",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    from routes.doubt import rag_status
    rag = rag_status()
    return {
        "api": "healthy",
        "rag": rag,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
