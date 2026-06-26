#!/usr/bin/env node
/**
 * build-maps.js — P0.5 data foundation for live TD control.
 * For every processed operator, scrape the wiki to produce an authoritative,
 * DOCUMENTED map of:
 *   - createType : the COMP.create() token = the Summary {{...|opClass=<token>_Class}} minus "_Class"
 *                  (e.g. Noise TOP -> noiseTOP, Geometry COMP -> geometryCOMP).
 *   - params     : label -> { parName, type, menu: {itemLabel: itemName} } from {{Parameter}}/{{ParameterItem}}.
 * Output: wiki/data/maps/operators.json  (consumed by td_create_operator / td_set_parameter / builders).
 * Deterministic, verify-or-omit: a page that fails to fetch or lacks opClass is logged, never guessed.
 */
import { promises as fs } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { fetchWikitext, findTemplateBlocks, parseFields } from './scrape-operator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROCESSED = join(__dirname, '..', 'wiki', 'data', 'processed');
const OUTDIR = join(__dirname, '..', 'wiki', 'data', 'maps');
const STAMP = process.argv[2] || '2026-06-26T00:00:00.000Z';
const CONCURRENCY = 8;

function titleFor(j) {
  if (j.sourceFile) return basename(j.sourceFile).replace(/\.html?$/i, '').replace(/^Experimental[-:]/i, '');
  if (j.name) return j.name.trim().replace(/^Experimental[-:]\s*/i, '').replace(/\s+/g, '_');
  return null;
}

async function main() {
  const files = (await fs.readdir(PROCESSED)).filter(f => f.endsWith('.json'));
  const map = {};
  const report = { total: files.length, ok: 0, noOpClass: [], failed: [] };

  async function worker(f) {
    let j;
    try { j = JSON.parse(await fs.readFile(join(PROCESSED, f), 'utf8')); } catch { report.failed.push(f + ' (bad json)'); return; }
    const id = j.id || f.replace(/\.json$/, '');
    const title = titleFor(j);
    if (!title) { report.failed.push(f + ' (no title)'); return; }
    try {
      const wt = await fetchWikitext(title);
      const opClass = (wt.match(/\|\s*opClass\s*=\s*([A-Za-z0-9_]+)/) || [])[1];
      const createType = opClass ? opClass.replace(/_Class$/, '') : null;
      if (!createType) report.noOpClass.push(id);
      // parameters: label -> {parName, type, menu}
      const params = {};
      for (const block of findTemplateBlocks(wt, 'Parameter')) {
        const pf = parseFields(block);
        const parName = (pf.parName || '').trim();
        if (!parName) continue;
        const label = (pf.parLabel || parName).trim();
        const entry = { parName, type: (pf.parType || '').trim() };
        const items = findTemplateBlocks(block, 'ParameterItem');
        if (items.length) {
          entry.menu = {};
          for (const it of items) {
            const itf = parseFields(it);
            const il = (itf.itemLabel || itf.itemName || '').trim();
            const iv = (itf.itemName || '').trim();
            if (iv) entry.menu[il || iv] = iv;
          }
        }
        params[label] = entry;
        // also index by parName so either resolves
        if (parName !== label) params[parName] = entry;
      }
      map[id] = {
        name: j.name, family: j.category, createType,
        url: `https://docs.derivative.ca/${title}`,
        params,
      };
      report.ok++;
    } catch (e) {
      report.failed.push(`${id} (${title}): ${e.message}`);
    }
  }

  const queue = [...files];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => { while (queue.length) await worker(queue.shift()); }));

  await fs.mkdir(OUTDIR, { recursive: true });
  const out = {
    schemaVersion: '1.0',
    description: 'Authoritative create() tokens and parameter scripting-names per operator, scraped from docs.derivative.ca (Summary opClass + {{Parameter}} templates).',
    _provenance: [{ fact: 'createType = wiki Summary opClass minus "_Class"; parName = {{Parameter|parName}}', url: 'https://docs.derivative.ca/api.php?action=parse&prop=wikitext', fetchedAt: STAMP }],
    generatedAt: STAMP,
    operators: map,
  };
  await fs.writeFile(join(OUTDIR, 'operators.json'), JSON.stringify(out, null, 2) + '\n');

  const withType = Object.values(map).filter(m => m.createType).length;
  console.log(`maps: ${report.ok}/${report.total} ops mapped; ${withType} with createType; ${report.noOpClass.length} missing opClass; ${report.failed.length} failed`);
  if (report.noOpClass.length) console.log('no opClass:', report.noOpClass.slice(0, 30).join(', '));
  if (report.failed.length) console.log('failed:', report.failed.slice(0, 20).join(', '));
}
main().catch(e => { console.error(e); process.exit(1); });
