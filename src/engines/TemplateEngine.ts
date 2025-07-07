import * as fs from 'fs';
import * as path from 'path';
import { TouchDesignerValidator } from '../validation/TouchDesignerValidator';

export interface TemplateConfig {
  project_name: string;
  project_root: string;
  features: string[];
  hardware: {
    kinect_enabled: boolean;
    midi_enabled: boolean;
    audio_enabled: boolean;
    camera_enabled: boolean;
  };
  performance: {
    target_fps: number;
    quality_level: string;
    adaptive_quality: boolean;
    thermal_management: boolean;
  };
  osc: {
    receive_port: number;
    send_port: number;
    send_host: string;
  };
  zones: {
    enabled: boolean;
    zone_count: number;
    interaction_threshold: number;
  };
  touchdesigner: {
    resolution: string;
    fps: number;
    auto_setup: boolean;
  };
}

export interface GeneratedProject {
  files: { [path: string]: string };
  config: any;
  setup_script: string;
  validation_results: any[];
}

export class TemplateEngine {
  private templateDir: string;
  private validator: TouchDesignerValidator;
  private loadedTemplates: Map<string, string> = new Map();

  constructor(templateDir?: string) {
    this.templateDir = templateDir || path.join(__dirname, '../templates');
    this.validator = new TouchDesignerValidator();
    this.loadTemplates();
  }

  private loadTemplates(): void {
    const templateFiles = [
      'kinect-integration.template.py',
      'performance-monitoring.template.py',
      'zone-interaction.template.py',
      'osc-communication.template.py',
      'hardware-integration.template.py'
    ];

    for (const templateFile of templateFiles) {
      try {
        const templatePath = path.join(this.templateDir, templateFile);
        const templateContent = fs.readFileSync(templatePath, 'utf-8');
        this.loadedTemplates.set(templateFile, templateContent);
        console.log(`Loaded template: ${templateFile}`);
      } catch (error) {
        console.error(`Failed to load template ${templateFile}:`, error);
      }
    }
  }

  public async generateFromWorkingPatterns(config: TemplateConfig): Promise<GeneratedProject> {
    console.log(`Generating TouchDesigner project: ${config.project_name}`);
    console.log(`Features: ${config.features.join(', ')}`);

    const generatedFiles: { [path: string]: string } = {};
    const setupScripts: string[] = [];

    // Generate project structure
    const projectStructure = this.createProjectStructure(config);
    
    // Generate core files based on enabled features
    if (config.hardware.kinect_enabled || config.features.includes('kinect')) {
      const kinectFiles = this.generateKinectIntegration(config);
      Object.assign(generatedFiles, kinectFiles);
      setupScripts.push('scripts/kinect_manager.py');
    }

    if (config.performance.adaptive_quality || config.features.includes('performance')) {
      const performanceFiles = this.generatePerformanceMonitoring(config);
      Object.assign(generatedFiles, performanceFiles);
      setupScripts.push('scripts/performance_monitor.py');
    }

    if (config.zones.enabled || config.features.includes('zones')) {
      const zoneFiles = this.generateZoneInteraction(config);
      Object.assign(generatedFiles, zoneFiles);
      setupScripts.push('scripts/zone_calculator.py');
    }

    // OSC communication (always included)
    const oscFiles = this.generateOSCCommunication(config);
    Object.assign(generatedFiles, oscFiles);
    setupScripts.push('scripts/osc_manager.py');

    // Hardware integration (always included for detection/fallback)
    const hardwareFiles = this.generateHardwareIntegration(config);
    Object.assign(generatedFiles, hardwareFiles);
    setupScripts.push('scripts/hardware_manager.py');

    // Generate main setup script
    const mainSetupScript = this.generateMainSetupScript(config, setupScripts);
    generatedFiles['setup_project.py'] = mainSetupScript;

    // Generate TouchDesigner integration script
    const tdIntegrationScript = this.generateTouchDesignerIntegration(config);
    generatedFiles['td_integration.py'] = tdIntegrationScript;

    // Generate configuration files
    const configFiles = this.generateConfigurationFiles(config);
    Object.assign(generatedFiles, configFiles);

    // Generate project README
    generatedFiles['README.md'] = this.generateProjectReadme(config);

    // Validate generated code
    const validationResults = await this.validateGeneratedCode(generatedFiles);

    return {
      files: generatedFiles,
      config: this.generateProjectConfig(config),
      setup_script: mainSetupScript,
      validation_results: validationResults
    };
  }

