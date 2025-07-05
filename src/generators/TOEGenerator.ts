import * as fs from 'fs/promises';
import * as path from 'path';
import { nanoid } from 'nanoid';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { Builder } from 'xml2js';

const gzip = promisify(zlib.gzip);

interface NodeDefinition {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  inputs?: Record<string, any>;
  parameters?: Record<string, any>;
  flags?: string[];
  children?: NodeDefinition[];
}

interface ConnectionDefinition {
  from: string;
  fromOutput?: number;
  to: string;
  toInput?: number;
}

interface ProjectSpec {
  nodes: NodeDefinition[];
  connections: ConnectionDefinition[];
  globals?: Record<string, any>;
  perform?: {
    resolution: string;
    fps: number;
    realtime: boolean;
  };
  summary?: Record<string, any>;
}

export class TOEGenerator {
  private nodeCounter = 0;
  private projectPath: string;

  constructor(projectPath?: string) {
    this.projectPath = projectPath || process.env.TD_PROJECT_PATH || 'C:/Users/talla/Documents/touchdesigner-projects';
  }

  async createProject(name: string, spec: ProjectSpec): Promise<string> {
    const projectDir = path.join(this.projectPath, name);
    await fs.mkdir(projectDir, { recursive: true });
    
    const toeContent = await this.generateTOEContent(spec);
    const projectFile = path.join(projectDir, `${name}.toe`);
    
    // TOE files are essentially compressed TouchDesigner XML
    const compressed = await gzip(toeContent);
    await fs.writeFile(projectFile, compressed);
    
    // Also save a backup as readable XML
    await fs.writeFile(path.join(projectDir, `${name}.xml`), toeContent);
    
    return projectFile;
  }

