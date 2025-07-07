import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';
import { TelemetrySystem } from '../monitoring/TelemetrySystem';
import { PerformanceOptimizer } from '../optimization/PerformanceOptimizer';

interface ProjectPattern {
    id: string;
    name: string;
    description: string;
    projectPath: string;
    nodeStructure: NodePattern[];
    performanceMetrics: PerformancePattern;
    userInteractions: UserInteractionPattern[];
    success: SuccessMetrics;
    tags: string[];
    complexity: 'simple' | 'moderate' | 'complex' | 'advanced';
    createdAt: Date;
    updatedAt: Date;
    learningData: LearningMetadata;
}

interface NodePattern {
    type: string;
    category: 'TOP' | 'SOP' | 'CHOP' | 'DAT' | 'COMP' | 'MAT';
    connections: ConnectionPattern[];
    parameters: ParameterPattern[];
    position: { x: number; y: number };
    frequency: number; // How often this pattern appears
    effectiveness: number; // Success rate when used
    context: string[]; // Common contexts where this pattern is used
}

interface ConnectionPattern {
    sourceType: string;
    targetType: string;
    connectionType: string;
    frequency: number;
    effectiveness: number;
    latency?: number;
    bandwidth?: number;
}

interface ParameterPattern {
    name: string;
    type: string;
    valueRange: { min: number; max: number } | string[];
    commonValues: Array<{ value: any; frequency: number; context: string[] }>;
    correlations: Array<{ parameter: string; correlation: number }>;
    performanceImpact: number;
}

interface PerformancePattern {
    averageFPS: number;
    memoryUsage: number;
    gpuUtilization: number;
    cpuUtilization: number;
    renderTime: number;
    optimizationLevel: number;
    bottlenecks: string[];
    improvements: string[];
}

interface UserInteractionPattern {
    action: string;
    frequency: number;
    sequence: string[];
    context: string;
    outcome: 'success' | 'failure' | 'neutral';
    duration: number;
    learningCurve: number; // How long it took user to master
}

interface SuccessMetrics {
    completionRate: number;
    userSatisfaction: number;
    performanceScore: number;
    maintainabilityScore: number;
    reusabilityScore: number;
    errorRate: number;
    adoptionRate: number;
}

interface LearningMetadata {
    learningSessions: number;
    adaptationRate: number;
    confidenceScore: number;
    validationCount: number;
    feedbackScore: number;
    evolutionHistory: string[];
}

interface RecommendationContext {
    currentProject: string;
    userSkillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    projectType: string;
    performanceTargets: PerformanceTargets;
    constraints: string[];
    preferences: UserPreferences;
}

interface PerformanceTargets {
    targetFPS: number;
    maxMemoryUsage: number;
    maxGPUUtilization: number;
    maxCPUUtilization: number;
    qualityLevel: 'low' | 'medium' | 'high' | 'ultra';
}

interface UserPreferences {
    preferredComplexity: string;
    favoriteOperators: string[];
    workflowStyle: 'visual' | 'scripted' | 'hybrid';
    optimizationPriority: 'performance' | 'quality' | 'maintainability';
}

interface PatternRecommendation {
    pattern: ProjectPattern;
    confidence: number;
    reasoning: string[];
    adaptations: string[];
    riskFactors: string[];
    alternatives: PatternRecommendation[];
}

interface LearningInsight {
    type: 'pattern' | 'optimization' | 'workflow' | 'best-practice';
    insight: string;
    evidence: string[];
    confidence: number;
    applicability: string[];
    impact: 'low' | 'medium' | 'high' | 'critical';
}

export class PatternLearner extends EventEmitter {
    private patterns: Map<string, ProjectPattern> = new Map();
    private learningDatabase: string;
    private telemetrySystem: TelemetrySystem;
    private performanceOptimizer: PerformanceOptimizer;
    private isLearning: boolean = false;
    private learningInterval: NodeJS.Timeout | null = null;
    private adaptationThreshold: number = 0.7;
    private confidenceThreshold: number = 0.8;

    constructor(
        learningDatabasePath: string,
        telemetrySystem: TelemetrySystem,
        performanceOptimizer: PerformanceOptimizer
    ) {
        super();
        this.learningDatabase = learningDatabasePath;
        this.telemetrySystem = telemetrySystem;
        this.performanceOptimizer = performanceOptimizer;

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.telemetrySystem.on('project_analysis', this.onProjectAnalysis.bind(this));
        this.telemetrySystem.on('user_interaction', this.onUserInteraction.bind(this));
        this.telemetrySystem.on('performance_metrics', this.onPerformanceMetrics.bind(this));
        // Note: PerformanceOptimizer doesn't extend EventEmitter, so we'll poll for optimization data
    }

