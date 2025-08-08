// TD-MCP v2.0 - Enhanced Search Operators Tool
// Advanced search with wiki system integration

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
export async function handler({ query, category, subcategory, parameter_search = false, show_details = false }, { wikiSystem }) {
  if (!wikiSystem) {
    return {
      content: [{
        type: "text",
        text: "Wiki system not available. Server may still be initializing."
      }]
    };
  }

  try {
    // Use wiki system's advanced search
    const searchResults = await wikiSystem.search(query, {
      category: category ? category.toUpperCase() : undefined,
      tags: subcategory ? [subcategory] : undefined,
      parameterSearch: parameter_search,
      limit: 20,
      fuzzy: true,
      threshold: 0.1
    });
    
    const results = searchResults.results || [];
    const queryLower = query.toLowerCase();
    
    // Format results
    let text = `# Search Results for "${query}"\n`;
    
    const filters = [];
    if (category) filters.push(`Category: ${category}`);
    if (subcategory) filters.push(`Subcategory: ${subcategory}`);
    if (parameter_search) filters.push('Parameter search enabled');
    
    if (filters.length > 0) {
      text += `**Filters:** ${filters.join(' | ')}\n`;
    }
    
    if (searchResults.searchTime) {
      text += `**Search time:** ${searchResults.searchTime}ms\n`;
    }
    text += '\n';
    
    if (results.length === 0) {
      text += `No operators found matching "${query}".\n\n`;
      
      // Show suggestions if available
      if (searchResults.suggestions && searchResults.suggestions.length > 0) {
        text += `**Did you mean:**\n`;
        searchResults.suggestions.slice(0, 5).forEach(suggestion => {
          text += `• ${suggestion}\n`;
        });
        text += '\n';
      }
      
      text += `**Search Tips:**\n`;
      text += `• Try a broader search term\n`;
      text += `• Remove category/subcategory filters\n`;
      text += `• Enable parameter search\n`;
      text += `• Check spelling\n`;
    } else {
      text += `Found **${results.length}** operators (showing top ${Math.min(results.length, 15)}):\n\n`;
      
      // Show top results
      for (let i = 0; i < Math.min(results.length, 15); i++) {
        const result = results[i];
        // Handle both full entry and summary formats
        const operator = result.entry || result;
        const rank = i + 1;
        
        text += `## ${rank}. ${operator.displayName || operator.name}\n`;
        text += `**Category:** ${operator.category}`;
        if (operator.subcategory) {
          text += ` | **Subcategory:** ${operator.subcategory}`;
        }
        text += ` | **Relevance:** ${Math.round(result.relevanceScore || result.score || 0)}\n\n`;
        
        // Description
        const desc = operator.description || operator.summary || 'No description available.';
        const shortDesc = desc.length > 200 ? desc.substring(0, 200) + '...' : desc;
        text += `${shortDesc}\n\n`;
        
        if (show_details) {
          // Parameters info
          if (operator.parameterCount !== undefined || operator.parameters) {
            const paramCount = operator.parameterCount || (operator.parameters ? operator.parameters.length : 0);
            if (paramCount > 0) {
              text += `**Parameters:** ${paramCount} total\n`;
            }
            
            // Show matching parameters if available
            if (result.matches && result.matches.some(m => m.field === 'parameter')) {
              const paramMatches = result.matches.filter(m => m.field === 'parameter');
              text += `Matching params: ${paramMatches.map(m => m.content).join(', ')}\n`;
            }
            text += '\n';
          }
          
          // Keywords
          if (operator.keywords && operator.keywords.length > 0) {
            const keywordsToShow = Array.isArray(operator.keywords) ? operator.keywords : [];
            if (keywordsToShow.length > 0) {
              text += `**Keywords:** ${keywordsToShow.slice(0, 5).join(', ')}\n`;
              if (keywordsToShow.length > 5) {
                text += ` and ${keywordsToShow.length - 5} more`;
              }
            }
            text += '\n';
          }
          
          // Tips (if available and query matches)
          if (operator.tips && operator.tips.length > 0) {
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
          
          // Matching highlights
          if (result.matches && result.matches.length > 0) {
            text += `**Matches found in:** ${result.matches.map(m => m.field).join(', ')}\n`;
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
      text += `• Query processed in: ${searchResults.searchTime || 0}ms\n`;
      
      // Facet information
      if (searchResults.facets) {
        const categoryCount = searchResults.facets.categories || {};
        if (Object.keys(categoryCount).length > 0) {
          text += `• Results by category: `;
          text += Object.entries(categoryCount)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, count]) => `${cat} (${count})`)
            .join(', ');
          text += '\n';
        }
      }
    }
    
    return {
      content: [{
        type: "text",
        text
      }]
    };
    
  } catch (error) {
    console.error('[Search Tool] Error:', error);
    return {
      content: [{
        type: "text",
        text: `Search error: ${error.message || 'Unknown error occurred'}`
      }]
    };
  }
}