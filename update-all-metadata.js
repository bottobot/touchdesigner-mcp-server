#!/usr/bin/env node

/**
 * Update all TouchDesigner operator metadata files
 * Based on the scraped data from the documentation
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Complete operator data scraped from TouchDesigner documentation
const operatorData = {
  'CHOP': {
    description: 'Channel Operators - process motion, audio, animation, and control signals',
    operators: [
      'Ableton Link', 'Analyze', 'Angle', 'Attribute', 'Audio Band EQ', 'Audio Binaural',
      'Audio Device In', 'Audio Device Out', 'Audio Dynamics', 'Audio File In', 'Audio File Out',
      'Audio Filter', 'Audio Movie', 'Audio NDI', 'Audio Oscillator', 'Audio Para EQ',
      'Audio Play', 'Audio Render', 'Audio Spectrum', 'Audio Stream In', 'Audio Stream Out',
      'Audio VST', 'Audio Web Render', 'Beat', 'Bind', 'BlackTrax', 'Blend', 'Blob Track',
      'Body Track', 'Bullet Solver', 'Clip Blender', 'Clip', 'Clock', 'Composite', 'Constant',
      'Copy', 'Count', 'CPlusPlus', 'Cross', 'Cycle', 'DAT to', 'Delay', 'Delete', 'DMX In',
      'DMX Out', 'Envelope', 'EtherDream', 'Event', 'Expression', 'Extend', 'Face Track',
      'Fan', 'Feedback', 'File In', 'File Out', 'Filter', 'FreeD In', 'FreeD Out', 'Function',
      'Gesture', 'Handle', 'Helios DAC', 'Hog', 'Hokuyo', 'Hold', 'Import Select', 'In',
      'Info', 'Interpolate', 'Inverse Curve', 'Inverse Kin', 'Join', 'Joystick', 'Keyboard In',
      'Keyframe', 'Kinect Azure', 'Kinect', 'Lag', 'Laser', 'Laser Device', 'Leap Motion',
      'Leuze ROD4', 'LFO', 'Limit', 'Logic', 'Lookup', 'LTC In', 'LTC Out', 'Math', 'Merge',
      'MIDI In', 'MIDI In Map', 'MIDI Out', 'MoSys', 'Mouse In', 'Mouse Out', 'Ncam', 'Noise',
      'Null', 'OAK Device', 'OAK Select', 'Object', 'Oculus Audio', 'Oculus Rift', 'OpenVR',
      'OptiTrack In', 'OSC In', 'OSC Out', 'Out', 'Override', 'Pan Tilt', 'Panel', 'Pangolin',
      'Parameter', 'Pattern', 'Perform', 'Phaser', 'Pipe In', 'Pipe Out', 'POP to', 'PosiStageNet',
      'Pulse', 'RealSense', 'Record', 'Rename', 'Render Pick', 'RenderStream In', 'Reorder',
      'Replace', 'Resample', 'S Curve', 'Scan', 'Script', 'Select', 'Sequencer', 'Serial',
      'Shared Mem In', 'Shared Mem Out', 'Shift', 'Shuffle', 'Slope', 'SOP to', 'Sort', 'Speed',
      'Splice', 'Spring', 'ST2110 Device', 'Stretch', 'Stype In', 'Stype Out', 'Switch', 'Sync In',
      'Sync Out', 'Tablet', 'Time Slice', 'Timecode', 'Timeline', 'Timer', 'TOP to', 'Touch In',
      'Touch Out', 'Trail', 'Transform', 'Transform XYZ', 'Trigger', 'Trim', 'Warp', 'Wave',
      'WrnchAI', 'ZED'
    ]
  },
  'TOP': {
    description: 'Texture Operators - handle all 2D image operations',
    operators: [
      'Add', 'Analyze', 'Anti Alias', 'Blob Track', 'Bloom', 'Blur', 'Cache', 'Cache Select',
      'Canvas', 'Channel Mix', 'CHOP to', 'Chromakey', 'Circle', 'Clarify', 'Color Curves',
      'Color Map', 'Composite', 'Convolve', 'Copy', 'Corner Pin', 'CPlusPlus', 'Crop', 'Cross',
      'Cube Map', 'Cubemap Render', 'DAT to', 'Deform', 'Delay', 'Delete', 'Depth', 'Difference',
      'DirectX In', 'DirectX Out', 'Displace', 'Edge', 'Emboss', 'Face Track', 'Feedback', 'Fit',
      'Flip', 'Function', 'GLSL', 'GLSL Multi', 'Gradient', 'Gray', 'Grid', 'Histogram',
      'HSV Adjust', 'HSV to RGB', 'Hull', 'Import Select', 'In', 'Inside', 'Kinect Azure',
      'Kinect', 'Layout', 'Leap Motion', 'Lens Distort', 'Level', 'Limit', 'Line MAT', 'Lookup',
      'Luma Blur', 'Luma Level', 'Math', 'Mirror', 'Monochrome', 'Motion Blur', 'Movie File In',
      'Movie File Out', 'Multiply', 'NDI In', 'NDI Out', 'Noise', 'Normal Map', 'Notch', 'Null',
      'Oak Devices', 'Oak Select', 'OpenColorIO', 'OpenVR', 'Out', 'Over', 'Pack', 'Photoshop In',
      'Point File In', 'Point File Select', 'Point Transform', 'Polygon', 'Projection', 'Ramp',
      'RealSense', 'Record', 'Rectangle', 'Remap', 'Remove', 'Render', 'Render Pass', 'Render Select',
      'RenderStream Out', 'Reorder', 'Res Change', 'RGB Key', 'RGB to HSV', 'Scalable Display',
      'Screen', 'Screen Grab', 'Select', 'Shared Mem In', 'Shared Mem Out', 'Shuffle', 'Slope',
      'SOP to', 'Spectrum', 'SpoutDirectX In', 'SpoutDirectX Out', 'SSAO', 'Stitch', 'Stream In',
      'Substance Select', 'Subtract', 'SVG', 'Switch', 'Syphon Spout In', 'Syphon Spout Out',
      'Text', 'Texture 3D', 'Texture 3D Slices', 'Texture Sampling Parameters', 'Threshold', 'Tile',
      'Time Machine', 'TOP', 'Touch In', 'Touch Out', 'Transform', 'Under', 'Unreal Spout In',
      'Unreal Spout Out', 'UnrealRenderStream In', 'UnrealRenderStream Out', 'UV Unwrap',
      'Video Device In', 'Video Device Out', 'Video Stream In', 'Video Stream Out', 'Vioso', 'ZED'
    ]
  },
  'SOP': {
    description: 'Surface Operators - work with 3D points, polygons and other 3D primitives',
    operators: [
      'Add', 'Alembic', 'Align', 'Arm', 'Attribute Create', 'Attribute', 'Basis', 'Blend',
      'Bone Group', 'Boolean', 'Box', 'Bridge', 'Cache', 'Cap', 'Capture Region', 'Capture',
      'Carve', 'CHOP to', 'Circle', 'Clay', 'Clip', 'Convert', 'Copy', 'CPlusPlus', 'Creep',
      'Curveclay', 'Curvesect', 'DAT to', 'Deform', 'Delete', 'Divide', 'Extrude', 'Face Track',
      'Facet', 'File In', 'Fillet', 'Fit', 'Font', 'Force', 'Fractal', 'Grid', 'Group', 'Hole',
      'Import Select', 'In', 'Introduction To s Vid', 'Inverse Curve', 'Iso Surface', 'Join',
      'Joint', 'Kinect', 'Lattice', 'Limit', 'Line', 'Line Thick', 'LOD', 'LSystem', 'Magnet',
      'Material', 'Merge', 'Metaball', 'Model', 'Noise', 'Null', 'Object Merge', 'Oculus Rift',
      'OpenVR', 'Out', 'Particle', 'Point', 'Polyloft', 'Polypatch', 'Polyreduce', 'Polyspline',
      'Polystitch', 'POP to', 'Primitive', 'Profile', 'Project', 'Rails', 'Raster', 'Ray',
      'Rectangle', 'Refine', 'Resample', 'Revolve', 'Script', 'Select', 'Sequence Blend', 'Skin',
      'Sort', 'Sphere', 'Spring', 'Sprinkle', 'Sprite', 'Stitch', 'Subdivide', 'Superquad',
      'Surfsect', 'Sweep', 'Switch', 'Text', 'Texture', 'Torus', 'Trace', 'Trail', 'Transform',
      'Trim', 'Tristrip', 'Tube', 'Twist', 'Vertex', 'Wireframe', 'ZED'
    ]
  },
  'DAT': {
    description: 'Data Operators - handle ASCII text, scripts, XML, and tables',
    operators: [
      'Art-Net', 'Audio Devices', 'CHOP Execute', 'CHOP to', 'Clip', 'Convert', 'CPlusPlus',
      'DAT', 'DAT Execute', 'DAT Export', 'Error', 'EtherDream', 'Evaluate', 'Examine', 'Execute',
      'FIFO', 'File In', 'File Out', 'Folder', 'In', 'Indices', 'Info', 'Insert', 'JSON',
      'Keyboard In', 'Lookup', 'Media File Info', 'Merge', 'MIDI Event', 'MIDI In', 'Monitors',
      'MPCDI', 'MQTT Client', 'Multi Touch In', 'NDI', 'Null', 'OP Execute', 'OP Find', 'OSC In',
      'OSC Out', 'Out', 'Panel Execute', 'Parameter', 'Parameter Execute', 'ParGroup Execute',
      'Perform', 'POP to', 'Render Pick', 'Reorder', 'Script', 'Select', 'Serial', 'Serial Devices',
      'SocketIO', 'SOP to', 'Sort', 'Substitute', 'Switch', 'Table', 'TCP/IP', 'Text', 'Touch In',
      'Touch Out', 'Transpose', 'TUIO In', 'UDP In', 'UDP Out', 'UDT In', 'UDT Out',
      'Video Devices', 'Web Client', 'Web', 'Web Server', 'WebRTC', 'WebSocket', 'XML'
    ]
  },
  'MAT': {
    description: 'Material Operators - define materials and shaders',
    operators: [
      'Constant', 'Depth', 'GLSL', 'In', 'Line', 'Null', 'Out', 'PBR', 'Phong',
      'Point Sprite', 'Select', 'Switch', 'Wireframe'
    ]
  },
  'COMP': {
    description: 'Components - contain networks of operators, including 3D objects and 2D panels',
    operators: [
      'Actor', 'Ambient Light', 'Animation', 'Annotate', 'Base', 'Blend', 'Bone',
      'Bullet Solver', 'Button', 'Camera Blend', 'Camera', 'Component', 'Constraint',
      'Container', 'Engine', 'Environment Light', 'FBX', 'Field', 'Force', 'Geo Text',
      'Geometry', 'GLSL', 'Handle', 'Impulse Force', 'Light', 'List', 'Null',
      'Nvidia Flex Solver', 'Nvidia Flow Emitter', 'OP Viewer', 'Parameter', 'Replicator',
      'Select', 'Shared Mem In', 'Shared Mem Out', 'Slider', 'Table', 'Text', 'Time',
      'USD', 'Widget', 'Window'
    ]
  }
};

/**
 * Create operator metadata object
 */
