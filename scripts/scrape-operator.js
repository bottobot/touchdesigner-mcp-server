#!/usr/bin/env node
/**
 * scrape-operator.js — deterministic TouchDesigner operator scraper (WP6.0).
 *
 * Fetches a wiki page's WIKITEXT (not rendered HTML) and parses the official
 * {{Parameter}} / {{ParameterItem}} templates. This is the reliable signal that
 * distinguishes a real parameter ({{Parameter|parName=...}}) from its menu options
 * ({{ParameterItem|itemName=...}}) — the exact distinction the original pipeline lost,
 * which produced fabricated params named "point"/"P"/"float"/"1".
 *
 * NO LLM, NO synthesis: every emitted parameter corresponds to a {{Parameter}} block
 * on the live page. Verify-or-omit: on fetch failure nothing is written.
 *
 * CLI:  node scripts/scrape-operator.js <Title>      # prints parsed JSON (for testing)
 */
const API = 'https://docs.derivative.ca/api.php';

/** Find top-level {{name ...}} blocks with correct nested-brace matching. */
export function findTemplateBlocks(text, name) {
  const blocks = [];
  let i = 0;
  while (i < text.length) {
    const idx = text.indexOf('{{' + name, i);
    if (idx === -1) break;
    const after = text[idx + 2 + name.length];
    if (after && /[A-Za-z]/.test(after)) { i = idx + 2; continue; } // e.g. ParameterPage vs Parameter
    let depth = 0, j = idx, end = -1;
    for (; j < text.length - 1; j++) {
      if (text[j] === '{' && text[j + 1] === '{') { depth++; j++; }
      else if (text[j] === '}' && text[j + 1] === '}') { depth--; j++; if (depth === 0) { end = j + 1; break; } }
    }
    if (end === -1) break;
    blocks.push(text.slice(idx, end));
    i = end;
  }
  return blocks;
}

/** Parse the top-level |key=value fields of a template body, ignoring nested templates. */
function parseFields(body) {
  // strip nested templates so their |key= don't leak into this level
  let depth = 0, flat = '';
  for (let k = 0; k < body.length; k++) {
    if (body[k] === '{' && body[k + 1] === '{') { depth++; k++; continue; }
    if (body[k] === '}' && body[k + 1] === '}') { depth--; k++; continue; }
    if (depth === 1) flat += body[k]; // depth 1 = this template's own level
  }
  const fields = {};
  const re = /\|\s*([A-Za-z0-9_]+)\s*=/g;
  let m, last = null, lastKey = null;
  while ((m = re.exec(flat)) !== null) {
    if (lastKey !== null) fields[lastKey] = flat.slice(last, m.index).trim();
    lastKey = m[1]; last = re.lastIndex;
  }
  if (lastKey !== null) fields[lastKey] = flat.slice(last).trim();
  return fields;
}

/** Parse a full wikitext page into { description, parameters[] }. */
export function parseWikitext(wikitext) {
  const result = { description: '', parameters: [] };

  // Description from the {{Summary}} block's long/short field
  const sum = findTemplateBlocks(wikitext, 'Summary')[0];
  if (sum) {
    const f = parseFields(sum);
    result.description = (f.long || f.short || '').replace(/\s+/g, ' ').trim();
  }

  const paramBlocks = findTemplateBlocks(wikitext, 'Parameter');
  for (const block of paramBlocks) {
    const f = parseFields(block);
    const name = (f.parName || '').trim();
    if (!name) continue; // a {{Parameter}} with no parName is not a real parameter
    const param = {
      name,
      label: (f.parLabel || '').trim(),
      type: (f.parType || '').trim(),
      description: (f.parSummary || '').replace(/\s+/g, ' ').trim(),
      readOnly: /true/i.test(f.parReadOnly || ''),
    };
    if (f.hidden && /true/i.test(f.hidden)) param.hidden = true;
    if (f.deprecated && /true/i.test(f.deprecated)) param.deprecated = true;
    // nested {{ParameterItem}} -> menuItems
    const items = findTemplateBlocks(block, 'ParameterItem');
    if (items.length) {
      param.menuItems = items.map(it => {
        const itf = parseFields(it);
        return { name: (itf.itemName || '').trim(), label: (itf.itemLabel || '').trim() };
      }).filter(x => x.name || x.label);
    }
    result.parameters.push(param);
  }
  return result;
}

export async function fetchWikitext(title) {
  const url = `${API}?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'td-mcp-docs-sync/3.0 (operator data refresh)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${title}`);
  const j = await res.json();
  if (j.error) throw new Error(`API error for ${title}: ${j.error.info || j.error.code}`);
  const wt = j.parse && j.parse.wikitext && j.parse.wikitext['*'];
  if (!wt) throw new Error(`No wikitext for ${title}`);
  return wt;
}

export async function scrapeOperator(title) {
  const wt = await fetchWikitext(title);
  const parsed = parseWikitext(wt);
  return { ...parsed, sourceUrl: `${API}?action=parse&page=${encodeURIComponent(title)}&prop=wikitext`, docUrl: `https://docs.derivative.ca/${title}` };
}

// CLI test mode
if (process.argv[1] && process.argv[1].endsWith('scrape-operator.js') && process.argv[2]) {
  scrapeOperator(process.argv[2]).then(r => {
    console.log(`title=${process.argv[2]}  params=${r.parameters.length}`);
    console.log('paramNames:', r.parameters.map(p => p.name).join(', '));
    console.log('first param:', JSON.stringify(r.parameters[0], null, 2));
    console.log('description:', r.description.slice(0, 160));
  }).catch(e => { console.error('ERROR:', e.message); process.exit(1); });
}
