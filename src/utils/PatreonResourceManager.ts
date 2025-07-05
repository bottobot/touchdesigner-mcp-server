import * as fs from 'fs/promises';
import * as path from 'path';
import { Database } from 'sqlite3';
import { promisify } from 'util';
import * as crypto from 'crypto';

interface ResourceMetadata {
  id: string;
  filename: string;
  creator: string;
  category: string;
  postTitle?: string;
  downloadDate: string;
  url: string;
  type: string;
  tags?: string[];
  tdVersion?: string;
  description?: string;
  fileSize?: number;
  path?: string; // Added path property
}

interface SearchOptions {
  query?: string;
  creator?: string;
  category?: string;
  type?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export class PatreonResourceManager {
  private db: Database;
  private resourcePath: string;
  private dbPath: string;

  constructor(basePath: string = 'TouchDesigner-Patreon-Resources') {
    this.resourcePath = path.join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads', basePath);
    this.dbPath = path.join(this.resourcePath, 'Database', 'resources.db');
  }

  async initialize(): Promise<void> {
    // Ensure directories exist
    await fs.mkdir(path.join(this.resourcePath, 'Database'), { recursive: true });
    
    // Initialize database
    await this.initializeDatabase();
    
    // Scan for new files
    await this.scanForNewResources();
  }

  private async initializeDatabase(): Promise<void> {
    const sqlite3 = await import('sqlite3');
    this.db = new sqlite3.verbose().Database(this.dbPath);
    
    const run = promisify(this.db.run.bind(this.db));
    
    // Create tables
    await run(`
      CREATE TABLE IF NOT EXISTS creators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        patreon_url TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await run(`
      CREATE TABLE IF NOT EXISTS resources (
        id TEXT PRIMARY KEY,
        creator_id INTEGER,
        filename TEXT NOT NULL,
        path TEXT NOT NULL,
        category TEXT,
        post_title TEXT,
        download_date DATETIME,
        url TEXT,
        type TEXT,
        td_version TEXT,
        description TEXT,
        file_size INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES creators(id)
      )
    `);
    
    await run(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      )
    `);
    
    await run(`
      CREATE TABLE IF NOT EXISTS resource_tags (
        resource_id TEXT,
        tag_id INTEGER,
        PRIMARY KEY (resource_id, tag_id),
        FOREIGN KEY (resource_id) REFERENCES resources(id),
        FOREIGN KEY (tag_id) REFERENCES tags(id)
      )
    `);
    
    // Create indexes
    await run('CREATE INDEX IF NOT EXISTS idx_resources_creator ON resources(creator_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category)');
    await run('CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type)');
    await run('CREATE INDEX IF NOT EXISTS idx_resources_download_date ON resources(download_date)');
  }

  async scanForNewResources(): Promise<number> {
    let newCount = 0;
    
    try {
      // Scan all creator directories
      const creatorDirs = await fs.readdir(this.resourcePath);
      
      for (const creatorDir of creatorDirs) {
        if (creatorDir === 'Database' || creatorDir === 'Metadata') continue;
        
        const creatorPath = path.join(this.resourcePath, creatorDir);
        const stats = await fs.stat(creatorPath);
        
        if (stats.isDirectory()) {
          // Ensure creator exists in database
          const creatorId = await this.ensureCreator(creatorDir);
          
          // Scan for resources
          const count = await this.scanCreatorDirectory(creatorPath, creatorId, creatorDir);
          newCount += count;
        }
      }
    } catch (error) {
      console.error('Error scanning for resources:', error);
    }
    
    return newCount;
  }

  private async scanCreatorDirectory(dirPath: string, creatorId: number, creatorName: string): Promise<number> {
    let newCount = 0;
    
    const scanDir = async (currentPath: string, category: string = 'uncategorized'): Promise<void> => {
      const items = await fs.readdir(currentPath);
      
      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          // Use directory name as category
          await scanDir(itemPath, item);
        } else if (this.isRelevantFile(item)) {
          // Check if metadata exists
          const metadataPath = `${itemPath}.metadata.json`;
          let metadata: any = {};
          
          try {
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            metadata = JSON.parse(metadataContent);
          } catch (error) {
            // No metadata file, create basic entry
          }
          
          // Check if resource already exists
          const resourceId = metadata.id || this.generateResourceId(itemPath);
          const exists = await this.resourceExists(resourceId);
          
          if (!exists) {
            await this.addResource({
              id: resourceId,
              filename: item,
              creator: creatorName,
              category: category,
              postTitle: metadata.postTitle,
              downloadDate: metadata.downloadDate || stats.birthtime.toISOString(),
              url: metadata.url || '',
              type: this.detectFileType(item),
              fileSize: stats.size,
              ...metadata
            }, creatorId, itemPath);
            
            newCount++;
          }
        }
      }
    };
    
