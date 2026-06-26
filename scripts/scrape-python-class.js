#!/usr/bin/env node
/**
 * scrape-python-class.js — WP6.3: extend Python API coverage by scraping missing
 * "<Name> Class" pages from docs.derivative.ca (Category:Python_Reference).
 *
 * Deterministic: parses the official {{TDClassSummary}} / {{ClassMember}} / {{ClassMethod}}
 * templates from wikitext. No synthesis — verify-or-omit on fetch failure.
 *
 * CLI: node scripts/scrape-python-class.js <Name>   # prints parsed JSON (test)
 *      node scripts/scrape-python-class.js --all <ts> # scrape all missing classes
 */
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { findTemplateBlocks, parseFields, fetchWikitext } from './scrape-operator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '..', 'wiki', 'data', 'python-api');
const API = 'https://docs.derivative.ca/api.php';
const CONCURRENCY = 6;
const CAP = 600;

function clean(s) {
  return (s || '')
    .replace(/<syntaxhighlight[^>]*>[\s\S]*?<\/syntaxhighlight>/g, '')
    .replace(/<section[^>]*\/?>/g, '')
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/<code>([^<]*)<\/code>/g, '`$1`')
    .replace(/'''?/g, '')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/\s+/g, ' ').trim();
}

function categoryFor(className) {
  if (/(CHOP|TOP|SOP|DAT|MAT|COMP|POP)$/.test(className)) return 'Operator';
  if (/(COMP)$/.test(className)) return 'Component';
  if (/^(UI|Pane|Panel|Monitor)/.test(className)) return 'UI';
  return 'General';
}

export function parseClassWikitext(wt, className) {
  const out = { members: [], methods: [], description: '', inherits: '' };
  const summ = findTemplateBlocks(wt, 'TDClassSummary')[0];
  if (summ) out.description = clean(parseFields(summ).summary);
  const inh = findTemplateBlocks(wt, 'ClassInheritance')[0];
  if (inh) { const f = parseFields(inh); out.inherits = clean(f.parent || f.inherits || f.class || ''); }

  for (const block of findTemplateBlocks(wt, 'ClassMember')) {
    const f = parseFields(block);
    if (!f.name) continue;
    out.members.push({
      name: f.name.trim(),
      returnType: (f.type || '').trim(),
      readOnly: f.set !== '1',
      description: clean(f.text),
    });
  }
  for (const block of findTemplateBlocks(wt, 'ClassMethod')) {
    const f = parseFields(block);
    if (!f.name) continue;
    const name = f.name.trim();
    const call = (f.call || '').trim();
    out.methods.push({
      name,
      signature: name === '[]' ? call : `${name}${call || '()'}`,
      returns: clean(f.returns || ''),
      parameters: [],
      description: clean(f.text),
    });
  }
  // de-dup by name within each collection
  for (const k of ['members', 'methods']) {
    const seen = new Set();
    out[k] = out[k].filter(x => (seen.has(x.name) ? false : seen.add(x.name)));
  }
  return out;
}

async function classMembers() {
  let cont = '', all = [];
  for (let i = 0; i < 6; i++) {
    const url = `${API}?action=query&list=categorymembers&cmtitle=Category:Python_Reference&cmlimit=500&format=json${cont ? '&cmcontinue=' + encodeURIComponent(cont) : ''}`;
    const j = await (await fetch(url, { headers: { 'User-Agent': 'td-mcp-docs-sync/3.0' } })).json();
    all.push(...(j.query.categorymembers || []).map(m => m.title));
    if (j.continue && j.continue.cmcontinue) cont = j.continue.cmcontinue; else break;
  }
  return all.filter(t => / Class$/.test(t)).map(t => t.replace(/ Class$/, ''));
}

async function main() {
  const STAMP = process.argv[3] || '2026-06-25T00:00:00.000Z';
  const wantClasses = await classMembers();                 // class names (no " Class")
  const index = JSON.parse(await fs.readFile(join(DIR, 'index.json'), 'utf8'));
  const localNames = new Set((index.classes || []).map(c => (typeof c === 'string' ? c : c.className)));
  const sanitize = n => `${n.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
  // also treat existing files as present
  for (const f of (await fs.readdir(DIR))) if (f.endsWith('.json') && f !== 'index.json') localNames.add(f.replace(/\.json$/, ''));

  const missing = wantClasses.filter(n => !localNames.has(n)).slice(0, CAP);
  const report = { wantClasses: wantClasses.length, alreadyLocal: localNames.size, missing: missing.length, created: [], empty: [], failed: [] };

  const newEntries = [];
  async function worker(name) {
    const file = join(DIR, sanitize(name));
    try { await fs.access(file); report.empty.push(`${name} (file exists)`); return; } catch { /* create */ }
    try {
      const wt = await fetchWikitext(`${name}_Class`);
      const parsed = parseClassWikitext(wt, name);
      if (!parsed.members.length && !parsed.methods.length && !parsed.description) { report.empty.push(name); return; }
      const obj = {
        className: name, displayName: name, category: categoryFor(name),
        description: parsed.description, inherits: parsed.inherits || undefined,
        members: parsed.members, methods: parsed.methods,
        url: `https://docs.derivative.ca/${name.replace(/[^a-zA-Z0-9]/g, '_')}_Class`,
        sourceUrl: `${API}?action=parse&page=${encodeURIComponent(name + '_Class')}&prop=wikitext`,
        lastUpdated: STAMP, processingVersion: '3.0.0',
        _provenance: [{ fact: `scraped from the ${name} Class wiki page`, url: `https://docs.derivative.ca/${name.replace(/[^a-zA-Z0-9]/g, '_')}_Class`, fetchedAt: STAMP }],
      };
      await fs.writeFile(file, JSON.stringify(obj, null, 2) + '\n');
      newEntries.push(name);
      report.created.push(`${name} (${parsed.members.length}m/${parsed.methods.length}M)`);
    } catch (e) {
      report.failed.push(`${name}: ${e.message}`);
    }
  }
  const queue = [...missing];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => { while (queue.length) await worker(queue.shift()); }));

  // update index.json
  if (newEntries.length) {
    const classes = index.classes || [];
    for (const n of newEntries) if (!classes.some(c => (typeof c === 'string' ? c : c.className) === n)) classes.push(n);
    index.classes = classes;
    if (index.stats) index.stats.totalClasses = classes.length;
    await fs.writeFile(join(DIR, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  }

  console.log(`Python classes: want ${report.wantClasses}, missing ${report.missing}, created ${report.created.length}, empty ${report.empty.length}, failed ${report.failed.length}`);
  console.log('created:', report.created.slice(0, 60).join(', '));
  if (report.failed.length) console.log('failed:', report.failed.slice(0, 15).join(', '));
}

// CLI test mode for a single class
if (process.argv[2] && process.argv[2] !== '--all') {
  const name = process.argv[2];
  fetchWikitext(`${name}_Class`).then(wt => {
    const r = parseClassWikitext(wt, name);
    console.log(`${name}: ${r.members.length} members, ${r.methods.length} methods, inherits=${r.inherits || '-'}`);
    console.log('members:', r.members.slice(0, 8).map(m => `${m.name}:${m.returnType}${m.readOnly ? '(ro)' : ''}`).join(', '));
    console.log('methods:', r.methods.slice(0, 8).map(m => m.name).join(', '));
  }).catch(e => { console.error('ERROR:', e.message); process.exit(1); });
} else if (process.argv[2] === '--all') {
  main().catch(e => { console.error(e); process.exit(1); });
}
