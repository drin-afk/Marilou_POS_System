@echo off
title Marilou Sari-Sari Store POS Launcher
echo ========================================================
echo   MARILOU SARI-SARI STORE POS SYSTEM
echo ========================================================
echo.
echo Starting Laravel Backend API on http://127.0.0.1:8000 ...
start "Marilou POS Backend (Laravel)" cmd /k "cd /d "%~dp0backend" && C:\xampp\php\php.exe artisan serve --host=127.0.0.1 --port=8000"

echo Starting React Frontend on http://localhost:5173 ...
start "Marilou POS Frontend (Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 3 /nobreak >nul
start http://localhost:5173
echo.
echo POS System launched! Close the two terminal windows when finished.
