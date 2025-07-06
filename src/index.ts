import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { config } from 'dotenv';
import { TOEGenerator } from './generators/TOEGenerator.js';
import { NodeLibrary } from './utils/NodeLibrary.js';
import { OSCManager } from './utils/OSCManager.js';
import { WebSocketManager } from './utils/WebSocketManager.js';
import { MediaProcessor } from './utils/MediaProcessor.js';
import { TemplateEngine } from './utils/TemplateEngine.js';
import { PerformanceMonitor } from './utils/PerformanceMonitor.js';
import { ProjectManager } from './utils/ProjectManager.js';
import { AIPromptParser } from './utils/AIPromptParser.js';
import { PatreonResourceManager } from './utils/PatreonResourceManager.js';
import {
  DocumentationTools,
  SearchDocsSchema,
  GetOperatorHelpSchema,
  GenerateNodeNetworkSchema,
  OptimizeTouchDesignerSchema,
  SuggestParametersSchema,
  CreateComponentFromDescriptionSchema,
  AnalyzeWorkflowSchema,
  GenerateTutorialSchema
} from './tools/DocumentationTools.js';

// Load environment variables
config();

// Server configuration
const TD_OSC_PORT = parseInt(process.env.TD_OSC_PORT || '7000');
const TD_WEBSOCKET_PORT = parseInt(process.env.TD_WEBSOCKET_PORT || '9980');
const TD_PROJECT_PATH = process.env.TD_PROJECT_PATH || 'C:/Users/talla/Documents/touchdesigner-projects';
const TD_MEDIA_PATH = process.env.TD_MEDIA_PATH || 'C:/Users/talla/Documents/touchdesigner-media';
const TD_DOCS_PATH = process.env.TD_DOCS_PATH || 'C:/Users/talla/Documents/touchdesigner-docs';

// Initialize managers
const toeGenerator = new TOEGenerator();
const nodeLibrary = new NodeLibrary();
const oscManager = new OSCManager(TD_OSC_PORT);
const wsManager = new WebSocketManager(TD_WEBSOCKET_PORT);
const mediaProcessor = new MediaProcessor(TD_MEDIA_PATH);
const templateEngine = new TemplateEngine();
const perfMonitor = new PerformanceMonitor();
const projectManager = new ProjectManager(TD_PROJECT_PATH);
const aiParser = new AIPromptParser();
const patreonManager = new PatreonResourceManager();
const docTools = new DocumentationTools(TD_DOCS_PATH);

// Tool schemas
const CreateProjectSchema = z.object({
  prompt: z.string().describe('Natural language description of the TouchDesigner project to create'),
  name: z.string().describe('Project name'),
  template: z.string().optional().describe('Template to use (audio-reactive, generative-art, data-viz, interactive, vj-setup)'),
  resolution: z.string().optional().default('1920x1080').describe('Output resolution'),
  fps: z.number().optional().default(60).describe('Target FPS'),
  features: z.array(z.string()).optional().describe('Additional features to include')
}).describe('Schema for creating a new TouchDesigner project');

const OpenProjectSchema = z.object({
  path: z.string().describe('Path to the .toe file to open')
}).describe('Schema for opening an existing project');

const GenerateFromPromptSchema = z.object({
  prompt: z.string().describe('Detailed description of what to generate'),
  context: z.string().optional().describe('Current project context or existing nodes'),
  style: z.string().optional().describe('Visual style preference'),
  complexity: z.enum(['simple', 'moderate', 'complex']).optional().default('moderate')
}).describe('Schema for generating nodes from a prompt');

const SetupOSCSchema = z.object({
  receivePort: z.number().optional().describe('Port to receive OSC messages'),
  sendPort: z.number().optional().describe('Port to send OSC messages'),
  sendAddress: z.string().optional().describe('IP address to send OSC to')
}).describe('Schema for setting up OSC communication');

const SendOSCSchema = z.object({
  address: z.string().describe('OSC address pattern (e.g., /controls/slider1)'),
  args: z.array(z.union([z.string(), z.number(), z.boolean()])).describe('OSC arguments'),
  target: z.string().optional().describe('Target IP:port (defaults to current setup)')
}).describe('Schema for sending OSC messages');

