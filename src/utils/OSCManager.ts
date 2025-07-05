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

  // Batch send for performance
  async sendBatch(messages: Array<{ address: string; args: any[] }>): Promise<void> {
    for (const msg of messages) {
      await this.send(msg.address, msg.args);
    }
  }

  close(): void {
    if (this.udpPort) {
      this.udpPort.close();
      this.isInitialized = false;
    }
  }
}