  private createProjectStructure(config: TemplateConfig): { [path: string]: string } {
    const structure: { [path: string]: string } = {};
    
    // Create directory markers (empty files to ensure directories exist)
    const directories = [
      'scripts/__init__.py',
      'config/__init__.py',
      'shaders/__init__.py',
      'data/__init__.py',
      'assets/__init__.py'
    ];

    for (const dir of directories) {
      structure[dir] = '# Directory marker\n';
    }

    return structure;
  }

  private generateKinectIntegration(config: TemplateConfig): { [path: string]: string } {
    const template = this.loadedTemplates.get('kinect-integration.template.py');
    if (!template) throw new Error('Kinect integration template not found');

    const kinectScript = this.substituteTemplateVariables(template, config);
    
    return {
      'scripts/kinect_manager.py': this.extractTemplateContent(kinectScript, 'KINECT_INTEGRATION_TEMPLATE'),
      'scripts/kinect_setup_td.py': this.extractTemplateContent(kinectScript, 'TOUCHDESIGNER_KINECT_INTEGRATION'),
      'config/kinect_config.json': JSON.stringify({
        enabled: config.hardware.kinect_enabled,
        simulation_fallback: true,
        depth_range: [500, 4000],
        resolution: { width: 512, height: 424 },
        frame_rate: 30,
        calibration: {
          auto_calibrate: true,
          depth_offset: 0,
          tilt_correction: 0
        }
      }, null, 2)
    };
  }

  private generatePerformanceMonitoring(config: TemplateConfig): { [path: string]: string } {
    const template = this.loadedTemplates.get('performance-monitoring.template.py');
    if (!template) throw new Error('Performance monitoring template not found');

    const performanceScript = this.substituteTemplateVariables(template, config);
    
    return {
      'scripts/performance_monitor.py': this.extractTemplateContent(performanceScript, 'PERFORMANCE_MONITORING_TEMPLATE'),
      'scripts/performance_setup_td.py': this.extractTemplateContent(performanceScript, 'TOUCHDESIGNER_PERFORMANCE_INTEGRATION'),
      'config/performance_config.json': JSON.stringify({
        target_fps: config.performance.target_fps,
        quality_level: config.performance.quality_level,
        adaptive_quality: config.performance.adaptive_quality,
        thermal_management: config.performance.thermal_management,
        quality_levels: {
          low: { resolution_scale: 0.5, particle_count: 1000 },
          medium: { resolution_scale: 0.75, particle_count: 2500 },
          high: { resolution_scale: 1.0, particle_count: 5000 },
          ultra: { resolution_scale: 1.0, particle_count: 10000 }
        }
      }, null, 2)
    };
  }

  private generateZoneInteraction(config: TemplateConfig): { [path: string]: string } {
    const template = this.loadedTemplates.get('zone-interaction.template.py');
    if (!template) throw new Error('Zone interaction template not found');

    const zoneScript = this.substituteTemplateVariables(template, config);
    
    return {
      'scripts/zone_calculator.py': this.extractTemplateContent(zoneScript, 'ZONE_INTERACTION_TEMPLATE'),
      'scripts/zone_setup_td.py': this.extractTemplateContent(zoneScript, 'TOUCHDESIGNER_ZONE_INTEGRATION'),
      'config/zone_config.json': JSON.stringify({
        enabled: config.zones.enabled,
        zone_count: config.zones.zone_count,
        interaction_threshold: config.zones.interaction_threshold,
        zones: Array.from({ length: config.zones.zone_count }, (_, i) => ({
          id: i,
          name: `Zone ${i + 1}`,
          bounds: {
            x: (i % 2) * 0.5,
            y: Math.floor(i / 2) * 0.5,
            width: 0.5,
            height: 0.5
          },
          sensitivity: 1.0,
          enabled: true
        }))
      }, null, 2)
    };
  }

