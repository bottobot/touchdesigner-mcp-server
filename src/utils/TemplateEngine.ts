import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { nanoid } from 'nanoid';

interface TemplateParams {
  type: 'audio-reactive' | 'generative-art' | 'data-viz' | 'interactive' | 'vj-setup' | 'installation';
  name: string;
  description?: string;
  parameters?: Record<string, any>;
}

interface Template {
  id: string;
  type: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  structure: {
    nodes: any[];
    connections: any[];
    containers: any[];
  };
  presets: Record<string, any>;
}

export class TemplateEngine {
  private templatesPath: string;
  private templates: Map<string, Template> = new Map();

  constructor(templatesPath?: string) {
    this.templatesPath = templatesPath || path.join(process.cwd(), 'templates');
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.templatesPath, { recursive: true });
    await this.loadBuiltinTemplates();
  }

  private async loadBuiltinTemplates(): Promise<void> {
    // Audio Reactive Template
    this.templates.set('audio-reactive', {
      id: 'audio-reactive',
      type: 'audio-reactive',
      name: 'Audio Reactive Visualizer',
      description: 'Template for creating audio-reactive visuals',
      parameters: {
        audioInput: 'file',
        fftSize: 512,
        smoothing: 0.8,
        colorScheme: 'spectrum'
      },
      structure: {
        nodes: [
          { type: 'audiofileinCHOP', name: 'audioInput', params: { file: '' } },
          { type: 'audiospectrumCHOP', name: 'spectrum', params: { bins: 512 } },
          { type: 'mathCHOP', name: 'amplify', params: { gain: 2 } },
          { type: 'choptoTOP', name: 'spectrumViz' },
          { type: 'noiseTOP', name: 'noiseBase' },
          { type: 'feedbackTOP', name: 'feedback' },
          { type: 'levelTOP', name: 'colorCorrect' },
          { type: 'compositeTOP', name: 'finalComp' },
          { type: 'outTOP', name: 'output' }
        ],
        connections: [
          { from: 'audioInput', to: 'spectrum' },
          { from: 'spectrum', to: 'amplify' },
          { from: 'amplify', to: 'spectrumViz' },
          { from: 'noiseBase', to: 'feedback' },
          { from: 'feedback', to: 'colorCorrect' },
          { from: 'colorCorrect', to: 'finalComp', toInput: 0 },
          { from: 'spectrumViz', to: 'finalComp', toInput: 1 },
          { from: 'finalComp', to: 'output' }
        ],
        containers: []
      },
      presets: {
        minimal: { gain: 1, feedback: 0.3 },
        intense: { gain: 3, feedback: 0.8 },
        smooth: { gain: 1.5, feedback: 0.5, smoothing: 0.9 }
      }
    });

    // Generative Art Template
    this.templates.set('generative-art', {
      id: 'generative-art',
      type: 'generative-art',
      name: 'Generative Art System',
      description: 'Template for creating generative art',
      parameters: {
        seed: 1,
        complexity: 'medium',
        colorMode: 'gradient',
        animationSpeed: 1
      },
      structure: {
        nodes: [
          { type: 'noiseTOP', name: 'noise1', params: { type: 'sparse' } },
          { type: 'noiseTOP', name: 'noise2', params: { type: 'alligator' } },
          { type: 'mathTOP', name: 'blend', params: { combine: 'multiply' } },
          { type: 'rampTOP', name: 'gradient' },
          { type: 'lookupTOP', name: 'colorMap' },
          { type: 'feedbackTOP', name: 'feedback' },
          { type: 'transformTOP', name: 'transform' },
          { type: 'compositeTOP', name: 'composite' },
          { type: 'outTOP', name: 'output' }
        ],
        connections: [
          { from: 'noise1', to: 'blend', toInput: 0 },
          { from: 'noise2', to: 'blend', toInput: 1 },
          { from: 'blend', to: 'colorMap', toInput: 0 },
          { from: 'gradient', to: 'colorMap', toInput: 1 },
          { from: 'colorMap', to: 'feedback' },
          { from: 'feedback', to: 'transform' },
          { from: 'transform', to: 'composite' },
          { from: 'composite', to: 'output' }
        ],
        containers: []
      },
      presets: {
        organic: { noiseType: 'sparse', speed: 0.5 },
        geometric: { noiseType: 'block', speed: 0.2 },
        fluid: { noiseType: 'alligator', speed: 1.5 }
      }
    });

    // Data Visualization Template
    this.templates.set('data-viz', {
      id: 'data-viz',
      type: 'data-viz',
      name: 'Data Visualization',
      description: 'Template for visualizing data streams',
      parameters: {
        dataSource: 'csv',
        updateRate: 30,
        chartType: 'line',
        dimensions: '2D'
      },
      structure: {
        nodes: [
          { type: 'tableDAT', name: 'dataInput' },
          { type: 'dattoTOP', name: 'dataViz' },
          { type: 'scriptTOP', name: 'chartGenerator' },
          { type: 'textTOP', name: 'labels' },
          { type: 'compositeTOP', name: 'composite' },
          { type: 'outTOP', name: 'output' }
        ],
        connections: [
          { from: 'dataInput', to: 'dataViz' },
          { from: 'dataViz', to: 'chartGenerator' },
          { from: 'chartGenerator', to: 'composite', toInput: 0 },
          { from: 'labels', to: 'composite', toInput: 1 },
          { from: 'composite', to: 'output' }
        ],
        containers: [
          { name: 'dataProcessing', nodes: ['dataInput', 'dataViz'] },
          { name: 'visualization', nodes: ['chartGenerator', 'labels', 'composite'] }
        ]
      },
      presets: {
        realtime: { updateRate: 60, smooth: true },
        static: { updateRate: 0, smooth: false },
        animated: { updateRate: 30, smooth: true, transition: 'ease' }
      }
    });

    // Interactive Installation Template
    this.templates.set('interactive', {
      id: 'interactive',
      type: 'interactive',
      name: 'Interactive Installation',
      description: 'Template for interactive installations with sensors',
      parameters: {
        inputDevice: 'kinect',
        trackingMode: 'skeleton',
        interactionRadius: 2,
        responseType: 'particles'
      },
      structure: {
        nodes: [
          { type: 'kinectTOP', name: 'kinectInput' },
          { type: 'thresholdTOP', name: 'depthThreshold' },
          { type: 'blobtrackTOP', name: 'tracking' },
          { type: 'particlesGPU', name: 'particles' },
          { type: 'renderTOP', name: 'render' },
          { type: 'compositeTOP', name: 'composite' },
          { type: 'outTOP', name: 'output' }
        ],
        connections: [
          { from: 'kinectInput', to: 'depthThreshold' },
          { from: 'depthThreshold', to: 'tracking' },
          { from: 'tracking', to: 'particles' },
          { from: 'particles', to: 'render' },
          { from: 'render', to: 'composite' },
          { from: 'composite', to: 'output' }
        ],
        containers: [
          { name: 'input', nodes: ['kinectInput', 'depthThreshold', 'tracking'] },
          { name: 'visualization', nodes: ['particles', 'render'] }
        ]
      },
      presets: {
        responsive: { sensitivity: 0.8, delay: 0.1 },
        smooth: { sensitivity: 0.5, delay: 0.3 },
        reactive: { sensitivity: 1.0, delay: 0 }
      }
    });

    // VJ Setup Template
    this.templates.set('vj-setup', {
      id: 'vj-setup',
      type: 'vj-setup',
      name: 'VJ Performance Setup',
      description: 'Complete VJ setup with mixer and effects',
      parameters: {
        channels: 4,
        effectsPerChannel: 3,
        outputResolution: '1920x1080',
        bpm: 120
      },
      structure: {
        nodes: this.generateVJNodes(4),
        connections: this.generateVJConnections(4),
        containers: this.generateVJContainers(4)
      },
      presets: {
        club: { bpm: 128, effects: 'heavy' },
        ambient: { bpm: 90, effects: 'subtle' },
        festival: { bpm: 140, effects: 'intense' }
      }
    });
  }

  async create(params: TemplateParams): Promise<string> {
    const template: Template = {
      id: nanoid(8),
      type: params.type,
      name: params.name,
      description: params.description || '',
      parameters: params.parameters || {},
      structure: this.templates.get(params.type)?.structure || { nodes: [], connections: [], containers: [] },
      presets: {}
    };

    const templatePath = path.join(this.templatesPath, `${template.id}.yaml`);
    await fs.writeFile(templatePath, yaml.dump(template));

    this.templates.set(template.id, template);
    return templatePath;
  }

  async applyTemplate(projectPath: string, templateId: string): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Load project file and apply template structure
    // This would integrate with TOEGenerator to modify the project
    console.log(`Applying template ${templateId} to project ${projectPath}`);
  }

  getTemplate(id: string): Template | undefined {
    return this.templates.get(id);
  }

  getAllTemplates(): Template[] {
    return Array.from(this.templates.values());
  }

  // Helper methods for generating complex templates
  private generateVJNodes(channels: number): any[] {
    const nodes: any[] = [];
    
    // Master output
    nodes.push({ type: 'outTOP', name: 'masterOut' });
    nodes.push({ type: 'crossTOP', name: 'masterMixer' });
    
    // Channel strips
    for (let i = 0; i < channels; i++) {
      nodes.push({ type: 'moviefileinTOP', name: `source${i}` });
      nodes.push({ type: 'levelTOP', name: `level${i}` });
      nodes.push({ type: 'transformTOP', name: `transform${i}` });
      nodes.push({ type: 'feedbackTOP', name: `feedback${i}` });
      nodes.push({ type: 'compositeTOP', name: `channelMix${i}` });
    }
    
    // Effects rack
    nodes.push({ type: 'blurTOP', name: 'blur' });
    nodes.push({ type: 'edgeTOP', name: 'edge' });
    nodes.push({ type: 'rgbkeyTOP', name: 'chromakey' });
    nodes.push({ type: 'slopeTOP', name: 'emboss' });
    
    // Beat detection
    nodes.push({ type: 'audiofileinCHOP', name: 'audioIn' });
    nodes.push({ type: 'audiospectrumCHOP', name: 'spectrum' });
    nodes.push({ type: 'analyzeCHOP', name: 'beatDetect' });
    
    return nodes;
  }

  private generateVJConnections(channels: number): any[] {
    const connections: any[] = [];
    
    // Connect channels to mixer
    for (let i = 0; i < channels; i++) {
      connections.push({ from: `source${i}`, to: `level${i}` });
      connections.push({ from: `level${i}`, to: `transform${i}` });
      connections.push({ from: `transform${i}`, to: `feedback${i}` });
      connections.push({ from: `feedback${i}`, to: `channelMix${i}` });
      connections.push({ from: `channelMix${i}`, to: 'masterMixer', toInput: i });
    }
    
    // Master output
    connections.push({ from: 'masterMixer', to: 'masterOut' });
    
    // Audio connections
    connections.push({ from: 'audioIn', to: 'spectrum' });
    connections.push({ from: 'spectrum', to: 'beatDetect' });
    
    return connections;
  }

  private generateVJContainers(channels: number): any[] {
    const containers: any[] = [];
    
    // Channel containers
    for (let i = 0; i < channels; i++) {
      containers.push({
        name: `channel${i}`,
        nodes: [`source${i}`, `level${i}`, `transform${i}`, `feedback${i}`, `channelMix${i}`]
      });
    }
    
    // Master section
    containers.push({
      name: 'master',
      nodes: ['masterMixer', 'masterOut']
    });
    
    // Effects
    containers.push({
      name: 'effects',
      nodes: ['blur', 'edge', 'chromakey', 'emboss']
    });
    
    // Audio
    containers.push({
      name: 'audio',
      nodes: ['audioIn', 'spectrum', 'beatDetect']
    });
    
    return containers;
  }
}