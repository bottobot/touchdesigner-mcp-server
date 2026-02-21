/**
 * version-filter.js — TouchDesigner Version Compatibility Utilities
 *
 * Provides functions for checking operator and API compatibility against
 * specific TouchDesigner versions using the version manifest and compatibility
 * data stored under wiki/data/versions/.
 *
 * Functions exported:
 *   isCompatible(operatorId, version)         — true/false compatibility check
 *   filterByVersion(operators, version)       — filter an array of operators
 *   getVersionIndex(version)                  — numeric index for comparison
 *   getVersionInfo(version)                   — full version object from manifest
 *   normalizeVersion(version)                 — canonicalise a version string
 *   isExperimentalVersion(version)            — returns true for experimental build strings
 *   normalizeExperimentalVersion(version)     — canonicalise an experimental series ID
 *   getExperimentalBuildInfo(seriesId)        — full experimental series object
 *   loadExperimentalBuilds()                  — load and cache experimental-builds.json
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the versions data directory
const VERSIONS_DIR = join(__dirname, '..', 'data', 'versions');

// Module-level cache so we only read files once per process lifetime
let _manifest = null;
let _operatorCompat = null;
let _pythonApiCompat = null;
let _releaseHighlights = null;
let _experimentalBuilds = null;

// ---------------------------------------------------------------------------
// Data loaders (lazy, cached)
// ---------------------------------------------------------------------------

/**
 * Load and cache the version manifest JSON.
 * @returns {Promise<Object>}
 */
async function loadManifest() {
  if (_manifest) return _manifest;
  const raw = await fs.readFile(join(VERSIONS_DIR, 'version-manifest.json'), 'utf-8');
  _manifest = JSON.parse(raw);
  return _manifest;
}

/**
 * Load and cache the operator compatibility JSON.
 * @returns {Promise<Object>}
 */
async function loadOperatorCompat() {
  if (_operatorCompat) return _operatorCompat;
  const raw = await fs.readFile(join(VERSIONS_DIR, 'operator-compatibility.json'), 'utf-8');
  _operatorCompat = JSON.parse(raw);
  return _operatorCompat;
}

/**
 * Load and cache the Python API compatibility JSON.
 * @returns {Promise<Object>}
 */
async function loadPythonApiCompat() {
  if (_pythonApiCompat) return _pythonApiCompat;
  const raw = await fs.readFile(join(VERSIONS_DIR, 'python-api-compatibility.json'), 'utf-8');
  _pythonApiCompat = JSON.parse(raw);
  return _pythonApiCompat;
}

/**
 * Load and cache the release highlights JSON.
 * @returns {Promise<Object>}
 */
async function loadReleaseHighlights() {
  if (_releaseHighlights) return _releaseHighlights;
  const raw = await fs.readFile(join(VERSIONS_DIR, 'release-highlights.json'), 'utf-8');
  _releaseHighlights = JSON.parse(raw);
  return _releaseHighlights;
}

/**
 * Load and cache the experimental builds JSON.
 * @returns {Promise<Object>}
 */
async function loadExperimentalBuilds() {
  if (_experimentalBuilds) return _experimentalBuilds;
  const raw = await fs.readFile(join(VERSIONS_DIR, 'experimental-builds.json'), 'utf-8');
  _experimentalBuilds = JSON.parse(raw);
  return _experimentalBuilds;
}

// ---------------------------------------------------------------------------
// Version normalisation
// ---------------------------------------------------------------------------

/**
 * Normalise a caller-supplied version string to the canonical ID used in the
 * manifest (one of: "099", "2019", "2020", "2021", "2022", "2023", "2024").
 *
 * Also accepts experimental build series IDs (e.g. "2025.10000", "2024.50000")
 * and returns them unchanged so callers can pass either stable or experimental
 * version strings without special-casing.
 *
 * Accepted input formats:
 *   "099", "99", "2019", "2020", "2021", "2022", "2023", "2024"
 *   "TouchDesigner 2023", "TD2022", "td 2021"
 *   Numbers: 2022, 2023, 99
 *   Experimental: "2025.10000", "2024.50000", "experimental", "latest-experimental"
 *
 * @param {string|number} version
 * @returns {string|null} Canonical version ID, or null if unrecognised
 */
