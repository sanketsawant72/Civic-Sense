#!/bin/bash
echo "Starting CivicSense AI Service..."
cd "$(dirname "$0")"
python -m pip install -r requirements.txt -q
python -m uvicorn main:app --host 0.0.0.0 --port 49200 --reload
