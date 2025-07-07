/**
 * MCP Server Discovery System
 * 
 * Phase 3: Multi-Server Preparation Infrastructure
 * 
 * Discovers, catalogs, and assesses capabilities of available MCP servers.
 * Designed to handle both current and future server types with graceful adaptation.
 */

import { EventEmitter } from 'events';

export interface MCPServerCapability {
  category: 'core' | 'extension' | 'integration' | 'analysis' | 'storage';
  name: string;
  description: string;
  requiredTools: string[];
  optionalTools: string[];
  performance: {
    expectedLatency: number;
    throughput: number;
    reliability: number;
  };
}

export interface MCPServerSpec {
  id: string;
  name: string;
  type: 'filesystem' | 'repository' | 'analysis' | 'database' | 'external-api' | 'development' | 'touchdesigner' | 'unknown';
  version: string;
  endpoint?: string;
  capabilities: MCPServerCapability[];
  tools: string[];
  resources: string[];
  status: 'active' | 'inactive' | 'error' | 'unknown';
  metadata: {
    lastSeen: Date;
    responseTime: number;
    reliability: number;
    healthScore: number;
  };
  integration: {
    priority: number;
    compatibility: number;
    recommendedUsage: string[];
  };
}

export interface DiscoveryConfig {
  scanInterval: number;
  timeout: number;
  maxRetries: number;
  enableAutoDiscovery: boolean;
  knownServers: string[];
  capabilities: {
    minHealthScore: number;
    requiredCapabilities: string[];
    preferredCapabilities: string[];
  };
}

export class MCPServerDiscovery extends EventEmitter {
  private discoveredServers: Map<string, MCPServerSpec> = new Map();
  private capabilityRegistry: Map<string, MCPServerCapability> = new Map();
  private discoveryConfig: DiscoveryConfig;
  private discoveryInterval?: NodeJS.Timeout;
  private isDiscovering = false;

  constructor(config?: Partial<DiscoveryConfig>) {
    super();
    
    this.discoveryConfig = {
      scanInterval: 30000, // 30 seconds
      timeout: 5000,
      maxRetries: 3,
      enableAutoDiscovery: true,
      knownServers: [
        'filesystem', 'github', 'memory', 'sequentialthinking', 
        'touchdesigner', 'qdrant'
      ],
      capabilities: {
        minHealthScore: 0.7,
        requiredCapabilities: [],
        preferredCapabilities: ['file-operations', 'project-creation']
      },
      ...config
    };

    this.initializeCapabilityRegistry();
  }

  /**
   * Start continuous server discovery
   */
  async startDiscovery(): Promise<void> {
    if (this.isDiscovering) return;
    
    this.isDiscovering = true;
    this.emit('discovery:started');
    
    // Initial discovery
    await this.discoverAvailableMCPServers();
    
    // Set up continuous discovery
    if (this.discoveryConfig.enableAutoDiscovery) {
      this.discoveryInterval = setInterval(async () => {
        await this.discoverAvailableMCPServers();
      }, this.discoveryConfig.scanInterval);
    }
  }

  /**
   * Stop server discovery
   */
  stopDiscovery(): void {
    this.isDiscovering = false;
    
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = undefined;
    }
    
