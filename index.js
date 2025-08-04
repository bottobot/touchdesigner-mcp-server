#!/usr/bin/env node

// TD-MCP v2 - Pure MCP TouchDesigner Documentation Server
// Following Claude.md principles: POC first, no premature abstraction
// Phase 5: Code Organization - Modular structure

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Import tools
import * as getOperatorTool from './tools/get_operator.js';
import * as searchOperatorsTool from './tools/search_operators.js';
import * as suggestWorkflowTool from './tools/suggest_workflow.js';
import * as listOperatorsTool from './tools/list_operators.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const METADATA_PATH = join(__dirname, 'metadata'); // Use V2 metadata with real data
const PATTERNS_PATH = join(__dirname, 'data', 'patterns.json'); // Updated path

// Load package.json to get version
const packageJson = JSON.parse(await fs.readFile(join(__dirname, 'package.json'), 'utf-8'));
const VERSION = packageJson.version;

// Create MCP server instance
const server = new McpServer({
  name: "td-mcp",
  version: VERSION
});

// Operator storage - reuse from v1
const operators = new Map();

// Workflow patterns storage
let workflowPatterns = null;

// Load metadata - updated to handle new scraped format with rich data
async function loadMetadata() {
  console.log(`[Metadata] Loading from: ${METADATA_PATH}`);
  const files = await fs.readdir(METADATA_PATH);
  
  // Prioritize ultra-comprehensive metadata if available
  const ultraFiles = files.filter(file => file.startsWith('ultra_comprehensive_') && file.endsWith('.json'));
  const comprehensiveFiles = files.filter(file => file.startsWith('comprehensive_') && file.endsWith('.json') && !file.startsWith('ultra_'));
  
  const filesToLoad = ultraFiles.length > 0 ? ultraFiles : comprehensiveFiles;
  
  let totalParameters = 0;
  let totalExamples = 0;
  let totalTips = 0;

  for (const file of filesToLoad) {
    const filePath = join(METADATA_PATH, file);
    console.log(`[Metadata] Loading ${file}...`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const metadata = JSON.parse(content);
      
      // Handle new ultra-comprehensive format
      if (metadata.operators && Array.isArray(metadata.operators)) {
        for (const op of metadata.operators) {
          const key = op.fullName || op.name;
          
          // Count rich data
          if (op.parameters) totalParameters += op.parameters.length;
          if (op.examples) totalExamples += op.examples.length;
          if (op.tips) totalTips += op.tips.length;
          
          // Store operator with all enhanced metadata
          operators.set(key, {
            ...op,
            fullName: op.fullName || op.name,
            wikiName: (op.name || '').replace(/ /g, '_'),
            // Ensure arrays exist even if empty
            parameters: op.parameters || [],
            inputs: op.inputs || [],
            outputs: op.outputs || [],
            examples: op.examples || [],
            tips: op.tips || [],
            useCases: op.useCases || [],
            performanceNotes: op.performanceNotes || [],
            shortcuts: op.shortcuts || [],
            codeSnippets: op.codeSnippets || [],
            related: op.related || []
          });
        }
      }
      // Handle direct array format
      else if (Array.isArray(metadata)) {
        for (const op of metadata) {
          const key = op.fullName || op.name;
          operators.set(key, {
            ...op,
            fullName: op.fullName || op.name,
            wikiName: (op.name || '').replace(/ /g, '_')
          });
        }
      }
      // Handle old format (with operators property)
      else if (metadata.operators) {
        for (const op of metadata.operators) {
          const key = `${op.name} ${metadata.category}`;
          const fullName = `${op.name} ${metadata.category}`;
          operators.set(key, {
            ...op,
            category: metadata.category,
            fullName: fullName,
            wikiName: `${op.name}_${metadata.category}`
          });
        }
      }
    } catch (error) {
      console.error(`[Metadata] Error loading ${file}:`, error.message);
    }
  }
  
  console.log(`[Metadata] Loaded ${operators.size} operators`);
  if (totalParameters > 0) {
    console.log(`[Metadata] Total parameters: ${totalParameters}`);
    console.log(`[Metadata] Total examples: ${totalExamples}`);
    console.log(`[Metadata] Total tips: ${totalTips}`);
  }
}

// Load workflow patterns
async function loadPatterns() {
  try {
    console.log(`[Patterns] Loading from: ${PATTERNS_PATH}`);
    const content = await fs.readFile(PATTERNS_PATH, 'utf-8');
    workflowPatterns = JSON.parse(content);
    console.log(`[Patterns] Loaded ${workflowPatterns.patterns.length} workflow patterns`);
  } catch (error) {
    console.error('[Patterns] Failed to load patterns:', error);
    workflowPatterns = { patterns: [], common_transitions: {} };
  }
}

// Find operator (same as v1)
function findOperator(name) {
  if (operators.has(name)) {
    return operators.get(name);
  }
  
  const lowerName = name.toLowerCase();
  const matches = [];
  
  for (const [key, value] of operators) {
    const opName = key.substring(0, key.lastIndexOf(' '));
    if (opName.toLowerCase() === lowerName) {
      matches.push(value);
    }
  }
  
  if (matches.length === 1) {
    return matches[0];
  }
  
  if (matches.length > 1) {
    const categoryPriority = ['TOP', 'CHOP', 'SOP', 'DAT', 'MAT', 'COMP'];
    for (const cat of categoryPriority) {
      const match = matches.find(op => op.category === cat);
      if (match) return match;
    }
    return matches[0];
  }
  
  return null;
}

// Register tools using the new modular structure
server.registerTool(
  "get_operator",
  getOperatorTool.schema,
  async (params) => await getOperatorTool.handler(params, { findOperator })
);

server.registerTool(
  "search_operators",
  searchOperatorsTool.schema,
  async (params) => await searchOperatorsTool.handler(params, { operators })
);

server.registerTool(
  "suggest_workflow",
  suggestWorkflowTool.schema,
  async (params) => await suggestWorkflowTool.handler(params, { workflowPatterns })
);

server.registerTool(
  "list_operators",
  listOperatorsTool.schema,
  async (params) => await listOperatorsTool.handler(params, { operators })
);

// Main startup
async function main() {
  console.log(`TD-MCP v${VERSION} Server Starting...`);
  console.log('================================');
  console.log('TouchDesigner MCP Server for VS Code/Codium');
  console.log('Following Claude.md principles: Keep it simple');
  console.log('Pure MCP server - no WebSocket complexity\n');

  try {
    await loadMetadata();
    await loadPatterns();
    console.log(`\n[Server] TD MCP v${VERSION} initialized successfully`);
    console.log(`[Server] Workflow suggestions available via suggest_workflow tool`);
    console.log(`[Server] Modular structure: tools/, scrapers/, data/ directories`);
  } catch (error) {
    console.error('[Server] Failed to load metadata or patterns:', error);
    process.exit(1);
  }

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.log(`\n✓ TD-MCP v${VERSION} Server is now running (modular structure)`);
}

// Start the server
main().catch(error => {
  console.error('Server failed to start:', error);
  process.exit(1);
});