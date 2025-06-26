@echo off
echo ================================================
echo     Link Band SDK Windows Server Builder
echo ================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.9+ from https://python.org
    echo.
    pause
    exit /b 1
)

echo [OK] Python found
echo.

REM Check if we're in the right directory
if not exist "python_core\requirements.txt" (
    echo [ERROR] Please run this script from the project root directory
    echo Expected: python_core\requirements.txt
    echo.
    pause
    exit /b 1
)

echo [OK] Project structure verified
echo.

REM Create virtual environment
echo [INFO] Creating Python virtual environment...
cd python_core
python -m venv venv

REM Activate virtual environment
echo [INFO] Activating virtual environment...
call venv\Scripts\activate

REM Install dependencies
echo [INFO] Installing dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install pyinstaller

REM Build the executable
echo [INFO] Building Windows server executable...
pyinstaller --onefile --name linkband-server-windows run_server.py

REM Check if build was successful
if exist "dist\linkband-server-windows.exe" (
    echo.
    echo [SUCCESS] Windows server built successfully!
    echo Output: dist\linkband-server-windows.exe
    echo Size: 
    dir dist\linkband-server-windows.exe | find "linkband-server-windows.exe"
    
    REM Copy to installers directory
    if not exist "..\installers\windows" (
        mkdir "..\installers\windows"
    )
    copy "dist\linkband-server-windows.exe" "..\installers\windows\"
    echo.
    echo [INFO] Copied to installers\windows\linkband-server-windows.exe
) else (
    echo.
    echo [ERROR] Build failed - executable not found
    echo Please check the error messages above
)

echo.
echo [INFO] Build process completed
echo.
pause 