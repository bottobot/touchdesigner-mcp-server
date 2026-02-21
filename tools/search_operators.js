// TD-MCP v2.10 - Search Operators Tool
// Delegates search to operatorDataManager.performDirectSearch() - single source of truth.
// v2.8:  Added optional 'version' parameter for compatibility filtering.
// v2.10: Added 'type' enum filter (exact/fuzzy/tag) and totalResults in response.

import { z } from "zod";
import { filterByVersion, normalizeVersion } from "../wiki/utils/version-filter.js";

const VALID_CATEGORIES = ["CHOP", "DAT", "SOP", "TOP", "MAT", "COMP", "POP"];

// Tool schema
export const schema = {
  title: "Search TouchDesigner Operators",
  description: "Search for operators using advanced contextual analysis and ranking. " +
    "Supports multi-term queries, category/subcategory filtering, parameter search, typo tolerance, " +
    "search type selection (exact/fuzzy/tag), and optional TouchDesigner version compatibility filtering.",
  inputSchema: {
    query: z.string().describe("Search query"),
    category: z.string().optional().describe("Filter by category (CHOP, DAT, SOP, TOP, MAT, COMP, POP)"),
    subcategory: z.string().optional().describe("Filter by subcategory (e.g., 'Audio', 'Filters', 'Generators')"),
    type: z.enum(["exact", "fuzzy", "tag"]).optional().describe(
      "Search matching strategy: " +
      "'exact' = only full-word matches in name/displayName; " +
      "'fuzzy' = typo-tolerant contextual search (default); " +
      "'tag' = match against operator tags and keywords only"
    ),
    parameter_search: z.boolean().optional().describe("Search within parameter names and descriptions"),
    show_details: z.boolean().optional().describe("Show detailed information for each result"),
    limit: z.number().optional().describe("Maximum results to display (default: 20, max: 50)"),
    version: z.string().optional().describe(
      "Filter results to operators compatible with a specific TouchDesigner version " +
      "(e.g. '2023', '2022', '2021', '2020', '2019', '099'). " +
      "Operators introduced after this version are excluded."
    )
  }
};

