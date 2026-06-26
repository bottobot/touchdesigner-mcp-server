#!/usr/bin/env node
/**
 * recount.js — canonical recounter + contamination scanner for the TD MCP data set.
 *
 * Prints ground-truth counts (by family, total, python distinct) and contamination
 * metrics. Used by every verification gate so docs/code never drift from the data.
 *
 * Usage: node scripts/recount.js [--json]
 */
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PROCESSED = join(ROOT, 'wiki', 'data', 'processed');
const PYTHON_API = join(ROOT, 'wiki', 'data', 'python-api');

const FAMILIES = ['chop', 'top', 'sop', 'dat', 'mat', 'comp', 'pop'];
// Legitimate short parameter names that are NOT fabrication (component/axis/color selectors).
const ALLOWED_SHORT = new Set(['x', 'y', 'z', 'w', 'u', 'v', 'r', 'g', 'b', 'a', 'p', 'n', 's', 't', 'cd']);
const TYPE_TOKENS = new Set(['float', 'int', 'string', 'point', 'vertex', 'primitive', 'detail',
  'inclusive', 'exclusive', 'srgb', 'default', 'menu', 'toggle', 'pulse', 'rgb', 'rgba', 'xyz']);
const TEMPLATE_DESC = /^Configure .+ for the operator\.?$/;
const TEMPLATE_MEMBER = /^[A-Za-z0-9_]+ member$/;

function isBadParamName(name) {
  if (typeof name !== 'string' || !name.trim()) return false;
  const n = name.trim();
  if (/^\d+$/.test(n)) return true;                       // pure number
  if (/^[A-Za-z]$/.test(n) && !ALLOWED_SHORT.has(n.toLowerCase())) return true; // single letter not allowlisted
  if (TYPE_TOKENS.has(n.toLowerCase())) return true;      // type/menu token
  return false;
}

async function listJson(dir) {
  const entries = await fs.readdir(dir);
  return entries.filter(f => f.toLowerCase().endsWith('.json'));
}

async function main() {
  const result = {
    processed: { total: 0, byFamily: {}, offPattern: [] },
    contamination: {
      filesWithTemplateDesc: 0, totalTemplateDesc: 0,
      filesWithBadParamNames: 0, totalBadParamNames: 0, badParamSamples: [],
      filesParamsUnverified: 0, emptyUrl: 0, missingUrlKey: 0,
    },
    python: { indexedClasses: 0, distinctClassNames: 0, duplicateClassNames: [],
      filesWithTemplateMembers: 0, filesWithDuplicateMembers: 0 },
  };

  // ---- processed operators ----
  const files = (await fs.readdir(PROCESSED)).filter(f => !f.startsWith('.'));
  for (const f of FAMILIES) result.processed.byFamily[f] = 0;
  for (const entry of files) {
    if (!entry.toLowerCase().endsWith('.json')) { result.processed.offPattern.push(entry); continue; }
    result.processed.total++;
    const m = entry.match(/_(chop|top|sop|dat|mat|comp|pop)\.json$/i);
    if (m) result.processed.byFamily[m[1].toLowerCase()]++;
    else result.processed.offPattern.push(entry);

    let j;
    try { j = JSON.parse(await fs.readFile(join(PROCESSED, entry), 'utf8')); }
    catch { result.contamination.invalidJson = (result.contamination.invalidJson || 0) + 1; continue; }

    if (!('url' in j)) result.contamination.missingUrlKey++;
    else if (!j.url) result.contamination.emptyUrl++;
    if (j.paramsVerified === false) result.contamination.filesParamsUnverified++;

    const params = Array.isArray(j.parameters) ? j.parameters : [];
    let fileTemplate = 0, fileBad = 0;
    for (const p of params) {
      if (p && TEMPLATE_DESC.test(p.description || '')) { fileTemplate++; result.contamination.totalTemplateDesc++; }
      if (p && isBadParamName(p.name)) {
        fileBad++; result.contamination.totalBadParamNames++;
        if (result.contamination.badParamSamples.length < 25)
          result.contamination.badParamSamples.push(`${entry}:${p.name}`);
      }
    }
    if (fileTemplate) result.contamination.filesWithTemplateDesc++;
    if (fileBad) result.contamination.filesWithBadParamNames++;
  }

  // ---- python-api classes ----
  const pyFiles = (await listJson(PYTHON_API)).filter(f => f.toLowerCase() !== 'index.json');
  const classNames = [];
  for (const entry of pyFiles) {
    let j;
    try { j = JSON.parse(await fs.readFile(join(PYTHON_API, entry), 'utf8')); } catch { continue; }
    if (j.className) classNames.push(j.className);
    const members = Array.isArray(j.members) ? j.members : [];
    const names = members.map(m => m && m.name).filter(Boolean);
    if (members.some(m => m && TEMPLATE_MEMBER.test(m.description || ''))) result.python.filesWithTemplateMembers++;
    if (new Set(names).size !== names.length) result.python.filesWithDuplicateMembers++;
  }
  // index.json may list more (incl OP/Op duplicate)
  try {
    const idx = JSON.parse(await fs.readFile(join(PYTHON_API, 'index.json'), 'utf8'));
    const idxClasses = idx.classes || (idx.stats ? null : null) || [];
    result.python.indexedClasses = Array.isArray(idxClasses) ? idxClasses.length : pyFiles.length;
  } catch { result.python.indexedClasses = pyFiles.length; }
  const distinct = new Set(classNames);
  result.python.distinctClassNames = distinct.size;
  const seen = new Set();
  for (const c of classNames) { if (seen.has(c)) result.python.duplicateClassNames.push(c); else seen.add(c); }

  const byFamSum = FAMILIES.reduce((s, f) => s + result.processed.byFamily[f], 0);
  result.processed.byFamilySum = byFamSum;

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('=== Processed operators ===');
    console.log(`total JSON: ${result.processed.total}  (by-family sum: ${byFamSum})`);
    console.log(FAMILIES.map(f => `${f.toUpperCase()} ${result.processed.byFamily[f]}`).join('  '));
    if (result.processed.offPattern.length) console.log(`off-pattern: ${result.processed.offPattern.join(', ')}`);
    console.log('=== Contamination ===');
    console.log(`template descriptions: ${result.contamination.totalTemplateDesc} in ${result.contamination.filesWithTemplateDesc} files`);
    console.log(`bad param names: ${result.contamination.totalBadParamNames} in ${result.contamination.filesWithBadParamNames} files`);
    console.log(`empty url: ${result.contamination.emptyUrl}, missing url key: ${result.contamination.missingUrlKey}, paramsUnverified: ${result.contamination.filesParamsUnverified}`);
    console.log('=== Python API ===');
    console.log(`indexed: ${result.python.indexedClasses}, distinct classNames: ${result.python.distinctClassNames}, dup classNames: ${result.python.duplicateClassNames.join(',') || 'none'}`);
    console.log(`files w/ templated members: ${result.python.filesWithTemplateMembers}, files w/ duplicate members: ${result.python.filesWithDuplicateMembers}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
