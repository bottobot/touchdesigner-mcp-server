/**
 * Performance Optimization Engine
 * 
 * Phase 4: Advanced Features - Performance Optimization System
 * 
 * Implements project analysis for performance bottlenecks, optimization recommendations
 * based on proven patterns from working projects, and adaptive quality settings.
 */

import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';
import { DocumentationTools } from '../tools/DocumentationTools.js';

export interface PerformanceAnalysis {
  overall: PerformanceRating;
  bottlenecks: PerformanceBottleneck[];
  recommendations: OptimizationRecommendation[];
  adaptiveSettings: AdaptiveQualityConfig;
  projectedImpact: PerformanceImpact;
}

export interface PerformanceRating {
  score: number; // 0-100
  category: 'poor' | 'fair' | 'good' | 'excellent';
  criticalIssues: number;
  improvementPotential: number;
}

export interface PerformanceBottleneck {
  type: 'gpu-memory' | 'cpu-bound' | 'io-bound' | 'network' | 'cook-time' | 'resolution';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  description: string;
  measuredImpact: number;
  confidence: number;
}

export interface OptimizationRecommendation {
  id: string;
  type: 'instancing' | 'resolution-scaling' | 'selective-cooking' | 'memory-optimization' | 
        'shader-optimization' | 'data-optimization' | 'caching' | 'parallelization';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  implementation: OptimizationImplementation;
  expectedGain: PerformanceGain;
  complexity: 'simple' | 'moderate' | 'complex';
  basedOnPattern: string; // Reference to proven pattern
}

export interface OptimizationImplementation {
  steps: OptimizationStep[];
  codeChanges: CodeChange[];
  configurationChanges: ConfigChange[];
  validation: ValidationStep[];
}

export interface OptimizationStep {
  order: number;
  action: string;
  description: string;
  automation: AutomationConfig | null;
}

export interface CodeChange {
  file: string;
  type: 'parameter' | 'node-replacement' | 'connection-change' | 'script-addition';
  before: string;
  after: string;
  explanation: string;
}

export interface ConfigChange {
  section: string;
  parameter: string;
  currentValue: any;
  recommendedValue: any;
  reason: string;
}

export interface ValidationStep {
  metric: string;
  expectedImprovement: number;
  testMethod: string;
}

export interface AutomationConfig {
  scriptPath: string;
  parameters: Record<string, any>;
  rollbackMethod: string;
}

export interface PerformanceGain {
  fpsImprovement: number;
  memoryReduction: number;
  cpuReduction: number;
  cookTimeReduction: number;
  confidence: number;
}

export interface AdaptiveQualityConfig {
  enabled: boolean;
  targets: QualityTarget[];
  triggers: QualityTrigger[];
  settings: QualitySetting[];
}

export interface QualityTarget {
  metric: 'fps' | 'memory' | 'cpu' | 'cook-time';
  target: number;
  tolerance: number;
  priority: number;
}

export interface QualityTrigger {
  condition: string;
  threshold: number;
  action: QualityAction;
  cooldown: number;
}

export interface QualityAction {
  type: 'reduce-resolution' | 'disable-effects' | 'reduce-complexity' | 'increase-cache';
  parameters: Record<string, any>;
  reversible: boolean;
}

export interface QualitySetting {
  name: string;
  level: number; // 0-100
  parameters: Record<string, any>;
  performance: PerformanceProfile;
}

export interface PerformanceProfile {
  expectedFPS: number;
  memoryUsage: number;
  cpuUsage: number;
  visualQuality: number;
}

