#!/usr/bin/env node
/**
 * rescrape-pops.js — WP6.1: re-scrape all *_pop.json operators with correct parameters.
 *
 * The 90 POP files were the worst fabrication (menu options flattened into top-level params,
 * 100% template descriptions). This replaces their `parameters` with the deterministically
 * parsed {{Parameter}} blocks from the live wiki (menu options correctly nested as menuItems),
 * sets a real description, marks paramsVerified:true, and records provenance.
 *
 * Non-destructive on failure: if a page can't be fetched or yields 0 params, the file is left
 * as-is (still flagged paramsVerified:false) and the miss is logged — never fabricated.
 */
import { promises as fs } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { scrapeOperator } from './scrape-operator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '..', 'wiki', 'data', 'processed');
const STAMP = process.argv[2] || '2026-06-25T00:00:00.000Z'; // pass a timestamp; no Date.now in libs
const CONCURRENCY = 6;

function titleFor(j) {
  if (j.sourceFile) {
    return basename(j.sourceFile).replace(/\.html?$/i, '').replace(/^Experimental[-:]/i, '');
  }
  if (j.name) return j.name.trim().replace(/^Experimental[-:]\s*/i, '').replace(/\s+/g, '_');
  return null;
}

function mapParam(p) {
  const out = {
    name: p.label || p.name,
    parName: p.name,
    label: p.label || p.name,
    type: p.type || '',
    description: p.description || '',
    isReadOnly: !!p.readOnly,
  };
  if (p.hidden) out.isHidden = true;
  if (p.deprecated) out.deprecated = true;
  if (Array.isArray(p.menuItems) && p.menuItems.length) {
    out.menuItems = p.menuItems.map(mi => mi.name).filter(Boolean);
    out.menuLabels = p.menuItems.map(mi => mi.label || mi.name).filter(Boolean);
  }
  return out;
}

async function processFile(f, report) {
  const p = join(DIR, f);
  const j = JSON.parse(await fs.readFile(p, 'utf8'));
  const title = titleFor(j);
  if (!title) { report.skipped.push(`${f} (no title)`); return; }
  try {
    const scraped = await scrapeOperator(title);
    if (!scraped.parameters.length) { report.zeroParams.push(`${f} (${title})`); return; }
    j.parameters = scraped.parameters.map(mapParam);
    if (scraped.description) j.description = scraped.description;
    j.url = scraped.docUrl;
    j.paramsVerified = true;
    j.sourceUrl = scraped.sourceUrl;
    j.lastUpdated = STAMP;
    j.processingVersion = '3.0.0';
    j._provenance = [{
      fact: `parameters and description scraped from the live ${title} wiki page ({{Parameter}}/{{ParameterItem}} templates)`,
      url: scraped.sourceUrl,
      fetchedAt: STAMP,
    }];
    await fs.writeFile(p, JSON.stringify(j, null, 2) + '\n');
    report.ok.push(`${f}: ${j.parameters.length} params`);
  } catch (e) {
    report.failed.push(`${f} (${title}): ${e.message}`);
  }
}

async function pool(items, n, worker) {
  const queue = [...items];
  const runners = Array.from({ length: n }, async () => {
    while (queue.length) { const it = queue.shift(); await worker(it); }
  });
  await Promise.all(runners);
}

async function main() {
  const files = (await fs.readdir(DIR)).filter(f => f.endsWith('_pop.json'));
  const report = { total: files.length, ok: [], zeroParams: [], skipped: [], failed: [] };
  await pool(files, CONCURRENCY, f => processFile(f, report));
  console.log(`POP re-scrape: ${report.ok.length} ok, ${report.zeroParams.length} zero-params, ${report.failed.length} failed, ${report.skipped.length} skipped (of ${report.total})`);
  if (report.zeroParams.length) console.log('zero-params:', report.zeroParams.join('; '));
  if (report.failed.length) console.log('failed:', report.failed.join('; '));
}
main().catch(e => { console.error(e); process.exit(1); });
