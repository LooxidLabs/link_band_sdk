@echo off
echo ============================================================
echo Starting Link Band SDK with Python Virtual Environment
echo ============================================================

cd /d "%~dp0\.."

REM Check if virtual environment exists
if not exist "venv_windows\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found!
    echo Please run setup-windows-venv.bat first.
    pause
    exit /b 1
)

echo Activating virtual environment...
call venv_windows\Scripts\activate.bat

echo Starting Link Band SDK...
cd electron-app
npm run electron:preview

pause 