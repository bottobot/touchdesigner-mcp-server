import * as fs from 'fs/promises';
import * as path from 'path';
import { nanoid } from 'nanoid';

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

interface PythonScriptResult {
  scriptPath: string;
  projectPath: string;
  executionCommand: string;
}

export class TouchDesignerPythonBridge {
  private projectsPath: string;
  private scriptsPath: string;

  constructor(projectsPath?: string) {
    this.projectsPath = projectsPath || process.env.TD_PROJECT_PATH || 'C:/Users/talla/Documents/touchdesigner-projects';
    this.scriptsPath = path.join(this.projectsPath, 'scripts');
  }

  async createProject(name: string, spec: ProjectSpec): Promise<PythonScriptResult> {
    const projectDir = path.join(this.projectsPath, name);
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(this.scriptsPath, { recursive: true });

    const scriptContent = this.generatePythonScript(name, spec);
    const scriptPath = path.join(this.scriptsPath, `create_${name}_${nanoid(8)}.py`);
    
    await fs.writeFile(scriptPath, scriptContent);

    const projectPath = path.join(projectDir, `${name}.toe`);
    const executionCommand = `python "${scriptPath}"`;

    return {
      scriptPath,
      projectPath,
      executionCommand
    };
  }

  private generatePythonScript(projectName: string, spec: ProjectSpec): string {
    const { nodes, connections, perform } = spec;
    
    // Generate Python script using TouchDesigner API
    const script = `"""
TouchDesigner Project Creation Script
Generated by TouchDesigner MCP Server
Project: ${projectName}
"""

import td
import os
import sys
from pathlib import Path

def create_project():
    """Create TouchDesigner project using real TD API"""
    print(f"Creating TouchDesigner project: ${projectName}")
    
    # Clear existing project
    clear_project()
    
    # Configure project settings
    configure_project_settings()
    
    # Create nodes
    nodes = create_nodes()
    
    # Make connections
    create_connections(nodes)
    
    # Save project
    save_project()
    
    print("Project created successfully!")

def clear_project():
    """Clear existing operators in root"""
    for child in list(td.root.children):
        if child.name not in ['project1', 'local']:
            child.destroy()

def configure_project_settings():
    """Configure project performance settings"""
    ${this.generateProjectSettings(perform)}

def create_nodes():
    """Create all nodes and return node mapping"""
    nodes = {}
    
    ${nodes.map(node => this.generateNodeCreation(node)).join('\n    ')}
    
    return nodes

def create_connections(nodes):
    """Create connections between nodes"""
    ${connections.map(conn => this.generateConnection(conn)).join('\n    ')}

def save_project():
    """Save the project file"""
    project_path = Path(r"${path.join(this.projectsPath, projectName, projectName + '.toe')}")
    project_path.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        td.project.save(str(project_path))
        print(f"Project saved to: {project_path}")
    except Exception as e:
        print(f"Error saving project: {e}")

${nodes.map(node => this.generateNodeSetupFunction(node)).join('\n')}

if __name__ == "__main__":
    try:
        if 'td' not in globals():
            print("ERROR: This script must be run from within TouchDesigner")
            print("Open TouchDesigner and run: python \\\"${path.join(this.scriptsPath, `create_${projectName}_${nanoid(8)}.py`)}.replace(/\\/g, '\\\\')}\\\")
            sys.exit(1)
        
        create_project()
    except Exception as e:
        print(f"Error creating project: {e}")
        import traceback
        traceback.print_exc()
`;

    return script;
  }

  private generateProjectSettings(perform?: ProjectSpec['perform']): string {
    const settings = {
      resolution: '1920x1080',
      fps: 60,
      realtime: true,
      ...perform
    };

    const [width, height] = settings.resolution.split('x').map(Number);

    return `
    # Set project performance settings
    td.project.cookrate = ${settings.fps}
    td.project.realtime = ${settings.realtime}
    
    # Set resolution if perform window exists
    if hasattr(td.project, 'perform'):
        td.project.perform.par.w = ${width}
        td.project.perform.par.h = ${height}`;
  }

