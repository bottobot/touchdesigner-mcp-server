#!/usr/bin/env node

// TouDocV4 - Simple TouchDesigner Documentation MCP Server
// Direct approach: parse HTML on-demand, no database

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { promises as fs } from 'fs';
import { join } from 'path';
import * as cheerio from 'cheerio';
import { glob } from 'glob';

// Path to TouchDesigner offline documentation
const TOUCHDESIGNER_PATH = 'C:/Program Files/Derivative/TouchDesigner/Samples/Learn/OfflineHelp/https.docs.derivative.ca';

// Simple in-memory cache
const cache = new Map();
const operators = new Map(); // Map of operator names to file paths

// Create MCP server instance
const server = new McpServer({
  name: "toudocv4",
  version: "4.0.0"
});

// Get operator family from various sources
function getOperatorFamily(filename, $) {
  // First try to determine from filename patterns
  if (filename.match(/[_\-]?CHOP[_\-]?/i)) return 'CHOP';
  if (filename.match(/[_\-]?TOP[_\-]?/i)) return 'TOP';
  if (filename.match(/[_\-]?SOP[_\-]?/i)) return 'SOP';
  if (filename.match(/[_\-]?DAT[_\-]?/i)) return 'DAT';
  if (filename.match(/[_\-]?MAT[_\-]?/i)) return 'MAT';
  if (filename.match(/[_\-]?COMP[_\-]?/i)) return 'COMP';
  
  // Try to find family in the parameter class names
  if ($) {
    const paramClasses = ['.parNameCHOP', '.parNameTOP', '.parNameSOP', '.parNameDAT', '.parNameMAT', '.parNameCOMP'];
    for (const cls of paramClasses) {
      if ($(cls).length > 0) {
        return cls.replace('.parName', '');
      }
    }
  }
  
  return 'UNKNOWN';
}

// Parse operator HTML to extract info
async function parseOperatorHTML(filepath) {
  // Check cache first
  if (cache.has(filepath)) {
    return cache.get(filepath);
  }

  try {
    const html = await fs.readFile(filepath, 'utf-8');
    const $ = cheerio.load(html);
    
    // Extract operator name from title
    let title = $('.mw-page-title-main').text().trim();
    
    // If no title found, try other methods
    if (!title) {
      title = $('title').text().replace(' - Derivative', '').trim();
    }
    
    // Clean up title (remove "Class" suffix if present)
    title = title.replace(/\s+Class$/, '');
    
    // Extract summary - try multiple possible locations
    let summary = '';
    const summarySelectors = [
      'h2:contains("Summary")',
      'h3:contains("Summary")',
      '.mw-parser-output > p:first'
    ];
    
    for (const selector of summarySelectors) {
      const section = $(selector);
      if (section.length > 0) {
        const nextP = section.nextAll('p').first();
        if (nextP.length > 0) {
          summary = nextP.text().trim();
          break;
        }
      }
    }
    
    // If still no summary, get first paragraph
    if (!summary) {
      summary = $('.mw-parser-output p').first().text().trim();
    }
    
    // Extract parameters
    const parameters = [];
    $('.parNameCHOP, .parNameTOP, .parNameSOP, .parNameDAT, .parNameMAT, .parNameCOMP').each((i, elem) => {
      const $param = $(elem);
      const name = $param.text().trim();
      const code = $param.next('code').text().trim() || $param.nextAll('code').first().text().trim();
      const parentText = $param.parent().text();
      const description = parentText.replace(name, '').replace(code, '').trim();
      
      if (name) {
        parameters.push({ name, code: code || 'N/A', description });
      }
    });
    
    // Determine category
    const filename = filepath.split(/[\\/]/).pop();
    const category = getOperatorFamily(filename, $);
    
    const result = {
      name: title || filename.replace('.htm', ''),
      category,
      summary: summary || 'No summary available',
      parameters,
      filepath
    };
    
    // Cache the result
    cache.set(filepath, result);
    
    return result;
  } catch (error) {
    console.error(`Error parsing ${filepath}:`, error.message);
    return null;
  }
}

