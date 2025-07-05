import { nanoid } from 'nanoid';

interface ProjectPromptContext {
  template?: string;
  resolution?: string;
  fps?: number;
  features?: string[];
}

interface GenerationPromptContext {
  context?: string;
  style?: string;
  complexity?: 'simple' | 'moderate' | 'complex';
}

interface ParsedProjectSpec {
  nodes: any[];
  connections: any[];
  globals: Record<string, any>;
  perform: {
    resolution: string;
    fps: number;
    realtime: boolean;
  };
  summary: Record<string, any>;
}

interface ParsedNodeSpec {
  nodes: Array<{
    type: string;
    count?: number;
    parameters?: Record<string, any>;
    pattern?: string;
  }>;
  connections: Array<{
    from: string;
    to: string;
    fromOutput?: number;
    toInput?: number;
  }>;
}

export class AIPromptParser {
  private patterns = {
    audioReactive: /audio[\s-]?reactive|sound[\s-]?reactive|music[\s-]?visual|beat[\s-]?sync/i,
    generative: /generative|procedural|algorithmic|random|noise[\s-]?based/i,
    particles: /particle|dots|points|dust|sparkle|floating/i,
    geometry: /3d|geometry|sphere|cube|torus|mesh|polygon/i,
    video: /video|movie|film|clip|footage/i,
    interactive: /interactive|kinect|sensor|motion|tracking|gesture/i,
    dataViz: /data[\s-]?viz|visualization|graph|chart|analytics/i,
    vj: /vj|visual[\s-]?jockey|live[\s-]?visual|performance/i,
    shader: /shader|glsl|material|render/i,
    feedback: /feedback|trail|echo|loop|recursive/i,
    color: {
      warm: /warm|red|orange|yellow|fire|sunset/i,
      cool: /cool|blue|cyan|purple|ice|ocean/i,
      monochrome: /monochrome|black[\s-]?and[\s-]?white|grayscale|bw/i,
      vibrant: /vibrant|colorful|rainbow|bright|neon/i
    },
    movement: {
      fast: /fast|quick|rapid|energetic|dynamic/i,
      slow: /slow|smooth|gentle|calm|peaceful/i,
      organic: /organic|natural|flowing|fluid/i,
      mechanical: /mechanical|robotic|rigid|geometric/i
    }
  };

  async parseProjectPrompt(prompt: string, context: ProjectPromptContext): Promise<ParsedProjectSpec> {
    const spec: ParsedProjectSpec = {
      nodes: [],
      connections: [],
      globals: {},
      perform: {
        resolution: context.resolution || '1920x1080',
        fps: context.fps || 60,
        realtime: true
      },
      summary: {}
    };

    // Analyze prompt for key patterns
    const analysis = this.analyzePrompt(prompt);
    
    // Generate nodes based on analysis
    if (analysis.isAudioReactive) {
      this.addAudioReactiveNodes(spec, analysis);
    }
    
    if (analysis.hasGenerative) {
      this.addGenerativeNodes(spec, analysis);
    }
    
    if (analysis.hasParticles) {
      this.addParticleNodes(spec, analysis);
    }
    
    if (analysis.has3D) {
      this.add3DNodes(spec, analysis);
    }
    
    if (analysis.hasVideo) {
      this.addVideoNodes(spec, analysis);
    }
    
    if (analysis.isInteractive) {
      this.addInteractiveNodes(spec, analysis);
    }
    
    if (analysis.hasDataViz) {
      this.addDataVizNodes(spec, analysis);
    }
    
    if (analysis.hasShaders) {
      this.addShaderNodes(spec, analysis);
    }
    
    if (analysis.hasFeedback) {
      this.addFeedbackNodes(spec, analysis);
    }
    
    // Add output node
    spec.nodes.push({
      id: 'output',
      type: 'outTOP',
      name: 'output',
      x: 600,
      y: 0
    });
    
    // Generate connections
    this.generateConnections(spec, analysis);
    
    // Auto-layout nodes
    this.autoLayout(spec.nodes);
    
    // Generate summary
    spec.summary = {
      type: this.determineProjectType(analysis),
      features: this.extractFeatures(analysis),
      complexity: this.calculateComplexity(spec),
      colorScheme: analysis.colorScheme,
      movement: analysis.movementStyle
    };
    
    return spec;
  }

