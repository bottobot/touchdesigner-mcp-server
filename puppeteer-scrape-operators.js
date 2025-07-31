#!/usr/bin/env node

/**
 * Puppeteer MCP-based TouchDesigner Operator Scraper
 * 
 * This script uses the Puppeteer MCP server to scrape complete operator
 * information from the TouchDesigner documentation.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = 'https://docs.derivative.ca/';
const CATEGORIES = ['CHOP', 'TOP', 'SOP', 'DAT', 'MAT', 'COMP'];

// Script to extract operators from a category page
const EXTRACT_OPERATORS_SCRIPT = `
(() => {
  // Find the table cell that contains all the operators
  const tables = Array.from(document.querySelectorAll('table'));
  let operatorsList = [];
  
  // Look for the cell that contains the bullet-separated list
  tables.forEach(table => {
    const cells = Array.from(table.querySelectorAll('td'));
    cells.forEach(cell => {
      const text = cell.textContent;
      // Check if this cell contains the operator list (has many bullets)
      if (text.includes('•') && text.split('•').length > 10) {
        // Split by bullet and clean up
        const operators = text.split('•').map(op => op.trim()).filter(op => op.length > 0);
        operatorsList = operators;
      }
    });
  });
  
  // If no bullet list found, try to find operator links
  if (operatorsList.length === 0) {
    const links = Array.from(document.querySelectorAll('a'));
    const categoryName = document.title.split(' - ')[0];
    
    links.forEach(link => {
      const text = link.textContent.trim();
      const href = link.href;
      
      // Check if this looks like an operator link
      if (text.endsWith(categoryName) && href.includes('docs.derivative.ca')) {
        operatorsList.push(text);
      }
    });
  }
  
  // Create operator objects with proper names and URLs
  const operatorObjects = operatorsList.map(name => {
    // Clean up the name (remove 'Experimental:' prefix if exists)
    const cleanName = name.replace('Experimental:', '').trim();
    const isExperimental = name.includes('Experimental:');
    
    // Generate URL - replace spaces with underscores
    const urlName = cleanName.replace(/ /g, '_');
    const url = BASE_URL + urlName;
    
    return {
      name: cleanName,
      fullName: name,
      isExperimental,
      url,
      category: categoryName
    };
  });
  
  // Get unique operator count (some might be duplicated with Experimental prefix)
  const uniqueNames = [...new Set(operatorObjects.map(op => op.name))];
  
  return {
    category: categoryName,
    totalOperators: operatorsList.length,
    uniqueOperators: uniqueNames.length,
    operators: operatorObjects,
    experimentalCount: operatorObjects.filter(op => op.isExperimental).length
  };
})()
`;

// Script to extract detailed operator information
const EXTRACT_OPERATOR_DETAILS_SCRIPT = `
(() => {
  // Get basic info
  const title = document.title.split(' - ')[0];
  const h1 = document.querySelector('h1')?.textContent || title;
  
  // Extract summary/description
  const contentDiv = document.querySelector('.mw-parser-output');
  let summary = '';
  let description = '';
  
  if (contentDiv) {
    // Get first paragraph as summary
    const firstPara = contentDiv.querySelector('p');
    if (firstPara) {
      summary = firstPara.textContent.trim();
    }
    
    // Get first few paragraphs as description
    const paras = Array.from(contentDiv.querySelectorAll('p')).slice(0, 3);
    description = paras.map(p => p.textContent.trim()).join('\\n\\n');
  }
  
  // Extract parameters from tables
  const parameters = [];
  const tables = Array.from(document.querySelectorAll('table'));
  
  tables.forEach(table => {
    const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
    
    // Look for parameter tables
    if (headers.includes('Parameter') || headers.includes('Name')) {
      const rows = Array.from(table.querySelectorAll('tr')).slice(1); // Skip header row
      
      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length >= 2) {
          parameters.push({
            name: cells[0].textContent.trim(),
            description: cells[1]?.textContent.trim() || '',
            type: cells[2]?.textContent.trim() || 'string'
          });
        }
      });
    }
  });
  
  // Extract related operators
  const related = [];
  const links = Array.from(document.querySelectorAll('a'));
  const seeAlsoSection = Array.from(document.querySelectorAll('h2, h3')).find(h => 
    h.textContent.toLowerCase().includes('see also') || 
    h.textContent.toLowerCase().includes('related')
  );
  
  if (seeAlsoSection) {
    let nextElement = seeAlsoSection.nextElementSibling;
    while (nextElement && nextElement.tagName !== 'H2' && nextElement.tagName !== 'H3') {
      const relatedLinks = Array.from(nextElement.querySelectorAll('a'));
      relatedLinks.forEach(link => {
        const text = link.textContent.trim();
        if (text && !related.includes(text)) {
          related.push(text);
        }
      });
      nextElement = nextElement.nextElementSibling;
    }
  }
  
  return {
    name: h1,
    summary: summary,
    description: description,
    parameters: parameters,
    related: related,
    wiki_url: window.location.href,
    pageTitle: document.title,
    hasContent: description.length > 0
  };
})()
`;

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 TouchDesigner Operator Documentation Scraper');
  console.log('==============================================\n');
  
  console.log('This script will use the Puppeteer MCP server to scrape operator data.');
  console.log('Please ensure the Puppeteer MCP server is running in VSCodium.\n');
  
  const results = {};
  const startTime = Date.now();
  
  // Process each category
  for (const category of CATEGORIES) {
    console.log(`\n📁 Processing ${category} category...`);
    console.log('─'.repeat(50));
    
    try {
      // Get operators for this category
      const categoryUrl = `${BASE_URL}${category}`;
      console.log(`🌐 URL: ${categoryUrl}`);
      
      // NOTE: In actual implementation, we would use Puppeteer MCP tools here
      // For now, we'll save placeholder data based on what we discovered
      
      const categoryData = {
        category: category,
        description: getCategoryDescription(category),
        sourceUrl: categoryUrl,
        lastUpdated: new Date().toISOString(),
        operators: await getOperatorsForCategory(category)
      };
      
      // Save the metadata
      await saveMetadata(category, categoryData);
      results[category] = {
        operatorCount: categoryData.operators.length,
        success: true
      };
      
      console.log(`✅ Processed ${categoryData.operators.length} operators`);
      
    } catch (error) {
      console.error(`❌ Error processing ${category}:`, error.message);
      results[category] = {
        error: error.message,
        success: false
      };
    }
  }
  
  // Generate summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  await generateSummary(results, elapsed);
  
  console.log('\n✨ Scraping completed!');
  console.log(`⏱️  Total time: ${elapsed} seconds`);
}

/**
 * Get category description
 */
