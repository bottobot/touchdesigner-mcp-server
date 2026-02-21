/**
 * list_experimental_builds.js — List TouchDesigner Experimental Build Series
 *
 * Lists recent experimental TouchDesigner build series grouped by feature area
 * (rendering, Python API, operators, UI, networking). Each entry shows the
 * series ID, build range, stability status, key features, and experimental
 * operators.
 *
 * @module tools/list_experimental_builds
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
  title: "List TouchDesigner Experimental Builds",
  description: [
    "Lists recent TouchDesigner experimental/beta build series grouped by feature area.",
    "Feature areas: rendering, Python API, operators, UI, networking.",
    "Each entry shows the series ID, build range, stability status, and headline features.",
    "Use get_experimental_build with a series_id for full details on any individual series."
  ].join(" "),
  inputSchema: {
    feature_area: z.string().optional().describe(
      "Filter series by feature area. One of: 'rendering', 'Python API', 'operators', 'UI', 'networking'. " +
      "Omit to list all series grouped by every feature area."
    ),
    stability_status: z.string().optional().describe(
      "Filter by stability status. One of: 'experimental' (active pre-release), 'graduated' (became a stable release). " +
      "Omit to include all statuses."
    ),
    show_feature_flags: z.boolean().optional().describe(
      "Include the feature flag table for each series (default: false)"
    ),
    show_operators: z.boolean().optional().describe(
      "Include the list of experimental operators for each series (default: true)"
    ),
    show_breaking_changes: z.boolean().optional().describe(
      "Include a brief summary of breaking changes per series (default: false)"
    )
  }
};

// ---------------------------------------------------------------------------
// Tool handler
// ---------------------------------------------------------------------------

export async function handler(
  {
    feature_area,
    stability_status,
    show_feature_flags = false,
    show_operators = true,
    show_breaking_changes = false
  },
  _context
) {
  try {
    const data = await loadExperimentalData();

    // Normalise feature_area filter
    const normalizedArea = feature_area ? feature_area.trim() : null;

    // Collect series to display
    let seriesToShow = data.buildSeries;

    // Apply stability_status filter
    if (stability_status) {
      const normalizedStatus = stability_status.trim().toLowerCase();
      seriesToShow = seriesToShow.filter(s => s.stabilityStatus === normalizedStatus);
      if (seriesToShow.length === 0) {
        return {
          content: [{
            type: "text",
            text: `No experimental build series found with stability status "${stability_status}".\n\n` +
                  `Valid values: experimental, graduated\n\n` +
                  `Use \`list_experimental_builds\` without the stability_status filter to see all series.`
          }]
        };
      }
    }

    // Apply feature_area filter
    if (normalizedArea) {
      // Check this area exists in the index
      const knownAreas = Object.keys(data.featureAreaIndex);
      const matchedArea = knownAreas.find(a => a.toLowerCase() === normalizedArea.toLowerCase());
      if (!matchedArea) {
        return {
          content: [{
            type: "text",
            text: `Feature area "${feature_area}" not recognised.\n\n` +
                  `Available feature areas: ${knownAreas.join(', ')}\n\n` +
                  `Use \`list_experimental_builds\` without feature_area to list all series.`
          }]
        };
      }
      const idsInArea = data.featureAreaIndex[matchedArea] || [];
      seriesToShow = seriesToShow.filter(s => idsInArea.includes(s.seriesId));
    }

    // Build response
    let text = `# TouchDesigner Experimental Build Series\n\n`;
    text += data.trackInfo.experimental + '\n\n';
    text += `**Download:** ${data.trackInfo.releaseURL}\n`;
    text += `**Release Notes:** ${data.trackInfo.changelogURL}\n\n`;

    // Current experimental callout
    const currentSeries = data.buildSeries.find(s => s.seriesId === data.currentExperimentalSeries);
    if (currentSeries && !normalizedArea && !stability_status) {
      text += `**Current Experimental Series:** ${currentSeries.label}\n`;
      text += `Build range: ${currentSeries.buildRange.min}+\n\n`;
    }

    // Summary table of matching series
    text += `## Summary (${seriesToShow.length} series${normalizedArea ? ` in "${normalizedArea}"` : ''})\n\n`;
    text += `| Series ID | Year | Build Range | Status | Feature Areas |\n`;
    text += `|-----------|------|-------------|--------|---------------|\n`;
    seriesToShow.forEach(s => {
      const buildMax = s.buildRange.max ? s.buildRange.max : 'current';
      const statusBadge = formatStatusBadge(s.stabilityStatus);
      text += `| ${s.seriesId} | ${s.releaseYear} | ${s.buildRange.min}–${buildMax} | ${statusBadge} | ${s.featureAreas.join(', ')} |\n`;
    });
    text += '\n';

    if (normalizedArea) {
      // Show series in this feature area detail
      text += `## Experimental Series with "${normalizedArea}" Changes\n\n`;
      seriesToShow.forEach(s => {
        text += renderSeriesBlock(s, show_feature_flags, show_operators, show_breaking_changes);
      });
    } else {
      // Group by feature area
      const featureAreas = Object.keys(data.featureAreaIndex);
      text += `## Series Grouped by Feature Area\n\n`;

      for (const area of featureAreas) {
        const idsInArea = data.featureAreaIndex[area] || [];
        const matchingSeries = seriesToShow.filter(s => idsInArea.includes(s.seriesId));
        if (matchingSeries.length === 0) continue;

        text += `### ${area}\n\n`;
        matchingSeries.forEach(s => {
          text += renderSeriesBlock(s, show_feature_flags, show_operators, show_breaking_changes);
        });
      }
    }

    // Footer
    text += `---\n`;
    text += `**Usage Tips:**\n`;
    text += `- Use \`get_experimental_build({ series_id: "2025.10000" })\` for full details on a specific series\n`;
    text += `- Use \`list_experimental_builds({ feature_area: "rendering" })\` to filter by area\n`;
    text += `- Use \`list_experimental_builds({ stability_status: "experimental" })\` to see only active pre-releases\n`;
    text += `- Use \`list_versions\` to see stable TouchDesigner releases\n`;

    return {
      content: [{
        type: "text",
        text
      }]
    };

  } catch (error) {
    console.error('[list_experimental_builds] Error:', error);
    return {
      content: [{
        type: "text",
        text: `Failed to list experimental builds: ${error.message}`
      }]
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Render a single series summary block for the list view.
 */
