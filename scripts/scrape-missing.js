#!/usr/bin/env node
/**
 * scrape-missing.js — WP6.2: add missing operators by diffing the live wiki category
 * membership against the local data set, then deterministically scraping each missing page.
 *
 * Bounded & safe: cmlimit=500 single page per family (no continuation), a global cap,
 * meta/namespace pages filtered out, and any page that 404s or yields nothing is skipped
 * and logged — never fabricated.
 */
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { scrapeOperator } from './scrape-operator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '..', 'wiki', 'data', 'processed');
const API = 'https://docs.derivative.ca/api.php';
const STAMP = process.argv[2] || '2026-06-25T00:00:00.000Z';
const FAMILIES = ['CHOP', 'TOP', 'SOP', 'DAT', 'MAT', 'COMP', 'POP'];
const GLOBAL_CAP = 80;
const CONCURRENCY = 5;

const RICH_DEFAULTS = {
  summary: '', tips: [], warnings: [], relatedOperators: [], commonInputs: [],
  commonOutputs: [], workflowPatterns: [], keywords: [], tags: [], pythonExamples: [], codeExamples: [],
};

async function categoryMembers(fam) {
  const url = `${API}?action=query&list=categorymembers&cmtitle=Category:${fam}s&cmlimit=500&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'td-mcp-docs-sync/3.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for Category:${fam}s`);
  const j = await res.json();
  return (j.query && j.query.categorymembers || []).map(m => m.title);
}

function titleToId(title) {
  return title.replace(/ /g, '_').toLowerCase();
}

async function existingTitles() {
  const set = new Set();
  const files = (await fs.readdir(DIR)).filter(f => f.endsWith('.json'));
  for (const f of files) {
    try {
      const j = JSON.parse(await fs.readFile(join(DIR, f), 'utf8'));
      if (j.url) set.add(decodeURIComponent(j.url.split('/').pop()).toLowerCase());
      set.add(f.replace(/\.json$/, '').toLowerCase());
      if (j.name) set.add(j.name.replace(/ /g, '_').toLowerCase());
    } catch { /* ignore */ }
  }
  return set;
}

function mapParam(p) {
  const out = { name: p.label || p.name, parName: p.name, label: p.label || p.name,
    type: p.type || '', description: p.description || '', isReadOnly: !!p.readOnly };
  if (Array.isArray(p.menuItems) && p.menuItems.length) {
    out.menuItems = p.menuItems.map(mi => mi.name).filter(Boolean);
    out.menuLabels = p.menuItems.map(mi => mi.label || mi.name).filter(Boolean);
  }
  return out;
}

async function main() {
  const existing = await existingTitles();
  const report = { perFamily: {}, created: [], skipped: [], failed: [] };
  const toScrape = [];

  for (const fam of FAMILIES) {
    let members;
    try { members = await categoryMembers(fam); }
    catch (e) { report.failed.push(`Category:${fam}s: ${e.message}`); continue; }
    const famSuffix = new RegExp(`_${fam}$`, 'i');
    const missing = members.filter(title => {
      const norm = title.replace(/ /g, '_');
      if (/[:()]/.test(title)) return false;                 // namespace/meta
      if (/(Class|Template|Category|Snippets|Family|Generators)/i.test(title)) return false;
      if (!famSuffix.test(norm)) return false;                // must be an <Op>_<FAM> page
      const key = norm.toLowerCase();
      return !existing.has(key) && !existing.has(titleToId(title));
    });
    report.perFamily[fam] = { categoryTotal: members.length, missing: missing.length };
    for (const title of missing) toScrape.push({ fam, title: title.replace(/ /g, '_') });
  }

  const capped = toScrape.slice(0, GLOBAL_CAP);
  if (toScrape.length > capped.length) report.skipped.push(`cap: ${toScrape.length - capped.length} beyond GLOBAL_CAP=${GLOBAL_CAP} not scraped`);

  async function worker(item) {
    const { fam, title } = item;
    const id = titleToId(title);
    const file = join(DIR, `${id}.json`);
    try { await fs.access(file); report.skipped.push(`${id} (exists)`); return; } catch { /* ok, create */ }
    try {
      const scraped = await scrapeOperator(title);
      const name = title.replace(/_/g, ' ');
      const obj = {
        id, name, displayName: name, category: fam, subcategory: '',
        url: scraped.docUrl,
        description: scraped.description || '',
        parameters: scraped.parameters.map(mapParam),
        paramsVerified: scraped.parameters.length > 0,
        ...RICH_DEFAULTS,
        sourceUrl: scraped.sourceUrl,
        lastUpdated: STAMP, processingVersion: '3.0.0',
        _provenance: [{ fact: `scraped from the live ${title} wiki page`, url: scraped.sourceUrl, fetchedAt: STAMP }],
      };
      await fs.writeFile(file, JSON.stringify(obj, null, 2) + '\n');
      report.created.push(`${id} (${obj.parameters.length} params)`);
    } catch (e) {
      report.failed.push(`${id} (${title}): ${e.message}`);
    }
  }

  const queue = [...capped];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await worker(queue.shift());
  }));

  console.log('Per-family category vs local missing:', JSON.stringify(report.perFamily));
  console.log(`Created ${report.created.length}: ${report.created.join(', ')}`);
  if (report.skipped.length) console.log(`Skipped ${report.skipped.length}: ${report.skipped.slice(0, 20).join(', ')}`);
  if (report.failed.length) console.log(`Failed ${report.failed.length}: ${report.failed.slice(0, 20).join(', ')}`);
}
main().catch(e => { console.error(e); process.exit(1); });
