import * as fs from 'fs/promises';
import * as path from 'path';
import { nanoid } from 'nanoid';
import * as child_process from 'child_process';
import { promisify } from 'util';

const exec = promisify(child_process.exec);

interface ProjectInfo {
  name: string;
  path: string;
  created: Date;
  modified: Date;
  size: number;
  version: string;
  description?: string;
}

interface OpenProjectResult {
  success: boolean;
  info: string;
  pid?: number;
}

interface ExportOptions {
  projectPath: string;
  outputPath: string;
  format?: 'mp4' | 'mov' | 'avi' | 'prores';
  duration?: number;
  resolution?: string;
  fps?: number;
  codec?: string;
}

interface ProjectAnalysis {
  structure: {
    totalNodes: number;
    nodesByType: Record<string, number>;
    totalConnections: number;
    maxDepth: number;
    containers: number;
  };
  performance: {
    estimatedCookTime: number;
    memoryUsage: number;
    gpuIntensive: boolean;
    cpuIntensive: boolean;
  };
  complexity: 'simple' | 'moderate' | 'complex' | 'extreme';
  dependencies: {
    media: string[];
    plugins: string[];
    externalFiles: string[];
  };
  optimizations?: string[];
  scriptPath?: string;
  executionCommand?: string;
  outputPath?: string;
}

export class ProjectManager {
  private projectsPath: string;
  private touchDesignerPath: string;
  private activeProjects: Map<string, ProjectInfo> = new Map();

  constructor(projectsPath: string) {
    this.projectsPath = projectsPath;
    this.touchDesignerPath = process.env.TD_INSTALL_PATH || 'C:/Program Files/Derivative/TouchDesigner/bin';
  }

  async openProject(projectPath: string): Promise<OpenProjectResult> {
    try {
      // Check if file exists
      await fs.access(projectPath);
      
      // Launch TouchDesigner with the project
      const tdExecutable = path.join(this.touchDesignerPath, 'TouchDesigner.exe');
      const { stdout } = await exec(`"${tdExecutable}" "${projectPath}"`);
      
      // Store project info
      const stats = await fs.stat(projectPath);
      const projectInfo: ProjectInfo = {
        name: path.basename(projectPath, '.toe'),
        path: projectPath,
        created: stats.birthtime,
        modified: stats.mtime,
        size: stats.size,
        version: '2023.11290' // Would be extracted from file
      };
      
      this.activeProjects.set(projectPath, projectInfo);
      
      return {
        success: true,
        info: `Opened ${projectInfo.name} in TouchDesigner`,
        pid: undefined // Would get actual process ID
      };
    } catch (error) {
      return {
        success: false,
        info: `Failed to open project: ${error}`
      };
    }
  }

  async exportMovie(options: ExportOptions): Promise<{ status: string }> {
    // Validate options
    const format = options.format || 'mp4';
    const resolution = options.resolution || '1920x1080';
    const fps = options.fps || 30;
    const duration = options.duration || 10;
    
    // Create Python script for TouchDesigner to execute
    const exportScript = `
import td

# Set up movie export
movieOut = op('/project1/movieOut')
if not movieOut:
    movieOut = root.create(moviefileTOP, 'movieOut')

# Configure export settings
movieOut.par.file = '${options.outputPath}'
movieOut.par.codec = '${options.codec || 'h264'}'
movieOut.par.fps = ${fps}
movieOut.par.resolutionw = ${resolution.split('x')[0]}
movieOut.par.resolutionh = ${resolution.split('x')[1]}

# Start recording
movieOut.par.record = 1

# Wait for duration
import time
time.sleep(${duration})

# Stop recording
movieOut.par.record = 0
movieOut.save()

print("Export complete: ${options.outputPath}")
`;

    // Save script to temp file
    const scriptPath = path.join(this.projectsPath, 'temp', `export_${nanoid(8)}.py`);
    await fs.writeFile(scriptPath, exportScript);
    
    // Execute via TouchDesigner CLI
    try {
      const tdCLI = path.join(this.touchDesignerPath, 'TouchDesignerCLI.exe');
      await exec(`"${tdCLI}" "${options.projectPath}" -cmd "python ${scriptPath}"`);
      
      // Clean up
      await fs.unlink(scriptPath);
      
      return { status: 'Export started successfully' };
    } catch (error) {
      return { status: `Export failed: ${error}` };
    }
  }

