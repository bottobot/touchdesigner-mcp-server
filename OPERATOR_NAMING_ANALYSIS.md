# TouchDesigner Operator Naming Analysis & MCP Server Issues

## Executive Summary

The MCP server has fundamental misunderstandings about TouchDesigner operator types. The most critical issue is assuming TouchDesigner has a native `websocketserverDAT` operator, which **does not exist**.

## The WebSocket Problem

### What the MCP Server Assumes
- The code references `websocketserverDAT` as if it's a built-in TouchDesigner operator
- WebSocketManager.ts expects TouchDesigner to have a "WebSocket DAT node"

### The Reality
TouchDesigner does NOT have a native WebSocket DAT. Instead, it has:

1. **`webserverDAT`** - A Web Server DAT that can handle HTTP requests
2. **`tcpipDAT`** - For TCP/IP communication
3. **Python-based WebSocket implementation** - Using libraries like `websocket-client` in a Script DAT

### Why This Wasn't Known
The MCP server developers made incorrect assumptions about TouchDesigner's built-in operators without verifying against actual TouchDesigner documentation or testing in the software.

## Correct TouchDesigner Operator Names

### Data Operators (DAT)
```python
# CORRECT operator types in TouchDesigner:
- 'audiodeviceinDAT'
- 'audiodeviceoutDAT'
- 'chopexecuteDAT'
- 'choptoDAT'
- 'datexecuteDAT'
- 'errorDAT'
- 'examineDAT'
- 'executeDAT'
- 'fifoDAT'
- 'fileinDAT'
- 'folderDAT'
- 'inDAT'
- 'keyboardinDAT'
- 'mergeDAT'
- 'midiinDAT'
- 'midioutDAT'
- 'monitorDAT'
- 'mqttclientDAT'
- 'nullDAT'
- 'opcuaserverDAT'
- 'opcuaclientDAT'
- 'oscinDAT'      # ✓ Correctly registered in MCP
- 'oscoutDAT'     # ✗ NOT registered in MCP
- 'outDAT'
- 'parameterexecuteDAT'
- 'performDAT'
- 'pythonDAT'
- 'reorderDAT'
- 'scriptDAT'
- 'selectDAT'
- 'serialDAT'
- 'socketioDAT'
- 'soptoDAT'
- 'switchDAT'
- 'tableDAT'      # ✓ Correctly registered in MCP
- 'tcpipDAT'      # ✗ NOT registered (needed for TCP communication)
- 'textDAT'       # ✓ Correctly registered in MCP
- 'touchinDAT'
- 'touchoutDAT'
- 'treeDAT'
- 'udpinDAT'
- 'udpoutDAT'
- 'videodeviceinDAT'
- 'videodeviceoutDAT'
- 'webDAT'
- 'webserverDAT'  # ✗ NOT registered (this is what should be used instead of websocketserverDAT)
- 'xmlDAT'
```

### Key Missing Operators in MCP Server

1. **`webserverDAT`** - Should be used instead of the non-existent `websocketserverDAT`
2. **`oscoutDAT`** - OSC output, only `oscinDAT` is registered
3. **`tcpipDAT`** - For TCP/IP communication
4. **`scriptDAT`** - Essential for Python scripting
5. **`executeDAT`** - For executing scripts
6. **`pythonDAT`** - For Python operations

## All Operator Type Issues in MCP Server

### Currently Registered in NodeLibrary.ts

**TOPs (6 registered):**
- constantTOP ✓
- noiseTOP ✓
- rampTOP ✓
- compositeTOP ✓
- levelTOP ✓
- blurTOP ✓
- feedbackTOP ✓

**CHOPs (5 registered):**
- audiofileinCHOP ✓
- audiospectrumCHOP ✓
- noiseCHOP ✓
- mathCHOP ✓
- oscCHOP ✓ (should be 'oscinCHOP')

**SOPs (4 registered):**
- boxSOP ✓
- sphereSOP ✓
- noiseSOP ✓
- transformSOP ✓

**MATs (2 registered):**
- constantMAT ✓
- phongMAT ✓

**DATs (3 registered):**
- tableDAT ✓
- textDAT ✓
- oscDAT ✓ (should be 'oscinDAT')

**COMPs (4 registered):**
- geometryCOMP ✓
- cameraCOMP ✓
- lightCOMP ✓
- containerCOMP ✓

### Critical Missing Operators for MCP Functionality

