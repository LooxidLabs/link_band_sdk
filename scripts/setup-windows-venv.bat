@echo off
echo ============================================================
echo Setting up Python Virtual Environment for Link Band SDK
echo ============================================================

cd /d "%~dp0\.."

echo Creating virtual environment...
python -m venv venv_windows

echo.
echo Activating virtual environment...
call venv_windows\Scripts\activate.bat

echo.
echo Upgrading pip and setuptools...
python -m pip install --upgrade pip setuptools wheel

echo.
echo Installing requirements...
cd python_core
pip install -r requirements.txt
pip install -r additional_requirements.txt

echo.
echo Verifying installation...
python -c "import pkg_resources; print('✅ pkg_resources installed')"
python -c "import numpy; print('✅ NumPy installed:', numpy.__version__)"
python -c "import scipy; print('✅ SciPy installed:', scipy.__version__)"
python -c "import mne; print('✅ MNE installed:', mne.__version__)"
python -c "import heartpy; print('✅ HeartPy installed:', heartpy.__version__)"
python -c "import websockets; print('✅ WebSockets installed:', websockets.__version__)"

echo.
echo ============================================================
echo Setup completed! 
echo To use this environment, run: venv_windows\Scripts\activate.bat
echo ============================================================
pause 