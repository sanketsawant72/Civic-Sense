@echo off
echo Starting CivicSense AI Service...
echo.
cd /d "%~dp0"
python -m pip install -r requirements.txt --quiet
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
