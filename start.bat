@echo off
rem Web Genie Scout 24 - starts the local scout server and opens it in Chrome.
rem Usage: start.bat            (normal start)
rem        start.bat --rebuild  (rebuild the web UI first, e.g. after pulling new code)
setlocal
title Web Genie Scout 24
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22.18 or newer is required. Download it from https://nodejs.org and run this file again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies - first run only...
  call npm install --no-fund --no-audit
  if errorlevel 1 ( pause & exit /b 1 )
)

if /i "%~1"=="--rebuild" if exist web\dist rmdir /s /q web\dist
if not exist web\dist\index.html (
  echo Building the web UI...
  call npm run build
  if errorlevel 1 ( pause & exit /b 1 )
)

if not defined PORT set "PORT=4824"
set "URL=http://localhost:%PORT%"

rem Prefer Chrome; fall back to the default browser.
set "CHROME="
for /f "tokens=2,*" %%a in ('reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" /ve 2^>nul ^| find "REG_SZ"') do set "CHROME=%%b"
if not defined CHROME for /f "tokens=2,*" %%a in ('reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" /ve 2^>nul ^| find "REG_SZ"') do set "CHROME=%%b"

rem Open the browser once the server answers (polls for up to 30 seconds).
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "$u='%URL%'; for($i=0;$i -lt 60;$i++){ try { Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 1 | Out-Null; break } catch { Start-Sleep -Milliseconds 500 } }; if ('%CHROME%') { Start-Process '%CHROME%' $u } else { Start-Process $u }"

echo.
echo  Web Genie Scout 24 is running at %URL%
echo  Keep this window open while you use it. Close it to stop the server.
echo.
node server/index.ts
pause
