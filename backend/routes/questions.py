"""
EduAI - Question Generation Routes
Teacher-only: Generate exam questions from NCERT content.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional
from services.auth_service import require_teacher, TokenData
from services.rag_service import rag_service
from services.claude_service import generate_questions
import io

router = APIRouter(prefix="/questions", tags=["Question Generation"])

# ── Constants ─────────────────────────────────────────────────────────────────

QUESTION_TYPES = ["MCQ", "Short Answer", "Long Answer", "True/False", "Fill in the Blanks"]
DIFFICULTIES = ["Easy", "Medium", "Hard"]
SUBJECTS = ["Physics", "Chemistry", "Biology", "Science"]


# ── Request/Response Models ───────────────────────────────────────────────────

class QuestionGenRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=200, description="Topic to generate questions on")
    subject: str = Field(..., description="Physics / Chemistry / Biology")
    question_type: str = Field(..., description="MCQ / Short Answer / Long Answer / True/False / Fill in the Blanks")
    difficulty: str = Field(..., description="Easy / Medium / Hard")
    count: int = Field(default=5, ge=1, le=20, description="Number of questions (1-20)")
    chapter_filter: Optional[int] = None

class Question(BaseModel):
    question: str
    type: str
    difficulty: str
    subject: str
    answer: str
    options: List[str] = []

class QuestionGenResponse(BaseModel):
    questions: List[Question]
    topic: str
    total: int


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/generate", response_model=QuestionGenResponse)
def generate(
    request: QuestionGenRequest,
    current_user: TokenData = Depends(require_teacher)
):
    """
    Generate exam questions from NCERT content.
    TEACHER ONLY.
    """
    # Validate inputs
    if request.question_type not in QUESTION_TYPES:
        raise HTTPException(400, f"question_type must be one of: {QUESTION_TYPES}")
    if request.difficulty not in DIFFICULTIES:
        raise HTTPException(400, f"difficulty must be one of: {DIFFICULTIES}")
    if request.subject not in SUBJECTS:
        raise HTTPException(400, f"subject must be one of: {SUBJECTS}")

    try:
        # Retrieve relevant chunks for the topic
        subject_filter = request.subject if request.subject != "Science" else None
        chunks = rag_service.retrieve(
            query=request.topic,
            n_results=6,
            subject_filter=subject_filter,
            chapter_filter=request.chapter_filter,
        )

        if not chunks:
            raise HTTPException(
                404,
                f"No content found for topic '{request.topic}' in the knowledge base."
            )

        context = rag_service.build_context(chunks)

        # Generate questions via Claude
        questions_data = generate_questions(
            topic=request.topic,
            subject=request.subject,
            question_type=request.question_type,
            difficulty=request.difficulty,
            count=request.count,
            context=context,
        )

        questions = [Question(**q) for q in questions_data]

        return QuestionGenResponse(
            questions=questions,
            topic=request.topic,
            total=len(questions),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error generating questions: {str(e)}")


@router.post("/generate/pdf")
def generate_pdf(
    request: QuestionGenRequest,
    current_user: TokenData = Depends(require_teacher)
):
    """
    Generate questions and return as a downloadable PDF.
    TEACHER ONLY.
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.units import cm
    from reportlab.lib import colors

    # First generate questions
    gen_response = generate(request, current_user)
    questions = gen_response.questions

    # Build PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm
    )

    styles = getSampleStyleSheet()
    story = []

    # Title
    title_style = ParagraphStyle(
        'Title', parent=styles['Title'],
        fontSize=16, textColor=colors.HexColor('#1a237e'),
        spaceAfter=6
    )
    story.append(Paragraph("EduAI - Question Paper", title_style))
    story.append(Paragraph(
        f"Topic: {request.topic} | Subject: {request.subject} | "
        f"Type: {request.question_type} | Difficulty: {request.difficulty}",
        styles['Normal']
    ))
    story.append(Spacer(1, 0.5*cm))

    # Questions
    q_style = ParagraphStyle('Q', parent=styles['Normal'], fontSize=11, spaceAfter=4)
    a_style = ParagraphStyle('A', parent=styles['Normal'], fontSize=10,
                             textColor=colors.HexColor('#2e7d32'), spaceAfter=12)

    for i, q in enumerate(questions, 1):
        story.append(Paragraph(f"<b>Q{i}. {q.question}</b>", q_style))

        if q.options:
            for opt in q.options:
                story.append(Paragraph(f"&nbsp;&nbsp;&nbsp;{opt}", styles['Normal']))

        story.append(Paragraph(f"<i>Answer: {q.answer}</i>", a_style))

    doc.build(story)
    buffer.seek(0)

    filename = f"questions_{request.topic[:20].replace(' ', '_')}_{request.difficulty}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/types")
def get_question_types():
    """Get available question types, difficulties and subjects."""
    return {
        "question_types": QUESTION_TYPES,
        "difficulties": DIFFICULTIES,
        "subjects": SUBJECTS,
    }
