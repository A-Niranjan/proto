@echo off
echo Starting Video Editing UI...

:: Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed. Please install Node.js to run this application.
    exit /B 1
)

:: Check if the uploads directory exists, create if not
if not exist "frontend\uploads" mkdir frontend\uploads

:: Navigate to frontend directory and serve the React app
cd frontend
echo.
echo Installing required dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Failed to install dependencies. Please check your Node.js installation.
    exit /B 1
)

echo.
echo Building the React application...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Failed to build the React application.
    exit /B 1
)

echo.
echo =======================================================================
echo Video Editing UI is now running at http://localhost:3000
echo.
echo IMPORTANT: In a separate terminal, run the MCP client with:
echo.
echo     uv run client.py "E:\mcpffmpeg\build\index.js"
echo.
echo This will enable the AI chatbox functionality for video editing.
echo =======================================================================
echo.

:: Serve the built React app
python serve.py