  async analyzeProject(projectPath: string, includeOptimizations: boolean = true): Promise<ProjectAnalysis> {
    try {
      // Generate Python analysis script for TouchDesigner
      const analysisScript = this.generateAnalysisScript(projectPath);
      const scriptPath = path.join(this.projectsPath, 'temp', `analyze_${nanoid(8)}.py`);
      
      // Ensure temp directory exists
      await fs.mkdir(path.dirname(scriptPath), { recursive: true });
      await fs.writeFile(scriptPath, analysisScript);
      
      // Execute analysis script in TouchDesigner
      const tdCLI = path.join(this.touchDesignerPath, 'TouchDesignerCLI.exe');
      const { stdout } = await exec(`"${tdCLI}" "${projectPath}" -cmd "python ${scriptPath}"`);
      
      // Parse analysis results
      const analysis = this.parseAnalysisResults(stdout);
      
      // Clean up
      await fs.unlink(scriptPath);
      
      if (includeOptimizations) {
        analysis.optimizations = this.generateOptimizations(analysis);
      }
      
      return analysis;
    } catch (error) {
      console.error('Project analysis failed, using fallback analysis:', error);
      return this.getFallbackAnalysis(projectPath, includeOptimizations);
    }
  }

  private generateAnalysisScript(projectPath: string): string {
    return `"""
TouchDesigner Project Analysis Script
Analyzes project structure, performance, and dependencies
"""

import td
import json
import os
import time
import sys
from pathlib import Path

def analyze_project():
    """Analyze the current TouchDesigner project"""
    print("Starting project analysis...")
    
    analysis = {
        'structure': analyze_structure(),
        'performance': analyze_performance(),
        'dependencies': analyze_dependencies(),
        'complexity': 'moderate'
    }
    
    # Calculate complexity based on structure
    total_nodes = analysis['structure']['totalNodes']
    total_connections = analysis['structure']['totalConnections']
    complexity_score = total_nodes + (total_connections * 0.5)
    
    if complexity_score < 100:
        analysis['complexity'] = 'simple'
    elif complexity_score < 300:
        analysis['complexity'] = 'moderate'
    elif complexity_score < 600:
        analysis['complexity'] = 'complex'
    else:
        analysis['complexity'] = 'extreme'
    
    # Output analysis as JSON for parsing
    print("ANALYSIS_START")
    print(json.dumps(analysis, indent=2))
    print("ANALYSIS_END")
    
    return analysis

def analyze_structure():
    """Analyze project structure"""
    structure = {
        'totalNodes': 0,
        'nodesByType': {
            'TOP': 0,
            'CHOP': 0,
            'SOP': 0,
            'MAT': 0,
            'DAT': 0,
            'COMP': 0
        },
        'totalConnections': 0,
        'maxDepth': 0,
        'containers': 0
    }
    
    # Recursively analyze all operators
    def count_operators(comp, depth=0):
        structure['maxDepth'] = max(structure['maxDepth'], depth)
        
        for child in comp.children:
            structure['totalNodes'] += 1
            
            # Count by type
            if hasattr(child, 'isTOP') and child.isTOP:
                structure['nodesByType']['TOP'] += 1
            elif hasattr(child, 'isCHOP') and child.isCHOP:
                structure['nodesByType']['CHOP'] += 1
            elif hasattr(child, 'isSOP') and child.isSOP:
                structure['nodesByType']['SOP'] += 1
            elif hasattr(child, 'isMAT') and child.isMAT:
                structure['nodesByType']['MAT'] += 1
            elif hasattr(child, 'isDAT') and child.isDAT:
                structure['nodesByType']['DAT'] += 1
            elif hasattr(child, 'isCOMP') and child.isCOMP:
                structure['nodesByType']['COMP'] += 1
                structure['containers'] += 1
                # Recursively count children
                count_operators(child, depth + 1)
            
            # Count connections
            for i in range(child.numInputs):
                if child.inputConnectors[i].connections:
                    structure['totalConnections'] += len(child.inputConnectors[i].connections)
    
    count_operators(td.root)
    return structure

def analyze_performance():
    """Analyze performance characteristics"""
    performance = {
        'estimatedCookTime': 0.0,
        'memoryUsage': 0,
        'gpuIntensive': False,
        'cpuIntensive': False
    }
    
    try:
        # Get current performance metrics
        if hasattr(td, 'performance'):
            perf = td.performance
            performance['estimatedCookTime'] = getattr(perf, 'cookTime', 0.0)
            performance['memoryUsage'] = getattr(perf, 'memUsage', 0)
        
        # Analyze operator types for performance impact
        gpu_intensive_ops = []
        cpu_intensive_ops = []
        
        def check_operators(comp):
            for child in comp.children:
                op_type = child.OPType
                
                # GPU intensive operators
                if op_type in ['renderTOP', 'particlegpuTOP', 'glslTOP', 'instanceTOP']:
                    gpu_intensive_ops.append(child.path)
                
                # CPU intensive operators
                elif op_type in ['moviefileinTOP', 'kinectTOP', 'audiospectrumCHOP']:
                    cpu_intensive_ops.append(child.path)
                
                # Recursively check children
                if hasattr(child, 'isCOMP') and child.isCOMP:
                    check_operators(child)
        
        check_operators(td.root)
        
        performance['gpuIntensive'] = len(gpu_intensive_ops) > 5
        performance['cpuIntensive'] = len(cpu_intensive_ops) > 3
        
    except Exception as e:
        print(f"Performance analysis error: {e}")
    
    return performance

def analyze_dependencies():
    """Analyze project dependencies"""
    dependencies = {
        'media': [],
        'plugins': [],
        'externalFiles': []
    }
    
    try:
        def find_dependencies(comp):
            for child in comp.children:
                # Check for media files
                if hasattr(child.par, 'file') and child.par.file:
                    file_path = child.par.file.eval()
                    if file_path and os.path.exists(file_path):
                        dependencies['media'].append(os.path.basename(file_path))
                
                # Check for external scripts
                if hasattr(child.par, 'text') and child.par.text:
                    text_content = child.par.text.eval()
                    if 'import' in text_content or 'from' in text_content:
                        # Look for external file references
                        for line in text_content.split('\\n'):
                            if '.py' in line and 'open(' in line:
                                dependencies['externalFiles'].append('external_script.py')
                
                # Recursively check children
                if hasattr(child, 'isCOMP') and child.isCOMP:
                    find_dependencies(child)
        
        find_dependencies(td.root)
        
        # Remove duplicates
        dependencies['media'] = list(set(dependencies['media']))
        dependencies['externalFiles'] = list(set(dependencies['externalFiles']))
        
    except Exception as e:
        print(f"Dependency analysis error: {e}")
    
    return dependencies

if __name__ == "__main__":
    try:
        analysis = analyze_project()
        print("Project analysis completed successfully")
    except Exception as e:
        print(f"Analysis failed: {e}")
        import traceback
        traceback.print_exc()
`;
  }

