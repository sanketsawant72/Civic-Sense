import asyncio
import base64
import io
import unittest
from unittest.mock import patch

from PIL import Image

import main


class FakeResponse:
    def raise_for_status(self):
        pass

    def json(self):
        return {
            "candidates": [{
                "content": {
                    "parts": [{
                        "text": (
                            '{"category":"water","confidence":0.95,'
                            '"issue_description":"A leaking pipe.",'
                            '"detected_objects":["pipe"],"urgency":"Urgent"}'
                        )
                    }]
                }
            }]
        }


class FakeClient:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        return False

    async def post(self, url, *, headers, json):
        self.request = {"url": url, "headers": headers, "json": json}
        return FakeResponse()


def encoded_test_image():
    image = io.BytesIO()
    Image.new("RGB", (1, 1)).save(image, format="JPEG")
    return base64.b64encode(image.getvalue()).decode("ascii")


class GeminiClassificationTests(unittest.TestCase):
    def test_classifies_image_using_api_key_header(self):
        client = FakeClient()
        with (
            patch.object(main, "GEMINI_READY", True),
            patch.object(main, "GEMINI_API_KEY", "test-key"),
            patch.object(main.httpx, "AsyncClient", return_value=client),
        ):
            result = asyncio.run(
                main.classify(main.ClassifyRequest(image=encoded_test_image()))
            )

        self.assertEqual(result.category, "water")
        self.assertEqual(result.urgency, "Urgent")
        self.assertTrue(result.ai_powered)
        self.assertNotIn("key=", client.request["url"])
        self.assertEqual(client.request["headers"]["x-goog-api-key"], "test-key")

    def test_returns_manual_review_fallback_without_api_key(self):
        with patch.object(main, "GEMINI_READY", False):
            result = asyncio.run(
                main.classify(main.ClassifyRequest(image=""))
            )

        self.assertTrue(result.fallback)
        self.assertFalse(result.ai_powered)
        self.assertEqual(result.category, "other")


if __name__ == "__main__":
    unittest.main()
