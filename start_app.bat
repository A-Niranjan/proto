@echo off
echo Starting Video Editing Studio...

:: Create uploads directory if it doesn't exist
if not exist "backend\uploads" mkdir backend\uploads

:: Check if an argument was provided (MCP server path)
if "%~1"=="" (
    echo ERROR: Please provide the path to your MCP ffmpeg helper server script.
    echo Usage: start_app.bat path\to\mcp_ffmpeg_helper.py
    echo.
    exit /B 1
)

:: Activate virtual environment if exists
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
) else (
    echo WARNING: Virtual environment not found. Make sure dependencies are installed.
)

:: Set Google API Key from .env file
for /f "tokens=*" %%a in (.env) do (
    set %%a
)

:: Run the server with the provided MCP server path
python backend\server.py %1

:: Deactivate virtual environment
if exist ".venv\Scripts\deactivate.bat" (
    call .venv\Scripts\deactivate.bat
)
