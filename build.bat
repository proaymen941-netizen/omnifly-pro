@echo off
title Building Desktop Application - itqan soft

:: التحقق من صلاحيات المسؤول والطلب إذا لزم الأمر
NET SESSION >nul 2>&1
if %errorlevel% neq 0 (
    echo ============================================
    echo   Requesting Administrator privileges...
    echo   Please click YES when UAC prompt appears
    echo ============================================
    echo.
    timeout /t 2 /nobreak >nul
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: تعيين الترميز والمسارات
chcp 65001 >nul 2>&1
cd /d "%~dp0"

echo ============================================
echo   Building Desktop Application
echo   itqan soft - POS System
echo ============================================
echo.

:: ============================================
:: 1. التحقق من الأدوات الأساسية
:: ============================================
echo [1/7] Checking development tools...

:: التحقق من Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not installed!
    echo Please download and install Node.js from:
    echo https://nodejs.org
    echo.
    echo After installation, restart this script.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo [OK] Node.js %%i

:: التحقق من npm
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm not found! Please reinstall Node.js.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do echo [OK] npm %%i

:: التحقق من pnpm وتثبيته إذا لزم الأمر
echo [2/7] Checking pnpm...
where pnpm >nul 2>&1
if errorlevel 1 (
    echo Installing pnpm globally...
    call npm install -g pnpm
    if errorlevel 1 (
        echo [ERROR] Failed to install pnpm
        echo Try: npm install -g pnpm --force
        pause
        exit /b 1
    )
)
for /f "tokens=*" %%i in ('pnpm --version') do echo [OK] pnpm %%i

:: ============================================
:: 2. التحقق من الحزم الرئيسية
:: ============================================
echo.
echo [3/7] Checking project packages...

:: التحقق من وجود node_modules الرئيسي
if not exist "node_modules" (
    echo Installing main packages...
    echo This may take several minutes...
    call pnpm install --no-frozen-lockfile
    if errorlevel 1 (
        echo [WARNING] pnpm failed, trying npm...
        call npm install --legacy-peer-deps
        if errorlevel 1 (
            echo [ERROR] Failed to install packages
            pause
            exit /b 1
        )
    )
    echo [OK] Packages installed
) else (
    echo [OK] Packages already installed
)

:: ============================================
:: 3. بناء API Server
:: ============================================
echo.
echo [4/7] Building API Server...

:: التحقق من وجود مجلد api-server
if not exist "artifacts\api-server" (
    echo [ERROR] artifacts\api-server folder not found!
    pause
    exit /b 1
)

cd artifacts\api-server

:: التحقق من وجود node_modules
if not exist "node_modules" (
    echo Installing API server dependencies...
    call pnpm install --no-frozen-lockfile 2>nul
    if errorlevel 1 (
        call npm install --legacy-peer-deps
    )
)

:: بناء API Server
echo Building API server...
call pnpm run build 2>nul
if errorlevel 1 (
    echo Trying with npm...
    call npm run build
    if errorlevel 1 (
        echo [ERROR] API server build failed
        cd ..\..
        pause
        exit /b 1
    )
)
cd ..\..

if not exist "artifacts\api-server\dist" (
    echo [ERROR] API server build output not found!
    pause
    exit /b 1
)
echo [OK] API Server built successfully

:: ============================================
:: 4. بناء Frontend
:: ============================================
echo.
echo [5/7] Building Frontend...

:: التحقق من وجود مجلد pos-system
if not exist "artifacts\pos-system" (
    echo [ERROR] artifacts\pos-system folder not found!
    pause
    exit /b 1
)

cd artifacts\pos-system

:: التحقق من وجود node_modules
if not exist "node_modules" (
    echo Installing Frontend dependencies...
    call pnpm install --no-frozen-lockfile 2>nul
    if errorlevel 1 (
        call npm install --legacy-peer-deps
    )
)

:: بناء Frontend
set PORT=8080
set BASE_PATH=/
echo Building Frontend...
call pnpm run build 2>nul
if errorlevel 1 (
    echo Trying with npm...
    call npm run build
    if errorlevel 1 (
        echo [ERROR] Frontend build failed
        cd ..\..
        pause
        exit /b 1
    )
)
cd ..\..

if not exist "artifacts\pos-system\dist" (
    echo [ERROR] Frontend build output not found!
    pause
    exit /b 1
)
echo [OK] Frontend built successfully

:: ============================================
:: 5. بناء التطبيق المكتبي (Desktop Application)
:: ============================================
echo.
echo [6/7] Building Desktop Application...

:: التحقق من وجود script
if not exist "scripts\build-desktop.mjs" (
    echo [WARNING] build-desktop.mjs not found, skipping desktop build...
    goto :skip_desktop
)

:: تشغيل script بناء التطبيق المكتبي
echo Running desktop build script...
call node scripts/build-desktop.mjs
if errorlevel 1 (
    echo [ERROR] Failed to build desktop app
    pause
    exit /b 1
)

:: التحقق من وجود الملفات المنسوخة
if exist "electron-app\dist\server" (
    echo [OK] Desktop app assets prepared
) else (
    echo [WARNING] Desktop build may be incomplete
)

:skip_desktop
echo [OK] Desktop application process completed

:: ============================================
:: 6. بناء Electron App (مع حلول الأخطاء)
:: ============================================
echo.
echo [7/7] Building Electron Application...

:: التحقق من وجود مجلد electron-app
if not exist "electron-app" (
    echo [WARNING] electron-app folder not found, skipping Electron build...
    goto :skip_electron
)

cd electron-app

:: التحقق من وجود package.json
if not exist "package.json" (
    echo [ERROR] package.json not found in electron-app!
    cd ..
    pause
    exit /b 1
)

:: تثبيت تبعيات Electron إذا لزم الأمر
if not exist "node_modules" (
    echo Installing Electron dependencies...
    call pnpm install --no-frozen-lockfile 2>nul
    if errorlevel 1 (
        echo pnpm failed, trying npm...
        call npm install --legacy-peer-deps
        if errorlevel 1 (
            echo [ERROR] Failed to install Electron dependencies
            cd ..
            pause
            exit /b 1
        )
    )
) else (
    echo [OK] Electron dependencies installed
)

:: التحقق من وجود electron-builder
echo Checking electron-builder...
if not exist "node_modules\.bin\electron-builder" (
    echo electron-builder not found, installing...
    call pnpm add -D electron-builder 2>nul
    if errorlevel 1 (
        echo Trying npm...
        call npm install -D electron-builder
        if errorlevel 1 (
            echo [WARNING] Failed to install electron-builder
            echo Trying alternative method...
        )
    )
)

:: بناء التطبيق (محاولة متعددة)
echo Building Electron app...

:: المحاولة 1: باستخدام pnpm run
call pnpm run build:app 2>nul
if errorlevel 1 (
    echo Method 1 failed, trying method 2...
    
    :: المحاولة 2: باستخدام npm run
    call npm run build:app 2>nul
    if errorlevel 1 (
        echo Method 2 failed, trying method 3...
        
        :: المحاولة 3: باستخدام npx مباشر
        call npx electron-builder --win --x64 --publish never 2>nul
        if errorlevel 1 (
            echo Method 3 failed, trying method 4...
            
            :: المحاولة 4: باستخدام المسار المباشر
            if exist "node_modules\.bin\electron-builder" (
                call node_modules\.bin\electron-builder --win --x64 --publish never
                if errorlevel 1 (
                    echo Method 4 failed!
                    echo.
                    echo [ERROR] All build methods failed
                    echo.
                    echo Possible solutions:
                    echo 1. Delete electron-app\node_modules and try again
                    echo 2. Run: cd electron-app && npm install
                    echo 3. Run: npm install -g electron-builder
                    echo 4. Check package.json for correct build script
                    echo.
                    cd ..
                    pause
                    exit /b 1
                )
            ) else (
                echo [ERROR] electron-builder not found
                echo.
                echo Please install electron-builder:
                echo cd electron-app
                echo npm install -D electron-builder
                echo.
                cd ..
                pause
                exit /b 1
            )
        )
    )
)

:: التحقق من وجود ملف الإخراج
cd ..
if exist "electron-app\release" (
    echo [OK] Electron application built successfully
    echo.
    echo   📦 Installer created in: electron-app\release\
) else (
    echo [WARNING] Build completed but release folder not found
    echo Please check electron-app\dist for build output
)

:skip_electron

:: ============================================
:: 7. عرض النتائج النهائية
:: ============================================
echo.
echo ============================================
echo   BUILD COMPLETED SUCCESSFULLY!
echo ============================================
echo.

:: عرض المخرجات المتاحة
echo Output files:
echo.
if exist "electron-app\release" (
    echo   📦 Installer (Windows): electron-app\release\
    dir /b electron-app\release\*.exe 2>nul
) else (
    echo   📁 Build artifacts: 
    if exist "artifacts\api-server\dist" echo      - API Server: artifacts\api-server\dist
    if exist "artifacts\pos-system\dist" echo      - Frontend: artifacts\pos-system\dist
    if exist "electron-app\dist" echo      - Electron app: electron-app\dist
)

echo.
echo ============================================
echo   Next Steps:
echo ============================================
echo   1. Run start.bat to launch the application
echo   2. Or install from electron-app\release\setup.exe
echo   3. Or run in dev mode: cd electron-app && npm run dev
echo.
echo ============================================
echo   Troubleshooting:
echo ============================================
echo   If build failed, try:
echo   - Delete node_modules and .pnpm-store folders
echo   - Run: pnpm store prune
echo   - Restart this script
echo.
pause