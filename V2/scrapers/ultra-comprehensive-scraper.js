#!/usr/bin/env node

/**
 * Ultra-Comprehensive TouchDesigner Documentation Scraper
 * Extracts EVERY detail from operator pages with parallel processing
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pLimit from 'p-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://docs.derivative.ca';
const CONCURRENT_REQUESTS = 5; // Parallel requests for speed
const DELAY_MS = 200; // Reduced delay for faster scraping

class UltraComprehensiveScraper {
  constructor() {
    this.limit = pLimit(CONCURRENT_REQUESTS);
    this.results = {};
    this.errors = [];
    this.processed = 0;
    this.startTime = Date.now();
  }

  async fetchPage(url) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.text();
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error.message);
      throw error;
    }
  }

  extractAllParameters($) {
    const parameters = [];
    const seenParams = new Set();
    const menuOptions = {};

    // First, collect all menu options from lists (these describe parameter values)
    $('ul li').each((i, li) => {
      const text = $(li).text();
      const match = text.match(/^(.+?)\s+(\w+)\s*[-–]\s*(.+)$/);
      
      if (match && match[2].length > 1 && match[2].length < 30) {
        const [, label, value, description] = match;
        if (!menuOptions[value]) {
          menuOptions[value] = {
            label: label.trim(),
            value: value.trim(),
            description: description.trim()
          };
        }
      }
    });

    // Find all parameter sections by looking for headings
    $('h2').each((i, heading) => {
      const $heading = $(heading);
      const headingText = $heading.text();
      
      if (headingText.includes('Parameters -')) {
        const sectionName = headingText.replace('Parameters - ', '').replace('[edit]', '').trim();
        
        // Look for DIV elements with IDs after this heading (these are the actual parameters)
        let $current = $heading.next();
        
        while ($current.length && !$current.is('h1, h2, h3')) {
          // Check if it's a parameter DIV
          if ($current.is('div') && $current.attr('id')) {
            const paramId = $current.attr('id');
            
            if (!seenParams.has(paramId) && paramId.length < 50) {
              seenParams.add(paramId);
              
              // Create a more user-friendly label from the ID
              const label = paramId
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase())
                .trim();
              
              // Try to find description from menu options or infer it
              let description = `${label} parameter`;
              let type = this.inferParameterType(paramId, '');
              let options = null;
              
              // Check if this parameter has menu options
              if (menuOptions[paramId]) {
                description = menuOptions[paramId].description;
              }
              
              // Look for related menu options (e.g., for 'type' parameter, look for type options)
              const relatedOptions = Object.entries(menuOptions).filter(([key, opt]) => {
                // Check if this might be an option for this parameter
                return key.toLowerCase().includes(paramId.toLowerCase()) ||
                       opt.description.toLowerCase().includes(paramId.toLowerCase());
              });
              
              if (relatedOptions.length > 0) {
                type = 'Menu';
                options = relatedOptions.map(([key, opt]) => ({
                  label: opt.label,
                  value: opt.value,
                  description: opt.description
                }));
              }
              
              parameters.push({
                name: paramId,
                label: label,
                description: description,
                type: type,
                default: '',
                range: this.extractRange(description),
                options: options,
                section: sectionName
              });
            }
          }
          
          $current = $current.next();
        }
      }
    });

    // Also look for parameter tables (some operators use tables)
    $('table').each((i, table) => {
      const $table = $(table);
      const $rows = $table.find('tr');
      
      // Check if this is a parameter table
      let isParamTable = false;
      $rows.first().find('th, td').each((i, cell) => {
        const text = $(cell).text().toLowerCase();
        if (text.includes('parameter') || text.includes('name') || text.includes('label')) {
          isParamTable = true;
        }
      });

      if (isParamTable) {
        $rows.slice(1).each((i, row) => {
          const cells = $(row).find('td');
          if (cells.length >= 2) {
            const paramName = $(cells[0]).text().trim();
            const paramDesc = $(cells[1]).text().trim();
            const paramType = cells.length >= 3 ? $(cells[2]).text().trim() : this.inferParameterType(paramName, paramDesc);
            const paramDefault = cells.length >= 4 ? $(cells[3]).text().trim() : '';
            
            if (paramName && !seenParams.has(paramName) && paramName.length < 100) {
              seenParams.add(paramName);
              parameters.push({
                name: paramName,
                label: paramName,
                description: paramDesc,
                type: paramType || 'Float',
                default: paramDefault,
                range: this.extractRange(paramDesc),
                options: this.extractOptions(paramDesc),
                section: 'General'
              });
            }
          }
        });
      }
    });

    return parameters;
  }

  extractRange(description) {
    const rangeMatch = description.match(/(?:range|between|from)\s*([-\d.]+)\s*(?:to|and|-)\s*([-\d.]+)/i);
    if (rangeMatch) {
      return {
        min: parseFloat(rangeMatch[1]),
        max: parseFloat(rangeMatch[2])
      };
    }
    return null;
  }

  extractOptions(description) {
    const optionsMatch = description.match(/(?:options|choices|values):\s*([^.]+)/i);
    if (optionsMatch) {
      return optionsMatch[1].split(/[,;]/).map(opt => opt.trim()).filter(opt => opt);
    }
    return null;
  }

  inferParameterType(name, description) {
    const nameL = name.toLowerCase();
    const descL = description.toLowerCase();
    
    // Boolean types
    if (nameL.includes('enable') || nameL.includes('active') || nameL.includes('on/off') ||
        descL.includes('toggle') || descL.includes('enable') || descL.includes('disable')) {
      return 'Toggle';
    }
    
    // File types
    if (nameL.includes('file') || nameL.includes('path') || 
        descL.includes('file') || descL.includes('path') || descL.includes('.jpg') || descL.includes('.png')) {
      return 'File';
    }
    
    // Color types
    if (nameL.includes('color') || nameL.includes('colour') || nameL.includes('rgb')) {
      return 'RGB';
    }
    
    // Menu types
    if (nameL.includes('mode') || nameL.includes('type') || nameL.includes('method') ||
        descL.includes('menu') || descL.includes('dropdown') || descL.includes('select from')) {
      return 'Menu';
    }
    
    // Integer types
    if (nameL.includes('count') || nameL.includes('number') || nameL.includes('samples') ||
        descL.includes('integer') || descL.includes('whole number')) {
      return 'Int';
    }
    
    // String types
    if (nameL.includes('name') || nameL.includes('text') || nameL.includes('string') ||
        descL.includes('text') || descL.includes('string')) {
      return 'Str';
    }
    
    // XY types
    if (nameL.includes('position') || nameL.includes('offset') || nameL.includes('translate')) {
      return 'XY';
    }
    
    // XYZ types
    if (nameL.includes('3d') || (nameL.includes('position') && descL.includes('3d'))) {
      return 'XYZ';
    }
    
    // Default to Float
    return 'Float';
  }

  extractExamples($) {
    const examples = [];
    
    // Look for example sections
    $('h2, h3, h4').each((i, heading) => {
      const $heading = $(heading);
      const headingText = $heading.text().toLowerCase();
      
      if (headingText.includes('example') || headingText.includes('usage')) {
        let $next = $heading.next();
        let exampleContent = '';
        
        while ($next.length && !$next.is('h1, h2, h3')) {
          if ($next.is('pre, code')) {
            exampleContent += $next.text().trim() + '\n';
          } else if ($next.is('p, ul, ol')) {
            exampleContent += $next.text().trim() + '\n';
          }
          $next = $next.next();
        }
        
        if (exampleContent) {
          examples.push({
            title: $heading.text().trim(),
            content: exampleContent.trim()
          });
        }
      }
    });
    
    return examples;
  }

  extractTipsAndNotes($) {
    const tips = [];
    
    // Look for tip/note sections
    $('.mw-parser-output').find('p, li').each((i, element) => {
      const text = $(element).text();
      const lowerText = text.toLowerCase();
      
      if (lowerText.includes('tip:') || lowerText.includes('note:') || 
          lowerText.includes('important:') || lowerText.includes('warning:')) {
        tips.push(text.trim());
      }
    });
    
    // Look for special callout boxes
    $('.note, .tip, .warning, .important').each((i, element) => {
      tips.push($(element).text().trim());
    });
    
    return tips;
  }

  extractRelatedOperators($, currentOp) {
    const related = [];
    const seenRelated = new Set();
    
    // Extract from "See Also" sections
    $('h2, h3').each((i, heading) => {
      const $heading = $(heading);
      if ($heading.text().toLowerCase().includes('see also') || 
          $heading.text().toLowerCase().includes('related')) {
        let $next = $heading.next();
        while ($next.length && !$next.is('h1, h2, h3')) {
          $next.find('a').each((i, link) => {
            const href = $(link).attr('href');
            const text = $(link).text().trim();
            if (href && text && !seenRelated.has(text) && text !== currentOp) {
              seenRelated.add(text);
              related.push({
                name: text,
                url: href.startsWith('http') ? href : BASE_URL + href
              });
            }
          });
          $next = $next.next();
        }
      }
    });
    
    return related;
  }

  extractCodeSnippets($) {
    const snippets = [];
    
    // Extract from code blocks
    $('pre, code').each((i, element) => {
      const code = $(element).text().trim();
      if (code && code.length > 10) {
        snippets.push({
          code: code,
          language: $(element).attr('class') || 'python'
        });
      }
    });
    
    return snippets;
  }

  async scrapeOperatorDetails(operator) {
    try {
      const html = await this.fetchPage(operator.url);
      const $ = cheerio.load(html);
      
      // Extract comprehensive description
      let description = '';
      $('.mw-parser-output > p').each((i, p) => {
        const text = $(p).text().trim();
        if (text && !text.startsWith('See also') && !text.startsWith('Related:')) {
          description += text + '\n\n';
        }
      });
      description = description.trim();
      
      // Extract ALL parameters with no limit
      const parameters = this.extractAllParameters($);
      
      // Extract inputs/outputs with detailed info
      const inputs = this.extractInputsOutputs($, 'input', operator.category);
      const outputs = this.extractInputsOutputs($, 'output', operator.category);
      
      // Extract examples
      const examples = this.extractExamples($);
      
      // Extract tips and notes
      const tips = this.extractTipsAndNotes($);
      
      // Extract related operators
      const related = this.extractRelatedOperators($, operator.name);
      
      // Extract code snippets
      const codeSnippets = this.extractCodeSnippets($);
      
      // Extract keyboard shortcuts
      const shortcuts = this.extractKeyboardShortcuts($);
      
      // Extract performance notes
      const performanceNotes = this.extractPerformanceNotes($);
      
      this.processed++;
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
      console.log(`✅ [${this.processed}] ${operator.name} - ${parameters.length} params (${elapsed}s)`);
      
      return {
        name: operator.name,
        fullName: operator.fullName,
        category: operator.category,
        description: description,
        parameters: parameters, // ALL parameters, no limit!
        inputs: inputs,
        outputs: outputs,
        examples: examples,
        tips: tips,
        related: related,
        codeSnippets: codeSnippets,
        shortcuts: shortcuts,
        performanceNotes: performanceNotes,
        subcategory: this.detectSubcategory(operator),
        useCases: this.generateUseCases(operator, description),
        url: operator.url,
        scraped: true,
        scrapedAt: new Date().toISOString(),
        parameterCount: parameters.length
      };
      
    } catch (error) {
      console.error(`❌ Error scraping ${operator.name}:`, error.message);
      this.errors.push(`${operator.name}: ${error.message}`);
      return null;
    }
  }

  extractInputsOutputs($, type, category) {
    const items = [];
    const typeRegex = new RegExp(type, 'i');
    
    $('h2, h3, h4').each((i, heading) => {
      const $heading = $(heading);
      if (typeRegex.test($heading.text())) {
        let $next = $heading.next();
        while ($next.length && !$next.is('h1, h2, h3')) {
          if ($next.is('ul, ol')) {
            $next.find('li').each((i, li) => {
              const text = $(li).text().trim();
              items.push({
                type: category,
                description: text,
                index: i
              });
            });
          } else if ($next.is('p')) {
            const text = $next.text().trim();
            if (text) {
              items.push({
                type: category,
                description: text,
                index: 0
              });
            }
          }
          $next = $next.next();
        }
      }
    });
    
    // Default if none found
    if (items.length === 0 && type === 'output') {
      items.push({
        type: category,
        description: `${category} output`,
        index: 0
      });
    }
    
    return items;
  }

  extractKeyboardShortcuts($) {
    const shortcuts = [];
    
    $('.mw-parser-output').find('*').each((i, element) => {
      const text = $(element).text();
      const shortcutMatch = text.match(/(?:shortcut|hotkey|keyboard).*?([Ctrl|Alt|Shift|Cmd]+\+\w+)/i);
      if (shortcutMatch) {
        shortcuts.push({
          key: shortcutMatch[1],
          description: text.trim()
        });
      }
    });
    
    return shortcuts;
  }

  extractPerformanceNotes($) {
    const notes = [];
    
    $('.mw-parser-output p, .mw-parser-output li').each((i, element) => {
      const text = $(element).text();
      const lowerText = text.toLowerCase();
      
      if (lowerText.includes('performance') || lowerText.includes('optimization') ||
          lowerText.includes('gpu') || lowerText.includes('cpu') ||
          lowerText.includes('memory') || lowerText.includes('efficient')) {
        notes.push(text.trim());
      }
    });
    
    return notes;
  }

  detectSubcategory(operator) {
    const name = operator.name.toLowerCase();
    
    const subcategories = {
      'TOP': {
        'Input': ['in', 'device', 'file', 'stream', 'kinect', 'video'],
        'Output': ['out', 'render', 'export'],
        'Filters': ['blur', 'filter', 'edge', 'sharpen', 'denoise'],
        'Compositing': ['composite', 'over', 'add', 'multiply', 'blend'],
        'Transform': ['transform', 'fit', 'crop', 'scale', 'rotate'],
        'Generators': ['noise', 'ramp', 'constant', 'pattern', 'circle'],
        'Analysis': ['analyze', 'histogram', 'threshold'],
        '3D': ['render', 'depth', 'normal']
      },
      'CHOP': {
        'Audio': ['audio', 'sound', 'spectrum', 'pitch'],
        'Communication': ['midi', 'osc', 'serial', 'tcp', 'udp'],
        'Math & Logic': ['math', 'logic', 'expression', 'script'],
        'Generators': ['lfo', 'noise', 'wave', 'pattern', 'timer'],
        'Filters': ['filter', 'lag', 'smooth', 'limit'],
        'Input': ['in', 'device', 'keyboard', 'mouse'],
        'Output': ['out', 'export'],
        'Time': ['timer', 'clock', 'speed', 'delay']
      },
      'SOP': {
        'Primitives': ['box', 'sphere', 'torus', 'grid', 'circle'],
        'Modify': ['transform', 'facet', 'subdivide', 'extrude'],
        'Generate': ['copy', 'scatter', 'line', 'curve'],
        'Import/Export': ['file', 'in', 'out'],
        'Deform': ['bend', 'twist', 'lattice', 'noise'],
        'Attributes': ['attribute', 'point', 'primitive']
      },
      'DAT': {
        'Data': ['table', 'merge', 'select', 'convert'],
        'Script': ['script', 'execute', 'python', 'evaluate'],
        'Communication': ['tcp', 'udp', 'serial', 'websocket'],
        'File': ['file', 'folder', 'text'],
        'Control': ['panel', 'parameter', 'info']
      },
      'MAT': {
        'Shaders': ['phong', 'pbr', 'constant', 'wireframe'],
        'GLSL': ['glsl', 'shader'],
        'Textures': ['texture', 'map'],
        'Effects': ['glow', 'depth', 'shadow']
      },
      'COMP': {
        'Panels': ['container', 'button', 'slider', 'field'],
        '3D': ['geometry', 'camera', 'light', 'bone'],
        'Dynamics': ['actor', 'force', 'constraint'],
        'Utility': ['base', 'time', 'engine']
      },
      'POP': {
        'Sources': ['source', 'birth', 'emit'],
        'Forces': ['force', 'gravity', 'wind', 'turbulence'],
        'Modify': ['property', 'color', 'size', 'velocity'],
        'Collision': ['collision', 'bounce', 'hit'],
        'Utility': ['merge', 'group', 'kill']
      }
    };
    
    const categoryMap = subcategories[operator.category] || {};
    
    for (const [subcat, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => name.includes(keyword))) {
        return subcat;
      }
    }
    
    return 'General';
  }

  generateUseCases(operator, description) {
    const useCases = [];
    const name = operator.name.toLowerCase();
    const desc = description.toLowerCase();
    
    // Generate specific use cases based on operator type
    const useCasePatterns = {
      'noise': [
        'Procedural texture generation',
        'Organic animation and movement',
        'Terrain and landscape creation',
        'Adding natural variation to parameters'
      ],
      'render': [
        '3D scene visualization',
        'Real-time graphics rendering',
        'Multi-pass rendering workflows',
        'Shadow and reflection generation'
      ],
      'audio': [
        'Sound reactive visuals',
        'Audio analysis and visualization',
        'Beat detection and rhythm sync',
        'Frequency spectrum analysis'
      ],
      'composite': [
        'Layer blending and compositing',
        'Multi-source image combination',
        'Alpha channel operations',
        'Visual effects compositing'
      ],
      'transform': [
        'Image positioning and scaling',
        'Rotation and skew operations',
        'Coordinate space conversions',
        'Animation and motion graphics'
      ],
      'filter': [
        'Image enhancement and correction',
        'Blur and sharpening effects',
        'Edge detection and analysis',
        'Custom convolution operations'
      ]
    };
    
    // Find matching patterns
    for (const [pattern, cases] of Object.entries(useCasePatterns)) {
      if (name.includes(pattern) || desc.includes(pattern)) {
        useCases.push(...cases);
      }
    }
    
    // Add category-specific use cases
    if (operator.category === 'TOP') {
      useCases.push('Real-time image processing');
      useCases.push('Texture manipulation and effects');
    } else if (operator.category === 'CHOP') {
      useCases.push('Parameter animation and control');
      useCases.push('Data processing and analysis');
    }
    
    // Ensure we have at least 2 use cases
    if (useCases.length < 2) {
      useCases.push(`${operator.category} data processing`);
      useCases.push('Real-time parameter control');
    }
    
    return [...new Set(useCases)].slice(0, 6); // Remove duplicates, limit to 6
  }

  async scrapeCategory(category) {
    console.log(`\n🚀 Scraping ${category} operators...`);
    
    // Get operator list
    const categoryUrl = `${BASE_URL}/Category:${category}s`;
    const html = await this.fetchPage(categoryUrl);
    const $ = cheerio.load(html);
    
    const operators = [];
    $('.mw-category-group a').each((i, element) => {
      const $link = $(element);
      const href = $link.attr('href');
      const title = $link.attr('title') || $link.text().trim();
      
      if (href && title && !href.includes('Category:') && !href.includes('Template:')) {
        operators.push({
          name: title.replace(` ${category}`, '').trim(),
          fullName: title,
          url: href.startsWith('http') ? href : BASE_URL + href,
          category: category
        });
      }
    });
    
    console.log(`📋 Found ${operators.length} ${category} operators`);
    
    // Process operators in parallel for speed
    const operatorPromises = operators.map(op => 
      this.limit(() => this.scrapeOperatorDetails(op))
    );
    
    const results = await Promise.all(operatorPromises);
    return results.filter(r => r !== null);
  }

  async scrapeAll() {
    console.log('🚀 Ultra-Comprehensive TouchDesigner Documentation Scraper');
    console.log('=' .repeat(60));
    console.log(`📊 Parallel requests: ${CONCURRENT_REQUESTS}`);
    console.log(`⏱️  Delay between requests: ${DELAY_MS}ms\n`);
    
    const categories = ['TOP', 'CHOP', 'SOP', 'DAT', 'MAT', 'COMP', 'POP'];
    
    for (const category of categories) {
      try {
        const operators = await this.scrapeCategory(category);
        
        // Save results
        const metadata = {
          category: category,
          operatorCount: operators.length,
          totalParameters: operators.reduce((sum, op) => sum + (op.parameterCount || 0), 0),
          lastUpdated: new Date().toISOString(),
          operators: operators
        };
        
        const filename = `ultra_comprehensive_${category.toLowerCase()}_metadata.json`;
        const filepath = path.join(__dirname, '..', 'metadata', filename);
        
        await fs.writeFile(filepath, JSON.stringify(metadata, null, 2));
        console.log(`💾 Saved ${filename} - ${operators.length} operators, ${metadata.totalParameters} total parameters`);
        
        this.results[category] = metadata;
        
      } catch (error) {
        console.error(`❌ Failed to scrape ${category}:`, error.message);
        this.errors.push(`${category}: ${error.message}`);
      }
    }
    
    // Save combined metadata
    const allOperators = [];
    for (const data of Object.values(this.results)) {
      allOperators.push(...data.operators);
    }
    
    const combinedMetadata = {
      totalOperators: allOperators.length,
      totalParameters: allOperators.reduce((sum, op) => sum + (op.parameterCount || 0), 0),
      categories: Object.keys(this.results),
      lastUpdated: new Date().toISOString(),
      operators: allOperators
    };
    
    await fs.writeFile(
      path.join(__dirname, '..', 'metadata', 'ultra_comprehensive_all_operators.json'),
      JSON.stringify(combinedMetadata, null, 2)
    );
    
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(`\n✨ Scraping completed in ${elapsed} seconds!`);
    console.log(`📊 Total operators: ${allOperators.length}`);
    console.log(`📊 Total parameters: ${combinedMetadata.totalParameters}`);
    console.log(`❌ Errors: ${this.errors.length}`);
    
    return this.results;
  }
}

// Install p-limit if needed
async function ensureDependencies() {
  try {
    await import('p-limit');
  } catch {
    console.log('📦 Installing p-limit for parallel processing...');
    const { execSync } = await import('child_process');
    execSync('npm install p-limit', { cwd: path.join(__dirname, '..') });
  }
}

// Main execution
async function main() {
  await ensureDependencies();
  
  const scraper = new UltraComprehensiveScraper();
  
  try {
    await scraper.scrapeAll();
    console.log('\n🎉 Ultra-comprehensive scraping completed successfully!');
  } catch (error) {
    console.error('\n❌ Scraping failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default UltraComprehensiveScraper;