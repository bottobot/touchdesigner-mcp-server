"""
Performance Monitoring Template
Extracted from FogScreenParticleCloud working patterns
Provides adaptive performance control with quality scaling
"""

PERFORMANCE_MONITORING_TEMPLATE = """
import time
import threading
from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass
import json

@dataclass
class PerformanceMetrics:
    \"\"\"Performance metrics data structure\"\"\"
    fps: float
    cpu_usage: float
    gpu_usage: float
    memory_usage: float
    temperature: float
    frame_time: float
    cook_time: float

class PerformanceMonitor:
    def __init__(self, target_fps: float = 60.0):
        \"\"\"Initialize performance monitor\"\"\"
        self.target_fps = target_fps
        self.monitoring = False
        
        # Performance tracking
        self.frame_times = []
        self.cook_times = []
        self.fps_history = []
        self.max_history = 300  # 5 seconds at 60fps
        
        # Current metrics
        self.current_metrics = PerformanceMetrics(
            fps=0.0,
            cpu_usage=0.0,
            gpu_usage=0.0,
            memory_usage=0.0,
            temperature=0.0,
            frame_time=0.0,
            cook_time=0.0
        )
        
        # Quality settings
        self.current_quality_level = 1.0  # 0.0 to 1.5
        self.auto_quality_adjust = True
        
        # Performance thresholds
        self.fps_thresholds = {
            'reduce_quality': 45,
            'increase_quality': 58,
            'emergency_reduction': 30
        }
        
        # Quality scaling factors
        self.quality_settings = {
            'low': {
                'particle_count': 500,
                'fog_brightness_boost': 1.2,
                'fog_contrast_enhancement': 1.0,
                'fog_saturation_multiplier': 1.0,
                'glow_radius': 1.0,
                'render_quality': 0.7
            },
            'medium': {
                'particle_count': 1000,
                'fog_brightness_boost': 1.5,
                'fog_contrast_enhancement': 1.2,
                'fog_saturation_multiplier': 1.1,
                'glow_radius': 2.0,
                'render_quality': 1.0
            },
            'high': {
                'particle_count': 2000,
                'fog_brightness_boost': 1.8,
                'fog_contrast_enhancement': 1.5,
                'fog_saturation_multiplier': 1.3,
                'glow_radius': 3.0,
                'render_quality': 1.3
            }
        }
        
        # Threading
        self.monitor_thread = None
        self.metrics_callback: Optional[Callable] = None
        
        # Last update times
        self.last_frame_time = time.time()
        self.last_quality_adjustment = time.time()
        self.quality_adjustment_cooldown = 2.0  # seconds
    
    def start_monitoring(self):
        \"\"\"Start performance monitoring\"\"\"
        if self.monitoring:
            return
        
        self.monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        print("Performance monitoring started")
    
    def stop_monitoring(self):
        \"\"\"Stop performance monitoring\"\"\"
        self.monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=2.0)
        print("Performance monitoring stopped")
    
    def frame_rendered(self):
        \"\"\"Called when a frame is rendered\"\"\"
        current_time = time.time()
        frame_time = current_time - self.last_frame_time
        
        # Update frame time history
        self.frame_times.append(frame_time)
        if len(self.frame_times) > self.max_history:
            self.frame_times.pop(0)
        
        # Calculate current FPS
        if len(self.frame_times) > 1:
            avg_frame_time = sum(self.frame_times[-60:]) / min(60, len(self.frame_times))
            self.current_metrics.fps = 1.0 / avg_frame_time if avg_frame_time > 0 else 0
        
        self.current_metrics.frame_time = frame_time
        self.last_frame_time = current_time
        
        # Update FPS history
        self.fps_history.append(self.current_metrics.fps)
        if len(self.fps_history) > self.max_history:
            self.fps_history.pop(0)
        
        # Auto-adjust quality if enabled
        if self.auto_quality_adjust:
            self._adjust_quality_if_needed()
    
    def cook_completed(self, cook_time: float):
        \"\"\"Called when a cook cycle completes\"\"\"
        self.cook_times.append(cook_time)
        if len(self.cook_times) > self.max_history:
            self.cook_times.pop(0)
        
        if self.cook_times:
            self.current_metrics.cook_time = sum(self.cook_times[-30:]) / min(30, len(self.cook_times))
    
    def _monitor_loop(self):
        \"\"\"Main monitoring loop\"\"\"
        try:
            import psutil
            import GPUtil
            have_system_monitoring = True
        except ImportError:
            print("Warning: psutil and/or GPUtil not available, system monitoring disabled")
            have_system_monitoring = False
        
        while self.monitoring:
            try:
                if have_system_monitoring:
                    # CPU usage
                    self.current_metrics.cpu_usage = psutil.cpu_percent(interval=0.1)
                    
                    # Memory usage
                    memory = psutil.virtual_memory()
                    self.current_metrics.memory_usage = memory.percent
                    
                    # GPU usage (if available)
                    try:
                        gpus = GPUtil.getGPUs()
                        if gpus:
                            gpu = gpus[0]
                            self.current_metrics.gpu_usage = gpu.load * 100
                            self.current_metrics.temperature = gpu.temperature
                    except Exception:
                        pass
                
                # Call metrics callback if set
                if self.metrics_callback:
                    try:
                        self.metrics_callback(self.current_metrics)
                    except Exception as e:
                        print(f"Metrics callback error: {e}")
                
                time.sleep(0.5)  # Update every 500ms
                
            except Exception as e:
                print(f"Performance monitoring error: {e}")
                time.sleep(1.0)
    
    def _adjust_quality_if_needed(self):
        \"\"\"Adjust quality based on performance\"\"\"
        current_time = time.time()
        
        # Check cooldown
        if current_time - self.last_quality_adjustment < self.quality_adjustment_cooldown:
            return
        
        # Get recent FPS average
        if len(self.fps_history) < 30:
            return
        
        recent_fps = sum(self.fps_history[-30:]) / 30
        
        # Determine if adjustment is needed
        adjustment_needed = False
        new_quality_level = self.current_quality_level
        
        if recent_fps < self.fps_thresholds['emergency_reduction']:
            # Emergency reduction
            new_quality_level = max(0.3, self.current_quality_level - 0.3)
            adjustment_needed = True
            print(f"Emergency quality reduction: FPS {recent_fps:.1f} -> Quality {new_quality_level:.1f}")
            
        elif recent_fps < self.fps_thresholds['reduce_quality']:
            # Normal reduction
            new_quality_level = max(0.5, self.current_quality_level - 0.1)
            adjustment_needed = True
            print(f"Quality reduction: FPS {recent_fps:.1f} -> Quality {new_quality_level:.1f}")
            
        elif recent_fps > self.fps_thresholds['increase_quality'] and self.current_quality_level < 1.5:
            # Increase quality
            new_quality_level = min(1.5, self.current_quality_level + 0.1)
            adjustment_needed = True
            print(f"Quality increase: FPS {recent_fps:.1f} -> Quality {new_quality_level:.1f}")
        
        if adjustment_needed:
            self.current_quality_level = new_quality_level
            self.last_quality_adjustment = current_time
    
    def get_current_quality_settings(self) -> Dict[str, Any]:
        \"\"\"Get current quality settings based on performance\"\"\"
        # Interpolate between quality levels
        if self.current_quality_level <= 0.5:
            # Low quality
            base_settings = self.quality_settings['low']
            factor = self.current_quality_level * 2  # 0.0 to 1.0
        elif self.current_quality_level <= 1.0:
            # Medium quality
            base_settings = self.quality_settings['medium']
            factor = (self.current_quality_level - 0.5) * 2  # 0.0 to 1.0
        else:
            # High quality
            base_settings = self.quality_settings['high']
            factor = min(1.0, (self.current_quality_level - 1.0) * 2)  # 0.0 to 1.0
        
        # Apply scaling
        settings = {}
        for key, value in base_settings.items():
            if isinstance(value, (int, float)):
                settings[key] = value * (0.5 + factor * 0.5)  # Scale between 50% and 100%
            else:
                settings[key] = value
        
        return settings
    
    def get_performance_report(self) -> Dict[str, Any]:
        \"\"\"Get comprehensive performance report\"\"\"
        recent_fps = sum(self.fps_history[-60:]) / min(60, len(self.fps_history)) if self.fps_history else 0
        
        return {
            'current_fps': self.current_metrics.fps,
            'target_fps': self.target_fps,
            'average_fps_1s': recent_fps,
            'frame_time_ms': self.current_metrics.frame_time * 1000,
            'cook_time_ms': self.current_metrics.cook_time * 1000,
            'cpu_usage': self.current_metrics.cpu_usage,
            'gpu_usage': self.current_metrics.gpu_usage,
            'memory_usage': self.current_metrics.memory_usage,
            'temperature': self.current_metrics.temperature,
            'quality_level': self.current_quality_level,
            'auto_adjust': self.auto_quality_adjust,
            'frame_count': len(self.frame_times)
        }
    
    def set_metrics_callback(self, callback: Callable):
        \"\"\"Set callback for metrics updates\"\"\"
        self.metrics_callback = callback
    
    def force_quality_level(self, level: float):
        \"\"\"Force specific quality level (disables auto-adjust)\"\"\"
        self.current_quality_level = max(0.3, min(1.5, level))
        self.auto_quality_adjust = False
        print(f"Quality level forced to: {self.current_quality_level}")
    
    def enable_auto_quality(self):
        \"\"\"Re-enable automatic quality adjustment\"\"\"
        self.auto_quality_adjust = True
        print("Automatic quality adjustment enabled")

# TouchDesigner Integration
class TouchDesignerPerformanceIntegration:
    \"\"\"TouchDesigner-specific performance integration\"\"\"
    
    @staticmethod
    def create_performance_monitor_script():
        \"\"\"Create TouchDesigner performance monitoring script\"\"\"
        return '''
# Performance monitoring script for TouchDesigner
import sys
sys.path.append(r'${project_root}/scripts')

from performance_monitor import PerformanceMonitor

# Initialize performance monitor
monitor = PerformanceMonitor(target_fps=60.0)
monitor.start_monitoring()

def onFrameEnd(frame):
    # Update performance metrics
    monitor.frame_rendered()
    
    # Get quality settings
    quality_settings = monitor.get_current_quality_settings()
    
    # Apply quality settings to particle system
    particle_op = op('particle_system')
    if particle_op:
        particle_op.par.count = quality_settings['particle_count']
    
    # Apply fog settings to composite
    fog_op = op('fog_composite')
    if fog_op:
        fog_op.par.uBrightnessBoost = quality_settings['fog_brightness_boost']
        fog_op.par.uContrastEnhancement = quality_settings['fog_contrast_enhancement']
        fog_op.par.uSaturationMultiplier = quality_settings['fog_saturation_multiplier']
        fog_op.par.uGlowRadius = quality_settings['glow_radius']

def onDestroy():
    monitor.stop_monitoring()
'''
    
    @staticmethod
    def get_performance_setup_nodes():
        \"\"\"Get TouchDesigner nodes for performance monitoring\"\"\"
        return '''
        # Create performance monitor script
        perf_monitor = td.root.create(td.datType, 'performance_monitor')
        perf_monitor.par.optype = 'script'
        perf_monitor.par.text = performance_script_content
        
        # Create info DAT for metrics display
        info_dat = td.root.create(td.datType, 'performance_info')
        info_dat.par.optype = 'info'
        
        # Create performance display
        perf_display = td.root.create(td.topType, 'performance_display')
        perf_display.par.optype = 'text'
        perf_display.par.text = "FPS: ${fps}\\nQuality: ${quality}"
        '''
"""

# Configuration template for performance settings
PERFORMANCE_CONFIG_TEMPLATE = {
    "target_fps": 60,
    "auto_quality_adjust": True,
    "fps_thresholds": {
        "reduce_particles_below": 45,
        "increase_particles_above": 58,
        "emergency_reduction_below": 30
    },
    "quality_levels": {
        "low": {
            "particle_count_multiplier": 0.5,
            "render_quality_multiplier": 0.7,
            "effect_intensity_multiplier": 0.8
        },
        "medium": {
            "particle_count_multiplier": 1.0,
            "render_quality_multiplier": 1.0,
            "effect_intensity_multiplier": 1.0
        },
        "high": {
            "particle_count_multiplier": 1.5,
            "render_quality_multiplier": 1.3,
            "effect_intensity_multiplier": 1.2
        }
    },
    "thermal_management": {
        "cpu_threshold": 80,
        "gpu_threshold": 85,
        "emergency_threshold": 90
    }
}