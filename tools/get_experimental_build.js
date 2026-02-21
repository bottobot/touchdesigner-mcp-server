/**
 * get_experimental_build.js — Get TouchDesigner Experimental Build Information
 *
 * Returns detailed information about a specific experimental TD build series
 * or the latest experimental build series. Includes new features, breaking
 * changes versus the stable baseline, and Python API additions introduced
 * in that experimental track.
 *
 * @module tools/get_experimental_build
 */

import { z } from "zod";
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EXPERIMENTAL_BUILDS_PATH = join(
  __dirname, '..', 'wiki', 'data', 'versions', 'experimental-builds.json'
);

// Module-level cache
let _experimentalData = null;

async function loadExperimentalData() {
  if (_experimentalData) return _experimentalData;
  const raw = await fs.readFile(EXPERIMENTAL_BUILDS_PATH, 'utf-8');
  _experimentalData = JSON.parse(raw);
  return _experimentalData;
}

// ---------------------------------------------------------------------------
// Tool schema
// ---------------------------------------------------------------------------

export const schema = {
  title: "Get TouchDesigner Experimental Build Info",
  description: [
    "Returns information about a TouchDesigner experimental/beta build series.",
    "Experimental builds are pre-release tracks that contain new features not yet available in stable releases.",
    "You can request a specific series ID (e.g. '2025.10000') or omit the parameter to get the latest experimental series.",
    "Response includes: new features, experimental operators, breaking changes versus the stable baseline, and Python API additions."
  ].join(" "),
  inputSchema: {
    series_id: z.string().optional().describe(
      "Experimental build series ID to look up (e.g. '2025.10000', '2024.50000'). " +
      "Omit to get the latest (current) experimental series. " +
      "Use list_experimental_builds to see all available series IDs."
    ),
    show_features: z.boolean().optional().describe(
      "Include the list of new features for this build series (default: true)"
    ),
    show_breaking_changes: z.boolean().optional().describe(
      "Include breaking changes versus the stable baseline (default: true)"
    ),
    show_python_api: z.boolean().optional().describe(
      "Include Python API additions introduced in this experimental series (default: true)"
    ),
    show_operators: z.boolean().optional().describe(
      "Include experimental or newly promoted operators (default: true)"
    )
  }
};

// ---------------------------------------------------------------------------
// Tool handler
// ---------------------------------------------------------------------------

