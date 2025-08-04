@echo off
echo ===============================================
echo Testing OSC Communication via TD-MCP
echo ===============================================
echo.
echo Prerequisites:
echo   1. TD-MCP server is running (npm start)
echo   2. TouchDesigner is running with OSC setup
echo   3. OSC IN on port 9000, OSC OUT on port 9001
echo.
echo Press any key to run tests...
pause > nul

echo.
echo Running OSC tests using the existing test infrastructure...
echo.

cd /d "%~dp0"
node test-comprehensive.js

echo.
echo ===============================================
echo OSC Test Complete!
echo ===============================================
echo.
echo Check in TouchDesigner:
echo   - Textport for any printed messages
echo   - Look for any new operators created
echo   - Check if any parameters were modified
echo.
pause