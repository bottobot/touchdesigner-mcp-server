#!/usr/bin/env node
/**
 * fix-operators.js — Batch C (WP4.1 + WP4.3 + WP4.4), deterministic and non-destructive.
 *  - URL backfill: set url = https://docs.derivative.ca/<Title> (bare; NO "Experimental" prefix —
 *    verified that docs.derivative.ca/Accumulate_POP = 200 while Experimental:Accumulate_POP = 404).
 *    Title comes from sourceFile (exact) when present, else from the operator name.
 *  - Schema normalize: ensure the rich-schema keys exist (empty defaults) so all files are uniform.
 *  - Blank template parameter descriptions ("Configure X for the operator" -> "").  No param NAMES
 *    are ever deleted (many short names like Point/Pulse/X/Y/Z are legitimate; the real POP param
 *    fabrication is fixed by re-scrape in Batch D). Files with template descriptions are flagged
 *    paramsVerified:false so the re-scrape / output layer can treat them as provisional.
 */
import { promises as fs } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '..', 'wiki', 'data', 'processed');
const TEMPLATE_DESC = /^Configure .+ for the operator\.?$/;

const RICH_KEYS = {
  url: '', summary: '', tips: [], warnings: [], relatedOperators: [],
  commonInputs: [], commonOutputs: [], workflowPatterns: [],
  keywords: [], tags: [], pythonExamples: [], codeExamples: [],
};

function titleFromSourceFile(sf) {
  if (!sf || typeof sf !== 'string') return null;
  let t = basename(sf).replace(/\.html?$/i, '').replace(/\.htm$/i, '');
  t = t.replace(/^Experimental[-:]/i, '');          // namespace prefix -> bare title
  return t || null;
}
function titleFromName(name) {
  if (!name || typeof name !== 'string') return null;
  let t = name.trim().replace(/^Experimental[-:]\s*/i, '').replace(/\s+/g, '_');
  return t || null;
}

async function main() {
  const report = { files: 0, urlsSet: 0, urlsAlready: 0, urlsUnresolved: 0,
    keysAdded: 0, descsBlanked: 0, filesFlaggedUnverified: 0 };
  const files = (await fs.readdir(DIR)).filter(f => f.endsWith('.json'));
  for (const f of files) {
    const p = join(DIR, f);
    const j = JSON.parse(await fs.readFile(p, 'utf8'));
    report.files++;
    let touched = false;

    // --- URL backfill ---
    if (!j.url || typeof j.url !== 'string' || !/^https?:\/\//.test(j.url)) {
      const title = titleFromSourceFile(j.sourceFile) || titleFromName(j.name);
      if (title) { j.url = 'https://docs.derivative.ca/' + title; report.urlsSet++; touched = true; }
      else { report.urlsUnresolved++; }
    } else {
      // normalize any stray Experimental prefix in an existing url
      const fixed = j.url.replace(/(https?:\/\/docs\.derivative\.ca\/)Experimental[-:]/i, '$1');
      if (fixed !== j.url) { j.url = fixed; touched = true; }
      report.urlsAlready++;
    }

    // --- schema normalize (add missing keys only) ---
    for (const [k, def] of Object.entries(RICH_KEYS)) {
      if (!(k in j)) { j[k] = Array.isArray(def) ? [] : def; report.keysAdded++; touched = true; }
    }

    // --- blank template parameter descriptions; flag file ---
    let hadTemplate = false;
    if (Array.isArray(j.parameters)) {
      for (const param of j.parameters) {
        if (param && TEMPLATE_DESC.test(param.description || '')) {
          param.description = '';
          report.descsBlanked++; hadTemplate = true; touched = true;
        }
      }
    }
    if (hadTemplate && j.paramsVerified !== false) {
      j.paramsVerified = false; report.filesFlaggedUnverified++; touched = true;
    }

    if (touched) await fs.writeFile(p, JSON.stringify(j, null, 2) + '\n');
  }
  console.log(JSON.stringify(report, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
