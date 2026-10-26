"""Validate data, train, evaluate, and predict with CivicSense YOLO models."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path
from typing import Any

import yaml
from ultralytics import YOLO


CIVIC_CLASSES = (
    "pothole",
    "garbage",
    "drainage",
    "water",
    "streetlight",
    "construction",
)
IMAGE_SUFFIXES = {".bmp", ".jpeg", ".jpg", ".png", ".tif", ".tiff", ".webp"}


def load_dataset_config(config_path: Path) -> tuple[dict[str, Any], dict[int, str]]:
    config_path = config_path.expanduser().resolve()
    if not config_path.is_file():
        raise ValueError(f"Dataset YAML does not exist: {config_path}")

    with config_path.open(encoding="utf-8") as config_file:
        config = yaml.safe_load(config_file)
    if not isinstance(config, dict):
        raise ValueError("Dataset YAML must contain a mapping.")

    names = config.get("names")
    if isinstance(names, list):
        classes = dict(enumerate(names))
    elif isinstance(names, dict):
        try:
            classes = {int(index): name for index, name in names.items()}
        except (TypeError, ValueError) as error:
            raise ValueError("Dataset class IDs must be integers starting at zero.") from error
    else:
        raise ValueError("Dataset YAML must define class names as a list or indexed mapping.")

    if sorted(classes) != list(range(len(classes))):
        raise ValueError("Dataset class IDs must be contiguous and start at zero.")
    class_names = tuple(classes[index] for index in range(len(classes)))
    if not class_names or any(name not in CIVIC_CLASSES for name in class_names):
        raise ValueError(
            "Dataset classes must be a non-empty subset of the API classes: "
            + ", ".join(CIVIC_CLASSES)
        )

    root_value = config.get("path", ".")
    root_path = Path(root_value).expanduser()
    if not root_path.is_absolute():
        root_path = config_path.parent / root_path
    config["path"] = str(root_path.resolve())
    return config, classes


def image_files(directory: Path) -> list[Path]:
    return sorted(
        file_path for file_path in directory.rglob("*")
        if file_path.is_file() and file_path.suffix.lower() in IMAGE_SUFFIXES
    )


def validate_split(
    dataset_root: Path,
    split_path: str,
    split_name: str,
    class_count: int,
) -> tuple[int, dict[str, str]]:
    images_dir = Path(split_path)
    if not images_dir.is_absolute():
        images_dir = dataset_root / images_dir
    images_dir = images_dir.resolve()
    if not images_dir.is_dir():
        raise ValueError(f"{split_name} images directory does not exist: {images_dir}")

    images = image_files(images_dir)
    if not images:
        raise ValueError(f"No supported images found in {split_name}: {images_dir}")
    if images_dir.parent.name != "images":
        raise ValueError(
            f"{split_name} must follow the dataset layout images/{split_name}: {images_dir}"
        )
    labels_dir = images_dir.parent.parent / "labels" / images_dir.name

    split_digests: dict[str, str] = {}
    for image_path in images:
        relative_image = image_path.relative_to(images_dir)
        label_path = labels_dir / relative_image.parent / f"{image_path.stem}.txt"
        if not label_path.is_file():
            raise ValueError(f"Missing YOLO label file for image: {image_path}")

        digest = hashlib.sha256(image_path.read_bytes()).hexdigest()
        if digest in split_digests:
            raise ValueError(
                f"Duplicate image content in {split_name}: {image_path} and "
                f"{split_digests[digest]}"
            )
        split_digests[digest] = str(image_path)

        for line_number, line in enumerate(label_path.read_text(encoding="utf-8").splitlines(), 1):
            if not line.strip():
                continue
            fields = line.split()
            if len(fields) != 5:
                raise ValueError(
                    f"{label_path}:{line_number}: expected class x_center y_center width height"
                )
            try:
                class_id = int(fields[0])
                box = [float(value) for value in fields[1:]]
            except ValueError as error:
                raise ValueError(f"{label_path}:{line_number}: label values must be numeric") from error
            if class_id < 0 or class_id >= class_count:
                raise ValueError(f"{label_path}:{line_number}: class ID is out of range")
            if not all(math.isfinite(value) and 0 <= value <= 1 for value in box):
                raise ValueError(f"{label_path}:{line_number}: box values must be between 0 and 1")
            if box[2] <= 0 or box[3] <= 0:
                raise ValueError(f"{label_path}:{line_number}: box width and height must be positive")
            x_center, y_center, width, height = box
            if (
                x_center - width / 2 < 0
                or x_center + width / 2 > 1
                or y_center - height / 2 < 0
                or y_center + height / 2 > 1
            ):
                raise ValueError(f"{label_path}:{line_number}: bounding box extends outside the image")

    return len(images), split_digests


def validate_dataset(config_path: Path) -> tuple[dict[str, Any], dict[int, str], dict[str, int]]:
    config, classes = load_dataset_config(config_path)
    dataset_root = Path(config["path"])
    digests_by_split: dict[str, dict[str, str]] = {}
    counts: dict[str, int] = {}
    for split_name in ("train", "val", "test"):
        split_path = config.get(split_name)
        if not isinstance(split_path, str) or not split_path.strip():
            raise ValueError(f"Dataset YAML must define the '{split_name}' image directory.")
        count, digests = validate_split(dataset_root, split_path, split_name, len(classes))
        counts[split_name] = count
        digests_by_split[split_name] = digests

    split_names = ("train", "val", "test")
    for index, first_split in enumerate(split_names):
        for second_split in split_names[index + 1:]:
            shared = digests_by_split[first_split].keys() & digests_by_split[second_split].keys()
            if shared:
                image_hash = next(iter(shared))
                raise ValueError(
                    "The same image content appears in both "
                    f"{first_split} and {second_split}: "
                    f"{digests_by_split[first_split][image_hash]} and "
                    f"{digests_by_split[second_split][image_hash]}"
                )

    return config, classes, counts


def add_device_option(options: dict[str, Any], device: str | None) -> None:
    if device:
        options["device"] = device


def metrics_report(metrics: Any) -> dict[str, Any]:
    box_metrics = metrics.box
    return {
        "precision": float(box_metrics.mp),
        "recall": float(box_metrics.mr),
        "map50": float(box_metrics.map50),
        "map50_95": float(box_metrics.map),
        "per_class_map50_95": {
            str(metrics.names[class_id]): float(score)
            for class_id, score in enumerate(box_metrics.maps)
            if class_id in metrics.names
        },
    }


def write_json(file_path: Path, content: dict[str, Any]) -> None:
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(json.dumps(content, indent=2) + "\n", encoding="utf-8")


def train(args: argparse.Namespace) -> int:
    _, classes, counts = validate_dataset(args.data)
    print("Dataset validated:")
    for split_name, count in counts.items():
        print(f"  {split_name}: {count} images")

    model = YOLO(args.model)
    options: dict[str, Any] = {
        "data": str(args.data.resolve()),
        "epochs": args.epochs,
        "imgsz": args.imgsz,
        "batch": args.batch,
        "project": str(args.project),
        "name": args.name,
        "seed": args.seed,
        "patience": args.patience,
        "workers": args.workers,
        "deterministic": True,
        "exist_ok": False,
    }
    add_device_option(options, args.device)
    model.train(**options)

    best_weights = Path(model.trainer.best).resolve()
    if not best_weights.is_file():
        raise RuntimeError(f"Training completed without best weights at {best_weights}")

    test_model = YOLO(str(best_weights))
    test_options: dict[str, Any] = {
        "data": str(args.data.resolve()),
        "split": "test",
        "imgsz": args.imgsz,
        "project": str(args.project),
        "name": f"{args.name}-test",
        "exist_ok": True,
    }
    add_device_option(test_options, args.device)
    test_metrics = test_model.val(**test_options)
    report = {
        "weights": str(best_weights),
        "classes": classes,
        "dataset_counts": counts,
        "test_metrics": metrics_report(test_metrics),
        "note": "Test metrics are for this held-out dataset only; they do not guarantee field accuracy.",
    }
    report_path = best_weights.parent.parent / "test_metrics.json"
    write_json(report_path, report)
    print(f"\nBest weights: {best_weights}")
    print(f"Held-out test metrics: {json.dumps(report['test_metrics'], indent=2)}")
    print(f"Saved report: {report_path}")
    return 0


def evaluate(args: argparse.Namespace) -> int:
    _, classes, counts = validate_dataset(args.data)
    weights = args.weights.expanduser().resolve()
    if not weights.is_file():
        raise ValueError(f"Model weights do not exist: {weights}")

    model = YOLO(str(weights))
    options: dict[str, Any] = {
        "data": str(args.data.resolve()),
        "split": args.split,
        "imgsz": args.imgsz,
        "project": str(args.project),
        "name": args.name,
        "exist_ok": True,
    }
    add_device_option(options, args.device)
    result = model.val(**options)
    report = {
        "weights": str(weights),
        "classes": classes,
        "dataset_counts": counts,
        "split": args.split,
        "metrics": metrics_report(result),
        "note": "Metrics are not a guarantee of real-world accuracy.",
    }
    report_path = args.project / args.name / "metrics.json"
    write_json(report_path, report)
    print(json.dumps(report, indent=2))
    print(f"Saved report: {report_path}")
    return 0


def predict(args: argparse.Namespace) -> int:
    weights = args.weights.expanduser().resolve()
    source = args.source.expanduser().resolve()
    if not weights.is_file():
        raise ValueError(f"Model weights do not exist: {weights}")
    if not source.exists():
        raise ValueError(f"Prediction source does not exist: {source}")

    model = YOLO(str(weights))
    options: dict[str, Any] = {
        "source": str(source),
        "conf": args.confidence,
        "stream": True,
        "save": True,
        "project": str(args.output.parent.resolve()),
        "name": args.output.name,
        "exist_ok": True,
    }
    add_device_option(options, args.device)
    results = model.predict(**options)

    predictions: list[dict[str, Any]] = []
    for result in results:
        detections = []
        boxes = result.boxes
        if boxes is not None:
            for box in boxes:
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])
                label = str(result.names[class_id])
                coordinates = [float(value) for value in box.xyxyn[0].tolist()]
                detections.append({
                    "label": label,
                    "confidence": round(confidence, 4),
                    "bbox": coordinates,
                })
        detections.sort(key=lambda item: item["confidence"], reverse=True)
        predictions.append({
            "image": str(result.path),
            "prediction": detections[0]["label"] if detections else "unknown",
            "confidence": detections[0]["confidence"] if detections else 0.0,
            "detections": detections,
        })

    output_directory = args.output.parent / args.output.name
    report_path = output_directory / "predictions.json"
    write_json(report_path, {"weights": str(weights), "predictions": predictions})
    print(f"Annotated images and predictions saved in: {output_directory.resolve()}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)

    check_parser = commands.add_parser("check-data", help="Validate YOLO dataset layout and labels")
    check_parser.add_argument("--data", type=Path, required=True, help="Dataset YAML path")
    check_parser.set_defaults(handler=lambda args: check_data(args.data))

    train_parser = commands.add_parser("train", help="Train a model and evaluate held-out test data")
    train_parser.add_argument("--data", type=Path, required=True, help="Dataset YAML path")
    train_parser.add_argument("--model", default="yolov8n.pt", help="Starting weights or model name")
    train_parser.add_argument("--epochs", type=int, default=100)
    train_parser.add_argument("--imgsz", type=int, default=640)
    train_parser.add_argument("--batch", type=int, default=16)
    train_parser.add_argument("--device", help="Ultralytics device, e.g. cpu, 0")
    train_parser.add_argument("--project", type=Path, default=Path("runs/civic"))
    train_parser.add_argument("--name", default="yolov8n")
    train_parser.add_argument("--seed", type=int, default=42)
    train_parser.add_argument("--patience", type=int, default=20)
    train_parser.add_argument("--workers", type=int, default=4)
    train_parser.set_defaults(handler=train)

    evaluate_parser = commands.add_parser("evaluate", help="Evaluate weights on a held-out split")
    evaluate_parser.add_argument("--data", type=Path, required=True, help="Dataset YAML path")
    evaluate_parser.add_argument("--weights", type=Path, required=True)
    evaluate_parser.add_argument("--split", choices=("val", "test"), default="test")
    evaluate_parser.add_argument("--imgsz", type=int, default=640)
    evaluate_parser.add_argument("--device", help="Ultralytics device, e.g. cpu, 0")
    evaluate_parser.add_argument("--project", type=Path, default=Path("runs/evaluation"))
    evaluate_parser.add_argument("--name", default="civic-test")
    evaluate_parser.set_defaults(handler=evaluate)

    predict_parser = commands.add_parser("predict", help="Predict on an image or image directory")
    predict_parser.add_argument("--weights", type=Path, required=True)
    predict_parser.add_argument("--source", type=Path, required=True)
    predict_parser.add_argument("--confidence", type=float, default=0.4)
    predict_parser.add_argument("--device", help="Ultralytics device, e.g. cpu, 0")
    predict_parser.add_argument("--output", type=Path, default=Path("runs/predict/civic"))
    predict_parser.set_defaults(handler=predict)

    return parser


def check_data(data_path: Path) -> int:
    _, classes, counts = validate_dataset(data_path)
    print("Dataset is valid.")
    print(f"Classes: {', '.join(classes.values())}")
    for split_name, count in counts.items():
        print(f"  {split_name}: {count} images")
    return 0


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        return args.handler(args)
    except (OSError, RuntimeError, ValueError, yaml.YAMLError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
