/**
 * Monitoring and Telemetry System
 * 
 * Phase 4: Advanced Features - Real-time Performance Monitoring and Alerting
 * 
 * Implements comprehensive telemetry collection, real-time performance monitoring,
 * alerting system, and data aggregation for TouchDesigner projects.
 */

import { EventEmitter } from 'events';
import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';
import { WebSocketManager } from '../utils/WebSocketManager.js';

export interface TelemetryConfig {
  enabled: boolean;
  collectInterval: number; // milliseconds
  retentionPeriod: number; // milliseconds
  alerting: AlertConfig;
  metrics: MetricConfig[];
  storage: StorageConfig;
  dashboard: DashboardConfig;
}

export interface AlertConfig {
  enabled: boolean;
  channels: AlertChannel[];
  rules: AlertRule[];
  escalation: EscalationPolicy;
}

export interface AlertChannel {
  id: string;
  type: 'webhook' | 'email' | 'console' | 'touchdesigner' | 'osc';
  configuration: Record<string, any>;
  enabled: boolean;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  severity: 'info' | 'warning' | 'error' | 'critical';
  throttle: number; // milliseconds between same alerts
  channels: string[]; // Alert channel IDs
  autoResolve: boolean;
  actions: AlertAction[];
}

export interface AlertCondition {
  metric: string;
  operator: '>' | '<' | '==' | '!=' | '>=' | '<=';
  threshold: number;
  duration: number; // milliseconds condition must persist
  aggregation?: 'avg' | 'max' | 'min' | 'sum' | 'count';
  window?: number; // aggregation window in milliseconds
}

export interface EscalationPolicy {
  levels: EscalationLevel[];
  maxEscalations: number;
  cooldownPeriod: number;
}

export interface EscalationLevel {
  delay: number; // milliseconds before escalation
  channels: string[];
  actions: AlertAction[];
}

export interface AlertAction {
  type: 'restart-service' | 'reduce-quality' | 'send-notification' | 'run-script' | 'emergency-stop';
  parameters: Record<string, any>;
  conditions: string[];
}

export interface MetricConfig {
  name: string;
  source: MetricSource;
  collection: CollectionConfig;
  processing: ProcessingConfig;
  storage: MetricStorageConfig;
}

export interface MetricSource {
  type: 'touchdesigner' | 'system' | 'application' | 'external';
  endpoint?: string;
  query?: string;
  transformation?: string;
}

export interface CollectionConfig {
  interval: number;
  timeout: number;
  retries: number;
  batchSize: number;
}

export interface ProcessingConfig {
  aggregations: AggregationConfig[];
  derivatives: DerivativeConfig[];
  filters: FilterConfig[];
}

export interface AggregationConfig {
  type: 'avg' | 'max' | 'min' | 'sum' | 'count' | 'percentile';
  window: number;
  parameter?: number; // for percentile
}

export interface DerivativeConfig {
  type: 'rate' | 'delta' | 'moving-average';
  window: number;
  unit?: string;
}

export interface FilterConfig {
  type: 'outlier' | 'smoothing' | 'threshold';
  parameters: Record<string, any>;
}

export interface MetricStorageConfig {
  retention: number;
  resolution: number;
  compression: boolean;
}

export interface StorageConfig {
  type: 'memory' | 'file' | 'database';
  configuration: Record<string, any>;
  backup: BackupConfig;
}

export interface BackupConfig {
  enabled: boolean;
  interval: number;
  retention: number;
  destination: string;
}

export interface DashboardConfig {
  enabled: boolean;
  port: number;
  authentication: AuthConfig;
  widgets: WidgetConfig[];
  themes: ThemeConfig[];
}

export interface AuthConfig {
  enabled: boolean;
  type: 'basic' | 'token' | 'oauth';
  configuration: Record<string, any>;
}

export interface WidgetConfig {
  id: string;
  type: 'chart' | 'gauge' | 'counter' | 'log' | 'status' | 'heatmap';
  title: string;
  metrics: string[];
  configuration: Record<string, any>;
  position: WidgetPosition;
}

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ThemeConfig {
  id: string;
  name: string;
  colors: Record<string, string>;
  fonts: Record<string, string>;
}

export interface TelemetryData {
  timestamp: number;
  metrics: MetricData[];
  metadata: TelemetryMetadata;
}

export interface MetricData {
  name: string;
  value: number;
  unit?: string;
  tags: Record<string, string>;
  source: string;
}

export interface TelemetryMetadata {
  projectId: string;
  sessionId: string;
  version: string;
  environment: string;
  host: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  timestamp: number;
  status: 'active' | 'resolved' | 'suppressed';
  metrics: MetricSnapshot[];
  context: AlertContext;
  escalationLevel: number;
}

