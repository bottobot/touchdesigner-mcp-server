#!/usr/bin/env node
/**
 * Operator Data Cleanup Script
 * Cleans raw HTML dumps from parameter descriptions and removes duplicate parameters.
 *
 * Usage: node scripts/clean-operator-data.js [--dry-run] [--file operator_name.json]
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROCESSED_DIR = join(__dirname, '..', 'wiki', 'data', 'processed');

/**
 * Extract clean parameter description from raw HTML dump text.
 * The dump contains lines like:
 *   paramname -  - Description text here.
 * We extract just the description for the matching parameter.
 */
function extractParamDescription(paramName, rawDescription) {
  if (!rawDescription || rawDescription.length < 200) {
    // Short descriptions are likely already clean
    return rawDescription;
  }

  // Check if it starts with common HTML dump markers
  const isDump = rawDescription.includes('From Derivative') ||
                 rawDescription.includes('Jump to navigation') ||
                 rawDescription.includes('Jump to search') ||
                 rawDescription.length > 1000;

  if (!isDump) return rawDescription;

  // Try to find the parameter's description in the dump
  // Format: "  paramname -  - Description text"
  const paramLower = paramName.toLowerCase().replace(/\s+/g, '');
  const lines = rawDescription.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Match patterns like "paramname - Menu - Description" or "paramname -  - Description"
    const match = trimmed.match(/^(\w+)\s*-\s*(?:[^-]*-\s*)?(.+)$/);
    if (match) {
      const foundParam = match[1].toLowerCase();
      if (foundParam === paramLower || foundParam === paramName.toLowerCase()) {
        const desc = match[2].trim();
        // Take first sentence or up to 500 chars
        const firstSentence = desc.match(/^[^.!?]+[.!?]/);
        if (firstSentence && firstSentence[0].length > 20) {
          return firstSentence[0].trim();
        }
        return desc.substring(0, 500).trim();
      }
    }
  }

  // If we can't find the specific param, return a cleaned-up short version
  // Extract the operator description from the beginning of the dump
  const descMatch = rawDescription.match(/Jump to search\s*\n\s*(.+?)(?:\t|\n)/);
  if (descMatch) {
    return `Parameter of this operator. See operator description for details.`;
  }

  return `${paramName} parameter.`;
}

/**
 * Extract menu items from raw description text
 */
function extractMenuItems(paramName, rawDescription) {
  if (!rawDescription || rawDescription.length < 200) return [];

  const paramLower = paramName.toLowerCase();
  const lines = rawDescription.split('\n');
  const menuItems = [];
  let foundParam = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith(paramLower + ' -')) {
      foundParam = true;
      continue;
    }
    if (foundParam) {
      // Menu items are on following lines with format: "itemname - Description"
      const menuMatch = trimmed.match(/^(\w[\w\s]*\w?)\s*-\s*(.+)$/);
      if (menuMatch && menuMatch[1].length < 30) {
        menuItems.push(menuMatch[1].trim());
      } else if (trimmed === '' || trimmed.startsWith('\t')) {
        if (menuItems.length > 0) break; // End of menu section
      } else {
        break;
      }
    }
  }

  return menuItems;
}

/**
 * Remove duplicate parameters (keep first occurrence)
 */
function deduplicateParams(parameters) {
  const seen = new Map();
  const result = [];

  for (const param of parameters) {
    const key = param.name;
    if (!seen.has(key)) {
      seen.set(key, true);
      result.push(param);
    }
  }

  return result;
}

/**
 * Clean a single operator's data
 */
function cleanOperator(data) {
  let changed = false;

  if (!data.parameters || data.parameters.length === 0) return { data, changed };

  // Deduplicate parameters
  const originalCount = data.parameters.length;
  data.parameters = deduplicateParams(data.parameters);
  if (data.parameters.length !== originalCount) {
    changed = true;
  }

  // Clean parameter descriptions
  for (const param of data.parameters) {
    if (param.description && param.description.length > 500) {
      const cleanDesc = extractParamDescription(param.name, param.description);
      if (cleanDesc !== param.description) {
        // Try to extract menu items before cleaning
        if ((!param.menuItems || param.menuItems.length === 0)) {
          const menus = extractMenuItems(param.name, param.description);
          if (menus.length > 0) {
            param.menuItems = menus;
          }
        }
        param.description = cleanDesc;
        changed = true;
      }
    }
  }

  return { data, changed };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fileArg = args.find((a, i) => args[i - 1] === '--file');

  let files;
  if (fileArg) {
    files = [fileArg];
  } else {
    const allFiles = await fs.readdir(PROCESSED_DIR);
    files = allFiles.filter(f => f.endsWith('.json'));
  }

  console.log(`Processing ${files.length} operator files...`);
  if (dryRun) console.log('(DRY RUN - no files will be modified)');

  let cleaned = 0;
  let errors = 0;
  let totalParamsRemoved = 0;

  for (const file of files) {
    try {
      const filePath = join(PROCESSED_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      const originalParamCount = data.parameters ? data.parameters.length : 0;
      const { data: cleanedData, changed } = cleanOperator(data);
      const newParamCount = cleanedData.parameters ? cleanedData.parameters.length : 0;

      if (changed) {
        totalParamsRemoved += (originalParamCount - newParamCount);
        cleaned++;

        if (!dryRun) {
          await fs.writeFile(filePath, JSON.stringify(cleanedData, null, 2), 'utf-8');
        }

        console.log(`  Cleaned: ${file} (${originalParamCount} -> ${newParamCount} params)`);
      }
    } catch (err) {
      errors++;
      console.error(`  Error processing ${file}: ${err.message}`);
    }
  }

  console.log(`\nSummary:`);
  console.log(`  Files processed: ${files.length}`);
  console.log(`  Files cleaned: ${cleaned}`);
  console.log(`  Duplicate params removed: ${totalParamsRemoved}`);
  console.log(`  Errors: ${errors}`);
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
