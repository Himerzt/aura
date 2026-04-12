"""Shared Gemini client and call helper for all AURA agents."""
import asyncio
import json
import os
import re

from google import genai
from google.genai import types

MODEL = "gemini-3.1-flash-lite-preview"
MAX_RETRIES = 1
DEFAULT_RETRY_DELAY = 15  # seconds for general errors
RATE_LIMIT_EXTRA = 5      # extra buffer on top of Gemini's suggested retry delay


def _get_client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    return genai.Client(api_key=api_key)


def _strip_json(text: str) -> str:
    """Remove markdown code fences Gemini sometimes wraps around JSON."""
    text = text.strip()
    text = re.sub(r"^```json\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^```\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _get_retry_delay(exc: Exception) -> float:
    """
    Parse retry delay from Gemini 429 error.
    Falls back to DEFAULT_RETRY_DELAY if not parseable.
    """
    error_str = str(exc)
    match = re.search(r"[Rr]etry[Dd]elay['\"]?\s*[:=]\s*['\"]?(\d+(?:\.\d+)?)", error_str)
    if match:
        return float(match.group(1)) + RATE_LIMIT_EXTRA
    return DEFAULT_RETRY_DELAY


async def call_gemini(
    system_prompt: str,
    user_content: str,
    required_fields: list[str],
) -> dict:
    """
    Call Gemini async (via asyncio.to_thread), parse JSON, validate fields.
    Retries once on any failure.
    On 429, waits the retry delay suggested by the API before retrying.

    Raises:
        ValueError: if JSON parse fails or required fields missing after retry.
    """
    client = _get_client()
    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        temperature=0.3,
    )

    last_error: Exception | None = None

    for attempt in range(MAX_RETRIES + 1):
        try:
            response = await asyncio.to_thread(
                client.models.generate_content,
                model=MODEL,
                contents=user_content,
                config=config,
            )
            raw: str = response.text
            cleaned = _strip_json(raw)
            data: dict = json.loads(cleaned)

            missing = [f for f in required_fields if f not in data]
            if missing:
                raise ValueError(
                    f"Missing required fields: {missing}. Raw: {raw[:300]}"
                )

            return data

        except Exception as exc:
            last_error = exc
            if attempt < MAX_RETRIES:
                error_str = str(exc)
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    wait = _get_retry_delay(exc)
                else:
                    wait = 1
                await asyncio.sleep(wait)
            continue

    raise ValueError(f"Gemini call failed after {MAX_RETRIES + 1} attempts: {last_error}")
