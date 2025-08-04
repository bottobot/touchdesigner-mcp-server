// TD-MCP v2.0 - Enhanced Search Operators Tool
// Advanced search with rich data support

import { z } from "zod";

// Tool schema
export const schema = {
  title: "Search TouchDesigner Operators",
  description: "Search for operators using advanced contextual analysis and ranking",
  inputSchema: {
    query: z.string().describe("Search query"),
    category: z.string().optional().describe("Filter by category (CHOP, DAT, SOP, TOP, MAT, COMP)"),
    subcategory: z.string().optional().describe("Filter by subcategory (e.g., 'Audio', 'Filters', 'Generators')"),
    parameter_search: z.boolean().optional().describe("Search within parameter names and descriptions"),
    show_details: z.boolean().optional().describe("Show detailed information for each result")
  }
};

// Tool handler
export async function handler({ query, category, subcategory, parameter_search = false, show_details = false }, { operators }) {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);
  const results = [];
  
  // Search through operators
  for (const [key, operator] of operators) {
    // Skip if category filter doesn't match
    if (category && operator.category !== category.toUpperCase()) {
      continue;
    }
    
    // Skip if subcategory filter doesn't match
    if (subcategory && operator.subcategory && 
        operator.subcategory.toLowerCase() !== subcategory.toLowerCase()) {
      continue;
    }
    
    // Calculate relevance score
    let score = 0;
    const nameLower = operator.name.toLowerCase();
    const descLower = (operator.description || '').toLowerCase();
    
    // Exact name match (highest priority)
    if (nameLower === queryLower) {
      score += 1000;
    }
    // Name starts with query
    else if (nameLower.startsWith(queryLower)) {
      score += 500;
    }
    // Name contains query
    else if (nameLower.includes(queryLower)) {
      score += 200;
    }
    
    // All query words in name
    if (queryWords.every(word => nameLower.includes(word))) {
      score += 150;
    }
    
    // Description contains query
    if (descLower.includes(queryLower)) {
      score += 50;
    }
    
    // All query words in description
    if (queryWords.every(word => descLower.includes(word))) {
      score += 30;
    }
    
    // Use cases match
    if (operator.useCases) {
      for (const useCase of operator.useCases) {
        if (useCase.toLowerCase().includes(queryLower)) {
          score += 40;
        }
      }
    }
    
    // Parameter search
    if (parameter_search && operator.parameters) {
      for (const param of operator.parameters) {
        const paramNameLower = param.name.toLowerCase();
        const paramDescLower = (param.description || '').toLowerCase();
        
        if (paramNameLower.includes(queryLower)) {
          score += 25;
        }
        if (paramDescLower.includes(queryLower)) {
          score += 15;
        }
      }
    }
    
    // Tips and examples contain query
    if (operator.tips) {
      for (const tip of operator.tips) {
        if (tip.toLowerCase().includes(queryLower)) {
          score += 20;
        }
      }
    }
    
    if (operator.examples) {
      for (const example of operator.examples) {
        if (example.content && example.content.toLowerCase().includes(queryLower)) {
          score += 15;
        }
      }
    }
    
    // Keywords match
    if (operator.keywords) {
      for (const keyword of operator.keywords) {
        if (keyword.toLowerCase().includes(queryLower)) {
          score += 35;
        }
      }
    }
    
    // Aliases match
    if (operator.aliases) {
      for (const alias of operator.aliases) {
        if (alias.toLowerCase() === queryLower) {
          score += 300;
        } else if (alias.toLowerCase().includes(queryLower)) {
          score += 100;
        }
      }
    }
    
    // Boost score based on parameter count (operators with more params are often more feature-rich)
    if (operator.parameterCount) {
      score += Math.min(operator.parameterCount * 0.5, 50);
    }
    
    if (score > 0) {
      results.push({ operator, score });
    }
  }
  
  // Sort by score (highest first)
  results.sort((a, b) => b.score - a.score);
  
  // Format results
  let text = `# Search Results for "${query}"\n`;
  
  const filters = [];
  if (category) filters.push(`Category: ${category}`);
  if (subcategory) filters.push(`Subcategory: ${subcategory}`);
  if (parameter_search) filters.push('Parameter search enabled');
  
  if (filters.length > 0) {
    text += `**Filters:** ${filters.join(' | ')}\n`;
  }
  text += '\n';
  
  if (results.length === 0) {
    text += `No operators found matching "${query}".\n\n`;
    text += `**Suggestions:**\n`;
    text += `• Try a broader search term\n`;
    text += `• Remove category/subcategory filters\n`;
    text += `• Enable parameter search\n`;
    text += `• Check spelling\n`;
  } else {
    text += `Found **${results.length}** operators (showing top ${Math.min(results.length, 15)}):\n\n`;
    
    // Show top results
    for (let i = 0; i < Math.min(results.length, 15); i++) {
      const { operator, score } = results[i];
      const rank = i + 1;
      
      text += `## ${rank}. ${operator.fullName || operator.name}\n`;
      text += `**Category:** ${operator.category}`;
      if (operator.subcategory) {
        text += ` | **Subcategory:** ${operator.subcategory}`;
      }
      text += ` | **Relevance:** ${Math.round(score)}\n\n`;
      
      // Description
      const desc = operator.description || 'No description available.';
      const shortDesc = desc.length > 200 ? desc.substring(0, 200) + '...' : desc;
      text += `${shortDesc}\n\n`;
      
      if (show_details) {
        // Parameters info
        if (operator.parameters && operator.parameters.length > 0) {
          text += `**Parameters:** ${operator.parameterCount || operator.parameters.length} total\n`;
          
          // Show first few parameter names
          const paramNames = operator.parameters.slice(0, 5).map(p => p.name);
          text += `Key params: ${paramNames.join(', ')}`;
          if (operator.parameters.length > 5) {
            text += `, and ${operator.parameters.length - 5} more`;
          }
          text += '\n\n';
        }
        
        // Use cases
        if (operator.useCases && operator.useCases.length > 0) {
          text += `**Use Cases:**\n`;
          operator.useCases.slice(0, 3).forEach(useCase => {
            text += `• ${useCase}\n`;
          });
          text += '\n';
        }
        
        // Tips (if query matches)
        if (operator.tips) {
          const matchingTips = operator.tips.filter(tip => 
            tip.toLowerCase().includes(queryLower)
          ).slice(0, 2);
          
          if (matchingTips.length > 0) {
            text += `**Related Tips:**\n`;
            matchingTips.forEach(tip => {
              text += `💡 ${tip.substring(0, 150)}${tip.length > 150 ? '...' : ''}\n`;
            });
            text += '\n';
          }
        }
      }
      
      text += '---\n\n';
    }
    
    if (results.length > 15) {
      text += `*...and ${results.length - 15} more results*\n\n`;
    }
    
    // Search statistics
    text += `## Search Statistics\n`;
    text += `• Total matches: ${results.length}\n`;
    text += `• Top score: ${Math.round(results[0].score)}\n`;
    
    // Category breakdown
    const categoryCount = {};
    results.forEach(({ operator }) => {
      categoryCount[operator.category] = (categoryCount[operator.category] || 0) + 1;
    });
    
    text += `• Results by category: `;
    text += Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => `${cat} (${count})`)
      .join(', ');
    text += '\n';
  }
  
  return {
    content: [{
      type: "text",
      text
    }]
  };
}