#!/usr/bin/env node

/**
 * Test dynamic scraping functionality
 */

import { getOperatorDetails } from './scrape-operator-details.js';

async function testDynamicScraping() {
  console.log('Testing Dynamic Scraping for TouchDesigner Operators');
  console.log('===================================================\n');
  
  const testOperators = [
    { name: 'Particle', category: 'POP' },
    { name: 'Force', category: 'POP' },
    { name: 'Noise', category: 'CHOP' },
    { name: 'Noise', category: 'TOP' }
  ];
  
  for (const op of testOperators) {
    console.log(`\n--- Testing ${op.name} ${op.category} ---`);
    
    try {
      const details = await getOperatorDetails(op.name, op.category);
      
      if (details) {
        console.log(`✓ Successfully scraped ${op.name} ${op.category}`);
        console.log(`  URL: ${details.wiki_url}`);
        console.log(`  Summary: ${details.summary.substring(0, 100)}...`);
        console.log(`  Parameters: ${details.parameters.length} found`);
        if (details.parameters.length > 0) {
          console.log(`    First param: ${details.parameters[0].name}`);
        }
        console.log(`  Attributes: ${details.attributes ? details.attributes.length : 0} found`);
        if (details.attributes && details.attributes.length > 0) {
          console.log(`    First attr: ${details.attributes[0].name} (${details.attributes[0].type})`);
        }
        console.log(`  Inputs: ${details.inputs.length} found`);
        console.log(`  Outputs: ${details.outputs.length} found`);
        console.log(`  Related: ${details.related.length} found`);
      } else {
        console.log(`✗ Failed to scrape ${op.name} ${op.category}`);
      }
    } catch (error) {
      console.log(`✗ Error scraping ${op.name} ${op.category}: ${error.message}`);
    }
  }
  
  console.log('\n\nTesting complete!');
}

// Run the test
testDynamicScraping().catch(console.error);