    async initialize(): Promise<void> {
        try {
            await this.loadLearningDatabase();
            await this.startLearningProcess();
            
            this.emit('learning_initialized', {
                patternsLoaded: this.patterns.size,
                databasePath: this.learningDatabase
            });
        } catch (error) {
            this.emit('learning_error', { error: error.message, context: 'initialization' });
            throw error;
        }
    }

    private async loadLearningDatabase(): Promise<void> {
        try {
            const databaseExists = await fs.access(this.learningDatabase).then(() => true).catch(() => false);
            
            if (databaseExists) {
                const data = await fs.readFile(this.learningDatabase, 'utf-8');
                const patterns = JSON.parse(data);
                
                for (const pattern of patterns) {
                    this.patterns.set(pattern.id, {
                        ...pattern,
                        createdAt: new Date(pattern.createdAt),
                        updatedAt: new Date(pattern.updatedAt)
                    });
                }
            } else {
                // Initialize with default patterns
                await this.initializeDefaultPatterns();
            }
        } catch (error) {
            throw new Error(`Failed to load learning database: ${error.message}`);
        }
    }

    private async initializeDefaultPatterns(): Promise<void> {
        const defaultPatterns: ProjectPattern[] = [
            {
                id: 'audio-reactive-basic',
                name: 'Basic Audio Reactive Setup',
                description: 'Simple audio-reactive visualization with spectrum analysis',
                projectPath: '',
                nodeStructure: [
                    {
                        type: 'audiofilein',
                        category: 'CHOP',
                        connections: [{ sourceType: 'audiofilein', targetType: 'audiospectrum', connectionType: 'chop', frequency: 0.9, effectiveness: 0.85 }],
                        parameters: [
                            {
                                name: 'file',
                                type: 'string',
                                valueRange: ['*.wav', '*.mp3', '*.aiff'],
                                commonValues: [{ value: 'audio.wav', frequency: 0.7, context: ['live', 'performance'] }],
                                correlations: [],
                                performanceImpact: 0.1
                            }
                        ],
                        position: { x: 0, y: 0 },
                        frequency: 0.95,
                        effectiveness: 0.88,
                        context: ['audio-reactive', 'live-performance', 'music-visualization']
                    }
                ],
                performanceMetrics: {
                    averageFPS: 60,
                    memoryUsage: 512,
                    gpuUtilization: 45,
                    cpuUtilization: 25,
                    renderTime: 16.6,
                    optimizationLevel: 0.8,
                    bottlenecks: [],
                    improvements: ['Use GPU-based spectrum analysis', 'Optimize texture resolution']
                },
                userInteractions: [],
                success: {
                    completionRate: 0.92,
                    userSatisfaction: 0.85,
                    performanceScore: 0.88,
                    maintainabilityScore: 0.90,
                    reusabilityScore: 0.95,
                    errorRate: 0.05,
                    adoptionRate: 0.88
                },
                tags: ['audio-reactive', 'beginner', 'spectrum', 'visualization'],
                complexity: 'simple',
                createdAt: new Date(),
                updatedAt: new Date(),
                learningData: {
                    learningSessions: 0,
                    adaptationRate: 0.0,
                    confidenceScore: 0.85,
                    validationCount: 0,
                    feedbackScore: 0.0,
                    evolutionHistory: []
                }
            }
        ];

        for (const pattern of defaultPatterns) {
            this.patterns.set(pattern.id, pattern);
        }

        await this.saveLearningDatabase();
    }

    private async saveLearningDatabase(): Promise<void> {
        try {
            const patterns = Array.from(this.patterns.values());
            await fs.writeFile(this.learningDatabase, JSON.stringify(patterns, null, 2));
        } catch (error) {
            this.emit('learning_error', { error: error.message, context: 'save_database' });
        }
    }

    private async startLearningProcess(): Promise<void> {
        this.isLearning = true;
        
        // Run learning analysis every 5 minutes
        this.learningInterval = setInterval(async () => {
            await this.runLearningCycle();
        }, 5 * 60 * 1000);

        this.emit('learning_started');
    }

