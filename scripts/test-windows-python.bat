@echo off
echo ============================================================
echo Windows Python Environment Test for Link Band SDK
echo ============================================================

cd /d "%~dp0\.."

REM Check if virtual environment exists
if exist "venv_windows\Scripts\activate.bat" (
    echo Using virtual environment...
    call venv_windows\Scripts\activate.bat
) else (
    echo WARNING: Virtual environment not found. Using system Python.
    echo Run setup-windows-venv.bat first for best results.
    echo.
)

cd python_core

echo.
echo 1. Testing Python environment...
python test_minimal.py

echo.
echo 2. Testing Bluetooth diagnostic tool...
cd /d "%~dp0"
python windows-bluetooth-check.py

echo.
echo ============================================================
echo Test completed. Check the output above for any errors.
echo ============================================================
pause 