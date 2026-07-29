@echo off
title Aaryan Aqua Needs - GST Billing System Launcher
cd /d "%~dp0"
echo Starting Aaryan Aqua Needs GST Billing System...

:: Start local HTTP server in background if python is available, otherwise open file directly
where python >nul 2>nul
if %errorlevel% equ 0 (
    powershell -Command "Start-Process python -ArgumentList '-m http.server 8000' -WindowStyle Hidden"
    timeout /t 1 /nobreak >nul
    start "" "http://localhost:8000"
) else (
    start "" "%~dp0index.html"
)
exit
