import * as os from 'os';

interface PerformanceMetrics {
  fps: number;
  cookTime: number;
  gpuMemoryUsed: number;
  gpuMemoryTotal: number;
  cpuUsage: number;
  ramUsage: number;
  frameDrops: number;
  renderTime: number;
  timestamp: number;
}

interface ProjectMetrics {
  nodeCount: number;
  connectionCount: number;
  heaviestNodes: Array<{ name: string; cookTime: number }>;
  bottlenecks: Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }>;
  optimizationSuggestions: string[];
}

export class PerformanceMonitor {
  private metricsHistory: PerformanceMetrics[] = [];
  private maxHistorySize: number = 1000;
  private warningThresholds = {
    fps: 30,
    cookTime: 16.67, // 60fps target
    gpuMemory: 0.9, // 90% usage
    cpuUsage: 0.8, // 80% usage
    frameDrops: 5
  };

  constructor() {
    // Initialize performance monitoring
  }

  async getMetrics(projectPath?: string, specificMetrics?: string[]): Promise<any> {
    const currentMetrics = await this.getCurrentMetrics();
    
    if (specificMetrics) {
      const filtered: any = {};
      specificMetrics.forEach(metric => {
        if (metric in currentMetrics) {
          filtered[metric] = (currentMetrics as any)[metric];
        }
      });
      return filtered;
    }
    
    // If project path is provided, get project-specific metrics
    if (projectPath) {
      const projectMetrics = await this.getProjectMetrics(projectPath);
      return {
        system: currentMetrics,
        project: projectMetrics
      };
    }
    
    return currentMetrics;
  }

  private async getCurrentMetrics(): Promise<PerformanceMetrics> {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    
    // Calculate CPU usage
    const cpuUsage = this.calculateCPUUsage(cpus);
    
    // Simulated TouchDesigner metrics (would be real data from TD)
    const metrics: PerformanceMetrics = {
      fps: this.simulateFPS(),
      cookTime: this.simulateCookTime(),
      gpuMemoryUsed: this.simulateGPUMemory().used,
      gpuMemoryTotal: this.simulateGPUMemory().total,
      cpuUsage,
      ramUsage: (totalMemory - freeMemory) / totalMemory,
      frameDrops: Math.floor(Math.random() * 3),
      renderTime: Math.random() * 10 + 5,
      timestamp: Date.now()
    };
    
    // Add to history
    this.addToHistory(metrics);
    
    return metrics;
  }

  private async getProjectMetrics(projectPath: string): Promise<ProjectMetrics> {
    // Simulated project analysis (would parse actual .toe file)
    return {
      nodeCount: 145,
      connectionCount: 234,
      heaviestNodes: [
        { name: 'render1', cookTime: 5.2 },
        { name: 'blur1', cookTime: 3.8 },
        { name: 'feedback1', cookTime: 2.1 }
      ],
      bottlenecks: this.analyzeBottlenecks(),
      optimizationSuggestions: this.generateOptimizationSuggestions()
    };
  }

  private calculateCPUUsage(cpus: os.CpuInfo[]): number {
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += (cpu.times as any)[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    return 1 - (totalIdle / totalTick);
  }

  private simulateFPS(): number {
    // Simulate realistic FPS with occasional drops
    const baseFPS = 60;
    const variation = Math.random() * 10 - 5;
    return Math.max(30, baseFPS + variation);
  }

  private simulateCookTime(): number {
    // Simulate cook time in milliseconds
    const baseTime = 12;
    const variation = Math.random() * 8 - 4;
    return Math.max(0, baseTime + variation);
  }

  private simulateGPUMemory(): { used: number; total: number } {
    const total = 8192; // 8GB in MB
    const baseUsage = 2048; // 2GB base usage
    const variation = Math.random() * 1024; // Up to 1GB variation
    return {
      used: baseUsage + variation,
      total
    };
  }

  private addToHistory(metrics: PerformanceMetrics): void {
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }
  }

