import { ChromaClient, Collection } from 'chromadb';
import { OpenAI } from 'openai';
import * as fs from 'fs/promises';
import * as path from 'path';

interface SearchResult {
  content: string;
  score: number;
  context: string;
  metadata?: Record<string, any>;
}

export class DocumentationEmbedder {
  private client: ChromaClient;
  private collection!: Collection;
  private openai: OpenAI;
  private docsPath: string;
  
  constructor(docsPath: string) {
    this.docsPath = docsPath;
    this.client = new ChromaClient();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  
  async initialize(): Promise<void> {
    // Create or get the documentation collection
    try {
      this.collection = await this.client.createCollection({
        name: 'touchdesigner_docs',
        metadata: { 'hnsw:space': 'cosine' }
      });
    } catch (error) {
      // Collection might already exist
      this.collection = await this.client.getCollection({
        name: 'touchdesigner_docs'
      });
    }
    
    // Initialize with built-in documentation
    await this.initializeBuiltInDocs();
  }
  
  private async initializeBuiltInDocs(): Promise<void> {
    const builtInDocs = [
      {
        id: 'noise_top',
        content: `# Noise TOP
The Noise TOP generates various types of procedural noise patterns.

## Parameters
- Type: Sparse, Hermite, Harmon Summation, Perlin, Simplex, Worley, Alligator
- Transform: Translate, Rotate, Scale
- Output: Monochrome or Color

## Usage
Commonly used for textures, displacement maps, and animated backgrounds.

## Performance
Use lower resolutions when possible. Simplex noise is faster than Perlin.`,
        metadata: { category: 'operators', operatorFamily: 'TOP', operatorName: 'Noise' }
      },
      {
        id: 'movie_filein_top',
        content: `# Movie File In TOP
Loads and plays movie files in various formats.

## Supported Formats
- MP4, MOV, AVI, MKV
- Image sequences (PNG, JPG, EXR)
- HAP, HAP-Q, HAP-Alpha codecs for performance

## Parameters
- File: Path to movie file
- Play: Play/pause control
- Speed: Playback speed
- Cue: Jump to specific frame/time

## Performance Tips
- Use HAP codec for best performance
- Pre-load movies in perform mode
- Consider resolution vs quality tradeoffs`,
        metadata: { category: 'operators', operatorFamily: 'TOP', operatorName: 'Movie File In' }
      },
      {
        id: 'chop_to_sop',
        content: `# CHOP to SOP
Converts CHOP channel data to SOP geometry attributes.

## Usage
- Drive point positions with audio
- Create data-driven geometry
- Animate vertex colors

## Common Patterns
- Audio reactive geometry
- Data visualization
- Parametric modeling`,
        metadata: { category: 'operators', operatorFamily: 'SOP', operatorName: 'CHOP to' }
      },
      {
        id: 'feedback_top',
        content: `# Feedback TOP
Creates visual feedback loops by referencing previous frames.

## Parameters
- Target TOP: Source for feedback
- Feedback: Amount of feedback (0-1)
- Pre-Multiply: Color pre-multiplication

## Creative Uses
- Trails and echoes
- Infinite zoom effects
- Generative patterns
- Motion blur alternatives

## Performance
Feedback can be GPU intensive. Monitor GPU memory usage.`,
        metadata: { category: 'operators', operatorFamily: 'TOP', operatorName: 'Feedback' }
      },
      {
        id: 'audio_reactive',
        content: `# Audio Reactive Techniques

## Basic Setup
1. Audio Device In CHOP or Audio File In CHOP
2. Analyze CHOP for RMS, peak detection
3. Audio Spectrum CHOP for frequency analysis
4. Map values to visual parameters

## Advanced Techniques
- Beat detection with Beat CHOP
- Frequency band isolation
- Envelope following
- FFT analysis for detailed spectrum

## Performance Tips
- Downsample audio for control signals
- Use Lag CHOP for smoothing
- Cache analyzed values`,
        metadata: { category: 'tutorials', subcategory: 'audio' }
      },
      {
        id: 'optimization_guide',
        content: `# TouchDesigner Optimization Guide

## GPU Optimization
- Match resolutions to output
- Use instancing for repetitive geometry
- Limit transparent objects
- Profile with Performance Monitor

## CPU Optimization
- Minimize Python scripts in perform mode
- Use expressions efficiently
- Avoid per-frame file I/O
- Optimize CHOP cook dependencies

## Memory Management
- Unload unused movie files
- Clear feedback buffers periodically
- Monitor texture memory usage
- Use texture formats appropriately`,
        metadata: { category: 'best-practices', subcategory: 'performance' }
      }
    ];
    
    // Add built-in docs to collection
    for (const doc of builtInDocs) {
      await this.collection.add({
        ids: [doc.id],
        documents: [doc.content],
        metadatas: [doc.metadata]
      });
    }
  }
  
  async embedDocument(content: string, metadata: Record<string, any>): Promise<void> {
    // Split content into chunks
    const chunks = this.splitIntoChunks(content);
    
    // Embed each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunkId = `${metadata.filePath || 'doc'}_chunk_${i}_${Date.now()}`;
      await this.collection.add({
        ids: [chunkId],
        documents: [chunks[i]],
        metadatas: [{
          ...metadata,
          chunkIndex: i,
          totalChunks: chunks.length
        }]
      });
    }
  }
  
