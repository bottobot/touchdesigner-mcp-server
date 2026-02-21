/**
 * Search Experimental Techniques Tool
 * Full-text search across all experimental technique categories.
 * Searches names, descriptions, tags, code snippets, and notes.
 * v2.9.0: Initial implementation
 * @module tools/search_experimental
 */

import { z } from "zod";
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EXPERIMENTAL_DIR = join(__dirname, '..', 'wiki', 'data', 'experimental');

const CATEGORY_FILES = [
  { key: 'glsl',               file: 'glsl.json' },
  { key: 'gpu-compute',        file: 'gpu-compute.json' },
  { key: 'machine-learning',   file: 'machine-learning.json' },
  { key: 'generative-systems', file: 'generative-systems.json' },
  { key: 'audio-visual',       file: 'audio-visual.json' },
  { key: 'networking',         file: 'networking.json' },
  { key: 'python-advanced',    file: 'python-advanced.json' }
];

// Load all category data
async function loadAllCategories() {
  const categories = [];
  for (const { key, file } of CATEGORY_FILES) {
    try {
      const raw = await fs.readFile(join(EXPERIMENTAL_DIR, file), 'utf-8');
      const data = JSON.parse(raw);
      categories.push({ key, data });
    } catch (err) {
      console.error(`[search_experimental] Failed to load ${file}:`, err.message);
    }
  }
  return categories;
}

// Score a text string against search terms, returning hit count
function scoreText(text, terms) {
  if (!text || typeof text !== 'string') return 0;
  const lower = text.toLowerCase();
  let score = 0;
  for (const term of terms) {
    let idx = 0;
    while ((idx = lower.indexOf(term, idx)) !== -1) {
      score++;
      idx++;
    }
  }
  return score;
}

// Score a technique against the query terms and return scored result or null
function scoreTechnique(tech, categoryKey, categoryDisplayName, terms) {
  let score = 0;
  const matchedFields = [];

  // Name (highest weight x5)
  const nameScore = scoreText(tech.name, terms) * 5;
  if (nameScore > 0) { score += nameScore; matchedFields.push('name'); }

  // Description (x3)
  const descScore = scoreText(tech.description, terms) * 3;
  if (descScore > 0) { score += descScore; matchedFields.push('description'); }

  // Tags (x4)
  if (tech.tags && tech.tags.length > 0) {
    const tagStr = tech.tags.join(' ');
    const tagScore = scoreText(tagStr, terms) * 4;
    if (tagScore > 0) { score += tagScore; matchedFields.push('tags'); }
  }

  // Notes (x2)
  const notesScore = scoreText(tech.notes, terms) * 2;
  if (notesScore > 0) { score += notesScore; matchedFields.push('notes'); }

  // Subcategory (x3)
  const subcatScore = scoreText(tech.subcategory, terms) * 3;
  if (subcatScore > 0) { score += subcatScore; matchedFields.push('subcategory'); }

  // Operators (x2)
  if (tech.operators && tech.operators.length > 0) {
    const opStr = tech.operators.join(' ');
    const opScore = scoreText(opStr, terms) * 2;
    if (opScore > 0) { score += opScore; matchedFields.push('operators'); }
  }

  // Code snippet (x1)
  if (tech.code && tech.code.snippet) {
    const codeScore = scoreText(tech.code.snippet, terms);
    if (codeScore > 0) { score += codeScore; matchedFields.push('code'); }
  }

  // Version requirement (x1)
  if (tech.requiresVersion) {
    const verScore = scoreText(tech.requiresVersion, terms);
    if (verScore > 0) { score += verScore; matchedFields.push('version'); }
  }

  if (score === 0) return null;

  return {
    technique: tech,
    categoryKey,
    categoryDisplayName,
    score,
    matchedFields
  };
}

// Format a search result entry (compact)
function formatResult(result, index, showCode) {
  const tech = result.technique;
  let text = `## ${index}. ${tech.name}\n`;
  text += `**Category:** ${result.categoryDisplayName} (\`${result.categoryKey}\`)`;
  if (tech.subcategory) text += ` | **Subcategory:** ${tech.subcategory}`;
  text += '\n';
  text += `**Relevance:** ${result.score} | **Matched in:** ${result.matchedFields.join(', ')}\n\n`;

  if (tech.description) {
    const shortDesc = tech.description.length > 250
      ? tech.description.substring(0, 250) + '...'
      : tech.description;
    text += `${shortDesc}\n\n`;
  }

  const meta = [];
  if (tech.difficulty) meta.push(`Difficulty: ${tech.difficulty}`);
  if (tech.requiresVersion) meta.push(`Requires: TD ${tech.requiresVersion}`);
  if (meta.length) text += `*${meta.join(' | ')}*\n\n`;

  if (tech.operators && tech.operators.length > 0) {
    text += `**Operators:** ${tech.operators.join(', ')}\n`;
  }
  if (tech.tags && tech.tags.length > 0) {
    text += `**Tags:** ${tech.tags.slice(0, 8).join(', ')}\n`;
  }
  if (tech.notes) {
    const shortNote = tech.notes.length > 150 ? tech.notes.substring(0, 150) + '...' : tech.notes;
    text += `\n> ${shortNote}\n`;
  }

  if (showCode && tech.code && tech.code.snippet) {
    const snippet = tech.code.snippet;
    // Show only first 20 lines of snippet for search results
    const lines = snippet.split('\n');
    const preview = lines.slice(0, 20).join('\n');
    const truncated = lines.length > 20 ? preview + '\n// ... (truncated)' : preview;
    text += `\n**Code preview (${tech.code.filename || tech.code.language || ''}):**\n`;
    text += `\`\`\`${tech.code.language || 'text'}\n${truncated}\n\`\`\`\n`;
  }

  text += `\n*Fetch full details: \`get_experimental_techniques\` with category=\`${result.categoryKey}\` and technique_id=\`${tech.id}\`*\n`;
  return text + '\n---\n\n';
}

