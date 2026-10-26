"""Import a Roboflow YOLOv8 ZIP and convert polygon labels to YOLO boxes."""

from __future__ import annotations

import argparse
import math
import shutil
import sys
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any

import yaml


CLASS_ALIASES = {
    "pothole": "pothole",
    "potholes": "pothole",
    "road damage": "pothole",
    "road crack": "pothole",
    "garbage": "garbage",
    "trash": "garbage",
    "waste": "garbage",
    "illegal dumping": "garbage",
    "overflowing bin": "garbage",
    "drainage": "drainage",
    "sewage": "drainage",
    "blocked drain": "drainage",
    "waterlogging": "drainage",
    "flooding": "drainage",
    "water": "water",
    "water leak": "water",
    "leakage": "water",
    "streetlight": "streetlight",
    "street light": "streetlight",
    "broken street lights": "streetlight",
    "broken_street_lights": "streetlight",
    "electric pole": "streetlight",
    "fallen tree": "other",
    "fallen_tree": "other",
    "construction": "construction",
    "illegal construction": "construction",
    "encroachment": "construction",
}
CANONICAL_CLASS_ORDER = (
    "pothole", "garbage", "drainage", "water", "streetlight", "construction", "other",
)
IMAGE_SUFFIXES = {".bmp", ".jpeg", ".jpg", ".png", ".tif", ".tiff", ".webp"}
SPLIT_NAMES = {"train": "train", "valid": "val", "val": "val", "test": "test"}


def parse_class_names(value: Any) -> tuple[list[str], list[int]]:
    if isinstance(value, list):
        names = value
    elif isinstance(value, dict):
        try:
            indexed = {int(index): name for index, name in value.items()}
        except (TypeError, ValueError) as error:
            raise ValueError("Dataset class IDs must be integers.") from error
        if sorted(indexed) != list(range(len(indexed))):
            raise ValueError("Dataset class IDs must be contiguous and start at zero.")
        names = [indexed[index] for index in range(len(indexed))]
    else:
        raise ValueError("data.yaml must define class names in 'names'.")

    source_names = [str(name).strip().lower() for name in names]
    unsupported = [name for name in source_names if name not in CLASS_ALIASES]
    if not source_names or unsupported:
        raise ValueError(f"Unsupported dataset class names: {', '.join(unsupported) or 'none'}")

    normalized = [CLASS_ALIASES[name] for name in source_names]
    canonical_names = [name for name in CANONICAL_CLASS_ORDER if name in normalized]
    class_id_map = [canonical_names.index(name) for name in normalized]
    return canonical_names, class_id_map


def safe_archive_path(name: str) -> PurePosixPath:
    path = PurePosixPath(name)
    if path.is_absolute() or not path.parts or any(part in ("", ".", "..") for part in path.parts):
        raise ValueError(f"Unsafe path in dataset ZIP: {name}")
    if ":" in path.parts[0]:
        raise ValueError(f"Unsafe path in dataset ZIP: {name}")
    return path


def polygon_to_box(fields: list[str], class_id_map: list[int], filename: str, line_number: int) -> str:
    try:
        class_id = int(fields[0])
        coordinates = [float(value) for value in fields[1:]]
    except ValueError as error:
        raise ValueError(f"{filename}:{line_number}: annotation values must be numeric") from error
    if class_id < 0 or class_id >= len(class_id_map):
        raise ValueError(f"{filename}:{line_number}: class ID is outside the data.yaml names")
    if not all(math.isfinite(value) and 0 <= value <= 1 for value in coordinates):
        raise ValueError(f"{filename}:{line_number}: annotation values must be between 0 and 1")

    if len(coordinates) == 4:
        x_center, y_center, width, height = coordinates
    else:
        if len(coordinates) < 6 or len(coordinates) % 2 != 0:
            raise ValueError(
                f"{filename}:{line_number}: expected a box or at least three polygon x/y points"
            )
        xs = coordinates[0::2]
        ys = coordinates[1::2]
        x_min, x_max = min(xs), max(xs)
        y_min, y_max = min(ys), max(ys)
        x_center, y_center = (x_min + x_max) / 2, (y_min + y_max) / 2
        width, height = x_max - x_min, y_max - y_min

    if width <= 0 or height <= 0:
        raise ValueError(f"{filename}:{line_number}: annotation must have non-zero width and height")
    if (
        x_center - width / 2 < -1e-9 or x_center + width / 2 > 1 + 1e-9
        or y_center - height / 2 < -1e-9 or y_center + height / 2 > 1 + 1e-9
    ):
        raise ValueError(f"{filename}:{line_number}: bounding box extends outside the image")
    return f"{class_id_map[class_id]} {x_center:.8f} {y_center:.8f} {width:.8f} {height:.8f}"