    private async runLearningCycle(): Promise<void> {
        try {
            const insights = await this.analyzePatternsForInsights();
            await this.updatePatternEffectiveness();
            await this.evolvePatterns();
            await this.generateRecommendations();
            
            this.emit('learning_cycle_complete', {
                insights: insights.length,
                patterns: this.patterns.size,
                timestamp: new Date()
            });
        } catch (error) {
            this.emit('learning_error', { error: error.message, context: 'learning_cycle' });
        }
    }

    private async analyzePatternsForInsights(): Promise<LearningInsight[]> {
        const insights: LearningInsight[] = [];

        // Analyze pattern correlations
        for (const pattern of this.patterns.values()) {
            if (pattern.success.performanceScore > 0.9 && pattern.learningData.confidenceScore > this.confidenceThreshold) {
                insights.push({
                    type: 'pattern',
                    insight: `High-performance pattern "${pattern.name}" shows excellent results in ${pattern.tags.join(', ')} contexts`,
                    evidence: [
                        `Performance score: ${pattern.success.performanceScore}`,
                        `User satisfaction: ${pattern.success.userSatisfaction}`,
                        `Adoption rate: ${pattern.success.adoptionRate}`
                    ],
                    confidence: pattern.learningData.confidenceScore,
                    applicability: pattern.tags,
                    impact: 'high'
                });
            }

            // Analyze parameter correlations
            for (const node of pattern.nodeStructure) {
                for (const param of node.parameters) {
                    if (param.correlations.length > 0 && param.performanceImpact > 0.5) {
                        insights.push({
                            type: 'optimization',
                            insight: `Parameter "${param.name}" in ${node.type} strongly affects performance`,
                            evidence: param.correlations.map(c => `Correlation with ${c.parameter}: ${c.correlation}`),
                            confidence: Math.min(0.9, param.performanceImpact),
                            applicability: node.context,
                            impact: param.performanceImpact > 0.8 ? 'critical' : 'high'
                        });
                    }
                }
            }
        }

        return insights;
    }

    private async updatePatternEffectiveness(): Promise<void> {
        for (const pattern of this.patterns.values()) {
            // Update effectiveness based on recent metrics
            const recentMetrics = await this.getRecentMetricsForPattern(pattern.id);
            
            if (recentMetrics.length > 0) {
                const avgSuccess = recentMetrics.reduce((sum, m) => sum + m.successRate, 0) / recentMetrics.length;
                const avgPerformance = recentMetrics.reduce((sum, m) => sum + m.performanceScore, 0) / recentMetrics.length;
                
                // Adapt pattern effectiveness
                pattern.success.performanceScore = this.adaptiveUpdate(pattern.success.performanceScore, avgPerformance);
                pattern.success.completionRate = this.adaptiveUpdate(pattern.success.completionRate, avgSuccess);
                
                pattern.learningData.learningSessions++;
                pattern.learningData.adaptationRate = this.calculateAdaptationRate(pattern);
                pattern.updatedAt = new Date();
            }
        }
    }

    private adaptiveUpdate(currentValue: number, newValue: number, learningRate: number = 0.1): number {
        return currentValue + learningRate * (newValue - currentValue);
    }

    private calculateAdaptationRate(pattern: ProjectPattern): number {
        const sessions = pattern.learningData.learningSessions;
        if (sessions < 5) return 0.0;
        
        const recentSessions = Math.min(sessions, 10);
        return Math.log(recentSessions) / Math.log(sessions + 1);
    }

    private async getRecentMetricsForPattern(patternId: string): Promise<Array<{ successRate: number; performanceScore: number }>> {
        // Mock implementation - in real scenario, would query telemetry system
        return [];
    }

    private async evolvePatterns(): Promise<void> {
        for (const pattern of this.patterns.values()) {
            if (pattern.learningData.adaptationRate > this.adaptationThreshold) {
                await this.evolvePattern(pattern);
            }
        }
    }

    private async evolvePattern(pattern: ProjectPattern): Promise<void> {
        const evolution = `Evolution ${pattern.learningData.evolutionHistory.length + 1}`;
        
        // Evolve node structure based on success patterns
        for (const node of pattern.nodeStructure) {
            if (node.effectiveness < 0.7) {
                // Find better alternatives
                const alternatives = await this.findAlternativeNodes(node);
                if (alternatives.length > 0) {
                    const bestAlternative = alternatives[0];
                    node.type = bestAlternative.type;
                    node.effectiveness = bestAlternative.effectiveness;
                    
                    pattern.learningData.evolutionHistory.push(
                        `${evolution}: Replaced ${node.type} with ${bestAlternative.type} (effectiveness: ${node.effectiveness} -> ${bestAlternative.effectiveness})`
                    );
                }
            }
        }

        // Evolve parameters based on performance data
        await this.evolvePatternParameters(pattern);
        
        pattern.learningData.confidenceScore = this.calculateConfidenceScore(pattern);
        pattern.updatedAt = new Date();
    }

