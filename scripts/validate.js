#!/usr/bin/env node
/**
 * validate.js — Tier 8 harness + per-critical regression matrix.
 * Boots the real data manager, exercises all 21 tool handlers with realistic params,
 * and asserts the specific fixes from AUDIT_REPORT.md (C1-C15). Exits non-zero on any failure.
 */
import { join } from 'path';
import { promises as fs } from 'fs';
import OperatorDataManager from '../wiki/operator-data-manager.js';

const d = join(process.cwd());
let pass = 0, fail = 0;
const fails = [];
function check(name, cond) { if (cond) { pass++; } else { fail++; fails.push(name); } }

const m = new OperatorDataManager({
  wikiPath: join(d, 'wiki'), dataPath: join(d, 'wiki', 'data'),
  processedPath: join(d, 'wiki', 'data', 'processed'),
  searchIndexPath: join(d, 'wiki', 'data', 'search-index'),
  enablePersistence: true, tdDocsPath: join(d, 'wiki', 'docs', 'python'),
});
await m.initialize();

// Load workflow patterns like index.js does
let workflowPatterns = { patterns: [], common_transitions: {} };
try { workflowPatterns = JSON.parse(await fs.readFile(join(d, 'data', 'patterns.json'), 'utf8')); } catch { /* ignore */ }

// Dynamic-import every tool module
const T = {};
for (const t of ['get_operator', 'search_operators', 'suggest_workflow', 'list_operators',
  'get_tutorial', 'list_tutorials', 'get_python_api', 'search_python_api', 'search_tutorials',
  'get_operator_examples', 'list_python_classes', 'compare_operators', 'get_version_info',
  'list_versions', 'get_experimental_techniques', 'search_experimental', 'get_glsl_pattern',
  'get_operator_connections', 'get_network_template', 'get_experimental_build', 'list_experimental_builds']) {
  T[t] = await import(`../tools/${t}.js`);
}

// Per-tool realistic fixtures (avoids cross-tool param contamination).
const P = {
  get_operator: { name: 'Noise CHOP' },
  search_operators: { query: 'noise' },
  suggest_workflow: { goal: 'audio reactive visuals', operator: 'Movie File In TOP' },
  list_operators: { category: 'TOP' },
  get_tutorial: { name: 'Write a GLSL TOP' },
  list_tutorials: {},
  get_python_api: { class_name: 'CHOP' },
  search_python_api: { query: 'cook' },
  search_tutorials: { query: 'glsl' },
  get_operator_examples: { name: 'Noise CHOP' },
  list_python_classes: {},
  compare_operators: { operators: ['Noise CHOP', 'Feedback TOP'], operator1: 'Noise CHOP', operator2: 'Feedback TOP' },
  get_version_info: { version: '2025' },
  list_versions: {},
  get_experimental_techniques: { category: 'glsl' },
  search_experimental: { query: 'shader' },
  get_glsl_pattern: { pattern: 'raymarching', name: 'raymarching' },
  get_operator_connections: { operator_name: 'Feedback TOP' },
  get_network_template: { template: 'video-player', use_case: 'video-player' },
  get_experimental_build: { series_id: '2025.30000' },
  list_experimental_builds: {},
};
const ctxOps = { operatorDataManager: m };
const ctxWf = { operatorDataManager: m, workflowPatterns };
const ctxEmpty = {};
const ctxFor = {
  get_operator: ctxOps, search_operators: ctxOps, suggest_workflow: ctxWf, list_operators: ctxOps,
  get_tutorial: ctxOps, list_tutorials: ctxOps, get_python_api: ctxOps, search_python_api: ctxOps,
  search_tutorials: ctxOps, get_operator_examples: ctxOps, list_python_classes: ctxOps,
  compare_operators: ctxOps, get_version_info: ctxEmpty, list_versions: ctxEmpty,
  get_experimental_techniques: undefined, search_experimental: undefined, get_glsl_pattern: undefined,
  get_operator_connections: ctxEmpty, get_network_template: ctxEmpty, get_experimental_build: ctxEmpty,
  list_experimental_builds: ctxEmpty,
};

// F.5 — every handler returns valid MCP shape without throwing
const out = {};
for (const [name, mod] of Object.entries(T)) {
  try {
    const ctx = ctxFor[name];
    const params = P[name] || {};
    const r = ctx === undefined ? await mod.handler(params) : await mod.handler(params, ctx);
    const ok = r && Array.isArray(r.content) && r.content[0] && r.content[0].type === 'text' && typeof r.content[0].text === 'string';
    check(`shape:${name}`, ok);
    out[name] = ok ? r.content[0].text : '';
  } catch (e) {
    check(`shape:${name}`, false);
    fails[fails.length - 1] = `shape:${name} THREW ${e.message}`;
    out[name] = '';
  }
}

// --- Per-critical regression matrix ---
const stats = m.getSystemStats();
check('C2: banner count 661', stats.totalEntries === 661);                               // C2 stats bug
check('C6: get_python_api shows Returns', /\*\*Returns:\*\*/.test(out.get_python_api));   // C6 returns bug
check('C6b: list_python_classes >= 200', /\b2\d\d\b/.test(out.list_python_classes));       // OP dedupe + class expansion
check('C8: version 2025 -> Python 3.11.10', /3\.11\.10/.test(out.get_version_info));      // 2025 stable
check('C8b: list_versions mentions 2025', /2025/.test(out.list_versions));
check('C11: experimental build 2025.30000 + POP', /2025\.30/.test(out.get_experimental_build) && /POP/i.test(out.get_experimental_build));

// version data file assertions (C7, C11)
const manifest = JSON.parse(await fs.readFile(join(d, 'wiki/data/versions/version-manifest.json'), 'utf8'));
check('C7: currentStable=2025', manifest.currentStable === '2025');
check('C7b: no phantom 2024 version', !manifest.versions.some(v => v.id === '2024'));
const expb = JSON.parse(await fs.readFile(join(d, 'wiki/data/versions/experimental-builds.json'), 'utf8'));
check('C11b: currentExperimentalSeries 2025.30000', String(expb.currentExperimentalSeries).startsWith('2025.30'));

// C4/C5 POP params (accumulate_pop re-scraped, no flattened menu values)
const accum = JSON.parse(await fs.readFile(join(d, 'wiki/data/processed/accumulate_pop.json'), 'utf8'));
const accumNames = accum.parameters.map(p => (p.parName || p.name || '').toLowerCase());
check('C4: accumulate_pop has no flattened menu params', !accumNames.includes('point') && !accumNames.includes('float') && !accumNames.includes('1'));
check('C5: accumulate_pop paramsVerified', accum.paramsVerified === true);

// C14 GLSL output declarations
const glsl = JSON.parse(await fs.readFile(join(d, 'wiki/data/experimental/glsl.json'), 'utf8'));
const glslStr = JSON.stringify(glsl);
const declaresFrag = (glslStr.match(/out vec4 fragColor/g) || []).length;
check('C14: GLSL snippets declare fragColor output', declaresFrag > 0 && declaresFrag >= 5);

console.log(`\nVALIDATION: ${pass} passed, ${fail} failed`);
if (fail) { console.log('FAILURES:\n  ' + fails.join('\n  ')); process.exit(1); }
console.log('ALL CHECKS PASSED');