  async parseGenerationPrompt(prompt: string, context: GenerationPromptContext): Promise<ParsedNodeSpec> {
    const analysis = this.analyzePrompt(prompt);
    const nodeSpec: ParsedNodeSpec = {
      nodes: [],
      connections: []
    };
    
    // Parse for specific node requests
    const nodeRequests = this.extractNodeRequests(prompt);
    
    if (nodeRequests.length > 0) {
      // Specific nodes requested
      nodeSpec.nodes = nodeRequests;
    } else {
      // Generate based on intent
      nodeSpec.nodes = this.generateNodesFromIntent(analysis, context.complexity || 'moderate');
    }
    
    // Generate connections based on node types
    nodeSpec.connections = this.inferConnections(nodeSpec.nodes);
    
    return nodeSpec;
  }

  private analyzePrompt(prompt: string): any {
    const analysis: any = {
      isAudioReactive: this.patterns.audioReactive.test(prompt),
      hasGenerative: this.patterns.generative.test(prompt),
      hasParticles: this.patterns.particles.test(prompt),
      has3D: this.patterns.geometry.test(prompt),
      hasVideo: this.patterns.video.test(prompt),
      isInteractive: this.patterns.interactive.test(prompt),
      hasDataViz: this.patterns.dataViz.test(prompt),
      isVJ: this.patterns.vj.test(prompt),
      hasShaders: this.patterns.shader.test(prompt),
      hasFeedback: this.patterns.feedback.test(prompt),
      colorScheme: this.detectColorScheme(prompt),
      movementStyle: this.detectMovementStyle(prompt),
      keywords: this.extractKeywords(prompt)
    };
    
    return analysis;
  }

  private detectColorScheme(prompt: string): string {
    if (this.patterns.color.warm.test(prompt)) return 'warm';
    if (this.patterns.color.cool.test(prompt)) return 'cool';
    if (this.patterns.color.monochrome.test(prompt)) return 'monochrome';
    if (this.patterns.color.vibrant.test(prompt)) return 'vibrant';
    return 'default';
  }

  private detectMovementStyle(prompt: string): string {
    if (this.patterns.movement.fast.test(prompt)) return 'fast';
    if (this.patterns.movement.slow.test(prompt)) return 'slow';
    if (this.patterns.movement.organic.test(prompt)) return 'organic';
    if (this.patterns.movement.mechanical.test(prompt)) return 'mechanical';
    return 'moderate';
  }

