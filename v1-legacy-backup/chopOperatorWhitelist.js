export const CHOP_OPERATOR_WHITELIST = [
    'Analyze', 'Angle', 'Attribute', 'Audio Band EQ', 'Audio Binaural', 'Audio Device In', 
    'Audio Device Out', 'Audio Dynamics', 'Audio File In', 'Audio File Out', 'Audio Filter', 
    'Audio Movie', 'Audio NDI', 'Audio Oscillator', 'Audio Para EQ', 'Audio Play', 
    'Audio Render', 'Audio Spectrum', 'Audio Stream In', 'Audio Stream Out', 'Audio VST', 
    'Audio Web Render', 'Beat', 'Bind', 'BlackTrax', 'Blend', 'Blob Track', 'Body Track', 
    'Bullet Solver', 'Clip Blender', 'Clip', 'Clock', 'Composite', 'Constant', 'Copy', 
    'Count', 'CPlusPlus', 'Cross', 'Cycle', 'DAT to', 'Delay', 'Delete', 'DMX In', 'DMX Out', 
    'Envelope', 'EtherDream', 'Event', 'Expression', 'Extend', 'Face Track', 'Fan', 
    'Feedback', 'File In', 'File Out', 'Filter', 'FreeD In', 'FreeD Out', 'Function', 
    'Gesture', 'Handle', 'Helios DAC', 'Hog', 'Hokuyo', 'Hold', 'Import Select', 'In', 
    'Info', 'Interpolate', 'Inverse Curve', 'Inverse Kin', 'Join', 'Joystick', 
    'Keyboard In', 'Keyframe', 'Kinect Azure', 'Kinect', 'Lag', 'Laser', 'Laser Device', 
    'Leap Motion', 'Leuze ROD4', 'LFO', 'Limit', 'Logic', 'Lookup', 'LTC In', 'LTC Out', 
    'Math', 'Merge', 'MIDI In', 'MIDI In Map', 'MIDI Out', 'MoSys', 'Mouse In', 'Mouse Out', 
    'Ncam', 'Noise', 'Null', 'OAK Device', 'OAK Select', 'Object', 'Oculus Audio', 
    'Oculus Rift', 'OpenVR', 'OptiTrack In', 'OSC In', 'OSC Out', 'Out', 'Override', 
    'Panel', 'Pangolin', 'Parameter', 'Pattern', 'Perform', 'Phaser', 'Pipe In', 'Pipe Out', 
    'PosiStageNet', 'Pulse', 'RealSense', 'Record', 'Rename', 'Render Pick', 
    'RenderStream In', 'Reorder', 'Replace', 'Resample', 'S Curve', 'Scan', 'Script', 
    'Select', 'Sequencer', 'Serial', 'Shared Mem In', 'Shared Mem Out', 'Shift', 
    'Shuffle', 'Slope', 'SOP to', 'Sort', 'Speed', 'Splice', 'Spring', 'Stretch', 
    'Stype In', 'Stype Out', 'Switch', 'Sync In', 'Sync Out', 'Tablet', 'Time Slice', 
    'Timecode', 'Timeline', 'Timer', 'TOP to', 'Touch In', 'Touch Out', 'Trail', 
    'Transform', 'Transform XYZ', 'Trigger', 'Trim', 'Warp', 'Wave', 'WrnchAI', 'ZED'
];

export function isTrueCHOPOperator(name) {
    const cleanedName = name.replace(/\bchop\b/gi, '').trim();
    return CHOP_OPERATOR_WHITELIST.some(op => cleanedName.includes(op.toLowerCase()));
}

export function isCHOPFalsePositive(name) {
    return !isTrueCHOPOperator(name);
}