// Discover all operators by scanning HTML files
async function discoverOperators() {
  console.log(`Discovering operators from: ${TOUCHDESIGNER_PATH}`);
  
  const files = await glob('**/*.htm', {
    cwd: TOUCHDESIGNER_PATH,
    absolute: true
  });
  
  console.log(`Found ${files.length} HTML files`);
  
  // Process files in batches to avoid memory issues
  const batchSize = 50;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    await Promise.all(batch.map(async (file) => {
      const operatorInfo = await parseOperatorHTML(file);
      if (operatorInfo) {
        operators.set(operatorInfo.name, operatorInfo);
        
        // Also index by various name variations
        const variations = [
          operatorInfo.name.toLowerCase(),
          operatorInfo.name.replace(/\s+/g, ''),
          operatorInfo.name.replace(/\s+/g, '_'),
          operatorInfo.name.replace(/\s+/g, '-')
        ];
        
        for (const variant of variations) {
          operators.set(variant.toLowerCase(), operatorInfo);
        }
      }
    }));
  }
  
  console.log(`Indexed ${operators.size} operators`);
}

// Find operator by name with fuzzy matching
function findOperator(name) {
  // Try exact match first
  if (operators.has(name)) {
    return operators.get(name);
  }
  
  // Try case-insensitive match
  const lowerName = name.toLowerCase();
  if (operators.has(lowerName)) {
    return operators.get(lowerName);
  }
  
  // Try various variations
  const variations = [
    name.replace(/\s+/g, ''),
    name.replace(/\s+/g, '_'),
    name.replace(/\s+/g, '-'),
    name.replace(/azure/i, 'azure'),
    name.replace(/\s*CHOP$/i, ' CHOP'),
    name.replace(/\s*TOP$/i, ' TOP'),
    name.replace(/\s*SOP$/i, ' SOP'),
    name.replace(/\s*DAT$/i, ' DAT'),
    name.replace(/\s*MAT$/i, ' MAT'),
    name.replace(/\s*COMP$/i, ' COMP')
  ];
  
  for (const variant of variations) {
    if (operators.has(variant)) {
      return operators.get(variant);
    }
    if (operators.has(variant.toLowerCase())) {
      return operators.get(variant.toLowerCase());
    }
  }
  
  // Try fuzzy search
  const searchTerm = name.toLowerCase();
  for (const [key, value] of operators) {
    if (key.toLowerCase().includes(searchTerm) || 
        searchTerm.includes(key.toLowerCase())) {
      return value;
    }
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
      // Try to suggest similar operators
      const searchTerm = name.toLowerCase();
      const suggestions = [];
      for (const [key, value] of operators) {
        if (key.toLowerCase().includes(searchTerm.split(' ')[0])) {
          suggestions.push(value.name);
          if (suggestions.length >= 5) break;
        }
      }
      
      let text = `Operator '${name}' not found.`;
      if (suggestions.length > 0) {
        text += `\n\nDid you mean one of these?\n`;
        suggestions.forEach(s => text += `- ${s}\n`);
      }
      
      return {
        content: [{
          type: "text",
          text
        }]
      };
    }
    
    let text = `**${operator.name}** (${operator.category})\n\n`;
    text += `${operator.summary}\n\n`;
    
    if (operator.parameters.length > 0) {
      text += `**Parameters:**\n`;
      operator.parameters.slice(0, 20).forEach(param => {
        text += `- **${param.name}** (\`${param.code}\`): ${param.description}\n`;
      });
      if (operator.parameters.length > 20) {
        text += `\n... and ${operator.parameters.length - 20} more parameters\n`;
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
    description: "List available TouchDesigner operators",
    inputSchema: {
      category: z.string().optional().describe("Filter by category (CHOP, DAT, SOP, TOP, MAT, COMP)")
    }
  },
  async ({ category }) => {
    // Get unique operators (filter out duplicates from variations)
    const uniqueOperators = new Map();
    for (const [key, value] of operators) {
      if (key === value.name) { // Only include entries where key matches the actual name
        uniqueOperators.set(value.name, value);
      }
    }
    
    let filtered = Array.from(uniqueOperators.values());
    if (category) {
      const upperCategory = category.toUpperCase();
      filtered = filtered.filter(op => op.category === upperCategory);
    }
    
    if (filtered.length === 0) {
      return {
        content: [{
          type: "text",
          text: category 
            ? `No operators found in category '${category}'.`
            : "No operators found."
        }]
      };
    }
    
    // Group by category
    const grouped = {};
    for (const op of filtered) {
      if (!grouped[op.category]) grouped[op.category] = [];
      grouped[op.category].push(op.name);
    }
    
    let text = `Found ${filtered.length} operators:\n\n`;
    Object.entries(grouped).sort().forEach(([cat, ops]) => {
      text += `**${cat}:** ${ops.length} operators\n`;
      ops.sort().slice(0, 10).forEach(name => text += `- ${name}\n`);
      if (ops.length > 10) {
        text += `... and ${ops.length - 10} more\n`;
      }
      text += '\n';
    });
    
    return {
      content: [{
        type: "text",
        text
      }]
    };
  }
);

// Tool: Search operators
server.registerTool(
  "search_operators",
  {
    title: "Search TouchDesigner Operators",
    description: "Search for operators by name or description",
    inputSchema: {
      query: z.string().describe("Search query"),
      category: z.string().optional().describe("Filter by category")
    }
  },
  async ({ query, category }) => {
    const searchTerm = query.toLowerCase();
    const results = [];
    
    // Get unique operators
    const uniqueOperators = new Map();
    for (const [key, value] of operators) {
      if (key === value.name) {
        uniqueOperators.set(value.name, value);
      }
    }
    
    for (const op of uniqueOperators.values()) {
      if (op.name.toLowerCase().includes(searchTerm) ||
          op.summary.toLowerCase().includes(searchTerm)) {
        if (!category || op.category === category.toUpperCase()) {
          results.push(op);
        }
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
    
    let text = `Found ${results.length} operators matching '${query}':\n\n`;
    results.slice(0, 20).forEach(op => {
      text += `- **${op.name}** (${op.category}): ${op.summary.substring(0, 100)}...\n`;
    });
    
    if (results.length > 20) {
      text += `\n... and ${results.length - 20} more results\n`;
    }
    
    return {
      content: [{
        type: "text",
        text
      }]
    };
  }
);

// Update Memory MCP with status
async function updateMemory(message) {
  console.log(`[Memory Update] ${message}`);
  // In a full implementation, this would connect to Memory MCP
}

// Main startup
async function main() {
  console.log('TouDocV4 MCP Server Starting...');
  console.log('================================');
  console.log('Simple, direct TouchDesigner documentation server');
  console.log(`Documentation path: ${TOUCHDESIGNER_PATH}`);
  
  // Discover all operators
  try {
    await discoverOperators();
    
    // Show some stats
    const categories = {};
    for (const [key, op] of operators) {
      if (key === op.name) { // Only count unique operators
        categories[op.category] = (categories[op.category] || 0) + 1;
      }
    }
    
    console.log('\nOperator statistics:');
    Object.entries(categories).sort().forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count} operators`);
    });
    
    await updateMemory(`TouDocV4 initialized with ${operators.size} operator entries`);
  } catch (error) {
    console.error('Failed to discover operators:', error);
    await updateMemory('TouDocV4 failed to access TouchDesigner documentation');
  }
  
  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.log('\n✓ TouDocV4 MCP Server running');
  await updateMemory('TouDocV4 MCP Server is now running and ready');
}

// Start the server
main().catch(error => {
  console.error('Server failed to start:', error);
  process.exit(1);
});