# CivicSense AI Service

Gemini-powered civic issue image classifier. The service uses the Gemini REST
API when `GEMINI_API_KEY` is configured; without a key it returns a manual-review
fallback so reports can still be submitted.

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

# Set the Gemini key in ai-service/.env, then start the service
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

`npm run dev:ai` installs the Python requirements before starting the service
on port 8000, which is the port used by the Express API's local default.
You can also install them from the project root with `npm run ai:install`.

Service runs on **http://localhost:8000**

Set `GEMINI_API_KEY` in `ai-service/.env` to enable Gemini classification. Do not
commit that file or expose the key in frontend code.

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
  "issue_description": "AI unavailable — please describe the issue manually.",
  "detected_objects": [],
  "urgency": "Normal",
  "ai_powered": false,
  "fallback": true
}
```

With a configured Gemini key, responses include the detected category,
description, confidence, urgency, model name, and `ai_powered: true`. The report
form uses the returned category and confidence for photo verification. Gemini
results are predictions and should be reviewed; they are not an accuracy
guarantee.

## Train, test, and predict

The repository does not include a labeled civic-issue dataset. This pipeline uses
YOLO object detection labels: each issue in a photo needs a bounding box and one
class ID.

### 1. Prepare and label images

Use an annotation tool that exports YOLO detection labels. Create this structure:

```text
ai-service/civic-dataset/
  images/
    train/
    val/
    test/
  labels/
    train/
    val/
    test/
```

Every image needs a matching `.txt` file under the corresponding `labels` split.
Each non-empty line is `class_id x_center y_center width height`, with normalized
coordinates from 0 to 1. Images with no civic issue should have an empty label
file. Keep photos from the same scene, burst, or video in only one split to avoid
data leakage. Include diverse conditions and non-issue examples; do not put
personal or sensitive information in a public dataset.

Use these class IDs in this exact order, matching
[`dataset.example.yaml`](./dataset.example.yaml):

| ID | CivicSense class |
|---:|---|
| 0 | `pothole` |
| 1 | `garbage` |
| 2 | `drainage` |
| 3 | `water` |
| 4 | `streetlight` |
| 5 | `construction` |
| 6 | `other` |

Copy `dataset.example.yaml` to `dataset.yaml` and set `path` to the dataset's
absolute folder path (for example, `C:/data/civic-dataset` on Windows). Ultralytics
resolves relative dataset paths against its configured global datasets folder, not
the YAML file's directory. Do not commit the photos or trained weights to Git.

Import a Roboflow YOLOv8 ZIP with:

```powershell
python import_roboflow.py --zip "C:\path\to\dataset.yolov8.zip" --output civic-dataset
```

The importer reads the class names and train/validation/test splits from
`data.yaml`, converts YOLO polygon segmentation annotations to bounding boxes,
maps supported source labels to CivicSense classes, and writes
`civic-dataset/dataset.yaml` with an absolute dataset path. For example,
`broken_street_lights` maps to `streetlight`, `illegal dumping` and
`overflowing bin` map to `garbage`, `waterlogging` maps to `drainage`, and
`fallen_tree` maps to `other`. It refuses to overwrite an existing output unless
`--overwrite` is provided.

The provided Civic Issues v6 export is the superset of the supplied v3, v4, and
v5 exports: the older archives' images are exact subsets of v6 with matching
train/validation/test splits. Import **v6 only** to avoid duplicating the same
photos across data splits. Keep all dataset archives local; they are excluded
from Git.

```powershell
python import_roboflow.py --zip "C:\Users\Sanket\Downloads\Civic Issues.v6-waterlogging.yolov8.zip" --output civic-issues-v6
```

### 2. Install and validate the dataset

```powershell
cd ai-service
python -m pip install -r requirements.txt
python -m pip install pyyaml ultralytics
python civic_ml.py check-data --data civic-issues-v6/dataset.yaml
python -m unittest test_civic_ml.py
```

The second install is only needed for the optional dataset and YOLO training
utilities; the running Gemini API service does not use those packages.

The validator checks split directories, labels, class IDs, normalized boxes, and
identical images leaking across splits. Fix every reported error before training.

### 3. Train and evaluate on held-out test images

```powershell
python civic_ml.py train --data civic-issues-v6/dataset.yaml --epochs 100 --batch 16 --device 0
```

Use `--device cpu` if there is no compatible NVIDIA GPU; CPU training may take
much longer. Training uses the `train` images and monitors the `val` split. At
the end, it evaluates `best.pt` once on the separate `test` split and writes
`test_metrics.json` next to the model weights. The printed precision, recall,
mAP@0.5, mAP@0.5:0.95, and per-class metrics describe this dataset only; they
are not a promise of real-world accuracy. Review per-class errors and test
additional photos from the actual reporting environment before deployment.

Re-evaluate saved weights without retraining:

```powershell
python civic_ml.py evaluate --data civic-issues-v6/dataset.yaml --weights runs/civic/yolov8n/weights/best.pt --split test
```

### 4. Predict on new photos

```powershell
python civic_ml.py predict --weights runs/civic/yolov8n/weights/best.pt --source path\to\photo.jpg
```

Annotated images and `predictions.json` are written to `runs/predict/civic`.
The default detection confidence is 0.4; change it with `--confidence`.

### 5. Optional YOLO training tools

The YOLO training and evaluation scripts above are optional utilities and are
not used by the current Gemini-powered `main.py` service. They remain available
for future model experiments; their outputs do not change the live service.