export interface PerformanceImpact {
  beforeOptimization: PerformanceMetrics;
  afterOptimization: PerformanceMetrics;
  improvementPercentage: Record<string, number>;
  implementationTime: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface PerformanceMetrics {
  fps: number;
  cookTime: number;
  memoryUsage: number;
  cpuUsage: number;
  gpuUsage: number;
}

/**
 * Pattern database from proven TouchDesigner projects
 */
export interface ProvenPattern {
  id: string;
  name: string;
  source: string; // e.g., 'PsychedelicFractalViz', 'FogScreenParticleCloud'
  category: string;
  performance: PerformanceCharacteristics;
  implementation: PatternImplementation;
  validation: PatternValidation;
}

export interface PerformanceCharacteristics {
  scalability: number; // 0-100
  memoryEfficiency: number;
  cpuEfficiency: number;
  gpuEfficiency: number;
  stability: number;
  complexity: number;
}

export interface PatternImplementation {
  nodes: NodePattern[];
  connections: ConnectionPattern[];
  parameters: ParameterPattern[];
  scripts: ScriptPattern[];
}

export interface NodePattern {
  type: string;
  usage: string;
  optimizations: string[];
  alternatives: string[];
}

export interface ConnectionPattern {
  fromType: string;
  toType: string;
  purpose: string;
  optimizations: string[];
}

export interface ParameterPattern {
  node: string;
  parameter: string;
  optimalRange: [number, number];
  reason: string;
}

export interface ScriptPattern {
  purpose: string;
  language: 'python' | 'glsl' | 'expression';
  template: string;
  optimizations: string[];
}

export interface PatternValidation {
  testCases: TestCase[];
  benchmarks: Benchmark[];
  requirements: Requirement[];
}

export interface TestCase {
  name: string;
  input: any;
  expectedOutput: any;
  performance: PerformanceExpectation;
}

export interface Benchmark {
  metric: string;
  baseline: number;
  target: number;
  tolerance: number;
}

export interface Requirement {
  type: string;
  condition: string;
  critical: boolean;
}

export interface PerformanceExpectation {
  maxCookTime: number;
  maxMemory: number;
  minFPS: number;
}

export class PerformanceOptimizer {
  private performanceMonitor: PerformanceMonitor;
  private documentationTools: DocumentationTools;
  private provenPatterns: Map<string, ProvenPattern> = new Map();
  private optimizationHistory: Map<string, OptimizationResult[]> = new Map();

  constructor(performanceMonitor: PerformanceMonitor, documentationTools: DocumentationTools) {
    this.performanceMonitor = performanceMonitor;
    this.documentationTools = documentationTools;
    this.initializeProvenPatterns();
  }

  /**
   * Comprehensive project performance analysis
   */
  async analyzeProject(projectPath: string): Promise<PerformanceAnalysis> {
    // Get current performance metrics
    const currentMetrics = await this.performanceMonitor.getMetrics(projectPath);
    
    // Analyze bottlenecks
    const bottlenecks = await this.identifyBottlenecks(currentMetrics);
    
    // Generate recommendations based on proven patterns
    const recommendations = await this.generateRecommendations(bottlenecks, projectPath);
    
    // Configure adaptive quality settings
    const adaptiveSettings = this.configureAdaptiveQuality(currentMetrics, bottlenecks);
    
    // Calculate overall performance rating
    const overall = this.calculatePerformanceRating(currentMetrics, bottlenecks);
    
    // Project performance impact
    const projectedImpact = this.projectPerformanceImpact(currentMetrics, recommendations);

    return {
      overall,
      bottlenecks,
      recommendations,
      adaptiveSettings,
      projectedImpact
    };
  }

  /**
   * Apply optimization recommendations automatically
   */
  async applyOptimizations(
    projectPath: string, 
    recommendations: OptimizationRecommendation[],
    options: { dryRun?: boolean; maxComplexity?: string } = {}
  ): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];
    
    // Filter recommendations by complexity if specified
    let applicableRecommendations = recommendations;
    if (options.maxComplexity) {
      const complexityOrder = { simple: 1, moderate: 2, complex: 3 };
      const maxLevel = complexityOrder[options.maxComplexity];
      applicableRecommendations = recommendations.filter(
        r => complexityOrder[r.complexity] <= maxLevel
      );
    }

