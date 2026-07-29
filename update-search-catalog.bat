@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo [ERROR] Node.js is required.& pause & exit /b 1)
call npm run release:write
if errorlevel 1 (echo.& echo [FAILED] Converter catalog automation failed.& pause & exit /b 1)
echo.
echo [OK] Search index, public manifest, tests, and checksums are ready to commit.
pause