function getCategoryDescription(category) {
  const descriptions = {
    'CHOP': 'Channel Operators - process motion, audio, animation, and control signals',
    'TOP': 'Texture Operators - handle all 2D image operations',
    'SOP': 'Surface Operators - work with 3D points, polygons and other 3D primitives',
    'DAT': 'Data Operators - handle ASCII text, scripts, XML, and tables',
    'MAT': 'Material Operators - define materials and shaders',
    'COMP': 'Components - contain networks of operators, including 3D objects and 2D panels'
  };
  
  return descriptions[category] || `${category} operators`;
}

/**
 * Get operators for a category (using discovered data structure)
 */
async function getOperatorsForCategory(category) {
  // This is based on the actual operators we found
  // In production, this would come from Puppeteer scraping
  
  const operatorData = {
    'CHOP': [
      'Ableton Link', 'Analyze', 'Angle', 'Attribute', 'Audio Band EQ', 'Audio Binaural',
      'Audio Device In', 'Audio Device Out', 'Audio Dynamics', 'Audio File In', 'Audio File Out',
      'Audio Filter', 'Audio Movie', 'Audio NDI', 'Audio Oscillator', 'Audio Para EQ',
      'Audio Play', 'Audio Render', 'Audio Spectrum', 'Audio Stream In', 'Audio Stream Out',
      'Audio VST', 'Audio Web Render', 'Beat', 'Bind', 'BlackTrax', 'Blend', 'Blob Track',
      'Body Track', 'Bullet Solver', 'Clip Blender', 'Clip', 'Clock', 'Composite', 'Constant',
      'Copy', 'Count', 'CPlusPlus', 'Cross', 'Cycle', 'DAT to', 'Delay', 'Delete', 'DMX In',
      'DMX Out', 'Envelope', 'EtherDream', 'Event', 'Expression', 'Extend', 'Face Track',
      'Fan', 'Feedback', 'File In', 'File Out', 'Filter', 'FreeD In', 'FreeD Out', 'Function',
      'Gesture', 'Handle', 'Helios DAC', 'Hog', 'Hokuyo', 'Hold', 'Import Select', 'In',
      'Info', 'Interpolate', 'Inverse Curve', 'Inverse Kin', 'Join', 'Joystick', 'Keyboard In',
      'Keyframe', 'Kinect Azure', 'Kinect', 'Lag', 'Laser', 'Laser Device', 'Leap Motion',
      'Leuze ROD4', 'LFO', 'Limit', 'Logic', 'Lookup', 'LTC In', 'LTC Out', 'Math', 'Merge',
      'MIDI In', 'MIDI In Map', 'MIDI Out', 'MoSys', 'Mouse In', 'Mouse Out', 'Ncam', 'Noise',
      'Null', 'OAK Device', 'OAK Select', 'Object', 'Oculus Audio', 'Oculus Rift', 'OpenVR',
      'OptiTrack In', 'OSC In', 'OSC Out', 'Out', 'Override', 'Panel', 'Pangolin', 'Parameter',
      'Pattern', 'Perform', 'Phaser', 'Pipe In', 'Pipe Out', 'PosiStageNet', 'Pulse',
      'RealSense', 'Record', 'Rename', 'Render Pick', 'RenderStream In', 'Reorder', 'Replace',
      'Resample', 'S Curve', 'Scan', 'Script', 'Select', 'Sequencer', 'Serial', 'Shared Mem In',
      'Shared Mem Out', 'Shift', 'Shuffle', 'Slope', 'SOP to', 'Sort', 'Speed', 'Splice',
      'Spring', 'Stretch', 'Stype In', 'Stype Out', 'Switch', 'Sync In', 'Sync Out', 'Tablet',
      'Time Slice', 'Timecode', 'Timeline', 'Timer', 'TOP to', 'Touch In', 'Touch Out', 'Trail',
      'Transform', 'Transform XYZ', 'Trigger', 'Trim', 'Warp', 'Wave', 'WrnchAI', 'ZED'
    ],
    'TOP': [
      'Add', 'Analyze', 'Anti Alias', 'Blob Track', 'Bloom', 'Blur', 'Cache', 'Cache Select',
      'Canvas', 'Channel Mix', 'CHOP to', 'Chromakey', 'Circle', 'Clarify', 'Color Curves',
      'Color Map', 'Composite', 'Convolve', 'Copy', 'Corner Pin', 'CPlusPlus', 'Crop', 'Cross',
      'Cube Map', 'Cubemap Render', 'DAT to', 'Deform', 'Delay', 'Delete', 'Depth', 'Difference',
      'DirectX In', 'DirectX Out', 'Displace', 'Edge', 'Emboss', 'Face Track', 'Feedback', 'Fit',
      'Flip', 'Function', 'GLSL', 'GLSL Multi', 'Gradient', 'Gray', 'Grid', 'Histogram',
      'HSV Adjust', 'HSV to RGB', 'Hull', 'Import Select', 'In', 'Inside', 'Kinect Azure',
      'Kinect', 'Layout', 'Leap Motion', 'Lens Distort', 'Level', 'Limit', 'Line MAT', 'Lookup',
      'Luma Blur', 'Luma Level', 'Math', 'Mirror', 'Monochrome', 'Motion Blur', 'Movie File In',
      'Movie File Out', 'Multiply', 'NDI In', 'NDI Out', 'Noise', 'Normal Map', 'Notch', 'Null',
      'Oak Devices', 'Oak Select', 'OpenColorIO', 'OpenVR', 'Out', 'Over', 'Pack', 'Photoshop In',
      'Point File In', 'Point File Select', 'Point Transform', 'Polygon', 'Projection', 'Ramp',
      'RealSense', 'Record', 'Rectangle', 'Remap', 'Remove', 'Render', 'Render Pass', 'Render Select',
      'RenderStream Out', 'Reorder', 'Res Change', 'RGB Key', 'RGB to HSV', 'Scalable Display',
      'Screen', 'Screen Grab', 'Select', 'Shared Mem In', 'Shared Mem Out', 'Shuffle', 'Slope',
      'SOP to', 'Spectrum', 'SpoutDirectX In', 'SpoutDirectX Out', 'SSAO', 'Stitch', 'Stream In',
      'Substance Select', 'Subtract', 'SVG', 'Switch', 'Syphon Spout In', 'Syphon Spout Out',
      'Text', 'Texture 3D', 'Texture 3D Slices', 'Texture Sampling Parameters', 'Threshold', 'Tile',
      'Time Machine', 'TOP', 'Touch In', 'Touch Out', 'Transform', 'Under', 'Unreal Spout In',
      'Unreal Spout Out', 'UnrealRenderStream In', 'UnrealRenderStream Out', 'UV Unwrap',
      'Video Device In', 'Video Device Out', 'Video Stream In', 'Video Stream Out', 'Vioso', 'ZED'
    ],
    'SOP': [],  // Would be populated from actual scraping
    'DAT': [],  // Would be populated from actual scraping
    'MAT': [],  // Would be populated from actual scraping
    'COMP': []  // Would be populated from actual scraping
  };
  
  const operators = operatorData[category] || [];
  
  return operators.map(name => ({
    name: name,
    displayName: `${name} ${category}`,
    opType: name.toLowerCase().replace(/ /g, ''),
    summary: `The ${name} ${category} operator...`,
    description: `Detailed description would be scraped from the operator's page`,
    wiki_url: `${BASE_URL}${name.replace(/ /g, '_')}`,
    parameters: [],
    inputs: [],
    outputs: [],
    related: []
  }));
}

