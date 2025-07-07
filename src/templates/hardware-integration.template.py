"""
Hardware Integration Template
Extracted from FogScreenParticleCloud working patterns
Provides universal hardware integration with graceful fallback
"""

HARDWARE_INTEGRATION_TEMPLATE = """
import sys
import threading
import time
from typing import Dict, List, Any, Optional, Callable, Union
from dataclasses import dataclass
from enum import Enum

class HardwareStatus(Enum):
    UNKNOWN = "unknown"
    AVAILABLE = "available"
    CONNECTED = "connected"
    ERROR = "error"
    SIMULATION = "simulation"

@dataclass
class HardwareDevice:
    \"\"\"Hardware device information\"\"\"
    name: str
    type: str
    status: HardwareStatus
    capabilities: List[str]
    version: Optional[str] = None
    error_message: Optional[str] = None

class HardwareManager:
    \"\"\"Universal hardware integration manager\"\"\"
    
    def __init__(self):
        self.devices = {}
        self.device_handlers = {}
        self.simulation_mode = False
        self.auto_fallback = True
        
        # Device detection
        self.detection_active = False
        self.detection_thread = None
        
        # Hardware-specific integrations
        self.kinect_integration = None
        self.midi_integration = None
        self.audio_integration = None
        
        # TouchDesigner integration
        self.td_callback: Optional[Callable] = None
    
    def initialize(self, auto_detect: bool = True, simulation_fallback: bool = True):
        \"\"\"Initialize hardware manager\"\"\"
        self.auto_fallback = simulation_fallback
        
        if auto_detect:
            self.detect_all_hardware()
        
        print(f"Hardware Manager initialized - {len(self.devices)} devices found")
    
    def detect_all_hardware(self):
        \"\"\"Detect all available hardware\"\"\"
        print("Detecting hardware devices...")
        
        # Kinect detection
        self._detect_kinect()
        
        # MIDI detection
        self._detect_midi()
        
        # Audio interface detection
        self._detect_audio()
        
        # Camera detection
        self._detect_cameras()
        
        # Custom device detection
        self._detect_custom_devices()
        
        print(f"Hardware detection complete - {len(self.devices)} devices found")
    
    def _detect_kinect(self):
        \"\"\"Detect Kinect devices\"\"\"
        try:
            # Try Kinect v2 first
            kinect_device = HardwareDevice(
                name="Kinect v2",
                type="depth_sensor",
                status=HardwareStatus.UNKNOWN,
                capabilities=["depth", "color", "skeleton", "audio"]
            )
            
            # Attempt to import Kinect SDK
            try:
                from pykinect2 import PyKinectV2, PyKinectRuntime
                
                # Try to initialize Kinect
                kinect = PyKinectRuntime.PyKinectRuntime(PyKinectV2.FrameSourceTypes_Depth)
                if kinect.has_new_depth_frame():
                    kinect_device.status = HardwareStatus.AVAILABLE
                    kinect_device.version = "2.0"
                    self.kinect_integration = KinectIntegration(kinect)
                else:
                    kinect_device.status = HardwareStatus.ERROR
                    kinect_device.error_message = "Kinect not responding"
                    
            except ImportError:
                kinect_device.status = HardwareStatus.ERROR
                kinect_device.error_message = "PyKinect2 not installed"
            except Exception as e:
                kinect_device.status = HardwareStatus.ERROR
                kinect_device.error_message = str(e)
            
            self.devices["kinect"] = kinect_device
            
            # Fallback to simulation if needed
            if kinect_device.status == HardwareStatus.ERROR and self.auto_fallback:
                kinect_device.status = HardwareStatus.SIMULATION
                kinect_device.error_message = None
                self.kinect_integration = KinectSimulation()
                print("Kinect: Using simulation mode")
            
        except Exception as e:
            print(f"Error detecting Kinect: {e}")
    
    def _detect_midi(self):
        \"\"\"Detect MIDI devices\"\"\"
        try:
            midi_device = HardwareDevice(
                name="MIDI Controller",
                type="midi",
                status=HardwareStatus.UNKNOWN,
                capabilities=["control_change", "note_on", "note_off"]
            )
            
            try:
                import pygame.midi
                pygame.midi.init()
                
                device_count = pygame.midi.get_count()
                if device_count > 0:
                    midi_device.status = HardwareStatus.AVAILABLE
                    midi_device.version = f"{device_count} devices"
                    self.midi_integration = MIDIIntegration()
                else:
                    midi_device.status = HardwareStatus.ERROR
                    midi_device.error_message = "No MIDI devices found"
                    
            except ImportError:
                midi_device.status = HardwareStatus.ERROR
                midi_device.error_message = "pygame not installed"
            except Exception as e:
                midi_device.status = HardwareStatus.ERROR
                midi_device.error_message = str(e)
            
            self.devices["midi"] = midi_device
            
        except Exception as e:
            print(f"Error detecting MIDI: {e}")
    
    def _detect_audio(self):
        \"\"\"Detect audio interfaces\"\"\"
        try:
            audio_device = HardwareDevice(
                name="Audio Interface",
                type="audio",
                status=HardwareStatus.UNKNOWN,
                capabilities=["input", "output", "realtime_analysis"]
            )
            
            try:
                import pyaudio
                
                audio = pyaudio.PyAudio()
                device_count = audio.get_device_count()
                
                if device_count > 0:
                    audio_device.status = HardwareStatus.AVAILABLE
                    audio_device.version = f"{device_count} devices"
                    self.audio_integration = AudioIntegration(audio)
                else:
                    audio_device.status = HardwareStatus.ERROR
                    audio_device.error_message = "No audio devices found"
                
                audio.terminate()
                    
            except ImportError:
                audio_device.status = HardwareStatus.ERROR
                audio_device.error_message = "pyaudio not installed"
            except Exception as e:
                audio_device.status = HardwareStatus.ERROR
                audio_device.error_message = str(e)
            
            self.devices["audio"] = audio_device
            
        except Exception as e:
            print(f"Error detecting audio: {e}")
    
    def _detect_cameras(self):
        \"\"\"Detect camera devices\"\"\"
        try:
            camera_device = HardwareDevice(
                name="Camera",
                type="camera",
                status=HardwareStatus.UNKNOWN,
                capabilities=["video", "photo", "motion_detection"]
            )
            
            try:
                import cv2
                
                # Test camera 0
                cap = cv2.VideoCapture(0)
                if cap.isOpened():
                    camera_device.status = HardwareStatus.AVAILABLE
                    camera_device.version = "OpenCV"
                    cap.release()
                else:
                    camera_device.status = HardwareStatus.ERROR
                    camera_device.error_message = "Camera not accessible"
                    
            except ImportError:
                camera_device.status = HardwareStatus.ERROR
                camera_device.error_message = "OpenCV not installed"
            except Exception as e:
                camera_device.status = HardwareStatus.ERROR
                camera_device.error_message = str(e)
            
            self.devices["camera"] = camera_device
            
        except Exception as e:
            print(f"Error detecting camera: {e}")
    
    def _detect_custom_devices(self):
        \"\"\"Detect custom/project-specific devices\"\"\"
        # Override this method in project-specific implementations
        pass
    
    def get_device_status(self, device_name: str) -> Optional[HardwareDevice]:
        \"\"\"Get status of specific device\"\"\"
        return self.devices.get(device_name)
    
    def get_all_devices(self) -> Dict[str, HardwareDevice]:
        \"\"\"Get all detected devices\"\"\"
        return self.devices.copy()
    
    def is_device_available(self, device_name: str) -> bool:
        \"\"\"Check if device is available for use\"\"\"
        device = self.devices.get(device_name)
        return device and device.status in [HardwareStatus.AVAILABLE, HardwareStatus.CONNECTED, HardwareStatus.SIMULATION]
    
    def enable_simulation_mode(self, device_name: str):
        \"\"\"Enable simulation mode for specific device\"\"\"
        if device_name in self.devices:
            device = self.devices[device_name]
            device.status = HardwareStatus.SIMULATION
            device.error_message = None
            
            # Initialize simulation for specific devices
            if device_name == "kinect" and not self.kinect_integration:
                self.kinect_integration = KinectSimulation()
            
            print(f"{device_name}: Simulation mode enabled")
    
    def set_touchdesigner_callback(self, callback: Callable):
        \"\"\"Set TouchDesigner integration callback\"\"\"
        self.td_callback = callback
        
        # Pass callback to device integrations
        if self.kinect_integration:
            self.kinect_integration.set_callback(callback)
        if self.midi_integration:
            self.midi_integration.set_callback(callback)
        if self.audio_integration:
            self.audio_integration.set_callback(callback)

class KinectIntegration:
    \"\"\"Real Kinect integration\"\"\"
    
    def __init__(self, kinect_runtime):
        self.kinect = kinect_runtime
        self.callback = None
        self.running = False
        self.thread = None
    
    def set_callback(self, callback: Callable):
        self.callback = callback
    
    def start(self):
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._update_loop, daemon=True)
            self.thread.start()
    
    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join()
    
    def _update_loop(self):
        while self.running:
            if self.kinect.has_new_depth_frame():
                depth_frame = self.kinect.get_last_depth_frame()
                if self.callback:
                    self.callback('kinect_depth', depth_frame)
            time.sleep(0.033)  # ~30 FPS

class KinectSimulation:
    \"\"\"Kinect simulation for development/fallback\"\"\"
    
    def __init__(self):
        self.callback = None
        self.running = False
        self.thread = None
        self.frame_count = 0
    
    def set_callback(self, callback: Callable):
        self.callback = callback
    
    def start(self):
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._simulate_loop, daemon=True)
            self.thread.start()
    
    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join()
    
    def _simulate_loop(self):
        import numpy as np
        while self.running:
            # Generate simulated depth data
            simulated_depth = np.random.randint(500, 4000, (424, 512), dtype=np.uint16)
            
            # Add some motion patterns
            center_x, center_y = 256, 212
            radius = 50 + 30 * np.sin(self.frame_count * 0.1)
            y, x = np.ogrid[:424, :512]
            mask = (x - center_x)**2 + (y - center_y)**2 < radius**2
            simulated_depth[mask] = 1000  # Closer object
            
            if self.callback:
                self.callback('kinect_depth', simulated_depth)
            
            self.frame_count += 1
            time.sleep(0.033)  # ~30 FPS

class MIDIIntegration:
    \"\"\"MIDI device integration\"\"\"
    
    def __init__(self):
        self.callback = None
        import pygame.midi
        pygame.midi.init()
        self.midi_input = None
        
        # Find first available input device
        for i in range(pygame.midi.get_count()):
            if pygame.midi.get_device_info(i)[2] == 1:  # Input device
                self.midi_input = pygame.midi.Input(i)
                break
    
    def set_callback(self, callback: Callable):
        self.callback = callback
    
    def poll(self):
        \"\"\"Poll for MIDI messages\"\"\"
        if self.midi_input and self.midi_input.poll():
            midi_events = self.midi_input.read(10)
            for event in midi_events:
                if self.callback:
                    self.callback('midi_event', event)

class AudioIntegration:
    \"\"\"Audio interface integration\"\"\"
    
    def __init__(self, audio_interface):
        self.audio = audio_interface
        self.callback = None
        self.stream = None
    
    def set_callback(self, callback: Callable):
        self.callback = callback
    
    def start_monitoring(self, sample_rate: int = 44100, chunk_size: int = 1024):
        \"\"\"Start audio monitoring\"\"\"
        def audio_callback(in_data, frame_count, time_info, status):
            if self.callback:
                self.callback('audio_data', in_data)
            return (in_data, self.audio.paContinue)
        
        self.stream = self.audio.open(
            format=self.audio.paInt16,
            channels=1,
            rate=sample_rate,
            input=True,
            frames_per_buffer=chunk_size,
            stream_callback=audio_callback
        )
        self.stream.start_stream()
    
    def stop_monitoring(self):
        if self.stream:
            self.stream.stop_stream()
            self.stream.close()
"""

