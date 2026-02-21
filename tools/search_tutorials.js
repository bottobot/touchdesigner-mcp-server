// TD-MCP v2.7 - Search Tutorials Tool
// Searches through tutorial content by keyword/topic with relevance ranking

import { z } from "zod";

// Tool schema
export const schema = {
  title: "Search TouchDesigner Tutorials",
  description: "Search through TouchDesigner tutorials by keyword, topic, or content",
  inputSchema: {
    query: z.string().describe("Search query (e.g., 'GLSL', 'Python scripting', 'CHOP channels')"),
    search_content: z.boolean().optional().describe("Search within tutorial section content, not just metadata (default: true)"),
    limit: z.number().optional().describe("Maximum number of results to return (default: 10)")
  }
};

// Tool handler
export async function handler({ query, search_content = true, limit = 10 }, { operatorDataManager }) {
  if (!operatorDataManager) {
    return {
      content: [{
        type: "text",
        text: "Wiki system not available. Server may still be initializing."
      }]
    };
  }

  try {
    const searchTerms = query.toLowerCase().split(/\s+/);
    const results = [];

    // Get all tutorials
    const { tutorials } = await operatorDataManager.listTutorials({});
    if (!tutorials || tutorials.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No tutorials available to search."
        }]
      };
    }

    for (const tutorial of tutorials) {
      let score = 0;
      const matches = [];

      // Search in name (highest priority)
      const nameLower = (tutorial.name || tutorial.displayName || '').toLowerCase();
      for (const term of searchTerms) {
        if (nameLower.includes(term)) {
          score += 100;
          if (!matches.includes('name')) matches.push('name');
        }
      }

      // Search in description
      const descLower = (tutorial.description || '').toLowerCase();
      for (const term of searchTerms) {
        if (descLower.includes(term)) {
          score += 50;
          if (!matches.includes('description')) matches.push('description');
        }
      }

      // Search in category
      const catLower = (tutorial.category || '').toLowerCase();
      for (const term of searchTerms) {
        if (catLower.includes(term)) {
          score += 40;
          if (!matches.includes('category')) matches.push('category');
        }
      }

      // Search in keywords
      if (tutorial.keywords && tutorial.keywords.length > 0) {
        for (const keyword of tutorial.keywords) {
          const keywordLower = keyword.toLowerCase();
          for (const term of searchTerms) {
            if (keywordLower.includes(term)) {
              score += 30;
              if (!matches.includes('keywords')) matches.push('keywords');
            }
          }
        }
      }

      // Search in summary
      const summaryLower = (tutorial.summary || '').toLowerCase();
      for (const term of searchTerms) {
        if (summaryLower.includes(term)) {
          score += 25;
          if (!matches.includes('summary')) matches.push('summary');
        }
      }

      // Deep content search if enabled
      if (search_content && score === 0) {
        // Fetch full tutorial for content search
        const fullTutorial = await operatorDataManager.getTutorial(tutorial.name || tutorial.displayName);
        if (fullTutorial && fullTutorial.content && fullTutorial.content.sections) {
          for (const section of fullTutorial.content.sections) {
            const titleLower = (section.title || '').toLowerCase();
            for (const term of searchTerms) {
              if (titleLower.includes(term)) {
                score += 20;
                if (!matches.includes('section title')) matches.push('section title');
              }
            }

            if (section.content) {
              for (const item of section.content) {
                const textLower = (item.text || '').toLowerCase();
                for (const term of searchTerms) {
                  if (textLower.includes(term)) {
                    score += 10;
                    if (!matches.includes('content')) matches.push('content');
                    break; // Only count once per content item
                  }
                }
              }
            }
          }
        }
      }

      if (score > 0) {
        results.push({ tutorial, score, matches });
      }
    }

    // Sort by relevance score
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, limit);

    if (topResults.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No tutorials found matching "${query}".\n\n**Tips:**\n` +
            `- Try broader search terms\n` +
            `- Use 'list_tutorials' to see all available tutorials\n` +
            `- Try searching for related concepts\n`
        }]
      };
    }

    let text = `# Tutorial Search Results for "${query}"\n\n`;
    text += `Found **${results.length}** matching tutorial${results.length !== 1 ? 's' : ''} (showing top ${topResults.length}):\n\n`;

    topResults.forEach((result, index) => {
      const t = result.tutorial;
      text += `## ${index + 1}. ${t.name || t.displayName}\n`;

      if (t.category) {
        text += `**Category:** ${t.category}\n`;
      }

      if (t.description) {
        const shortDesc = t.description.length > 200
          ? t.description.substring(0, 200) + '...'
          : t.description;
        text += `**Description:** ${shortDesc}\n`;
      }

      text += `**Relevance:** ${Math.round(result.score)} | **Matched in:** ${result.matches.join(', ')}\n`;

      if (t.keywords && t.keywords.length > 0) {
        text += `**Keywords:** ${t.keywords.slice(0, 8).join(', ')}\n`;
      }

      text += '\n---\n\n';
    });

    text += `*Use 'get_tutorial' with the tutorial name to view full content.*\n`;

    return {
      content: [{
        type: "text",
        text
      }]
    };

  } catch (error) {
    console.error('[Search Tutorials] Error:', error);
    return {
      content: [{
        type: "text",
        text: `Search error: ${error.message || 'Unknown error occurred'}`
      }]
    };
  }
}