  async embedBuiltInDocs(): Promise<void> {
    // This method is called by the embed-docs script
    // Built-in docs are already embedded during initialization
    console.log('Built-in TouchDesigner documentation already embedded');
  }
  
  async search(query: string, options?: {
    category?: string;
    operators?: string[];
    limit?: number;
    numResults?: number;
    threshold?: number;
  }): Promise<SearchResult[]> {
    const limit = options?.limit || options?.numResults || 10;
    const threshold = options?.threshold || 0.7;
    
    // Build where clause for filtering
    const where: any = {};
    if (options?.category) {
      where.category = options.category;
    }
    if (options?.operators && options.operators.length > 0) {
      where.operatorName = { $in: options.operators };
    }
    
    // Perform similarity search
    const results = await this.collection.query({
      queryTexts: [query],
      nResults: limit,
      where: Object.keys(where).length > 0 ? where : undefined
    });
    
    // Format results
    const searchResults: SearchResult[] = [];
    if (results.documents && results.documents[0]) {
      for (let i = 0; i < results.documents[0].length; i++) {
        const content = results.documents[0][i];
        const metadata = results.metadatas?.[0]?.[i];
        const distance = results.distances?.[0]?.[i] || 0;
        
        if (content && (1 - distance) >= threshold) {
          searchResults.push({
            content,
            score: 1 - distance,
            context: this.extractContext(content, query),
            metadata
          });
        }
      }
    }
    
    return searchResults;
  }
  
  private splitIntoChunks(content: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    const chunks: string[] = [];
    let startIndex = 0;
    
    while (startIndex < content.length) {
      const endIndex = Math.min(startIndex + chunkSize, content.length);
      const chunk = content.substring(startIndex, endIndex);
      chunks.push(chunk);
      
      // Move start index forward, but keep some overlap
      startIndex = endIndex - overlap;
      
      // If we're at the end, break to avoid tiny chunks
      if (endIndex === content.length) break;
    }
    
    return chunks;
  }
  
  private extractContext(content: string, query: string, contextLength: number = 200): string {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const queryWords = lowerQuery.split(/\s+/);
    
    // Find the best matching position
    let bestPosition = -1;
    let bestScore = 0;
    
    for (let i = 0; i < lowerContent.length - contextLength; i++) {
      const substring = lowerContent.substring(i, i + contextLength);
      let score = 0;
      
      for (const word of queryWords) {
        if (substring.includes(word)) {
          score++;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestPosition = i;
      }
    }
    
    if (bestPosition === -1) {
      // No match found, return beginning
      return content.substring(0, contextLength) + '...';
    }
    
    // Extract context around the best position
    const start = Math.max(0, bestPosition - contextLength / 2);
    const end = Math.min(content.length, start + contextLength);
    
    let context = content.substring(start, end);
    
    // Add ellipsis if needed
    if (start > 0) context = '...' + context;
    if (end < content.length) context = context + '...';
    
    return context;
  }
}