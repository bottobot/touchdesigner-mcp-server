#!/usr/bin/env node
/**
 * fix-python-api.js — WP2.2 + WP2.4
 *  - index.json: remove the duplicate "Op" class entry (canonical is "OP"); fix stats count.
 *  - each class file: blank templated "<name> member" descriptions (verify-or-omit; they carry
 *    no real information), and de-duplicate artifact duplicate member names (a Python class
 *    cannot have two members of the same name — duplicates are scrape artifacts).
 */
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '..', 'wiki', 'data', 'python-api');

function isTemplatedMemberDesc(name, desc) {
  if (typeof desc !== 'string') return false;
  return desc.trim() === `${name} member` || /^[A-Za-z0-9_]+ member$/.test(desc.trim());
}

async function main() {
  const report = { indexOpRemoved: false, distinctClasses: 0, filesTouched: 0,
    descsBlanked: 0, dupMembersRemoved: 0 };

  // --- index.json: drop "Op", keep "OP" ---
  const indexPath = join(DIR, 'index.json');
  const index = JSON.parse(await fs.readFile(indexPath, 'utf8'));
  if (Array.isArray(index.classes)) {
    const seen = new Set();
    const cleaned = [];
    for (const c of index.classes) {
      const name = typeof c === 'string' ? c : c.className;
      const key = name.toLowerCase();
      if (seen.has(key)) {                     // case-insensitive duplicate (OP/Op)
        if (name === 'Op') report.indexOpRemoved = true;
        continue;
      }
      seen.add(key);
      cleaned.push(c);
    }
    index.classes = cleaned;
    report.distinctClasses = cleaned.length;
    if (index.stats) index.stats.totalClasses = cleaned.length;
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2) + '\n');
  }

  // --- each class file: blank templated descriptions, dedupe duplicate members ---
  const files = (await fs.readdir(DIR)).filter(f => f.endsWith('.json') && f.toLowerCase() !== 'index.json');
  for (const f of files) {
    const p = join(DIR, f);
    const j = JSON.parse(await fs.readFile(p, 'utf8'));
    let touched = false;

    for (const coll of ['members', 'methods']) {
      if (!Array.isArray(j[coll])) continue;
      // dedupe by name (keep first occurrence)
      const seen = new Set();
      const deduped = [];
      for (const item of j[coll]) {
        if (!item || !item.name) { deduped.push(item); continue; }
        if (seen.has(item.name)) { report.dupMembersRemoved++; touched = true; continue; }
        seen.add(item.name);
        // blank templated "X member" descriptions
        if (coll === 'members' && isTemplatedMemberDesc(item.name, item.description)) {
          item.description = '';
          report.descsBlanked++; touched = true;
        }
        deduped.push(item);
      }
      j[coll] = deduped;
    }

    if (touched) {
      await fs.writeFile(p, JSON.stringify(j, null, 2) + '\n');
      report.filesTouched++;
    }
  }

  console.log(JSON.stringify(report, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
