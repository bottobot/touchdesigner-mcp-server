# TD-MCP v2.0 Development Plan

## Executive Summary
TD-MCP v2.0 will be a **simple, direct evolution** of v1.2.0 that addresses the key weaknesses identified in the R&D phase while maintaining the "dumbest thing that works" philosophy from Claude.md. No complex architectures, no premature abstractions - just practical improvements that solve real problems.

## Core Philosophy (from Claude.md)
- **POC First**: Build the simplest thing that works
- **No Premature Abstraction**: Don't build for imaginary future requirements
- **Use MCP Servers**: Leverage existing MCP servers (Memory, Filesystem, Context7) instead of building custom solutions
- **Copy-Paste Over Generic**: If copy-pasting is simpler than making it generic, copy-paste it

## Key Findings from R&D Analysis

### Current State (v1.2.0)
- ✅ 690+ operators with metadata
- ✅ Dynamic scraping from offline docs
- ✅ POP support with educational content
- ✅ Contextual search with relevance ranking

### Identified Weaknesses
1. **No Wiki Integration** - Can't verify against live documentation
2. **Incomplete Metadata Schema** - Missing subcategories, use_cases, inputs/outputs
3. **No TouchDesigner Integration** - Can't communicate with running TD instances
4. **Monolithic Architecture** - Everything in one big index.js file
5. **No Workflow Assistance** - Can't suggest operator chains or patterns

## Development Plan

### Phase 1: Simple Wiki Integration (Week 1-2)
**Goal**: Add basic wiki verification without complex caching or abstractions

#### 1.1 Wiki Scraper Tool
```javascript
// Simple direct implementation - no complex classes
async function checkWikiOperator(operatorName) {
  const url = `https://docs.derivative.ca/${operatorName.replace(' ', '_')}`;
  try {
    const response = await fetch(url);
    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);
      return {
        exists: true,
        summary: $('.mw-parser-output p').first().text(),
        url: url
      };
    }
    return { exists: false };
  } catch (e) {
    return { exists: false, error: e.message };
  }
}
```

#### 1.2 Add Wiki Verification to Tools
- Add `verify_with_wiki` parameter to existing tools
- No separate wiki service - just inline the function
- Store results in Memory MCP server, not a custom cache

**Deliverables**:
- `wiki-check.js` - Simple wiki verification function
- Updated MCP tools with optional wiki verification
- No database changes, no complex caching

### Phase 2: Enhanced Metadata (Week 3-4)
**Goal**: Extend existing metadata without breaking changes

#### 2.1 Metadata Extensions
```javascript
// Just add new fields to existing operators
operator.subcategory = detectSubcategory(operator.name, operator.category);
operator.use_cases = extractUseCases(operator.description);
operator.inputs = parseInputsFromHTML(html);
operator.outputs = parseOutputsFromHTML(html);
```

#### 2.2 Update Scrapers
- Modify existing scrapers to extract new fields
- No new database schema - just add fields to JSON
- Use Memory MCP to track which operators need re-scraping

**Deliverables**:
- Updated scraping functions in existing files
- Migration script: `add-enhanced-metadata.js`
- No architectural changes

### Phase 3: TouchDesigner Communication (Week 5-6)
**Goal**: Simple WebSocket/OSC communication with TD

#### 3.1 WebSocket Server
```javascript
// Dead simple WebSocket server
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 9980 });

wss.on('connection', ws => {
  ws.on('message', message => {
    const data = JSON.parse(message);
    if (data.type === 'getOperator') {
      const operator = operators.get(data.name);
      ws.send(JSON.stringify(operator));
    }
  });
});
```

#### 3.2 TouchDesigner DAT
- Create simple WebClient DAT in TD that connects to our server
- Text DAT with Python script for parsing responses
- No complex TD plugin development

**Deliverables**:
- `td-websocket.js` - Simple WebSocket server
- `TD-MCP-Client.toe` - Example TouchDesigner file
- Documentation on how to use it

### Phase 4: Basic Workflow Suggestions (Week 7-8)
**Goal**: Simple pattern matching for operator chains

#### 4.1 Common Patterns Database
```javascript
// Just a simple patterns array
const patterns = [
  {
    name: "Video Processing Chain",
    operators: ["Movie File In TOP", "Blur TOP", "Level TOP", "Composite TOP"],
    description: "Basic video processing pipeline"
  },
  // ... more patterns
];
```

#### 4.2 Pattern Matching Tool
```javascript
// Simple function to suggest next operators
function suggestNextOperator(currentOperator) {
  const suggestions = [];
  patterns.forEach(pattern => {
    const index = pattern.operators.indexOf(currentOperator);
    if (index >= 0 && index < pattern.operators.length - 1) {
      suggestions.push({
        operator: pattern.operators[index + 1],
        pattern: pattern.name
      });
    }
  });
  return suggestions;
}
```

**Deliverables**:
- `patterns.json` - Common TD patterns
- `suggest_workflow` MCP tool
- No complex AI or graph analysis

### Phase 5: Code Organization (Week 9-10)
**Goal**: Split monolithic index.js without over-architecting

#### 5.1 Simple Module Split
```
TD-MCP/
├── index.js          # Main MCP server
├── tools/            # One file per tool
│   ├── get_operator.js
│   ├── search_operators.js
│   └── suggest_workflow.js
├── scrapers/         # Scraping logic
│   ├── html-parser.js
│   └── wiki-check.js
├── data/             # Data files
│   ├── operators.json
│   └── patterns.json
└── td-integration/   # TD communication
    └── websocket.js
```

#### 5.2 Simple Imports
```javascript
// index.js - just import and register tools
const getOperator = require('./tools/get_operator');
const searchOperators = require('./tools/search_operators');

server.registerTool('get_operator', getOperator.schema, getOperator.handler);
server.registerTool('search_operators', searchOperators.schema, searchOperators.handler);
```

**Deliverables**:
- Refactored file structure
- No dependency injection or complex patterns
- Each file does one thing

## Implementation Guidelines

### What TO Do:
1. **Start with the simplest implementation**
2. **Test manually first, automate later**
3. **Use existing MCP servers (Memory, Context7) for storage**
4. **Copy-paste similar code instead of premature abstraction**
5. **Hardcode reasonable defaults**
6. **Keep using in-memory caching**

### What NOT TO Do:
1. **Don't create abstract base classes**
2. **Don't implement dependency injection**
3. **Don't build complex error handling for edge cases**
4. **Don't optimize prematurely**
5. **Don't add configuration for rarely-changing values**
6. **Don't implement the full wiki API - just what we need**

## Success Metrics
- Wiki verification works for 80% of operators
- Enhanced metadata available for all operators
- Can send operator info to TouchDesigner
- Can suggest next operators in common workflows
- Code is organized but still simple to understand

## Migration Path
1. Version 2.0.0 is backwards compatible with 1.2.0
2. New features are opt-in via tool parameters
3. No breaking changes to existing tools
4. Gradual rollout with feature flags

## Next Steps
1. Create `v2.0.0` branch from current main
2. Implement Phase 1 (Wiki Integration) as POC
3. Test with real users before proceeding
4. Iterate based on feedback
5. Only add complexity where it hurts

## Conclusion
TD-MCP v2.0 will be a practical evolution that solves real problems without over-engineering. By following Claude.md principles and learning from past mistakes, we'll build something that actually works and is maintainable by a solo developer.