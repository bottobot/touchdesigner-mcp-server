Write-Host "Starting TouchDesigner MCP Server for PsychedelicFractalViz..." -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Check if dist folder exists (compiled TypeScript)
if (-not (Test-Path "dist")) {
    Write-Host "Building project..." -ForegroundColor Yellow
    npm run build
}

# Set environment variables for this session
$env:TD_PROJECT_PATH = "C:/Users/talla/Documents/touchdesigner-projects/PsychedelicFractalViz"
$env:FRACTAL_PROJECT_NAME = "PsychedelicFractalViz"
$env:KINECT_ENABLED = "true"

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "- Project: $env:TD_PROJECT_PATH"
Write-Host "- WebSocket Port: 9980"
Write-Host "- OSC Port: 7000"
Write-Host "- Kinect Enabled: $env:KINECT_ENABLED"
Write-Host ""
Write-Host "Starting server..." -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# Start the MCP server
npm start

Read-Host -Prompt "Press Enter to exit"