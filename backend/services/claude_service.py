import os
import json
import re
from google import genai
from typing import List, Dict, Any

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

SYSTEM_PROMPT = """You are EduAI, a friendly Science tutor for Class 9 CBSE students in India.
Answer Science doubts clearly based on NCERT Class 9 curriculum.
Use the provided context. Explain step-by-step in simple language.
Only answer Physics, Chemistry, Biology questions for Class 9."""


def answer_doubt(
    question: str,
    context: str,
    role: str = "student",
    chat_history: List[Dict] = None
) -> str:
    prompt = f"""{SYSTEM_PROMPT}

Context from NCERT Class 9 Science:
---
{context}
---

Question: {question}

Answer:"""

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt
    )
    return response.text


def generate_questions(
    topic: str,
    subject: str,
    question_type: str,
    difficulty: str,
    count: int,
    context: str,
) -> List[Dict[str, Any]]:

    prompt = f"""Generate exactly {count} {question_type} questions on "{topic}".
Difficulty: {difficulty}. Subject: {subject}. Class 9 CBSE.

Context:
{context}

Rules:
- Easy=recall, Medium=application, Hard=analysis
- MCQ: 4 options A,B,C,D with one correct answer
- True/False: statement and answer
- Fill in the Blanks: use _______
- Short Answer: 2-3 marks
- Long Answer: 5 marks

Return ONLY a JSON array:
[
  {{
    "question": "Question here",
    "answer": "Answer here",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."]
  }}
]"""

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt
    )
    raw = response.text.strip()
    json_match = re.search(r'\[[\s\S]*\]', raw)
    if json_match:
        raw = json_match.group(0)

    questions = json.loads(raw)
    cleaned = []
    for q in questions:
        cleaned.append({
            "question": q.get("question", ""),
            "type": question_type,
            "difficulty": difficulty,
            "subject": subject,
            "answer": q.get("answer", ""),
            "options": q.get("options", []),
        })
    return cleaned