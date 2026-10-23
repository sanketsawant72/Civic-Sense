# CivicSense AI Service

YOLOv8-powered civic issue image classifier.

## Requirements
- Python 3.10+
- pip

## Setup & Run

```bash
# Windows
ai-service\start.bat

# Linux / Mac
bash ai-service/start.sh

# Or install dependencies manually
cd ai-service
pip install -r requirements.txt

# Start the service
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

`npm run dev:ai` installs the Python requirements before starting the service.
You can also install them from the project root with `npm run ai:install`.

Service runs on **http://localhost:8000**

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| POST | `/classify` | Classify a civic issue image |

## /classify request

```json
{
  "image": "<base64-encoded JPEG/PNG>",
  "filename": "photo.jpg"
}
```

## /classify response

```json
{
  "category": "pothole",
  "category_label": "Pothole & Road Damage",
  "confidence": 0.87,
  "top_label": "car",
  "detected_objects": [
    { "label": "car", "confidence": 0.87, "bbox": [0.1, 0.2, 0.5, 0.6] }
  ],
  "ai_powered": true,
  "model": "YOLOv8n"
}
```

## Custom model

Replace `model/yolov8n.pt` with your fine-tuned weights and update
the `LABEL_TO_CATEGORY` mapping in `main.py`.
