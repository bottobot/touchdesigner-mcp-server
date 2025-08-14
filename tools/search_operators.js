// TD-MCP v2.0 - Direct Search Operators Tool
// Direct search implementation without index dependency

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

/**
 * Performs direct search through operator data
 * @param {Map|Array} operatorData - The operator data to search through
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Array} Search results with relevance scores
 */
function performDirectSearch(operatorData, query, options = {}) {
  const { category, subcategory, parameter_search = false } = options;
  const searchTerms = query.toLowerCase().split(/\s+/);
  const results = [];
  
  // Helper function to process each operator
  const processOperator = (operator) => {
    // Apply category filter
    if (category && operator.category !== category.toUpperCase()) {
      return null;
    }
    
    // Apply subcategory filter
    if (subcategory && operator.subcategory !== subcategory) {
      return null;
    }
    
    let score = 0;
    let matches = [];
    
    // Search in name (highest priority)
    const nameLower = (operator.name || '').toLowerCase();
    const displayNameLower = (operator.displayName || '').toLowerCase();
    
    for (const term of searchTerms) {
      if (nameLower.includes(term)) {
        score += 100;
        if (!matches.some(m => m.field === 'name')) {
          matches.push({ field: 'name', content: operator.name });
        }
      }
      if (displayNameLower.includes(term)) {
        score += 90;
        if (!matches.some(m => m.field === 'displayName')) {
          matches.push({ field: 'displayName', content: operator.displayName });
        }
      }
    }
    
    // Search in description
    const descLower = (operator.description || operator.summary || '').toLowerCase();
    for (const term of searchTerms) {
      if (descLower.includes(term)) {
        score += 50;
        if (!matches.some(m => m.field === 'description')) {
          matches.push({ field: 'description', content: descLower.substring(0, 100) });
        }
      }
    }
    
    // Search in keywords
    if (operator.keywords && operator.keywords.length > 0) {
      for (const keyword of operator.keywords) {
        const keywordLower = keyword.toLowerCase();
        for (const term of searchTerms) {
          if (keywordLower.includes(term)) {
            score += 30;
            if (!matches.some(m => m.field === 'keywords' && m.content === keyword)) {
              matches.push({ field: 'keywords', content: keyword });
            }
          }
        }
      }
    }
    
    // Search in parameters if requested
    if (parameter_search && operator.parameters && operator.parameters.length > 0) {
      for (const param of operator.parameters) {
        const paramNameLower = (param.name || '').toLowerCase();
        const paramDescLower = (param.description || '').toLowerCase();
        
        for (const term of searchTerms) {
          if (paramNameLower.includes(term)) {
            score += 20;
            if (!matches.some(m => m.field === 'parameter' && m.content === param.name)) {
              matches.push({ field: 'parameter', content: param.name });
            }
          }
          if (paramDescLower.includes(term)) {
            score += 10;
            if (!matches.some(m => m.field === 'parameter' && m.content === param.name)) {
              matches.push({ field: 'parameter', content: param.name });
            }
          }
        }
      }
    }
    
    // Return result if there's a match
    if (score > 0) {
      return {
        entry: operator,
        score: score,
        relevanceScore: score,
        matches: matches
      };
    }
    
    return null;
  };
  
  // Process operator data based on its type
  if (operatorData instanceof Map) {
    // Process Map data structure
    for (const [id, operator] of operatorData) {
      const result = processOperator(operator);
      if (result) {
        results.push(result);
      }
    }
  } else if (Array.isArray(operatorData)) {
    // Process Array data structure
    for (const operator of operatorData) {
      const result = processOperator(operator);
      if (result) {
        results.push(result);
      }
    }
  } else if (operatorData && typeof operatorData === 'object') {
    // Process plain object data structure
    for (const key in operatorData) {
      if (operatorData.hasOwnProperty(key)) {
        const result = processOperator(operatorData[key]);
        if (result) {
          results.push(result);
        }
      }
    }
  }
  
  // Sort by relevance score
  results.sort((a, b) => b.score - a.score);
  
  return results;
}

