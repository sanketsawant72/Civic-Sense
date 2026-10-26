import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).parent))
from civic_ml import CIVIC_CLASSES, validate_dataset
from import_roboflow import import_dataset, polygon_to_box


class DatasetValidationTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.config_path = self.root / "dataset.yaml"
        self.config_path.write_text(
            yaml.safe_dump({
                "path": ".",
                "train": "images/train",
                "val": "images/val",
                "test": "images/test",
                "names": {index: label for index, label in enumerate(CIVIC_CLASSES)},
            }),
            encoding="utf-8",
        )
        for split in ("train", "val", "test"):
            self.write_image(split, f"{split}.jpg", f"{split} image")

    def tearDown(self):
        self.temp_dir.cleanup()

    def write_image(self, split, filename, content):
        image_path = self.root / "images" / split / filename
        label_path = self.root / "labels" / split / f"{Path(filename).stem}.txt"
        image_path.parent.mkdir(parents=True, exist_ok=True)
        label_path.parent.mkdir(parents=True, exist_ok=True)
        image_path.write_bytes(content.encode("utf-8"))
        label_path.write_text("0 0.5 0.5 0.4 0.3\n", encoding="utf-8")
        return image_path, label_path

    def test_accepts_valid_dataset_and_returns_split_counts(self):
        _, classes, counts = validate_dataset(self.config_path)
        self.assertEqual(tuple(classes.values()), CIVIC_CLASSES)
        self.assertEqual(counts, {"train": 1, "val": 1, "test": 1})

    def test_rejects_missing_annotation_file(self):
        _, label_path = self.write_image("train", "missing-label.jpg", "image")
        label_path.unlink()
        with self.assertRaisesRegex(ValueError, "Missing YOLO label file"):
            validate_dataset(self.config_path)

    def test_rejects_class_id_outside_dataset_classes(self):
        _, label_path = self.write_image("train", "wrong-class.jpg", "image")
        label_path.write_text("6 0.5 0.5 0.4 0.3\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "class ID is out of range"):
            validate_dataset(self.config_path)

    def test_rejects_bounding_box_outside_image(self):
        _, label_path = self.write_image("train", "outside-box.jpg", "image")
        label_path.write_text("0 0.1 0.5 0.4 0.3\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "extends outside the image"):
            validate_dataset(self.config_path)

    def test_rejects_same_image_in_multiple_splits(self):
        self.write_image("test", "copy.jpg", "train image")
        with self.assertRaisesRegex(ValueError, "same image content"):
            validate_dataset(self.config_path)


class RoboflowImportTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.zip_path = self.root / "dataset.zip"

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_converts_polygon_annotation_to_detection_box(self):
        result = polygon_to_box(
            ["0", "0.1", "0.2", "0.5", "0.2", "0.5", "0.8", "0.1", "0.8"],
            ["garbage"],
            "sample.txt",
            1,
        )
        self.assertEqual(result, "0 0.30000000 0.50000000 0.40000000 0.60000000")

    def test_keeps_existing_box_and_imports_roboflow_splits(self):
        with zipfile.ZipFile(self.zip_path, "w") as archive:
            archive.writestr(
                "data.yaml",
                "train: train/images\nval: valid/images\ntest: test/images\nnames: [garbage]\n",
            )
            for split in ("train", "valid", "test"):
                archive.writestr(f"{split}/images/{split}.jpg", f"{split} image")
                annotation = (
                    "0 0.1 0.2 0.5 0.2 0.5 0.8 0.1 0.8\n"
                    if split == "train"
                    else "0 0.5 0.5 0.4 0.3\n"
                )
                archive.writestr(f"{split}/labels/{split}.txt", annotation)

        output = self.root / "output"
        result = import_dataset(self.zip_path, output)
        self.assertEqual(result["classes"], ["garbage"])
        self.assertEqual(result["splits"]["val"]["images"], 1)
        self.assertEqual(
            (output / "labels/train/train.txt").read_text(encoding="utf-8").strip(),
            "0 0.30000000 0.50000000 0.40000000 0.60000000",
        )
        self.assertEqual(
            (output / "labels/val/valid.txt").read_text(encoding="utf-8").strip(),
            "0 0.50000000 0.50000000 0.40000000 0.30000000",
        )
        _, classes, counts = validate_dataset(result["config"])
        self.assertEqual(tuple(classes.values()), ("garbage",))
        self.assertEqual(counts, {"train": 1, "val": 1, "test": 1})

    def test_rejects_unsafe_archive_path(self):
        with zipfile.ZipFile(self.zip_path, "w") as archive:
            archive.writestr("../escape.txt", "unsafe")
        with self.assertRaisesRegex(ValueError, "Unsafe path"):
            import_dataset(self.zip_path, self.root / "output")


if __name__ == "__main__":
    unittest.main()
