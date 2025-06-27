@echo off
echo ============================================================
echo Fixing Windows Python Environment for Link Band SDK
echo ============================================================

echo Installing setuptools (for pkg_resources)...
pip install --upgrade setuptools

echo.
echo Re-installing HeartPy with dependencies...
pip uninstall heartpy -y
pip install heartpy==1.2.7

echo.
echo Testing the fix...
cd /d "%~dp0\..\python_core"
python -c "import heartpy; print('✅ HeartPy import successful!')"
python -c "from app.core.signal_processing import SignalProcessor; print('✅ SignalProcessor import successful!')"

echo.
echo ============================================================
echo Fix completed! Now try running the app again.
echo ============================================================
pause 