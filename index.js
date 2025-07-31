#!/usr/bin/env node

// TD-MCP - Context7 TouchDesigner Documentation MCP Server
// Advanced contextual approach with 7 levels of context analysis

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getOperatorDetails } from './scrape-operator-details.js';
import { enrichPOPMetadata, POPLearningGuide } from './pop-learning-guide.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const METADATA_PATH = join(__dirname, 'metadata');


const MAX_RESULTS = {
  PARAMETERS: 20,
  SEARCH: 20,
  LIST_CATEGORY: 20,
  LIST_GROUP: 5,
  SUGGESTIONS: 5
};

// Create MCP server instance
const server = new McpServer({
  name: "td-mcp",
  version: "1.0.0"
});

// Operator storage
const operators = new Map();

// Load all metadata from the metadata directory
async function loadMetadata() {
  console.log(`[Metadata] Loading from: ${METADATA_PATH}`);
  const files = await fs.readdir(METADATA_PATH);
  const jsonFiles = files.filter(file => file.endsWith('.json'));

  for (const file of jsonFiles) {
    const filePath = join(METADATA_PATH, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const metadata = JSON.parse(content);

    // Debug logging to check metadata structure
    console.log(`[Debug] Loading file: ${file}`);
    console.log(`[Debug] Top-level category: ${metadata.category}`);
    
    if (metadata.operators) {
      console.log(`[Debug] Found ${metadata.operators.length} operators in ${file}`);
      
      for (const op of metadata.operators) {
        // Debug: Check if operator has category
        console.log(`[Debug] Operator "${op.name}" has category: ${op.category || 'UNDEFINED'}`);
        
        // Store with composite key to avoid naming conflicts
        // Use "Name CATEGORY" format as the key
        const key = `${op.name} ${metadata.category}`;
        operators.set(key, { ...op, category: metadata.category });
      }
    }
  }
  console.log(`[Metadata] Loaded ${operators.size} operators from ${jsonFiles.length} files.`);
  
  // Debug: Check a sample operator
  const sampleOp = operators.get('Circle SOP');
  if (sampleOp) {
    console.log('[Debug] Sample operator check:');
    console.log(`[Debug] Circle SOP properties:`, Object.keys(sampleOp));
    console.log(`[Debug] Circle SOP category:`, sampleOp.category);
  } else {
    // Try with new composite key format
    console.log('[Debug] Checking operators with new key format...');
    for (const [key, value] of operators) {
      if (key.startsWith('Circle')) {
        console.log(`[Debug] Found: ${key} -> category: ${value.category}`);
      }
    }
  }
}

// Find operator with contextual matching
function findOperator(name) {
  // Try exact match first (with composite key)
  if (operators.has(name)) {
    return operators.get(name);
  }
  
  // Try to find by operator name (partial match)
  const lowerName = name.toLowerCase();
  const matches = [];
  
  for (const [key, value] of operators) {
    // Extract just the operator name from the composite key
    const opName = key.substring(0, key.lastIndexOf(' '));
    
    if (opName.toLowerCase() === lowerName) {
      matches.push(value);
    }
  }
  
  // If we found exactly one match, return it
  if (matches.length === 1) {
    return matches[0];
  }
  
  // If multiple matches, prefer based on common usage patterns
  if (matches.length > 1) {
    // Priority order for categories when ambiguous
    const categoryPriority = ['TOP', 'CHOP', 'SOP', 'DAT', 'MAT', 'COMP'];
    
    for (const cat of categoryPriority) {
      const match = matches.find(op => op.category === cat);
      if (match) return match;
    }
    
    // Return first match if no priority match found
    return matches[0];
  }
  
  return null;
}

// Tool: Get specific operator
server.registerTool(
  "get_operator",
  {
    title: "Get TouchDesigner Operator",
    description: "Get details about a specific TouchDesigner operator",
    inputSchema: { 
      name: z.string().describe("Operator name (e.g., 'Noise CHOP', 'Kinect Azure TOP')") 
    }
  },
  async ({ name }) => {
    const operator = findOperator(name);
    
    if (!operator) {
      return {
        content: [{
          type: "text",
          text: `Operator '${name}' not found.`
        }]
      };
    }
    
    // Enrich POP operators with educational content
    if (operator.category === 'POP') {
      operator = enrichPOPMetadata(operator);
    }
    
    // Try to get detailed information by scraping
    const details = await getOperatorDetails(operator.name, operator.category);
    
    let text = `**${operator.name}** (${operator.category})\n`;
    if (operator.subcategory) {
      text += `*Subcategory: ${operator.subcategory}*\n`;
    }
    
    // Use scraped description or fallback to metadata
    const description = details?.description || operator.description;
    text += `\n${description}\n\n`;

    // Add parameters if available from scraping
    if (details?.parameters && details.parameters.length > 0) {
      text += `**Parameters:**\n`;
      details.parameters.forEach(param => {
        text += `- **${param.name}**: ${param.description}\n`;
      });
      text += '\n';
    }
    
    // Add inputs if available
    if (details?.inputs && details.inputs.length > 0) {
      text += `**Inputs:**\n`;
      details.inputs.forEach(input => {
        text += `- ${input}\n`;
      });
      text += '\n';
    }
    
    // Add outputs if available
    if (details?.outputs && details.outputs.length > 0) {
      text += `**Outputs:**\n`;
      details.outputs.forEach(output => {
        text += `- ${output}\n`;
      });
      text += '\n';
    }
    
    // Add attributes if available (common in POP operators)
    if (details?.attributes && details.attributes.length > 0) {
      text += `**Attributes:**\n`;
      details.attributes.forEach(attr => {
        text += `- **${attr.name}** (${attr.type}): ${attr.description}\n`;
      });
      text += '\n';
    }

    // Add metadata fields if available
    if (operator.aliases && operator.aliases.length > 0) {
      text += `**Aliases:** ${operator.aliases.join(', ')}\n`;
    }
    if (operator.keywords && operator.keywords.length > 0) {
      text += `**Keywords:** ${operator.keywords.join(', ')}\n`;
    }
    if (operator.use_cases && operator.use_cases.length > 0) {
      text += `**Use Cases:**\n`;
      operator.use_cases.forEach(uc => {
        text += `- ${uc}\n`;
      });
    }
    
    // Use scraped related operators or fallback to metadata
    const relatedOps = details?.related || operator.related_operators || [];
    if (relatedOps.length > 0) {
      text += `\n**Related Operators:** ${relatedOps.join(', ')}\n`;
    }
    
    // Add wiki URL
    if (details?.wiki_url || operator.wiki_url) {
      text += `\n**Documentation:** ${details?.wiki_url || operator.wiki_url}\n`;
    }
    
    // Add educational context for POP operators
    if (operator.educationalContext) {
      text += `\n**Educational Context:**\n`;
      text += `${operator.educationalContext.overview}\n\n`;
      
      if (operator.educationalContext.keyPoints) {
        text += `**Key Points:**\n`;
        operator.educationalContext.keyPoints.forEach(point => {
          text += `- ${point}\n`;
        });
        text += '\n';
      }
      
      if (operator.educationalContext.workflow) {
        text += `**Workflow:**\n`;
        operator.educationalContext.workflow.steps.forEach((step, i) => {
          text += `${i + 1}. ${step}\n`;
        });
        text += '\n';
      }
      
      if (operator.commonAttributes) {
        text += `**Common Attributes:**\n`;
        operator.commonAttributes.forEach(attr => {
          text += `- ${attr}\n`;
        });
      }
    }
    
    return {
      content: [{
        type: "text",
        text
      }]
    };
  }
);

// Tool: List operators
server.registerTool(
  "list_operators",
  {
    title: "List TouchDesigner Operators",
    description: "List available TouchDesigner operators with contextual grouping",
    inputSchema: {
      category: z.string().optional().describe("Filter by category (CHOP, DAT, SOP, TOP, MAT, COMP, POP)")
    }
  },
  async ({ category }) => {
    const results = [];
    
    for (const [name, operator] of operators) {
      if (!category || operator.category === category.toUpperCase()) {
        results.push(operator);
      }
    }
    
    if (results.length === 0) {
      return {
        content: [{
          type: "text",
          text: category ? `No operators found in category '${category}'.` : "No operators found."
        }]
      };
    }
    
    results.sort((a, b) => a.name.localeCompare(b.name));
    
    let text = `Found ${results.length} operators`;
    if (category) {
      text += ` in ${category.toUpperCase()} category`;
    }
    text += `:\n\n`;
    
    if (category) {
      results.slice(0, MAX_RESULTS.LIST_CATEGORY).forEach(op => {
        text += `- ${op.name}\n`;
      });
      if (results.length > MAX_RESULTS.LIST_CATEGORY) {
        text += `... and ${results.length - MAX_RESULTS.LIST_CATEGORY} more\n`;
      }
    } else {
      // Group by category
      const grouped = new Map();
      for (const op of results) {
        const ops = grouped.get(op.category) || [];
        ops.push(op);
        grouped.set(op.category, ops);
      }
      
      for (const [cat, ops] of Array.from(grouped.entries()).sort()) {
        text += `**${cat}:** ${ops.length} operators\n`;
        ops.slice(0, MAX_RESULTS.LIST_GROUP).forEach(op => {
          text += `- ${op.name}\n`;
        });
        if (ops.length > MAX_RESULTS.LIST_GROUP) {
          text += `... and ${ops.length - MAX_RESULTS.LIST_GROUP} more\n`;
        }
        text += '\n';
      }
    }
    
    return {
      content: [{
        type: "text",
        text
      }]
    };
  }
);

// Tool: Search operators with contextual ranking
server.registerTool(
  "search_operators",
  {
    title: "Search TouchDesigner Operators",
    description: "Search for operators using contextual analysis and ranking",
    inputSchema: {
      query: z.string().describe("Search query"),
      category: z.string().optional().describe("Filter by category (CHOP, DAT, SOP, TOP, MAT, COMP, POP)")
    }
  },
  async ({ query, category }) => {
    const searchTerm = query.toLowerCase();
    const results = [];
    
    for (const [name, operator] of operators) {
      if (category && operator.category !== category.toUpperCase()) {
        continue;
      }

      let relevance = 0;
      
      if (operator.name.toLowerCase().includes(searchTerm)) {
        relevance = 1.0;
      }
      if (operator.description && operator.description.toLowerCase().includes(searchTerm)) {
        relevance = Math.max(relevance, 0.8);
      }
      if (operator.keywords && operator.keywords.some(k => k.toLowerCase().includes(searchTerm))) {
        relevance = Math.max(relevance, 0.9);
      }
      if (operator.aliases && operator.aliases.some(a => a.toLowerCase().includes(searchTerm))) {
        relevance = Math.max(relevance, 0.9);
      }
      if (operator.subcategory && operator.subcategory.toLowerCase().includes(searchTerm)) {
        relevance = Math.max(relevance, 0.7);
      }

      if (relevance > 0) {
        results.push({ ...operator, relevance });
      }
    }
    
    if (results.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No operators found matching '${query}'.`
        }]
      };
    }
    
    results.sort((a, b) => b.relevance - a.relevance);
    
    let text = `Found ${results.length} operators matching '${query}':\n\n`;
    results.slice(0, MAX_RESULTS.SEARCH).forEach(op => {
      text += `- **${op.name}** (${op.category}, relevance: ${op.relevance.toFixed(2)})\n`;
    });
    
    if (results.length > MAX_RESULTS.SEARCH) {
      text += `\n... and ${results.length - MAX_RESULTS.SEARCH} more results\n`;
    }
    
    return {
      content: [{
        type: "text",
        text
      }]
    };
  }
);

// Tool: Get POP Learning Guide
server.registerTool(
  "get_pop_learning_guide",
  {
    title: "Get POP Learning Guide",
    description: "Get comprehensive learning information about TouchDesigner POPs (Point Operators)",
    inputSchema: {}
  },
  async () => {
    let text = `# Learning About POPs\n\n`;
    text += `${POPLearningGuide.overview.description}\n\n`;
    
    text += `## Key Points\n`;
    POPLearningGuide.overview.keyPoints.forEach(point => {
      text += `- ${point}\n`;
    });
    text += '\n';
    
    text += `## Categories\n\n`;
    for (const [category, info] of Object.entries(POPLearningGuide.categories)) {
      text += `### ${category}\n`;
      text += `${info.description}\n\n`;
      
      if (info.details) {
        info.details.forEach(detail => {
          text += `- ${detail}\n`;
        });
        text += '\n';
      }
      
      if (info.commonAttributes) {
        text += `**Common Attributes:**\n`;
        info.commonAttributes.forEach(attr => {
          text += `- ${attr}\n`;
        });
        text += '\n';
      }
      
      if (info.examples) {
        text += `**Examples:**\n`;
        info.examples.forEach(example => {
          text += `- ${example}\n`;
        });
        text += '\n';
      }
    }
    
    text += `## Workflow\n`;
    text += `${POPLearningGuide.workflow.title}\n\n`;
    POPLearningGuide.workflow.steps.forEach((step, i) => {
      text += `${i + 1}. ${step}\n`;
    });
    text += '\n';
    
    text += `## Best Practices\n`;
    POPLearningGuide.bestPractices.forEach(practice => {
      text += `- ${practice}\n`;
    });
    text += '\n';
    
    text += `## Example Package\n`;
    text += `**${POPLearningGuide.examplePackage.name}**\n`;
    text += `${POPLearningGuide.examplePackage.description}\n`;
    text += `${POPLearningGuide.examplePackage.url}\n`;
    
    return {
      content: [{
        type: "text",
        text
      }]
    };
  }
);

// Main startup
async function main() {
  console.log('TD-MCP Server Starting...');
  console.log('================================');
  console.log('Metadata-driven TouchDesigner MCP Server');
  console.log('');

  try {
    await loadMetadata();
    console.log('\n[Server] TD MCP Server initialized successfully');
    console.log(`[Server] Ready to provide operator information`);
  } catch (error) {
    console.error('[Server] Failed to load metadata:', error);
    process.exit(1);
  }

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.log('\n✓ TD-MCP Server is now running');
}

// Start the server
main().catch(error => {
  console.error('Server failed to start:', error);
  process.exit(1);
});