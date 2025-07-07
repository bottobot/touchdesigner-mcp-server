"""
Kinect Integration Template
Extracted from FogScreenParticleCloud working patterns
Provides hardware integration with graceful fallback
"""

KINECT_INTEGRATION_TEMPLATE = """
import numpy as np
import json
import time
import threading
from typing import Dict, Optional, Callable
from dataclasses import dataclass

@dataclass
class KinectFrame:
    \"\"\"Kinect frame data structure\"\"\"
    depth_data: np.ndarray
    color_data: Optional[np.ndarray]
    timestamp: float
    frame_id: int

class KinectIntegration:
    def __init__(self, config_path: str = "config/kinect_zones.json"):
        \"\"\"Initialize Kinect integration\"\"\"
        with open(config_path, 'r') as f:
            self.config = json.load(f)
        
        self.calibration = self.config['calibration']
        
        # Kinect state
        self.kinect_available = False
        self.kinect_device = None
        self.running = False
        
        # Frame processing
        self.current_frame = None
        self.frame_count = 0
        self.last_frame_time = time.time()
        
        # Threading
        self.capture_thread = None
        self.process_thread = None
        
        # Callbacks
        self.frame_callback: Optional[Callable] = None
        self.zone_callback: Optional[Callable] = None
        
        # Performance tracking
        self.fps_counter = 0
        self.fps_last_time = time.time()
        self.current_fps = 0.0
        
        # Initialize Kinect
        self._initialize_kinect()
    
    def _initialize_kinect(self):
        \"\"\"Initialize Kinect v2 device with graceful fallback\"\"\"
        try:
            # Try to import and initialize Kinect
            from pylibfreenect2 import Freenect2, SyncMultiFrameListener
            from pylibfreenect2 import FrameType, Registration, Frame
            
            self.freenect2 = Freenect2()
            num_devices = self.freenect2.enumerateDevices()
            
            if num_devices == 0:
                print("No Kinect device found - falling back to simulation")
                self._setup_simulation()
                return
            
            # Get device serial
            serial = self.freenect2.getDeviceSerialNumber(0)
            self.kinect_device = self.freenect2.openDevice(serial)
            
            # Set up frame listener
            self.listener = SyncMultiFrameListener(
                FrameType.Color | FrameType.Depth
            )
            
            # Register listener
            self.kinect_device.setColorFrameListener(self.listener)
            self.kinect_device.setIrAndDepthFrameListener(self.listener)
            
            # Start device
            self.kinect_device.start()
            
            # Set up registration for depth-color alignment
            self.registration = Registration(
                self.kinect_device.getIrCameraParams(),
                self.kinect_device.getColorCameraParams()
            )
            
            self.kinect_available = True
            print(f"Kinect v2 initialized successfully (Serial: {serial})")
            
        except ImportError:
            print("pylibfreenect2 not available. Using simulated Kinect data.")
            self._setup_simulation()
        except Exception as e:
            print(f"Kinect initialization failed: {e}")
            self._setup_simulation()
    
    def _setup_simulation(self):
        \"\"\"Set up simulated Kinect data for testing\"\"\"
        self.kinect_available = False
        print("Using simulated Kinect data for testing")
    
    def _generate_simulated_depth(self) -> np.ndarray:
        \"\"\"Generate simulated depth data for testing\"\"\"
        # Create base depth field
        depth = np.full((424, 512), 3000, dtype=np.uint16)  # 3m background
        
        # Add some moving "users"
        t = time.time()
        
        # User 1: Moving blob in close zone
        x1 = int(256 + 100 * np.sin(t * 0.5))
        y1 = int(212 + 50 * np.cos(t * 0.3))
        self._add_user_blob(depth, x1, y1, 800, 60)  # 0.8m depth, 60px radius
        
        # User 2: Moving blob in medium zone
        x2 = int(400 + 80 * np.sin(t * 0.7))
        y2 = int(300 + 40 * np.cos(t * 0.4))
        self._add_user_blob(depth, x2, y2, 2000, 40)  # 2m depth, 40px radius
        
        # User 3: Occasional blob in far zone
        if np.sin(t * 0.2) > 0.5:
            x3 = int(150 + 60 * np.sin(t * 0.9))
            y3 = int(100 + 30 * np.cos(t * 0.6))
            self._add_user_blob(depth, x3, y3, 3500, 30)  # 3.5m depth, 30px radius
        
        return depth
    
    def _add_user_blob(self, depth: np.ndarray, x: int, y: int, depth_value: int, radius: int):
        \"\"\"Add a user blob to simulated depth data\"\"\"
        h, w = depth.shape
        
        for dy in range(-radius, radius + 1):
            for dx in range(-radius, radius + 1):
                px, py = x + dx, y + dy
                
                if 0 <= px < w and 0 <= py < h:
                    distance = np.sqrt(dx*dx + dy*dy)
                    if distance <= radius:
                        # Gaussian falloff
                        intensity = np.exp(-(distance / radius) ** 2)
                        depth[py, px] = int(depth_value * intensity + depth[py, px] * (1 - intensity))
    
    def get_kinect_status(self) -> Dict:
        \"\"\"Get Kinect status information\"\"\"
        return {
            'available': self.kinect_available,
            'running': self.running,
            'fps': round(self.current_fps, 1),
            'frame_count': self.frame_count,
            'last_frame_time': self.last_frame_time if self.current_frame else None
        }
    
    def calibrate_kinect(self, background_frames: int = 30) -> Dict:
        \"\"\"Calibrate Kinect by capturing background\"\"\"
        if not self.running:
            return {'error': 'Kinect not running'}
        
        print(f"Calibrating Kinect with {background_frames} background frames...")
        
        # Collect background frames
        background_depths = []
        start_frame = self.frame_count
        
        while len(background_depths) < background_frames:
            if self.current_frame and self.current_frame.frame_id > start_frame:
                background_depths.append(self.current_frame.depth_data.copy())
                start_frame = self.current_frame.frame_id
            time.sleep(0.1)
        
        # Calculate background average
        background_avg = np.mean(background_depths, axis=0)
        
        # Update calibration
        self.calibration['background_depth'] = background_avg.tolist()
        
        # Save calibration
        self.config['calibration'] = self.calibration
        with open('config/kinect_zones.json', 'w') as f:
            json.dump(self.config, f, indent=2)
        
        print("Kinect calibration completed")
        
        return {
            'success': True,
            'background_frames': len(background_depths),
            'average_depth': float(np.mean(background_avg))
        }

# TouchDesigner Integration
class TouchDesignerKinectSetup:
    \"\"\"TouchDesigner-specific Kinect setup\"\"\"
    
    @staticmethod
    def create_kinect_input_network():
        \"\"\"Create Kinect input network in TouchDesigner\"\"\"
        return '''
        # Create Kinect2TOP
        kinect_top = td.root.create(td.topType, 'kinect_input')
        kinect_top.par.optype = 'kinect2'
        kinect_top.par.device = 0
        kinect_top.par.depthrange.val = [500, 4000]  # 0.5m to 4m
        kinect_top.par.resolution = '512x424'
        
        # Create depth processing
        depth_proc = td.root.create(td.topType, 'depth_processor')
        depth_proc.par.optype = 'level'
        depth_proc.par.brightness = 0.0
        depth_proc.par.contrast = 2.0
        depth_proc.par.gamma = 1.0
        
        # Create zone mapper
        zone_mapper = td.root.create(td.topType, 'zone_mapper')
        zone_mapper.par.optype = 'glsl'
        
        # Connect network
        depth_proc.inputConnectors[0].connect(kinect_top)
        zone_mapper.inputConnectors[0].connect(depth_proc)
        '''
    
    @staticmethod
    def get_fallback_setup():
        \"\"\"Create fallback setup when Kinect not available\"\"\"
        return '''
        # Create noise-based simulation
        noise_sim = td.root.create(td.topType, 'kinect_simulation')
        noise_sim.par.optype = 'noise'
        noise_sim.par.type = 'sparse'
        noise_sim.par.period = 2.0
        noise_sim.par.amplitude = 1.0
        
        # Create level adjustment to simulate depth
        depth_sim = td.root.create(td.topType, 'depth_simulation')
        depth_sim.par.optype = 'level'
        depth_sim.par.brightness = 0.5
        depth_sim.par.contrast = 0.8
        
        # Connect simulation
        depth_sim.inputConnectors[0].connect(noise_sim)
        '''
"""

# Configuration template for Kinect zones
KINECT_CONFIG_TEMPLATE = {
    "calibration": {
        "depth_offset": 0,
        "tilt_angle": 0,
        "background_depth": None
    },
    "zones": {
        "close": {
            "depth_range": [500, 1500],
            "interaction_strength": 1.0
        },
        "medium": {
            "depth_range": [1500, 2500], 
            "interaction_strength": 0.7
        },
        "far": {
            "depth_range": [2500, 4000],
            "interaction_strength": 0.4
        }
    },
    "tracking": {
        "min_area": 1000,
        "max_area": 50000,
        "smoothing": 0.8
    }
}