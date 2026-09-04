@echo off
chcp 65001 >nul 2>&1
title OmniFly Pro - نظام السفر والسياحة والمبيعات
cd /d "%~dp0"

echo ================================================
echo   OmniFly Pro - نظام إدارة السفر والسياحة والمحاسبة
echo   جاري فحص وتجهيز تشغيل النظام...
echo ================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [خطأ] Node.js غير مثبت على الجهاز!
    echo يرجى تحميل وتثبيت Node.js من الموقع الرسمي: https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [تنبيه] التبعيات غير مثبتة، جاري تثبيت حزم النظام تلقائياً...
    call npm install
    if errorlevel 1 (
        echo [خطأ] فشل تثبيت الحزم عبر npm.
        pause
        exit /b 1
    )
)

echo [1/2] تشغيل سيرفر OmniFly Pro الموحد على المنفذ 4050...
start "OmniFly Pro Server" cmd /k "npm run dev"

timeout /t 4 /nobreak >nul

echo [2/2] فتح الواجهة الرئيسية في المتصفح...
start "" "http://localhost:4050/"

echo.
echo ================================================
echo   النظام يعمل الآن بنجاح على المنفذ 4050!
echo   الرابط: http://localhost:4050/
echo.
echo   بيانات الدخول الافتراضية:
echo   المدير:   admin / admin123
echo   الموظف:   cashier / cashier123
echo ================================================
exit