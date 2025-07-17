@echo off
echo Starting Render Backend Server...
cd render-backend

echo Installing dependencies...
call npm install

echo Starting server...
npm start

pause
