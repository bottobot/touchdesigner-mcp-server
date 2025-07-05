import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

// Set ffmpeg path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

interface ImportOptions {
  sourcePath: string;
  mediaType?: 'image' | 'video' | 'audio' | 'model' | 'auto';
  optimize?: boolean;
  generateVariations?: boolean;
}

interface OptimizeOptions {
  inputPath: string;
  outputPath?: string;
  format?: string;
  quality?: number;
  maxDimension?: number;
}

interface ImportResult {
  filename: string;
  status: string;
  path: string;
  optimized?: boolean;
  variations?: string[];
}

interface OptimizeResult {
  originalSize: string;
  optimizedSize: string;
  reduction: number;
  outputPath: string;
}

export class MediaProcessor {
  private mediaPath: string;

  constructor(mediaPath: string) {
    this.mediaPath = mediaPath;
  }

  async initialize(): Promise<void> {
    // Ensure media directories exist
    await fs.mkdir(this.mediaPath, { recursive: true });
    await fs.mkdir(path.join(this.mediaPath, 'images'), { recursive: true });
    await fs.mkdir(path.join(this.mediaPath, 'videos'), { recursive: true });
    await fs.mkdir(path.join(this.mediaPath, 'audio'), { recursive: true });
    await fs.mkdir(path.join(this.mediaPath, 'models'), { recursive: true });
    await fs.mkdir(path.join(this.mediaPath, 'temp'), { recursive: true });
  }

  async importMedia(options: ImportOptions): Promise<ImportResult[]> {
    const results: ImportResult[] = [];
    const stats = await fs.stat(options.sourcePath);

    if (stats.isDirectory()) {
      // Import all media files from directory
      const files = await fs.readdir(options.sourcePath);
      for (const file of files) {
        const filePath = path.join(options.sourcePath, file);
        const fileStats = await fs.stat(filePath);
        if (fileStats.isFile()) {
          const result = await this.importSingleFile({
            ...options,
            sourcePath: filePath
          });
          if (result) results.push(result);
        }
      }
    } else {
      // Import single file
      const result = await this.importSingleFile(options);
      if (result) results.push(result);
    }

    return results;
  }

  private async importSingleFile(options: ImportOptions): Promise<ImportResult | null> {
    const filename = path.basename(options.sourcePath);
    const ext = path.extname(filename).toLowerCase();
    const mediaType = options.mediaType === 'auto' ? this.detectMediaType(ext) : options.mediaType;

    if (!mediaType) {
      return null;
    }

    const targetDir = path.join(this.mediaPath, `${mediaType}s`);
    const targetPath = path.join(targetDir, filename);

    try {
      // Copy file to media directory
      await fs.copyFile(options.sourcePath, targetPath);

      const result: ImportResult = {
        filename,
        status: 'imported',
        path: targetPath,
        optimized: false,
        variations: []
      };

      // Optimize if requested
      if (options.optimize) {
        const optimized = await this.optimizeFile(targetPath, mediaType);
        if (optimized) {
          result.optimized = true;
          result.path = optimized;
        }
      }

      // Generate variations if requested
      if (options.generateVariations && mediaType === 'image') {
        result.variations = await this.generateImageVariations(targetPath);
      }

      return result;
    } catch (error) {
      return {
        filename,
        status: `error: ${error}`,
        path: ''
      };
    }
  }

  private detectMediaType(ext: string): string | null {
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.exr', '.hdr'];
    const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv'];
    const audioExts = ['.mp3', '.wav', '.aiff', '.flac', '.ogg', '.m4a'];
    const modelExts = ['.obj', '.fbx', '.dae', '.3ds', '.ply', '.stl'];

    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video';
    if (audioExts.includes(ext)) return 'audio';
    if (modelExts.includes(ext)) return 'model';
    
    return null;
  }

