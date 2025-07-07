"""
OSC Communication Template
Extracted from FogScreenParticleCloud working patterns
Provides robust OSC communication with TouchDesigner integration
"""

OSC_COMMUNICATION_TEMPLATE = """
import socket
import struct
import time
import threading
from typing import Dict, List, Any, Optional, Callable, Union
from dataclasses import dataclass

@dataclass
class OSCMessage:
    \"\"\"OSC message structure\"\"\"
    address: str
    args: List[Any]
    timestamp: float

class OSCManager:
    def __init__(self, receive_port: int = 7000, send_port: int = 7001):
        \"\"\"Initialize OSC manager\"\"\"
        self.receive_port = receive_port
        self.send_port = send_port
        self.send_host = 'localhost'
        
        # Socket setup
        self.receive_socket = None
        self.send_socket = None
        
        # Threading
        self.listening = False
        self.listen_thread = None
        
        # Message handling
        self.message_handlers = {}
        self.message_queue = []
        self.max_queue_size = 1000
        
        # Statistics
        self.messages_sent = 0
        self.messages_received = 0
        self.last_send_time = 0
        self.last_receive_time = 0
        
        # TouchDesigner integration
        self.td_integration_active = False
        self.td_callback: Optional[Callable] = None
    
    def setup(self, receive_port: Optional[int] = None, send_port: Optional[int] = None, 
              send_host: Optional[str] = None):
        \"\"\"Setup OSC communication\"\"\"
        if receive_port:
            self.receive_port = receive_port
        if send_port:
            self.send_port = send_port
        if send_host:
            self.send_host = send_host
        
        self._setup_sockets()
        self._start_listening()
        
        print(f"OSC setup complete - Receiving on port {self.receive_port}, sending to {self.send_host}:{self.send_port}")
    
    def _setup_sockets(self):
        \"\"\"Setup UDP sockets for OSC communication\"\"\"
        try:
            # Receive socket
            self.receive_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            self.receive_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.receive_socket.bind(('0.0.0.0', self.receive_port))
            self.receive_socket.settimeout(1.0)
            
            # Send socket
            self.send_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            
            print(f"OSC sockets setup successfully")
            
        except Exception as e:
            print(f"Error setting up OSC sockets: {e}")
            raise
    
    def _start_listening(self):
        \"\"\"Start listening for OSC messages\"\"\"
        if self.listening:
            return
        
        self.listening = True
        self.listen_thread = threading.Thread(target=self._listen_loop, daemon=True)
        self.listen_thread.start()
        print("OSC listening started")
    
    def stop_listening(self):
        \"\"\"Stop listening for OSC messages\"\"\"
        self.listening = False
        if self.listen_thread:
            self.listen_thread.join(timeout=2.0)
        
        if self.receive_socket:
            self.receive_socket.close()
        if self.send_socket:
            self.send_socket.close()
        
        print("OSC listening stopped")
    
    def _listen_loop(self):
        \"\"\"Main listening loop\"\"\"
        while self.listening:
            try:
                if self.receive_socket:
                    data, addr = self.receive_socket.recvfrom(1024)
                    message = self._parse_osc_message(data)
                    if message:
                        self._handle_message(message)
                        self.messages_received += 1
                        self.last_receive_time = time.time()
                        
            except socket.timeout:
                continue
            except Exception as e:
                if self.listening:  # Only log if we're supposed to be listening
                    print(f"OSC receive error: {e}")
                time.sleep(0.1)
    
    def _parse_osc_message(self, data: bytes) -> Optional[OSCMessage]:
        \"\"\"Parse OSC message from bytes\"\"\"
        try:
            # Simple OSC parser - address pattern
            null_pos = data.find(b'\\x00')
            if null_pos == -1:
                return None
            
            address = data[:null_pos].decode('utf-8')
            
            # Align to 4-byte boundary
            type_tag_start = ((null_pos + 4) // 4) * 4
            if type_tag_start >= len(data):
                return None
            
            # Type tag
            type_tag_end = data.find(b'\\x00', type_tag_start)
            if type_tag_end == -1:
                return None
            
            type_tag = data[type_tag_start:type_tag_end].decode('utf-8')
            
            # Parse arguments
            args = []
            arg_start = ((type_tag_end + 4) // 4) * 4
            
            for i, arg_type in enumerate(type_tag[1:]):  # Skip comma
                if arg_start >= len(data):
                    break
                
                if arg_type == 'f':  # float
                    if arg_start + 4 <= len(data):
                        value = struct.unpack('>f', data[arg_start:arg_start+4])[0]
                        args.append(value)
                        arg_start += 4
                elif arg_type == 'i':  # int
                    if arg_start + 4 <= len(data):
                        value = struct.unpack('>i', data[arg_start:arg_start+4])[0]
                        args.append(value)
                        arg_start += 4
                elif arg_type == 's':  # string
                    str_end = data.find(b'\\x00', arg_start)
                    if str_end != -1:
                        value = data[arg_start:str_end].decode('utf-8')
                        args.append(value)
                        arg_start = ((str_end + 4) // 4) * 4
            
            return OSCMessage(
                address=address,
                args=args,
                timestamp=time.time()
            )
            
        except Exception as e:
            print(f"Error parsing OSC message: {e}")
            return None
    
    def _handle_message(self, message: OSCMessage):
        \"\"\"Handle received OSC message\"\"\"
        # Add to queue
        if len(self.message_queue) >= self.max_queue_size:
            self.message_queue.pop(0)
        self.message_queue.append(message)
        
        # Call specific handler if registered
        if message.address in self.message_handlers:
            try:
                self.message_handlers[message.address](message)
            except Exception as e:
                print(f"Error in OSC handler for {message.address}: {e}")
        
        # Call TouchDesigner callback if active
        if self.td_callback:
            try:
                self.td_callback(message.address, message.args)
            except Exception as e:
                print(f"Error in TouchDesigner OSC callback: {e}")
    
    def send(self, address: str, args: List[Any], target: Optional[str] = None):
        \"\"\"Send OSC message\"\"\"
        if not self.send_socket:
            print("Send socket not available")
            return
        
        # Parse target
        host = self.send_host
        port = self.send_port
        if target:
            if ':' in target:
                host, port_str = target.split(':')
                port = int(port_str)
            else:
                host = target
        
        try:
            # Build OSC message
            osc_data = self._build_osc_message(address, args)
            
            # Send message
            self.send_socket.sendto(osc_data, (host, port))
            
            self.messages_sent += 1
            self.last_send_time = time.time()
            
        except Exception as e:
            print(f"Error sending OSC message: {e}")
    
    def _build_osc_message(self, address: str, args: List[Any]) -> bytes:
        \"\"\"Build OSC message bytes\"\"\"
        # Address pattern
        addr_bytes = address.encode('utf-8')
        addr_padded = addr_bytes + b'\\x00' * (4 - (len(addr_bytes) % 4))
        
        # Type tag
        type_tag = ','
        arg_data = b''
        
        for arg in args:
            if isinstance(arg, float):
                type_tag += 'f'
                arg_data += struct.pack('>f', arg)
            elif isinstance(arg, int):
                type_tag += 'i'
                arg_data += struct.pack('>i', arg)
            elif isinstance(arg, str):
                type_tag += 's'
                str_bytes = arg.encode('utf-8')
                str_padded = str_bytes + b'\\x00' * (4 - (len(str_bytes) % 4))
                arg_data += str_padded
            elif isinstance(arg, bool):
                type_tag += 'T' if arg else 'F'
        
        # Type tag padding
        type_tag_bytes = type_tag.encode('utf-8')
        type_tag_padded = type_tag_bytes + b'\\x00' * (4 - (len(type_tag_bytes) % 4))
        
        return addr_padded + type_tag_padded + arg_data
    
    def register_handler(self, address: str, handler: Callable):
        \"\"\"Register handler for specific OSC address\"\"\"
        self.message_handlers[address] = handler
        print(f"Registered OSC handler for {address}")
    
    def unregister_handler(self, address: str):
        \"\"\"Unregister handler for OSC address\"\"\"
        if address in self.message_handlers:
            del self.message_handlers[address]
            print(f"Unregistered OSC handler for {address}")
    
    def set_touchdesigner_callback(self, callback: Callable):
        \"\"\"Set TouchDesigner integration callback\"\"\"
        self.td_callback = callback
        self.td_integration_active = True
        print("TouchDesigner OSC callback registered")
    
    def get_statistics(self) -> Dict[str, Any]:
        \"\"\"Get OSC communication statistics\"\"\"
        return {
            'messages_sent': self.messages_sent,
            'messages_received': self.messages_received,
            'last_send_time': self.last_send_time,
            'last_receive_time': self.last_receive_time,
            'queue_size': len(self.message_queue),
            'handlers_registered': len(self.message_handlers),
            'listening': self.listening,
            'td_integration_active': self.td_integration_active
        }
    
    def get_recent_messages(self, count: int = 10) -> List[OSCMessage]:
        \"\"\"Get recent messages from queue\"\"\"
        return self.message_queue[-count:]

# TouchDesigner Integration
class TouchDesignerOSCIntegration:
    \"\"\"TouchDesigner-specific OSC integration\"\"\"
    
    @staticmethod
    def create_osc_setup_script():
        \"\"\"Create TouchDesigner OSC setup script\"\"\"
        return '''
# OSC setup for TouchDesigner
import sys
sys.path.append(r'${project_root}/scripts')

from osc_manager import OSCManager

# Initialize OSC manager
osc_manager = OSCManager(receive_port=${receive_port}, send_port=${send_port})

def touchdesigner_osc_callback(address, args):
    \"\"\"Handle OSC messages in TouchDesigner context\"\"\"
    # Route messages to appropriate operators
    if address.startswith('/kinect/'):
        # Kinect control messages
        kinect_op = op('kinect_input')
        if kinect_op and len(args) > 0:
            if address == '/kinect/enable':
                kinect_op.par.active = bool(args[0])
            elif address == '/kinect/depthrange':
                if len(args) >= 2:
                    kinect_op.par.depthrange = [args[0], args[1]]
    
    elif address.startswith('/particles/'):
        # Particle system control
        particle_op = op('particle_system')
        if particle_op and len(args) > 0:
            if address == '/particles/count':
                particle_op.par.count = int(args[0])
            elif address == '/particles/birthrate':
                particle_op.par.birthrate = float(args[0])
            elif address == '/particles/life':
                particle_op.par.life = float(args[0])
    
    elif address.startswith('/performance/'):
        # Performance control
        if address == '/performance/quality':
            # Adjust quality level
            quality = float(args[0])
            perf_monitor = op('performance_monitor')
            if perf_monitor:
                perf_monitor.force_quality_level(quality)

# Set up OSC integration
osc_manager.set_touchdesigner_callback(touchdesigner_osc_callback)
osc_manager.setup()

# Store manager reference for other scripts
parent().store('osc_manager', osc_manager)
'''
    
    @staticmethod
    def create_osc_nodes():
        \"\"\"Create OSC-related nodes in TouchDesigner\"\"\"
        return '''
        # Create OSC In CHOP
        osc_in = td.root.create(td.chopType, 'osc_in')
        osc_in.par.optype = 'oscin'
        osc_in.par.port = ${receive_port}
        osc_in.par.active = True
        
        # Create OSC Out CHOP  
        osc_out = td.root.create(td.chopType, 'osc_out')
        osc_out.par.optype = 'oscout'
        osc_out.par.networkaddress = '${send_host}'
        osc_out.par.networkport = ${send_port}
        osc_out.par.active = True
        
        # Create OSC DAT for message logging
        osc_log = td.root.create(td.datType, 'osc_log')
        osc_log.par.optype = 'oscin'
        osc_log.par.port = ${receive_port}
        osc_log.par.active = True
        '''
"""

# Configuration template for OSC settings
OSC_CONFIG_TEMPLATE = {
    "network": {
        "receive_port": 7000,
        "send_port": 7001,
        "send_host": "localhost",
        "multicast_group": None
    },
    "message_routing": {
        "/kinect/*": "kinect_control",
        "/particles/*": "particle_control", 
        "/performance/*": "performance_control",
        "/zones/*": "zone_control"
    },
    "touchdesigner_integration": {
        "auto_setup": True,
        "create_chop_nodes": True,
        "create_dat_nodes": True,
        "log_messages": True
    },
    "performance": {
        "max_queue_size": 1000,
        "message_timeout": 1.0,
        "retry_attempts": 3
    }
}