export async function handler(
  {
    series_id,
    show_features = true,
    show_breaking_changes = true,
    show_python_api = true,
    show_operators = true
  },
  _context
) {
  try {
    const data = await loadExperimentalData();

    // Resolve which series to return
    let series;
    if (series_id) {
      series = data.buildSeries.find(s => s.seriesId === series_id);
      if (!series) {
        // Try a partial / case-insensitive match
        const lower = series_id.toLowerCase();
        series = data.buildSeries.find(s =>
          s.seriesId.toLowerCase().includes(lower) ||
          s.label.toLowerCase().includes(lower)
        );
      }
      if (!series) {
        const availableIds = data.buildSeries.map(s => s.seriesId).join(', ');
        return {
          content: [{
            type: "text",
            text: `Experimental build series "${series_id}" not found.\n\n` +
                  `Available series IDs: ${availableIds}\n\n` +
                  `Use \`list_experimental_builds\` to browse all series with descriptions.`
          }]
        };
      }
    } else {
      // Return latest (current) experimental series
      series = data.buildSeries.find(s => s.seriesId === data.currentExperimentalSeries);
      if (!series) {
        // Fall back to first in list (newest)
        series = data.buildSeries[0];
      }
    }

    // Build response text
    let text = `# ${series.label}\n\n`;

    // Status banner
    const statusEmoji = series.stabilityStatus === 'experimental' ? '[EXPERIMENTAL]' : '[GRADUATED TO STABLE]';
    text += `**Status:** ${statusEmoji} ${formatStabilityStatus(series.stabilityStatus)}\n`;
    text += `**Series ID:** ${series.seriesId}\n`;
    text += `**Based On Stable:** TouchDesigner ${series.basedOnStable}\n`;
    text += `**Release Year:** ${series.releaseYear}\n`;
    text += `**Build Range:** ${series.buildRange.min}–${series.buildRange.max ?? 'current'}\n`;
    text += `**Feature Areas:** ${series.featureAreas.join(', ')}\n\n`;

    if (series.stabilityNotes) {
      text += `**Stability Notes:** ${series.stabilityNotes}\n\n`;
    }

    // Feature flags summary
    if (series.featureFlags && Object.keys(series.featureFlags).length > 0) {
      text += `## Feature Flags\n\n`;
      text += `| Flag | Enabled |\n`;
      text += `|------|---------|\n`;
      for (const [flag, enabled] of Object.entries(series.featureFlags)) {
        text += `| \`${flag}\` | ${enabled ? 'Yes' : 'No'} |\n`;
      }
      text += '\n';
    }

    // New features
    if (show_features && series.newFeatures && series.newFeatures.length > 0) {
      text += `## New Features in This Experimental Series\n\n`;
      series.newFeatures.forEach(f => {
        text += `- ${f}\n`;
      });
      text += '\n';
    }

    // Experimental / newly promoted operators
    if (show_operators && series.experimentalOperators && series.experimentalOperators.length > 0) {
      text += `## Experimental Operators\n\n`;
      series.experimentalOperators.forEach(op => {
        const statusLabel = formatOperatorStatus(op.status);
        text += `### ${op.name} (${op.family})\n`;
        text += `- **Status:** ${statusLabel}\n`;
        text += `- **Description:** ${op.description}\n`;
        if (op.notes) {
          text += `- **Notes:** ${op.notes}\n`;
        }
        text += '\n';
      });
    }

    // Breaking changes
    if (show_breaking_changes) {
      if (series.breakingChangesVsStable && series.breakingChangesVsStable.length > 0) {
        text += `## Breaking Changes vs. TouchDesigner ${series.basedOnStable} Stable\n\n`;
        text += `> These changes may require code updates when migrating from TD ${series.basedOnStable} stable to this experimental build.\n\n`;
        series.breakingChangesVsStable.forEach(bc => {
          text += `- ${bc}\n`;
        });
        text += '\n';
      } else {
        text += `## Breaking Changes vs. Stable\n\nNo breaking changes documented for this experimental series.\n\n`;
      }
    }

    // Python API additions
    if (show_python_api && series.pythonApiAdditions && series.pythonApiAdditions.length > 0) {
      text += `## Python API Additions\n\n`;
      text += `The following new classes, methods, and members were added in this experimental series:\n\n`;
      text += `| Class | Name | Type | Build | Description |\n`;
      text += `|-------|------|------|-------|-------------|\n`;
      series.pythonApiAdditions.forEach(a => {
        const desc = a.description.length > 80
          ? a.description.substring(0, 80) + '…'
          : a.description;
        text += `| \`${a.class}\` | \`${a.member || a.method}\` | ${a.type} | ${a.addedInBuild} | ${desc} |\n`;
      });
      text += '\n';

      // Full descriptions
      text += `### Python API — Full Descriptions\n\n`;
      series.pythonApiAdditions.forEach(a => {
        const memberOrMethod = a.member || a.method;
        text += `**\`${a.class}.${memberOrMethod}\`** (${a.type}, added in build ${a.addedInBuild})\n`;
        text += `${a.description}\n\n`;
      });
    }

    // Footer
    text += `---\n`;
    text += `*Use \`list_experimental_builds\` to see all experimental build series. `;
    text += `Use \`get_version_info\` for information about stable TD releases.*`;

    return {
      content: [{
        type: "text",
        text
      }]
    };

  } catch (error) {
    console.error('[get_experimental_build] Error:', error);
    return {
      content: [{
        type: "text",
        text: `Failed to retrieve experimental build information: ${error.message}`
      }]
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatStabilityStatus(status) {
  const map = {
    experimental: 'Active experimental series — not recommended for production use',
    graduated: 'This series graduated to a stable release',
    deprecated: 'Deprecated experimental series — superseded by a newer track'
  };
  return map[status] || status;
}

function formatOperatorStatus(status) {
  const map = {
    new_experimental: 'New in this experimental series — API may change',
    promoted_to_stable: 'Promoted to stable in the corresponding release',
    deprecated_experimental: 'Deprecated — will not be included in stable release'
  };
  return map[status] || status;
}