    private async findAlternativeNodes(node: NodePattern): Promise<Array<{ type: string; effectiveness: number }>> {
        const alternatives: Array<{ type: string; effectiveness: number }> = [];
        
        // Analyze all patterns to find better node alternatives
        for (const pattern of this.patterns.values()) {
            for (const otherNode of pattern.nodeStructure) {
                if (otherNode.category === node.category && 
                    otherNode.type !== node.type && 
                    otherNode.effectiveness > node.effectiveness) {
                    alternatives.push({
                        type: otherNode.type,
                        effectiveness: otherNode.effectiveness
                    });
                }
            }
        }

        return alternatives.sort((a, b) => b.effectiveness - a.effectiveness);
    }

    private async evolvePatternParameters(pattern: ProjectPattern): Promise<void> {
        for (const node of pattern.nodeStructure) {
            for (const param of node.parameters) {
                // Evolve parameter values based on performance correlations
                if (param.correlations.length > 0) {
                    const bestCorrelation = param.correlations.reduce((best, current) => 
                        Math.abs(current.correlation) > Math.abs(best.correlation) ? current : best
                    );
                    
                    if (Math.abs(bestCorrelation.correlation) > 0.7) {
                        // Adjust parameter based on strong correlation
                        param.performanceImpact = Math.min(1.0, param.performanceImpact + 0.1);
                    }
                }
            }
        }
    }

    private calculateConfidenceScore(pattern: ProjectPattern): number {
        const factors = [
            pattern.learningData.learningSessions / 100, // More sessions = higher confidence
            pattern.success.completionRate,
            pattern.success.performanceScore,
            pattern.learningData.adaptationRate,
            1 - pattern.success.errorRate
        ];

        return factors.reduce((sum, factor) => sum + Math.min(1, factor), 0) / factors.length;
    }

    private async generateRecommendations(): Promise<void> {
        // Generate and cache recommendations for common contexts
        const commonContexts = this.getCommonContexts();
        
        for (const context of commonContexts) {
            const recommendations = await this.getRecommendationsForContext(context);
            this.emit('recommendations_generated', { context, recommendations });
        }
    }

    private getCommonContexts(): RecommendationContext[] {
        return [
            {
                currentProject: 'audio-reactive',
                userSkillLevel: 'beginner',
                projectType: 'visualization',
                performanceTargets: { targetFPS: 60, maxMemoryUsage: 1024, maxGPUUtilization: 70, maxCPUUtilization: 50, qualityLevel: 'medium' },
                constraints: ['real-time'],
                preferences: { preferredComplexity: 'simple', favoriteOperators: [], workflowStyle: 'visual', optimizationPriority: 'performance' }
            }
        ];
    }

    // Public API Methods

    async learnFromProject(projectPath: string): Promise<ProjectPattern> {
        try {
            const analysis = await this.analyzeProject(projectPath);
            const pattern = await this.extractPattern(analysis);
            
            this.patterns.set(pattern.id, pattern);
            await this.saveLearningDatabase();
            
            this.emit('pattern_learned', { pattern, projectPath });
            return pattern;
        } catch (error) {
            this.emit('learning_error', { error: error.message, context: 'learn_from_project' });
            throw error;
        }
    }

    async getRecommendations(context: RecommendationContext): Promise<PatternRecommendation[]> {
        const recommendations: PatternRecommendation[] = [];
        
        for (const pattern of this.patterns.values()) {
            const confidence = this.calculateRecommendationConfidence(pattern, context);
            
            if (confidence > 0.5) {
                const reasoning = this.generateRecommendationReasoning(pattern, context);
                const adaptations = await this.generateAdaptations(pattern, context);
                const riskFactors = this.assessRiskFactors(pattern, context);
                
                recommendations.push({
                    pattern,
                    confidence,
                    reasoning,
                    adaptations,
                    riskFactors,
                    alternatives: []
                });
            }
        }

        // Sort by confidence and add alternatives
        recommendations.sort((a, b) => b.confidence - a.confidence);
        
        for (const rec of recommendations.slice(0, 5)) {
            rec.alternatives = recommendations
                .filter(r => r !== rec && this.arePatternsRelated(r.pattern, rec.pattern))
                .slice(0, 3);
        }

        return recommendations.slice(0, 10);
    }