    await scanDir(dirPath);
    return newCount;
  }

  private isRelevantFile(filename: string): boolean {
    const relevantExtensions = [
      '.toe', '.tox', '.toxd', '.comp', 
      '.geo', '.mat', '.obj', '.fbx', '.dae', '.3ds',
      '.glsl', '.frag', '.vert',
      '.mp4', '.mov', '.avi', '.mkv',
      '.jpg', '.jpeg', '.png', '.gif',
      '.wav', '.mp3', '.aiff', '.flac',
      '.zip', '.rar', '.7z'
    ];
    
    const ext = path.extname(filename).toLowerCase();
    return relevantExtensions.includes(ext) && !filename.endsWith('.metadata.json');
  }

  private detectFileType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    
    const typeMap: { [key: string]: string } = {
      '.toe': 'project',
      '.tox': 'component',
      '.toxd': 'component',
      '.comp': 'component',
      '.geo': '3d-model',
      '.mat': 'material',
      '.obj': '3d-model',
      '.fbx': '3d-model',
      '.dae': '3d-model',
      '.3ds': '3d-model',
      '.glsl': 'shader',
      '.frag': 'shader',
      '.vert': 'shader',
      '.mp4': 'video',
      '.mov': 'video',
      '.avi': 'video',
      '.mkv': 'video',
      '.jpg': 'image',
      '.jpeg': 'image',
      '.png': 'image',
      '.gif': 'image',
      '.wav': 'audio',
      '.mp3': 'audio',
      '.aiff': 'audio',
      '.flac': 'audio',
      '.zip': 'archive',
      '.rar': 'archive',
      '.7z': 'archive'
    };
    
    return typeMap[ext] || 'other';
  }

  private generateResourceId(filePath: string): string {
    return crypto.createHash('md5').update(filePath).digest('hex').substring(0, 16);
  }

  private async ensureCreator(name: string): Promise<number> {
    const get = promisify(this.db.get.bind(this.db));
    const run = promisify(this.db.run.bind(this.db));
    
    let creator = await get('SELECT id FROM creators WHERE name = ?', [name]);
    
    if (!creator) {
      await run('INSERT INTO creators (name) VALUES (?)', [name]);
      creator = await get('SELECT id FROM creators WHERE name = ?', [name]);
    }
    
    return creator.id;
  }

  private async resourceExists(id: string): Promise<boolean> {
    const get = promisify(this.db.get.bind(this.db));
    const result = await get('SELECT 1 FROM resources WHERE id = ?', [id]);
    return !!result;
  }

  private async addResource(metadata: ResourceMetadata, creatorId: number, filePath: string): Promise<void> {
    const run = promisify(this.db.run.bind(this.db));
    
    await run(`
      INSERT INTO resources (
        id, creator_id, filename, path, category, post_title,
        download_date, url, type, td_version, description, file_size
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      metadata.id,
      creatorId,
      metadata.filename,
      filePath,
      metadata.category,
      metadata.postTitle,
      metadata.downloadDate,
      metadata.url,
      metadata.type,
      metadata.tdVersion,
      metadata.description,
      metadata.fileSize
    ]);
    
    // Add tags if present
    if (metadata.tags && metadata.tags.length > 0) {
      for (const tag of metadata.tags) {
        await this.addTag(metadata.id, tag);
      }
    }
  }

  private async addTag(resourceId: string, tagName: string): Promise<void> {
    const get = promisify(this.db.get.bind(this.db));
    const run = promisify(this.db.run.bind(this.db));
    
    // Ensure tag exists
    let tag = await get('SELECT id FROM tags WHERE name = ?', [tagName]);
    if (!tag) {
      await run('INSERT INTO tags (name) VALUES (?)', [tagName]);
      tag = await get('SELECT id FROM tags WHERE name = ?', [tagName]);
    }
    
    // Link tag to resource
    await run('INSERT OR IGNORE INTO resource_tags (resource_id, tag_id) VALUES (?, ?)', 
      [resourceId, tag.id]);
  }

  async searchResources(options: SearchOptions): Promise<ResourceMetadata[]> {
    const all = promisify(this.db.all.bind(this.db));
    
    let query = `
      SELECT DISTINCT
        r.id, r.filename, c.name as creator, r.category,
        r.post_title as postTitle, r.download_date as downloadDate,
        r.url, r.type, r.td_version as tdVersion,
        r.description, r.file_size as fileSize, r.path
      FROM resources r
      JOIN creators c ON r.creator_id = c.id
      LEFT JOIN resource_tags rt ON r.id = rt.resource_id
      LEFT JOIN tags t ON rt.tag_id = t.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    // Add search conditions
    if (options.query) {
      query += ` AND (
        r.filename LIKE ? OR 
        r.post_title LIKE ? OR 
        r.description LIKE ? OR
        c.name LIKE ? OR
        t.name LIKE ?
      )`;
      const searchTerm = `%${options.query}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (options.creator) {
      query += ' AND c.name = ?';
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
    
    if (options.dateFrom) {
      query += ' AND r.download_date >= ?';
      params.push(options.dateFrom);
    }
    
    if (options.dateTo) {
      query += ' AND r.download_date <= ?';
      params.push(options.dateTo);
    }
    
    // Add ordering
    query += ' ORDER BY r.download_date DESC';
    
    // Add pagination
    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
      
      if (options.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }
    }
    
    const results = await all(query, params);
    
    // Get tags for each resource
    for (const resource of results) {
      const tags = await all(`
        SELECT t.name 
        FROM tags t 
        JOIN resource_tags rt ON t.id = rt.tag_id 
        WHERE rt.resource_id = ?
      `, [resource.id]);
      
      resource.tags = tags.map((t: any) => t.name);
    }
    
    return results;
  }

  async getResourceInfo(resourceId: string): Promise<ResourceMetadata | null> {
    const get = promisify(this.db.get.bind(this.db));
    const all = promisify(this.db.all.bind(this.db));
    
    const resource = await get(`
      SELECT 
        r.id, r.filename, c.name as creator, r.category,
        r.post_title as postTitle, r.download_date as downloadDate,
        r.url, r.type, r.td_version as tdVersion,
        r.description, r.file_size as fileSize, r.path
      FROM resources r
      JOIN creators c ON r.creator_id = c.id
      WHERE r.id = ?
    `, [resourceId]);
    
    if (!resource) return null;
    
    // Get tags
    const tags = await all(`
      SELECT t.name 
      FROM tags t 
      JOIN resource_tags rt ON t.id = rt.tag_id 
      WHERE rt.resource_id = ?
    `, [resourceId]);
    
    resource.tags = tags.map((t: any) => t.name);
    
    return resource;
  }

  async listCreators(): Promise<{ name: string; resourceCount: number }[]> {
    const all = promisify(this.db.all.bind(this.db));
    
    const creators = await all(`
      SELECT c.name, COUNT(r.id) as resourceCount
      FROM creators c
      LEFT JOIN resources r ON c.id = r.creator_id
      GROUP BY c.id, c.name
      ORDER BY c.name
    `);
    
    return creators;
  }

  async getCreatorResources(creatorName: string): Promise<ResourceMetadata[]> {
    return this.searchResources({ creator: creatorName });
  }

  async importResourceToProject(resourceId: string, targetPath: string): Promise<string> {
    const resource = await this.getResourceInfo(resourceId);
    if (!resource || !resource.path) {
      throw new Error('Resource not found or path missing');
    }
    
    const sourcePath = resource.path;
    const targetFilePath = path.join(targetPath, resource.filename);
    
    // Copy file to target location
    await fs.copyFile(sourcePath, targetFilePath);
    
    return targetFilePath;
  }

  async getResourcePath(resourceId: string): Promise<string | null> {
    const resource = await this.getResourceInfo(resourceId);
    return resource?.path || null;
  }

  async close(): Promise<void> {
    if (this.db) {
      const close = promisify(this.db.close.bind(this.db));
      await close();
    }
  }
}