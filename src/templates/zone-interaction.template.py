"""
Zone Interaction Template
Extracted from FogScreenParticleCloud working patterns
Provides zone-based interaction processing
"""

ZONE_INTERACTION_TEMPLATE = """
import numpy as np
import json
import time
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

@dataclass
class Zone:
    \"\"\"Zone definition\"\"\"
    id: str
    depth_range: Tuple[float, float]
    bounds: Tuple[int, int, int, int]  # x1, y1, x2, y2
    interaction_strength: float
    active: bool = False
    user_count: int = 0
    activity_level: float = 0.0
    center: Tuple[float, float] = (0.0, 0.0)

@dataclass
class ZoneResult:
    \"\"\"Zone processing result\"\"\"
    zones: List[Zone]
    particle_params: Dict[str, float]
    interaction_data: Dict[str, any]
    total_activity: float

class ZoneCalculator:
    def __init__(self, config_path: str):
        \"\"\"Initialize zone calculator\"\"\"
        with open(config_path, 'r') as f:
            self.config = json.load(f)
        
        # Initialize zones from config
        self.zones = []
        for zone_id, zone_config in self.config['zones'].items():
            zone = Zone(
                id=zone_id,
                depth_range=tuple(zone_config['depth_range']),
                bounds=tuple(zone_config.get('bounds', [0, 0, 512, 424])),
                interaction_strength=zone_config['interaction_strength']
            )
            self.zones.append(zone)
        
        # Processing parameters
        self.smoothing_factor = self.config.get('smoothing', 0.8)
        self.min_blob_size = self.config.get('min_blob_size', 100)
        self.max_blob_size = self.config.get('max_blob_size', 10000)
        
        # History for smoothing
        self.zone_history = {zone.id: [] for zone in self.zones}
        self.history_length = 10
        
        # Background subtraction
        self.background_depth = None
        self.background_threshold = 200  # mm
        
    def set_background(self, depth_data: np.ndarray):
        \"\"\"Set background depth for subtraction\"\"\"
        self.background_depth = depth_data.copy().astype(np.float32)
        print("Background depth set for zone calculation")
    
    def process_depth_frame(self, depth_data: np.ndarray) -> ZoneResult:
        \"\"\"Process depth frame and calculate zone interactions\"\"\"
        # Preprocess depth data
        processed_depth = self._preprocess_depth(depth_data)
        
        # Update each zone
        for zone in self.zones:
            self._update_zone(zone, processed_depth)
        
        # Calculate interaction parameters
        particle_params = self._calculate_particle_parameters()
        interaction_data = self._calculate_interaction_data()
        total_activity = sum(zone.activity_level for zone in self.zones)
        
        return ZoneResult(
            zones=self.zones.copy(),
            particle_params=particle_params,
            interaction_data=interaction_data,
            total_activity=total_activity
        )
    
    def _preprocess_depth(self, depth_data: np.ndarray) -> np.ndarray:
        \"\"\"Preprocess depth data for zone analysis\"\"\"
        processed = depth_data.astype(np.float32)
        
        # Background subtraction if available
        if self.background_depth is not None:
            diff = np.abs(processed - self.background_depth)
            processed = np.where(diff > self.background_threshold, processed, 0)
        
        # Noise filtering
        from scipy import ndimage
        processed = ndimage.gaussian_filter(processed, sigma=1.0)
        
        return processed
    
    def _update_zone(self, zone: Zone, depth_data: np.ndarray):
        \"\"\"Update zone state based on depth data\"\"\"
        # Extract zone region
        x1, y1, x2, y2 = zone.bounds
        zone_depth = depth_data[y1:y2, x1:x2]
        
        # Find pixels in depth range
        min_depth, max_depth = zone.depth_range
        in_range = (zone_depth >= min_depth) & (zone_depth <= max_depth) & (zone_depth > 0)
        
        # Calculate zone metrics
        pixel_count = np.sum(in_range)
        zone.active = pixel_count > self.min_blob_size
        
        if zone.active:
            # Calculate center of mass
            y_coords, x_coords = np.where(in_range)
            if len(x_coords) > 0:
                zone.center = (
                    np.mean(x_coords) + x1,
                    np.mean(y_coords) + y1
                )
            
            # Calculate activity level (0.0 to 1.0)
            activity = min(1.0, pixel_count / self.max_blob_size)
            
            # Smooth activity over time
            zone_id = zone.id
            if zone_id in self.zone_history:
                self.zone_history[zone_id].append(activity)
                if len(self.zone_history[zone_id]) > self.history_length:
                    self.zone_history[zone_id].pop(0)
                
                # Apply smoothing
                history = self.zone_history[zone_id]
                if len(history) > 1:
                    smoothed = history[-1] * (1 - self.smoothing_factor) + \
                              np.mean(history[:-1]) * self.smoothing_factor
                    zone.activity_level = smoothed
                else:
                    zone.activity_level = activity
            else:
                zone.activity_level = activity
                
            # Estimate user count (simple blob detection)
            zone.user_count = self._estimate_user_count(in_range)
        else:
            zone.activity_level = 0.0
            zone.user_count = 0
            zone.center = (0.0, 0.0)
    
    def _estimate_user_count(self, binary_mask: np.ndarray) -> int:
        \"\"\"Estimate number of users in zone\"\"\"
        from scipy import ndimage
        
        # Label connected components
        labeled, num_features = ndimage.label(binary_mask)
        
        # Filter by size
        user_count = 0
        for i in range(1, num_features + 1):
            component_size = np.sum(labeled == i)
            if self.min_blob_size <= component_size <= self.max_blob_size:
                user_count += 1
        
        return min(user_count, 5)  # Cap at 5 users per zone
    
    def _calculate_particle_parameters(self) -> Dict[str, float]:
        \"\"\"Calculate particle system parameters based on zone activity\"\"\"
        total_activity = sum(zone.activity_level * zone.interaction_strength for zone in self.zones)
        
        # Base parameters
        base_count = 500
        base_spawn_rate = 50
        base_velocity = 1.0
        base_size = 1.0
        
        # Activity multipliers
        activity_multiplier = 1.0 + total_activity * 2.0  # Up to 3x increase
        
        # Zone-specific modulation
        close_zones = [z for z in self.zones if z.id == 'close' and z.active]
        medium_zones = [z for z in self.zones if z.id == 'medium' and z.active]
        far_zones = [z for z in self.zones if z.id == 'far' and z.active]
        
        close_activity = sum(z.activity_level for z in close_zones)
        medium_activity = sum(z.activity_level for z in medium_zones)
        far_activity = sum(z.activity_level for z in far_zones)
        
        return {
            'particle_count': int(base_count * activity_multiplier),
            'spawn_rate': base_spawn_rate * (1.0 + close_activity * 3.0 + medium_activity * 2.0 + far_activity),
            'velocity_multiplier': base_velocity * (1.0 + close_activity * 2.0 + medium_activity * 1.5),
            'size_multiplier': base_size * (1.0 + close_activity * 1.8 + medium_activity * 1.4),
            'close_interaction': close_activity,
            'medium_interaction': medium_activity,
            'far_interaction': far_activity,
            'total_users': sum(z.user_count for z in self.zones)
        }
    
    def _calculate_interaction_data(self) -> Dict[str, any]:
        \"\"\"Calculate interaction data for other systems\"\"\"
        active_zones = [z for z in self.zones if z.active]
        
        interaction_points = []
        for zone in active_zones:
            if zone.center != (0.0, 0.0):
                interaction_points.append({
                    'zone_id': zone.id,
                    'position': zone.center,
                    'strength': zone.activity_level * zone.interaction_strength,
                    'user_count': zone.user_count
                })
        
        return {
            'active_zones': [z.id for z in active_zones],
            'interaction_points': interaction_points,
            'dominant_zone': max(self.zones, key=lambda z: z.activity_level).id if self.zones else None,
            'interaction_intensity': sum(z.activity_level for z in active_zones),
            'movement_detected': any(z.activity_level > 0.1 for z in self.zones)
        }
    
    def get_zone_status(self) -> Dict[str, any]:
        \"\"\"Get current zone status\"\"\"
        return {
            'zones': {
                zone.id: {
                    'active': zone.active,
                    'activity_level': zone.activity_level,
                    'user_count': zone.user_count,
                    'center': zone.center,
                    'depth_range': zone.depth_range
                }
                for zone in self.zones
            },
            'total_activity': sum(z.activity_level for z in self.zones),
            'active_zone_count': sum(1 for z in self.zones if z.active),
            'total_users': sum(z.user_count for z in self.zones)
        }

# TouchDesigner Integration
class TouchDesignerZoneIntegration:
    \"\"\"TouchDesigner-specific zone integration\"\"\"
    
    @staticmethod
    def create_zone_processing_script():
        \"\"\"Create TouchDesigner zone processing script\"\"\"
        return '''
import sys
sys.path.append(r'${project_root}/scripts')

from zone_calculator import ZoneCalculator
import numpy as np

# Initialize zone calculator
calculator = ZoneCalculator(r'${config_path}/kinect_zones.json')

def onFrameStart(frame):
    # Get depth data from Kinect
    kinect_op = op('kinect_input')
    if kinect_op and kinect_op.numpyArray is not None:
        depth_data = kinect_op.numpyArray[:,:,0]  # Get depth channel
        
        # Process zones
        result = calculator.process_depth_frame(depth_data)
        
        # Update particle parameters
        particle_op = op('particle_system')
        if particle_op:
            params = result.particle_params
            particle_op.par.count = params['particle_count']
            particle_op.par.birthrate = params['spawn_rate']
            particle_op.par.velocitymult = params['velocity_multiplier']
            particle_op.par.sizemult = params['size_multiplier']
        
        # Store zone data for other components
        parent().store('zone_data', result.zones)
        parent().store('interaction_data', result.interaction_data)
        parent().store('total_activity', result.total_activity)

def onValueChange(channel, sampleIndex, val, prev):
    # Handle parameter changes for zone configuration
    if channel.name == 'reset_background':
        if val:
            kinect_op = op('kinect_input')
            if kinect_op and kinect_op.numpyArray is not None:
                depth_data = kinect_op.numpyArray[:,:,0]
                calculator.set_background(depth_data)
'''
    
    @staticmethod
    def create_zone_visualization():
        \"\"\"Create zone visualization in TouchDesigner\"\"\"
        return '''
        # Create zone visualization overlay
        zone_vis = td.root.create(td.topType, 'zone_visualization')
        zone_vis.par.optype = 'rectangle'
        zone_vis.par.bgalpha = 0.3
        zone_vis.par.borderwidth = 2
        
        # Create text overlay for zone info
        zone_text = td.root.create(td.topType, 'zone_info_text')
        zone_text.par.optype = 'text'
        zone_text.par.text = "Zone Activity: ${zone_activity}"
        zone_text.par.fontsize = 24
        
        # Create composite for overlay
        zone_comp = td.root.create(td.topType, 'zone_composite')
        zone_comp.par.optype = 'composite'
        zone_comp.par.operand = 'over'
        '''
"""

# Configuration template for zone settings
ZONE_CONFIG_TEMPLATE = {
    "zones": {
        "close": {
            "depth_range": [500, 1500],
            "bounds": [0, 0, 512, 424],
            "interaction_strength": 1.0,
            "color": [1.0, 0.2, 0.2]
        },
        "medium": {
            "depth_range": [1500, 2500],
            "bounds": [0, 0, 512, 424], 
            "interaction_strength": 0.7,
            "color": [0.2, 1.0, 0.2]
        },
        "far": {
            "depth_range": [2500, 4000],
            "bounds": [0, 0, 512, 424],
            "interaction_strength": 0.4,
            "color": [0.2, 0.2, 1.0]
        }
    },
    "processing": {
        "smoothing": 0.8,
        "min_blob_size": 100,
        "max_blob_size": 10000,
        "background_threshold": 200
    },
    "interaction": {
        "particle_base_count": 500,
        "spawn_rate_base": 50,
        "velocity_base": 1.0,
        "size_base": 1.0
    }
}