const ImportMediaSchema = z.object({
  sourcePath: z.string().describe('Path to media file or directory'),
  mediaType: z.enum(['image', 'video', 'audio', 'model', 'auto']).optional().default('auto'),
  optimize: z.boolean().optional().default(true).describe('Optimize media for TouchDesigner'),
  generateVariations: z.boolean().optional().default(false)
}).describe('Schema for importing media');

const OptimizeMediaSchema = z.object({
  inputPath: z.string().describe('Path to media to optimize'),
  outputPath: z.string().optional().describe('Where to save optimized media'),
  format: z.string().optional().describe('Target format'),
  quality: z.number().min(1).max(100).optional().default(85),
  maxDimension: z.number().optional().describe('Maximum width/height')
}).describe('Schema for optimizing media');

const ExportMovieSchema = z.object({
  projectPath: z.string().describe('Path to .toe project'),
  outputPath: z.string().describe('Path for output movie'),
  format: z.enum(['mp4', 'mov', 'avi', 'prores']).optional().default('mp4'),
  duration: z.number().optional().describe('Duration in seconds'),
  resolution: z.string().optional().default('1920x1080'),
  fps: z.number().optional().default(30),
  codec: z.string().optional()
}).describe('Schema for exporting movies');

const GenerateTemplateSchema = z.object({
  type: z.enum(['audio-reactive', 'generative-art', 'data-viz', 'interactive', 'vj-setup', 'installation']),
  name: z.string().describe('Template name'),
  description: z.string().optional().describe('Template description'),
  parameters: z.record(z.any()).optional().describe('Template parameters')
}).describe('Schema for generating templates');

const GetPerformanceSchema = z.object({
  projectPath: z.string().optional().describe('Project to analyze (current if not specified)'),
  metrics: z.array(z.string()).optional().describe('Specific metrics to retrieve')
}).describe('Schema for getting performance metrics');

const AnalyzeProjectSchema = z.object({
  projectPath: z.string().describe('Path to .toe file to analyze'),
  includeOptimizations: z.boolean().optional().default(true)
}).describe('Schema for analyzing projects');

const WebSocketCommandSchema = z.object({
  command: z.string().describe('WebSocket command to send'),
  data: z.any().optional().describe('Command data'),
  expectResponse: z.boolean().optional().default(true)
}).describe('Schema for WebSocket commands');

// Patreon resource schemas
const CatalogResourceSchema = z.object({
  filepath: z.string().describe('Path to the resource file'),
  creator: z.string().describe('Creator name'),
  category: z.string().optional().describe('Resource category'),
  tags: z.array(z.string()).optional().describe('Tags for the resource'),
  description: z.string().optional().describe('Resource description')
}).describe('Schema for cataloging resources');

const SearchResourcesSchema = z.object({
  query: z.string().optional().describe('Search query'),
  creator: z.string().optional().describe('Filter by creator'),
  category: z.string().optional().describe('Filter by category'),
  type: z.string().optional().describe('Filter by file type'),
  tags: z.array(z.string()).optional().describe('Filter by tags'),
  limit: z.number().optional().default(50).describe('Maximum results'),
  offset: z.number().optional().default(0).describe('Results offset')
}).describe('Schema for searching resources');

const ImportResourceSchema = z.object({
  resourceId: z.string().describe('Resource ID to import'),
  targetPath: z.string().describe('Target project path')
}).describe('Schema for importing resources');

const GetResourceInfoSchema = z.object({
  resourceId: z.string().describe('Resource ID')
}).describe('Schema for getting resource info');

