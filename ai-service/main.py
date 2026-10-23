"""
CivicSense AI Classification Service
=====================================
FastAPI + YOLOv8 (Ultralytics) — classifies civic issue photos.

Endpoints:
  POST /classify   — accepts base64 image, returns predicted issue + confidence
  GET  /health     — liveness check

Run:
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import io
import base64
import logging
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("civicsense-ai")

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="CivicSense AI Service",
    description="YOLOv8-based civic issue image classifier",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Express proxy calls this — open in dev
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Civic category mapping ────────────────────────────────────────────────────
# Maps YOLO class labels (or keywords in labels) → CivicSense category IDs
# YOLOv8 COCO labels relevant to civic issues are mapped here.
# When using a custom-trained model, add/replace these mappings.
LABEL_TO_CATEGORY = {
    # Road / pothole related
    "pothole":         "pothole",
    "road":            "pothole",
    "crack":           "pothole",
    "asphalt":         "pothole",
    "pavement":        "pothole",

    # Garbage / waste
    "garbage":         "garbage",
    "trash":           "garbage",
    "waste":           "garbage",
    "rubbish":         "garbage",
    "litter":          "garbage",
    "bin":             "garbage",
    "suitcase":        "garbage",   # COCO — often confused with waste bags

    # Drainage / water logging
    "drainage":        "drainage",
    "flood":           "drainage",
    "waterlog":        "drainage",
    "manhole":         "drainage",
    "puddle":          "drainage",

    # Water supply
    "pipe":            "water",
    "leakage":         "water",
    "tap":             "water",
    "hydrant":         "water",

    # Street light / electrical
    "streetlight":     "streetlight",
    "light":           "streetlight",
    "pole":            "streetlight",
    "wire":            "streetlight",
    "electricity":     "streetlight",
    "electrical":      "streetlight",

    # Illegal construction
    "construction":    "construction",
    "building":        "construction",
    "encroachment":    "construction",

    # COCO objects that appear at civic issue scenes
    "car":             "pothole",       # Cars on broken roads
    "truck":           "pothole",
    "person":          "other",
    "bicycle":         "other",
    "motorcycle":      "other",
    "bus":             "pothole",
    "traffic light":   "streetlight",
    "stop sign":       "streetlight",
    "fire hydrant":    "water",
    "bench":           "other",
    "backpack":        "garbage",
    "handbag":         "garbage",
    "bottle":          "garbage",
    "cup":             "garbage",
    "bowl":            "garbage",
    "banana":          "garbage",
    "apple":           "garbage",
    "orange":          "garbage",
    "pizza":           "garbage",
    "donut":           "garbage",
    "cake":            "garbage",
    "chair":           "garbage",
    "couch":           "garbage",
    "potted plant":    "other",
    "tv":              "other",
    "laptop":          "other",
    "cell phone":      "other",
    "book":            "other",
    "clock":           "other",
    "vase":            "garbage",
    "scissors":        "other",
    "teddy bear":      "garbage",
    "hair drier":      "other",
    "toothbrush":      "garbage",
}

# Human-readable names per category (for display)
CATEGORY_LABELS = {
    "pothole":      "Pothole & Road Damage",
    "garbage":      "Garbage & Waste",
    "drainage":     "Drainage & Sewage",
    "water":        "Water Supply & Leakage",
    "streetlight":  "Streetlight & Electrical",
    "construction": "Illegal Construction",
    "other":        "Other Civic Issue",
}

# ── Model loading ─────────────────────────────────────────────────────────────
# Uses YOLOv8n (nano) by default — lightweight, fast, good for demo.
# For production, fine-tune on civic dataset and point MODEL_PATH to weights.
MODEL_PATH = Path(__file__).parent / "model" / "yolov8n.pt"

log.info("Loading YOLOv8 model…")
# Ultralytics auto-downloads yolov8n.pt if not present locally
model = YOLO(str(MODEL_PATH) if MODEL_PATH.exists() else "yolov8n.pt")
log.info("Model loaded.")


# ── Schemas ───────────────────────────────────────────────────────────────────
class ClassifyRequest(BaseModel):
    image: str             # base64-encoded image (with or without data-URL prefix)
    filename: Optional[str] = "image.jpg"


class DetectedObject(BaseModel):
    label: str
    confidence: float
    bbox: list[float]      # [x1, y1, x2, y2] normalised 0–1


class ClassifyResponse(BaseModel):
    category: str          # CivicSense category id
    category_label: str    # Human readable
    confidence: float      # 0.0 – 1.0
    top_label: str         # raw YOLO label that drove the decision
    detected_objects: list[DetectedObject]
    ai_powered: bool = True
    model: str = "YOLOv8n"


# ── Helpers ───────────────────────────────────────────────────────────────────
def decode_base64_image(b64: str) -> Image.Image:
    """Strip data-URL prefix if present and decode to PIL Image."""
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    # Add padding if needed
    b64 += "=" * (-len(b64) % 4)
    raw = base64.b64decode(b64)
    return Image.open(io.BytesIO(raw)).convert("RGB")


def map_label_to_category(label: str) -> str:
    """Return CivicSense category id for a YOLO class label."""
    label_lower = label.lower()
    # Exact match
    if label_lower in LABEL_TO_CATEGORY:
        return LABEL_TO_CATEGORY[label_lower]
    # Partial keyword match
    for keyword, cat in LABEL_TO_CATEGORY.items():
        if keyword in label_lower:
            return cat
    return "other"


def pick_best_detection(results) -> tuple[str, str, float, list]:
    """
    Pick the highest-confidence detection and map it to a civic category.
    Returns (category_id, raw_label, confidence, all_objects).
    """
    detections = []
    for result in results:
        boxes  = result.boxes
        names  = result.names
        for i, box in enumerate(boxes):
            label = names[int(box.cls[0])]
            conf  = float(box.conf[0])
            xyxy  = box.xyxy[0].tolist()   # absolute pixels
            # Normalise bbox to 0-1 relative to image size
            h, w  = result.orig_shape
            norm  = [xyxy[0]/w, xyxy[1]/h, xyxy[2]/w, xyxy[3]/h]
            detections.append((label, conf, norm))

    if not detections:
        return "other", "unknown", 0.0, []

    # Sort by confidence descending
    detections.sort(key=lambda x: x[1], reverse=True)

    # Prefer detections whose label maps to a non-"other" civic category
    civic_detections = [d for d in detections if map_label_to_category(d[0]) != "other"]
    best = civic_detections[0] if civic_detections else detections[0]

    top_label, top_conf, _ = best
    category = map_label_to_category(top_label)

    all_objects = [
        DetectedObject(label=d[0], confidence=round(d[1], 3), bbox=d[2])
        for d in detections[:10]   # return top-10 objects
    ]
    return category, top_label, round(top_conf, 3), all_objects


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"ok": True, "model": "YOLOv8n", "service": "CivicSense AI"}


@app.post("/classify", response_model=ClassifyResponse)
def classify(req: ClassifyRequest):
    """
    Accept a base64-encoded image, run YOLOv8 inference,
    return the predicted civic issue category + confidence.
    """
    # 1. Decode image
    try:
        img = decode_base64_image(req.image)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image: {exc}")

    # 2. Run inference
    try:
        results = model.predict(
            source=np.array(img),
            conf=0.25,          # minimum confidence threshold
            iou=0.45,
            verbose=False,
        )
    except Exception as exc:
        log.error("YOLO inference failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Inference failed: {exc}")

    # 3. Map to civic category
    category, top_label, confidence, objects = pick_best_detection(results)

    log.info(
        "Classified → category=%s  label=%s  conf=%.2f  objects=%d",
        category, top_label, confidence, len(objects)
    )

    return ClassifyResponse(
        category=category,
        category_label=CATEGORY_LABELS.get(category, "Other Civic Issue"),
        confidence=confidence,
        top_label=top_label,
        detected_objects=objects,
    )
