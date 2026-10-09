@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo ===================================================
echo   POSN Astronomy Simulation Unit Test Runner
echo ===================================================
echo กำลังทดสอบฟังก์ชันคณิตศาสตร์ดาราศาสตร์ (astro-math.js)...
echo.
node test-all.mjs
echo.
echo ===================================================
pause