export interface MetricSnapshot {
  name: string;
  value: number;
  threshold: number;
  condition: string;
}

export interface AlertContext {
  projectPath: string;
  affectedSystems: string[];
  relatedMetrics: string[];
  possibleCauses: string[];
  suggestedActions: string[];
}

export interface TelemetryAnalysis {
  timeRange: TimeRange;
  summary: AnalysisSummary;
  trends: TrendAnalysis[];
  anomalies: AnomalyDetection[];
  recommendations: AnalysisRecommendation[];
}

export interface TimeRange {
  start: number;
  end: number;
  duration: number;
}

export interface AnalysisSummary {
  totalDataPoints: number;
  metricsCollected: number;
  alertsTriggered: number;
  averagePerformance: Record<string, number>;
  performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface TrendAnalysis {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  confidence: number;
  changeRate: number;
  prediction: TrendPrediction;
}

export interface TrendPrediction {
  nextValue: number;
  confidence: number;
  timeToThreshold: number | null;
  recommendations: string[];
}

export interface AnomalyDetection {
  metric: string;
  timestamp: number;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'minor' | 'major' | 'critical';
  context: AnomalyContext;
}

export interface AnomalyContext {
  precedingEvents: string[];
  correlatedMetrics: string[];
  possibleCauses: string[];
  impactAssessment: string;
}

export interface AnalysisRecommendation {
  type: 'optimization' | 'scaling' | 'alerting' | 'investigation';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  implementation: string[];
  expectedImpact: string;
}

/**
 * Real-time telemetry and monitoring system
 */
export class TelemetrySystem extends EventEmitter {
  private config: TelemetryConfig;
  private performanceMonitor: PerformanceMonitor;
  private webSocketManager: WebSocketManager;
  private collectionIntervals: Map<string, NodeJS.Timeout> = new Map();
  private metricStorage: Map<string, MetricData[]> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertThrottles: Map<string, number> = new Map();
  private sessionId: string;
  private isRunning: boolean = false;

  constructor(
    config: TelemetryConfig,
    performanceMonitor: PerformanceMonitor,
    webSocketManager: WebSocketManager
  ) {
    super();
    this.config = config;
    this.performanceMonitor = performanceMonitor;
    this.webSocketManager = webSocketManager;
    this.sessionId = this.generateSessionId();
    
    this.setupDefaultConfiguration();
    this.initializeStorage();
  }

  /**
   * Start telemetry collection and monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Telemetry system is already running');
    }

    this.isRunning = true;
    this.emit('telemetry-started', { sessionId: this.sessionId });

    // Start metric collection
    for (const metricConfig of this.config.metrics) {
      this.startMetricCollection(metricConfig);
    }

    // Start alert monitoring
    if (this.config.alerting.enabled) {
      this.startAlertMonitoring();
    }

    // Start dashboard if enabled
    if (this.config.dashboard.enabled) {
      await this.startDashboard();
    }

    console.log(`Telemetry system started with session ID: ${this.sessionId}`);
  }

  /**
   * Stop telemetry collection and monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Stop all metric collection intervals
    for (const [metricName, interval] of this.collectionIntervals) {
      clearInterval(interval);
      this.collectionIntervals.delete(metricName);
    }

    // Perform final data backup
    await this.backupData();

    this.emit('telemetry-stopped', { sessionId: this.sessionId });
    console.log('Telemetry system stopped');
  }

  /**
   * Collect metrics from all configured sources
   */
  async collectMetrics(): Promise<TelemetryData> {
    const timestamp = Date.now();
    const metrics: MetricData[] = [];

    for (const metricConfig of this.config.metrics) {
      try {
        const metricData = await this.collectMetric(metricConfig);
        if (metricData) {
          metrics.push(...metricData);
        }
      } catch (error) {
        console.error(`Error collecting metric ${metricConfig.name}:`, error);
      }
    }

    const telemetryData: TelemetryData = {
      timestamp,
      metrics,
      metadata: {
        projectId: 'current-project',
        sessionId: this.sessionId,
        version: '1.0.0',
        environment: 'production',
        host: require('os').hostname()
      }
    };

    // Store metrics
    this.storeMetrics(telemetryData);

    // Process alerts
    if (this.config.alerting.enabled) {
      this.processAlerts(telemetryData);
    }

    this.emit('metrics-collected', telemetryData);
    return telemetryData;
  }

