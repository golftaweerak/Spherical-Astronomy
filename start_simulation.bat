@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo ===================================================
echo   POSN Astronomy 3D Simulation Launcher
echo   กำลังเริ่มต้น Local Web Server ที่ http://localhost:8000
echo ===================================================
start http://localhost:8000/index.html
python -m http.server 8000
