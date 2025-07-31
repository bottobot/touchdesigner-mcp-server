#!/usr/bin/env node

/**
 * Scrape POP (Particle Operators) from TouchDesigner documentation
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POP_URL = 'https://docs.derivative.ca/Category:POPs';

async function scrapePOPOperators() {
  console.log('Starting POP operators scraping...');
  console.log('Target URL:', POP_URL);
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.goto(POP_URL, { waitUntil: 'networkidle2' });
    
    // Extract operator names from the category page
    const operators = await page.evaluate(() => {
      const operatorElements = document.querySelectorAll('.mw-category-group ul li a');
      return Array.from(operatorElements).map(el => el.textContent.trim());
    });
    
    console.log(`Found ${operators.length} POP operators`);
    
    // Create metadata structure
    const metadata = {
      category: 'POP',
      description: 'Particle Operators - create and manipulate particle systems',
      operatorCount: operators.length,
      lastUpdated: new Date().toISOString(),
      sourceUrl: POP_URL,
      operators: operators.map(name => createOperatorMetadata(name, 'POP'))
    };
    
    // Save metadata file
    const metadataDir = path.join(__dirname, 'metadata');
    await fs.mkdir(metadataDir, { recursive: true });
    
    const filename = 'comprehensive_pop_metadata.json';
    const filepath = path.join(metadataDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(metadata, null, 2));
    console.log(`Saved ${filename}`);
    
    // Update metadata summary
    await updateMetadataSummary();
    
    return metadata;
    
  } finally {
    await browser.close();
  }
}

function createOperatorMetadata(name, category) {
  const cleanName = name.replace('Experimental:', '').trim();
  const isExperimental = name.includes('Experimental:');
  const urlName = cleanName.replace(/ /g, '_');
  
  return {
    name: cleanName,
    displayName: `${cleanName} ${category}`,
    opType: cleanName.toLowerCase().replace(/ /g, ''),
    summary: `The ${cleanName} ${category} operator provides functionality for...`,
    description: `Detailed description of the ${cleanName} ${category} operator. This would be scraped from the actual documentation page.`,
    isExperimental: isExperimental,
    wiki_url: `https://docs.derivative.ca/${urlName}`,
    thumb: `/images/operators/${cleanName.toLowerCase().replace(/ /g, '_')}_thumb.jpg`,
    parameters: [],
    inputs: [],
    outputs: [],
    related: [],
    examples: []
  };
}

async function updateMetadataSummary() {
  const metadataDir = path.join(__dirname, 'metadata');
  const files = await fs.readdir(metadataDir);
  const jsonFiles = files.filter(file => file.endsWith('_metadata.json') && !file.includes('summary'));
  
  let totalOperators = 0;
  const categories = {};
  
  for (const file of jsonFiles) {
    const content = await fs.readFile(path.join(metadataDir, file), 'utf-8');
    const metadata = JSON.parse(content);
    
    if (metadata.category && metadata.operators) {
      totalOperators += metadata.operators.length;
      categories[metadata.category] = {
        operatorCount: metadata.operators.length,
        description: metadata.description
      };
    }
  }
  
  const summary = {
    timestamp: new Date().toISOString(),
    totalCategories: Object.keys(categories).length,
    totalOperators: totalOperators,
    categories: categories
  };
  
  await fs.writeFile(
    path.join(metadataDir, 'metadata_summary.json'),
    JSON.stringify(summary, null, 2)
  );
  
  console.log('\nUpdated metadata summary:');
  console.log(`Total categories: ${summary.totalCategories}`);
  console.log(`Total operators: ${summary.totalOperators}`);
}

// Run the scraper
scrapePOPOperators()
  .then(() => {
    console.log('\nPOP operators scraping completed successfully!');
  })
  .catch(error => {
    console.error('Error scraping POP operators:', error);
    process.exit(1);
  });