  /**
   * Get real-time metrics for specific time range
   */
  getMetrics(metricNames: string[], timeRange: TimeRange): MetricData[] {
    const results: MetricData[] = [];

    for (const metricName of metricNames) {
      const metricData = this.metricStorage.get(metricName) || [];
      const filteredData = metricData.filter(
        data => parseInt(data.tags.timestamp) >= timeRange.start && parseInt(data.tags.timestamp) <= timeRange.end
      );
      results.push(...filteredData);
    }

    return results.sort((a, b) => 
      parseInt(a.tags.timestamp) - parseInt(b.tags.timestamp)
    );
  }

  /**
   * Get current system status
   */
  getSystemStatus(): SystemStatus {
    const now = Date.now();
    const recentMetrics = this.getRecentMetrics(5 * 60 * 1000); // Last 5 minutes
    
    return {
      timestamp: now,
      sessionId: this.sessionId,
      uptime: now - this.getSessionStartTime(),
      isHealthy: this.calculateHealthStatus(recentMetrics),
      activeAlerts: this.activeAlerts.size,
      metricsCollected: this.getTotalMetricsCollected(),
      lastCollection: this.getLastCollectionTime(),
      performance: this.calculatePerformanceScore(recentMetrics)
    };
  }

  /**
   * Analyze telemetry data for insights
   */
  async analyzeTelemetry(timeRange: TimeRange): Promise<TelemetryAnalysis> {
    const metrics = this.getMetrics(
      this.config.metrics.map(m => m.name),
      timeRange
    );

    const summary = this.generateAnalysisSummary(metrics, timeRange);
    const trends = this.analyzeTrends(metrics);
    const anomalies = this.detectAnomalies(metrics);
    const recommendations = this.generateRecommendations(summary, trends, anomalies);

    return {
      timeRange,
      summary,
      trends,
      anomalies,
      recommendations
    };
  }

  /**
   * Create custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.config.alerting.rules.push(rule);
    console.log(`Added alert rule: ${rule.name}`);
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const index = this.config.alerting.rules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.config.alerting.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values())
      .filter(alert => alert.status === 'active')
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Resolve alert manually
   */
  resolveAlert(alertId: string, reason?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert && alert.status === 'active') {
      alert.status = 'resolved';
      this.emit('alert-resolved', { alert, reason });
      return true;
    }
    return false;
  }

  private setupDefaultConfiguration(): void {
    // Add default performance metrics if none configured
    if (this.config.metrics.length === 0) {
      this.config.metrics = [
        {
          name: 'fps',
          source: { type: 'touchdesigner', query: 'system.fps' },
          collection: { interval: 1000, timeout: 5000, retries: 3, batchSize: 1 },
          processing: {
            aggregations: [{ type: 'avg', window: 60000 }],
            derivatives: [{ type: 'rate', window: 10000 }],
            filters: [{ type: 'outlier', parameters: { threshold: 2 } }]
          },
          storage: { retention: 86400000, resolution: 1000, compression: true }
        },
        {
          name: 'memory_usage',
          source: { type: 'system', query: 'memory.usage' },
          collection: { interval: 5000, timeout: 3000, retries: 2, batchSize: 1 },
          processing: {
            aggregations: [{ type: 'max', window: 300000 }],
            derivatives: [],
            filters: []
          },
          storage: { retention: 86400000, resolution: 5000, compression: true }
        },
        {
          name: 'cook_time',
          source: { type: 'touchdesigner', query: 'performance.cookTime' },
          collection: { interval: 1000, timeout: 5000, retries: 3, batchSize: 1 },
          processing: {
            aggregations: [{ type: 'avg', window: 30000 }],
            derivatives: [{ type: 'moving-average', window: 5000 }],
            filters: [{ type: 'smoothing', parameters: { factor: 0.1 } }]
          },
          storage: { retention: 43200000, resolution: 1000, compression: true }
        }
      ];
    }

    // Add default alert rules if none configured
    if (this.config.alerting.enabled && this.config.alerting.rules.length === 0) {
      this.config.alerting.rules = [
        {
          id: 'low-fps-warning',
          name: 'Low FPS Warning',
          condition: {
            metric: 'fps',
            operator: '<',
            threshold: 45,
            duration: 10000,
            aggregation: 'avg',
            window: 5000
          },
          severity: 'warning',
          throttle: 30000,
          channels: ['console'],
          autoResolve: true,
          actions: [
            {
              type: 'reduce-quality',
              parameters: { level: 0.8 },
              conditions: ['fps < 30']
            }
          ]
        },
        {
          id: 'high-memory-critical',
          name: 'High Memory Usage Critical',
          condition: {
            metric: 'memory_usage',
            operator: '>',
            threshold: 0.9,
            duration: 5000
          },
          severity: 'critical',
          throttle: 60000,
          channels: ['console', 'touchdesigner'],
          autoResolve: true,
          actions: [
            {
              type: 'send-notification',
              parameters: { message: 'Critical memory usage detected' },
              conditions: []
            }
          ]
        }
      ];
    }
  }

