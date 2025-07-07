# Critical Issues in TouchDesigner MCP Server

## 1. Core File Format Issue (FATAL)
**File**: `src/generators/TOEGenerator.ts`
**Issue**: Assumes .toe files are gzipped XML - they are proprietary binary files
**Impact**: Every generated .toe file is corrupted and unusable

## 2. WebSocket Connection Assumptions
**File**: `src/utils/WebSocketManager.ts`
**Issue**: Assumes TouchDesigner has a WebSocket DAT configured as a server on port 9980
**Reality**: TouchDesigner projects don't have this by default
**Fix Needed**: 
- Provide TouchDesigner setup instructions
- Create a template project with WebSocket DAT pre-configured
- Handle connection failures gracefully

## 3. OSC Configuration Assumptions
**File**: `src/utils/OSCManager.ts`
**Issue**: Assumes TouchDesigner has OSC In/Out DATs configured
**Reality**: These need to be manually set up in TouchDesigner
**Fix Needed**:
- Document OSC setup requirements
- Provide Python script to auto-configure OSC in TouchDesigner
- Better error handling when OSC isn't configured

## 4. Project Analysis Fake Data
**File**: `src/utils/ProjectManager.ts` (line 159)
**Issue**: `analyzeProject()` returns hardcoded fake data
```typescript
// This would parse the actual .toe file (which is a compressed format)
// For now, returning simulated analysis
```
**Impact**: Analysis results are meaningless
**Fix**: Either remove this feature or implement actual .toe file reading via TouchDesigner API

## 5. Node Generation Without TouchDesigner
**File**: `src/utils/NodeLibrary.ts`
**Issue**: Generates node specifications but can't actually create them
**Reality**: Nodes can only be created by TouchDesigner itself
**Fix**: Generate Python scripts instead of trying to create nodes directly

## 6. Template Application Issue
**File**: `src/utils/TemplateEngine.ts` (line 259)
**Issue**: 
```typescript
// This would integrate with TOEGenerator to modify the project
console.log(`Applying template ${templateId} to project ${projectPath}`);
```
**Impact**: Templates can't actually be applied
**Fix**: Use TouchDesigner Python API to apply templates

## 7. Export Movie via Python Script
**File**: `src/utils/ProjectManager.ts` (line 111-138)
**Issue**: Creates Python script but uses non-existent TouchDesigner CLI
```typescript
const tdCLI = path.join(this.touchDesignerPath, 'TouchDesignerCLI.exe');
```
**Reality**: TouchDesigner doesn't have a CLI.exe
**Fix**: Use regular TouchDesigner.exe with -cmd parameter

## 8. Missing Setup Infrastructure
**Overall Issue**: No TouchDesigner-side setup provided
**Missing**:
- TouchDesigner template projects with required DATs
- Setup scripts to configure TouchDesigner for MCP
- Documentation on TouchDesigner requirements
- Validation to check if TouchDesigner is properly configured

## 9. Import Usage in index.ts
**File**: `src/index.ts` (line 10)
**Issue**: Imports the broken TOEGenerator
```typescript
import { TOEGenerator } from './generators/TOEGenerator.js';
```
**Fix**: Should import TOEGeneratorFixed or similar

## 10. AI Parser Generates Unusable Specs
**File**: `src/utils/AIPromptParser.ts`
**Issue**: Generates detailed node specifications that can't be used
**Impact**: Complex parsing logic that produces specs requiring TouchDesigner to implement
**Fix**: Generate Python scripts directly instead of intermediate specs

## Recommended Fixes Priority

### Critical (Must Fix)
1. Replace TOEGenerator with Python script generation
2. Create TouchDesigner template projects with WebSocket/OSC DATs
3. Document TouchDesigner setup requirements
4. Fix all imports to use corrected generators

### Important (Should Fix)
5. Implement real project analysis via TouchDesigner Python API
6. Create setup/validation scripts
7. Fix export movie functionality
8. Add proper error messages when TouchDesigner isn't configured

### Nice to Have
9. Create installer that sets up both MCP server and TouchDesigner
10. Add connection status indicators
11. Implement two-way sync between MCP and TouchDesigner

## Solution Architecture

The correct architecture should be:

```
MCP Server <--> Python Scripts <--> TouchDesigner
           |                    |
           |                    +-- WebSocket DAT
           |                    +-- OSC In/Out DATs
           |                    +-- Script DAT
           |
           +-- Generates Python scripts
           +-- Sends commands via WebSocket/OSC
           +-- Never creates .toe files directly
```

## Required TouchDesigner Components

Every TouchDesigner project that works with MCP needs:
1. WebSocket DAT (server mode, port 9980)
2. OSC In DAT (port 7000)
3. OSC Out DAT (port 7001)
4. Script DAT to handle MCP commands
5. Proper error handling and feedback

## Testing Requirements

Before considering the MCP server functional:
1. Create test TouchDesigner project with all required DATs
2. Test Python script generation
3. Test WebSocket communication
4. Test OSC communication
5. Verify no .toe files are created by MCP server
6. Document all setup steps clearly