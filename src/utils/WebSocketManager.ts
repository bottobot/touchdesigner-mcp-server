import WebSocket from 'ws';

interface CommandResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private port: number;
  private isConnected: boolean = false;
  private messageQueue: Array<{ command: string; data: any; resolve: (value: any) => void }> = [];
  private reconnectInterval: NodeJS.Timeout | null = null;

  constructor(port: number = 9980) {
    this.port = port;
  }

  async initialize(): Promise<void> {
    await this.connect();
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`[WebSocket Debug] Attempting to connect to ws://localhost:${this.port}`);
      console.log(`[WebSocket Debug] This requires TouchDesigner to have a WebSocket DAT node configured as a server on port ${this.port}`);
      
      try {
        this.ws = new WebSocket(`ws://localhost:${this.port}`);

        this.ws.on('open', () => {
          this.isConnected = true;
          console.log(`[WebSocket Debug] Successfully connected to TouchDesigner on port ${this.port}`);
          
          // Process queued messages
          this.processQueue();
          
          // Clear reconnect interval if exists
          if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
          }
          
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        });

        this.ws.on('error', (error: any) => {
          console.log('[WebSocket Debug] Connection failed. Common causes:');
          console.log('  1. TouchDesigner needs a WebSocket DAT node configured as a server');
          console.log('  2. The WebSocket DAT must be set to "Server" mode on port 9980');
          console.log('  3. TouchDesigner project with WebSocket DAT must be loaded and running');
          console.log(`[WebSocket Debug] Error code: ${error.code}`);
          this.isConnected = false;
          reject(error);
        });

        this.ws.on('close', () => {
          console.log('[WebSocket Debug] Connection closed');
          this.isConnected = false;
          this.setupReconnect();
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private setupReconnect(): void {
    if (!this.reconnectInterval) {
      this.reconnectInterval = setInterval(() => {
        if (!this.isConnected) {
          console.log('Attempting to reconnect to TouchDesigner...');
          this.connect().catch(console.error);
        }
      }, 5000);
    }
  }

  private processQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendRaw(message.command, message.data).then(message.resolve);
      }
    }
  }

  private handleMessage(message: any): void {
    // Handle different message types from TouchDesigner
    if (message.type === 'response') {
      // Handle command responses
    } else if (message.type === 'event') {
      // Handle TouchDesigner events
      this.handleTDEvent(message);
    } else if (message.type === 'error') {
      console.error('TouchDesigner error:', message.error);
    }
  }

  private handleTDEvent(event: any): void {
    // Handle specific TouchDesigner events
    switch (event.name) {
      case 'parameterChanged':
        console.log(`Parameter ${event.parameter} changed to ${event.value}`);
        break;
      case 'operatorCreated':
        console.log(`Operator ${event.operator} created`);
        break;
      case 'performanceUpdate':
        console.log(`Performance: FPS=${event.fps}, Cook Time=${event.cookTime}ms`);
        break;
    }
  }

  async sendCommand(command: string, data?: any, expectResponse: boolean = true): Promise<CommandResponse> {
    if (!this.isConnected) {
      // Queue the message
      return new Promise((resolve) => {
        this.messageQueue.push({ command, data, resolve });
      });
    }

    return this.sendRaw(command, data);
  }

  private async sendRaw(command: string, data?: any): Promise<CommandResponse> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        resolve({ success: false, error: 'WebSocket not connected' });
        return;
      }

      const message = {
        command,
        data,
        timestamp: Date.now(),
        id: Math.random().toString(36).substr(2, 9)
      };

      // Set up response handler with timeout
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Command timeout' });
      }, 5000);

      const responseHandler = (data: WebSocket.Data) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.id === message.id) {
            clearTimeout(timeout);
            this.ws?.off('message', responseHandler);
            resolve({ success: true, data: response.data });
          }
        } catch (error) {
          // Not our response, ignore
        }
      };

      this.ws.on('message', responseHandler);
      this.ws.send(JSON.stringify(message));
    });
  }

  // TouchDesigner-specific commands
  async createOperator(type: string, name: string, parent: string = '/'): Promise<CommandResponse> {
    return this.sendCommand('createOperator', { type, name, parent });
  }

  async deleteOperator(path: string): Promise<CommandResponse> {
    return this.sendCommand('deleteOperator', { path });
  }

  async setParameter(operator: string, parameter: string, value: any): Promise<CommandResponse> {
    return this.sendCommand('setParameter', { operator, parameter, value });
  }

  async getParameter(operator: string, parameter: string): Promise<CommandResponse> {
    return this.sendCommand('getParameter', { operator, parameter });
  }

  async connectOperators(fromOp: string, fromOutput: number, toOp: string, toInput: number): Promise<CommandResponse> {
    return this.sendCommand('connect', { fromOp, fromOutput, toOp, toInput });
  }

  async disconnectOperators(fromOp: string, fromOutput: number, toOp: string, toInput: number): Promise<CommandResponse> {
    return this.sendCommand('disconnect', { fromOp, fromOutput, toOp, toInput });
  }

  async executeScript(script: string): Promise<CommandResponse> {
    return this.sendCommand('executeScript', { script });
  }

  async getOperatorInfo(path: string): Promise<CommandResponse> {
    return this.sendCommand('getOperatorInfo', { path });
  }

  async saveProject(path?: string): Promise<CommandResponse> {
    return this.sendCommand('saveProject', { path });
  }

  async performMode(enable: boolean): Promise<CommandResponse> {
    return this.sendCommand('performMode', { enable });
  }

  close(): void {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
  }
}