  private analyzeBottlenecks(): Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }> {
    const bottlenecks = [];
    const latest = this.metricsHistory[this.metricsHistory.length - 1];
    
    if (!latest) return [];
    
    // Check FPS
    if (latest.fps < this.warningThresholds.fps) {
      bottlenecks.push({
        type: 'fps',
        description: `FPS below target: ${latest.fps.toFixed(1)}`,
        severity: latest.fps < 20 ? 'high' : 'medium'
      });
    }
    
    // Check cook time
    if (latest.cookTime > this.warningThresholds.cookTime) {
      bottlenecks.push({
        type: 'cookTime',
        description: `High cook time: ${latest.cookTime.toFixed(1)}ms`,
        severity: latest.cookTime > 33 ? 'high' : 'medium'
      });
    }
    
    // Check GPU memory
    const gpuUsageRatio = latest.gpuMemoryUsed / latest.gpuMemoryTotal;
    if (gpuUsageRatio > this.warningThresholds.gpuMemory) {
      bottlenecks.push({
        type: 'gpuMemory',
        description: `High GPU memory usage: ${(gpuUsageRatio * 100).toFixed(1)}%`,
        severity: 'high'
      });
    }
    
    // Check CPU usage
    if (latest.cpuUsage > this.warningThresholds.cpuUsage) {
      bottlenecks.push({
        type: 'cpu',
        description: `High CPU usage: ${(latest.cpuUsage * 100).toFixed(1)}%`,
        severity: latest.cpuUsage > 0.9 ? 'high' : 'medium'
      });
    }
    
    return bottlenecks;
  }

  private generateOptimizationSuggestions(): string[] {
    const suggestions = [];
    const bottlenecks = this.analyzeBottlenecks();
    
    bottlenecks.forEach(bottleneck => {
      switch (bottleneck.type) {
        case 'fps':
          suggestions.push('Consider reducing resolution or disabling real-time effects');
          suggestions.push('Use instancing for repeated geometry');
          break;
        case 'cookTime':
          suggestions.push('Optimize heavy operators or split processing across frames');
          suggestions.push('Use selective cooking to reduce unnecessary updates');
          break;
        case 'gpuMemory':
          suggestions.push('Reduce texture resolutions where possible');
          suggestions.push('Clear unused textures and buffers');
          break;
        case 'cpu':
          suggestions.push('Offload processing to GPU where possible');
          suggestions.push('Reduce Python script complexity');
          break;
      }
    });
    
    // General optimizations
    if (suggestions.length === 0) {
      suggestions.push('Performance is within acceptable ranges');
      suggestions.push('Consider pre-rendering static content');
    }
    
    return [...new Set(suggestions)]; // Remove duplicates
  }

  getHistoricalMetrics(duration: number = 60000): PerformanceMetrics[] {
    const cutoff = Date.now() - duration;
    return this.metricsHistory.filter(m => m.timestamp > cutoff);
  }

  getAverageMetrics(duration: number = 60000): Partial<PerformanceMetrics> {
    const historical = this.getHistoricalMetrics(duration);
    if (historical.length === 0) return {};
    
    const sum = historical.reduce((acc, metrics) => ({
      fps: acc.fps + metrics.fps,
      cookTime: acc.cookTime + metrics.cookTime,
      gpuMemoryUsed: acc.gpuMemoryUsed + metrics.gpuMemoryUsed,
      cpuUsage: acc.cpuUsage + metrics.cpuUsage,
      ramUsage: acc.ramUsage + metrics.ramUsage,
      frameDrops: acc.frameDrops + metrics.frameDrops,
      renderTime: acc.renderTime + metrics.renderTime
    }), {
      fps: 0, cookTime: 0, gpuMemoryUsed: 0, cpuUsage: 0,
      ramUsage: 0, frameDrops: 0, renderTime: 0
    });
    
    const count = historical.length;
    return {
      fps: sum.fps / count,
      cookTime: sum.cookTime / count,
      gpuMemoryUsed: sum.gpuMemoryUsed / count,
      cpuUsage: sum.cpuUsage / count,
      ramUsage: sum.ramUsage / count,
      frameDrops: sum.frameDrops / count,
      renderTime: sum.renderTime / count
    };
  }
}