// Tool handler
export async function handler({ query, category, subcategory, type: searchType = "fuzzy", parameter_search = false, show_details = false, limit = 20, version }, { operatorDataManager }) {
  if (!operatorDataManager) {
    return {
      content: [{
        type: "text",
        text: "Operator data manager not available. Server may still be initializing."
      }]
    };
  }

  // Validate category input
  if (category) {
    const normalised = category.trim().toUpperCase();
    if (!VALID_CATEGORIES.includes(normalised)) {
      return {
        content: [{
          type: "text",
          text: `Unknown category "${category}".\n\nValid operator families are: ${VALID_CATEGORIES.join(", ")}.\n\nExample: search_operators({ query: "${query}", category: "CHOP" })`
        }]
      };
    }
    category = normalised;
  }

  const displayLimit = Math.min(Math.max(limit, 1), 50);

  try {
    // Delegate to the single authoritative search implementation in the manager
    const searchResult = operatorDataManager.performDirectSearch(query, {
      category,
      subcategory,
      parameter_search,
      limit: 0 // Fetch all matches; we slice for display below
    });

    let allResults = searchResult.results || [];

    // Apply search type filtering on top of the base results
    if (searchType === "exact") {
      const queryLower = query.toLowerCase().trim();
      allResults = allResults.filter(result => {
        const op = result.entry || result;
        const name = (op.name || "").toLowerCase();
        const displayName = (op.displayName || "").toLowerCase();
        return name === queryLower ||
          displayName === queryLower ||
          name.includes(queryLower) ||
          displayName.includes(queryLower);
      });
    } else if (searchType === "tag") {
      const queryLower = query.toLowerCase().trim();
      allResults = allResults.filter(result => {
        const op = result.entry || result;
        const tags = (op.tags || []).map(t => t.toLowerCase());
        const keywords = (op.keywords || []).map(k => k.toLowerCase());
        return tags.some(t => t.includes(queryLower)) ||
          keywords.some(k => k.includes(queryLower));
      });
    }
    // "fuzzy" (default) uses all results from performDirectSearch as-is

    // Version filtering (optional)
    const canonicalVersion = version ? normalizeVersion(version) : null;
    if (canonicalVersion) {
      allResults = await filterByVersion(allResults, canonicalVersion);
    }

    const totalMatches = allResults.length;

    // Build category facets from full result set
    const categoryFacets = {};
    for (const result of allResults) {
      const cat = result.category;
      if (cat) {
        categoryFacets[cat] = (categoryFacets[cat] || 0) + 1;
      }
    }

    const displayResults = allResults.slice(0, displayLimit);

    // Format response
    let text = `# Search Results for "${query}"\n`;

    const filters = [];
    if (category) filters.push(`Category: ${category}`);
    if (subcategory) filters.push(`Subcategory: ${subcategory}`);
    if (searchType && searchType !== "fuzzy") filters.push(`Search type: ${searchType}`);
    if (parameter_search) filters.push('Parameter search enabled');
    if (canonicalVersion) filters.push(`TD Version: ${canonicalVersion}`);

    if (filters.length > 0) {
      text += `**Filters:** ${filters.join(' | ')}\n`;
    }
    text += '\n';

    if (totalMatches === 0) {
      text += `No operators found matching "${query}".\n\n`;
      text += `**Search Tips:**\n`;
      text += `- Try a broader search term\n`;
      text += `- Remove category/subcategory filters\n`;
      text += `- Enable parameter search (parameter_search: true)\n`;
      text += `- Check spelling; fuzzy matching tolerates 1-character typos\n`;
      text += `- Valid categories: ${VALID_CATEGORIES.join(', ')}\n`;
    } else {
      text += `Found **${totalMatches}** operator${totalMatches === 1 ? '' : 's'}`;
      if (displayResults.length < totalMatches) {
        text += ` (showing top ${displayResults.length})`;
      }
      text += `:\n\n`;

      for (let i = 0; i < displayResults.length; i++) {
        const result = displayResults[i];
        const operator = result.entry || result;
        const rank = i + 1;

        text += `## ${rank}. ${operator.displayName || operator.name}\n`;
        text += `**Category:** ${operator.category}`;
        if (operator.subcategory) {
          text += ` | **Subcategory:** ${operator.subcategory}`;
        }
        const relevance = result.relevanceScore ?? result.score ?? 0;
        text += ` | **Relevance:** ${Math.round(relevance)}\n\n`;

        const desc = operator.description || operator.summary || 'No description available.';
        const shortDesc = desc.length > 200 ? desc.substring(0, 200) + '...' : desc;
        text += `${shortDesc}\n\n`;

        if (show_details) {
          // Parameter count
          const params = operator.parameters;
          if (params && params.length > 0) {
            text += `**Parameters:** ${params.length} total\n`;
            if (parameter_search && result.matches) {
              const paramMatches = result.matches.filter(m => m.field === 'parameter');
              if (paramMatches.length > 0) {
                text += `Matching params: ${paramMatches.map(m => m.content).join(', ')}\n`;
              }
            }
            text += '\n';
          }

          // Keywords
          if (operator.keywords && operator.keywords.length > 0) {
            const kw = operator.keywords.slice(0, 5);
            text += `**Keywords:** ${kw.join(', ')}`;
            if (operator.keywords.length > 5) {
              text += ` and ${operator.keywords.length - 5} more`;
            }
            text += '\n\n';
          }

          // Tips matching query
          if (operator.tips && operator.tips.length > 0) {
            const queryLower = query.toLowerCase();
            const matchingTips = operator.tips
              .filter(tip => tip.toLowerCase().includes(queryLower))
              .slice(0, 2);
            if (matchingTips.length > 0) {
              text += `**Related Tips:**\n`;
              matchingTips.forEach(tip => {
                text += `- ${tip.substring(0, 150)}${tip.length > 150 ? '...' : ''}\n`;
              });
              text += '\n';
            }
          }

          // Match field summary
          if (result.matches && result.matches.length > 0) {
            const uniqueFields = [...new Set(result.matches.map(m => m.field))];
            text += `**Matches found in:** ${uniqueFields.join(', ')}\n`;
          }
        }

        text += '---\n\n';
      }

      if (totalMatches > displayLimit) {
        text += `*...and ${totalMatches - displayLimit} more results. Use limit parameter or add filters to narrow results.*\n\n`;
      }

      // Search statistics
      text += `## Search Statistics\n`;
      text += `- Total matches (totalResults): **${totalMatches}**\n`;
      text += `- Displayed: ${displayResults.length}\n`;
      text += `- Search type: ${searchType}\n`;

      if (Object.keys(categoryFacets).length > 0) {
        text += `- Results by category: `;
        text += Object.entries(categoryFacets)
          .sort((a, b) => b[1] - a[1])
          .map(([cat, count]) => `${cat} (${count})`)
          .join(', ');
        text += '\n';
      }
    }

    return {
      content: [{
        type: "text",
        text
      }],
      // Structured metadata for programmatic consumers
      _meta: {
        totalResults: totalMatches,
        displayed: displayResults.length,
        searchType,
        limit: displayLimit
      }
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
