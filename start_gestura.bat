@echo off
title GESTURA Full-Stack Launcher
echo ========================================================
echo Launching GESTURA Two-Way ASL Communicator...
echo ========================================================

cd /d "%~dp0"

echo [1/2] Starting Python Recognition Backend on port 8000...
start "GESTURA Backend (Port 8000)" cmd /k "backend\.venv\Scripts\python.exe backend\run.py"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Vite Frontend on port 5173...
start "GESTURA Frontend (Port 5173)" cmd /k "cd frontend && npm.cmd run dev"

echo.
echo ========================================================
echo GESTURA is launching!
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo ========================================================