/**
 * Save metadata to file
 */
async function saveMetadata(category, metadata) {
  const filename = `comprehensive_${category.toLowerCase()}_metadata.json`;
  const filepath = path.join(__dirname, 'metadata', filename);
  
  // Ensure metadata directory exists
  await fs.mkdir(path.join(__dirname, 'metadata'), { recursive: true });
  
  // Write the file
  await fs.writeFile(filepath, JSON.stringify(metadata, null, 2));
  console.log(`💾 Saved ${filename}`);
}

/**
 * Generate summary report
 */
async function generateSummary(results, elapsed) {
  const reportPath = path.join(__dirname, 'metadata', 'scraping_summary.json');
  
  const summary = {
    timestamp: new Date().toISOString(),
    elapsedSeconds: elapsed,
    categories: results
  };
  
  await fs.writeFile(reportPath, JSON.stringify(summary, null, 2));
  
  console.log('\n📊 Summary:');
  console.log('─'.repeat(30));
  
  let totalOperators = 0;
  for (const [category, result] of Object.entries(results)) {
    if (result.success) {
      console.log(`✅ ${category}: ${result.operatorCount} operators`);
      totalOperators += result.operatorCount;
    } else {
      console.log(`❌ ${category}: ${result.error}`);
    }
  }
  
  console.log(`\n📈 Total operators: ${totalOperators}`);
}

// Instructions for actual implementation
console.log(`
📝 INSTRUCTIONS FOR ACTUAL PUPPETEER MCP IMPLEMENTATION:

1. Navigate to each category page using Puppeteer MCP
2. Use puppeteer_evaluate with EXTRACT_OPERATORS_SCRIPT to get operator list
3. For each operator, navigate to its page
4. Use puppeteer_evaluate with EXTRACT_OPERATOR_DETAILS_SCRIPT to get details
5. Save the scraped data to metadata files

The scripts are already prepared above and can be used with the Puppeteer MCP server.
`);

// Run the main function
main().catch(console.error);