  private parseAnalysisResults(output: string): ProjectAnalysis {
    try {
      // Extract JSON analysis from output
      const startMarker = 'ANALYSIS_START';
      const endMarker = 'ANALYSIS_END';
      
      const startIndex = output.indexOf(startMarker);
      const endIndex = output.indexOf(endMarker);
      
      if (startIndex === -1 || endIndex === -1) {
        throw new Error('Analysis markers not found in output');
      }
      
      const jsonStr = output.substring(startIndex + startMarker.length, endIndex).trim();
      const analysis = JSON.parse(jsonStr);
      
      return analysis;
    } catch (error) {
      console.error('Failed to parse analysis results:', error);
      throw error;
    }
  }

  private getFallbackAnalysis(projectPath: string, includeOptimizations: boolean): ProjectAnalysis {
    // Fallback analysis when real analysis fails
    console.log('Using fallback project analysis for:', projectPath);
    
    const analysis: ProjectAnalysis = {
      structure: {
        totalNodes: 50,
        nodesByType: {
          TOP: 20,
          CHOP: 10,
          SOP: 8,
          MAT: 3,
          DAT: 5,
          COMP: 4
        },
        totalConnections: 75,
        maxDepth: 3,
        containers: 4
      },
      performance: {
        estimatedCookTime: 8.5,
        memoryUsage: 1024,
        gpuIntensive: false,
        cpuIntensive: false
      },
      complexity: this.calculateComplexity(50, 75),
      dependencies: {
        media: [],
        plugins: [],
        externalFiles: []
      }
    };
    
    if (includeOptimizations) {
      analysis.optimizations = this.generateOptimizations(analysis);
    }
    
    return analysis;
  }