// Tool schema
export const schema = {
  title: "Search Experimental Techniques",
  description: "Search across all TouchDesigner experimental technique categories. Finds techniques by keyword, operator name, tag, or code pattern across GLSL, GPU compute, machine learning, generative systems, audio-visual, networking, and advanced Python.",
  inputSchema: {
    query: z.string().describe(
      "Search query. Examples: 'raymarching', 'reaction diffusion', 'OSC receive', 'numpy image', 'beat detection', 'ONNX', 'Replicator COMP', 'granular synthesis'"
    ),
    category_filter: z.string().optional().describe(
      "Optional: restrict search to a single category. Options: glsl, gpu-compute, machine-learning, generative-systems, audio-visual, networking, python-advanced"
    ),
    show_code: z.boolean().optional().describe("Include code snippet previews in results (default: false for brevity)"),
    limit: z.number().optional().describe("Maximum number of results to return (default: 10, max: 30)")
  }
};

// Tool handler
export async function handler({ query, category_filter, show_code = false, limit = 10 }) {
  if (!query || query.trim().length === 0) {
    return {
      content: [{
        type: "text",
        text: "Please provide a search query.\n\nExample queries: 'raymarching', 'OSC', 'numpy', 'beat detection', 'ONNX', 'reaction diffusion', 'granular'"
      }]
    };
  }

  const terms = query.toLowerCase().trim().split(/\s+/).filter(t => t.length > 1);
  if (terms.length === 0) {
    return {
      content: [{
        type: "text",
        text: "Search query too short. Please use terms with at least 2 characters."
      }]
    };
  }

  const cappedLimit = Math.min(Math.max(1, limit), 30);

  // Load categories (optionally filtered)
  let categoriesToSearch = CATEGORY_FILES;
  if (category_filter) {
    const filterLower = category_filter.toLowerCase().trim();
    categoriesToSearch = CATEGORY_FILES.filter(c =>
      c.key === filterLower ||
      c.key.includes(filterLower) ||
      filterLower.includes(c.key.split('-')[0])
    );
    if (categoriesToSearch.length === 0) {
      return {
        content: [{
          type: "text",
          text: `Category filter '${category_filter}' did not match any categories.\n\n` +
                `Valid categories: ${CATEGORY_FILES.map(c => c.key).join(', ')}`
        }]
      };
    }
  }

  // Load all relevant categories
  const allCategories = [];
  for (const { key, file } of categoriesToSearch) {
    try {
      const raw = await fs.readFile(join(EXPERIMENTAL_DIR, file), 'utf-8');
      const data = JSON.parse(raw);
      allCategories.push({ key, data });
    } catch (err) {
      console.error(`[search_experimental] Failed to load ${file}:`, err.message);
    }
  }

  if (allCategories.length === 0) {
    return {
      content: [{
        type: "text",
        text: "No experimental technique data could be loaded. Please check server configuration."
      }]
    };
  }

  // Score all techniques
  const results = [];
  for (const { key, data } of allCategories) {
    const displayName = data.displayName || key;
    for (const tech of (data.techniques || [])) {
      const result = scoreTechnique(tech, key, displayName, terms);
      if (result) results.push(result);
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  const topResults = results.slice(0, cappedLimit);

  if (topResults.length === 0) {
    let text = `# No Results for "${query}"\n\n`;
    if (category_filter) text += `Category filter: ${category_filter}\n\n`;
    text += `No experimental techniques matched your query.\n\n`;
    text += `**Suggestions:**\n`;
    text += `- Try broader terms (e.g. 'shader' instead of 'raymarching SDF sphere')\n`;
    text += `- Use operator names (e.g. 'GLSL TOP', 'OSC In CHOP')\n`;
    text += `- Use \`get_experimental_techniques\` with a category to browse all techniques\n`;
    text += `\n**Available categories:** ${CATEGORY_FILES.map(c => c.key).join(', ')}\n`;
    return { content: [{ type: "text", text }] };
  }

  // Build category summary for the header
  const categoryCounts = {};
  results.forEach(r => {
    categoryCounts[r.categoryKey] = (categoryCounts[r.categoryKey] || 0) + 1;
  });
  const categoryBreakdown = Object.entries(categoryCounts)
    .map(([k, n]) => `${k} (${n})`)
    .join(', ');

  let text = `# Experimental Techniques Search: "${query}"\n\n`;
  text += `Found **${results.length}** matching technique${results.length !== 1 ? 's' : ''} across `;
  text += `${Object.keys(categoryCounts).length} categor${Object.keys(categoryCounts).length !== 1 ? 'ies' : 'y'}`;
  if (category_filter) text += ` (filtered to: ${category_filter})`;
  text += `.\n`;
  text += `Showing top **${topResults.length}**: ${categoryBreakdown}\n\n`;

  topResults.forEach((result, index) => {
    text += formatResult(result, index + 1, show_code);
  });

  if (results.length > cappedLimit) {
    text += `*${results.length - cappedLimit} additional results not shown. Increase \`limit\` or narrow your query.*\n`;
  }

  text += `\n*Use \`get_experimental_techniques\` to browse a full category.*\n`;
  text += `*Use \`get_glsl_pattern\` for specific GLSL shader code.*\n`;

  return { content: [{ type: "text", text }] };
}
