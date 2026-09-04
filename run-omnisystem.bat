@echo off
title تشغيل نظام OmniFly Pro
cd /d "%~dp0"

:: تشغيل السيرفر
start cmd /k "npm run dev"

:: انتظار 5 ثواني
timeout /t 5 /nobreak >nul

:: فتح المتصفح
start "" "http://localhost:4050/"

echo =======================================================================
echo         نظام OmniFly Pro يعمل الآن على المنفذ 4050
echo         http://localhost:4050/
echo =======================================================================

exit