    // Sort by priority and expected gain
    applicableRecommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.expectedGain.fpsImprovement - a.expectedGain.fpsImprovement;
    });

    for (const recommendation of applicableRecommendations) {
      try {
        const result = await this.applyOptimization(projectPath, recommendation, options.dryRun);
        results.push(result);
        
        // Store in history for learning
        if (!this.optimizationHistory.has(projectPath)) {
          this.optimizationHistory.set(projectPath, []);
        }
        this.optimizationHistory.get(projectPath)!.push(result);
        
      } catch (error) {
        results.push({
          recommendationId: recommendation.id,
          success: false,
          error: error.message,
          rollbackPerformed: false,
          metricsAfter: null,
          actualGain: null
        });
      }
    }

    return results;
  }

  /**
   * Monitor and adapt performance in real-time
   */
  startAdaptiveOptimization(projectPath: string, config: AdaptiveQualityConfig): void {
    if (!config.enabled) return;

    setInterval(async () => {
      const currentMetrics = await this.performanceMonitor.getMetrics(projectPath);
      
      for (const trigger of config.triggers) {
        if (this.shouldTriggerQualityAdjustment(currentMetrics, trigger)) {
          await this.executeQualityAction(projectPath, trigger.action);
        }
      }
    }, 1000); // Check every second
  }

  private initializeProvenPatterns(): void {
    // FogScreenParticleCloud patterns
    this.provenPatterns.set('fog-instancing-optimization', {
      id: 'fog-instancing-optimization',
      name: 'Fog Screen Particle Instancing',
      source: 'FogScreenParticleCloud',
      category: 'particle-optimization',
      performance: {
        scalability: 95,
        memoryEfficiency: 85,
        cpuEfficiency: 90,
        gpuEfficiency: 95,
        stability: 88,
        complexity: 60
      },
      implementation: {
        nodes: [
          {
            type: 'geometryGPUCOMP',
            usage: 'High-performance particle instancing for fog effects',
            optimizations: ['Use compute shaders', 'Batch similar operations', 'Optimize buffer sizes'],
            alternatives: ['particlesGPU', 'replicatorCOMP']
          }
        ],
        connections: [
          {
            fromType: 'feedbackTOP',
            toType: 'geometryGPUCOMP',
            purpose: 'Persistent particle state management',
            optimizations: ['Use ping-pong buffers', 'Minimize texture reads']
          }
        ],
        parameters: [
          {
            node: 'geometryGPUCOMP',
            parameter: 'instancecount',
            optimalRange: [1000, 50000],
            reason: 'Balance between visual quality and performance'
          }
        ],
        scripts: [
          {
            purpose: 'Dynamic instance count adjustment',
            language: 'python',
            template: 'op("geometryGPU1").par.instancecount = min(target_count, performance_limit)',
            optimizations: ['Cache calculations', 'Use frame-based updates']
          }
        ]
      },
      validation: {
        testCases: [
          {
            name: 'high-particle-count',
            input: { particleCount: 10000 },
            expectedOutput: { fps: 60 },
            performance: { maxCookTime: 16.67, maxMemory: 2048, minFPS: 60 }
          }
        ],
        benchmarks: [
          { metric: 'fps', baseline: 30, target: 60, tolerance: 5 }
        ],
        requirements: [
          { type: 'hardware', condition: 'GPU memory > 4GB', critical: true }
        ]
      }
    });

    // PsychedelicFractalViz patterns
    this.provenPatterns.set('fractal-selective-cooking', {
      id: 'fractal-selective-cooking',
      name: 'Fractal Selective Cooking Optimization',
      source: 'PsychedelicFractalViz',
      category: 'cooking-optimization',
      performance: {
        scalability: 80,
        memoryEfficiency: 75,
        cpuEfficiency: 95,
        gpuEfficiency: 70,
        stability: 92,
        complexity: 45
      },
      implementation: {
        nodes: [
          {
            type: 'switchTOP',
            usage: 'Conditional rendering based on performance metrics',
            optimizations: ['Use performance triggers', 'Cache static content'],
            alternatives: ['selectTOP', 'compositeTOP']
          }
        ],
        connections: [],
        parameters: [
          {
            node: 'base_generator',
            parameter: 'enable',
            optimalRange: [0, 1],
            reason: 'Dynamic enable/disable based on performance'
          }
        ],
        scripts: [
          {
            purpose: 'Performance-based cooking control',
            language: 'python',
            template: `
if performance.fps < target_fps:
    op('heavy_generator').allowCooking = False
else:
    op('heavy_generator').allowCooking = True
            `,
            optimizations: ['Hysteresis for stability', 'Priority-based selection']
          }
        ]
      },
      validation: {
        testCases: [
          {
            name: 'dynamic-cooking-control',
            input: { targetFPS: 60 },
            expectedOutput: { cookingReduced: true },
            performance: { maxCookTime: 10, maxMemory: 1024, minFPS: 55 }
          }
        ],
        benchmarks: [
          { metric: 'cpu_usage', baseline: 80, target: 60, tolerance: 10 }
        ],
        requirements: [
          { type: 'software', condition: 'TouchDesigner 2023.11000+', critical: false }
        ]
      }
    });

    // Quality scaling pattern
    this.provenPatterns.set('adaptive-quality-scaling', {
      id: 'adaptive-quality-scaling',
      name: 'Adaptive Quality Scaling System',
      source: 'PsychedelicFractalViz',
      category: 'quality-management',
      performance: {
        scalability: 90,
        memoryEfficiency: 85,
        cpuEfficiency: 80,
        gpuEfficiency: 88,
        stability: 95,
        complexity: 70
      },
      implementation: {
        nodes: [
          {
            type: 'resampleTOP',
            usage: 'Dynamic resolution scaling based on performance',
            optimizations: ['Use power-of-2 resolutions', 'Smooth transitions'],
            alternatives: ['transformTOP', 'scaleTOP']
          }
        ],
        connections: [],
        parameters: [
          {
            node: 'resampleTOP',
            parameter: 'resolution',
            optimalRange: [256, 2048],
            reason: 'Balance quality vs performance'
          }
        ],
        scripts: [
          {
            purpose: 'Adaptive resolution controller',
            language: 'python',
            template: `
quality_level = calculate_quality_level(performance_metrics)
target_resolution = base_resolution * quality_level
op('resample1').par.resolutionw = target_resolution
            `,
            optimizations: ['Smooth transitions', 'Minimum quality thresholds']
          }
        ]
      },
      validation: {
        testCases: [
          {
            name: 'quality-adaptation',
            input: { performance: 'degraded' },
            expectedOutput: { resolutionReduced: true },
            performance: { maxCookTime: 20, maxMemory: 1536, minFPS: 45 }
          }
        ],
        benchmarks: [
          { metric: 'visual_quality', baseline: 0.8, target: 0.9, tolerance: 0.1 }
        ],
        requirements: []
      }
    });
  }

  private async identifyBottlenecks(metrics: any): Promise<PerformanceBottleneck[]> {
    const bottlenecks: PerformanceBottleneck[] = [];
    
    // GPU Memory bottleneck
    if (metrics.project?.gpuMemoryUsed && metrics.project.gpuMemoryTotal) {
      const usage = metrics.project.gpuMemoryUsed / metrics.project.gpuMemoryTotal;
      if (usage > 0.85) {
        bottlenecks.push({
          type: 'gpu-memory',
          severity: usage > 0.95 ? 'critical' : 'high',
          location: 'GPU memory allocation',
          description: `GPU memory usage at ${(usage * 100).toFixed(1)}%`,
          measuredImpact: (usage - 0.8) * 100,
          confidence: 0.9
        });
      }
    }

    // Cook time bottleneck
    if (metrics.system?.cookTime && metrics.system.cookTime > 16.67) {
      const severity = metrics.system.cookTime > 33 ? 'critical' : 
                     metrics.system.cookTime > 25 ? 'high' : 'medium';
      bottlenecks.push({
        type: 'cook-time',
        severity,
        location: 'Operator cooking pipeline',
        description: `Cook time ${metrics.system.cookTime.toFixed(1)}ms exceeds 60fps target`,
        measuredImpact: ((metrics.system.cookTime - 16.67) / 16.67) * 100,
        confidence: 0.95
      });
    }

    // CPU bottleneck
    if (metrics.system?.cpuUsage && metrics.system.cpuUsage > 0.8) {
      bottlenecks.push({
        type: 'cpu-bound',
        severity: metrics.system.cpuUsage > 0.9 ? 'critical' : 'high',
        location: 'CPU processing',
        description: `CPU usage at ${(metrics.system.cpuUsage * 100).toFixed(1)}%`,
        measuredImpact: (metrics.system.cpuUsage - 0.6) * 100,
        confidence: 0.85
      });
    }

    return bottlenecks;
  }

  private async generateRecommendations(
    bottlenecks: PerformanceBottleneck[], 
    projectPath: string
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];
    
    for (const bottleneck of bottlenecks) {
      const patterns = this.findRelevantPatterns(bottleneck);
      
      for (const pattern of patterns) {
        const recommendation = this.createRecommendationFromPattern(bottleneck, pattern);
        recommendations.push(recommendation);
      }
    }

    // Add general optimizations based on project analysis
    const generalOptimizations = await this.generateGeneralOptimizations(projectPath);
    recommendations.push(...generalOptimizations);

    return this.prioritizeRecommendations(recommendations);
  }

  private findRelevantPatterns(bottleneck: PerformanceBottleneck): ProvenPattern[] {
    const relevantPatterns: ProvenPattern[] = [];
    
    for (const pattern of this.provenPatterns.values()) {
      if (this.isPatternRelevant(pattern, bottleneck)) {
        relevantPatterns.push(pattern);
      }
    }
    
    return relevantPatterns.sort((a, b) => 
      this.calculatePatternRelevance(b, bottleneck) - this.calculatePatternRelevance(a, bottleneck)
    );
  }

  private isPatternRelevant(pattern: ProvenPattern, bottleneck: PerformanceBottleneck): boolean {
    const relevanceMap: Record<string, string[]> = {
      'gpu-memory': ['particle-optimization', 'quality-management'],
      'cook-time': ['cooking-optimization', 'quality-management'],
      'cpu-bound': ['cooking-optimization', 'particle-optimization'],
      'resolution': ['quality-management']
    };
    
    const relevantCategories = relevanceMap[bottleneck.type] || [];
    return relevantCategories.includes(pattern.category);
  }

  private calculatePatternRelevance(pattern: ProvenPattern, bottleneck: PerformanceBottleneck): number {
    // Calculate relevance score based on pattern characteristics and bottleneck type
    let score = 0;
    
    // Performance characteristics alignment
    if (bottleneck.type === 'gpu-memory') {
      score += pattern.performance.memoryEfficiency * 0.4;
      score += pattern.performance.gpuEfficiency * 0.4;
    } else if (bottleneck.type === 'cpu-bound') {
      score += pattern.performance.cpuEfficiency * 0.6;
    } else if (bottleneck.type === 'cook-time') {
      score += pattern.performance.scalability * 0.5;
      score += pattern.performance.cpuEfficiency * 0.3;
    }
    
    // Stability and complexity factors
    score += pattern.performance.stability * 0.2;
    score -= pattern.performance.complexity * 0.1; // Prefer simpler solutions
    
    return score;
  }

  private createRecommendationFromPattern(
    bottleneck: PerformanceBottleneck, 
    pattern: ProvenPattern
  ): OptimizationRecommendation {
    const recommendation: OptimizationRecommendation = {
      id: `${pattern.id}-${Date.now()}`,
      type: this.mapPatternToType(pattern),
      priority: this.calculatePriority(bottleneck, pattern),
      title: `Apply ${pattern.name}`,
      description: `Implement optimization pattern from ${pattern.source} to address ${bottleneck.type} bottleneck`,
      implementation: this.generateImplementationFromPattern(pattern),
      expectedGain: this.calculateExpectedGain(bottleneck, pattern),
      complexity: this.mapComplexityFromPattern(pattern),
      basedOnPattern: pattern.id
    };

    return recommendation;
  }

  private mapPatternToType(pattern: ProvenPattern): OptimizationRecommendation['type'] {
    const typeMap: Record<string, OptimizationRecommendation['type']> = {
      'particle-optimization': 'instancing',
      'cooking-optimization': 'selective-cooking',
      'quality-management': 'resolution-scaling',
      'memory-optimization': 'memory-optimization'
    };
    
    return typeMap[pattern.category] || 'parallelization';
  }

  private calculatePriority(bottleneck: PerformanceBottleneck, pattern: ProvenPattern): 'low' | 'medium' | 'high' | 'critical' {
    if (bottleneck.severity === 'critical') return 'critical';
    if (bottleneck.severity === 'high' && pattern.performance.stability > 85) return 'high';
    if (bottleneck.severity === 'medium') return 'medium';
    return 'low';
  }

  private generateImplementationFromPattern(pattern: ProvenPattern): OptimizationImplementation {
    const steps: OptimizationStep[] = [];
    const codeChanges: CodeChange[] = [];
    const configurationChanges: ConfigChange[] = [];
    const validation: ValidationStep[] = [];

    // Generate steps from pattern
    pattern.implementation.nodes.forEach((node, index) => {
      steps.push({
        order: index + 1,
        action: `Configure ${node.type} for ${node.usage}`,
        description: node.optimizations.join(', '),
        automation: {
          scriptPath: `scripts/optimize_${node.type.toLowerCase()}.py`,
          parameters: { nodeType: node.type },
          rollbackMethod: 'backup_restore'
        }
      });
    });

    // Generate code changes from pattern scripts
    pattern.implementation.scripts.forEach(script => {
      codeChanges.push({
        file: 'performance_optimizer.py',
        type: 'script-addition',
        before: '# Performance optimization placeholder',
        after: script.template,
        explanation: script.purpose
      });
    });

    // Generate configuration changes from pattern parameters
    pattern.implementation.parameters.forEach(param => {
      configurationChanges.push({
        section: param.node,
        parameter: param.parameter,
        currentValue: 'auto-detected',
        recommendedValue: param.optimalRange[1],
        reason: param.reason
      });
    });

    // Generate validation steps from pattern validation
    pattern.validation.benchmarks.forEach(benchmark => {
      validation.push({
        metric: benchmark.metric,
        expectedImprovement: benchmark.target - benchmark.baseline,
        testMethod: `Monitor ${benchmark.metric} for ${benchmark.tolerance} tolerance`
      });
    });

    return { steps, codeChanges, configurationChanges, validation };
  }

  private calculateExpectedGain(bottleneck: PerformanceBottleneck, pattern: ProvenPattern): PerformanceGain {
    const baseGain = bottleneck.measuredImpact * (pattern.performance.scalability / 100);
    
    return {
      fpsImprovement: baseGain * 0.6,
      memoryReduction: baseGain * (pattern.performance.memoryEfficiency / 100),
      cpuReduction: baseGain * (pattern.performance.cpuEfficiency / 100),
      cookTimeReduction: baseGain * 0.8,
      confidence: pattern.performance.stability / 100
    };
  }

  private mapComplexityFromPattern(pattern: ProvenPattern): 'simple' | 'moderate' | 'complex' {
    if (pattern.performance.complexity < 40) return 'simple';
    if (pattern.performance.complexity < 70) return 'moderate';
    return 'complex';
  }

  private async generateGeneralOptimizations(projectPath: string): Promise<OptimizationRecommendation[]> {
    // Generate general recommendations based on common optimization patterns
    return [
      {
        id: 'general-resolution-optimization',
        type: 'resolution-scaling',
        priority: 'medium',
        title: 'Implement Dynamic Resolution Scaling',
        description: 'Add adaptive resolution scaling to maintain performance during high-load scenarios',
        implementation: {
          steps: [
            {
              order: 1,
              action: 'Add resolution controller',
              description: 'Create dynamic resolution adjustment system',
              automation: {
                scriptPath: 'scripts/setup_resolution_scaling.py',
                parameters: { minResolution: 512, maxResolution: 2048 },
                rollbackMethod: 'remove_controller'
              }
            }
          ],
          codeChanges: [],
          configurationChanges: [],
          validation: []
        },
        expectedGain: {
          fpsImprovement: 15,
          memoryReduction: 20,
          cpuReduction: 5,
          cookTimeReduction: 10,
          confidence: 0.8
        },
        complexity: 'moderate',
        basedOnPattern: 'adaptive-quality-scaling'
      }
    ];
  }

  private prioritizeRecommendations(recommendations: OptimizationRecommendation[]): OptimizationRecommendation[] {
    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Secondary sort by expected FPS improvement
      return b.expectedGain.fpsImprovement - a.expectedGain.fpsImprovement;
    });
  }

  private configureAdaptiveQuality(metrics: any, bottlenecks: PerformanceBottleneck[]): AdaptiveQualityConfig {
    const config: AdaptiveQualityConfig = {
      enabled: bottlenecks.length > 0,
      targets: [
        { metric: 'fps', target: 60, tolerance: 5, priority: 1 },
        { metric: 'memory', target: 0.8, tolerance: 0.1, priority: 2 },
        { metric: 'cpu', target: 0.7, tolerance: 0.1, priority: 3 }
      ],
      triggers: [
        {
          condition: 'fps < target',
          threshold: 55,
          action: {
            type: 'reduce-resolution',
            parameters: { scaleFactor: 0.8 },
            reversible: true
          },
          cooldown: 5000
        },
        {
          condition: 'memory_usage > threshold',
          threshold: 0.9,
          action: {
            type: 'increase-cache',
            parameters: { clearOldest: true },
            reversible: false
          },
          cooldown: 10000
        }
      ],
      settings: [
        {
          name: 'High Quality',
          level: 100,
          parameters: { resolution: 2048, effects: 'all' },
          performance: { expectedFPS: 60, memoryUsage: 0.8, cpuUsage: 0.7, visualQuality: 1.0 }
        },
        {
          name: 'Balanced',
          level: 75,
          parameters: { resolution: 1536, effects: 'essential' },
          performance: { expectedFPS: 60, memoryUsage: 0.6, cpuUsage: 0.5, visualQuality: 0.8 }
        },
        {
          name: 'Performance',
          level: 50,
          parameters: { resolution: 1024, effects: 'minimal' },
          performance: { expectedFPS: 60, memoryUsage: 0.4, cpuUsage: 0.4, visualQuality: 0.6 }
        }
      ]
    };

    return config;
  }

  private calculatePerformanceRating(metrics: any, bottlenecks: PerformanceBottleneck[]): PerformanceRating {
    let score = 100;
    let criticalIssues = 0;
    
    // Deduct points for bottlenecks
    for (const bottleneck of bottlenecks) {
      if (bottleneck.severity === 'critical') {
        score -= 30;
        criticalIssues++;
      } else if (bottleneck.severity === 'high') {
        score -= 20;
      } else if (bottleneck.severity === 'medium') {
        score -= 10;
      } else {
        score -= 5;
      }
    }

    score = Math.max(0, Math.min(100, score));
    
    let category: PerformanceRating['category'];
    if (score >= 85) category = 'excellent';
    else if (score >= 70) category = 'good';
    else if (score >= 50) category = 'fair';
    else category = 'poor';

    const improvementPotential = bottlenecks.reduce((sum, b) => sum + b.measuredImpact, 0);

    return {
      score,
      category,
      criticalIssues,
      improvementPotential
    };
  }

  private projectPerformanceImpact(
    currentMetrics: any, 
    recommendations: OptimizationRecommendation[]
  ): PerformanceImpact {
    const totalGain = recommendations.reduce((acc, rec) => ({
      fps: acc.fps + rec.expectedGain.fpsImprovement,
      memory: acc.memory + rec.expectedGain.memoryReduction,
      cpu: acc.cpu + rec.expectedGain.cpuReduction,
      cookTime: acc.cookTime + rec.expectedGain.cookTimeReduction
    }), { fps: 0, memory: 0, cpu: 0, cookTime: 0 });

    const before: PerformanceMetrics = {
      fps: currentMetrics.system?.fps || 60,
      cookTime: currentMetrics.system?.cookTime || 16.67,
      memoryUsage: currentMetrics.system?.ramUsage || 0.5,
      cpuUsage: currentMetrics.system?.cpuUsage || 0.4,
      gpuUsage: currentMetrics.system?.gpuMemoryUsed / currentMetrics.system?.gpuMemoryTotal || 0.3
    };

    const after: PerformanceMetrics = {
      fps: Math.min(120, before.fps + totalGain.fps),
      cookTime: Math.max(8, before.cookTime - totalGain.cookTime),
      memoryUsage: Math.max(0.1, before.memoryUsage - (totalGain.memory / 100)),
      cpuUsage: Math.max(0.1, before.cpuUsage - (totalGain.cpu / 100)),
      gpuUsage: Math.max(0.1, before.gpuUsage - (totalGain.memory / 100))
    };

    const improvementPercentage = {
      fps: ((after.fps - before.fps) / before.fps) * 100,
      cookTime: ((before.cookTime - after.cookTime) / before.cookTime) * 100,
      memory: ((before.memoryUsage - after.memoryUsage) / before.memoryUsage) * 100,
      cpu: ((before.cpuUsage - after.cpuUsage) / before.cpuUsage) * 100
    };

    const complexitySum = recommendations.reduce((sum, rec) => {
      const complexityValues = { simple: 1, moderate: 2, complex: 3 };
      return sum + complexityValues[rec.complexity];
    }, 0);

    const implementationTime = complexitySum * 15; // minutes
    const riskLevel = complexitySum > 10 ? 'high' : complexitySum > 5 ? 'medium' : 'low';

    return {
      beforeOptimization: before,
      afterOptimization: after,
      improvementPercentage,
      implementationTime,
      riskLevel
    };
  }

  private async applyOptimization(
    projectPath: string, 
    recommendation: OptimizationRecommendation, 
    dryRun: boolean = false
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    
    if (dryRun) {
      return {
        recommendationId: recommendation.id,
        success: true,
        dryRun: true,
        error: null,
        rollbackPerformed: false,
        metricsAfter: null,
        actualGain: null
      };
    }

    try {
      // Apply configuration changes
      for (const change of recommendation.implementation.configurationChanges) {
        await this.applyConfigurationChange(projectPath, change);
      }

      // Apply code changes
      for (const change of recommendation.implementation.codeChanges) {
        await this.applyCodeChange(projectPath, change);
      }

      // Wait for changes to take effect
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Measure results
      const metricsAfter = await this.performanceMonitor.getMetrics(projectPath);
      const actualGain = this.calculateActualGain(recommendation.expectedGain, metricsAfter);

      return {
        recommendationId: recommendation.id,
        success: true,
        dryRun: false,
        error: null,
        rollbackPerformed: false,
        metricsAfter,
        actualGain
      };

    } catch (error) {
      return {
        recommendationId: recommendation.id,
        success: false,
        dryRun: false,
        error: error.message,
        rollbackPerformed: false,
        metricsAfter: null,
        actualGain: null
      };
    }
  }

  private async applyConfigurationChange(projectPath: string, change: ConfigChange): Promise<void> {
    // Implementation would apply configuration changes to the TouchDesigner project
    console.log(`Applying config change: ${change.section}.${change.parameter} = ${change.recommendedValue}`);
  }

  private async applyCodeChange(projectPath: string, change: CodeChange): Promise<void> {
    // Implementation would apply code changes to the TouchDesigner project
    console.log(`Applying code change to ${change.file}: ${change.type}`);
  }

  private calculateActualGain(expected: PerformanceGain, metricsAfter: any): PerformanceGain {
    // Compare expected vs actual performance gains
    return {
      fpsImprovement: 0, // Calculate from before/after metrics
      memoryReduction: 0,
      cpuReduction: 0,
      cookTimeReduction: 0,
      confidence: expected.confidence
    };
  }

  private shouldTriggerQualityAdjustment(metrics: any, trigger: QualityTrigger): boolean {
    // Implement trigger condition evaluation
    return false;
  }

  private async executeQualityAction(projectPath: string, action: QualityAction): Promise<void> {
    // Implement quality action execution
    console.log(`Executing quality action: ${action.type}`);
  }
}

export interface OptimizationResult {
  recommendationId: string;
  success: boolean;
  dryRun?: boolean;
  error: string | null;
  rollbackPerformed: boolean;
  metricsAfter: PerformanceMetrics | null;
  actualGain: PerformanceGain | null;
}