  private generateNodeCreation(node: NodeDefinition): string {
    const nodeVar = this.sanitizeVariableName(node.name);
    
    // Map MCP node types to TouchDesigner types
    const tdType = this.mapToTouchDesignerType(node.type);
    
    return `
    # Create ${node.name} (${node.type})
    try:
        ${nodeVar} = td.root.create(${tdType}, '${node.name}')
        ${nodeVar}.nodeX = ${node.x}
        ${nodeVar}.nodeY = ${node.y}
        
        # Configure parameters
        ${this.generateParameterSettings(nodeVar, node.parameters)}
        
        # Store in nodes dict
        nodes['${node.name}'] = ${nodeVar}
        print(f"Created {node.name}")
        
    except Exception as e:
        print(f"Error creating {node.name}: {e}")`;
  }

  private generateParameterSettings(nodeVar: string, parameters?: Record<string, any>): string {
    if (!parameters) return '';
    
    return Object.entries(parameters)
      .map(([param, value]) => {
        if (typeof value === 'string') {
          return `${nodeVar}.par.${param} = '${value}'`;
        } else if (Array.isArray(value)) {
          return `${nodeVar}.par.${param} = [${value.join(', ')}]`;
        } else {
          return `${nodeVar}.par.${param} = ${value}`;
        }
      })
      .join('\n        ');
  }

  private generateConnection(connection: ConnectionDefinition): string {
    return `
    # Connect ${connection.from} -> ${connection.to}
    try:
        from_node = nodes.get('${connection.from}')
        to_node = nodes.get('${connection.to}')
        
        if from_node and to_node:
            to_node.inputConnectors[${connection.toInput || 0}].connect(from_node, ${connection.fromOutput || 0})
            print(f"Connected {connection.from} -> ${connection.to}")
        else:
            print(f"Warning: Could not connect {connection.from} -> ${connection.to} (nodes not found)")
    except Exception as e:
        print(f"Error connecting {connection.from} -> ${connection.to}: {e}")`;
  }

  private generateNodeSetupFunction(node: NodeDefinition): string {
    if (!node.children || node.children.length === 0) return '';
    
    const nodeVar = this.sanitizeVariableName(node.name);
    
    return `
def setup_${nodeVar}_children():
    """Set up child nodes for ${node.name}"""
    parent_node = td.root.op('${node.name}')
    if not parent_node:
        print(f"Warning: Parent node ${node.name} not found")
        return
    
    ${node.children.map(child => `
    # Create child: ${child.name}
    try:
        child_node = parent_node.create(${this.mapToTouchDesignerType(child.type)}, '${child.name}')
        child_node.nodeX = ${child.x}
        child_node.nodeY = ${child.y}
        ${this.generateParameterSettings('child_node', child.parameters)}
        print(f"Created child node: ${child.name}")
    except Exception as e:
        print(f"Error creating child ${child.name}: {e}")
    `).join('')}`;
  }

  private mapToTouchDesignerType(mcpType: string): string {
    // Map MCP server types to TouchDesigner operator types
    const typeMap: Record<string, string> = {
      // TOPs
      'constantTOP': 'td.topType',
      'noiseTOP': 'td.topType', 
      'moviefileinTOP': 'td.topType',
      'compositeTOP': 'td.topType',
      'renderTOP': 'td.topType',
      'outTOP': 'td.topType',
      'levelTOP': 'td.topType',
      'blurTOP': 'td.topType',
      'transformTOP': 'td.topType',
      'glslTOP': 'td.topType',
      
      // CHOPs
      'audiofileinCHOP': 'td.chopType',
      'audiospectrumCHOP': 'td.chopType',
      'constantCHOP': 'td.chopType',
      'noiseCHOP': 'td.chopType',
      'oscCHOP': 'td.chopType',
      'midiinCHOP': 'td.chopType',
      
      // SOPs
      'torusSOP': 'td.sopType',
      'sphereSOP': 'td.sopType',
      'gridSOP': 'td.sopType',
      'cubeSOP': 'td.sopType',
      'noiseSOP': 'td.sopType',
      
      // MATs
      'phongMAT': 'td.matType',
      'constantMAT': 'td.matType',
      'wireframeMAT': 'td.matType',
      
      // COMPs
      'geometryCOMP': 'td.compType',
      'cameraCOMP': 'td.compType',
      'lightCOMP': 'td.compType',
      'baseCOMP': 'td.compType',
      
      // DATs
      'textDAT': 'td.datType',
      'scriptDAT': 'td.datType',
      'oscDAT': 'td.datType',
      'webSocketDAT': 'td.datType'
    };
    
    return typeMap[mcpType] || 'td.baseCOMP';
  }