# TouchDesigner Integration Script Template
TOUCHDESIGNER_HARDWARE_INTEGRATION = """
# TouchDesigner Hardware Integration Setup
import sys
sys.path.append(r'${project_root}/scripts')

from hardware_manager import HardwareManager

# Initialize hardware manager
hardware_manager = HardwareManager()

def hardware_callback(device_type, data):
    \"\"\"Handle hardware data in TouchDesigner\"\"\"
    if device_type == 'kinect_depth':
        # Process Kinect depth data
        kinect_op = op('kinect_input')
        if kinect_op:
            # Convert depth data for TouchDesigner
            kinect_op.process_depth_frame(data)
    
    elif device_type == 'midi_event':
        # Process MIDI events
        midi_op = op('midi_input')
        if midi_op:
            midi_op.process_midi_event(data)
    
    elif device_type == 'audio_data':
        # Process audio data
        audio_op = op('audio_input')
        if audio_op:
            audio_op.process_audio_data(data)

# Set up hardware integration
hardware_manager.set_touchdesigner_callback(hardware_callback)
hardware_manager.initialize(auto_detect=True, simulation_fallback=True)

# Store manager reference
parent().store('hardware_manager', hardware_manager)

# Start hardware monitoring
if hardware_manager.is_device_available('kinect'):
    hardware_manager.kinect_integration.start()

if hardware_manager.is_device_available('midi'):
    # Start MIDI polling in timer callback
    def poll_midi():
        hardware_manager.midi_integration.poll()
    
    # Set up timer to poll MIDI
    run("args[0]()", poll_midi, delayFrames=1, delayMilliSeconds=0)

if hardware_manager.is_device_available('audio'):
    hardware_manager.audio_integration.start_monitoring()
"""

# Hardware configuration template
HARDWARE_CONFIG_TEMPLATE = {
    "kinect": {
        "enabled": True,
        "simulation_fallback": True,
        "depth_range": [500, 4000],
        "resolution": {"width": 512, "height": 424},
        "frame_rate": 30
    },
    "midi": {
        "enabled": True,
        "device_name": "auto_detect",
        "channel": 1,
        "control_mapping": {
            "1": "parameter1",
            "2": "parameter2"
        }
    },
    "audio": {
        "enabled": True,
        "sample_rate": 44100,
        "chunk_size": 1024,
        "input_device": "default"
    },
    "camera": {
        "enabled": False,
        "device_index": 0,
        "resolution": {"width": 1920, "height": 1080},
        "frame_rate": 30
    }
}