@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

cd /d "%~dp0"

echo ===================================================
echo     PRJrms Otomatik Canliya Alma ve Senkronizasyon
echo     VPS Entegrasyonu (http://188.132.198.144:3005)
echo ===================================================
echo.

set "userCommitMsg="
set /p userCommitMsg="[?] Yaptiginiz degisikliklerin ozeti (Enter = Otomatik): "

echo.
echo 1. Yerel Derleme Kontrol Ediliyor (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo [HATA] Derleme basarisiz oldu. Lutfen kod hatalarini duzeltin.
    pause
    exit /b %errorlevel%
)

echo.
echo 2. Git Sahnesine Ekleniyor ve Push Yapiliyor...
git add .
if "%userCommitMsg%"=="" (
    git commit -m "feat: PRJrms guncelleme ve gelistirmeler"
) else (
    git commit -m "%userCommitMsg%"
)
git push origin main

echo.
echo 3. Coolify / VPS Deploy Tetikleniyor...
node scripts/deploy-coolify.mjs

echo.
echo ===================================================
echo ISLEM TAMAMLANDI!
echo ===================================================
pause