  private async generateTOEContent(spec: ProjectSpec): Promise<string> {
    const builder = new Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: true, indent: '  ' }
    });

    const project = {
      TouchDesignerProject: {
        $: {
          version: '2023.11290',
          build: '11290'
        },
        perform: this.generatePerformSection(spec.perform),
        network: {
          $: { name: 'root' },
          node: spec.nodes.map(node => this.generateNode(node)),
          wire: spec.connections.map(conn => this.generateConnection(conn))
        },
        globals: spec.globals || {}
      }
    };

    return builder.buildObject(project);
  }

  private generatePerformSection(perform?: ProjectSpec['perform']) {
    const defaults = {
      resolution: '1920x1080',
      fps: 60,
      realtime: true
    };
    
    const settings = { ...defaults, ...perform };
    const [width, height] = settings.resolution.split('x').map(Number);
    
    return {
      $: {
        realTime: settings.realtime ? '1' : '0',
        frameRate: settings.fps.toString(),
        renderWidth: width.toString(),
        renderHeight: height.toString()
      }
    };
  }

  private generateNode(node: NodeDefinition): any {
    const nodeObj: any = {
      $: {
        id: node.id || this.generateNodeId(),
        type: node.type,
        name: node.name,
        x: node.x.toString(),
        y: node.y.toString()
      }
    };

    if (node.parameters) {
      nodeObj.parm = Object.entries(node.parameters).map(([name, value]) => ({
        $: { name },
        _: String(value)
      }));
    }

    if (node.inputs) {
      nodeObj.input = Object.entries(node.inputs).map(([name, value]) => ({
        $: { name },
        _: String(value)
      }));
    }

    if (node.flags) {
      nodeObj.flag = node.flags.map(flag => ({ $: { name: flag } }));
    }

    if (node.children && node.children.length > 0) {
      nodeObj.network = {
        node: node.children.map(child => this.generateNode(child))
      };
    }

    return nodeObj;
  }

  private generateConnection(conn: ConnectionDefinition): any {
    return {
      $: {
        fromOp: conn.from,
        fromOpOutput: (conn.fromOutput || 0).toString(),
        toOp: conn.to,
        toOpInput: (conn.toInput || 0).toString()
      }
    };
  }

  private generateNodeId(): string {
    return `op${++this.nodeCounter}`;
  }

  // Helper methods for common node patterns
  
  createConstantTOP(name: string, resolution: string = '1920x1080', color: string = '0 0 0 1'): NodeDefinition {
    return {
      id: this.generateNodeId(),
      type: 'constantTOP',
      name,
      x: 0,
      y: 0,
      parameters: {
        resolutionw: resolution.split('x')[0],
        resolutionh: resolution.split('x')[1],
        colorr: color.split(' ')[0],
        colorg: color.split(' ')[1],
        colorb: color.split(' ')[2],
        colora: color.split(' ')[3]
      }
    };
  }

  createNoiseTOP(name: string, type: string = 'sparse'): NodeDefinition {
    return {
      id: this.generateNodeId(),
      type: 'noiseTOP',
      name,
      x: 0,
      y: 0,
      parameters: {
        type,
        period: '1',
        amplitude: '1',
        offset: '0',
        monochrome: '0'
      }
    };
  }

  createMovieFileInTOP(name: string, file: string): NodeDefinition {
    return {
      id: this.generateNodeId(),
      type: 'moviefileinTOP',
      name,
      x: 0,
      y: 0,
      parameters: {
        file,
        play: '1',
        loop: '1',
        reload: '0'
      }
    };
  }

  createCompositeTOP(name: string, operation: string = 'over'): NodeDefinition {
    return {
      id: this.generateNodeId(),
      type: 'compositeTOP',
      name,
      x: 0,
      y: 0,
      parameters: {
        operand: operation,
        preMultiply: '1'
      }
    };
  }

  createAudioFileInCHOP(name: string, file: string): NodeDefinition {
    return {
      id: this.generateNodeId(),
      type: 'audiofileinCHOP',
      name,
      x: 0,
      y: 0,
      parameters: {
        file,
        play: '1',
        loop: '1',
        volume: '1'
      }
    };
  }

  createAudioSpectrumCHOP(name: string): NodeDefinition {
    return {
      id: this.generateNodeId(),
      type: 'audiospectrumCHOP',
      name,
      x: 0,
      y: 0,
      parameters: {
        attack: '0.04',
        release: '0.15',
        bins: '256'
      }
    };
  }

  createGeometryCOMP(name: string, material?: string): NodeDefinition {
    return {
      id: this.generateNodeId(),
      type: 'geometryCOMP',
      name,
      x: 0,
      y: 0,
      parameters: material ? { material } : {},
      children: [
        {
          id: this.generateNodeId(),
          type: 'torusSOP',
          name: 'torus1',
          x: 0,
          y: 0,
          parameters: {
            rows: '40',
            cols: '40',
            innerradius: '0.25',
            outerradius: '0.5'
          }
        }
      ]
    };
  }

  createCameraCOMP(name: string): NodeDefinition {
    return {
      id: this.generateNodeId(),
      type: 'cameraCOMP',
      name,
      x: 0,
      y: 0,
      parameters: {
        tz: '5',
        fov: '45',
        near: '0.001',
        far: '1000'
      }
    };
  }

  createLightCOMP(name: string, type: string = 'point'): NodeDefinition {
    return {
      id: this.generateNodeId(),
      type: 'lightCOMP',
      name,
      x: 0,
      y: 0,
      parameters: {
        lighttype: type,
        tz: '2',
        ty: '2',
        dimmer: '1',
        colorr: '1',
        colorg: '1',
        colorb: '1'
      }
    };
  }

  createRenderTOP(name: string, camera: string, geometry: string): NodeDefinition {
    return {
      id: this.generateNodeId(),
      type: 'renderTOP',
      name,
      x: 0,
      y: 0,
      parameters: {
        camera,
        geometry,
        lights: '*',
        resolutionw: '1920',
        resolutionh: '1080'
      }
    };
  }

  // Helper to create connections between nodes
  connect(from: string, to: string, fromOutput: number = 0, toInput: number = 0): ConnectionDefinition {
    return { from, to, fromOutput, toInput };
  }

  // Layout helper
  autoLayout(nodes: NodeDefinition[], columns: number = 4): void {
    const spacing = { x: 150, y: 100 };
    nodes.forEach((node, index) => {
      node.x = (index % columns) * spacing.x;
      node.y = Math.floor(index / columns) * spacing.y;
    });
  }
}