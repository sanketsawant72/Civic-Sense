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
import os
from pathlib import Path
from typing import Optional

import numpy as np
import torch
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("civicsense-ai")

# Keep CPU inference within the memory and thread limits of small web instances.
torch.set_num_threads(1)
torch.set_num_interop_threads(1)

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
# Only map labels that directly describe civic-issue evidence. Generic objects
# (such as cars, bottles, furniture, or traffic lights) are not proof of an issue.
# Add labels here when using a custom model trained to recognize civic problems.
LABEL_TO_CATEGORY = {
    "pothole": "pothole",
    "road damage": "pothole",
    "road crack": "pothole",
    "broken road": "pothole",
    "garbage": "garbage",
    "trash": "garbage",
    "waste": "garbage",
    "rubbish": "garbage",
    "litter": "garbage",
    "overflowing bin": "garbage",
    "illegal dumping": "garbage",
    "drainage": "drainage",
    "sewage": "drainage",
    "blocked drain": "drainage",
    "flooding": "drainage",
    "waterlogging": "drainage",
    "manhole": "drainage",
    "pipe burst": "water",
    "water leak": "water",
    "leakage": "water",
    "streetlight": "streetlight",
    "street light": "streetlight",
    "street lamp": "streetlight",
    "electric pole": "streetlight",
    "utility pole": "streetlight",
    "power line": "streetlight",
    "electrical wire": "streetlight",
    "exposed wire": "streetlight",
    "transformer": "streetlight",
    "electrical fault": "streetlight",
    "illegal construction": "construction",
    "unauthorized construction": "construction",
    "encroachment": "construction",
    "other": "other",
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
DEFAULT_MODEL_PATH = Path(__file__).parent / "model" / "yolov8n.pt"
CONFIGURED_MODEL_PATH = os.getenv("CIVIC_MODEL_PATH", "").strip()
MODEL_PATH = Path(CONFIGURED_MODEL_PATH).expanduser() if CONFIGURED_MODEL_PATH else DEFAULT_MODEL_PATH

if CONFIGURED_MODEL_PATH and not MODEL_PATH.is_file():
    raise RuntimeError(f"CIVIC_MODEL_PATH does not point to a model file: {MODEL_PATH}")

MODEL_SOURCE = str(MODEL_PATH) if MODEL_PATH.is_file() else "yolov8n.pt (general-purpose COCO baseline)"
log.info("Loading YOLO model: %s", MODEL_SOURCE)
model = YOLO(str(MODEL_PATH) if MODEL_PATH.is_file() else "yolov8n.pt")

MODEL_CLASS_NAMES = {
    str(name).strip().lower()
    for name in model.names.values()
} if isinstance(model.names, dict) else {
    str(name).strip().lower()
    for name in model.names
}
UNSUPPORTED_MODEL_CLASSES = MODEL_CLASS_NAMES - set(LABEL_TO_CATEGORY)
if CONFIGURED_MODEL_PATH and (not MODEL_CLASS_NAMES or UNSUPPORTED_MODEL_CLASSES):
    unsupported_labels = ", ".join(sorted(UNSUPPORTED_MODEL_CLASSES))
    raise RuntimeError(
        "Configured model must contain at least one supported civic class, "
        f"and all class names must map to CivicSense categories. Unsupported: {unsupported_labels or 'none'}"
    )

CIVIC_MODEL_READY = bool(CONFIGURED_MODEL_PATH)
MODEL_NAME = MODEL_PATH.name if CIVIC_MODEL_READY else "yolov8n.pt (COCO baseline)"
MODEL_WARNING = None if CIVIC_MODEL_READY else (
    "The general-purpose YOLOv8 COCO model is loaded. It is not trained to recognize "
    "civic issues; configure CIVIC_MODEL_PATH with civic-trained weights for verification."
)
log.info("YOLO model loaded; civic model ready: %s", CIVIC_MODEL_READY)


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
    model: str = MODEL_NAME
    civic_model_ready: bool = CIVIC_MODEL_READY
    warning: Optional[str] = MODEL_WARNING


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
    return LABEL_TO_CATEGORY.get(label.strip().lower(), "other")


def pick_best_detection(results) -> tuple[str, str, float, list]:
    """
    Pick the highest-confidence detection and map it to a civic category.
    Returns (category_id, raw_label, confidence, all_objects).
    """
    detections = []
    for result in results:
        boxes  = result.boxes
        names  = result.names
        for box in boxes:
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
    return {
        "ok": True,
        "model": MODEL_NAME,
        "civic_model_ready": CIVIC_MODEL_READY,
        "warning": MODEL_WARNING,
        "service": "CivicSense AI",
    }


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
            imgsz=320,
            conf=0.25,          # minimum confidence threshold
            iou=0.45,
            max_det=10,
            device="cpu",
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
        model=MODEL_NAME,
        civic_model_ready=CIVIC_MODEL_READY,
        warning=MODEL_WARNING,
    )
