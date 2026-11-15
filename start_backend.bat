@echo off
title GESTURA Backend Server
echo ========================================================
echo Starting GESTURA Recognition Backend (Port 8000)...
echo ========================================================
cd /d "%~dp0"
if exist "backend\.venv\Scripts\python.exe" (
    "backend\.venv\Scripts\python.exe" backend\run.py
) else (
    python backend\run.py
)
pause