  private initializeStorage(): void {
    // Initialize metric storage maps
    for (const metricConfig of this.config.metrics) {
      this.metricStorage.set(metricConfig.name, []);
    }
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private startMetricCollection(metricConfig: MetricConfig): void {
    const interval = setInterval(async () => {
      try {
        const metrics = await this.collectMetric(metricConfig);
        if (metrics) {
          this.storeMetricBatch(metricConfig.name, metrics);
        }
      } catch (error) {
        console.error(`Error collecting metric ${metricConfig.name}:`, error);
      }
    }, metricConfig.collection.interval);

    this.collectionIntervals.set(metricConfig.name, interval);
  }

  private async collectMetric(metricConfig: MetricConfig): Promise<MetricData[] | null> {
    const { source, processing } = metricConfig;
    
    try {
      let rawValue: number;

      switch (source.type) {
        case 'touchdesigner':
          rawValue = await this.collectTouchDesignerMetric(source.query || '');
          break;
        case 'system':
          rawValue = await this.collectSystemMetric(source.query || '');
          break;
        case 'application':
          rawValue = await this.collectApplicationMetric(source.query || '');
          break;
        default:
          throw new Error(`Unknown metric source type: ${source.type}`);
      }

      // Apply processing
      const processedValue = this.processMetricValue(rawValue, processing);
      
      const metricData: MetricData = {
        name: metricConfig.name,
        value: processedValue,
        unit: this.getMetricUnit(metricConfig.name),
        tags: {
          source: source.type,
          timestamp: Date.now().toString(),
          session: this.sessionId
        },
        source: source.type
      };

      return [metricData];

    } catch (error) {
      console.error(`Failed to collect metric ${metricConfig.name}:`, error);
      return null;
    }
  }

  private async collectTouchDesignerMetric(query: string): Promise<number> {
    // Get metrics from TouchDesigner via WebSocket or performance monitor
    if (query === 'system.fps') {
      const metrics = await this.performanceMonitor.getMetrics();
      return metrics.system?.fps || 0;
    } else if (query === 'performance.cookTime') {
      const metrics = await this.performanceMonitor.getMetrics();
      return metrics.system?.cookTime || 0;
    }
    
    return 0;
  }

  private async collectSystemMetric(query: string): Promise<number> {
    if (query === 'memory.usage') {
      const metrics = await this.performanceMonitor.getMetrics();
      return metrics.system?.ramUsage || 0;
    }
    
    return 0;
  }

  private async collectApplicationMetric(query: string): Promise<number> {
    // Collect application-specific metrics
    return 0;
  }

  private processMetricValue(value: number, processing: ProcessingConfig): number {
    let processedValue = value;

    // Apply filters
    for (const filter of processing.filters) {
      processedValue = this.applyFilter(processedValue, filter);
    }

    return processedValue;
  }

  private applyFilter(value: number, filter: FilterConfig): number {
    switch (filter.type) {
      case 'outlier':
        const threshold = filter.parameters.threshold || 2;
        return Math.abs(value) > threshold ? 0 : value;
      case 'smoothing':
        const factor = filter.parameters.factor || 0.1;
        const previousValue = filter.parameters.previousValue || value;
        return previousValue * (1 - factor) + value * factor;
      default:
        return value;
    }
  }

  private getMetricUnit(metricName: string): string {
    const unitMap: Record<string, string> = {
      'fps': 'frames/sec',
      'memory_usage': 'percentage',
      'cook_time': 'milliseconds',
      'cpu_usage': 'percentage',
      'gpu_usage': 'percentage'
    };
    
    return unitMap[metricName] || 'value';
  }

  private storeMetrics(telemetryData: TelemetryData): void {
    for (const metric of telemetryData.metrics) {
      this.storeMetricBatch(metric.name, [metric]);
    }
  }

  private storeMetricBatch(metricName: string, metrics: MetricData[]): void {
    const storage = this.metricStorage.get(metricName) || [];
    storage.push(...metrics);

    // Apply retention policy
    const retentionTime = this.getMetricRetention(metricName);
    const cutoffTime = Date.now() - retentionTime;
    
    const filteredStorage = storage.filter(
      metric => parseInt(metric.tags.timestamp) > cutoffTime
    );

    this.metricStorage.set(metricName, filteredStorage);
  }

  private getMetricRetention(metricName: string): number {
    const metricConfig = this.config.metrics.find(m => m.name === metricName);
    return metricConfig?.storage.retention || 86400000; // Default 24 hours
  }

  private startAlertMonitoring(): void {
    setInterval(() => {
      this.checkAlertRules();
    }, 1000); // Check every second
  }

  private processAlerts(telemetryData: TelemetryData): void {
    for (const rule of this.config.alerting.rules) {
      this.evaluateAlertRule(rule, telemetryData);
    }
  }

  private checkAlertRules(): void {
    const recentData = this.getRecentTelemetryData(60000); // Last minute
    this.processAlerts(recentData);
  }

  private evaluateAlertRule(rule: AlertRule, telemetryData: TelemetryData): void {
    const relevantMetrics = telemetryData.metrics.filter(
      metric => metric.name === rule.condition.metric
    );

    if (relevantMetrics.length === 0) return;

    const metricValue = this.aggregateMetricValues(relevantMetrics, rule.condition.aggregation);
    const conditionMet = this.evaluateCondition(metricValue, rule.condition);

    if (conditionMet) {
      this.triggerAlert(rule, metricValue, telemetryData);
    } else if (rule.autoResolve) {
      this.resolveRuleAlerts(rule.id);
    }
  }

  private aggregateMetricValues(metrics: MetricData[], aggregation?: string): number {
    if (metrics.length === 0) return 0;

    switch (aggregation) {
      case 'avg':
        return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
      case 'max':
        return Math.max(...metrics.map(m => m.value));
      case 'min':
        return Math.min(...metrics.map(m => m.value));
      case 'sum':
        return metrics.reduce((sum, m) => sum + m.value, 0);
      case 'count':
        return metrics.length;
      default:
        return metrics[metrics.length - 1].value; // Latest value
    }
  }

  private evaluateCondition(value: number, condition: AlertCondition): boolean {
    switch (condition.operator) {
      case '>': return value > condition.threshold;
      case '<': return value < condition.threshold;
      case '==': return value === condition.threshold;
      case '!=': return value !== condition.threshold;
      case '>=': return value >= condition.threshold;
      case '<=': return value <= condition.threshold;
      default: return false;
    }
  }

  private triggerAlert(rule: AlertRule, metricValue: number, telemetryData: TelemetryData): void {
    const now = Date.now();
    const throttleKey = `${rule.id}-${rule.condition.metric}`;
    const lastAlert = this.alertThrottles.get(throttleKey) || 0;

    if (now - lastAlert < rule.throttle) {
      return; // Throttled
    }

    const alertId = `alert-${now}-${Math.random().toString(36).substr(2, 9)}`;
    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      severity: rule.severity,
      title: rule.name,
      description: `${rule.condition.metric} ${rule.condition.operator} ${rule.condition.threshold}`,
      timestamp: now,
      status: 'active',
      metrics: [{
        name: rule.condition.metric,
        value: metricValue,
        threshold: rule.condition.threshold,
        condition: `${rule.condition.operator} ${rule.condition.threshold}`
      }],
      context: this.generateAlertContext(rule, telemetryData),
      escalationLevel: 0
    };

    this.activeAlerts.set(alertId, alert);
    this.alertThrottles.set(throttleKey, now);

    // Send notifications
    this.sendAlertNotifications(alert, rule);

    // Execute actions
    this.executeAlertActions(alert, rule);

    this.emit('alert-triggered', alert);
  }

