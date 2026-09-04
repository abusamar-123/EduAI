"""
EduAI - PDF Ingestion Script
Run this ONCE to process all NCERT PDFs into ChromaDB vector store.

Usage:
    python scripts/ingest_pdfs.py

Place all NCERT Science Class 9 PDF files in the data/pdfs/ folder before running.
"""

import os
import re
import json
import fitz  # PyMuPDF
import chromadb
from chromadb.utils import embedding_functions
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent.parent
PDF_DIR = BASE_DIR / "data" / "pdfs"
CHROMA_DIR = BASE_DIR / "data" / "chroma_db"
COLLECTION_NAME = "ncert_science_class9"
CHUNK_SIZE = 400       # words per chunk
CHUNK_OVERLAP = 80     # overlapping words between chunks

# Chapter metadata mapping (filename → chapter info)
CHAPTER_MAP = {
    "iesc101.pdf": {"chapter": 1,  "title": "Matter in Our Surroundings",      "subject": "Chemistry"},
    "iesc102.pdf": {"chapter": 2,  "title": "Is Matter Around Us Pure?",       "subject": "Chemistry"},
    "iesc103.pdf": {"chapter": 3,  "title": "Atoms and Molecules",             "subject": "Chemistry"},
    "iesc104.pdf": {"chapter": 4,  "title": "Structure of the Atom",           "subject": "Chemistry"},
    "iesc105.pdf": {"chapter": 5,  "title": "The Fundamental Unit of Life",    "subject": "Biology"},
    "iesc106.pdf": {"chapter": 6,  "title": "Tissues",                         "subject": "Biology"},
    "iesc107.pdf": {"chapter": 7,  "title": "Motion",                          "subject": "Physics"},
    "iesc108.pdf": {"chapter": 8,  "title": "Force and Laws of Motion",        "subject": "Physics"},
    "iesc109.pdf": {"chapter": 9,  "title": "Gravitation",                     "subject": "Physics"},
    "iesc110.pdf": {"chapter": 10, "title": "Work and Energy",                 "subject": "Physics"},
    "iesc111.pdf": {"chapter": 11, "title": "Sound",                           "subject": "Physics"},
    "iesc112.pdf": {"chapter": 12, "title": "Improvement in Food Resources",   "subject": "Biology"},
    "iesc1an.pdf": {"chapter": 99, "title": "Answers",                         "subject": "Science"},
    "iesc1ps.pdf": {"chapter": 98, "title": "Prelims",                         "subject": "Science"},
}
# ── Text Extraction ───────────────────────────────────────────────────────────
def extract_text_from_pdf(pdf_path: Path) -> str:
    """Extract raw text from a PDF using PyMuPDF."""
    doc = fitz.open(str(pdf_path))
    full_text = []
    for page in doc:
        text = page.get_text("text")
        full_text.append(text)
    doc.close()
    return "\n".join(full_text)


def clean_text(text: str) -> str:
    """Clean extracted PDF text."""
    # Remove excessive whitespace and blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]{2,}', ' ', text)
    # Remove page numbers (standalone numbers on a line)
    text = re.sub(r'\n\s*\d{1,3}\s*\n', '\n', text)
    # Remove "Reprint 2025-26" watermarks
    text = re.sub(r'Reprint \d{4}-\d{2,4}', '', text)
    # Remove header artifacts
    text = re.sub(r'\n(SCIENCE|MOTION|TISSUES|ATOMS|MATTER)\s*\n', '\n', text)
    return text.strip()


# ── Chunking ──────────────────────────────────────────────────────────────────
def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Split text into overlapping word-based chunks."""
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        if end == len(words):
            break
        start += chunk_size - overlap
    return chunks


# ── ChromaDB Setup ────────────────────────────────────────────────────────────
def get_chroma_collection():
    """Initialize ChromaDB client and collection."""
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    
    # Use sentence-transformers for embeddings (free, runs locally)
    ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )
    
    # Delete existing collection if re-running
    try:
        client.delete_collection(COLLECTION_NAME)
        print(f"  Deleted existing collection '{COLLECTION_NAME}'")
    except Exception:
        pass
    
    collection = client.create_collection(
        name=COLLECTION_NAME,
        embedding_function=ef,
        metadata={"hnsw:space": "cosine"}
    )
    return collection


# ── Main Ingestion ────────────────────────────────────────────────────────────
def ingest_all_pdfs():
    """Process all PDFs and store chunks in ChromaDB."""
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    
    # Check for PDF files
    pdf_files = list(PDF_DIR.glob("*.pdf"))
    if not pdf_files:
        print(f"❌ No PDFs found in {PDF_DIR}/")
        print("   Please copy your NCERT PDF files there and run again.")
        return
    
    print(f"📚 Found {len(pdf_files)} PDF(s) to process\n")
    
    collection = get_chroma_collection()
    
    total_chunks = 0
    all_ids = []
    all_docs = []
    all_metas = []
    
    for pdf_path in sorted(pdf_files):
        fname = pdf_path.name.lower()
        meta_base = CHAPTER_MAP.get(fname, {
            "chapter": 0,
            "title": pdf_path.stem,
            "subject": "Science"
        })
        
        print(f"📄 Processing: {pdf_path.name}")
        print(f"   Chapter {meta_base['chapter']}: {meta_base['title']} ({meta_base['subject']})")
        
        # Extract & clean
        raw_text = extract_text_from_pdf(pdf_path)
        clean = clean_text(raw_text)
        
        # Chunk
        chunks = chunk_text(clean)
        print(f"   → {len(chunks)} chunks generated")
        
        # Prepare for ChromaDB
        for i, chunk in enumerate(chunks):
            chunk_id = f"ch{meta_base['chapter']:02d}_chunk{i:04d}"
            all_ids.append(chunk_id)
            all_docs.append(chunk)
            all_metas.append({
                "chapter": meta_base["chapter"],
                "chapter_title": meta_base["title"],
                "subject": meta_base["subject"],
                "chunk_index": i,
                "source": pdf_path.name,
            })
        
        total_chunks += len(chunks)
        print(f"   ✅ Done\n")
    
    # Batch upsert to ChromaDB (in batches of 100)
    print(f"💾 Storing {total_chunks} chunks in ChromaDB...")
    batch_size = 100
    for i in range(0, len(all_ids), batch_size):
        collection.add(
            ids=all_ids[i:i+batch_size],
            documents=all_docs[i:i+batch_size],
            metadatas=all_metas[i:i+batch_size],
        )
    
    print(f"\n✅ Ingestion complete!")
    print(f"   Total chunks stored: {total_chunks}")
    print(f"   Collection: '{COLLECTION_NAME}'")
    print(f"   Location: {CHROMA_DIR}/")
    
    # Save ingestion summary
    summary = {
        "total_chunks": total_chunks,
        "chapters_processed": len(pdf_files),
        "collection": COLLECTION_NAME,
        "chapter_details": [
            {"file": p.name, **CHAPTER_MAP.get(p.name.lower(), {})}
            for p in sorted(pdf_files)
        ]
    }
    with open("data/ingestion_summary.json", "w") as f:
        json.dump(summary, f, indent=2)
    print(f"   Summary saved to data/ingestion_summary.json")


if __name__ == "__main__":
    ingest_all_pdfs()