  private sanitizeVariableName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
  }

  // Helper methods for common TouchDesigner patterns
  
  async generateAudioReactiveProject(name: string, audioFile: string): Promise<PythonScriptResult> {
    const spec: ProjectSpec = {
      nodes: [
        {
          id: 'audio1',
          type: 'audiofileinCHOP',
          name: 'audio_input',
          x: 0,
          y: 0,
          parameters: {
            file: audioFile,
            play: 1,
            loop: 1
          }
        },
        {
          id: 'spectrum1',
          type: 'audiospectrumCHOP',
          name: 'audio_spectrum',
          x: 150,
          y: 0,
          parameters: {
            attack: 0.04,
            release: 0.15,
            bins: 128
          }
        },
        {
          id: 'noise1',
          type: 'noiseTOP',
          name: 'base_noise',
          x: 0,
          y: -100,
          parameters: {
            type: 'sparse',
            period: 1,
            amplitude: 1
          }
        },
        {
          id: 'level1',
          type: 'levelTOP',
          name: 'audio_modulation',
          x: 150,
          y: -100,
          parameters: {
            opacity: '${audio_spectrum[0,0]}'
          }
        }
      ],
      connections: [
        { from: 'audio_input', to: 'audio_spectrum' },
        { from: 'base_noise', to: 'audio_modulation' }
      ],
      perform: {
        resolution: '1920x1080',
        fps: 60,
        realtime: true
      }
    };

    return this.createProject(name, spec);
  }

  async generateGenerativeArtProject(name: string): Promise<PythonScriptResult> {
    const spec: ProjectSpec = {
      nodes: [
        {
          id: 'noise1',
          type: 'noiseTOP',
          name: 'noise_base',
          x: 0,
          y: 0,
          parameters: {
            type: 'sparse',
            period: 0.5,
            amplitude: 1,
            offset: 0
          }
        },
        {
          id: 'noise2',
          type: 'noiseTOP',
          name: 'noise_detail',
          x: 0,
          y: -100,
          parameters: {
            type: 'simplex',
            period: 0.1,
            amplitude: 0.5
          }
        },
        {
          id: 'composite1',
          type: 'compositeTOP',
          name: 'noise_composite',
          x: 150,
          y: -50,
          parameters: {
            operand: 'add',
            preMultiply: 1
          }
        },
        {
          id: 'level1',
          type: 'levelTOP',
          name: 'color_grade',
          x: 300,
          y: -50,
          parameters: {
            contrast: 1.5,
            brightness: 0.1,
            gamma: 1.2
          }
        }
      ],
      connections: [
        { from: 'noise_base', to: 'noise_composite', toInput: 0 },
        { from: 'noise_detail', to: 'noise_composite', toInput: 1 },
        { from: 'noise_composite', to: 'color_grade' }
      ],
      perform: {
        resolution: '1920x1080',
        fps: 60,
        realtime: true
      }
    };

    return this.createProject(name, spec);
  }

  async generateInteractiveProject(name: string): Promise<PythonScriptResult> {
    const spec: ProjectSpec = {
      nodes: [
        {
          id: 'kinect1',
          type: 'kinect2TOP',
          name: 'kinect_input',
          x: 0,
          y: 0,
          parameters: {
            device: 0,
            depthrange: [500, 4000]
          }
        },
        {
          id: 'level1',
          type: 'levelTOP',
          name: 'depth_process',
          x: 150,
          y: 0,
          parameters: {
            contrast: 2.0,
            brightness: 0.0
          }
        },
        {
          id: 'noise1',
          type: 'noiseTOP',
          name: 'particle_noise',
          x: 0,
          y: -100,
          parameters: {
            type: 'sparse',
            period: 1.0
          }
        },
        {
          id: 'composite1',
          type: 'compositeTOP',
          name: 'depth_composite',
          x: 300,
          y: -50,
          parameters: {
            operand: 'multiply'
          }
        }
      ],
      connections: [
        { from: 'kinect_input', to: 'depth_process' },
        { from: 'depth_process', to: 'depth_composite', toInput: 0 },
        { from: 'particle_noise', to: 'depth_composite', toInput: 1 }
      ],
      perform: {
        resolution: '1280x720',
        fps: 60,
        realtime: true
      }
    };

    return this.createProject(name, spec);
  }
}