@echo off
title Aaryan Aqua Needs - GST Billing System Launcher
cd /d "%~dp0"
echo Starting Aaryan Aqua Needs GST Billing System & WhatsApp Server...

:: Check if server is already running on port 8000
netstat -ano | findstr :8000 >nul 2>&1
if %errorlevel% neq 0 (
    start /b node server.js >nul 2>&1
    ping -n 3 127.0.0.1 >nul
)

:: Launch in App Mode / Browser
start msedge --app="http://localhost:8000" || start chrome --app="http://localhost:8000" || start http://localhost:8000
exit
