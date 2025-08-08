#!/usr/bin/env node

// TD-MCP v2 - Pure MCP TouchDesigner Documentation Server
// Following Claude.md principles: POC first, no premature abstraction
// Phase 5: Code Organization - Modular structure
//
// TODO: WIKI SYSTEM INTEGRATION REQUIRED
// This server has had all metadata caching functionality removed and is ready for wiki integration.
// Next steps for wiki system integration:
// 1. Replace empty {} parameters in tool handlers with wiki system data providers
// 2. Update tools/get_operator.js, tools/search_operators.js, tools/list_operators.js to use wiki
// 3. Integrate workflow patterns with wiki system (currently still using local patterns.json)
// 4. Add wiki system initialization in main() function startup

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Import wiki system and web server
import WikiSystem from './wiki/wiki-system.js';
import WikiWebServer from './wiki/server/wiki-server.js';

// Import tools
import * as getOperatorTool from './tools/get_operator.js';
import * as searchOperatorsTool from './tools/search_operators.js';
import * as suggestWorkflowTool from './tools/suggest_workflow.js';
import * as listOperatorsTool from './tools/list_operators.js';
import * as getTutorialTool from './tools/get_tutorial.js';
import * as listTutorialsTool from './tools/list_tutorials.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// TODO: Wiki system integration - patterns path will be handled by wiki system
const PATTERNS_PATH = join(__dirname, 'data', 'patterns.json'); // Keep for now, will integrate with wiki

// Load package.json to get version
const packageJson = JSON.parse(await fs.readFile(join(__dirname, 'package.json'), 'utf-8'));
const VERSION = packageJson.version;

// Create MCP server instance
const server = new McpServer({
  name: "td-mcp",
  version: VERSION
});

// Initialize wiki system with TouchDesigner documentation path
const wikiSystem = new WikiSystem({
    wikiPath: join(__dirname, 'wiki'),
    dataPath: join(__dirname, 'wiki', 'data'),
    processedPath: join(__dirname, 'wiki', 'data', 'processed'), // Point to processed directory with all 649 operators
    searchIndexPath: join(__dirname, 'wiki', 'data', 'search-index'),
    enablePersistence: true,
    autoIndex: true,
    // TouchDesigner documentation path
    tdDocsPath: 'C:\\Program Files\\Derivative\\TouchDesigner\\Samples\\Learn\\OfflineHelp\\https.docs.derivative.ca',
    // Progress reporting
    progressCallback: (progress) => {
        if (progress.processed % 100 === 0 || progress.complete) {
            console.log(`[Wiki] Processing progress: ${progress.percentage}% (${progress.processed}/${progress.total})`);
        }
    },
    progressInterval: 100 // Report every 100 files
});

// Initialize wiki web server
const wikiWebServer = new WikiWebServer(wikiSystem, {
    port: 3000,
    host: 'localhost',
    autoStart: false
});

// Workflow patterns storage (will be integrated with wiki system)
let workflowPatterns = null;

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

// TODO: Wiki system integration - operator lookup will be handled by wiki system

// Register tools using the wiki system
server.registerTool(
  "get_operator",
  getOperatorTool.schema,
  async (params) => await getOperatorTool.handler(params, { wikiSystem })
);

server.registerTool(
  "search_operators",
  searchOperatorsTool.schema,
  async (params) => await searchOperatorsTool.handler(params, { wikiSystem })
);

server.registerTool(
  "suggest_workflow",
  suggestWorkflowTool.schema,
  async (params) => await suggestWorkflowTool.handler(params, { wikiSystem, workflowPatterns })
);

server.registerTool(
  "list_operators",
  listOperatorsTool.schema,
  async (params) => await listOperatorsTool.handler(params, { wikiSystem })
);

// Register tutorial tools
server.registerTool(
  "get_tutorial",
  getTutorialTool.schema,
  async (params) => await getTutorialTool.handler(params, { wikiSystem })
);

server.registerTool(
  "list_tutorials",
  listTutorialsTool.schema,
  async (params) => await listTutorialsTool.handler(params, { wikiSystem })
);

// Main startup
async function main() {
  console.log(`TD-MCP v${VERSION} Server Starting...`);
  console.log('================================');
  console.log('TouchDesigner MCP Server for VS Code/Codium');
  console.log('Following Claude.md principles: Keep it simple');
  console.log('Pure MCP server - no WebSocket complexity\n');

  try {
    // Initialize wiki system
    console.log('[Server] Initializing wiki system...');
    await wikiSystem.initialize();
    
    // Start wiki web server
    console.log('[Server] Starting wiki web server...');
    const serverInfo = await wikiWebServer.start();
    
    // Load patterns (will be integrated with wiki system later)
    await loadPatterns();
    
    console.log(`\n[Server] TD MCP v${VERSION} initialized successfully`);
    const stats = wikiSystem.getSystemStats();
    console.log(`[Server] Wiki system ready with ${stats.totalEntries} operators and ${stats.totalTutorials} tutorials`);
    console.log(`[Server] All tools integrated with wiki system`);
    console.log(`[Server] HTM processing foundation complete`);
    console.log(`[Server] Wiki website available at: http://${serverInfo.host}:${serverInfo.port}`);
  } catch (error) {
    console.error('[Server] Initialization error:', error);
    // Continue startup even if wiki system fails to initialize
    console.log('[Server] Continuing startup with limited functionality');
  }

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.log(`\n✓ TD-MCP v${VERSION} Server is now running with HTM Wiki System integrated`);
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n[Server] Received SIGINT, shutting down gracefully...');
  
  try {
    if (wikiWebServer && wikiWebServer.isRunning) {
      console.log('[Server] Stopping wiki web server...');
      await wikiWebServer.stop();
    }
    
    if (wikiSystem) {
      console.log('[Server] Cleaning up wiki system...');
      wikiSystem.destroy();
    }
    
    console.log('[Server] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[Server] Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n[Server] Received SIGTERM, shutting down gracefully...');
  
  try {
    if (wikiWebServer && wikiWebServer.isRunning) {
      await wikiWebServer.stop();
    }
    
    if (wikiSystem) {
      wikiSystem.destroy();
    }
    
    process.exit(0);
  } catch (error) {
    console.error('[Server] Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the server
main().catch(error => {
  console.error('Server failed to start:', error);
  process.exit(1);
});