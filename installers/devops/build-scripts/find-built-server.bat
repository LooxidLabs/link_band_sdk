@echo off
echo ========================================================
echo         Find Built Server File
echo ========================================================
echo.

echo [SEARCH] Looking for linkband-server-windows.exe...
echo.

REM Check current directory
if exist "linkband-server-windows.exe" (
    echo [FOUND] In current directory: %CD%\linkband-server-windows.exe
    for %%A in ("linkband-server-windows.exe") do (
        echo [SIZE] %%~zA bytes
    )
    goto :found
)

REM Check common build locations
echo [CHECKING] Common build locations...

REM Check temp directories
for /d %%D in ("%TEMP%\linkband_build_*") do (
    if exist "%%D\link_band_sdk\python_core\dist\linkband-server-windows.exe" (
        echo [FOUND] In temp build directory: %%D\link_band_sdk\python_core\dist\linkband-server-windows.exe
        for %%A in ("%%D\link_band_sdk\python_core\dist\linkband-server-windows.exe") do (
            echo [SIZE] %%~zA bytes
        )
        echo [COPY] Copying to current directory...
        copy "%%D\link_band_sdk\python_core\dist\linkband-server-windows.exe" "%CD%\linkband-server-windows.exe"
        if exist "%CD%\linkband-server-windows.exe" (
            echo [SUCCESS] File copied successfully!
            goto :found
        ) else (
            echo [ERROR] Copy failed
        )
    )
)

REM Check Downloads folder
if exist "%USERPROFILE%\Downloads\linkband-server-windows.exe" (
    echo [FOUND] In Downloads: %USERPROFILE%\Downloads\linkband-server-windows.exe
    for %%A in ("%USERPROFILE%\Downloads\linkband-server-windows.exe") do (
        echo [SIZE] %%~zA bytes
    )
    goto :found
)

REM Search in common locations
echo [SEARCHING] Searching entire system (this may take a moment)...
for /f "delims=" %%F in ('dir /s /b "linkband-server-windows.exe" 2^>nul') do (
    echo [FOUND] %%F
    for %%A in ("%%F") do (
        echo [SIZE] %%~zA bytes
        echo [MODIFIED] %%~tA
    )
    echo.
    echo [COPY] Do you want to copy this file to current directory? (y/n)
    set /p choice=
    if /i "!choice!"=="y" (
        copy "%%F" "%CD%\linkband-server-windows.exe"
        if exist "%CD%\linkband-server-windows.exe" (
            echo [SUCCESS] File copied successfully!
            goto :found
        )
    )
)

echo [NOT FOUND] linkband-server-windows.exe not found anywhere.
echo.
echo [POSSIBLE SOLUTIONS]
echo 1. The build may have failed silently
echo 2. The file might be in a different location
echo 3. Try running the build script again
echo.
goto :end

:found
echo.
echo [VERIFICATION] Testing the server file...
if exist "%CD%\linkband-server-windows.exe" (
    echo [TEST] Running basic test...
    "%CD%\linkband-server-windows.exe" --help >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK] Server executable is working correctly!
    ) else (
        echo [INFO] Server file exists but may need proper arguments
    )
    
    echo.
    echo [COMPLETE] Server file is ready!
    echo [LOCATION] %CD%\linkband-server-windows.exe
    echo [NEXT STEP] You can now run install-linkband.bat
) else (
    echo [ERROR] File not found in current directory
)

:end
echo.
pause 