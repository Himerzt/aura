"""RAG (Retrieval-Augmented Generation) core for AURA.

Lexical retrieval from local markdown documents + Gemini grounded answer.
This module is intentionally simple (no vector DB) for MVP demonstration.
"""
import json
import os
import re
from pathlib import Path
from typing import Optional

from agents._gemini import call_gemini
from core.prompts import get_rag_prompt


DATA_DIR = Path(__file__).parent.parent / "data" / "rag_docs"
MIN_TERM_LENGTH = 2
MIN_SCORE_THRESHOLD = 0.3


def _tokenize(text: str) -> list[str]:
    """Normalize and split text into searchable terms."""
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)
    tokens = text.split()
    return [t for t in tokens if len(t) >= MIN_TERM_LENGTH]


def load_rag_documents() -> list[dict]:
    """Load all .md and .txt documents from rag_docs directory.

    Returns:
        List of dicts: [{"title": "...", "content": "...", "path": "..."}]
    """
    docs = []
    if not DATA_DIR.exists():
        return docs

    for file_path in sorted(DATA_DIR.iterdir()):
        if file_path.suffix.lower() in (".md", ".txt"):
            try:
                content = file_path.read_text(encoding="utf-8")
                docs.append({
                    "title": file_path.name,
                    "content": content.strip(),
                    "path": str(file_path),
                })
            except (OSError, UnicodeDecodeError):
                continue

    return docs


def chunk_document(title: str, text: str, chunk_size: int = 800, overlap: int = 120) -> list[dict]:
    """Split a document into overlapping chunks for retrieval.

    Chunks are created by splitting on double newlines (paragraphs),
    then merging until chunk_size is reached.

    Returns:
        List of dicts: [{"chunk_id": "filename.md#chunk-N", "content": "...", "title": "..."}]
    """
    chunks = []
    paragraphs = re.split(r"\n\n+", text)
    current = []
    current_len = 0
    chunk_index = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        para_len = len(para)

        if current and current_len + para_len > chunk_size:
            chunk_text = "\n\n".join(current)
            chunks.append({
                "chunk_id": f"{title}#chunk-{chunk_index}",
                "content": chunk_text,
                "title": title,
            })
            chunk_index += 1
            # Overlap: keep last paragraph as start of next chunk
            if len(current) > 0:
                current = [current[-1]]
                current_len = len(current[0])
            else:
                current = []
                current_len = 0

        current.append(para)
        current_len += para_len

    # Final chunk
    if current:
        chunk_text = "\n\n".join(current)
        chunks.append({
            "chunk_id": f"{title}#chunk-{chunk_index}",
            "content": chunk_text,
            "title": title,
        })

    return chunks


def retrieve_relevant_chunks(question: str, top_k: int = 5) -> list[dict]:
    """Return top relevant chunks using simple lexical scoring.

    Scoring:
    - Normalize question and chunk to lowercase
    - Split into terms, ignore terms < 2 chars
    - Score = count of question terms found in chunk
    - Boost: +1 per term if it appears in chunk title
    - Filter: only chunks with score >= MIN_SCORE_THRESHOLD * len(question_terms)

    Returns:
        List of dicts sorted by score descending:
        [{"chunk_id", "content", "title", "score", "preview"}]
    """
    docs = load_rag_documents()
    if not docs:
        return []

    # Build all chunks
    all_chunks: list[dict] = []
    for doc in docs:
        chunks = chunk_document(doc["title"], doc["content"])
        for chunk in chunks:
            chunk["score"] = 0.0
            all_chunks.append(chunk)

    if not all_chunks:
        return []

    question_terms = _tokenize(question)
    if not question_terms:
        return []

    # Score each chunk
    for chunk in all_chunks:
        chunk_terms = _tokenize(chunk["content"])
        score = 0.0

        for term in question_terms:
            count = chunk_terms.count(term)
            score += count
            # Boost if term in title
            if term in _tokenize(chunk["title"]):
                score += 1.0

        # Normalize by question length to make threshold meaningful
        normalized_score = score / max(len(question_terms), 1)
        chunk["score"] = normalized_score

    # Filter by threshold
    threshold = MIN_SCORE_THRESHOLD * len(question_terms)
    filtered = [c for c in all_chunks if c["score"] >= threshold]

    # Sort and take top_k
    filtered.sort(key=lambda c: c["score"], reverse=True)
    top_chunks = filtered[:top_k]

    # Add preview (first 200 chars)
    for chunk in top_chunks:
        preview = chunk["content"].strip()[:200]
        if len(chunk["content"]) > 200:
            preview += "..."
        chunk["preview"] = preview

    return top_chunks


def _build_context(chunks: list[dict]) -> str:
    """Build a context string from retrieved chunks for the Gemini prompt."""
    if not chunks:
        return "Không tìm thấy tài liệu liên quan."

    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        context_parts.append(
            f"[Nguồn {i}: {chunk['title']}]\n{chunk['content']}"
        )
    return "\n\n".join(context_parts)


def _determine_confidence(sources: list[dict], used_context: bool) -> str:
    """Determine confidence level based on retrieval quality."""
    if not used_context or not sources:
        return "low"

    avg_score = sum(s["score"] for s in sources) / len(sources)
    if avg_score >= 2.0:
        return "high"
    elif avg_score >= 0.8:
        return "medium"
    else:
        return "low"


async def run_rag_query(question: str) -> dict:
    """Run full RAG query: retrieve context, call Gemini, validate response.

    Args:
        question: User's question string.

    Returns:
        dict: {
            "answer": str,
            "sources": list[dict],
            "confidence": "high" | "medium" | "low",
            "used_context": bool
        }
    """
    # 1. Retrieve relevant chunks
    sources = retrieve_relevant_chunks(question, top_k=5)
    used_context = len(sources) > 0

    # 2. Build context string
    context = _build_context(sources)

    # 3. Call Gemini
    prompt = get_rag_prompt(context, question)
    result = await call_gemini(
        system_prompt="Bạn là trợ lý AURA. Trả lời dựa trên context được cung cấp.",
        user_content=prompt,
        required_fields=["answer", "confidence"],
    )

    answer: str = result.get("answer", "")
    raw_confidence: str = result.get("confidence", "medium")

    # 4. Validate confidence value
    valid_confidences = {"high", "medium", "low"}
    confidence = raw_confidence if raw_confidence in valid_confidences else _determine_confidence(sources, used_context)

    # 5. Ensure answer is not empty
    if not answer or not answer.strip():
        answer = "Mình chưa tìm thấy câu trả lời phù hợp trong tài liệu hiện có."

    # 6. Return structured response
    return {
        "answer": answer.strip(),
        "sources": sources,
        "confidence": confidence,
        "used_context": used_context,
    }
