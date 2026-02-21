#!/usr/bin/env node

// TD-MCP v2 - Pure MCP TouchDesigner Documentation Server
// Following Claude.md principles: POC first, no premature abstraction
// Phase 5: Code Organization - Modular structure
//
// Wiki system fully integrated - all tools use OperatorDataManager for data access

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Import operator data manager
import OperatorDataManager from './wiki/operator-data-manager.js';

// Import tools
import * as getOperatorTool from './tools/get_operator.js';
import * as searchOperatorsTool from './tools/search_operators.js';
import * as suggestWorkflowTool from './tools/suggest_workflow.js';
import * as listOperatorsTool from './tools/list_operators.js';
import * as getTutorialTool from './tools/get_tutorial.js';
import * as listTutorialsTool from './tools/list_tutorials.js';
import * as getPythonApiTool from './tools/get_python_api.js';
import * as searchPythonApiTool from './tools/search_python_api.js';
import * as searchTutorialsTool from './tools/search_tutorials.js';
import * as getOperatorExamplesTool from './tools/get_operator_examples.js';
import * as listPythonClassesTool from './tools/list_python_classes.js';
import * as compareOperatorsTool from './tools/compare_operators.js';
import * as getVersionInfoTool from './tools/get_version_info.js';
import * as listVersionsTool from './tools/list_versions.js';

// Import experimental techniques tools (v2.9)
import * as getExperimentalTechniquesTool from './tools/get_experimental_techniques.js';
import * as searchExperimentalTool from './tools/search_experimental.js';
import * as getGlslPatternTool from './tools/get_glsl_pattern.js';

// Import core enhancement tools (v2.10)
import * as getOperatorConnectionsTool from './tools/get_operator_connections.js';
import * as getNetworkTemplateTool from './tools/get_network_template.js';

// Import experimental build tools (v2.11)
import * as getExperimentalBuildTool from './tools/get_experimental_build.js';
import * as listExperimentalBuildsTool from './tools/list_experimental_builds.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PATTERNS_PATH = join(__dirname, 'data', 'patterns.json');

// Load package.json to get version
const packageJson = JSON.parse(await fs.readFile(join(__dirname, 'package.json'), 'utf-8'));
const VERSION = packageJson.version;

// Create MCP server instance
const server = new McpServer({
  name: "td-mcp",
  version: VERSION
});

// Initialize operator data manager with TouchDesigner documentation path
const operatorDataManager = new OperatorDataManager({
    wikiPath: join(__dirname, 'wiki'),
    dataPath: join(__dirname, 'wiki', 'data'),
    processedPath: join(__dirname, 'wiki', 'data', 'processed'), // Point to processed directory with all 649 operators
    searchIndexPath: join(__dirname, 'wiki', 'data', 'search-index'),
    enablePersistence: true,
    autoIndex: true,
    // TouchDesigner documentation path - points to downloaded docs
    tdDocsPath: join(__dirname, 'wiki', 'docs', 'python'),
    // Progress reporting
    progressCallback: (progress) => {
        if (progress.processed % 100 === 0 || progress.complete) {
            console.log(`[Wiki] Processing progress: ${progress.percentage}% (${progress.processed}/${progress.total})`);
        }
    },
    progressInterval: 100 // Report every 100 files
});

// Web server functionality removed - not needed for MCP server operation

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

// Register tools
server.registerTool(
  "get_operator",
  getOperatorTool.schema,
  async (params) => await getOperatorTool.handler(params, { operatorDataManager })
);

server.registerTool(
  "search_operators",
  searchOperatorsTool.schema,
  async (params) => await searchOperatorsTool.handler(params, { operatorDataManager })
);

server.registerTool(
  "suggest_workflow",
  suggestWorkflowTool.schema,
  async (params) => await suggestWorkflowTool.handler(params, { operatorDataManager, workflowPatterns })
);

server.registerTool(
  "list_operators",
  listOperatorsTool.schema,
  async (params) => await listOperatorsTool.handler(params, { operatorDataManager })
);

// Register tutorial tools
server.registerTool(
  "get_tutorial",
  getTutorialTool.schema,
  async (params) => await getTutorialTool.handler(params, { operatorDataManager })
);

server.registerTool(
  "list_tutorials",
  listTutorialsTool.schema,
  async (params) => await listTutorialsTool.handler(params, { operatorDataManager })
);

