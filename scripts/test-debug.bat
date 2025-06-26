@echo off
echo ========== DEBUG TEST SCRIPT ==========
echo.
echo Step 1: Script started
echo Current directory: %CD%
echo.

echo Step 2: Testing Python
python --version
if %errorlevel% equ 0 (
    echo Python: OK
) else (
    echo Python: NOT FOUND
)
echo.

echo Step 3: Testing Node.js
node --version
if %errorlevel% equ 0 (
    echo Node.js: OK
    echo Going to Git check...
    goto :git_check
) else (
    echo Node.js: NOT FOUND
    goto :git_check
)

:git_check
echo.
echo Step 4: Testing Git
git --version
if %errorlevel% equ 0 (
    echo Git: OK
) else (
    echo Git: NOT FOUND
)
echo.

echo Step 5: All checks completed
echo This script should NOT exit here!
echo.
echo If you see this message, the script is working correctly.
echo If this is the last thing you see, there might be a different issue.
echo.
pause
echo.
echo Step 6: After pause
echo Script will end normally now.
echo.
echo ========== DEBUG TEST COMPLETED ========== 