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
  "category": "other",
  "category_label": "Other Civic Issue",
  "confidence": 0.0,
  "top_label": "unknown",
  "detected_objects": [],
  "ai_powered": true,
  "model": "YOLOv8n"
}
```

The report form accepts a photo only when the classifier finds a direct civic-issue
label at 40% confidence or higher, and blocks submission if the selected report
category does not match the photo. Unrecognized images return `other`; everyday
objects (for example cars, bottles, and traffic lights) are deliberately not used
as evidence of an issue.

## Custom model

Replace `model/yolov8n.pt` with your fine-tuned weights and update
the exact-label `LABEL_TO_CATEGORY` mapping in `main.py`. The stock YOLOv8 COCO
weights do not recognize most civic conditions (including potholes, power faults,
and illegal construction), so strict photo verification requires civic-issue
weights trained to emit the supported labels. Until those weights are installed,
the form rejects photos the model cannot verify rather than accepting unrelated
images.