  private generateOSCCommunication(config: TemplateConfig): { [path: string]: string } {
    const template = this.loadedTemplates.get('osc-communication.template.py');
    if (!template) throw new Error('OSC communication template not found');

    const oscScript = this.substituteTemplateVariables(template, config);
    
    return {
      'scripts/osc_manager.py': this.extractTemplateContent(oscScript, 'OSC_COMMUNICATION_TEMPLATE'),
      'scripts/osc_setup_td.py': this.extractTemplateContent(oscScript, 'TouchDesignerOSCIntegration'),
      'config/osc_config.json': JSON.stringify({
        network: {
          receive_port: config.osc.receive_port,
          send_port: config.osc.send_port,
          send_host: config.osc.send_host
        },
        message_routing: {
          "/kinect/*": "kinect_control",
          "/particles/*": "particle_control",
          "/performance/*": "performance_control",
          "/zones/*": "zone_control"
        },
        touchdesigner_integration: {
          auto_setup: true,
          create_chop_nodes: true,
          create_dat_nodes: true,
          log_messages: true
        }
      }, null, 2)
    };
  }

  private generateHardwareIntegration(config: TemplateConfig): { [path: string]: string } {
    const template = this.loadedTemplates.get('hardware-integration.template.py');
    if (!template) throw new Error('Hardware integration template not found');

    const hardwareScript = this.substituteTemplateVariables(template, config);
    
    return {
      'scripts/hardware_manager.py': this.extractTemplateContent(hardwareScript, 'HARDWARE_INTEGRATION_TEMPLATE'),
      'scripts/hardware_setup_td.py': this.extractTemplateContent(hardwareScript, 'TOUCHDESIGNER_HARDWARE_INTEGRATION'),
      'config/hardware_config.json': JSON.stringify({
        kinect: {
          enabled: config.hardware.kinect_enabled,
          simulation_fallback: true
        },
        midi: {
          enabled: config.hardware.midi_enabled,
          device_name: "auto_detect"
        },
        audio: {
          enabled: config.hardware.audio_enabled,
          sample_rate: 44100
        },
        camera: {
          enabled: config.hardware.camera_enabled,
          device_index: 0
        }
      }, null, 2)
    };
  }

  private generateMainSetupScript(config: TemplateConfig, setupScripts: string[]): string {
    return `#!/usr/bin/env python3
"""
${config.project_name} - TouchDesigner Project Setup
Generated by TouchDesigner MCP Server Template Engine
"""

import sys
import os
import json
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.absolute()
sys.path.insert(0, str(project_root))

class ProjectSetup:
    def __init__(self):
        self.project_root = project_root
        self.config = self.load_config()
        self.components = {}
    
    def load_config(self):
        """Load project configuration"""
        config_files = [
            'config/kinect_config.json',
            'config/performance_config.json', 
            'config/zone_config.json',
            'config/osc_config.json',
            'config/hardware_config.json'
        ]
        
        config = {}
        for config_file in config_files:
            config_path = self.project_root / config_file
            if config_path.exists():
                with open(config_path, 'r') as f:
                    config[config_file.split('_')[0].split('/')[-1]] = json.load(f)
        
        return config
    
    def setup_components(self):
        """Initialize all project components"""
        print(f"Setting up ${config.project_name}...")
        
        # Initialize components based on enabled features
        ${setupScripts.map(script => {
          const moduleName = path.basename(script, '.py');
          const className = moduleName.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join('');
          
          return `
        # ${className}
        try:
            from scripts.${moduleName} import ${className}
            self.components['${moduleName}'] = ${className}()
            print(f"✓ ${className} initialized")
        except Exception as e:
            print(f"✗ Failed to initialize ${className}: {e}")`;
        }).join('')}
    
    def start_monitoring(self):
        """Start monitoring and data processing"""
        print("Starting monitoring systems...")
        
        # Start each component
        for name, component in self.components.items():
            try:
                if hasattr(component, 'start'):
                    component.start()
                    print(f"✓ {name} started")
            except Exception as e:
                print(f"✗ Failed to start {name}: {e}")
    
    def stop_monitoring(self):
        """Stop all monitoring systems"""
        print("Stopping monitoring systems...")
        
        for name, component in self.components.items():
            try:
                if hasattr(component, 'stop'):
                    component.stop()
                    print(f"✓ {name} stopped")
            except Exception as e:
                print(f"✗ Failed to stop {name}: {e}")

def main():
    """Main setup function"""
    setup = ProjectSetup()
    
    try:
        setup.setup_components()
        setup.start_monitoring()
        
        print(f"\\n${config.project_name} setup complete!")
        print("Project is ready for TouchDesigner integration.")
        print("Run 'python td_integration.py' in TouchDesigner to connect.")
        
        # Keep running
        input("Press Enter to stop monitoring...")
        
    except KeyboardInterrupt:
        print("\\nShutting down...")
    finally:
        setup.stop_monitoring()

if __name__ == "__main__":
    main()
`;
  }

