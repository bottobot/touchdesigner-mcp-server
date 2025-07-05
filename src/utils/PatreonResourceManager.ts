import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import Database from 'better-sqlite3';

interface ResourceMetadata {
  id: string;
  filename: string;
  filepath: string;
  creator: string;
  category: string;
  type: string;
  tags: string[];
  downloadedAt: string;
  lastUsed?: string;
  fileSize: number;
  hash: string;
  description?: string;
}

interface SearchOptions {
  query?: string;
  creator?: string;
  category?: string;
  type?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export class PatreonResourceManager {
  private dbPath: string;
  private resourcePath: string;
  private db!: Database.Database;

  constructor() {
    this.dbPath = path.join(process.env.APPDATA || '', 'TouchDesignerMCP', 'patreon_resources.db');
    this.resourcePath = process.env.TD_PATREON_RESOURCES_PATH || 
      'C:/Users/talla/Documents/touchdesigner-patreon-resources';
  }

  async initialize(): Promise<void> {
    // Ensure directories exist
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
    await fs.mkdir(this.resourcePath, { recursive: true });

    // Initialize database
    this.db = new (Database as any)(this.dbPath);
    
    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS resources (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        creator TEXT NOT NULL,
        category TEXT,
        type TEXT,
        tags TEXT,
        downloaded_at TEXT NOT NULL,
        last_used TEXT,
        file_size INTEGER,
        hash TEXT,
        description TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_creator ON resources(creator);
      CREATE INDEX IF NOT EXISTS idx_category ON resources(category);
      CREATE INDEX IF NOT EXISTS idx_type ON resources(type);
      CREATE VIRTUAL TABLE IF NOT EXISTS resources_fts USING fts5(
        filename, creator, category, tags, description, 
        content=resources, content_rowid=rowid
      );

      CREATE TRIGGER IF NOT EXISTS resources_ai AFTER INSERT ON resources
      BEGIN
        INSERT INTO resources_fts(rowid, filename, creator, category, tags, description)
        VALUES (new.rowid, new.filename, new.creator, new.category, new.tags, new.description);
      END;

      CREATE TRIGGER IF NOT EXISTS resources_ad AFTER DELETE ON resources
      BEGIN
        DELETE FROM resources_fts WHERE rowid = old.rowid;
      END;

      CREATE TRIGGER IF NOT EXISTS resources_au AFTER UPDATE ON resources
      BEGIN
        UPDATE resources_fts 
        SET filename = new.filename, 
            creator = new.creator, 
            category = new.category, 
            tags = new.tags, 
            description = new.description
        WHERE rowid = new.rowid;
      END;
    `);
  }

  private async calculateFileHash(filepath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filepath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }

  private detectResourceType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const typeMap: Record<string, string> = {
      '.toe': 'project',
      '.tox': 'component',
      '.toxd': 'component',
      '.comp': 'component',
      '.py': 'script',
      '.glsl': 'shader',
      '.frag': 'shader',
      '.vert': 'shader',
      '.jpg': 'image',
      '.jpeg': 'image',
      '.png': 'image',
      '.gif': 'image',
      '.mp4': 'video',
      '.mov': 'video',
      '.avi': 'video',
      '.wav': 'audio',
      '.mp3': 'audio',
      '.aiff': 'audio',
      '.obj': '3d-model',
      '.fbx': '3d-model',
      '.dae': '3d-model'
    };
    
    return typeMap[ext] || 'other';
  }

  private inferCategory(filepath: string): string {
    const pathLower = filepath.toLowerCase();
    
    if (pathLower.includes('tutorial') || pathLower.includes('workshop')) {
      return 'tutorial';
    }
    if (pathLower.includes('template') || pathLower.includes('starter')) {
      return 'template';
    }
    if (pathLower.includes('example') || pathLower.includes('demo')) {
      return 'example';
    }
    if (pathLower.includes('tool') || pathLower.includes('utility')) {
      return 'tool';
    }
    if (pathLower.includes('effect') || pathLower.includes('fx')) {
      return 'effect';
    }
    if (pathLower.includes('generative') || pathLower.includes('procedural')) {
      return 'generative';
    }
    if (pathLower.includes('audio') || pathLower.includes('sound')) {
      return 'audio-reactive';
    }
    if (pathLower.includes('particle') || pathLower.includes('simulation')) {
      return 'simulation';
    }
    
    return 'misc';
  }

  private extractTags(_filepath: string, filename: string): string[] {
    const tags = new Set<string>();
    
    // Extract from filename
    const words = filename.toLowerCase()
      .replace(/[_-]/g, ' ')
      .replace(/\.[^.]+$/, '')
      .split(/\s+/);
    
    // Common TouchDesigner keywords to tag
    const keywords = [
      'glsl', 'gpu', 'compute', 'particle', 'audio', 'reactive',
      'generative', 'procedural', 'vj', 'mapping', 'projection',
      'led', 'dmx', 'osc', 'midi', 'kinect', 'opencv', 'ml',
      'machine learning', 'ai', 'neural', 'feedback', 'fractal',
      'noise', 'shader', 'post', 'processing', 'filter', 'effect',
      '3d', '2d', 'animation', 'motion', 'physics', 'simulation'
    ];
    
    for (const word of words) {
      for (const keyword of keywords) {
        if (word.includes(keyword.replace(/\s+/g, ''))) {
          tags.add(keyword);
        }
      }
    }
    
    // Add type as tag
    const type = this.detectResourceType(filename);
    tags.add(type);
    
    return Array.from(tags);
  }

  async scanForNewResources(): Promise<number> {
    let newCount = 0;
    
    const scanDir = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (this.isValidResource(entry.name)) {
          const exists = this.db.prepare(
            'SELECT id FROM resources WHERE filepath = ?'
          ).get(fullPath);
          
          if (!exists) {
            await this.catalogResource(fullPath);
            newCount++;
          }
        }
      }
    };
    
    await scanDir(this.resourcePath);
    return newCount;
  }

  private isValidResource(filename: string): boolean {
    const validExtensions = [
      '.toe', '.tox', '.toxd', '.comp', '.py', '.glsl', '.frag', '.vert',
      '.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mov', '.avi',
      '.wav', '.mp3', '.aiff', '.obj', '.fbx', '.dae'
    ];
    
    return validExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  private async catalogResource(filepath: string): Promise<void> {
    const filename = path.basename(filepath);
    const stats = await fs.stat(filepath);
    const hash = await this.calculateFileHash(filepath);
    
    // Extract creator from path structure
    const relativePath = path.relative(this.resourcePath, filepath);
    const pathParts = relativePath.split(path.sep);
    const creator = pathParts[0] || 'unknown';
    
    const metadata: ResourceMetadata = {
      id: crypto.randomUUID(),
      filename,
      filepath,
      creator,
      category: this.inferCategory(filepath),
      type: this.detectResourceType(filename),
      tags: this.extractTags(filepath, filename),
      downloadedAt: new Date().toISOString(),
      fileSize: stats.size,
      hash,
      description: ''
    };
    
    const stmt = this.db.prepare(`
      INSERT INTO resources (
        id, filename, filepath, creator, category, type, 
        tags, downloaded_at, file_size, hash, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      metadata.id,
      metadata.filename,
      metadata.filepath,
      metadata.creator,
      metadata.category,
      metadata.type,
      JSON.stringify(metadata.tags),
      metadata.downloadedAt,
      metadata.fileSize,
      metadata.hash,
      metadata.description
    );
  }

  async searchResources(options: SearchOptions): Promise<ResourceMetadata[]> {
    let query = 'SELECT * FROM resources WHERE 1=1';
    const params: any[] = [];
    
    if (options.query) {
      query = `
        SELECT r.* FROM resources r
        JOIN resources_fts ON r.rowid = resources_fts.rowid
        WHERE resources_fts MATCH ?
      `;
      params.push(options.query);
      
      if (options.creator) {
        query += ' AND r.creator = ?';
        params.push(options.creator);
      }
      if (options.category) {
        query += ' AND r.category = ?';
        params.push(options.category);
      }
      if (options.type) {
        query += ' AND r.type = ?';
        params.push(options.type);
      }
    } else {
      if (options.creator) {
        query += ' AND creator = ?';
        params.push(options.creator);
      }
      if (options.category) {
        query += ' AND category = ?';
        params.push(options.category);
      }
      if (options.type) {
        query += ' AND type = ?';
        params.push(options.type);
      }
    }
    
    if (options.tags && options.tags.length > 0) {
      for (const tag of options.tags) {
        query += ' AND tags LIKE ?';
        params.push(`%"${tag}"%`);
      }
    }
    
    query += ' ORDER BY downloaded_at DESC';
    query += ` LIMIT ${options.limit || 50}`;
    query += ` OFFSET ${options.offset || 0}`;
    
    const stmt = this.db.prepare(query);
    const results = stmt.all(...params);
    
    return results.map((row: any) => ({
      id: row.id,
      filename: row.filename,
      filepath: row.filepath,
      creator: row.creator,
      category: row.category,
      type: row.type,
      tags: JSON.parse(row.tags || '[]'),
      downloadedAt: row.downloaded_at,
      lastUsed: row.last_used,
      fileSize: row.file_size,
      hash: row.hash,
      description: row.description
    }));
  }

  async importResourceToProject(resourceId: string, targetProjectPath: string): Promise<string> {
    const resource = await this.getResourceInfo(resourceId);
    if (!resource) {
      throw new Error(`Resource ${resourceId} not found`);
    }
    
    // Update last used timestamp
    this.db.prepare('UPDATE resources SET last_used = ? WHERE id = ?')
      .run(new Date().toISOString(), resourceId);
    
    // Determine target location based on resource type
    const targetDir = path.dirname(targetProjectPath);
    let targetSubdir = '';
    
    switch (resource.type) {
      case 'component':
        targetSubdir = 'components';
        break;
      case 'script':
        targetSubdir = 'scripts';
        break;
      case 'shader':
        targetSubdir = 'shaders';
        break;
      case 'image':
      case 'video':
      case 'audio':
        targetSubdir = 'media';
        break;
      case '3d-model':
        targetSubdir = 'models';
        break;
    }
    
    const importDir = targetSubdir ? path.join(targetDir, targetSubdir) : targetDir;
    await fs.mkdir(importDir, { recursive: true });
    
    const targetPath = path.join(importDir, resource.filename);
    await fs.copyFile(resource.filepath, targetPath);
    
    return targetPath;
  }

  async getResourceInfo(resourceId: string): Promise<ResourceMetadata | null> {
    const stmt = this.db.prepare('SELECT * FROM resources WHERE id = ?');
    const row = stmt.get(resourceId) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      filename: row.filename,
      filepath: row.filepath,
      creator: row.creator,
      category: row.category,
      type: row.type,
      tags: JSON.parse(row.tags || '[]'),
      downloadedAt: row.downloaded_at,
      lastUsed: row.last_used,
      fileSize: row.file_size,
      hash: row.hash,
      description: row.description
    };
  }

  async listCreators(): Promise<{ name: string; resourceCount: number }[]> {
    const stmt = this.db.prepare(`
      SELECT creator as name, COUNT(*) as resourceCount 
      FROM resources 
      GROUP BY creator 
      ORDER BY resourceCount DESC
    `);
    
    return stmt.all() as { name: string; resourceCount: number }[];
  }

  async updateResourceMetadata(resourceId: string, updates: Partial<ResourceMetadata>): Promise<void> {
    const allowedUpdates = ['category', 'tags', 'description'];
    const setClause: string[] = [];
    const values: any[] = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        setClause.push(`${key} = ?`);
        values.push(key === 'tags' ? JSON.stringify(value) : value);
      }
    }
    
    if (setClause.length > 0) {
      values.push(resourceId);
      const stmt = this.db.prepare(
        `UPDATE resources SET ${setClause.join(', ')} WHERE id = ?`
      );
      stmt.run(...values);
    }
  }

  async getStatistics(): Promise<any> {
    const stats = {
      totalResources: this.db.prepare('SELECT COUNT(*) as count FROM resources').get(),
      byCreator: this.db.prepare(
        'SELECT creator, COUNT(*) as count FROM resources GROUP BY creator'
      ).all(),
      byCategory: this.db.prepare(
        'SELECT category, COUNT(*) as count FROM resources GROUP BY category'
      ).all(),
      byType: this.db.prepare(
        'SELECT type, COUNT(*) as count FROM resources GROUP BY type'
      ).all(),
      recentlyUsed: this.db.prepare(
        'SELECT * FROM resources WHERE last_used IS NOT NULL ORDER BY last_used DESC LIMIT 10'
      ).all(),
      totalSize: this.db.prepare(
        'SELECT SUM(file_size) as total FROM resources'
      ).get()
    };
    
    return stats;
  }

  close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}