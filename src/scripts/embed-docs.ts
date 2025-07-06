import * as fs from 'fs/promises';
import * as path from 'path';
import { config } from 'dotenv';
import { DocumentationEmbedder } from '../docs/DocumentationEmbedder.js';

config();

const TD_DOCS_PATH = process.env.TD_DOCS_PATH || './touchdesigner-docs';

async function embedDocumentation() {
  console.log('🚀 Starting documentation embedding process...');
  
  const embedder = new DocumentationEmbedder(TD_DOCS_PATH);
  
  try {
    // Initialize the embedder
    console.log('📚 Initializing documentation embedder...');
    await embedder.initialize();
    console.log('✅ Embedder initialized successfully');
    
    // Embed built-in documentation
    console.log('\n📝 Embedding built-in TouchDesigner documentation...');
    await embedder.embedBuiltInDocs();
    console.log('✅ Built-in documentation embedded');
    
    // Scan and embed custom documentation
    console.log('\n🔍 Scanning for custom documentation files...');
    const docFiles = await scanDocumentationFiles(TD_DOCS_PATH);
    console.log(`📁 Found ${docFiles.length} documentation files`);
    
    // Embed each file
    for (const filePath of docFiles) {
      const relativePath = path.relative(TD_DOCS_PATH, filePath);
      console.log(`\n📄 Processing: ${relativePath}`);
      
      try {
        const ext = path.extname(filePath).toLowerCase();
        let content: string;
        
        // Read file based on type
        if (ext === '.md' || ext === '.txt') {
          content = await fs.readFile(filePath, 'utf-8');
        } else if (ext === '.pdf') {
          console.log('  ⚠️  PDF parsing requires manual implementation');
          continue;
        } else if (ext === '.html') {
          content = await fs.readFile(filePath, 'utf-8');
          // Strip HTML tags for basic processing
          content = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        } else {
          console.log(`  ⚠️  Unsupported file type: ${ext}`);
          continue;
        }
        
        // Extract metadata from file path
        const pathParts = relativePath.split(path.sep);
        const metadata: Record<string, any> = {
          filePath: relativePath,
          category: pathParts[0] || 'general',
          subcategory: pathParts[1] || '',
          filename: path.basename(filePath),
          fileType: ext.substring(1)
        };
        
        // Special handling for operator documentation
        if (pathParts[0] === 'operators' && pathParts[1]) {
          metadata.operatorFamily = pathParts[1];
          metadata.operatorName = path.basename(filePath, ext);
        }
        
        // Embed the document
        await embedder.embedDocument(content, metadata);
        console.log(`  ✅ Successfully embedded`);
        
      } catch (error) {
        console.error(`  ❌ Error processing file: ${error.message}`);
      }
    }
    
    // Update metadata
    console.log('\n📊 Updating metadata...');
    const stats = await getEmbeddingStats(embedder);
    const metadataPath = path.join(TD_DOCS_PATH, 'metadata.json');
    const metadata = {
      version: '1.0.0',
      touchdesignerVersion: '2023.11290',
      totalDocuments: stats.totalDocuments,
      totalChunks: stats.totalChunks,
      lastUpdated: new Date().toISOString(),
      categories: stats.categories
    };
    
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    console.log('✅ Metadata updated');
    
    // Final summary
    console.log('\n✨ Documentation embedding complete!');
    console.log(`📊 Summary:`);
    console.log(`   - Total documents: ${stats.totalDocuments}`);
    console.log(`   - Total chunks: ${stats.totalChunks}`);
    console.log(`   - Categories: ${Object.keys(stats.categories).join(', ')}`);
    
    console.log('\n🎯 Next steps:');
    console.log('   1. Start the MCP server with `npm start`');
    console.log('   2. Use documentation-aware tools in your TouchDesigner workflows');
    console.log('   3. Add more documentation files and re-run `npm run embed-docs`');
    
  } catch (error) {
    console.error('❌ Error during embedding process:', error);
    process.exit(1);
  }
}

async function scanDocumentationFiles(basePath: string): Promise<string[]> {
  const files: string[] = [];
  const supportedExtensions = ['.md', '.txt', '.pdf', '.html'];
  
  async function scan(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip hidden directories and node_modules
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await scan(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (supportedExtensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  await scan(basePath);
  return files;
}

async function getEmbeddingStats(embedder: DocumentationEmbedder): Promise<{
  totalDocuments: number;
  totalChunks: number;
  categories: Record<string, number>;
}> {
  // This is a simplified version - in production, you'd query the vector DB
  // For now, we'll estimate based on the embedded files
  const stats = {
    totalDocuments: 0,
    totalChunks: 0,
    categories: {} as Record<string, number>
  };
  
  // Search for all documents to get count
  const results = await embedder.search('*', { numResults: 1000 });
  stats.totalChunks = results.length;
  
  // Count unique documents and categories
  const uniqueDocs = new Set<string>();
  const categories = new Map<string, number>();
  
  for (const result of results) {
    if (result.metadata?.filePath) {
      uniqueDocs.add(result.metadata.filePath);
    }
    if (result.metadata?.category) {
      categories.set(
        result.metadata.category,
        (categories.get(result.metadata.category) || 0) + 1
      );
    }
  }
  
  stats.totalDocuments = uniqueDocs.size;
  stats.categories = Object.fromEntries(categories);
  
  return stats;
}

// Run the embedding process
embedDocumentation();