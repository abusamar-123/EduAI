"""
EduAI - Doubt Routes
Handles student and teacher doubt answering via RAG + Claude.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from services.auth_service import get_current_user, TokenData
from services.rag_service import rag_service
from services.claude_service import answer_doubt

router = APIRouter(prefix="/doubt", tags=["Doubt Answering"])


# ── Request/Response Models ───────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class DoubtRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=1000)
    chat_history: Optional[List[ChatMessage]] = []
    subject_filter: Optional[str] = None   # Physics / Chemistry / Biology
    chapter_filter: Optional[int] = None   # chapter number

class DoubtResponse(BaseModel):
    answer: str
    sources: List[dict]
    question: str


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/ask", response_model=DoubtResponse)
def ask_doubt(
    request: DoubtRequest,
    current_user: TokenData = Depends(get_current_user)
):
    """
    Answer a Science doubt using RAG + Claude.
    Available to both students and teachers.
    """
    try:
        # Step 1: Retrieve relevant chunks from ChromaDB
        chunks = rag_service.retrieve(
            query=request.question,
            n_results=5,
            subject_filter=request.subject_filter,
            chapter_filter=request.chapter_filter,
        )

        if not chunks:
            return DoubtResponse(
                answer="Sorry, I couldn't find relevant information in my knowledge base for this question. Please check if the topic is covered in Class 9 NCERT Science.",
                sources=[],
                question=request.question,
            )

        # Step 2: Build context from chunks
        context = rag_service.build_context(chunks)

        # Step 3: Format chat history for Claude
        history = []
        if request.chat_history:
            for msg in request.chat_history[-6:]:  # last 3 turns
                history.append({"role": msg.role, "content": msg.content})

        # Step 4: Get answer from Claude
        answer = answer_doubt(
            question=request.question,
            context=context,
            role=current_user.role,
            chat_history=history,
        )

        # Step 5: Format sources for response
        sources = [
            {
                "chapter": c["chapter"],
                "chapter_title": c["chapter_title"],
                "subject": c["subject"],
                "relevance": c["relevance_score"],
            }
            for c in chunks[:3]  # top 3 sources
        ]
        # Deduplicate sources by chapter
        seen = set()
        unique_sources = []
        for s in sources:
            key = s["chapter"]
            if key not in seen:
                seen.add(key)
                unique_sources.append(s)

        return DoubtResponse(
            answer=answer,
            sources=unique_sources,
            question=request.question,
        )

    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing doubt: {str(e)}")


@router.get("/status")
def rag_status():
    """Check RAG database status."""
    try:
        stats = rag_service.get_collection_stats()
        return {"status": "ready", **stats}
    except Exception as e:
        return {"status": "not_ready", "error": str(e)}