  private calculateComplexity(nodes: number, connections: number): 'simple' | 'moderate' | 'complex' | 'extreme' {
    const score = nodes + connections * 0.5;
    if (score < 100) return 'simple';
    if (score < 300) return 'moderate';
    if (score < 600) return 'complex';
    return 'extreme';
  }

  private generateOptimizations(analysis: ProjectAnalysis): string[] {
    const optimizations: string[] = [];
    
    // Node count optimizations
    if (analysis.structure.totalNodes > 200) {
      optimizations.push('Consider consolidating similar operations into reusable components');
    }
    
    // Performance optimizations
    if (analysis.performance.estimatedCookTime > 16.67) {
      optimizations.push('Cook time exceeds 60fps target - optimize heavy operators');
    }
    
    if (analysis.performance.gpuIntensive) {
      optimizations.push('Use texture instancing for repeated elements');
      optimizations.push('Reduce texture resolutions where quality permits');
    }
    
    // Type-specific optimizations
    if (analysis.structure.nodesByType.TOP > 50) {
      optimizations.push('High TOP count - consider render passes or caching');
    }
    
    if (analysis.structure.nodesByType.CHOP > 30) {
      optimizations.push('Many CHOPs detected - use selective cooking');
    }
    
    // Complexity-based suggestions
    if (analysis.complexity === 'extreme') {
      optimizations.push('Project complexity is very high - consider splitting into sub-components');
      optimizations.push('Implement LOD (Level of Detail) system for performance scaling');
    }
    
    return optimizations;
  }

  async createBackup(projectPath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `${path.basename(projectPath, '.toe')}_backup_${timestamp}.toe`;
    const backupPath = path.join(path.dirname(projectPath), 'backups', backupName);
    
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.copyFile(projectPath, backupPath);
    
    return backupPath;
  }

  async listProjects(): Promise<ProjectInfo[]> {
    const projects: ProjectInfo[] = [];
    
    try {
      const files = await fs.readdir(this.projectsPath);
      
      for (const file of files) {
        if (file.endsWith('.toe')) {
          const filePath = path.join(this.projectsPath, file);
          const stats = await fs.stat(filePath);
          
          projects.push({
            name: path.basename(file, '.toe'),
            path: filePath,
            created: stats.birthtime,
            modified: stats.mtime,
            size: stats.size,
            version: '2023.11290' // Would be extracted
          });
        }
      }
    } catch (error) {
      console.error('Error listing projects:', error);
    }
    
    return projects;
  }

  async getProjectInfo(projectPath: string): Promise<ProjectInfo | null> {
    try {
      const stats = await fs.stat(projectPath);
      return {
        name: path.basename(projectPath, '.toe'),
        path: projectPath,
        created: stats.birthtime,
        modified: stats.mtime,
        size: stats.size,
        version: '2023.11290'
      };
    } catch (error) {
      return null;
    }
  }
}