// Register Python API tools
server.registerTool(
  "get_python_api",
  getPythonApiTool.schema,
  async (params) => await getPythonApiTool.handler(params, { operatorDataManager })
);

server.registerTool(
  "search_python_api",
  searchPythonApiTool.schema,
  async (params) => await searchPythonApiTool.handler(params, { operatorDataManager })
);

// Register new v2.7 tools
server.registerTool(
  "search_tutorials",
  searchTutorialsTool.schema,
  async (params) => await searchTutorialsTool.handler(params, { operatorDataManager })
);

server.registerTool(
  "get_operator_examples",
  getOperatorExamplesTool.schema,
  async (params) => await getOperatorExamplesTool.handler(params, { operatorDataManager })
);

server.registerTool(
  "list_python_classes",
  listPythonClassesTool.schema,
  async (params) => await listPythonClassesTool.handler(params, { operatorDataManager })
);

server.registerTool(
  "compare_operators",
  compareOperatorsTool.schema,
  async (params) => await compareOperatorsTool.handler(params, { operatorDataManager })
);

// Register version system tools (v2.8)
server.registerTool(
  "get_version_info",
  getVersionInfoTool.schema,
  async (params) => await getVersionInfoTool.handler(params, {})
);

server.registerTool(
  "list_versions",
  listVersionsTool.schema,
  async (params) => await listVersionsTool.handler(params, {})
);

// Register experimental techniques tools (v2.9)
server.registerTool(
  "get_experimental_techniques",
  getExperimentalTechniquesTool.schema,
  async (params) => await getExperimentalTechniquesTool.handler(params)
);

server.registerTool(
  "search_experimental",
  searchExperimentalTool.schema,
  async (params) => await searchExperimentalTool.handler(params)
);

server.registerTool(
  "get_glsl_pattern",
  getGlslPatternTool.schema,
  async (params) => await getGlslPatternTool.handler(params)
);

// Register core enhancement tools (v2.10)
server.registerTool(
  "get_operator_connections",
  getOperatorConnectionsTool.schema,
  async (params) => await getOperatorConnectionsTool.handler(params, {})
);

server.registerTool(
  "get_network_template",
  getNetworkTemplateTool.schema,
  async (params) => await getNetworkTemplateTool.handler(params, {})
);

// Register experimental build tools (v2.11)
server.registerTool(
  "get_experimental_build",
  getExperimentalBuildTool.schema,
  async (params) => await getExperimentalBuildTool.handler(params, {})
);

server.registerTool(
  "list_experimental_builds",
  listExperimentalBuildsTool.schema,
  async (params) => await listExperimentalBuildsTool.handler(params, {})
);

// Main startup
async function main() {
  console.log(`TD-MCP v${VERSION} Server Starting...`);
  console.log('================================');
  console.log('TouchDesigner MCP Server for VS Code/Codium');
  console.log('Pure MCP server - stdio transport\n');

  try {
    // Initialize wiki system
    console.log('[Server] Initializing operator data manager...');
    const initStartTime = Date.now();
    await operatorDataManager.initialize();
    const initDuration = Date.now() - initStartTime;
    console.log(`[Server] Initialization took ${initDuration}ms (${(initDuration/1000).toFixed(2)}s)`);
    
    await loadPatterns();
    
    console.log(`\n[Server] TD MCP v${VERSION} initialized successfully`);
    const stats = operatorDataManager.getSystemStats();
    const pythonApiStats = stats.pythonApiStats || { totalClasses: 0 };
    console.log(`[Server] Ready with ${stats.totalEntries} operators, ${stats.totalTutorials} tutorials, and ${pythonApiStats.totalClasses} Python classes`);
    console.log(`[Server] All 21 tools registered`);
  } catch (error) {
    console.error('[Server] Initialization error:', error);
    // Continue startup even if wiki system fails to initialize
    console.log('[Server] Continuing startup with limited functionality');
  }

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.log(`\nTD-MCP v${VERSION} Server is now running`);
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n[Server] Received SIGINT, shutting down gracefully...');
  
  try {
    if (operatorDataManager) {
      console.log('[Server] Cleaning up operator data manager...');
      operatorDataManager.destroy();
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
    if (operatorDataManager) {
      operatorDataManager.destroy();
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