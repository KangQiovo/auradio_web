@echo off
setlocal
cd /d "%~dp0"
if not exist "dist\index.html" (
  echo Built website missing. Extract the whole ZIP first.
  pause
  exit /b 1
)
where node >nul 2>nul
if not errorlevel 1 (
  node server.mjs --open
  goto :done
)
py -3 --version >nul 2>nul
if not errorlevel 1 (
  py -3 serve.py --open
  goto :done
)
python --version >nul 2>nul
if not errorlevel 1 (
  python serve.py --open
  goto :done
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
:done
if errorlevel 1 pause
endlocal