  private extractKeywords(prompt: string): string[] {
    // Extract important keywords for further analysis
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    return prompt.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word));
  }

  private addAudioReactiveNodes(spec: ParsedProjectSpec, analysis: any): void {
    spec.nodes.push(
      {
        id: 'audioIn',
        type: 'audiofileinCHOP',
        name: 'audioIn',
        x: 0,
        y: 0,
        parameters: { play: 1, loop: 1 }
      },
      {
        id: 'spectrum',
        type: 'audiospectrumCHOP',
        name: 'spectrum',
        x: 150,
        y: 0,
        parameters: { bins: 512, attack: 0.04, release: 0.15 }
      },
      {
        id: 'math1',
        type: 'mathCHOP',
        name: 'amplify',
        x: 300,
        y: 0,
        parameters: { gain: 2 }
      },
      {
        id: 'chopToTop',
        type: 'choptoTOP',
        name: 'visualizer',
        x: 450,
        y: 0
      }
    );
  }

  private addGenerativeNodes(spec: ParsedProjectSpec, analysis: any): void {
    const noiseType = analysis.movementStyle === 'organic' ? 'sparse' : 'block';
    
    spec.nodes.push(
      {
        id: 'noise1',
        type: 'noiseTOP',
        name: 'noise1',
        x: 0,
        y: 100,
        parameters: { type: noiseType, period: 1 }
      },
      {
        id: 'transform1',
        type: 'transformTOP',
        name: 'transform1',
        x: 150,
        y: 100,
        parameters: { rotate: 0 }
      }
    );
  }

  private addParticleNodes(spec: ParsedProjectSpec, analysis: any): void {
    spec.nodes.push(
      {
        id: 'particles',
        type: 'particlesGPU',
        name: 'particles',
        x: 0,
        y: 200,
        parameters: { 
          maxparticles: 10000,
          lifetimestart: 2,
          drag: 0.1
        }
      },
      {
        id: 'particleRender',
        type: 'renderTOP',
        name: 'particleRender',
        x: 150,
        y: 200
      }
    );
  }

  private add3DNodes(spec: ParsedProjectSpec, analysis: any): void {
    spec.nodes.push(
      {
        id: 'geo1',
        type: 'torusSOP',
        name: 'geometry',
        x: 0,
        y: 300,
        parameters: { rows: 40, cols: 40 }
      },
      {
        id: 'material1',
        type: 'phongMAT',
        name: 'material',
        x: 0,
        y: 400
      },
      {
        id: 'geoComp',
        type: 'geometryCOMP',
        name: 'geoComp',
        x: 150,
        y: 350
      },
      {
        id: 'camera',
        type: 'cameraCOMP',
        name: 'camera',
        x: 0,
        y: 500,
        parameters: { tz: 5 }
      },
      {
        id: 'light',
        type: 'lightCOMP',
        name: 'light',
        x: 150,
        y: 500,
        parameters: { tz: 2, ty: 2 }
      },
      {
        id: 'render3D',
        type: 'renderTOP',
        name: 'render3D',
        x: 300,
        y: 400
      }
    );
  }

  private addVideoNodes(spec: ParsedProjectSpec, analysis: any): void {
    spec.nodes.push(
      {
        id: 'movieIn',
        type: 'moviefileinTOP',
        name: 'movieIn',
        x: 0,
        y: 600,
        parameters: { play: 1, loop: 1 }
      },
      {
        id: 'level1',
        type: 'levelTOP',
        name: 'colorCorrect',
        x: 150,
        y: 600
      }
    );
  }

  private addInteractiveNodes(spec: ParsedProjectSpec, analysis: any): void {
    spec.nodes.push(
      {
        id: 'kinect',
        type: 'kinectTOP',
        name: 'kinectInput',
        x: 0,
        y: 700
      },
      {
        id: 'threshold',
        type: 'thresholdTOP',
        name: 'depthThreshold',
        x: 150,
        y: 700
      },
      {
        id: 'blobtrack',
        type: 'blobtrackTOP',
        name: 'tracking',
        x: 300,
        y: 700
      }
    );
  }

  private addDataVizNodes(spec: ParsedProjectSpec, analysis: any): void {
    spec.nodes.push(
      {
        id: 'table',
        type: 'tableDAT',
        name: 'dataInput',
        x: 0,
        y: 800
      },
      {
        id: 'datToTop',
        type: 'dattoTOP',
        name: 'visualizeData',
        x: 150,
        y: 800
      }
    );
  }

  private addShaderNodes(spec: ParsedProjectSpec, analysis: any): void {
    spec.nodes.push(
      {
        id: 'glsl',
        type: 'glslTOP',
        name: 'customShader',
        x: 0,
        y: 900
      }
    );
  }

  private addFeedbackNodes(spec: ParsedProjectSpec, analysis: any): void {
    spec.nodes.push(
      {
        id: 'feedback',
        type: 'feedbackTOP',
        name: 'feedback',
        x: 300,
        y: 100,
        parameters: { feedbackamount: 0.5 }
      }
    );
  }

  private generateConnections(spec: ParsedProjectSpec, analysis: any): void {
    // Audio reactive chain
    if (analysis.isAudioReactive) {
      spec.connections.push(
        { from: 'audioIn', to: 'spectrum' },
        { from: 'spectrum', to: 'math1' },
        { from: 'math1', to: 'chopToTop' }
      );
    }
    
    // Generative chain
    if (analysis.hasGenerative) {
      spec.connections.push(
        { from: 'noise1', to: 'transform1' }
      );
      
      if (analysis.hasFeedback) {
        spec.connections.push(
          { from: 'transform1', to: 'feedback' }
        );
      }
    }
    
    // 3D chain
    if (analysis.has3D) {
      spec.connections.push(
        { from: 'geo1', to: 'geoComp', toInput: 0 },
        { from: 'material1', to: 'geoComp', toInput: 1 },
        { from: 'geoComp', to: 'render3D', toInput: 0 },
        { from: 'camera', to: 'render3D', toInput: 1 },
        { from: 'light', to: 'render3D', toInput: 2 }
      );
    }
    
    // Connect to final output
    const finalNodes = this.findFinalNodes(spec);
    if (finalNodes.length === 1) {
      spec.connections.push({ from: finalNodes[0], to: 'output' });
    } else if (finalNodes.length > 1) {
      // Add composite node for multiple outputs
      const compositeId = 'finalComposite';
      spec.nodes.push({
        id: compositeId,
        type: 'compositeTOP',
        name: 'finalMix',
        x: 450,
        y: 0
      });
      
      finalNodes.forEach((node, index) => {
        spec.connections.push({ from: node, to: compositeId, toInput: index });
      });
      
      spec.connections.push({ from: compositeId, to: 'output' });
    }
  }

  private findFinalNodes(spec: ParsedProjectSpec): string[] {
    const targetNodes = new Set(spec.connections.map(c => c.to));
    const sourceNodes = new Set(spec.connections.map(c => c.from));
    
    return spec.nodes
      .filter(n => n.id !== 'output' && sourceNodes.has(n.id) && !targetNodes.has(n.id))
      .map(n => n.id);
  }

  private autoLayout(nodes: any[]): void {
    // Simple grid layout
    const spacing = { x: 150, y: 100 };
    const columns = 4;
    
    nodes.forEach((node, index) => {
      if (node.x === 0 && node.y === 0) {
        node.x = (index % columns) * spacing.x;
        node.y = Math.floor(index / columns) * spacing.y;
      }
    });
  }

  private determineProjectType(analysis: any): string {
    if (analysis.isVJ) return 'vj-performance';
    if (analysis.isAudioReactive) return 'audio-reactive';
    if (analysis.hasDataViz) return 'data-visualization';
    if (analysis.isInteractive) return 'interactive-installation';
    if (analysis.has3D) return '3d-graphics';
    if (analysis.hasGenerative) return 'generative-art';
    return 'mixed-media';
  }

  private extractFeatures(analysis: any): string[] {
    const features = [];
    if (analysis.isAudioReactive) features.push('audio-reactive');
    if (analysis.hasGenerative) features.push('generative');
    if (analysis.hasParticles) features.push('particles');
    if (analysis.has3D) features.push('3d-rendering');
    if (analysis.hasVideo) features.push('video-processing');
    if (analysis.isInteractive) features.push('interactive');
    if (analysis.hasDataViz) features.push('data-visualization');
    if (analysis.hasShaders) features.push('custom-shaders');
    if (analysis.hasFeedback) features.push('feedback-loops');
    return features;
  }

  private calculateComplexity(spec: ParsedProjectSpec): string {
    const nodeCount = spec.nodes.length;
    const connectionCount = spec.connections.length;
    const score = nodeCount + connectionCount * 0.5;
    
    if (score < 10) return 'simple';
    if (score < 25) return 'moderate';
    if (score < 50) return 'complex';
    return 'advanced';
  }

  private extractNodeRequests(prompt: string): any[] {
    // Look for specific node type mentions
    const nodeTypes = [
      'noise', 'blur', 'level', 'composite', 'feedback', 
      'render', 'camera', 'light', 'geometry', 'particle'
    ];
    
    const requests: any[] = [];
    const lowerPrompt = prompt.toLowerCase();
    
    nodeTypes.forEach(type => {
      if (lowerPrompt.includes(type)) {
        // Check for quantity
        const quantityMatch = lowerPrompt.match(new RegExp(`(\\d+)\\s*${type}`));
        const count = quantityMatch ? parseInt(quantityMatch[1]) : 1;
        
        requests.push({
          type: this.mapToTDNodeType(type),
          count,
          pattern: `${type}$i`
        });
      }
    });
    
    return requests;
  }

  private mapToTDNodeType(type: string): string {
    const mapping: Record<string, string> = {
      noise: 'noiseTOP',
      blur: 'blurTOP',
      level: 'levelTOP',
      composite: 'compositeTOP',
      feedback: 'feedbackTOP',
      render: 'renderTOP',
      camera: 'cameraCOMP',
      light: 'lightCOMP',
      geometry: 'boxSOP',
      particle: 'particlesGPU'
    };
    
    return mapping[type] || `${type}TOP`;
  }

  private generateNodesFromIntent(analysis: any, complexity: string): any[] {
    const nodes: any[] = [];
    
    // Base nodes based on features
    if (analysis.hasGenerative || complexity !== 'simple') {
      nodes.push({ type: 'noiseTOP', count: 2 });
    }
    
    if (analysis.colorScheme !== 'default') {
      nodes.push({ type: 'levelTOP' });
      nodes.push({ type: 'hueTOP' });
    }
    
    if (complexity === 'complex' || analysis.hasFeedback) {
      nodes.push({ type: 'feedbackTOP' });
    }
    
    // Always add a final composite
    nodes.push({ type: 'compositeTOP' });
    
    return nodes;
  }

  private inferConnections(nodes: any[]): any[] {
    // Simple linear connection for now
    const connections: any[] = [];
    
    for (let i = 0; i < nodes.length - 1; i++) {
      connections.push({
        from: `${nodes[i].type}1`,
        to: `${nodes[i + 1].type}1`
      });
    }
    
    return connections;
  }
}