import { nanoid } from 'nanoid';

export interface NodeSpec {
  type: string;
  category: 'TOP' | 'CHOP' | 'SOP' | 'MAT' | 'DAT' | 'COMP';
  name: string;
  parameters?: Record<string, any>;
  inputs?: string[];
  outputs?: string[];
  description?: string;
}

export interface GeneratedNode {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  parameters: Record<string, any>;
}

export interface NodeGenerationSpec {
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
  layout?: 'grid' | 'flow' | 'radial' | 'tree';
}

export class NodeLibrary {
  private nodeTypes: Map<string, NodeSpec> = new Map();
  private categories = ['TOP', 'CHOP', 'SOP', 'MAT', 'DAT', 'COMP'];
  
  async loadBuiltinNodes(): Promise<void> {
    // Texture Operators (TOPs)
    this.registerNode({
      type: 'constantTOP',
      category: 'TOP',
      name: 'Constant',
      parameters: {
        resolutionw: 1920,
        resolutionh: 1080,
        colorr: 0, colorg: 0, colorb: 0, colora: 1
      },
      outputs: ['out1']
    });

    this.registerNode({
      type: 'noiseTOP',
      category: 'TOP',
      name: 'Noise',
      parameters: {
        type: 'sparse',
        period: 1,
        amplitude: 1,
        offset: 0,
        monochrome: 0
      },
      inputs: ['in1'],
      outputs: ['out1']
    });

    this.registerNode({
      type: 'rampTOP',
      category: 'TOP',
      name: 'Ramp',
      parameters: {
        type: 'horizontal',
        phase: 0,
        cycles: 1
      },
      outputs: ['out1']
    });

    this.registerNode({
      type: 'compositeTOP',
      category: 'TOP',
      name: 'Composite',
      parameters: {
        operand: 'over',
        preMultiply: 1
      },
      inputs: ['in1', 'in2'],
      outputs: ['out1']
    });

    this.registerNode({
      type: 'levelTOP',
      category: 'TOP',
      name: 'Level',
      parameters: {
        brightness: 1,
        contrast: 1,
        gamma: 1,
        opacity: 1
      },
      inputs: ['in1'],
      outputs: ['out1']
    });

    this.registerNode({
      type: 'blurTOP',
      category: 'TOP',
      name: 'Blur',
      parameters: {
        size: 1,
        filter: 'gaussian'
      },
      inputs: ['in1'],
      outputs: ['out1']
    });

    this.registerNode({
      type: 'feedbackTOP',
      category: 'TOP',
      name: 'Feedback',
      parameters: {
        feedbackamount: 0.5
      },
      inputs: ['in1', 'feedback'],
      outputs: ['out1']
    });

    // Channel Operators (CHOPs)
    this.registerNode({
      type: 'audiofileinCHOP',
      category: 'CHOP',
      name: 'Audio File In',
      parameters: {
        file: '',
        play: 1,
        loop: 1,
        volume: 1
      },
      outputs: ['out1']
    });

    this.registerNode({
      type: 'audiospectrumCHOP',
      category: 'CHOP',
      name: 'Audio Spectrum',
      parameters: {
        attack: 0.04,
        release: 0.15,
        bins: 256
      },
      inputs: ['in1'],
      outputs: ['out1']
    });

    this.registerNode({
      type: 'noiseCHOP',
      category: 'CHOP',
      name: 'Noise',
      parameters: {
        type: 'sparse',
        seed: 1,
        roughness: 0.5,
        period: 10
      },
      outputs: ['out1']
    });

    this.registerNode({
      type: 'mathCHOP',
      category: 'CHOP',
      name: 'Math',
      parameters: {
        preoff: 0,
        gain: 1,
        postoff: 0,
        function: 'off'
      },
      inputs: ['in1'],
      outputs: ['out1']
    });

    this.registerNode({
      type: 'oscCHOP',
      category: 'CHOP',
      name: 'OSC In',
      parameters: {
        port: 7000,
        active: 1
      },
      outputs: ['out1']
    });

    // Surface Operators (SOPs)
    this.registerNode({
      type: 'boxSOP',
      category: 'SOP',
      name: 'Box',
      parameters: {
        sizex: 1, sizey: 1, sizez: 1,
        divsx: 1, divsy: 1, divsz: 1
      },
      outputs: ['out1']
    });

    this.registerNode({
      type: 'sphereSOP',
      category: 'SOP',
      name: 'Sphere',
      parameters: {
        radius: 0.5,
        rows: 20,
        cols: 20
      },
      outputs: ['out1']
    });

    this.registerNode({
      type: 'noiseSOP',
      category: 'SOP',
      name: 'Noise',
      parameters: {
        amplitude: 0.1,
        period: 1,
        roughness: 0.5
      },
      inputs: ['in1'],
      outputs: ['out1']
    });

    this.registerNode({
      type: 'transformSOP',
      category: 'SOP',
      name: 'Transform',
      parameters: {
        tx: 0, ty: 0, tz: 0,
        rx: 0, ry: 0, rz: 0,
        sx: 1, sy: 1, sz: 1
      },
      inputs: ['in1'],
      outputs: ['out1']
    });

    // Material Operators (MATs)
    this.registerNode({
      type: 'constantMAT',
      category: 'MAT',
      name: 'Constant',
      parameters: {
        colorr: 1, colorg: 1, colorb: 1,
        alpha: 1,
        emission: 0
      },
      outputs: ['out1']
    });

    this.registerNode({
      type: 'phongMAT',
      category: 'MAT',
      name: 'Phong',
      parameters: {
        diffr: 1, diffg: 1, diffb: 1,
        specr: 1, specg: 1, specb: 1,
        shininess: 20
      },
      inputs: ['diffuseMap', 'normalMap'],
      outputs: ['out1']
    });

    // Data Operators (DATs)
    this.registerNode({
      type: 'tableDAT',
      category: 'DAT',
      name: 'Table',
      parameters: {
        rows: 10,
        cols: 3
      },
      outputs: ['out1']
    });

    this.registerNode({
      type: 'textDAT',
      category: 'DAT',
      name: 'Text',
      parameters: {
        text: ''
      },
      outputs: ['out1']
    });

    this.registerNode({
      type: 'oscDAT',
      category: 'DAT',
      name: 'OSC In',
      parameters: {
        port: 7000,
        active: 1
      },
      outputs: ['out1']
    });

    // Component Operators (COMPs)
    this.registerNode({
      type: 'geometryCOMP',
      category: 'COMP',
      name: 'Geometry',
      parameters: {
        material: '',
        render: 1,
        display: 1
      },
      inputs: ['geometry', 'material'],
      outputs: ['out1']
    });

    this.registerNode({
      type: 'cameraCOMP',
      category: 'COMP',
      name: 'Camera',
      parameters: {
        tz: 5,
        fov: 45,
        near: 0.001,
        far: 1000
      },
      outputs: ['out1']
    });

    this.registerNode({
      type: 'lightCOMP',
      category: 'COMP',
      name: 'Light',
      parameters: {
        lighttype: 'point',
        tz: 2, ty: 2,
        dimmer: 1,
        colorr: 1, colorg: 1, colorb: 1
      },
      outputs: ['out1']
    });

    this.registerNode({
      type: 'containerCOMP',
      category: 'COMP',
      name: 'Container',
      parameters: {
        w: 400,
        h: 300,
        alignorder: 0
      },
      outputs: ['out1']
    });
  }

