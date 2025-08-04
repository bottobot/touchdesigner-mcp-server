# TD-MCP v2.0 Setup Instructions
## VS Code/Codium MCP Server Integration

This guide will help you set up TD-MCP v2.0 as an MCP server for VS Code/Codium integration.

## ✅ What This Is

A pure MCP server that provides TouchDesigner operator documentation to VS Code/Codium. No WebSocket complexity, no TouchDesigner integration scripts - just a clean MCP server.

**Key Principle**: TouchDesigner runs independently. VS Code connects to this MCP server to get operator information while you code.

---

## 🚀 Step-by-Step Setup

### Step 1: Install Dependencies

1. Open a terminal/command prompt
2. Navigate to the TD-MCP V2 directory:
   ```bash
   cd c:/Users/rober/Repos/TD-MCP/V2
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Step 2: Test the MCP Server

1. Start the MCP server to verify it works:
   ```bash
   node index.js
   ```
2. You should see:
   ```
   TD-MCP v2.0 Server Starting...
   ================================
   TouchDesigner MCP Server for VS Code/Codium
   Following Claude.md principles: Keep it simple
   Pure MCP server - no WebSocket complexity

   [Metadata] Loaded 682 operators
   [Patterns] Loaded 20 workflow patterns
   ✓ TD-MCP v2.0 Server is now running
   ```
3. Press Ctrl+C to stop the server

### Step 3: Configure VS Code/Codium

1. **Add MCP Server Configuration** to your VS Code/Codium MCP settings
2. **Point to this server** using the appropriate MCP configuration format
3. **The server will start automatically** when VS Code/Codium needs it

---

## 🔧 Available MCP Tools

### get_operator
Get detailed information about a specific TouchDesigner operator.

**Usage in VS Code:**
```
Get information about the "Noise TOP" operator
```

### list_operators  
List available TouchDesigner operators, optionally filtered by category.

**Usage in VS Code:**
```
List all TOP operators
```

### search_operators
Search for operators using contextual analysis and ranking.

**Usage in VS Code:**
```
Search for audio-related operators in the CHOP category
```

### get_pop_learning_guide
Get comprehensive learning information about TouchDesigner POPs (Point Operators).

**Usage in VS Code:**
```
Get the POP learning guide
```

---

## 📊 What's Available

### Operator Categories
- **TOP** (Texture Operators): 150+ image and video processing operators
- **CHOP** (Channel Operators): 100+ audio and data processing operators  
- **SOP** (Surface Operators): 200+ 3D geometry operations
- **DAT** (Data Operators): 50+ text and data manipulation operators
- **MAT** (Material Operators): 30+ 3D rendering materials
- **COMP** (Component Operators): 100+ UI and system components
- **POP** (Point Operators): 50+ particle system operators

### Workflow Patterns
- 20 common TouchDesigner workflow patterns
- Cross-family operator relationships
- Context-aware suggestions

---

## 🔍 Troubleshooting

### Server Won't Start
- **Check Node.js version**: Requires Node.js 18.0.0 or higher
- **Install dependencies**: Run `npm install` in the V2 directory
- **Check file paths**: Ensure metadata files exist in `../metadata/`

### VS Code/Codium Connection Issues
- **Check MCP configuration**: Verify the server path is correct
- **Restart VS Code**: Sometimes needed after configuration changes
- **Check console**: Look for MCP-related error messages

### No Operators Found
- **Check metadata**: Ensure `../metadata/` directory contains operator files
- **Verify loading**: Server should show "Loaded 682 operators" on startup
- **File permissions**: Ensure the server can read metadata files

---

## 📁 File Structure

```
TD-MCP/V2/
├── index.js                    # Main MCP server
├── package.json               # Dependencies and configuration
├── README.md                  # Documentation
├── SETUP-INSTRUCTIONS.md      # This file
├── tools/                     # Individual MCP tools
│   ├── get_operator.js        # Get operator details
│   ├── list_operators.js      # List operators
│   ├── search_operators.js    # Search operators
│   └── suggest_workflow.js    # Workflow suggestions
├── data/
│   └── patterns.json          # Workflow patterns (20 patterns)
└── ../metadata/               # Operator metadata (shared with v1)
    ├── comprehensive_top_metadata.json
    ├── comprehensive_chop_metadata.json
    ├── comprehensive_sop_metadata.json
    ├── comprehensive_dat_metadata.json
    ├── comprehensive_mat_metadata.json
    ├── comprehensive_comp_metadata.json
    └── comprehensive_pop_metadata.json
```

---

## 🎯 What's Working

✅ **Pure MCP Server**: Clean, simple implementation  
✅ **682 Operators**: Complete TouchDesigner operator database  
✅ **20 Workflow Patterns**: Common TouchDesigner workflows  
✅ **VS Code Integration**: Ready for MCP configuration  
✅ **No WebSocket Complexity**: Simple, reliable architecture  
✅ **Modular Tools**: Clean separation of functionality  

---

## 🚀 Usage in VS Code/Codium

Once configured, you can use natural language to interact with the MCP tools:

### Example Queries
- "Show me information about the Noise TOP operator"
- "List all CHOP operators"  
- "Search for audio processing operators"
- "What are POP operators and how do I use them?"
- "Find operators related to video processing"

### Workflow Integration
- Get operator documentation while coding TouchDesigner scripts
- Discover new operators for your projects
- Learn about operator families and relationships
- Access workflow patterns and best practices

---

## 💡 Tips

- **Use specific operator names**: "Movie File In TOP" works better than just "Movie"
- **Try category filtering**: Narrow searches by operator family (TOP, CHOP, etc.)
- **Explore workflow patterns**: Learn common TouchDesigner techniques
- **Use the POP guide**: Particle systems have specialized learning resources

---

## 🔄 What This Is NOT

- ❌ **Not a WebSocket server** - Pure MCP implementation
- ❌ **Not for TouchDesigner integration** - VS Code/Codium only
- ❌ **Not complex** - Simple, focused tool
- ❌ **TouchDesigner doesn't connect** - Runs independently

## ✅ What This IS

- ✅ **Pure MCP server** for VS Code/Codium
- ✅ **TouchDesigner documentation provider** 
- ✅ **Simple and reliable** following Claude.md principles
- ✅ **Focused tool** that does one thing well

---

## 🆘 Support

If you encounter issues:

1. **Test server startup**: Run `node index.js` to verify basic functionality
2. **Check dependencies**: Ensure `npm install` completed successfully
3. **Verify metadata**: Server should load 682 operators on startup
4. **Check VS Code MCP configuration**: Ensure server path is correct
5. **Restart VS Code**: Sometimes needed after configuration changes

The system is clean, simple, and ready for VS Code/Codium integration! 🎉