def import_dataset(zip_path: Path, output_path: Path, overwrite: bool = False) -> dict[str, Any]:
    zip_path = zip_path.expanduser().resolve()
    output_path = output_path.expanduser().resolve()
    if not zip_path.is_file():
        raise ValueError(f"Dataset ZIP does not exist: {zip_path}")
    if output_path.exists():
        if not overwrite:
            raise ValueError(f"Output already exists: {output_path} (use --overwrite to replace it)")
        shutil.rmtree(output_path)

    with zipfile.ZipFile(zip_path) as archive:
        entries: dict[PurePosixPath, zipfile.ZipInfo] = {}
        for entry in archive.infolist():
            if entry.is_dir():
                continue
            path = safe_archive_path(entry.filename)
            entries[path] = entry

        yaml_candidates = [path for path in entries if path.name == "data.yaml"]
        if len(yaml_candidates) != 1:
            raise ValueError(f"Expected exactly one data.yaml in ZIP; found {len(yaml_candidates)}")
        with archive.open(entries[yaml_candidates[0]]) as data_file:
            source_config = yaml.safe_load(data_file)
        if not isinstance(source_config, dict):
            raise ValueError("data.yaml must contain a YAML mapping.")
        class_names, class_id_map = parse_class_names(source_config.get("names"))

        output_path.mkdir(parents=True)
        split_counts = {
            split: {"images": 0, "objects": 0, "empty_labels": 0}
            for split in ("train", "val", "test")
        }
        found_source_splits: set[str] = set()
        for path, entry in entries.items():
            if len(path.parts) < 3:
                continue
            source_split, kind = path.parts[0], path.parts[1]
            normalized_split = SPLIT_NAMES.get(source_split)
            if not normalized_split or kind not in ("images", "labels"):
                continue
            found_source_splits.add(source_split)
            relative_parts = path.parts[2:]
            relative = Path(*relative_parts)
            if kind == "images":
                if Path(path.name).suffix.lower() not in IMAGE_SUFFIXES:
                    continue
                destination = output_path / "images" / normalized_split / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                with archive.open(entry) as source, destination.open("wb") as target:
                    shutil.copyfileobj(source, target)
                split_counts[normalized_split]["images"] += 1
                continue

            if Path(path.name).suffix.lower() != ".txt":
                continue
            with archive.open(entry) as label_file:
                source_text = label_file.read().decode("utf-8-sig")
            output_lines = []
            for line_number, line in enumerate(source_text.splitlines(), 1):
                fields = line.split()
                if not fields:
                    continue
                output_lines.append(polygon_to_box(fields, class_id_map, entry.filename, line_number))
            destination = output_path / "labels" / normalized_split / relative.with_suffix(".txt")
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(
                "\n".join(output_lines) + ("\n" if output_lines else ""),
                encoding="utf-8",
            )
            split_counts[normalized_split]["objects"] += len(output_lines)
            if not output_lines:
                split_counts[normalized_split]["empty_labels"] += 1

        if not {"train", "test"}.issubset(found_source_splits):
            raise ValueError("ZIP must contain train and test image/label splits.")
        if not ({"val", "valid"} & found_source_splits):
            raise ValueError("ZIP must contain a val or valid image/label split.")

    config = {
        "path": str(output_path),
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "names": {index: name for index, name in enumerate(class_names)},
    }
    config_path = output_path / "dataset.yaml"
    config_path.write_text(yaml.safe_dump(config, sort_keys=False), encoding="utf-8")
    return {"config": config_path, "splits": split_counts, "classes": class_names}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--zip", type=Path, required=True, help="Path to Roboflow YOLOv8 export ZIP")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("civic-dataset"),
        help="Destination folder (default: civic-dataset)",
    )
    parser.add_argument("--overwrite", action="store_true", help="Replace the output folder if it exists")
    args = parser.parse_args()
    try:
        result = import_dataset(args.zip, args.output, overwrite=args.overwrite)
    except (OSError, RuntimeError, ValueError, zipfile.BadZipFile, yaml.YAMLError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    print(f"Imported classes: {', '.join(result['classes'])}")
    for split, counts in result["splits"].items():
        print(
            f"{split}: {counts['images']} images, {counts['objects']} annotations, "
            f"{counts['empty_labels']} empty labels"
        )
    print(f"Dataset config: {result['config']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