  private generateTouchDesignerIntegration(config: TemplateConfig): string {
    let integrationScript = `"""
${config.project_name} - TouchDesigner Integration Script
Run this script inside TouchDesigner to connect to the project components
"""

import sys
import os
from pathlib import Path

# Add project to path
project_root = Path("${config.project_root}").absolute()
sys.path.insert(0, str(project_root))

def setup_touchdesigner_integration():
    """Setup TouchDesigner integration for all components"""
    
    # OSC Setup
    try:
        from scripts.osc_setup_td import create_osc_setup_script, create_osc_nodes
        
        # Create OSC script
        osc_script = create_osc_setup_script()
        exec(osc_script.replace('\\$\{receive_port\}', str(${config.osc.receive_port}))
                      .replace('\\$\{send_port\}', str(${config.osc.send_port}))
                      .replace('\\$\{send_host\}', '${config.osc.send_host}')
                      .replace('\\$\{project_root\}', str(project_root)))
        
        # Create OSC nodes
        osc_nodes = create_osc_nodes()
        exec(osc_nodes.replace('\\$\{receive_port\}', str(${config.osc.receive_port}))
                      .replace('\\$\{send_port\}', str(${config.osc.send_port}))
                      .replace('\\$\{send_host\}', '${config.osc.send_host}'))
        
        print("✓ OSC integration setup complete")
        
    except Exception as e:
        print(f"✗ OSC integration failed: {e}")
`;

    if (config.hardware.kinect_enabled) {
      integrationScript += `
    
    # Kinect Setup
    try:
        from scripts.kinect_setup_td import create_kinect_setup_script, create_kinect_nodes
        
        kinect_script = create_kinect_setup_script()
        exec(kinect_script.replace('$\{project_root\}', str(project_root)))
        
        kinect_nodes = create_kinect_nodes()
        exec(kinect_nodes)
        
        print("✓ Kinect integration setup complete")
        
    except Exception as e:
        print(f"✗ Kinect integration failed: {e}")
`;
    }

    if (config.performance.adaptive_quality) {
      integrationScript += `
    
    # Performance Monitoring Setup
    try:
        from scripts.performance_setup_td import create_performance_setup_script, create_performance_nodes
        
        perf_script = create_performance_setup_script()
        exec(perf_script.replace('\\$\{project_root\}', str(project_root))
                        .replace('\\$\{target_fps\}', str(${config.performance.target_fps})))
        
        perf_nodes = create_performance_nodes()
        exec(perf_nodes.replace('\\$\{target_fps\}', str(${config.performance.target_fps})))
        
        print("✓ Performance monitoring setup complete")
        
    except Exception as e:
        print(f"✗ Performance monitoring failed: {e}")
`;
    }

    if (config.zones.enabled) {
      integrationScript += `
    
    # Zone Interaction Setup
    try:
        from scripts.zone_setup_td import create_zone_setup_script, create_zone_nodes
        
        zone_script = create_zone_setup_script()
        exec(zone_script.replace('\\$\{project_root\}', str(project_root))
                        .replace('\\$\{zone_count\}', str(${config.zones.zone_count})))
        
        zone_nodes = create_zone_nodes()
        exec(zone_nodes.replace('\\$\{zone_count\}', str(${config.zones.zone_count})))
        
        print("✓ Zone interaction setup complete")
        
    except Exception as e:
        print(f"✗ Zone interaction failed: {e}")
`;
    }

    integrationScript += `
    
    print("\\n${config.project_name} TouchDesigner integration complete!")
    print("All components are now connected and ready to use.")

# Run setup
if __name__ == "__main__":
    setup_touchdesigner_integration()
`;

    return integrationScript;
  }

