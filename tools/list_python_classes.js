// TD-MCP v2.7 - List Python Classes Tool
// Lists all Python API classes grouped by category with descriptions

import { z } from "zod";

// Tool schema
export const schema = {
  title: "List TouchDesigner Python Classes",
  description: "List all available TouchDesigner Python API classes, optionally filtered by category",
  inputSchema: {
    category: z.string().optional().describe("Filter by category (e.g., 'Operator', 'Component', 'General', 'UI')"),
    search: z.string().optional().describe("Search term to filter classes by name or description"),
    show_details: z.boolean().optional().describe("Show member/method counts for each class (default: false)")
  }
};

// Tool handler
export async function handler({ category, search, show_details = false }, { operatorDataManager }) {
  if (!operatorDataManager) {
    return {
      content: [{
        type: "text",
        text: "Wiki system not available. Server may still be initializing."
      }]
    };
  }

  try {
    const pythonClasses = operatorDataManager.getPythonClasses();

    if (!pythonClasses || pythonClasses.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No Python API classes available."
        }]
      };
    }

    let filteredClasses = [...pythonClasses];

    // Apply category filter
    if (category) {
      const catLower = category.toLowerCase();
      filteredClasses = filteredClasses.filter(c =>
        (c.category || '').toLowerCase().includes(catLower)
      );
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredClasses = filteredClasses.filter(c =>
        (c.className || '').toLowerCase().includes(searchLower) ||
        (c.displayName || '').toLowerCase().includes(searchLower) ||
        (c.description || '').toLowerCase().includes(searchLower)
      );
    }

    if (filteredClasses.length === 0) {
      let text = `No Python classes found`;
      if (category) text += ` in category "${category}"`;
      if (search) text += ` matching "${search}"`;
      text += `.\n\nTry 'list_python_classes' without filters to see all available classes.`;
      return {
        content: [{
          type: "text",
          text
        }]
      };
    }

    // Group by category
    const byCategory = {};
    for (const cls of filteredClasses) {
      const cat = cls.category || 'Uncategorized';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(cls);
    }

    // Sort categories and classes within each
    const sortedCategories = Object.keys(byCategory).sort();

    let text = `# TouchDesigner Python API Classes\n\n`;
    text += `**Total:** ${filteredClasses.length} classes`;
    if (category) text += ` (filtered by: ${category})`;
    if (search) text += ` (search: "${search}")`;
    text += `\n\n`;

    for (const cat of sortedCategories) {
      const classes = byCategory[cat].sort((a, b) =>
        (a.className || '').localeCompare(b.className || '')
      );

      text += `## ${cat} (${classes.length})\n\n`;

      for (const cls of classes) {
        text += `- **${cls.className}**`;

        if (show_details) {
          const memberCount = cls.members ? cls.members.length : 0;
          const methodCount = cls.methods ? cls.methods.length : 0;
          text += ` [${memberCount} members, ${methodCount} methods]`;
        }

        if (cls.description) {
          const shortDesc = cls.description.length > 120
            ? cls.description.substring(0, 120) + '...'
            : cls.description;
          text += `: ${shortDesc}`;
        }

        text += `\n`;
      }

      text += `\n`;
    }

    text += `---\n`;
    text += `*Use 'get_python_api' with a class name to view full documentation including members and methods.*\n`;
    text += `*Use 'search_python_api' to search across all class members and methods.*\n`;

    return {
      content: [{
        type: "text",
        text
      }]
    };

  } catch (error) {
    console.error('[List Python Classes] Error:', error);
    return {
      content: [{
        type: "text",
        text: `Error listing Python classes: ${error.message || 'Unknown error occurred'}`
      }]
    };
  }
}
