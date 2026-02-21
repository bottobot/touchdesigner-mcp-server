/**
 * list_versions.js — List All Supported TouchDesigner Versions
 *
 * Returns a formatted list of all TD versions known to the MCP server,
 * including Python version, support status, and key feature highlights
 * for each release.
 *
 * @module tools/list_versions
 */

import { z } from "zod";
import {
  loadManifest,
  loadReleaseHighlights
} from "../wiki/utils/version-filter.js";

// Tool schema
export const schema = {
  title: "List TouchDesigner Versions",
  description: "List all supported TouchDesigner versions with Python versions, support status, and key feature highlights for each release.",
  inputSchema: {
    show_highlights: z.boolean().optional().describe(
      "Include key feature highlights for each version (default: true)"
    ),
    show_python_info: z.boolean().optional().describe(
      "Include Python version details for each release (default: true)"
    ),
    filter_status: z.string().optional().describe(
      "Filter by support status: 'current', 'active', 'maintenance', 'legacy'. Omit to show all."
    )
  }
};

// Tool handler
export async function handler(
  { show_highlights = true, show_python_info = true, filter_status },
  _context
) {
  try {
    const [manifest, highlightsData] = await Promise.all([
      loadManifest(),
      loadReleaseHighlights()
    ]);

    // Apply optional status filter
    let versions = manifest.versions;
    if (filter_status) {
      const normalizedStatus = filter_status.trim().toLowerCase();
      versions = versions.filter(v => v.supportStatus === normalizedStatus);

      if (versions.length === 0) {
        return {
          content: [{
            type: "text",
            text: `No versions found with support status "${filter_status}".\n\n` +
                  `Valid statuses: current, active, maintenance, legacy\n\n` +
                  `Use list_versions() without filter_status to see all versions.`
          }]
        };
      }
    }

    let text = `# TouchDesigner Versions — Supported Releases\n\n`;
    text += `The TD-MCP server has compatibility data for **${manifest.versions.length} TouchDesigner versions**`;
    if (filter_status) {
      text += ` (filtered to status: ${filter_status})`;
    }
    text += `.\n\n`;

    // Current stable callout
    const currentVersion = manifest.versions.find(v => v.id === manifest.currentStable);
    if (currentVersion && !filter_status) {
      text += `**Current Stable Release:** ${currentVersion.label} (Python ${currentVersion.pythonVersion})\n\n`;
    }

    // Summary table
    text += `## Quick Reference\n\n`;
    text += `| Version | Year | Python | Status |\n`;
    text += `|---------|------|--------|--------|\n`;
    for (const v of versions) {
      const statusBadge = formatStatusBadge(v.supportStatus);
      text += `| ${v.label} | ${v.releaseYear} | Python ${v.pythonMajorMinor} | ${statusBadge} |\n`;
    }
    text += '\n';

    // Detailed entries (reverse order — newest first)
    const orderedVersions = [...versions].reverse();

    text += `## Detailed Version Information\n\n`;

    for (const v of orderedVersions) {
      const release = highlightsData.releases[v.id];
      const isCurrent = v.id === manifest.currentStable;

      text += `### ${v.label}${isCurrent ? ' (Current)' : ''}\n`;

      // Core info
      if (show_python_info) {
        text += `- **Python:** ${v.pythonVersion}\n`;
      }
      text += `- **Released:** ${v.releaseYear}\n`;
      text += `- **Support:** ${formatSupportStatus(v.supportStatus)}\n`;

      if (v.notes) {
        text += `- **Notes:** ${v.notes}\n`;
      }

      // Release theme
      if (release && release.theme) {
        text += `- **Theme:** ${release.theme}\n`;
      }

      // Key highlights (top 5)
      if (show_highlights && release && release.highlights && release.highlights.length > 0) {
        text += `\n**Key Highlights:**\n`;
        const topHighlights = release.highlights.slice(0, 5);
        topHighlights.forEach(h => {
          text += `  - ${h}\n`;
        });
        if (release.highlights.length > 5) {
          text += `  - *...and ${release.highlights.length - 5} more — use \`get_version_info\` for full details*\n`;
        }
      }

      // New operators callout
      if (show_highlights && release && release.newOperators && release.newOperators.length > 0) {
        text += `\n**New Operators:** ${release.newOperators.join(', ')}\n`;
      }

      text += '\n';
    }

    // Python version transition summary
    if (show_python_info && !filter_status) {
      text += `## Python Version Timeline\n\n`;
      const pythonMap = manifest.pythonVersionMap;
      const transitions = [];
      let lastPy = null;
      for (const id of manifest.versionOrder) {
        const py = pythonMap[id];
        const v = manifest.versions.find(ver => ver.id === id);
        if (py !== lastPy) {
          transitions.push({ version: v ? v.label : id, python: py });
          lastPy = py;
        }
      }
      transitions.forEach(t => {
        text += `- **${t.version}** — Upgraded to Python ${t.python}\n`;
      });
      text += '\n';
    }

    // Usage guidance
    text += `---\n`;
    text += `**Usage Tips:**\n`;
    text += `- Use \`get_version_info({ version: "2023" })\` for full details on a specific version\n`;
    text += `- Use \`get_operator\` or \`search_operators\` with a \`version\` parameter to filter by compatibility\n`;
    text += `- Use \`search_python_api\` or \`get_python_api\` with a \`version\` parameter to filter Python API docs\n`;

    return {
      content: [{
        type: "text",
        text
      }]
    };

  } catch (error) {
    console.error('[list_versions] Error:', error);
    return {
      content: [{
        type: "text",
        text: `Failed to list TouchDesigner versions: ${error.message}`
      }]
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSupportStatus(status) {
  const statusMap = {
    legacy: 'Legacy',
    maintenance: 'Maintenance',
    active: 'Active',
    current: 'Current'
  };
  return statusMap[status] || status;
}

function formatStatusBadge(status) {
  const badgeMap = {
    legacy: 'Legacy',
    maintenance: 'Maintenance',
    active: 'Active',
    current: 'Current (Stable)'
  };
  return badgeMap[status] || status;
}