function renderSeriesBlock(series, showFlags, showOps, showBreaking) {
  const buildMax = series.buildRange.max ? series.buildRange.max : 'current';
  let block = `#### ${series.label}\n`;
  block += `- **Series ID:** \`${series.seriesId}\`\n`;
  block += `- **Build Range:** ${series.buildRange.min}–${buildMax}\n`;
  block += `- **Status:** ${formatStabilityStatus(series.stabilityStatus)}\n`;
  block += `- **Based On Stable:** TouchDesigner ${series.basedOnStable}\n`;

  // Top 3 features as a quick preview
  if (series.newFeatures && series.newFeatures.length > 0) {
    block += `- **Headline Features:**\n`;
    const preview = series.newFeatures.slice(0, 3);
    preview.forEach(f => {
      block += `  - ${f}\n`;
    });
    if (series.newFeatures.length > 3) {
      block += `  - *...and ${series.newFeatures.length - 3} more — use \`get_experimental_build\` for full list*\n`;
    }
  }

  // Feature flags table (optional)
  if (showFlags && series.featureFlags) {
    const enabledFlags = Object.entries(series.featureFlags)
      .filter(([, v]) => v)
      .map(([k]) => `\`${k}\``);
    if (enabledFlags.length > 0) {
      block += `- **Active Feature Flags:** ${enabledFlags.join(', ')}\n`;
    }
  }

  // Experimental operators (optional)
  if (showOps && series.experimentalOperators && series.experimentalOperators.length > 0) {
    block += `- **Experimental Operators:**\n`;
    series.experimentalOperators.forEach(op => {
      const statusShort = op.status === 'promoted_to_stable' ? '(graduated)' : '(experimental)';
      block += `  - **${op.name}** (${op.family}) ${statusShort} — ${op.description.substring(0, 80)}${op.description.length > 80 ? '…' : ''}\n`;
    });
  }

  // Breaking changes summary (optional)
  if (showBreaking && series.breakingChangesVsStable && series.breakingChangesVsStable.length > 0) {
    block += `- **Breaking Changes vs. TD ${series.basedOnStable} Stable:**\n`;
    series.breakingChangesVsStable.slice(0, 2).forEach(bc => {
      block += `  - ${bc.substring(0, 100)}${bc.length > 100 ? '…' : ''}\n`;
    });
    if (series.breakingChangesVsStable.length > 2) {
      block += `  - *...and ${series.breakingChangesVsStable.length - 2} more — use \`get_experimental_build\` for full list*\n`;
    }
  }

  block += '\n';
  return block;
}

function formatStabilityStatus(status) {
  const map = {
    experimental: 'Active Experimental',
    graduated: 'Graduated to Stable',
    deprecated: 'Deprecated'
  };
  return map[status] || status;
}

function formatStatusBadge(status) {
  const map = {
    experimental: 'Active',
    graduated: 'Graduated',
    deprecated: 'Deprecated'
  };
  return map[status] || status;
}
