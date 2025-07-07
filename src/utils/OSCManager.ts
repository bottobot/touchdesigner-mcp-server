import * as osc from 'osc';

interface OSCSetup {
  receivePort?: number;
  sendPort?: number;
  sendAddress?: string;
}

export class OSCManager {
  private udpPort: any;
  private receivePort: number;
  private sendPort: number;
  private sendAddress: string;
  private isInitialized: boolean = false;
  private messageHandlers: Map<string, (args: any[]) => void> = new Map();

  constructor(defaultPort: number = 7000) {
    this.receivePort = defaultPort;
    this.sendPort = defaultPort + 1;
    this.sendAddress = '127.0.0.1';
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.udpPort = new osc.UDPPort({
      localAddress: '0.0.0.0',
      localPort: this.receivePort,
      metadata: true
    });

    this.udpPort.on('message', (oscMsg: any, timeTag: any, info: any) => {
      const handler = this.messageHandlers.get(oscMsg.address);
      if (handler) {
        handler(oscMsg.args);
      }
      
      // Log all messages for debugging
      console.log(`OSC Message received: ${oscMsg.address}`, oscMsg.args);
    });

    this.udpPort.on('error', (err: Error) => {
      console.error('OSC Error:', err);
    });

    await new Promise<void>((resolve, reject) => {
      this.udpPort.open();
      this.udpPort.on('ready', () => {
        this.isInitialized = true;
        console.log(`OSC listening on port ${this.receivePort}`);
        resolve();
      });
      this.udpPort.on('error', reject);
    });
  }

  async setup(config: OSCSetup): Promise<void> {
    if (config.receivePort && config.receivePort !== this.receivePort) {
      // Need to reinitialize with new port
      if (this.isInitialized) {
        this.udpPort.close();
        this.isInitialized = false;
      }
      this.receivePort = config.receivePort;
      await this.initialize();
    }

    if (config.sendPort) {
      this.sendPort = config.sendPort;
    }

    if (config.sendAddress) {
      this.sendAddress = config.sendAddress;
    }
  }

  async send(address: string, args: any[], target?: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const [targetAddress, targetPort] = target 
      ? target.split(':') 
      : [this.sendAddress, this.sendPort.toString()];

    const oscArgs = args.map(arg => {
      if (typeof arg === 'number') {
        return { type: 'f', value: arg };
      } else if (typeof arg === 'string') {
        return { type: 's', value: arg };
      } else if (typeof arg === 'boolean') {
        return { type: arg ? 'T' : 'F', value: null };
      } else {
        return { type: 's', value: String(arg) };
      }
    });

    const message = {
      address,
      args: oscArgs
    };

    this.udpPort.send(message, targetAddress, parseInt(targetPort));
  }

  onMessage(address: string, handler: (args: any[]) => void): void {
    this.messageHandlers.set(address, handler);
  }

  offMessage(address: string): void {
    this.messageHandlers.delete(address);
  }

  // TouchDesigner-specific OSC patterns
  async sendTDControl(control: string, value: number | string): Promise<void> {
    await this.send(`/td/controls/${control}`, [value]);
  }

  async sendTDParameter(operator: string, parameter: string, value: any): Promise<void> {
    await this.send(`/td/op/${operator}/${parameter}`, [value]);
  }

  async sendTDTrigger(trigger: string): Promise<void> {
    await this.send(`/td/triggers/${trigger}`, [1]);
  }

  async sendTDCue(cueNumber: number): Promise<void> {
    await this.send('/td/cue', [cueNumber]);
  }

  async sendTDBPM(bpm: number): Promise<void> {
    await this.send('/td/bpm', [bpm]);
  }

  async sendTDTransport(command: 'play' | 'pause' | 'stop' | 'rewind'): Promise<void> {
    await this.send(`/td/transport/${command}`, [1]);
  }

  // Enhanced TouchDesigner-specific methods for primary communication

  async createOperatorViaOSC(type: string, name: string, parent: string = '/'): Promise<void> {
    await this.send('/td/create', [type, name, parent]);
  }

  async deleteOperatorViaOSC(path: string): Promise<void> {
    await this.send('/td/delete', [path]);
  }

  async setParametersViaOSC(operator: string, parameters: Record<string, any>): Promise<void> {
    const messages = Object.entries(parameters).map(([param, value]) => ({
      address: `/td/op/${operator}/${param}`,
      args: [value]
    }));
    await this.sendBatch(messages);
  }

  async getProjectStateViaOSC(): Promise<void> {
    // Request project state - TouchDesigner should respond with current state
    await this.send('/td/project/state', ['request']);
  }