  private generateAlertContext(rule: AlertRule, telemetryData: TelemetryData): AlertContext {
    return {
      projectPath: 'current-project',
      affectedSystems: ['touchdesigner'],
      relatedMetrics: telemetryData.metrics.map(m => m.name),
      possibleCauses: this.generatePossibleCauses(rule),
      suggestedActions: this.generateSuggestedActions(rule)
    };
  }

  private generatePossibleCauses(rule: AlertRule): string[] {
    const causes: Record<string, string[]> = {
      'fps': ['High GPU load', 'Complex shaders', 'Memory constraints', 'CPU bottleneck'],
      'memory_usage': ['Memory leak', 'Large textures', 'Too many operators', 'Insufficient RAM'],
      'cook_time': ['Complex operators', 'Large datasets', 'Inefficient networks', 'CPU limitations']
    };

    return causes[rule.condition.metric] || ['Performance degradation', 'Resource constraints'];
  }

  private generateSuggestedActions(rule: AlertRule): string[] {
    const actions: Record<string, string[]> = {
      'fps': ['Reduce texture resolution', 'Optimize shaders', 'Disable effects', 'Check GPU usage'],
      'memory_usage': ['Clear unused operators', 'Reduce texture sizes', 'Restart application', 'Monitor memory leaks'],
      'cook_time': ['Optimize network', 'Reduce operator complexity', 'Check CPU usage', 'Use selective cooking']
    };

    return actions[rule.condition.metric] || ['Check system resources', 'Review recent changes'];
  }