function normalizeVersion(version) {
  if (version === null || version === undefined) return null;

  let v = String(version).trim().toLowerCase();

  // Strip common prefixes
  v = v.replace(/^touch\s*designer\s*/i, '');
  v = v.replace(/^td\s*/i, '');
  v = v.trim();

  // Handle "099" / "99" special case
  if (v === '099' || v === '99') return '099';

  // Detect experimental series ID pattern: YYYY.NNNNN (e.g. "2025.10000")
  if (/^\d{4}\.\d{4,6}$/.test(v)) {
    // Preserve original casing/format for experimental IDs
    return String(version).trim();
  }

  // Handle "experimental" / "latest-experimental" shortcuts — resolved at runtime
  if (v === 'experimental' || v === 'latest-experimental' || v === 'latest_experimental') {
    return 'experimental';
  }

  // For 4-digit years
  const yearMatch = v.match(/^(\d{4})/);
  if (yearMatch) {
    const year = yearMatch[1];
    if (['2019', '2020', '2021', '2022', '2023', '2024'].includes(year)) {
      return year;
    }
    // If year is 2025 or later without a dot-build suffix, treat as experimental shorthand
    const yearInt = parseInt(year, 10);
    if (yearInt >= 2025) {
      return String(version).trim();
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Experimental build support
// ---------------------------------------------------------------------------

/**
 * Return true if a (normalised or raw) version string identifies an
 * experimental build series rather than a stable release.
 *
 * Experimental version string formats:
 *   "2025.10000"  — full series ID
 *   "experimental" / "latest-experimental" — dynamic aliases
 *   Any year >= 2025 without a dot-build is also treated as experimental.
 *
 * @param {string|number} version
 * @returns {boolean}
 */
function isExperimentalVersion(version) {
  if (version === null || version === undefined) return false;
  const v = String(version).trim().toLowerCase();
  if (v === 'experimental' || v === 'latest-experimental' || v === 'latest_experimental') {
    return true;
  }
  // YYYY.NNNNN pattern
  if (/^\d{4}\.\d{4,6}$/.test(v)) return true;
  // Year >= 2025 without a dot
  const yearMatch = v.match(/^(\d{4})$/);
  if (yearMatch && parseInt(yearMatch[1], 10) >= 2025) return true;
  return false;
}

/**
 * Normalise an experimental version string to a canonical series ID.
 *
 * - If passed a full series ID like "2025.10000", returns it unchanged.
 * - If passed "experimental" or "latest-experimental", resolves to the
 *   currentExperimentalSeries field from experimental-builds.json.
 * - Returns null if the input is not an experimental version string.
 *
 * @param {string|number} version
 * @returns {Promise<string|null>} Series ID, or null
 */
async function normalizeExperimentalVersion(version) {
  if (!isExperimentalVersion(version)) return null;

  const v = String(version).trim().toLowerCase();

  // Dynamic alias — resolve to current series
  if (v === 'experimental' || v === 'latest-experimental' || v === 'latest_experimental') {
    const data = await loadExperimentalBuilds();
    return data.currentExperimentalSeries || null;
  }

  // Full series ID (YYYY.NNNNN) — return as-is (preserve original case)
  return String(version).trim();
}

/**
 * Return the full experimental build series object for a given series ID,
 * or null if the series is not found.
 *
 * Accepts:
 *   - Full series ID: "2025.10000"
 *   - Dynamic aliases: "experimental", "latest-experimental"
 *
 * @param {string} seriesId
 * @returns {Promise<Object|null>}
 */
async function getExperimentalBuildInfo(seriesId) {
  const data = await loadExperimentalBuilds();
  const resolved = await normalizeExperimentalVersion(seriesId);
  if (!resolved) return null;
  return data.buildSeries.find(s => s.seriesId === resolved) || null;
}

// ---------------------------------------------------------------------------
// Core exported functions
// ---------------------------------------------------------------------------

/**
 * Return the zero-based index of a version in the canonical ordering, which
 * can be used for "greater-than / less-than" comparisons.
 *
 * Version order: 099 (0), 2019 (1), 2020 (2), 2021 (3), 2022 (4), 2023 (5), 2024 (6)
 *
 * @param {string|number} version — Any accepted version format
 * @returns {Promise<number>} Index (0-based), or -1 if version is not found
 */
async function getVersionIndex(version) {
  const manifest = await loadManifest();
  const id = normalizeVersion(version);
  if (!id) return -1;
  const idx = manifest.versionOrder.indexOf(id);
  return idx;
}

/**
 * Return the full version object from the manifest for a given version, or
 * null if the version is not recognised.
 *
 * @param {string|number} version
 * @returns {Promise<Object|null>}
 */
async function getVersionInfo(version) {
  const manifest = await loadManifest();
  const id = normalizeVersion(version);
  if (!id) return null;
  return manifest.versions.find(v => v.id === id) || null;
}

/**
 * Check whether an operator (identified by its file-system id, e.g.
 * "noise_chop") is available in a specific TouchDesigner version.
 *
 * If the operator is not listed in the compatibility database the function
 * conservatively returns `true` (assume it exists unless stated otherwise).
 *
 * @param {string} operatorId — Snake-case operator id (e.g. "noise_chop", "ndi_in_top")
 * @param {string|number} version — Any accepted version format
 * @returns {Promise<boolean>}
 */
async function isCompatible(operatorId, version) {
  if (!operatorId || !version) return true;

  const compat = await loadOperatorCompat();
  const targetIndex = await getVersionIndex(version);

  if (targetIndex === -1) {
    // Unknown version — do not filter
    return true;
  }

  const normalizedId = operatorId.toLowerCase().replace(/[\s-]/g, '_');
  const entry = compat.operators[normalizedId];

  if (!entry) {
    // Not in compatibility DB — conservatively allow
    return true;
  }

  // Check if removed before target version
  if (entry.removedIn) {
    const removedIndex = await getVersionIndex(entry.removedIn);
    if (removedIndex !== -1 && targetIndex >= removedIndex) {
      return false;
    }
  }

  // Check if added after target version
  if (entry.addedIn) {
    const addedIndex = await getVersionIndex(entry.addedIn);
    if (addedIndex !== -1 && targetIndex < addedIndex) {
      return false;
    }
  }

  return true;
}

/**
 * Filter an array of operator objects (or search result objects) to only those
 * compatible with the given TouchDesigner version.
 *
 * Each element should have at least one of:
 *   - element.id         (file-system id like "noise_chop")
 *   - element.name       (display name like "Noise CHOP")
 *   - element.entry.id   (for search result wrappers)
 *
 * Operators not found in the compatibility database pass through unchanged
 * (conservative inclusion).
 *
 * @param {Array<Object>} operators — Array of operator objects or search results
 * @param {string|number} version   — Target TD version
 * @returns {Promise<Array<Object>>} Filtered array
 */
async function filterByVersion(operators, version) {
  if (!version || !Array.isArray(operators) || operators.length === 0) {
    return operators;
  }

  const compat = await loadOperatorCompat();
  const targetIndex = await getVersionIndex(version);

  if (targetIndex === -1) {
    // Unrecognised version — return all
    return operators;
  }

  const results = [];

  for (const item of operators) {
    // Resolve operator id from various shapes of input object
    const entry = item.entry || item;
    let opId = entry.id || entry.operatorId || '';

    // Derive an id from the display name if needed (e.g. "Noise CHOP" -> "noise_chop")
    if (!opId && entry.name) {
      opId = entry.name.toLowerCase().replace(/[\s-]/g, '_');
    }

    if (!opId) {
      // Can't determine identity — include conservatively
      results.push(item);
      continue;
    }

    const normalizedId = opId.toLowerCase().replace(/[\s-]/g, '_');
    const record = compat.operators[normalizedId];

    if (!record) {
      results.push(item);
      continue;
    }

    // Check removedIn
    if (record.removedIn) {
      const removedIdx = await getVersionIndex(record.removedIn);
      if (removedIdx !== -1 && targetIndex >= removedIdx) {
        continue; // Removed — skip
      }
    }

    // Check addedIn
    if (record.addedIn) {
      const addedIdx = await getVersionIndex(record.addedIn);
      if (addedIdx !== -1 && targetIndex < addedIdx) {
        continue; // Not yet introduced — skip
      }
    }

    results.push(item);
  }

  return results;
}

/**
 * Return compatibility information for a single operator entry including
 * the version it was added, any changedIn records, and whether it has been
 * removed.
 *
 * @param {string} operatorId
 * @returns {Promise<Object|null>} Compatibility record, or null if not found
 */
async function getOperatorCompatInfo(operatorId) {
  if (!operatorId) return null;
  const compat = await loadOperatorCompat();
  const normalizedId = operatorId.toLowerCase().replace(/[\s-]/g, '_');
  return compat.operators[normalizedId] || null;
}

/**
 * Return Python API compatibility data for a given class and optionally a
 * specific method or member.
 *
 * @param {string} className  — e.g. "CHOP", "OP", "App"
 * @param {string} [memberName] — method or member name (optional)
 * @returns {Promise<Object|null>}
 */
async function getPythonCompatInfo(className, memberName) {
  if (!className) return null;
  const data = await loadPythonApiCompat();
  const classEntry = data.classes[className];
  if (!classEntry) return null;

  if (!memberName) return classEntry;

  const inMethods = classEntry.methods && classEntry.methods[memberName];
  if (inMethods) return { type: 'method', ...inMethods };

  const inMembers = classEntry.members && classEntry.members[memberName];
  if (inMembers) return { type: 'member', ...inMembers };

  return null;
}

/**
 * Return the full manifest, all operator compat, python compat, and highlights
 * as a single combined object. Useful for tools that need everything.
 *
 * @returns {Promise<Object>}
 */
async function loadAllVersionData() {
  const [manifest, operatorCompat, pythonApiCompat, releaseHighlights] = await Promise.all([
    loadManifest(),
    loadOperatorCompat(),
    loadPythonApiCompat(),
    loadReleaseHighlights()
  ]);
  return { manifest, operatorCompat, pythonApiCompat, releaseHighlights };
}

export {
  normalizeVersion,
  getVersionIndex,
  getVersionInfo,
  isCompatible,
  filterByVersion,
  getOperatorCompatInfo,
  getPythonCompatInfo,
  loadManifest,
  loadOperatorCompat,
  loadPythonApiCompat,
  loadReleaseHighlights,
  loadAllVersionData,
  // Experimental build support
  isExperimentalVersion,
  normalizeExperimentalVersion,
  getExperimentalBuildInfo,
  loadExperimentalBuilds
};