  private generateConfigurationFiles(config: TemplateConfig): { [path: string]: string } {
    const projectConfig = {
      project: {
        name: config.project_name,
        version: "1.0.0",
        description: `TouchDesigner project generated from working patterns`,
        features: config.features
      },
      touchdesigner: {
        resolution: config.touchdesigner.resolution,
        fps: config.touchdesigner.fps,
        auto_setup: config.touchdesigner.auto_setup
      },
      ...config
    };

    return {
      'config/project_config.json': JSON.stringify(projectConfig, null, 2),
      'requirements.txt': this.generateRequirements(config),
      '.gitignore': this.generateGitignore()
    };
  }

  private generateRequirements(config: TemplateConfig): string {
    const requirements = ['numpy', 'python-osc'];
    
    if (config.hardware.kinect_enabled) {
      requirements.push('pykinect2');
    }
    if (config.hardware.midi_enabled) {
      requirements.push('pygame');
    }
    if (config.hardware.audio_enabled) {
      requirements.push('pyaudio');
    }
    if (config.hardware.camera_enabled) {
      requirements.push('opencv-python');
    }
    
    return requirements.join('\n') + '\n';
  }

  private generateGitignore(): string {
    return `# TouchDesigner files
*.toe
*.tox
crashlogs/
backup/

# Python
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/
pip-log.txt
pip-delete-this-directory.txt

# Data files
data/*.raw
data/*.bin
assets/temp/

# Config overrides
config/*_local.json
.env.local
`;
  }