    this.emit('discovery:stopped');
  }

  /**
   * Discover and assess all available MCP servers
   */
  async discoverAvailableMCPServers(): Promise<MCPServerSpec[]> {
    const discoveryStartTime = Date.now();
    const newServers: MCPServerSpec[] = [];

    // Discover known servers
    for (const serverName of this.discoveryConfig.knownServers) {
      try {
        const server = await this.probeServer(serverName);
        if (server) {
          this.updateServerRegistry(server);
          newServers.push(server);
        }
      } catch (error) {
        console.warn(`Failed to discover server ${serverName}:`, error);
      }
    }

    // Auto-discover additional servers
    if (this.discoveryConfig.enableAutoDiscovery) {
      const autoDiscovered = await this.autoDiscoverServers();
      newServers.push(...autoDiscovered);
    }

    // Assess server capabilities
    await this.assessServerCapabilities(newServers);

    const discoveryDuration = Date.now() - discoveryStartTime;
    
    this.emit('discovery:complete', {
      serversFound: newServers.length,
      totalServers: this.discoveredServers.size,
      duration: discoveryDuration
    });

    return Array.from(this.discoveredServers.values());
  }

  /**
   * Probe a specific server for capabilities
   */
  private async probeServer(serverName: string): Promise<MCPServerSpec | null> {
    const probeStartTime = Date.now();

    try {
      // Simulate server probing - in real implementation this would make actual MCP calls
      const serverData = await this.simulateServerProbe(serverName);
      
      if (!serverData) return null;

      const responseTime = Date.now() - probeStartTime;
      
      const server: MCPServerSpec = {
        id: serverName,
        name: serverData.name || serverName,
        type: this.inferServerType(serverName, serverData.tools || []),
        version: serverData.version || '1.0.0',
        endpoint: serverData.endpoint,
        capabilities: this.mapCapabilities(serverData.tools || []),
        tools: serverData.tools || [],
        resources: serverData.resources || [],
        status: 'active',
        metadata: {
          lastSeen: new Date(),
          responseTime,
          reliability: this.calculateReliability(serverName, responseTime),
          healthScore: this.calculateHealthScore(serverData, responseTime)
        },
        integration: {
          priority: this.calculatePriority(serverName, serverData.tools || []),
          compatibility: this.calculateCompatibility(serverData.tools || []),
          recommendedUsage: this.generateUsageRecommendations(serverName, serverData.tools || [])
        }
      };

      return server;

    } catch (error) {
      console.error(`Error probing server ${serverName}:`, error);
      return null;
    }
  }

  /**
   * Auto-discover servers by scanning common patterns
   */
  private async autoDiscoverServers(): Promise<MCPServerSpec[]> {
    const autoDiscovered: MCPServerSpec[] = [];
    
    // Scan for common MCP server patterns
    const scanPatterns = [
      'mcp-*', '*-mcp', '*-server', 'server-*'
    ];

    // In a real implementation, this would scan process lists, network services, etc.
    // For now, we'll simulate discovery of potential servers
    const potentialServers = [
      'image-processing-mcp', 'audio-analysis-mcp', 'data-visualization-server'
    ];

    for (const serverPattern of potentialServers) {
      try {
        const server = await this.probeServer(serverPattern);
        if (server) {
          autoDiscovered.push(server);
        }
      } catch (error) {
        // Ignore errors in auto-discovery
      }
    }

    return autoDiscovered;
  }

  /**
   * Assess and categorize server capabilities
   */
  private async assessServerCapabilities(servers: MCPServerSpec[]): Promise<void> {
    for (const server of servers) {
      // Deep capability assessment
      const enhancedCapabilities = await this.performCapabilityAssessment(server);
      server.capabilities = enhancedCapabilities;

      // Update integration recommendations
      server.integration.recommendedUsage = this.generateAdvancedUsageRecommendations(server);
      
      // Calculate compatibility matrix
      server.integration.compatibility = this.calculateServerCompatibility(server);
    }
  }

  /**
   * Perform deep capability assessment
   */
  private async performCapabilityAssessment(server: MCPServerSpec): Promise<MCPServerCapability[]> {
    const capabilities: MCPServerCapability[] = [];

    // Analyze tools to infer capabilities
    for (const tool of server.tools) {
      const capability = this.inferCapabilityFromTool(tool, server.type);
      if (capability && !capabilities.find(c => c.name === capability.name)) {
        capabilities.push(capability);
      }
    }

    // Add server-type specific capabilities
    const typeCapabilities = this.getServerTypeCapabilities(server.type);
    capabilities.push(...typeCapabilities);

    return capabilities;
  }

  /**
   * Update server registry with new/updated server info
   */
  private updateServerRegistry(server: MCPServerSpec): void {
    const existingServer = this.discoveredServers.get(server.id);
    
    if (existingServer) {
      // Update existing server
      existingServer.metadata.lastSeen = server.metadata.lastSeen;
      existingServer.metadata.responseTime = server.metadata.responseTime;
      existingServer.metadata.reliability = this.updateReliability(
        existingServer.metadata.reliability, 
        server.metadata.responseTime < this.discoveryConfig.timeout
      );
      existingServer.metadata.healthScore = server.metadata.healthScore;
      existingServer.status = server.status;
      
      this.emit('server:updated', existingServer);
    } else {
      // Add new server
      this.discoveredServers.set(server.id, server);
      this.emit('server:discovered', server);
    }
  }

  /**
   * Get servers by capability
   */
  getServersByCapability(capabilityName: string): MCPServerSpec[] {
    return Array.from(this.discoveredServers.values())
      .filter(server => 
        server.capabilities.some(cap => cap.name === capabilityName) &&
        server.status === 'active' &&
        server.metadata.healthScore >= this.discoveryConfig.capabilities.minHealthScore
      )
      .sort((a, b) => b.metadata.healthScore - a.metadata.healthScore);
  }

  /**
   * Get optimal server for specific task
   */
  getOptimalServerForTask(taskType: string, requirements: string[] = []): MCPServerSpec | null {
    const candidates = Array.from(this.discoveredServers.values())
      .filter(server => {
        if (server.status !== 'active') return false;
        if (server.metadata.healthScore < this.discoveryConfig.capabilities.minHealthScore) return false;
        
        // Check if server can handle the task
        const hasRequiredCapabilities = requirements.every(req =>
          server.capabilities.some(cap => cap.name === req) ||
          server.tools.includes(req)
        );
        
        return hasRequiredCapabilities;
      });

    if (candidates.length === 0) return null;

    // Sort by optimization score
    candidates.sort((a, b) => {
      const scoreA = this.calculateTaskOptimizationScore(a, taskType, requirements);
      const scoreB = this.calculateTaskOptimizationScore(b, taskType, requirements);
      return scoreB - scoreA;
    });

    return candidates[0];
  }

  /**
   * Initialize capability registry with known patterns
   */
  private initializeCapabilityRegistry(): void {
    const knownCapabilities: MCPServerCapability[] = [
      {
        category: 'core',
        name: 'file-operations',
        description: 'Basic file system operations',
        requiredTools: ['read_file', 'write_file'],
        optionalTools: ['list_files', 'search_files'],
        performance: { expectedLatency: 10, throughput: 1000, reliability: 0.99 }
      },
      {
        category: 'core', 
        name: 'project-creation',
        description: 'TouchDesigner project creation and management',
        requiredTools: ['td_create_project'],
        optionalTools: ['td_analyze_project', 'td_optimize_project'],
        performance: { expectedLatency: 5000, throughput: 10, reliability: 0.95 }
      },
      {
        category: 'analysis',
        name: 'problem-solving',
        description: 'Analytical problem decomposition and strategy',
        requiredTools: ['sequentialthinking'],
        optionalTools: ['analyze_problem', 'generate_strategy'],
        performance: { expectedLatency: 2000, throughput: 25, reliability: 0.90 }
      },
      {
        category: 'storage',
        name: 'knowledge-management',
        description: 'Knowledge storage and retrieval',
        requiredTools: ['create_entities', 'search_nodes'],
        optionalTools: ['add_observations', 'create_relations'],
        performance: { expectedLatency: 100, throughput: 500, reliability: 0.96 }
      },
      {
        category: 'integration',
        name: 'repository-management',
        description: 'Version control and collaboration',
        requiredTools: ['create_repository', 'get_file_contents'],
        optionalTools: ['create_pull_request', 'manage_issues'],
        performance: { expectedLatency: 500, throughput: 100, reliability: 0.92 }
      }
    ];

    knownCapabilities.forEach(cap => {
      this.capabilityRegistry.set(cap.name, cap);
    });
  }

  // Helper methods for server assessment

  private inferServerType(serverName: string, tools: string[]): MCPServerSpec['type'] {
    if (serverName.includes('touch') || tools.some(t => t.startsWith('td_'))) return 'touchdesigner';
    if (serverName.includes('git') || serverName.includes('hub')) return 'repository';
    if (serverName.includes('file') || tools.includes('read_file')) return 'filesystem';
    if (serverName.includes('think') || serverName.includes('analysis')) return 'analysis';
    if (serverName.includes('memory') || serverName.includes('db')) return 'database';
    if (tools.some(t => t.includes('api') || t.includes('fetch'))) return 'external-api';
    if (serverName.includes('dev') || serverName.includes('test')) return 'development';
    return 'unknown';
  }

  private mapCapabilities(tools: string[]): MCPServerCapability[] {
    const capabilities: MCPServerCapability[] = [];
    
    for (const [capName, capability] of this.capabilityRegistry) {
      const hasRequired = capability.requiredTools.every(tool => tools.includes(tool));
      const hasOptional = capability.optionalTools.some(tool => tools.includes(tool));
      
      if (hasRequired || hasOptional) {
        capabilities.push(capability);
      }
    }
    
    return capabilities;
  }

  private calculateHealthScore(serverData: any, responseTime: number): number {
    let score = 1.0;
    
    // Response time factor
    if (responseTime > 1000) score -= 0.2;
    else if (responseTime > 500) score -= 0.1;
    
    // Tool availability factor
    const toolCount = serverData.tools?.length || 0;
    if (toolCount === 0) score -= 0.3;
    else if (toolCount < 3) score -= 0.1;
    
    // Capability factor
    const hasCoreCaps = this.hasCoreCapsApabilities(serverData.tools || []);
    if (!hasCoreCaps) score -= 0.2;
    
    return Math.max(0, Math.min(1, score));
  }

  private calculateReliability(serverName: string, responseTime: number): number {
    // Base reliability on response time and known server characteristics
    let reliability = 1.0;
    
    if (responseTime > this.discoveryConfig.timeout) {
      reliability = 0.5;
    } else if (responseTime > this.discoveryConfig.timeout * 0.8) {
      reliability = 0.8;
    }
    
    return reliability;
  }

  private updateReliability(currentReliability: number, wasSuccessful: boolean): number {
    // Exponential moving average
    const alpha = 0.1;
    const newValue = wasSuccessful ? 1.0 : 0.0;
    return currentReliability * (1 - alpha) + newValue * alpha;
  }

  private calculatePriority(serverName: string, tools: string[]): number {
    // Higher priority for core TouchDesigner functionality
    if (serverName === 'touchdesigner' || tools.some(t => t.startsWith('td_'))) return 10;
    if (serverName === 'filesystem' || tools.includes('read_file')) return 9;
    if (serverName === 'memory' || serverName === 'sequentialthinking') return 8;
    if (serverName === 'github') return 7;
    return 5;
  }

  private calculateCompatibility(tools: string[]): number {
    // Calculate compatibility with TouchDesigner workflows
    const touchdesignerTools = tools.filter(t => 
      t.startsWith('td_') || 
      t.includes('project') ||
      t.includes('file') ||
      t.includes('analyze')
    ).length;
    
    return Math.min(1.0, touchdesignerTools / Math.max(1, tools.length));
  }

  private generateUsageRecommendations(serverName: string, tools: string[]): string[] {
    const recommendations: string[] = [];
    
    if (tools.includes('td_create_project')) {
      recommendations.push('primary-project-creation');
    }
    if (tools.includes('read_file') || tools.includes('write_file')) {
      recommendations.push('file-management');
    }
    if (tools.some(t => t.includes('analyze') || t.includes('think'))) {
      recommendations.push('analysis-tasks');
    }
    if (serverName.includes('git') || serverName.includes('hub')) {
      recommendations.push('version-control');
    }
    
    return recommendations;
  }

  private generateAdvancedUsageRecommendations(server: MCPServerSpec): string[] {
    const recommendations = [...server.integration.recommendedUsage];
    
    // Add performance-based recommendations
    if (server.metadata.responseTime < 100) {
      recommendations.push('real-time-operations');
    }
    
    if (server.metadata.reliability > 0.95) {
      recommendations.push('critical-operations');
    }
    
    // Add capability-based recommendations
    const hasStorageCapability = server.capabilities.some(c => c.category === 'storage');
    if (hasStorageCapability) {
      recommendations.push('data-persistence');
    }
    
    return [...new Set(recommendations)];
  }

  private calculateServerCompatibility(server: MCPServerSpec): number {
    // Enhanced compatibility calculation
    let compatibility = server.integration.compatibility;
    
    // Boost for TouchDesigner-specific capabilities
    if (server.type === 'touchdesigner') compatibility += 0.2;
    
    // Boost for high reliability
    if (server.metadata.reliability > 0.95) compatibility += 0.1;
    
    // Penalty for poor health
    if (server.metadata.healthScore < 0.8) compatibility -= 0.2;
    
    return Math.max(0, Math.min(1, compatibility));
  }

  private inferCapabilityFromTool(tool: string, serverType: MCPServerSpec['type']): MCPServerCapability | null {
    // Map tools to capabilities
    if (tool.startsWith('td_')) {
      return {
        category: 'core',
        name: 'touchdesigner-integration',
        description: 'TouchDesigner-specific operations',
        requiredTools: [tool],
        optionalTools: [],
        performance: { expectedLatency: 1000, throughput: 50, reliability: 0.90 }
      };
    }
    
    if (tool.includes('file')) {
      return this.capabilityRegistry.get('file-operations') || null;
    }
    
    return null;
  }

  private getServerTypeCapabilities(serverType: MCPServerSpec['type']): MCPServerCapability[] {
    const typeCapabilities: Record<string, MCPServerCapability[]> = {
      'touchdesigner': [
        {
          category: 'core',
          name: 'project-management',
          description: 'TouchDesigner project lifecycle management',
          requiredTools: ['td_create_project'],
          optionalTools: ['td_analyze_project', 'td_export_movie'],
          performance: { expectedLatency: 2000, throughput: 20, reliability: 0.92 }
        }
      ],
      'filesystem': [
        {
          category: 'core',
          name: 'asset-management',
          description: 'Media and asset file management',
          requiredTools: ['read_file', 'write_file'],
          optionalTools: ['list_files', 'search_files'],
          performance: { expectedLatency: 50, throughput: 500, reliability: 0.98 }
        }
      ]
    };
    
    return typeCapabilities[serverType] || [];
  }

  private calculateTaskOptimizationScore(server: MCPServerSpec, taskType: string, requirements: string[]): number {
    let score = server.metadata.healthScore * 0.4;
    score += server.metadata.reliability * 0.3;
    score += (1 - server.metadata.responseTime / 5000) * 0.2; // Prefer faster servers
    score += server.integration.compatibility * 0.1;
    
    return score;
  }

  private hasCoreCapsApabilities(tools: string[]): boolean {
    const coreTools = ['read_file', 'write_file', 'td_create_project', 'sequentialthinking'];
    return coreTools.some(tool => tools.includes(tool));
  }

  private async simulateServerProbe(serverName: string): Promise<any> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    
    // Return simulated server data based on known servers
    const serverSpecs: Record<string, any> = {
      'touchdesigner': {
        name: 'TouchDesigner MCP Server',
        version: '2.0.0',
        tools: ['td_create_project', 'td_analyze_project', 'search_operators', 'td_optimize_touchdesigner'],
        resources: ['project-templates', 'operator-library']
      },
      'filesystem': {
        name: 'Filesystem MCP Server',
        version: '1.0.0',
        tools: ['read_file', 'write_file', 'list_files', 'search_files'],
        resources: ['file-system']
      },
      'github': {
        name: 'GitHub MCP Server',
        version: '1.0.0',
        tools: ['create_repository', 'get_file_contents', 'create_pull_request'],
        resources: ['repositories', 'issues', 'pull-requests']
      },
      'memory': {
        name: 'Memory MCP Server',
        version: '1.0.0',
        tools: ['create_entities', 'search_nodes', 'add_observations'],
        resources: ['knowledge-graph']
      },
      'sequentialthinking': {
        name: 'Sequential Thinking MCP Server',
        version: '1.0.0',
        tools: ['sequentialthinking'],
        resources: ['thinking-patterns']
      }
    };
    
    return serverSpecs[serverName] || null;
  }

  /**
   * Get comprehensive discovery status
   */
  getDiscoveryStatus(): {
    isDiscovering: boolean;
    totalServers: number;
    activeServers: number;
    serversByType: Record<string, number>;
    capabilityOverview: Record<string, number>;
    healthStatus: {
      healthy: number;
      degraded: number;
      unhealthy: number;
    };
  } {
    const servers = Array.from(this.discoveredServers.values());
    
    const serversByType: Record<string, number> = {};
    const capabilityOverview: Record<string, number> = {};
    let healthy = 0, degraded = 0, unhealthy = 0;
    
    servers.forEach(server => {
      // Count by type
      serversByType[server.type] = (serversByType[server.type] || 0) + 1;
      
      // Count capabilities
      server.capabilities.forEach(cap => {
        capabilityOverview[cap.name] = (capabilityOverview[cap.name] || 0) + 1;
      });
      
      // Health status
      if (server.metadata.healthScore >= 0.8) healthy++;
      else if (server.metadata.healthScore >= 0.6) degraded++;
      else unhealthy++;
    });
    
    return {
      isDiscovering: this.isDiscovering,
      totalServers: servers.length,
      activeServers: servers.filter(s => s.status === 'active').length,
      serversByType,
      capabilityOverview,
      healthStatus: { healthy, degraded, unhealthy }
    };
  }

  /**
   * Get all discovered servers
   */
  getAllServers(): MCPServerSpec[] {
    return Array.from(this.discoveredServers.values());
  }

  /**
   * Get server by ID
   */
  getServer(serverId: string): MCPServerSpec | undefined {
    return this.discoveredServers.get(serverId);
  }
}