    private calculateRecommendationConfidence(pattern: ProjectPattern, context: RecommendationContext): number {
        const factors = [
            this.calculateContextMatch(pattern, context),
            pattern.learningData.confidenceScore,
            pattern.success.performanceScore,
            pattern.success.userSatisfaction,
            this.calculateSkillLevelMatch(pattern, context.userSkillLevel)
        ];

        return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
    }

    private calculateContextMatch(pattern: ProjectPattern, context: RecommendationContext): number {
        const contextTags = [context.currentProject, context.projectType, ...context.constraints];
        const matchingTags = pattern.tags.filter(tag => contextTags.some(ct => ct.includes(tag) || tag.includes(ct)));
        
        return matchingTags.length / Math.max(pattern.tags.length, contextTags.length);
    }

    private calculateSkillLevelMatch(pattern: ProjectPattern, skillLevel: string): number {
        const complexityMap = { simple: 0, moderate: 1, complex: 2, advanced: 3 };
        const skillMap = { beginner: 0, intermediate: 1, advanced: 2, expert: 3 };
        
        const complexityLevel = complexityMap[pattern.complexity];
        const userLevel = skillMap[skillLevel];
        
        // Perfect match is 1.0, decreases with distance
        const distance = Math.abs(complexityLevel - userLevel);
        return Math.max(0, 1 - distance * 0.3);
    }

    private generateRecommendationReasoning(pattern: ProjectPattern, context: RecommendationContext): string[] {
        const reasoning: string[] = [];
        
        reasoning.push(`High success rate: ${(pattern.success.completionRate * 100).toFixed(1)}%`);
        reasoning.push(`Performance score: ${(pattern.success.performanceScore * 100).toFixed(1)}%`);
        reasoning.push(`Suitable for ${context.userSkillLevel} level`);
        
        if (pattern.learningData.learningSessions > 10) {
            reasoning.push(`Extensively validated through ${pattern.learningData.learningSessions} learning sessions`);
        }
        
        const matchingTags = pattern.tags.filter(tag => 
            context.currentProject.includes(tag) || context.projectType.includes(tag)
        );
        if (matchingTags.length > 0) {
            reasoning.push(`Optimized for: ${matchingTags.join(', ')}`);
        }

        return reasoning;
    }

    private async generateAdaptations(pattern: ProjectPattern, context: RecommendationContext): Promise<string[]> {
        const adaptations: string[] = [];
        
        // Performance adaptations
        if (context.performanceTargets.targetFPS > pattern.performanceMetrics.averageFPS) {
            adaptations.push('Reduce texture resolution for higher FPS');
            adaptations.push('Enable GPU optimization features');
        }
        
        // Memory adaptations
        if (context.performanceTargets.maxMemoryUsage < pattern.performanceMetrics.memoryUsage) {
            adaptations.push('Use lower memory texture formats');
            adaptations.push('Implement texture streaming');
        }
        
        // Skill level adaptations
        if (context.userSkillLevel === 'beginner' && pattern.complexity !== 'simple') {
            adaptations.push('Simplify node network structure');
            adaptations.push('Add explanatory comments');
        }

        return adaptations;
    }

    private assessRiskFactors(pattern: ProjectPattern, context: RecommendationContext): string[] {
        const risks: string[] = [];
        
        if (pattern.success.errorRate > 0.1) {
            risks.push('Higher than average error rate');
        }
        
        if (pattern.learningData.confidenceScore < this.confidenceThreshold) {
            risks.push('Limited validation data');
        }
        
        if (pattern.performanceMetrics.gpuUtilization > context.performanceTargets.maxGPUUtilization) {
            risks.push('May exceed GPU utilization targets');
        }
        
        if (this.calculateSkillLevelMatch(pattern, context.userSkillLevel) < 0.5) {
            risks.push('Complexity may not match user skill level');
        }

        return risks;
    }

    private arePatternsRelated(pattern1: ProjectPattern, pattern2: ProjectPattern): boolean {
        const commonTags = pattern1.tags.filter(tag => pattern2.tags.includes(tag));
        return commonTags.length >= 2 || pattern1.complexity === pattern2.complexity;
    }

