#!/usr/bin/env node

/**
 * Test script for Python API functionality
 * Tests the Python API parser, data structures, and tools
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import WikiSystem from './wiki/wiki-system.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testPythonApi() {
    console.log('========================================');
    console.log('TD-MCP Python API Test Suite');
    console.log('========================================\n');
    
    // Initialize wiki system
    console.log('[Test] Initializing wiki system...');
    const wikiSystem = new WikiSystem({
        wikiPath: join(__dirname, 'wiki'),
        dataPath: join(__dirname, 'wiki', 'data'),
        processedPath: join(__dirname, 'wiki', 'data', 'processed'),
        searchIndexPath: join(__dirname, 'wiki', 'data', 'search-index'),
        enablePersistence: true,
        tdDocsPath: 'C:\\Program Files\\Derivative\\TouchDesigner\\Samples\\Learn\\OfflineHelp\\https.docs.derivative.ca'
    });
    
    await wikiSystem.initialize();
    console.log('[Test] Wiki system initialized\n');
    
    // Test 1: Check if Python API extension is loaded
    console.log('[Test 1] Checking Python API extension...');
    if (wikiSystem.pythonApi) {
        console.log('✓ Python API extension loaded');
    } else {
        console.log('✗ Python API extension not found');
        return;
    }
    
    // Test 2: Process Python API documentation
    console.log('\n[Test 2] Processing Python API documentation...');
    try {
        const results = await wikiSystem.pythonApi.processPythonApiDocs();
        console.log(`✓ Processed ${results.processed} Python classes`);
        console.log(`  - ${results.members} members found`);
        console.log(`  - ${results.methods} methods found`);
        console.log(`  - ${results.errors} errors`);
        
        if (results.classes.length > 0) {
            console.log(`  Sample classes: ${results.classes.slice(0, 5).join(', ')}...`);
        }
    } catch (error) {
        console.log('✗ Failed to process Python API docs:', error.message);
    }
    
    // Test 3: Get Python classes
    console.log('\n[Test 3] Retrieving Python classes...');
    const pythonClasses = wikiSystem.getPythonClasses();
    console.log(`✓ Found ${pythonClasses.length} Python classes`);
    
    // Test 4: Get specific Python class
    console.log('\n[Test 4] Getting specific Python class (CHOP)...');
    const chopClass = wikiSystem.getPythonClass('CHOP');
    if (chopClass) {
        console.log('✓ Found CHOP class');
        console.log(`  - Display name: ${chopClass.displayName}`);
        console.log(`  - Members: ${chopClass.members?.length || 0}`);
        console.log(`  - Methods: ${chopClass.methods?.length || 0}`);
        
        if (chopClass.members && chopClass.members.length > 0) {
            console.log(`  - Sample members: ${chopClass.members.slice(0, 3).map(m => m.name).join(', ')}...`);
        }
        if (chopClass.methods && chopClass.methods.length > 0) {
            console.log(`  - Sample methods: ${chopClass.methods.slice(0, 3).map(m => m.name).join(', ')}...`);
        }
    } else {
        console.log('✗ CHOP class not found');
    }
    
    // Test 5: Search Python classes
    console.log('\n[Test 5] Searching Python classes for "channel"...');
    const searchResults = wikiSystem.searchPythonClasses('channel', { limit: 5 });
    console.log(`✓ Found ${searchResults.length} matching classes`);
    searchResults.forEach(result => {
        console.log(`  - ${result.className}: ${result.description?.substring(0, 50)}...`);
    });
    
    // Test 6: Test get_python_api tool
    console.log('\n[Test 6] Testing get_python_api tool...');
    try {
        const { handler } = await import('./tools/get_python_api.js');
        const result = await handler(
            { class_name: 'CHOP', show_members: true, show_methods: true },
            { wikiSystem }
        );
        
        if (result.error) {
            console.log('✗ Tool returned error:', result.error);
        } else {
            console.log('✓ get_python_api tool working');
            console.log(`  - Class: ${result.class_name}`);
            console.log(`  - Members: ${result.member_count || 0}`);
            console.log(`  - Methods: ${result.method_count || 0}`);
        }
    } catch (error) {
        console.log('✗ Failed to test get_python_api tool:', error.message);
    }
    
    // Test 7: Test search_python_api tool
    console.log('\n[Test 7] Testing search_python_api tool...');
    try {
        const { handler } = await import('./tools/search_python_api.js');
        const result = await handler(
            { query: 'operator', search_in: 'all', limit: 5 },
            { wikiSystem }
        );
        
        if (result.error) {
            console.log('✗ Tool returned error:', result.error);
        } else {
            console.log('✓ search_python_api tool working');
            console.log(`  - Total results: ${result.total_results}`);
            console.log(`  - Classes found: ${result.classes.length}`);
            console.log(`  - Methods found: ${result.methods.length}`);
            console.log(`  - Members found: ${result.members.length}`);
        }
    } catch (error) {
        console.log('✗ Failed to test search_python_api tool:', error.message);
    }
    
    // Test 8: Get stats
    console.log('\n[Test 8] Getting Python API statistics...');
    const stats = wikiSystem.pythonApi.getStats();
    console.log('✓ Python API stats:');
    console.log(`  - Total classes: ${stats.totalClasses}`);
    console.log(`  - Total members: ${stats.totalMembers}`);
    console.log(`  - Total methods: ${stats.totalMethods}`);
    console.log(`  - Last processed: ${stats.lastProcessed || 'Never'}`);
    
    console.log('\n========================================');
    console.log('Test suite completed');
    console.log('========================================');
}

// Run tests
testPythonApi().catch(error => {
    console.error('\n[Test] Fatal error:', error);
    process.exit(1);
});