/**
 * Get operator data from operatorDataManager using available methods
 * @param {Object} operatorDataManager - The operator data manager instance
 * @returns {Promise<Array|Map>} Operator data
 */
async function getOperatorData(operatorDataManager) {
  // Try different methods to get operator data

  // Method 1: Try entries Map
  if (operatorDataManager.entries && operatorDataManager.entries.size > 0) {
    console.log(`[Search Tool] Using entries Map (${operatorDataManager.entries.size} operators)`);
    return operatorDataManager.entries;
  }

  // Method 2: Try operators Map
  if (operatorDataManager.operators && operatorDataManager.operators.size > 0) {
    console.log(`[Search Tool] Using operators Map (${operatorDataManager.operators.size} operators)`);
    return operatorDataManager.operators;
  }

  // Method 3: Try listOperators function
  if (typeof operatorDataManager.listOperators === 'function') {
    console.log('[Search Tool] Using listOperators() method');
    const operators = await operatorDataManager.listOperators();
    if (operators && operators.length > 0) {
      console.log(`[Search Tool] Retrieved ${operators.length} operators`);
      return operators;
    }
  }
  
  // Method 4: Try to get operators directly from properties
  const possibleProperties = ['data', 'items', 'cache', 'store'];
  for (const prop of possibleProperties) {
    if (operatorDataManager[prop]) {
      console.log(`[Search Tool] Checking property: ${prop}`);
      const data = operatorDataManager[prop];
      if (data instanceof Map && data.size > 0) {
        console.log(`[Search Tool] Using ${prop} Map (${data.size} operators)`);
        return data;
      } else if (Array.isArray(data) && data.length > 0) {
        console.log(`[Search Tool] Using ${prop} Array (${data.length} operators)`);
        return data;
      }
    }
  }
  
  return null;
}

// Tool handler
export async function handler({ query, category, subcategory, parameter_search = false, show_details = false }, { operatorDataManager }) {
  if (!operatorDataManager) {
    return {
      content: [{
        type: "text",
        text: "Operator data manager not available. Server may still be initializing."
      }]
    };
  }

  try {
    // Get operator data from operatorDataManager
    const operatorData = await getOperatorData(operatorDataManager);
    
    if (!operatorData) {
      return {
        content: [{
          type: "text",
          text: "No operator data available. The server may still be loading or there might be a configuration issue."
        }]
      };
    }
    
    // Perform direct search
    const results = performDirectSearch(operatorData, query, {
      category,
      subcategory,
      parameter_search
    });
    
    // Build search results object for formatting
    const searchResults = {
      results: results.slice(0, 20), // Limit to top 20 results
      total: results.length,
      searchTime: 0, // Direct search is fast, no need to measure
      suggestions: [],
      facets: {
        categories: {}
      }
    };
    
    // Count categories for facets
    for (const result of results) {
      const cat = result.entry.category;
      if (cat) {
        searchResults.facets.categories[cat] = (searchResults.facets.categories[cat] || 0) + 1;
      }
    }
    
    // Format results for display
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
        const operator = result.entry;
        const rank = i + 1;
        
        text += `## ${rank}. ${operator.displayName || operator.name}\n`;
        text += `**Category:** ${operator.category}`;
        if (operator.subcategory) {
          text += ` | **Subcategory:** ${operator.subcategory}`;
        }
        text += ` | **Relevance:** ${Math.round(result.relevanceScore)}\n\n`;
        
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
              text += `**Keywords:** ${keywordsToShow.slice(0, 5).join(', ')}`;
              if (keywordsToShow.length > 5) {
                text += ` and ${keywordsToShow.length - 5} more`;
              }
              text += '\n\n';
            }
          }
          
          // Tips (if available and query matches)
          if (operator.tips && operator.tips.length > 0) {
            const queryLower = query.toLowerCase();
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
            const uniqueFields = [...new Set(result.matches.map(m => m.field))];
            text += `**Matches found in:** ${uniqueFields.join(', ')}\n`;
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
      text += `• Direct search completed successfully\n`;
      
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