    async getInsights(): Promise<LearningInsight[]> {
        return await this.analyzePatternsForInsights();
    }

    async recordUserFeedback(patternId: string, feedback: number): Promise<void> {
        const pattern = this.patterns.get(patternId);
        if (pattern) {
            pattern.learningData.feedbackScore = this.adaptiveUpdate(
                pattern.learningData.feedbackScore, 
                feedback, 
                0.2
            );
            pattern.updatedAt = new Date();
            
            await this.saveLearningDatabase();
            this.emit('feedback_recorded', { patternId, feedback });
        }
    }

    async exportLearningData(): Promise<string> {
        const exportData = {
            patterns: Array.from(this.patterns.values()),
            metadata: {
                totalPatterns: this.patterns.size,
                exportDate: new Date(),
                version: '1.0.0'
            }
        };

        return JSON.stringify(exportData, null, 2);
    }

    private async analyzeProject(projectPath: string): Promise<any> {
        // Mock implementation - would analyze actual TouchDesigner project
        return {
            nodeStructure: [],
            performanceMetrics: {},
            complexity: 'moderate'
        };
    }

    private async extractPattern(analysis: any): Promise<ProjectPattern> {
        // Mock implementation - would extract pattern from analysis
        return {
            id: `pattern-${Date.now()}`,
            name: 'Learned Pattern',
            description: 'Pattern learned from project analysis',
            projectPath: '',
            nodeStructure: [],
            performanceMetrics: {
                averageFPS: 60,
                memoryUsage: 512,
                gpuUtilization: 50,
                cpuUtilization: 30,
                renderTime: 16.6,
                optimizationLevel: 0.8,
                bottlenecks: [],
                improvements: []
            },
            userInteractions: [],
            success: {
                completionRate: 0.8,
                userSatisfaction: 0.8,
                performanceScore: 0.8,
                maintainabilityScore: 0.8,
                reusabilityScore: 0.8,
                errorRate: 0.1,
                adoptionRate: 0.8
            },
            tags: ['learned'],
            complexity: 'moderate',
            createdAt: new Date(),
            updatedAt: new Date(),
            learningData: {
                learningSessions: 1,
                adaptationRate: 0.0,
                confidenceScore: 0.5,
                validationCount: 0,
                feedbackScore: 0.0,
                evolutionHistory: []
            }
        };
    }

    private async getRecommendationsForContext(context: RecommendationContext): Promise<PatternRecommendation[]> {
        return await this.getRecommendations(context);
    }

    // Event handlers
    private async onProjectAnalysis(data: any): Promise<void> {
        if (data.projectPath && data.success) {
            await this.learnFromProject(data.projectPath);
        }
    }

    private async onUserInteraction(data: any): Promise<void> {
        // Learn from user interaction patterns
        const patterns = Array.from(this.patterns.values()).filter(p => 
            p.tags.some(tag => data.context?.includes(tag))
        );

        for (const pattern of patterns) {
            pattern.userInteractions.push({
                action: data.action,
                frequency: 1,
                sequence: data.sequence || [],
                context: data.context || '',
                outcome: data.outcome || 'neutral',
                duration: data.duration || 0,
                learningCurve: data.learningCurve || 0
            });
        }
    }

    private async onPerformanceMetrics(data: any): Promise<void> {
        // Update pattern performance metrics based on real data
        for (const pattern of this.patterns.values()) {
            if (data.projectPath && pattern.projectPath === data.projectPath) {
                pattern.performanceMetrics = { ...pattern.performanceMetrics, ...data.metrics };
                pattern.updatedAt = new Date();
            }
        }
    }

    private async onOptimizationApplied(data: any): Promise<void> {
        // Learn from optimization successes
        const relatedPatterns = Array.from(this.patterns.values()).filter(p =>
            p.tags.some(tag => data.context?.includes(tag))
        );

        for (const pattern of relatedPatterns) {
            if (data.improvement > 0) {
                pattern.success.performanceScore = this.adaptiveUpdate(
                    pattern.success.performanceScore,
                    Math.min(1.0, pattern.success.performanceScore + data.improvement),
                    0.1
                );
            }
        }
    }

    async shutdown(): Promise<void> {
        this.isLearning = false;
        
        if (this.learningInterval) {
            clearInterval(this.learningInterval);
            this.learningInterval = null;
        }

        await this.saveLearningDatabase();
        this.emit('learning_shutdown');
    }
}