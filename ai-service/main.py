"""
CivicSense AI Classification Service  v3
=========================================
Uses Google Gemini REST API directly (no gRPC SDK) for maximum reliability.

POST /classify  — base64 image → civic category + confidence + urgency
GET  /health    — liveness check

Run:
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload

Env:
  GEMINI_API_KEY  — from https://aistudio.google.com/app/apikey
"""

import io, base64, json, logging, os, re
from typing import Optional

import httpx
from dotenv import load_dotenv
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("civicsense-ai")

# ── Gemini REST config ────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL   = "gemini-2.5-flash"          # REST model name
GEMINI_URL     = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)
GEMINI_READY = bool(GEMINI_API_KEY)
if not GEMINI_READY:
    log.warning("GEMINI_API_KEY not set — fallback responses only.")
else:
    log.info("Gemini REST configured: model=%s", GEMINI_MODEL)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="CivicSense AI", version="3.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["GET","POST"], allow_headers=["*"])

# ── Categories ────────────────────────────────────────────────────────────────
CATEGORIES = {
    "pothole":      "Pothole & Road Damage",
    "garbage":      "Garbage & Waste",
    "drainage":     "Drainage & Sewage",
    "water":        "Water Supply & Leakage",
    "streetlight":  "Streetlight & Electrical",
    "construction": "Illegal Construction",
    "other":        "Other Civic Issue",
}

PROMPT = """You are a civic issue classifier for Indian municipalities.
Look at this image and identify what civic problem is shown.

Choose EXACTLY ONE category:
pothole, garbage, drainage, water, streetlight, construction, other

Reply with ONLY valid JSON, no extra text:
{
  "category": "<one of the 7 above>",
  "confidence": 0.85,
  "issue_description": "one sentence describing what you see",
  "detected_objects": ["object1", "object2"],
  "urgency": "Normal"
}

urgency must be: Critical (danger to life), Urgent (needs action soon), or Normal."""

# ── Schemas ───────────────────────────────────────────────────────────────────
class ClassifyRequest(BaseModel):
    image: str
    filename: Optional[str] = "photo.jpg"

class ClassifyResponse(BaseModel):
    category: str
    category_label: str
    confidence: float
    issue_description: str
    detected_objects: list[str]
    urgency: str
    ai_powered: bool = True
    model: str = GEMINI_MODEL
    fallback: bool = False

# ── Helpers ───────────────────────────────────────────────────────────────────
def decode_image(b64: str) -> tuple[bytes, str]:
    mime = "image/jpeg"
    if b64.startswith("data:"):
        hdr, b64 = b64.split(",", 1)
        mime = "image/png" if "png" in hdr else ("image/webp" if "webp" in hdr else mime)
    b64 += "=" * (-len(b64) % 4)
    return base64.b64decode(b64), mime

def parse_json(text: str) -> dict:
    try:
        return json.loads(text.strip())
    except Exception:
        m = re.search(r'\{[\s\S]*\}', text)
        if m:
            try:
                return json.loads(m.group())
            except Exception:
                pass
    return {}

def fallback() -> ClassifyResponse:
    return ClassifyResponse(
        category="other", category_label="Other Civic Issue",
        confidence=0.0,
        issue_description="AI unavailable — please describe the issue manually.",
        detected_objects=[], urgency="Normal",
        ai_powered=False, fallback=True,
    )

# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"ok": True, "model": GEMINI_MODEL,
            "gemini_ready": GEMINI_READY, "service": "CivicSense AI v3"}

@app.post("/classify", response_model=ClassifyResponse)
async def classify(req: ClassifyRequest):
    if not GEMINI_READY:
        return fallback()

    # Decode + validate image
    try:
        raw, mime = decode_image(req.image)
        Image.open(io.BytesIO(raw)).verify()
    except Exception as e:
        raise HTTPException(400, f"Invalid image: {e}")

    b64_clean = base64.b64encode(raw).decode()

    # Build Gemini REST payload
    payload = {
        "contents": [{
            "parts": [
                {"text": PROMPT},
                {"inline_data": {"mime_type": mime, "data": b64_clean}},
            ]
        }],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 300},
    }

    # Call Gemini via REST (no gRPC, no hangs)
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(
                GEMINI_URL,
                headers={"x-goog-api-key": GEMINI_API_KEY},
                json=payload,
            )
        resp.raise_for_status()
        raw_text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        log.info("Gemini response: %s", raw_text[:120])
    except Exception as e:
        log.error("Gemini call failed: %s", e)
        return fallback()

    # Parse + sanitise
    parsed = parse_json(raw_text)
    if not parsed:
        return fallback()

    category = parsed.get("category", "other").lower().strip()
    if category not in CATEGORIES:
        category = "other"

    confidence = max(0.0, min(1.0, float(parsed.get("confidence", 0.5))))
    urgency = parsed.get("urgency", "Normal")
    if urgency not in ("Normal", "Urgent", "Critical"):
        urgency = "Normal"
    desc    = parsed.get("issue_description", "Civic issue detected.")
    objects = parsed.get("detected_objects", [])
    if not isinstance(objects, list):
        objects = []

    log.info("→ category=%s conf=%.2f urgency=%s", category, confidence, urgency)

    return ClassifyResponse(
        category=category,
        category_label=CATEGORIES[category],
        confidence=confidence,
        issue_description=desc,
        detected_objects=objects[:8],
        urgency=urgency,
        model=GEMINI_MODEL,
    )