1. **Communication:**
   - webserverDAT (NOT websocketserverDAT)
   - tcpipDAT
   - udpinDAT/udpoutDAT
   - oscoutDAT

2. **Scripting:**
   - scriptDAT
   - executeDAT
   - pythonDAT
   - chopexecuteDAT
   - datexecuteDAT

3. **Essential TOPs:**
   - renderTOP
   - outTOP
   - moviefileinTOP
   - glslTOP
   - switchTOP

4. **Essential CHOPs:**
   - constantCHOP
   - selectCHOP
   - nullCHOP
   - mergeCHOP
   - timerCHOP

5. **Essential COMPs:**
   - textCOMP
   - buttonCOMP
   - sliderCOMP
   - parameterCOMP

## How to Fix the MCP Server

### 1. Update NodeLibrary.ts
```typescript
// Replace the incorrect WebSocket references with:
this.registerNode({
  type: 'webserverDAT',
  category: 'DAT',
  name: 'Web Server',
  parameters: {
    port: 9980,
    active: 1
  },
  outputs: ['out1']
});

// Add missing essential operators
this.registerNode({
  type: 'tcpipDAT',
  category: 'DAT',
  name: 'TCP/IP',
  parameters: {
    protocol: 'tcp',
    port: 9980,
    active: 1
  },
  outputs: ['out1']
});
```

### 2. Update Template Scripts
Replace all instances of:
```python
# WRONG
ws = project.create(websocketserverDAT, 'websocket_server')

# CORRECT - Use string for operator type
ws = project.create('webserverDAT', 'websocket_server')
```

### 3. Update WebSocketManager.ts
The entire WebSocketManager needs to be rewritten to understand that:
- TouchDesigner doesn't have native WebSocket DAT
- WebSocket functionality needs to be implemented via Python scripts
- The MCP server should generate Python code that implements WebSocket using libraries

### 4. Verify All Operator References
Every operator type referenced in the MCP server should be verified against TouchDesigner's actual operator list.

## Additional Operator Naming Issues Found

After analyzing the MCP server code, I found these additional incorrect operator references:

### Incorrect Operator Names in Use:
1. **`scriptTOP`** - This doesn't exist. Should be `scriptCHOP`, `scriptSOP`, or `scriptDAT` depending on context
2. **`kinectTOP`** - This is for old Kinect v1. Should be:
   - `kinect2TOP` for Kinect v2
   - `kinectazureTOP` for Azure Kinect
3. **`hueTOP`** - Doesn't exist. Should be `hsvAdjustTOP` or `hsvTOP`
4. **`rgbkeyTOP`** - Should be `chromakeyTOP`
5. **`oscCHOP`** - Should be `oscinCHOP`
6. **`oscDAT`** - Should be `oscinDAT`

### Operators That Don't Exist But Are Referenced:
- `websocketserverDAT` (as discussed)
- `scriptTOP`
- `hueTOP`

### Correct Operator Names That Should Be Added:
- `webserverDAT` - For HTTP/WebSocket server functionality
- `tcpipDAT` - For TCP/IP communication
- `scriptDAT` - For Python scripting
- `executeDAT` - For executing scripts
- `oscoutDAT` - OSC output (only input is registered)
- `glslMAT` - GLSL material
- `renderTOP` - Essential for rendering
- `outTOP` - Essential for output
- `nullCHOP` - Essential for data routing
- `constantCHOP` - Essential for parameters
- `selectCHOP` - Essential for channel selection
- `timerCHOP` - Essential for timing
- `switchTOP` - Essential for switching inputs

## Conclusion

The MCP server's fundamental issue is that it was built on incorrect assumptions about TouchDesigner's capabilities without proper verification. The non-existent `websocketserverDAT` is just one symptom of a larger problem: the server doesn't accurately represent TouchDesigner's actual operator ecosystem.

To make the MCP server functional, it needs:
1. Correct operator type names throughout
2. Understanding of TouchDesigner's actual capabilities
3. Proper Python script generation for functionality that TouchDesigner doesn't natively support (like WebSockets)
4. Comprehensive testing with actual TouchDesigner software
5. Verification of every operator type against TouchDesigner's documentation

**The reason these errors exist:** The developers made assumptions about operator names based on functionality rather than verifying against TouchDesigner's actual API. They assumed logical naming patterns (like `websocketserverDAT` for WebSocket functionality) without checking that TouchDesigner uses different naming conventions and approaches.