  private generateProjectReadme(config: TemplateConfig): string {
    return `# ${config.project_name}

TouchDesigner project generated from working patterns using the TouchDesigner MCP Server Template Engine.

## Features

${config.features.map(feature => `- ${feature.charAt(0).toUpperCase() + feature.slice(1)} integration`).join('\n')}

## Hardware Requirements

${Object.entries(config.hardware)
  .filter(([_, enabled]) => enabled)
  .map(([device, _]) => `- ${device.charAt(0).toUpperCase() + device.slice(1)} device`)
  .join('\n')}

## Quick Start

1. Install Python dependencies:
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`

2. Start the project components:
   \`\`\`bash
   python setup_project.py
   \`\`\`

3. In TouchDesigner, run the integration script:
   \`\`\`python
   exec(open('td_integration.py').read())
   \`\`\`

## Configuration

- **Project Config**: \`config/project_config.json\`
- **OSC Settings**: \`config/osc_config.json\`
${config.hardware.kinect_enabled ? '- **Kinect Settings**: `config/kinect_config.json`' : ''}
${config.performance.adaptive_quality ? '- **Performance Settings**: `config/performance_config.json`' : ''}
${config.zones.enabled ? '- **Zone Settings**: `config/zone_config.json`' : ''}

## Project Structure

\`\`\`
${config.project_name}/
├── setup_project.py          # Main setup script
├── td_integration.py         # TouchDesigner integration
├── scripts/                  # Core functionality
│   ├── osc_manager.py        # OSC communication
│   ├── hardware_manager.py   # Hardware detection & management
${config.hardware.kinect_enabled ? '│   ├── kinect_manager.py     # Kinect integration' : ''}
${config.performance.adaptive_quality ? '│   ├── performance_monitor.py # Performance monitoring' : ''}
${config.zones.enabled ? '│   └── zone_calculator.py   # Zone interaction processing' : ''}
├── config/                   # Configuration files
├── data/                     # Runtime data
└── assets/                   # Media assets
\`\`\`

## Performance Settings

- **Target FPS**: ${config.performance.target_fps}
- **Quality Level**: ${config.performance.quality_level}
- **Adaptive Quality**: ${config.performance.adaptive_quality ? 'Enabled' : 'Disabled'}
- **Thermal Management**: ${config.performance.thermal_management ? 'Enabled' : 'Disabled'}

## Network Configuration

- **OSC Receive Port**: ${config.osc.receive_port}
- **OSC Send Port**: ${config.osc.send_port}
- **OSC Host**: ${config.osc.send_host}

${config.zones.enabled ? `
## Zone Configuration

- **Zone Count**: ${config.zones.zone_count}
- **Interaction Threshold**: ${config.zones.interaction_threshold}
` : ''}

## Generated from Working Patterns

This project was generated using proven working patterns extracted from successful TouchDesigner installations. All components include:

- **Graceful Fallback**: Hardware simulation when devices unavailable
- **Performance Monitoring**: Automatic quality adjustment based on system performance
- **Real-time Integration**: Live data processing with TouchDesigner
- **Robust Error Handling**: Comprehensive error recovery and logging

## Support

This project was generated by the TouchDesigner MCP Server Template Engine. For support with the generated code, refer to the TouchDesigner community or the original pattern documentation.
`;
  }

  private generateProjectConfig(config: TemplateConfig): any {
    return {
      generation_info: {
        timestamp: new Date().toISOString(),
        template_engine_version: "2.0.0",
        generated_from: "working_patterns",
        source_patterns: ["FogScreenParticleCloud", "PsychedelicFractalViz"]
      },
      ...config
    };
  }

  private substituteTemplateVariables(template: string, config: TemplateConfig): string {
    let result = template;
    
    // Substitute common variables
    const substitutions = {
      '${project_root}': config.project_root,
      '${project_name}': config.project_name,
      '${receive_port}': config.osc.receive_port.toString(),
      '${send_port}': config.osc.send_port.toString(),
      '${send_host}': config.osc.send_host,
      '${target_fps}': config.performance.target_fps.toString(),
      '${quality_level}': config.performance.quality_level,
      '${zone_count}': config.zones.zone_count.toString(),
      '${interaction_threshold}': config.zones.interaction_threshold.toString()
    };
    
    for (const [placeholder, value] of Object.entries(substitutions)) {
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }
    
    return result;
  }

  private extractTemplateContent(template: string, templateName: string): string {
    const startMarker = `${templateName} = """`;
    const endMarker = '"""';
    
    const startIndex = template.indexOf(startMarker);
    if (startIndex === -1) {
      throw new Error(`Template ${templateName} not found`);
    }
    
    const contentStart = startIndex + startMarker.length;
    const endIndex = template.indexOf(endMarker, contentStart);
    if (endIndex === -1) {
      throw new Error(`End marker for template ${templateName} not found`);
    }
    
    return template.substring(contentStart, endIndex).trim();
  }

  private async validateGeneratedCode(files: { [path: string]: string }): Promise<any[]> {
    const results = [];
    
    for (const [filePath, content] of Object.entries(files)) {
      if (filePath.endsWith('.py')) {
        try {
          const validation = await this.validator.validatePythonCode(content, filePath);
          results.push({
            file: filePath,
            status: validation.valid ? 'valid' : 'invalid',
            issues: validation.issues || []
          });
        } catch (error) {
          results.push({
            file: filePath,
            status: 'error',
            error: error.message
          });
        }
      }
    }
    
    return results;
  }
}