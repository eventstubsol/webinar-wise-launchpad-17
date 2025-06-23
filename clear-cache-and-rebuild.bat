@echo off
echo Clearing cache and rebuilding...

REM Kill any running dev servers
taskkill /F /IM node.exe 2>nul

REM Clear npm cache
echo Clearing npm cache...
npm cache clean --force

REM Remove node_modules and package-lock
echo Removing node_modules...
rmdir /s /q node_modules 2>nul
del package-lock.json 2>nul

REM Remove any build artifacts
rmdir /s /q dist 2>nul
rmdir /s /q .vite 2>nul

REM Reinstall dependencies
echo Installing dependencies...
npm install

REM Start dev server
echo Starting development server...
npm run dev

pause