// Create MCP server
const server = new Server(
  {
    name: 'touchdesigner-mcp-server',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: 'td_create_project',
    description: 'Create a new TouchDesigner project from a natural language prompt. Generates complete .toe files with all necessary nodes, connections, and parameters.',
    inputSchema: {
      type: 'object',
      properties: CreateProjectSchema.shape,
      required: ['prompt', 'name']
    }
  },
  {
    name: 'td_open_project',
    description: 'Open an existing TouchDesigner project file',
    inputSchema: {
      type: 'object',
      properties: OpenProjectSchema.shape,
      required: ['path']
    }
  },
  {
    name: 'td_generate_from_prompt',
    description: 'Generate TouchDesigner nodes and connections from a detailed prompt. Can create complex node networks, effects, and interactions.',
    inputSchema: {
      type: 'object',
      properties: GenerateFromPromptSchema.shape,
      required: ['prompt']
    }
  },
  {
    name: 'td_setup_osc',
    description: 'Setup OSC communication for TouchDesigner',
    inputSchema: {
      type: 'object',
      properties: SetupOSCSchema.shape
    }
  },
  {
    name: 'td_send_osc',
    description: 'Send OSC messages to TouchDesigner',
    inputSchema: {
      type: 'object',
      properties: SendOSCSchema.shape,
      required: ['address', 'args']
    }
  },
  {
    name: 'td_import_media',
    description: 'Import and optimize media files for TouchDesigner',
    inputSchema: {
      type: 'object',
      properties: ImportMediaSchema.shape,
      required: ['sourcePath']
    }
  },
  {
    name: 'td_optimize_media',
    description: 'Optimize media files for better performance in TouchDesigner',
    inputSchema: {
      type: 'object',
      properties: OptimizeMediaSchema.shape,
      required: ['inputPath']
    }
  },
  {
    name: 'td_export_movie',
    description: 'Export a movie from a TouchDesigner project',
    inputSchema: {
      type: 'object',
      properties: ExportMovieSchema.shape,
      required: ['projectPath', 'outputPath']
    }
  },
  {
    name: 'td_generate_template',
    description: 'Generate a reusable TouchDesigner template',
    inputSchema: {
      type: 'object',
      properties: GenerateTemplateSchema.shape,
      required: ['type', 'name']
    }
  },
  {
    name: 'td_get_performance',
    description: 'Get performance metrics from TouchDesigner',
    inputSchema: {
      type: 'object',
      properties: GetPerformanceSchema.shape
    }
  },
  {
    name: 'td_analyze_project',
    description: 'Analyze a TouchDesigner project for structure, performance, and optimization opportunities',
    inputSchema: {
      type: 'object',
      properties: AnalyzeProjectSchema.shape,
      required: ['projectPath']
    }
  },
  {
    name: 'td_websocket_command',
    description: 'Send commands via WebSocket to TouchDesigner',
    inputSchema: {
      type: 'object',
      properties: WebSocketCommandSchema.shape,
      required: ['command']
    }
  },
  // Patreon resource management tools
  {
    name: 'td_catalog_resource',
    description: 'Catalog a new Patreon resource in the database',
    inputSchema: {
      type: 'object',
      properties: CatalogResourceSchema.shape,
      required: ['filepath', 'creator']
    }
  },
  {
    name: 'td_search_resources',
    description: 'Search cataloged Patreon resources',
    inputSchema: {
      type: 'object',
      properties: SearchResourcesSchema.shape
    }
  },
  {
    name: 'td_import_resource',
    description: 'Import a Patreon resource into current project',
    inputSchema: {
      type: 'object',
      properties: ImportResourceSchema.shape,
      required: ['resourceId', 'targetPath']
    }
  },
  {
    name: 'td_list_creators',
    description: 'List all Patreon creators in the catalog',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'td_get_resource_info',
    description: 'Get detailed information about a resource',
    inputSchema: {
      type: 'object',
      properties: GetResourceInfoSchema.shape,
      required: ['resourceId']
    }
  },
  {
    name: 'td_sync_catalog',
    description: 'Sync the resource catalog with the file system',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  // Documentation-aware tools
  {
    name: 'td_search_docs',
    description: 'Search TouchDesigner documentation with semantic understanding',
    inputSchema: {
      type: 'object',
      properties: SearchDocsSchema.shape,
      required: ['query']
    }
  },
  {
    name: 'td_get_operator_help',
    description: 'Get comprehensive help for a TouchDesigner operator with examples and tips',
    inputSchema: {
      type: 'object',
      properties: GetOperatorHelpSchema.shape,
      required: ['operator']
    }
  },
  {
    name: 'td_generate_node_network',
    description: 'Generate optimal node networks from natural language descriptions',
    inputSchema: {
      type: 'object',
      properties: GenerateNodeNetworkSchema.shape,
      required: ['description']
    }
  },
  {
    name: 'td_optimize_touchdesigner',
    description: 'Get performance optimization recommendations based on documentation',
    inputSchema: {
      type: 'object',
      properties: OptimizeTouchDesignerSchema.shape
    }
  },
  {
    name: 'td_suggest_parameters',
    description: 'Get AI-powered parameter suggestions for operators based on your goals',
    inputSchema: {
      type: 'object',
      properties: SuggestParametersSchema.shape,
      required: ['operator', 'goal']
    }
  },
  {
    name: 'td_create_component',
    description: 'Create custom TouchDesigner components from natural language descriptions',
    inputSchema: {
      type: 'object',
      properties: CreateComponentFromDescriptionSchema.shape,
      required: ['description']
    }
  },
  {
    name: 'td_analyze_workflow',
    description: 'Analyze and improve TouchDesigner workflows with best practices',
    inputSchema: {
      type: 'object',
      properties: AnalyzeWorkflowSchema.shape,
      required: ['workflow']
    }
  },
  {
    name: 'td_generate_tutorial',
    description: 'Generate custom TouchDesigner tutorials for any topic',
    inputSchema: {
      type: 'object',
      properties: GenerateTutorialSchema.shape,
      required: ['topic']
    }
  }
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'td_create_project': {
        const params = CreateProjectSchema.parse(args);
        
        // Parse the prompt using AI
        const projectSpec = await aiParser.parseProjectPrompt(params.prompt, {
          template: params.template,
          resolution: params.resolution,
          fps: params.fps,
          features: params.features
        });
        
        // Generate the TOE file
        const projectPath = await toeGenerator.createProject(params.name, projectSpec);
        
        // Initialize project with template if specified
        if (params.template) {
          await templateEngine.applyTemplate(projectPath, params.template);
        }
        
        return {
          content: [{
            type: 'text',
            text: `Successfully created TouchDesigner project: ${projectPath}\n\nProject includes:\n${JSON.stringify(projectSpec.summary, null, 2)}`
          }]
        };
      }

      case 'td_open_project': {
        const params = OpenProjectSchema.parse(args);
        const result = await projectManager.openProject(params.path);
        
        return {
          content: [{
            type: 'text',
            text: `Opened project: ${params.path}\n${result.info}`
          }]
        };
      }

      case 'td_generate_from_prompt': {
        const params = GenerateFromPromptSchema.parse(args);
        
        // Parse the generation prompt
        const nodeSpec = await aiParser.parseGenerationPrompt(params.prompt, {
          context: params.context,
          style: params.style,
          complexity: params.complexity
        });
        
        // Generate nodes
        const nodes = await nodeLibrary.generateFromSpec(nodeSpec);
        
        return {
          content: [{
            type: 'text',
            text: `Generated ${nodes.length} nodes:\n${nodes.map(n => `- ${n.type}: ${n.name}`).join('\n')}\n\nConnections created: ${nodeSpec.connections.length}`
          }]
        };
      }

      case 'td_setup_osc': {
        const params = SetupOSCSchema.parse(args);
        await oscManager.setup(params);
        
        return {
          content: [{
            type: 'text',
            text: `OSC setup complete:\n- Receive port: ${params.receivePort || TD_OSC_PORT}\n- Send port: ${params.sendPort || 'default'}\n- Send address: ${params.sendAddress || 'localhost'}`
          }]
        };
      }

      case 'td_send_osc': {
        const params = SendOSCSchema.parse(args);
        await oscManager.send(params.address, params.args, params.target);
        
        return {
          content: [{
            type: 'text',
            text: `Sent OSC message:\n- Address: ${params.address}\n- Args: ${JSON.stringify(params.args)}`
          }]
        };
      }

      case 'td_import_media': {
        const params = ImportMediaSchema.parse(args);
        const results = await mediaProcessor.importMedia({
          sourcePath: params.sourcePath,
          mediaType: params.mediaType,
          optimize: params.optimize,
          generateVariations: params.generateVariations
        });
        
        return {
          content: [{
            type: 'text',
            text: `Imported media:\n${results.map(r => `- ${r.filename}: ${r.status}`).join('\n')}`
          }]
        };
      }

      case 'td_optimize_media': {
        const params = OptimizeMediaSchema.parse(args);
        const result = await mediaProcessor.optimize({
          inputPath: params.inputPath,
          outputPath: params.outputPath,
          format: params.format,
          quality: params.quality,
          maxDimension: params.maxDimension
        });
        
        return {
          content: [{
            type: 'text',
            text: `Optimized media:\n- Original: ${result.originalSize}\n- Optimized: ${result.optimizedSize}\n- Reduction: ${result.reduction}%\n- Output: ${result.outputPath}`
          }]
        };
      }

      case 'td_export_movie': {
        const params = ExportMovieSchema.parse(args);
        const result = await projectManager.exportMovie({
          projectPath: params.projectPath,
          outputPath: params.outputPath,
          format: params.format,
          duration: params.duration,
          resolution: params.resolution,
          fps: params.fps,
          codec: params.codec
        });
        
        return {
          content: [{
            type: 'text',
            text: `Movie export started:\n- Output: ${params.outputPath}\n- Format: ${params.format}\n- Resolution: ${params.resolution}\n- FPS: ${params.fps}\n- Status: ${result.status}`
          }]
        };
      }

      case 'td_generate_template': {
        const params = GenerateTemplateSchema.parse(args);
        const templatePath = await templateEngine.create({
          type: params.type,
          name: params.name,
          description: params.description,
          parameters: params.parameters
        });
        
        return {
          content: [{
            type: 'text',
            text: `Created template: ${templatePath}\n- Type: ${params.type}\n- Name: ${params.name}\n- Parameters: ${Object.keys(params.parameters || {}).length}`
          }]
        };
      }

      case 'td_get_performance': {
        const params = GetPerformanceSchema.parse(args);
        const metrics = await perfMonitor.getMetrics(params.projectPath, params.metrics);
        
        return {
          content: [{
            type: 'text',
            text: `Performance Metrics:\n${JSON.stringify(metrics, null, 2)}`
          }]
        };
      }

      case 'td_analyze_project': {
        const params = AnalyzeProjectSchema.parse(args);
        const analysis = await projectManager.analyzeProject(params.projectPath, params.includeOptimizations);
        
        return {
          content: [{
            type: 'text',
            text: `Project Analysis:\n${JSON.stringify(analysis, null, 2)}`
          }]
        };
      }

      case 'td_websocket_command': {
        const params = WebSocketCommandSchema.parse(args);
        const response = await wsManager.sendCommand(params.command, params.data, params.expectResponse);
        
        return {
          content: [{
            type: 'text',
            text: `WebSocket command sent:\n- Command: ${params.command}\n- Response: ${JSON.stringify(response)}`
          }]
        };
      }

      // Patreon resource management
      case 'td_catalog_resource': {
        await patreonManager.scanForNewResources();
        
        return {
          content: [{
            type: 'text',
            text: `Resource cataloged successfully`
          }]
        };
      }

      case 'td_search_resources': {
        const params = SearchResourcesSchema.parse(args);
        const results = await patreonManager.searchResources(params);
        
        return {
          content: [{
            type: 'text',
            text: `Found ${results.length} resources:\n${results.map(r => 
              `- ${r.filename} (${r.creator}/${r.category}) - ${r.type}`
            ).join('\n')}`
          }]
        };
      }

      case 'td_import_resource': {
        const params = ImportResourceSchema.parse(args);
        const importedPath = await patreonManager.importResourceToProject(
          params.resourceId, 
          params.targetPath
        );
        
        return {
          content: [{
            type: 'text',
            text: `Resource imported to: ${importedPath}`
          }]
        };
      }

      case 'td_list_creators': {
        const creators = await patreonManager.listCreators();
        
        return {
          content: [{
            type: 'text',
            text: `Patreon Creators:\n${creators.map(c => 
              `- ${c.name} (${c.resourceCount} resources)`
            ).join('\n')}`
          }]
        };
      }

      case 'td_get_resource_info': {
        const params = GetResourceInfoSchema.parse(args);
        const info = await patreonManager.getResourceInfo(params.resourceId);
        
        return {
          content: [{
            type: 'text',
            text: info ? `Resource Info:\n${JSON.stringify(info, null, 2)}` : 'Resource not found'
          }]
        };
      }

      case 'td_sync_catalog': {
        const newCount = await patreonManager.scanForNewResources();
        
        return {
          content: [{
            type: 'text',
            text: `Catalog synced. Found ${newCount} new resources.`
          }]
        };
      }

      // Documentation-aware tools
      case 'td_search_docs': {
        const params = SearchDocsSchema.parse(args);
        const results = await docTools.searchDocs(params);
        
        return {
          content: [{
            type: 'text',
            text: `Found ${results.totalResults} documentation results for "${params.query}":\n\n${
              results.results.map((r, i) =>
                `${i + 1}. [${r.category}/${r.topic}] (${Math.round(r.relevance * 100)}% relevant)\n${r.content.slice(0, 200)}...\n`
              ).join('\n')
            }`
          }]
        };
      }

      case 'td_get_operator_help': {
        const params = GetOperatorHelpSchema.parse(args);
        const help = await docTools.getOperatorHelp(params);
        
        return {
          content: [{
            type: 'text',
            text: `## ${help.operator} Help\n\n${help.description}\n\n### Parameters\n${
              help.parameters.map(p => `- **${p.name}** (${p.type}): ${p.description}`).join('\n')
            }\n\n### Tips\n${help.tips.join('\n- ')}\n\n${
              params.includeExamples && help.examples ?
              `### Examples\n${help.examples.join('\n\n')}` : ''
            }\n\n${
              params.includeRelated && help.relatedOperators ?
              `### Related Operators\n${help.relatedOperators.join(', ')}` : ''
            }`
          }]
        };
      }

      case 'td_generate_node_network': {
        const params = GenerateNodeNetworkSchema.parse(args);
        const network = await docTools.generateNodeNetwork(params);
        
        return {
          content: [{
            type: 'text',
            text: `Generated ${params.outputFormat} network:\n\n${
              params.outputFormat === 'python' ?
              `\`\`\`python\n${network.content}\n\`\`\`` :
              `Format: ${network.format}\nInstructions: ${network.instructions}\n\n${
                params.includeComments && network.content.comments ?
                `Comments:\n${network.content.comments.map(c => `- ${c.nodeId}: ${c.comment}`).join('\n')}` : ''
              }`
            }`
          }]
        };
      }

      case 'td_optimize_touchdesigner': {
        const params = OptimizeTouchDesignerSchema.parse(args);
        const optimization = await docTools.optimizeTouchDesigner(params);
        
        return {
          content: [{
            type: 'text',
            text: `## TouchDesigner Optimization Report\n\nTarget FPS: ${optimization.targetFPS}\nOptimization Level: ${optimization.optimizationLevel}\n\n### Recommendations\n\n${
              optimization.recommendations.map((r, i) =>
                `${i + 1}. **${r.category}** [${r.priority}]\n   ${r.suggestion}\n   Impact: ${r.impact}\n   ${r.implementation ? `Implementation: ${r.implementation}` : ''}`
              ).join('\n\n')
            }\n\n**Overall Impact:** ${optimization.estimatedImpact}`
          }]
        };
      }

      case 'td_suggest_parameters': {
        const params = SuggestParametersSchema.parse(args);
        const suggestions = await docTools.suggestParameters(params);
        
        return {
          content: [{
            type: 'text',
            text: `## Parameter Suggestions for ${suggestions.operator}\n\nGoal: "${suggestions.goal}"\n\n### Recommended Settings\n${
              suggestions.suggestions.map(s =>
                `- **${s.parameter}**: ${s.suggestedValue} (currently: ${s.currentValue || 'not set'})\n  Reason: ${s.reason}\n  Impact: ${s.impact}`
              ).join('\n\n')
            }\n\n### Explanation\n${suggestions.explanation}\n\n${
              suggestions.exampleConfigurations.length > 0 ?
              `### Example Configurations\n${suggestions.exampleConfigurations.map((c, i) =>
                `${i + 1}. ${c.scenario}:\n${Object.entries(c.parameters).map(([k, v]) => `   - ${k}: ${v}`).join('\n')}`
              ).join('\n\n')}` : ''
            }`
          }]
        };
      }

      case 'td_create_component': {
        const params = CreateComponentFromDescriptionSchema.parse(args);
        const component = await docTools.createComponentFromDescription(params);
        
        return {
          content: [{
            type: 'text',
            text: `## Created Component: ${component.component.name}\n\n${component.component.documentation}\n\n### Implementation\n\`\`\`python\n${component.implementation}\n\`\`\`\n\n### Usage Examples\n${component.usage.join('\n\n')}\n\n### Test Cases\n${component.testing.map(t => `- ${t.name}: ${t.test}`).join('\n')}`
          }]
        };
      }

      case 'td_analyze_workflow': {
        const params = AnalyzeWorkflowSchema.parse(args);
        const analysis = await docTools.analyzeWorkflow(params);
        
        return {
          content: [{
            type: 'text',
            text: `## Workflow Analysis\n\n**Current Workflow:** ${analysis.currentWorkflow}\n**Rating:** ${analysis.rating}/100\n\n### Best Practices Applied\n${analysis.bestPractices.join('\n- ')}\n\n### Recommendations\n${
              analysis.recommendations.map((r, i) =>
                `${i + 1}. **${r.area}** [${r.priority}]\n   ${r.suggestion}`
              ).join('\n\n')
            }\n\n### Alternative Approaches\n${
              analysis.alternatives.map((a, i) =>
                `${i + 1}. **${a.name}**\n   ${a.description}\n   Pros: ${a.pros.join(', ')}\n   Cons: ${a.cons.join(', ')}`
              ).join('\n\n')
            }`
          }]
        };
      }

      case 'td_generate_tutorial': {
        const params = GenerateTutorialSchema.parse(args);
        const tutorial = await docTools.generateTutorial(params);
        
        return {
          content: [{
            type: 'text',
            text: `# ${tutorial.title}\n\n**Format:** ${tutorial.format}\n**Estimated Time:** ${tutorial.estimatedTime}\n\n## Prerequisites\n${tutorial.prerequisites.join('\n- ')}\n\n## Content\n${
              tutorial.format === 'step-by-step' ?
              tutorial.content.steps.map(s =>
                `### Step ${s.number}: ${s.title}\n${s.content}\nOperators: ${s.operators.join(', ')}`
              ).join('\n\n') :
              JSON.stringify(tutorial.content, null, 2)
            }\n\n## Next Steps\n${tutorial.nextSteps.join('\n- ')}`
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Initialize all managers with error handling
  try {
    await oscManager.initialize();
  } catch (error) {
    console.error('Warning: OSC initialization failed (non-critical):', error);
  }
  
  try {
    await wsManager.initialize();
  } catch (error) {
    console.error('Warning: WebSocket initialization failed (non-critical):', error);
  }
  
  try {
    await mediaProcessor.initialize();
  } catch (error) {
    console.error('Warning: Media processor initialization failed:', error);
  }
  
  try {
    await templateEngine.initialize();
  } catch (error) {
    console.error('Warning: Template engine initialization failed:', error);
  }
  
  try {
    await nodeLibrary.loadBuiltinNodes();
  } catch (error) {
    console.error('Warning: Node library initialization failed:', error);
  }
  
  // Most important - initialize Patreon manager
  try {
    await patreonManager.initialize();
    console.error('Patreon Resource Manager initialized successfully');
  } catch (error) {
    console.error('Error: Patreon manager initialization failed:', error);
  }
  
  // Initialize documentation tools
  try {
    await docTools.initialize();
    console.error('Documentation tools initialized with embedded TouchDesigner knowledge');
  } catch (error) {
    console.error('Warning: Documentation tools initialization failed:', error);
  }
  
  console.error('TouchDesigner MCP Server v3.0.0 started');
  console.error('Patreon resource management tools are now available');
  console.error('Documentation-aware tools with embedded TouchDesigner knowledge are active');
}

main().catch(console.error);