  async optimize(options: OptimizeOptions): Promise<OptimizeResult> {
    const ext = path.extname(options.inputPath).toLowerCase();
    const mediaType = this.detectMediaType(ext);
    
    if (!mediaType) {
      throw new Error('Unsupported media type');
    }

    const outputPath = options.outputPath || 
      path.join(
        path.dirname(options.inputPath),
        `${path.basename(options.inputPath, ext)}_optimized${options.format ? `.${options.format}` : ext}`
      );

    const originalStats = await fs.stat(options.inputPath);
    let optimizedStats: any;

    switch (mediaType) {
      case 'image':
        await this.optimizeImage(options.inputPath, outputPath, options);
        break;
      case 'video':
        await this.optimizeVideo(options.inputPath, outputPath, options);
        break;
      case 'audio':
        await this.optimizeAudio(options.inputPath, outputPath, options);
        break;
      default:
        throw new Error(`Cannot optimize ${mediaType} files`);
    }

    optimizedStats = await fs.stat(outputPath);
    const reduction = Math.round((1 - optimizedStats.size / originalStats.size) * 100);

    return {
      originalSize: this.formatBytes(originalStats.size),
      optimizedSize: this.formatBytes(optimizedStats.size),
      reduction,
      outputPath
    };
  }

  private async optimizeFile(filePath: string, mediaType: string): Promise<string | null> {
    const ext = path.extname(filePath);
    const optimizedPath = filePath.replace(ext, `_opt${ext}`);

    try {
      switch (mediaType) {
        case 'image':
          await this.optimizeImage(filePath, optimizedPath, { quality: 85, maxDimension: 2048 });
          return optimizedPath;
        case 'video':
          await this.optimizeVideo(filePath, optimizedPath, {});
          return optimizedPath;
        default:
          return null;
      }
    } catch (error) {
      console.error(`Failed to optimize ${filePath}:`, error);
      return null;
    }
  }

  private async optimizeImage(input: string, output: string, options: OptimizeOptions): Promise<void> {
    let pipeline = sharp(input);

    // Resize if needed
    if (options.maxDimension) {
      pipeline = pipeline.resize(options.maxDimension, options.maxDimension, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Convert format if needed
    const format = options.format || path.extname(output).slice(1);
    switch (format) {
      case 'jpg':
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality: options.quality || 85 });
        break;
      case 'png':
        pipeline = pipeline.png({ quality: options.quality || 90 });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality: options.quality || 85 });
        break;
    }

    await pipeline.toFile(output);
  }

  private async optimizeVideo(input: string, output: string, options: OptimizeOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(input);

      // Basic optimization settings
      command = command
        .videoCodec('libx264')
        .outputOptions([
          '-preset fast',
          '-crf 23',
          '-profile:v baseline',
          '-level 3.0',
          '-pix_fmt yuv420p'
        ]);

      // Resize if needed
      if (options.maxDimension) {
        command = command.size(`${options.maxDimension}x?`);
      }

      command
        .on('end', () => resolve())
        .on('error', reject)
        .save(output);
    });
  }

  private async optimizeAudio(input: string, output: string, options: OptimizeOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(input)
        .audioCodec('libmp3lame')
        .audioBitrate('192k')
        .audioFrequency(44100)
        .on('end', () => resolve())
        .on('error', reject)
        .save(output);
    });
  }

  private async generateImageVariations(imagePath: string): Promise<string[]> {
    const variations: string[] = [];
    const basename = path.basename(imagePath, path.extname(imagePath));
    const dir = path.dirname(imagePath);

    // Generate different sizes
    const sizes = [
      { suffix: '_thumb', width: 256 },
      { suffix: '_medium', width: 512 },
      { suffix: '_large', width: 1024 }
    ];

    for (const size of sizes) {
      const outputPath = path.join(dir, `${basename}${size.suffix}.jpg`);
      await sharp(imagePath)
        .resize(size.width, size.width, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toFile(outputPath);
      variations.push(outputPath);
    }

    // Generate stylized versions
    const styles = [
      { suffix: '_bw', process: (img: any) => img.grayscale() },
      { suffix: '_blur', process: (img: any) => img.blur(5) },
      { suffix: '_sharp', process: (img: any) => img.sharpen() }
    ];

    for (const style of styles) {
      const outputPath = path.join(dir, `${basename}${style.suffix}.jpg`);
      await style.process(sharp(imagePath))
        .jpeg({ quality: 85 })
        .toFile(outputPath);
      variations.push(outputPath);
    }

    return variations;
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}