  private sendAlertNotifications(alert: Alert, rule: AlertRule): void {
    for (const channelId of rule.channels) {
      const channel = this.config.alerting.channels.find(c => c.id === channelId);
      if (channel && channel.enabled) {
        this.sendNotification(alert, channel);
      }
    }
  }

  private sendNotification(alert: Alert, channel: AlertChannel): void {
    switch (channel.type) {
      case 'console':
        console.log(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.title}`);
        console.log(`   Description: ${alert.description}`);
        console.log(`   Timestamp: ${new Date(alert.timestamp).toISOString()}`);
        break;
      case 'touchdesigner':
        this.sendTouchDesignerAlert(alert);
        break;
      case 'webhook':
        this.sendWebhookAlert(alert, channel.configuration);
        break;
      case 'osc':
        this.sendOSCAlert(alert, channel.configuration);
        break;
    }
  }

  private sendTouchDesignerAlert(alert: Alert): void {
    try {
      this.webSocketManager.sendCommand('alert', {
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        timestamp: alert.timestamp
      });
    } catch (error) {
      console.warn('Failed to send alert to TouchDesigner:', error);
    }
  }

  private sendWebhookAlert(alert: Alert, config: Record<string, any>): void {
    // Implementation for webhook notifications
    console.log(`Webhook alert sent to ${config.url}:`, alert.title);
  }

  private sendOSCAlert(alert: Alert, config: Record<string, any>): void {
    // Implementation for OSC notifications
    console.log(`OSC alert sent to ${config.host}:${config.port}:`, alert.title);
  }

  private executeAlertActions(alert: Alert, rule: AlertRule): void {
    for (const action of rule.actions) {
      if (this.shouldExecuteAction(action, alert)) {
        this.executeAction(action, alert);
      }
    }
  }

  private shouldExecuteAction(action: AlertAction, alert: Alert): boolean {
    // Evaluate action conditions
    for (const condition of action.conditions) {
      if (!this.evaluateActionCondition(condition, alert)) {
        return false;
      }
    }
    return true;
  }

  private evaluateActionCondition(condition: string, alert: Alert): boolean {
    // Simple condition evaluation - could be enhanced with expression parser
    return true;
  }

  private executeAction(action: AlertAction, alert: Alert): void {
    switch (action.type) {
      case 'reduce-quality':
        this.executeQualityReduction(action.parameters);
        break;
      case 'send-notification':
        console.log(`Action notification: ${action.parameters.message}`);
        break;
      case 'run-script':
        this.executeScript(action.parameters.script);
        break;
    }
  }

  private executeQualityReduction(parameters: Record<string, any>): void {
    const level = parameters.level || 0.8;
    console.log(`Reducing quality to ${level * 100}%`);
    // Implementation would adjust TouchDesigner project quality
  }

  private executeScript(scriptPath: string): void {
    console.log(`Executing script: ${scriptPath}`);
    // Implementation would execute automation script
  }

  private resolveRuleAlerts(ruleId: string): void {
    for (const [alertId, alert] of this.activeAlerts) {
      if (alert.ruleId === ruleId && alert.status === 'active') {
        alert.status = 'resolved';
        this.emit('alert-resolved', { alert, reason: 'auto-resolve' });
      }
    }
  }

  private getRecentTelemetryData(duration: number): TelemetryData {
    const now = Date.now();
    const cutoff = now - duration;
    const allMetrics: MetricData[] = [];

    for (const [metricName, metrics] of this.metricStorage) {
      const recentMetrics = metrics.filter(
        metric => parseInt(metric.tags.timestamp) > cutoff
      );
      allMetrics.push(...recentMetrics);
    }

    return {
      timestamp: now,
      metrics: allMetrics,
      metadata: {
        projectId: 'current-project',
        sessionId: this.sessionId,
        version: '1.0.0',
        environment: 'production',
        host: require('os').hostname()
      }
    };
  }

  private getRecentMetrics(duration: number): MetricData[] {
    return this.getRecentTelemetryData(duration).metrics;
  }

  private getSessionStartTime(): number {
    return parseInt(this.sessionId.split('-')[1]);
  }

  private calculateHealthStatus(metrics: MetricData[]): boolean {
    // Simple health calculation - could be enhanced
    const criticalAlerts = Array.from(this.activeAlerts.values())
      .filter(alert => alert.severity === 'critical' && alert.status === 'active');
    
    return criticalAlerts.length === 0;
  }

  private getTotalMetricsCollected(): number {
    let total = 0;
    for (const metrics of this.metricStorage.values()) {
      total += metrics.length;
    }
    return total;
  }

  private getLastCollectionTime(): number {
    let latest = 0;
    for (const metrics of this.metricStorage.values()) {
      if (metrics.length > 0) {
        const lastMetric = metrics[metrics.length - 1];
        const timestamp = parseInt(lastMetric.tags.timestamp);
        if (timestamp > latest) {
          latest = timestamp;
        }
      }
    }
    return latest;
  }

  private calculatePerformanceScore(metrics: MetricData[]): number {
    // Calculate overall performance score based on recent metrics
    if (metrics.length === 0) return 100;

    let score = 100;
    
    // Deduct for performance issues
    const fpsMetrics = metrics.filter(m => m.name === 'fps');
    if (fpsMetrics.length > 0) {
      const avgFPS = fpsMetrics.reduce((sum, m) => sum + m.value, 0) / fpsMetrics.length;
      if (avgFPS < 60) score -= (60 - avgFPS);
    }

    const memoryMetrics = metrics.filter(m => m.name === 'memory_usage');
    if (memoryMetrics.length > 0) {
      const avgMemory = memoryMetrics.reduce((sum, m) => sum + m.value, 0) / memoryMetrics.length;
      if (avgMemory > 0.8) score -= (avgMemory - 0.8) * 100;
    }

    return Math.max(0, Math.min(100, score));
  }

  private generateAnalysisSummary(metrics: MetricData[], timeRange: TimeRange): AnalysisSummary {
    const alertsInRange = Array.from(this.activeAlerts.values())
      .filter(alert => alert.timestamp >= timeRange.start && alert.timestamp <= timeRange.end);

    const uniqueMetrics = new Set(metrics.map(m => m.name));
    const averagePerformance: Record<string, number> = {};

    for (const metricName of uniqueMetrics) {
      const metricData = metrics.filter(m => m.name === metricName);
      if (metricData.length > 0) {
        averagePerformance[metricName] = 
          metricData.reduce((sum, m) => sum + m.value, 0) / metricData.length;
      }
    }

    const performanceGrade = this.calculatePerformanceGrade(averagePerformance);

    return {
      totalDataPoints: metrics.length,
      metricsCollected: uniqueMetrics.size,
      alertsTriggered: alertsInRange.length,
      averagePerformance,
      performanceGrade
    };
  }

  private calculatePerformanceGrade(averagePerformance: Record<string, number>): 'A' | 'B' | 'C' | 'D' | 'F' {
    const score = this.calculatePerformanceScore(
      Object.entries(averagePerformance).map(([name, value]) => ({
        name,
        value,
        tags: { timestamp: Date.now().toString() },
        source: 'analysis'
      }))
    );

    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private analyzeTrends(metrics: MetricData[]): TrendAnalysis[] {
    const trends: TrendAnalysis[] = [];
    const uniqueMetrics = new Set(metrics.map(m => m.name));

    for (const metricName of uniqueMetrics) {
      const metricData = metrics
        .filter(m => m.name === metricName)
        .sort((a, b) => parseInt(a.tags.timestamp) - parseInt(b.tags.timestamp));

      if (metricData.length >= 2) {
        const trend = this.calculateTrend(metricData);
        trends.push(trend);
      }
    }

    return trends;
  }

  private calculateTrend(metricData: MetricData[]): TrendAnalysis {
    const values = metricData.map(m => m.value);
    const timePoints = metricData.map(m => parseInt(m.tags.timestamp));
    
    // Simple linear regression
    const n = values.length;
    const sumX = timePoints.reduce((sum, t) => sum + t, 0);
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = timePoints.reduce((sum, t, i) => sum + t * values[i], 0);
    const sumXX = timePoints.reduce((sum, t) => sum + t * t, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const direction = slope > 0.1 ? 'increasing' : 
                     slope < -0.1 ? 'decreasing' : 'stable';
    
    const confidence = this.calculateTrendConfidence(values, slope, intercept, timePoints);
    
    return {
      metric: metricData[0].name,
      direction,
      confidence,
      changeRate: slope,
      prediction: {
        nextValue: slope * (timePoints[timePoints.length - 1] + 60000) + intercept,
        confidence,
        timeToThreshold: null,
        recommendations: this.generateTrendRecommendations(metricData[0].name, direction, slope)
      }
    };
  }

  private calculateTrendConfidence(values: number[], slope: number, intercept: number, timePoints: number[]): number {
    // Calculate R-squared for trend confidence
    const meanY = values.reduce((sum, v) => sum + v, 0) / values.length;
    const totalSS = values.reduce((sum, v) => sum + Math.pow(v - meanY, 2), 0);
    const residualSS = values.reduce((sum, v, i) => {
      const predicted = slope * timePoints[i] + intercept;
      return sum + Math.pow(v - predicted, 2);
    }, 0);
    
    return Math.max(0, 1 - residualSS / totalSS);
  }

  private generateTrendRecommendations(metric: string, direction: string, slope: number): string[] {
    const recommendations: Record<string, Record<string, string[]>> = {
      'fps': {
        'decreasing': ['Investigate performance bottlenecks', 'Consider optimization', 'Monitor GPU usage'],
        'increasing': ['Current optimizations working well', 'Monitor stability'],
        'stable': ['Performance is steady', 'Continue monitoring']
      },
      'memory_usage': {
        'increasing': ['Check for memory leaks', 'Optimize textures', 'Consider cleanup'],
        'decreasing': ['Memory optimization successful', 'Monitor for stability'],
        'stable': ['Memory usage is controlled', 'Continue monitoring']
      }
    };

    return recommendations[metric]?.[direction] || ['Monitor metric closely'];
  }

  private detectAnomalies(metrics: MetricData[]): AnomalyDetection[] {
    // Simple anomaly detection using statistical methods
    const anomalies: AnomalyDetection[] = [];
    const uniqueMetrics = new Set(metrics.map(m => m.name));

    for (const metricName of uniqueMetrics) {
      const metricData = metrics.filter(m => m.name === metricName);
      const values = metricData.map(m => m.value);
      
      if (values.length >= 10) {
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const stdDev = Math.sqrt(
          values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
        );
        
        for (const data of metricData) {
          const deviation = Math.abs(data.value - mean) / stdDev;
          if (deviation > 2) { // 2 standard deviations
            anomalies.push({
              metric: metricName,
              timestamp: parseInt(data.tags.timestamp),
              value: data.value,
              expectedValue: mean,
              deviation,
              severity: deviation > 3 ? 'critical' : deviation > 2.5 ? 'major' : 'minor',
              context: {
                precedingEvents: [],
                correlatedMetrics: [],
                possibleCauses: [`${metricName} value significantly differs from normal`],
                impactAssessment: `${deviation.toFixed(1)} standard deviations from mean`
              }
            });
          }
        }
      }
    }

    return anomalies;
  }

  private generateRecommendations(
    summary: AnalysisSummary,
    trends: TrendAnalysis[],
    anomalies: AnomalyDetection[]
  ): AnalysisRecommendation[] {
    const recommendations: AnalysisRecommendation[] = [];

    // Performance-based recommendations
    if (summary.performanceGrade === 'D' || summary.performanceGrade === 'F') {
      recommendations.push({
        type: 'optimization',
        priority: 'high',
        title: 'Performance Optimization Required',
        description: 'System performance is below acceptable levels',
        implementation: [
          'Run performance analysis',
          'Identify bottlenecks',
          'Apply optimization recommendations',
          'Monitor improvements'
        ],
        expectedImpact: 'Improved system performance and user experience'
      });
    }

    // Trend-based recommendations
    for (const trend of trends) {
      if (trend.direction === 'decreasing' && trend.metric === 'fps') {
        recommendations.push({
          type: 'investigation',
          priority: 'medium',
          title: 'Declining FPS Trend Detected',
          description: `FPS has been ${trend.direction} at rate of ${trend.changeRate.toFixed(2)}`,
          implementation: [
            'Monitor GPU and CPU usage',
            'Check for resource leaks',
            'Consider performance optimization'
          ],
          expectedImpact: 'Prevent further performance degradation'
        });
      }
    }

    // Anomaly-based recommendations
    if (anomalies.length > 0) {
      recommendations.push({
        type: 'investigation',
        priority: 'medium',
        title: 'Performance Anomalies Detected',
        description: `${anomalies.length} anomalies found in telemetry data`,
        implementation: [
          'Review anomaly timestamps',
          'Correlate with system events',
          'Investigate root causes'
        ],
        expectedImpact: 'Improved system stability and predictability'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private async startDashboard(): Promise<void> {
    // Implementation would start a web dashboard for telemetry visualization
    console.log(`Dashboard would start on port ${this.config.dashboard.port}`);
  }

  private async backupData(): Promise<void> {
    if (this.config.storage.backup.enabled) {
      console.log('Backing up telemetry data...');
      // Implementation would backup current telemetry data
    }
  }
}

export interface SystemStatus {
  timestamp: number;
  sessionId: string;
  uptime: number;
  isHealthy: boolean;
  activeAlerts: number;
  metricsCollected: number;
  lastCollection: number;
  performance: number;
}