function createOperatorMetadata(name, category) {
  const cleanName = name.replace('Experimental:', '').trim();
  const isExperimental = name.includes('Experimental:');
  const urlName = cleanName.replace(/ /g, '_');
  
  return {
    name: cleanName,
    displayName: `${cleanName} ${category}`,
    opType: cleanName.toLowerCase().replace(/ /g, ''),
    summary: `The ${cleanName} ${category} operator provides functionality for...`,
    description: `Detailed description of the ${cleanName} ${category} operator. This would be scraped from the actual documentation page.`,
    isExperimental: isExperimental,
    wiki_url: `https://docs.derivative.ca/${urlName}`,
    thumb: `/images/operators/${cleanName.toLowerCase().replace(/ /g, '_')}_thumb.jpg`,
    parameters: [],
    inputs: [],
    outputs: [],
    related: [],
    examples: []
  };
}

/**
 * Main function to update all metadata files
 */
async function main() {
  console.log('TouchDesigner Metadata Update Script');
  console.log('====================================\n');
  
  // Ensure metadata directory exists
  const metadataDir = path.join(__dirname, 'metadata');
  await fs.mkdir(metadataDir, { recursive: true });
  
  // Process each category
  for (const [category, data] of Object.entries(operatorData)) {
    console.log(`\n📁 Processing ${category} category...`);
    console.log(`   Description: ${data.description}`);
    console.log(`   Operators: ${data.operators.length}`);
    
    // Create metadata structure
    const metadata = {
      category: category,
      description: data.description,
      operatorCount: data.operators.length,
      lastUpdated: new Date().toISOString(),
      sourceUrl: `https://docs.derivative.ca/${category}`,
      operators: data.operators.map(op => createOperatorMetadata(op, category))
    };
    
    // Save metadata file
    const filename = `comprehensive_${category.toLowerCase()}_metadata.json`;
    const filepath = path.join(metadataDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(metadata, null, 2));
    console.log(`   ✅ Saved ${filename}`);
  }
  
  // Create summary report
  const summary = {
    timestamp: new Date().toISOString(),
    totalCategories: Object.keys(operatorData).length,
    totalOperators: Object.values(operatorData).reduce((sum, cat) => sum + cat.operators.length, 0),
    categories: {}
  };
  
  for (const [category, data] of Object.entries(operatorData)) {
    summary.categories[category] = {
      operatorCount: data.operators.length,
      description: data.description
    };
  }
  
  await fs.writeFile(
    path.join(metadataDir, 'metadata_summary.json'),
    JSON.stringify(summary, null, 2)
  );
  
  console.log('\n📊 Summary:');
  console.log('─'.repeat(40));
  console.log(`Total categories: ${summary.totalCategories}`);
  console.log(`Total operators: ${summary.totalOperators}`);
  console.log('\nBreakdown by category:');
  for (const [category, info] of Object.entries(summary.categories)) {
    console.log(`  ${category}: ${info.operatorCount} operators`);
  }
  
  console.log('\n✨ Metadata update completed successfully!');
}

// Run the script
main().catch(console.error);