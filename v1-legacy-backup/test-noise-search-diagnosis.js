// Diagnostic test for noise operator search issue
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const METADATA_PATH = join(__dirname, 'metadata');

async function diagnoseNoiseSearch() {
  console.log('=== NOISE OPERATOR SEARCH DIAGNOSIS ===\n');
  
  // Load all metadata files
  const files = await fs.readdir(METADATA_PATH);
  const jsonFiles = files.filter(file => file.endsWith('.json'));
  
  console.log(`Found ${jsonFiles.length} metadata files:`);
  console.log(jsonFiles.join(', '));
  console.log('\n');
  
  let allNoiseOperators = [];
  let operatorCount = 0;
  
  // Search each file for noise-related content
  for (const file of jsonFiles) {
    const filePath = join(METADATA_PATH, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const metadata = JSON.parse(content);
    
    console.log(`\n--- Analyzing ${file} ---`);
    console.log(`Category: ${metadata.category}`);
    
    if (metadata.operators) {
      console.log(`Total operators in file: ${metadata.operators.length}`);
      operatorCount += metadata.operators.length;
      
      // Search for "noise" in operator names
      const noiseInName = metadata.operators.filter(op => 
        op.name && op.name.toLowerCase().includes('noise')
      );
      
      // Search for "noise" in descriptions
      const noiseInDescription = metadata.operators.filter(op => 
        op.description && op.description.toLowerCase().includes('noise')
      );
      
      // Search for "noise" in related operators
      const noiseInRelated = metadata.operators.filter(op => 
        op.related && op.related.some(r => r.toLowerCase().includes('noise'))
      );
      
      console.log(`Operators with "noise" in name: ${noiseInName.length}`);
      if (noiseInName.length > 0) {
        noiseInName.forEach(op => {
          console.log(`  - ${op.name}: ${op.description}`);
          allNoiseOperators.push({ ...op, category: metadata.category, source: 'name' });
        });
      }
      
      console.log(`Operators with "noise" in description: ${noiseInDescription.length}`);
      if (noiseInDescription.length > 0) {
        noiseInDescription.forEach(op => {
          console.log(`  - ${op.name}: ${op.description}`);
          if (!allNoiseOperators.some(n => n.name === op.name)) {
            allNoiseOperators.push({ ...op, category: metadata.category, source: 'description' });
          }
        });
      }
      
      console.log(`Operators with "noise" in related: ${noiseInRelated.length}`);
      if (noiseInRelated.length > 0) {
        noiseInRelated.forEach(op => {
          console.log(`  - ${op.name} references: ${op.related.filter(r => r.toLowerCase().includes('noise')).join(', ')}`);
        });
      }
    }
  }
  
  console.log('\n=== SUMMARY ===');
  console.log(`Total operators loaded: ${operatorCount}`);
  console.log(`Total noise-related operators found: ${allNoiseOperators.length}`);
  console.log('\nAll noise operators:');
  allNoiseOperators.forEach(op => {
    console.log(`- ${op.name} (${op.category}) - found in: ${op.source}`);
  });
  
  // Test the search function logic
  console.log('\n=== TESTING SEARCH LOGIC ===');
  const searchTerm = 'noise';
  console.log(`Searching for: "${searchTerm}"`);
  
  // Simulate the search function from index.js
  const searchResults = [];
  allNoiseOperators.forEach(operator => {
    let relevance = 0;
    
    if (operator.name.toLowerCase().includes(searchTerm)) {
      relevance = 1.0;
    }
    if (operator.description && operator.description.toLowerCase().includes(searchTerm)) {
      relevance = Math.max(relevance, 0.8);
    }
    
    if (relevance > 0) {
      searchResults.push({ ...operator, relevance });
    }
  });
  
  console.log(`\nSearch results: ${searchResults.length}`);
  searchResults.forEach(op => {
    console.log(`- ${op.name} (${op.category}) - relevance: ${op.relevance}`);
  });
  
  // Check for missing categories
  console.log('\n=== MISSING CATEGORIES CHECK ===');
  const expectedCategories = ['CHOP', 'DAT', 'SOP', 'TOP', 'MAT', 'COMP'];
  const foundCategories = jsonFiles.map(f => {
    const content = fs.readFileSync(join(METADATA_PATH, f), 'utf-8');
    const metadata = JSON.parse(content);
    return metadata.category;
  });
  
  console.log('Expected categories:', expectedCategories.join(', '));
  console.log('Found categories:', foundCategories.join(', '));
  
  const missingCategories = expectedCategories.filter(cat => !foundCategories.includes(cat));
  if (missingCategories.length > 0) {
    console.log('MISSING CATEGORIES:', missingCategories.join(', '));
    console.log('\nThis could explain missing noise operators if they belong to these categories!');
  }
}

// Run the diagnosis
diagnoseNoiseSearch().catch(console.error);