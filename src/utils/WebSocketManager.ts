import WebSocket from 'ws';
import { OSCManager } from './OSCManager';

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
  private oscManager: OSCManager | null = null;
  private fallbackToOSC: boolean = false;
  private autoSetupAttempted: boolean = false;

  constructor(port: number = 9980, oscManager?: OSCManager) {
    this.port = port;
    this.oscManager = oscManager;
  }

  async initialize(): Promise<void> {
    try {
      await this.connect();
    } catch (error) {
      console.log('[WebSocket] Initial connection failed, attempting auto-setup...');
      await this.attemptAutoSetup();
    }
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

  // Auto-setup WebSocket DAT in TouchDesigner
  async attemptAutoSetup(): Promise<void> {
    if (this.autoSetupAttempted) {
      console.log('[WebSocket] Auto-setup already attempted, falling back to OSC');
      this.enableOSCFallback();
      return;
    }

    this.autoSetupAttempted = true;
    console.log('[WebSocket] Attempting to auto-create WebSocket DAT in TouchDesigner...');

    if (this.oscManager) {
      try {
        // Create WebSocket DAT via OSC
        await this.autoSetupWebSocketDAT();
        
        // Wait a moment for TouchDesigner to set up the WebSocket
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try to connect again
        await this.connect();
        console.log('[WebSocket] Auto-setup successful!');
      } catch (error) {
        console.log('[WebSocket] Auto-setup failed, falling back to OSC');
        this.enableOSCFallback();
      }
    } else {
      console.log('[WebSocket] No OSC manager available for auto-setup, enabling OSC fallback');
      this.enableOSCFallback();
    }
  }

  async autoSetupWebSocketDAT(): Promise<void> {
    if (!this.oscManager) {
      throw new Error('OSC manager not available');
    }

    console.log('[WebSocket] Creating WebSocket DAT via OSC...');
    
    // Create WebSocket DAT
    await this.oscManager.createOperatorViaOSC('webSocketDAT', 'mcp_websocket', '/');
    
    // Configure as server
    await this.oscManager.setParametersViaOSC('mcp_websocket', {
      'mode': 'server',
      'port': this.port,
      'autostart': 1,
      'protocol': 'ws'
    });

    // Create callback script to handle WebSocket messages
    const callbackScript = `
# WebSocket message handler for MCP Server
def onReceiveText(dat, text):
    try:
        import json
        data = json.loads(text)
        
        # Handle MCP commands
        if 'command' in data:
            response = handle_mcp_command(data)
            dat.send(json.dumps(response))
    except Exception as e:
        print(f"WebSocket error: {e}")

def handle_mcp_command(data):
    command = data.get('command')
    command_data = data.get('data', {})
    
    try:
        if command == 'createOperator':
            result = create_operator(command_data)
        elif command == 'setParameter':
            result = set_parameter(command_data)
        elif command == 'connect':
            result = connect_operators(command_data)
        elif command == 'executeScript':
            result = execute_script(command_data)
        else:
            result = {'success': False, 'error': f'Unknown command: {command}'}
    except Exception as e:
        result = {'success': False, 'error': str(e)}
    
    result['id'] = data.get('id')
    return result

def create_operator(data):
    op_type = data.get('type')
    name = data.get('name')
    parent = data.get('parent', '/')
    
    parent_op = op(parent)
    if not parent_op:
        return {'success': False, 'error': f'Parent {parent} not found'}
    
    # Map type strings to TouchDesigner types
    type_map = {
        'constantTOP': constantTOP,
        'noiseTOP': noiseTOP,
        'levelTOP': levelTOP,
        'compositeTOP': compositeTOP,
        'renderTOP': renderTOP,
        'audiofileinCHOP': audiofileinCHOP,
        'particlegpuTOP': particlegpuTOP
    }
    
    td_type = type_map.get(op_type)
    if not td_type:
        return {'success': False, 'error': f'Unknown operator type: {op_type}'}
    
    new_op = parent_op.create(td_type, name)
    return {'success': True, 'data': {'path': new_op.path}}

def set_parameter(data):
    operator = data.get('operator')
    parameter = data.get('parameter')
    value = data.get('value')
    
    target_op = op(operator)
    if not target_op:
        return {'success': False, 'error': f'Operator {operator} not found'}
    
    if not hasattr(target_op.par, parameter):
        return {'success': False, 'error': f'Parameter {parameter} not found'}
    
    setattr(target_op.par, parameter, value)
    return {'success': True}

def connect_operators(data):
    from_op = op(data.get('fromOp'))
    to_op = op(data.get('toOp'))
    from_output = data.get('fromOutput', 0)
    to_input = data.get('toInput', 0)
    
    if not from_op or not to_op:
        return {'success': False, 'error': 'Source or target operator not found'}
    
    to_op.inputConnectors[to_input].connect(from_op, from_output)
    return {'success': True}

def execute_script(data):
    script = data.get('script')
    try:
        exec(script)
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}
`;

    // Create script DAT for WebSocket handling
    await this.oscManager.createOperatorViaOSC('textDAT', 'mcp_websocket_handler', '/');
    await this.oscManager.executeScriptViaOSC(`
op('mcp_websocket_handler').text = """${callbackScript}"""
op('mcp_websocket').par.callbacks = 'mcp_websocket_handler'
`);

    console.log('[WebSocket] WebSocket DAT auto-setup completed');
  }

  private enableOSCFallback(): void {
    this.fallbackToOSC = true;
    console.log('[WebSocket] OSC fallback enabled - WebSocket commands will be routed through OSC');
  }

  // Override sendCommand to use OSC fallback when WebSocket is not available
  async sendCommand(command: string, data?: any, expectResponse: boolean = true): Promise<CommandResponse> {
    if (this.fallbackToOSC && this.oscManager) {
      return this.sendCommandViaOSC(command, data);
    }

    if (!this.isConnected) {
      // Queue the message
      return new Promise((resolve) => {
        this.messageQueue.push({ command, data, resolve });
      });
    }

    return this.sendRaw(command, data);
  }

  private async sendCommandViaOSC(command: string, data?: any): Promise<CommandResponse> {
    if (!this.oscManager) {
      return { success: false, error: 'OSC manager not available' };
    }

    try {
      switch (command) {
        case 'createOperator':
          await this.oscManager.createOperatorViaOSC(data.type, data.name, data.parent);
          break;
        case 'setParameter':
          await this.oscManager.setParametersViaOSC(data.operator, { [data.parameter]: data.value });
          break;
        case 'connect':
          await this.oscManager.connectOperatorsViaOSC(data.fromOp, data.fromOutput, data.toOp, data.toInput);
          break;
        case 'executeScript':
          await this.oscManager.executeScriptViaOSC(data.script);
          break;
        case 'saveProject':
          await this.oscManager.saveProjectViaOSC(data.path);
          break;
        case 'performMode':
          await this.oscManager.setPerformModeViaOSC(data.enable);
          break;
        default:
          return { success: false, error: `OSC fallback not implemented for command: ${command}` };
      }
      
      return { success: true, data: 'Command sent via OSC' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // Connection verification methods
  async verifyConnection(): Promise<boolean> {
    if (this.isConnected) {
      try {
        const response = await this.sendCommand('ping', {}, true);
        return response.success;
      } catch (error) {
        return false;
      }
    }
    return false;
  }

  getConnectionStatus(): { connected: boolean; fallbackMode: boolean; autoSetupAttempted: boolean } {
    return {
      connected: this.isConnected,
      fallbackMode: this.fallbackToOSC,
      autoSetupAttempted: this.autoSetupAttempted
    };
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
    this.fallbackToOSC = false;
    this.autoSetupAttempted = false;
  }
}