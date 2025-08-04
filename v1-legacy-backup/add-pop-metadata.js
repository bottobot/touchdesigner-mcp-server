#!/usr/bin/env node

/**
 * Add POP (Particle Operators) metadata to TD-MCP
 * Based on https://docs.derivative.ca/Category:POPs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// POP operators from TouchDesigner documentation
const POP_OPERATORS = [
  'Attractor',
  'Collision',
  'Drag',
  'Event',
  'Fan',
  'Flock',
  'Force',
  'Group',
  'Image',
  'Impulse Force',
  'Interact',
  'Kill',
  'Limit',
  'Lookat',
  'Metaball',
  'Orbit',
  'Particle',
  'Point',
  'Position',
  'Property',
  'Proximity',
  'Replicate',
  'Rotation',
  'Source',
  'Speed Limit',
  'Sphere',
  'Spin',
  'Split',
  'Sprite',
  'Spring',
  'Stream',
  'Transform',
  'Up Vector',
  'Velocity',
  'Wind'
];

function createOperatorMetadata(name, category) {
  const cleanName = name.trim();
  const urlName = cleanName.replace(/ /g, '_');
  
  return {
    name: cleanName,
    displayName: `${cleanName} ${category}`,
    opType: cleanName.toLowerCase().replace(/ /g, ''),
    summary: `The ${cleanName} ${category} operator provides functionality for particle ${cleanName.toLowerCase()} operations.`,
    description: `Detailed description of the ${cleanName} ${category} operator. This operator is used for particle system manipulation and effects.`,
    isExperimental: false,
    wiki_url: `https://docs.derivative.ca/${urlName}_POP`,
    thumb: `/images/operators/${cleanName.toLowerCase().replace(/ /g, '_')}_pop_thumb.jpg`,
    parameters: [],
    inputs: [],
    outputs: [],
    related: [],
    examples: []
  };
}

async function addPOPMetadata() {
  console.log('Adding POP operators metadata...');
  console.log(`Found ${POP_OPERATORS.length} POP operators`);
  
  // Create metadata structure
  const metadata = {
    category: 'POP',
    description: 'Particle Operators - create and manipulate particle systems for dynamic simulations',
    operatorCount: POP_OPERATORS.length,
    lastUpdated: new Date().toISOString(),
    sourceUrl: 'https://docs.derivative.ca/Category:POPs',
    operators: POP_OPERATORS.map(name => createOperatorMetadata(name, 'POP'))
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
  console.log('\nCategories:');
  for (const [cat, info] of Object.entries(categories)) {
    console.log(`  ${cat}: ${info.operatorCount} operators`);
  }
}

// Run the script
addPOPMetadata()
  .then(() => {
    console.log('\nPOP metadata added successfully!');
  })
  .catch(error => {
    console.error('Error adding POP metadata:', error);
    process.exit(1);
  });