  async connectOperatorsViaOSC(fromOp: string, fromOutput: number, toOp: string, toInput: number): Promise<void> {
    await this.send('/td/connect', [fromOp, fromOutput, toOp, toInput]);
  }

  async disconnectOperatorsViaOSC(fromOp: string, fromOutput: number, toOp: string, toInput: number): Promise<void> {
    await this.send('/td/disconnect', [fromOp, fromOutput, toOp, toInput]);
  }

  async executeScriptViaOSC(script: string): Promise<void> {
    await this.send('/td/python', [script]);
  }

  async saveProjectViaOSC(path?: string): Promise<void> {
    if (path) {
      await this.send('/td/project/save', [path]);
    } else {
      await this.send('/td/project/save', []);
    }
  }

  async setPerformModeViaOSC(enable: boolean): Promise<void> {
    await this.send('/td/perform', [enable ? 1 : 0]);
  }

  async getOperatorInfoViaOSC(path: string): Promise<void> {
    await this.send('/td/op/info', [path]);
  }

  async setProjectResolutionViaOSC(width: number, height: number): Promise<void> {
    await this.send('/td/project/resolution', [width, height]);
  }

  async setProjectFPSViaOSC(fps: number): Promise<void> {
    await this.send('/td/project/fps', [fps]);
  }

  async requestPerformanceMetricsViaOSC(): Promise<void> {
    await this.send('/td/performance', ['request']);
  }

  async setQualityLevelViaOSC(level: 'low' | 'medium' | 'high' | 'ultra'): Promise<void> {
    await this.send('/td/quality', [level]);
  }

  // Setup TouchDesigner OSC listeners
  setupTouchDesignerListeners(): void {
    // Listen for TouchDesigner responses
    this.onMessage('/td/response/create', (args) => {
      console.log('Operator created:', args);
    });

    this.onMessage('/td/response/parameter', (args) => {
      console.log('Parameter updated:', args);
    });

    this.onMessage('/td/response/performance', (args) => {
      console.log('Performance metrics:', args);
    });

    this.onMessage('/td/response/project/state', (args) => {
      console.log('Project state:', args);
    });

    this.onMessage('/td/error', (args) => {
      console.error('TouchDesigner error:', args);
    });

    // Listen for real-time data
    this.onMessage('/td/fps', (args) => {
      console.log('Current FPS:', args[0]);
    });

    this.onMessage('/td/cooktime', (args) => {
      console.log('Cook time:', args[0], 'ms');
    });

    this.onMessage('/td/memory', (args) => {
      console.log('Memory usage:', args[0], 'MB');
    });
  }

  // Batch send for performance
  async sendBatch(messages: Array<{ address: string; args: any[] }>): Promise<void> {
    for (const msg of messages) {
      await this.send(msg.address, msg.args);
    }
  }

  // High-level convenience methods for common workflows

  async createBasicTOPChain(chainName: string, nodeTypes: string[]): Promise<void> {
    const messages: Array<{ address: string; args: any[] }> = [];
    
    nodeTypes.forEach((type, index) => {
      const nodeName = `${chainName}_${type}_${index}`;
      messages.push({
        address: '/td/create',
        args: [type, nodeName, '/']
      });
      
      // Position nodes in a chain
      messages.push({
        address: `/td/op/${nodeName}/nodeX`,
        args: [index * 150]
      });
      
      messages.push({
        address: `/td/op/${nodeName}/nodeY`,
        args: [0]
      });
      
      // Connect to previous node
      if (index > 0) {
        const prevNode = `${chainName}_${nodeTypes[index - 1]}_${index - 1}`;
        messages.push({
          address: '/td/connect',
          args: [prevNode, 0, nodeName, 0]
        });
      }
    });
    
    await this.sendBatch(messages);
  }

  async setupAudioReactiveChain(): Promise<void> {
    const messages = [
      { address: '/td/create', args: ['audiofileinCHOP', 'audio_input', '/'] },
      { address: '/td/create', args: ['audiospectrumCHOP', 'audio_spectrum', '/'] },
      { address: '/td/create', args: ['noiseTOP', 'base_noise', '/'] },
      { address: '/td/create', args: ['levelTOP', 'audio_modulated', '/'] },
      
      // Connect audio chain
      { address: '/td/connect', args: ['audio_input', 0, 'audio_spectrum', 0] },
      { address: '/td/connect', args: ['base_noise', 0, 'audio_modulated', 0] },
      
      // Set up modulation
      { address: '/td/op/audio_modulated/opacity', args: ['op("audio_spectrum")[0,0]'] }
    ];
    
    await this.sendBatch(messages);
  }

  close(): void {
    if (this.udpPort) {
      this.udpPort.close();
      this.isInitialized = false;
    }
  }
}