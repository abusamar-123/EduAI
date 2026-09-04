"""
EduAI - RAG Service
Handles semantic search over the ChromaDB vector store.
"""

import os
import chromadb
from chromadb.utils import embedding_functions
from pathlib import Path
from typing import List, Dict, Any

CHROMA_DIR = Path(__file__).parent.parent.parent / "data" / "chroma_db"
COLLECTION_NAME = "ncert_science_class9"
DEFAULT_N_RESULTS = 5


class RAGService:
    """Retrieval-Augmented Generation service for NCERT Science content."""

    def __init__(self):
        self._client = None
        self._collection = None
        self._ef = None

    def _init(self):
        """Lazy initialization of ChromaDB client."""
        if self._collection is not None:
            return
        
        if not CHROMA_DIR.exists():
            raise RuntimeError(
                f"ChromaDB not found at {CHROMA_DIR}. "
                "Please run scripts/ingest_pdfs.py first."
            )
        
        self._ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        self._client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        self._collection = self._client.get_collection(
            name=COLLECTION_NAME,
            embedding_function=self._ef
        )

    def retrieve(
        self,
        query: str,
        n_results: int = DEFAULT_N_RESULTS,
        subject_filter: str = None,
        chapter_filter: int = None,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve the most relevant text chunks for a query.
        
        Args:
            query: The student's question
            n_results: Number of chunks to retrieve
            subject_filter: Optional - filter by subject ('Physics', 'Chemistry', 'Biology')
            chapter_filter: Optional - filter by chapter number
        
        Returns:
            List of dicts with 'text', 'chapter', 'chapter_title', 'subject', 'distance'
        """
        self._init()

        # Build where clause for filtering
        where = None
        if subject_filter and chapter_filter:
            where = {"$and": [
                {"subject": subject_filter},
                {"chapter": chapter_filter}
            ]}
        elif subject_filter:
            where = {"subject": subject_filter}
        elif chapter_filter:
            where = {"chapter": chapter_filter}

        query_params = {
            "query_texts": [query],
            "n_results": n_results,
            "include": ["documents", "metadatas", "distances"],
        }
        if where:
            query_params["where"] = where

        results = self._collection.query(**query_params)

        chunks = []
        docs = results["documents"][0]
        metas = results["metadatas"][0]
        dists = results["distances"][0]

        for doc, meta, dist in zip(docs, metas, dists):
            chunks.append({
                "text": doc,
                "chapter": meta.get("chapter"),
                "chapter_title": meta.get("chapter_title"),
                "subject": meta.get("subject"),
                "source": meta.get("source"),
                "relevance_score": round(1 - dist, 4),  # convert distance to similarity
            })

        # Sort by relevance (highest first)
        chunks.sort(key=lambda x: x["relevance_score"], reverse=True)
        return chunks

    def build_context(self, chunks: List[Dict[str, Any]]) -> str:
        """
        Format retrieved chunks into a context string for the LLM prompt.
        """
        if not chunks:
            return ""

        context_parts = []
        seen_chapters = set()

        for i, chunk in enumerate(chunks, 1):
            chapter_info = f"Chapter {chunk['chapter']}: {chunk['chapter_title']} ({chunk['subject']})"
            seen_chapters.add(chapter_info)
            context_parts.append(
                f"[Source {i} - {chapter_info}]\n{chunk['text']}"
            )

        context = "\n\n---\n\n".join(context_parts)
        return context

    def get_collection_stats(self) -> Dict[str, Any]:
        """Return stats about the vector store."""
        self._init()
        count = self._collection.count()
        return {
            "total_chunks": count,
            "collection": COLLECTION_NAME,
            "status": "ready" if count > 0 else "empty"
        }


# Singleton instance
rag_service = RAGService()
