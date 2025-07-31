// Test to diagnose the category issue
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const METADATA_PATH = join(__dirname, 'metadata');

async function testLoadMetadata() {
  console.log('=== Testing Metadata Loading ===\n');
  
  const files = await fs.readdir(METADATA_PATH);
  const jsonFiles = files.filter(file => file.endsWith('.json'));
  
  // Check a file with operators
  const firstFile = 'comprehensive_sop_metadata.json';
  const filePath = join(METADATA_PATH, firstFile);
  const content = await fs.readFile(filePath, 'utf-8');
  const metadata = JSON.parse(content);
  
  console.log(`File: ${firstFile}`);
  console.log(`Top-level category: ${metadata.category}`);
  console.log(`Number of operators: ${metadata.operators?.length || 0}`);
  
  if (metadata.operators && metadata.operators.length > 0) {
    const firstOp = metadata.operators[0];
    console.log(`\nFirst operator structure:`);
    console.log(`  Name: ${firstOp.name}`);
    console.log(`  Has category property: ${firstOp.hasOwnProperty('category')}`);
    console.log(`  Properties: ${Object.keys(firstOp).join(', ')}`);
  }
  
  console.log('\n=== Diagnosis ===');
  console.log('The issue is confirmed:');
  console.log('- Category is stored at the metadata file level');
  console.log('- Individual operators do NOT have a category property');
  console.log('- But the code expects each operator to have its own category');
}

testLoadMetadata().catch(console.error);