@echo off
echo Starting TouchDesigner MCP Server for PsychedelicFractalViz...
echo ================================================

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

REM Check if dist folder exists (compiled TypeScript)
if not exist "dist" (
    echo Building project...
    npm run build
)

REM Set environment variables for this session
set TD_PROJECT_PATH=C:/Users/talla/Documents/touchdesigner-projects/PsychedelicFractalViz
set FRACTAL_PROJECT_NAME=PsychedelicFractalViz
set KINECT_ENABLED=true

echo.
echo Configuration:
echo - Project: %TD_PROJECT_PATH%
echo - WebSocket Port: 9980
echo - OSC Port: 7000
echo - Kinect Enabled: %KINECT_ENABLED%
echo.
echo Starting server...
echo ================================================

REM Start the MCP server
npm start

pause