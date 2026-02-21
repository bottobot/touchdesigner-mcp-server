/**
 * get_version_info.js — Get TouchDesigner Version Information
 *
 * Returns detailed information about a specific TouchDesigner version:
 * version metadata, bundled Python version, new operators, key features,
 * and Python API highlights.
 *
 * @module tools/get_version_info
 */

import { z } from "zod";
import {
  normalizeVersion,
  getVersionInfo,
  loadReleaseHighlights,
  loadOperatorCompat,
  loadPythonApiCompat
} from "../wiki/utils/version-filter.js";

// Tool schema
export const schema = {
  title: "Get TouchDesigner Version Info",
  description: "Get detailed information about a specific TouchDesigner version including Python version, new operators, key features, and API changes.",
  inputSchema: {
    version: z.string().describe(
      "TouchDesigner version to look up (e.g. '2023', '2022', '2021', '2020', '2019', '099')"
    ),
    show_new_operators: z.boolean().optional().describe(
      "Include list of operators added in this version (default: true)"
    ),
    show_python_highlights: z.boolean().optional().describe(
      "Include Python API changes for this version (default: true)"
    ),
    show_breaking_changes: z.boolean().optional().describe(
      "Include breaking changes and migration notes (default: true)"
    )
  }
};

// Tool handler
export async function handler(
  {
    version,
    show_new_operators = true,
    show_python_highlights = true,
    show_breaking_changes = true
  },
  _context
) {
  if (!version) {
    return {
      content: [{
        type: "text",
        text: "Please provide a TouchDesigner version. Supported versions: 099, 2019, 2020, 2021, 2022, 2023, 2024"
      }]
    };
  }

  try {
    const canonicalId = normalizeVersion(version);

    if (!canonicalId) {
      return {
        content: [{
          type: "text",
          text: `Unrecognised version "${version}".\n\n` +
                `Supported TouchDesigner versions: 099, 2019, 2020, 2021, 2022, 2023, 2024\n\n` +
                `Examples: get_version_info({ version: "2023" }) or get_version_info({ version: "2022" })`
        }]
      };
    }

    // Load version data
    const [versionInfo, highlights, operatorCompat, pythonApiCompat] = await Promise.all([
      getVersionInfo(canonicalId),
      loadReleaseHighlights(),
      loadOperatorCompat(),
      loadPythonApiCompat()
    ]);

    if (!versionInfo) {
      return {
        content: [{
          type: "text",
          text: `Version data not found for "${version}". This is likely a data issue — please report it.`
        }]
      };
    }

    const release = highlights.releases[canonicalId];

    let text = `# TouchDesigner ${versionInfo.label}\n\n`;

    // Core metadata block
    text += `## Version Details\n`;
    text += `- **Version ID:** ${versionInfo.id}\n`;
    text += `- **Release Year:** ${versionInfo.releaseYear}\n`;
    text += `- **Support Status:** ${formatSupportStatus(versionInfo.supportStatus)}\n`;
    text += `- **Python Version:** ${versionInfo.pythonVersion} (Python ${versionInfo.pythonMajorMinor})\n`;
    if (versionInfo.buildRange) {
      const maxBuild = versionInfo.buildRange.max ? versionInfo.buildRange.max : 'current';
      text += `- **Build Range:** ${versionInfo.buildRange.min} – ${maxBuild}\n`;
    }
    if (versionInfo.notes) {
      text += `- **Notes:** ${versionInfo.notes}\n`;
    }
    text += '\n';

    if (release) {
      // Theme / overview
      if (release.theme) {
        text += `## Theme\n${release.theme}\n\n`;
      }

      // Key highlights
      if (release.highlights && release.highlights.length > 0) {
        text += `## Key Features & Highlights\n`;
        release.highlights.forEach(h => {
          text += `- ${h}\n`;
        });
        text += '\n';
      }

      // New operators introduced in this version
      if (show_new_operators) {
        const newOps = getNewOperatorsInVersion(canonicalId, operatorCompat);
        if (newOps.length > 0) {
          text += `## New Operators in This Version\n`;
          newOps.forEach(op => {
            text += `- **${op.name}** (${op.category})`;
            if (op.notes) text += ` — ${op.notes}`;
            text += '\n';
          });
          text += '\n';
        } else if (release.newOperators && release.newOperators.length > 0) {
          // Fall back to highlights data
          text += `## New Operators in This Version\n`;
          release.newOperators.forEach(op => {
            text += `- ${op}\n`;
          });
          text += '\n';
        }
      }

      // Python highlights
      if (show_python_highlights && release.pythonHighlights && release.pythonHighlights.length > 0) {
        text += `## Python ${versionInfo.pythonMajorMinor} Highlights\n`;
        release.pythonHighlights.forEach(ph => {
          text += `- ${ph}\n`;
        });
        text += '\n';

        // Find Python API additions for this version
        const apiAdditions = getPythonApiAdditionsForVersion(canonicalId, pythonApiCompat);
        if (apiAdditions.length > 0) {
          text += `## Python API Additions in This Version\n`;
          apiAdditions.slice(0, 15).forEach(a => {
            text += `- **${a.class}.${a.name}** (${a.type})`;
            if (a.description) text += ` — ${a.description.substring(0, 100)}${a.description.length > 100 ? '...' : ''}`;
            text += '\n';
          });
          if (apiAdditions.length > 15) {
            text += `- *...and ${apiAdditions.length - 15} more additions*\n`;
          }
          text += '\n';
        }
      }

      // Breaking changes
      if (show_breaking_changes && release.breakingChanges && release.breakingChanges.length > 0) {
        text += `## Breaking Changes & Migration Notes\n`;
        release.breakingChanges.forEach(bc => {
          text += `- ${bc}\n`;
        });
        text += '\n';
      } else if (show_breaking_changes) {
        text += `## Breaking Changes\nNo breaking changes documented for this version.\n\n`;
      }
    } else {
      text += `*Detailed release highlights not available for this version.*\n\n`;
    }

    // Operator changes in this version (changedIn records)
    const operatorChanges = getOperatorChangesInVersion(canonicalId, operatorCompat);
    if (operatorChanges.length > 0) {
      text += `## Operator Changes in This Version\n`;
      operatorChanges.slice(0, 20).forEach(c => {
        text += `- **${c.name}**: ${c.change}\n`;
      });
      if (operatorChanges.length > 20) {
        text += `- *...and ${operatorChanges.length - 20} more changes*\n`;
      }
      text += '\n';
    }

    // Footer
    text += `---\n`;
    text += `*Use \`list_versions\` to see all supported TD versions. `;
    text += `Use \`get_operator\` with the version parameter to check operator availability.*\n`;

    return {
      content: [{
        type: "text",
        text
      }]
    };

  } catch (error) {
    console.error('[get_version_info] Error:', error);
    return {
      content: [{
        type: "text",
        text: `Failed to retrieve version information: ${error.message}`
      }]
    };
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function formatSupportStatus(status) {
  const statusMap = {
    legacy: 'Legacy (no longer supported)',
    maintenance: 'Maintenance (security fixes only)',
    active: 'Active support',
    current: 'Current stable release'
  };
  return statusMap[status] || status;
}

/**
 * Scan the operator compatibility data for operators whose `addedIn` matches
 * the given version.
 */
function getNewOperatorsInVersion(versionId, operatorCompat) {
  const results = [];
  for (const [, record] of Object.entries(operatorCompat.operators)) {
    if (record.addedIn === versionId) {
      results.push({
        name: record.name,
        category: record.category,
        notes: record.notes || null
      });
    }
  }
  return results.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

/**
 * Scan the operator compatibility data for operators that changed in this version.
 */
function getOperatorChangesInVersion(versionId, operatorCompat) {
  const results = [];
  for (const [, record] of Object.entries(operatorCompat.operators)) {
    if (record.changedIn && Array.isArray(record.changedIn)) {
      const change = record.changedIn.find(c => c.version === versionId);
      if (change) {
        results.push({ name: record.name, change: change.change });
      }
    }
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Scan the Python API compatibility data for methods/members added in this version.
 */
function getPythonApiAdditionsForVersion(versionId, pythonApiCompat) {
  const results = [];
  for (const [className, classEntry] of Object.entries(pythonApiCompat.classes)) {
    if (classEntry.methods) {
      for (const [methodName, method] of Object.entries(classEntry.methods)) {
        if (method.addedIn === versionId) {
          results.push({
            class: className,
            name: methodName,
            type: 'method',
            description: method.description || ''
          });
        }
      }
    }
    if (classEntry.members) {
      for (const [memberName, member] of Object.entries(classEntry.members)) {
        if (member.addedIn === versionId) {
          results.push({
            class: className,
            name: memberName,
            type: 'member',
            description: member.description || ''
          });
        }
      }
    }
  }
  return results.sort((a, b) => a.class.localeCompare(b.class) || a.name.localeCompare(b.name));
}
