"""
CivicSense AI Classification Service
=====================================
Google Gemini Vision — classifies civic issue photos.

Gemini understands real-world scenes: potholes, garbage, waterlogging,
broken streetlights, sewage overflow, illegal construction — without
any custom model training.

Endpoints:
  POST /classify   — accepts base64 image, returns predicted category + confidence
  GET  /health     — liveness check

Run locally:
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload

Environment variables:
  GEMINI_API_KEY   — Google AI Studio key (required)
"""

import io
import base64
import json
import logging
import os
import re
from typing import Optional

from dotenv import load_dotenv
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai

# ── Load env ──────────────────────────────────────────────────────────────────
load_dotenv()

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("civicsense-ai")

# ── Gemini setup ──────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if not GEMINI_API_KEY:
    log.warning("GEMINI_API_KEY not set — /classify will return fallback responses.")
    GEMINI_READY = False
else:
    genai.configure(api_key=GEMINI_API_KEY)
    GEMINI_READY = True
    log.info("Gemini API configured.")

GEMINI_MODEL = "gemini-1.5-flash"   # Free tier, fast, excellent vision

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="CivicSense AI Service",
    description="Gemini Vision civic issue classifier",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Category definitions ──────────────────────────────────────────────────────
CATEGORIES = {
    "pothole":      "Pothole & Road Damage",
    "garbage":      "Garbage & Waste",
    "drainage":     "Drainage & Sewage",
    "water":        "Water Supply & Leakage",
    "streetlight":  "Streetlight & Electrical",
    "construction": "Illegal Construction",
    "other":        "Other Civic Issue",
}

# ── Prompt sent to Gemini ─────────────────────────────────────────────────────
CLASSIFY_PROMPT = """You are a civic issue classifier for Indian municipal corporations.

Analyze this image and identify the civic problem shown.

Choose ONE category from this list:
- pothole      → road damage, potholes, broken roads, cracks in asphalt
- garbage      → garbage dumps, overflowing bins, litter, waste on roads/public areas
- drainage     → blocked drains, sewage overflow, waterlogging, flooded roads, open manholes
- water        → broken pipes, water leakage, burst pipes, no water supply
- streetlight  → broken street lights, fallen poles, exposed wires, electrical hazards
- construction → illegal construction, encroachment, unauthorized structures on footpaths
- other        → any other civic issue that doesn't fit above

Respond ONLY with this exact JSON format (no extra text, no markdown):
{
  "category": "one of the 7 categories above",
  "confidence": 0.85,
  "issue_description": "one clear sentence describing what you see",
  "detected_objects": ["object1", "object2"],
  "urgency": "Normal|Urgent|Critical"
}

Rules:
- confidence is a number between 0.0 and 1.0
- urgency is Critical if there is danger to life (exposed wire, deep sinkhole, flooding)
- urgency is Urgent if the issue needs attention within 24-48 hours
- urgency is Normal for routine maintenance issues
- If the image does not show a civic issue, use category "other" with confidence 0.3
"""

# ── Schemas ───────────────────────────────────────────────────────────────────
class ClassifyRequest(BaseModel):
    image: str              # base64-encoded image (with or without data-URL prefix)
    filename: Optional[str] = "photo.jpg"


class ClassifyResponse(BaseModel):
    category: str           # CivicSense category id
    category_label: str     # Human readable
    confidence: float       # 0.0 – 1.0
    issue_description: str  # What Gemini saw
    detected_objects: list[str]
    urgency: str            # Normal | Urgent | Critical
    ai_powered: bool = True
    model: str = GEMINI_MODEL
    fallback: bool = False


# ── Helpers ───────────────────────────────────────────────────────────────────
def decode_base64_image(b64: str) -> tuple[bytes, str]:
    """Strip data-URL prefix if present. Returns (raw_bytes, mime_type)."""
    mime = "image/jpeg"
    if b64.startswith("data:"):
        header, b64 = b64.split(",", 1)
        if "png" in header:
            mime = "image/png"
        elif "webp" in header:
            mime = "image/webp"
    # Fix padding
    b64 += "=" * (-len(b64) % 4)
    return base64.b64decode(b64), mime


def parse_gemini_response(text: str) -> dict:
    """Extract JSON from Gemini response, even if it has surrounding text."""
    # Try direct parse first
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass
    # Extract JSON block
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return {}


def fallback_response() -> ClassifyResponse:
    """Return when Gemini is unavailable."""
    return ClassifyResponse(
        category="other",
        category_label="Other Civic Issue",
        confidence=0.0,
        issue_description="AI classification unavailable — please describe the issue manually.",
        detected_objects=[],
        urgency="Normal",
        ai_powered=False,
        fallback=True,
    )


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "ok":           True,
        "model":        GEMINI_MODEL,
        "gemini_ready": GEMINI_READY,
        "service":      "CivicSense AI (Gemini Vision)",
    }


@app.post("/classify", response_model=ClassifyResponse)
def classify(req: ClassifyRequest):
    """
    Accept a base64-encoded image, send to Gemini Vision,
    return the predicted civic issue category.
    """
    # ── No API key — return fallback ──────────────────────────────────────────
    if not GEMINI_READY:
        log.warning("Classify called but GEMINI_API_KEY not set — returning fallback.")
        return fallback_response()

    # ── Decode image ──────────────────────────────────────────────────────────
    try:
        raw_bytes, mime_type = decode_base64_image(req.image)
        # Validate it's a real image
        img = Image.open(io.BytesIO(raw_bytes))
        img.verify()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image: {exc}")

    # ── Call Gemini Vision ────────────────────────────────────────────────────
    try:
        model = genai.GenerativeModel(GEMINI_MODEL)
        image_part = {
            "mime_type": mime_type,
            "data":      raw_bytes,
        }
        response = model.generate_content(
            [CLASSIFY_PROMPT, image_part],
            generation_config=genai.GenerationConfig(
                temperature=0.1,       # Low temp → consistent classification
                max_output_tokens=300,
            ),
        )
        raw_text = response.text
        log.info("Gemini raw response: %s", raw_text[:200])

    except Exception as exc:
        log.error("Gemini API error: %s", exc)
        # Return fallback instead of crashing — never block form submission
        return fallback_response()

    # ── Parse response ────────────────────────────────────────────────────────
    parsed = parse_gemini_response(raw_text)

    if not parsed:
        log.warning("Could not parse Gemini response: %s", raw_text)
        return fallback_response()

    # Validate and sanitise
    category = parsed.get("category", "other").lower().strip()
    if category not in CATEGORIES:
        category = "other"

    confidence = float(parsed.get("confidence", 0.5))
    confidence = max(0.0, min(1.0, confidence))   # clamp 0–1

    urgency = parsed.get("urgency", "Normal")
    if urgency not in ("Normal", "Urgent", "Critical"):
        urgency = "Normal"

    issue_description = parsed.get("issue_description", "Civic issue detected.")
    detected_objects  = parsed.get("detected_objects", [])
    if not isinstance(detected_objects, list):
        detected_objects = []

    log.info(
        "Classified → category=%s  conf=%.2f  urgency=%s  desc=%s",
        category, confidence, urgency, issue_description[:80]
    )

    return ClassifyResponse(
        category=category,
        category_label=CATEGORIES.get(category, "Other Civic Issue"),
        confidence=confidence,
        issue_description=issue_description,
        detected_objects=detected_objects[:8],
        urgency=urgency,
        model=GEMINI_MODEL,
        fallback=False,
    )