  registerNode(spec: NodeSpec): void {
    this.nodeTypes.set(spec.type, spec);
  }

  getNode(type: string): NodeSpec | undefined {
    return this.nodeTypes.get(type);
  }

  getNodesByCategory(category: string): NodeSpec[] {
    return Array.from(this.nodeTypes.values())
      .filter(node => node.category === category);
  }

  searchNodes(query: string): NodeSpec[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.nodeTypes.values())
      .filter(node => 
        node.type.toLowerCase().includes(lowerQuery) ||
        node.name.toLowerCase().includes(lowerQuery) ||
        node.description?.toLowerCase().includes(lowerQuery)
      );
  }

  async generateFromSpec(spec: NodeGenerationSpec): Promise<GeneratedNode[]> {
    const nodes: GeneratedNode[] = [];
    let nodeIndex = 0;

    for (const nodeSpec of spec.nodes) {
      const count = nodeSpec.count || 1;
      const baseNode = this.getNode(nodeSpec.type);
      
      if (!baseNode) {
        console.warn(`Unknown node type: ${nodeSpec.type}`);
        continue;
      }

      for (let i = 0; i < count; i++) {
        const name = nodeSpec.pattern 
          ? nodeSpec.pattern.replace('$i', String(i))
          : `${baseNode.name}${count > 1 ? i + 1 : ''}`;

        const node: GeneratedNode = {
          id: nanoid(8),
          type: nodeSpec.type,
          name,
          x: 0,
          y: 0,
          parameters: {
            ...baseNode.parameters,
            ...nodeSpec.parameters
          }
        };

        nodes.push(node);
        nodeIndex++;
      }
    }

    // Apply layout
    this.applyLayout(nodes, spec.layout || 'grid');

    return nodes;
  }

  private applyLayout(nodes: GeneratedNode[], layout: string): void {
    const spacing = { x: 150, y: 100 };

    switch (layout) {
      case 'grid': {
        const cols = Math.ceil(Math.sqrt(nodes.length));
        nodes.forEach((node, i) => {
          node.x = (i % cols) * spacing.x;
          node.y = Math.floor(i / cols) * spacing.y;
        });
        break;
      }

      case 'flow': {
        let x = 0;
        nodes.forEach((node, i) => {
          node.x = x;
          node.y = (i % 2) * spacing.y;
          x += spacing.x;
        });
        break;
      }

      case 'radial': {
        const radius = nodes.length * 20;
        const angleStep = (2 * Math.PI) / nodes.length;
        nodes.forEach((node, i) => {
          const angle = i * angleStep;
          node.x = Math.cos(angle) * radius;
          node.y = Math.sin(angle) * radius;
        });
        break;
      }

      case 'tree': {
        // Simple tree layout
        const levels: GeneratedNode[][] = [];
        const levelSize = Math.ceil(Math.sqrt(nodes.length));
        
        for (let i = 0; i < nodes.length; i += levelSize) {
          levels.push(nodes.slice(i, i + levelSize));
        }

        levels.forEach((level, levelIndex) => {
          const levelWidth = level.length * spacing.x;
          const startX = -levelWidth / 2;
          
          level.forEach((node, nodeIndex) => {
            node.x = startX + nodeIndex * spacing.x;
            node.y = levelIndex * spacing.y * 2;
          });
        });
        break;
      }
    }
  }

  // Generate common patterns
  generateAudioReactiveChain(): NodeGenerationSpec {
    return {
      nodes: [
        { type: 'audiofileinCHOP', parameters: { file: 'audio.mp3' } },
        { type: 'audiospectrumCHOP' },
        { type: 'mathCHOP', parameters: { gain: 2 } },
        { type: 'noiseTOP' },
        { type: 'feedbackTOP' },
        { type: 'levelTOP' },
        { type: 'compositeTOP' }
      ],
      connections: [
        { from: 'audiofileinCHOP1', to: 'audiospectrumCHOP1' },
        { from: 'audiospectrumCHOP1', to: 'mathCHOP1' },
        { from: 'noiseTOP1', to: 'feedbackTOP1' },
        { from: 'feedbackTOP1', to: 'levelTOP1' },
        { from: 'levelTOP1', to: 'compositeTOP1' }
      ],
      layout: 'flow'
    };
  }

  generate3DScene(): NodeGenerationSpec {
    return {
      nodes: [
        { type: 'sphereSOP' },
        { type: 'noiseSOP' },
        { type: 'transformSOP' },
        { type: 'phongMAT' },
        { type: 'geometryCOMP' },
        { type: 'cameraCOMP' },
        { type: 'lightCOMP', count: 2 },
        { type: 'renderTOP' }
      ],
      connections: [
        { from: 'sphereSOP1', to: 'noiseSOP1' },
        { from: 'noiseSOP1', to: 'transformSOP1' },
        { from: 'transformSOP1', to: 'geometryCOMP1', toInput: 0 },
        { from: 'phongMAT1', to: 'geometryCOMP1', toInput: 1 }
      ],
      layout: 'tree'
    };
  }
}