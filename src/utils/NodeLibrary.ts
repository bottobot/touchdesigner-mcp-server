import { nanoid } from 'nanoid';

export interface NodeSpec {
  type: string;
  category: 'TOP' | 'CHOP' | 'SOP' | 'MAT' | 'DAT' | 'COMP';
  name: string;
  parameters?: Record<string, any>;
  inputs?: string[];
  outputs?: string[];
  description?: string;
}

export interface GeneratedNode {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  parameters: Record<string, any>;
}

export interface NodeGenerationSpec {
  nodes: Array<{
    type: string;
    count?: number;
    parameters?: Record<string, any>;
    pattern?: string;
  }>;
  connections: Array<{
    from: string;
    to: string;
    fromOutput?: number;
    toInput?: number;
  }>;
  layout?: 'grid' | 'flow' | 'radial' | 'tree';
}

export class NodeLibrary {
  private nodeTypes: Map<string, NodeSpec> = new Map();
  private categories = ['TOP', 'CHOP', 'SOP', 'MAT', 'DAT', 'COMP'];
  
  constructor() {
    this.loadBuiltinNodes();
  }

  async loadBuiltinNodes(): Promise<void> {
    this.loadTOPs();
    this.loadCHOPs();
    this.loadSOPs();
    this.loadMATs();
    this.loadDATs();
    this.loadCOMPs();
  }

  private loadTOPs(): void {
    // Complete TOP list
    const tops = [
      // Generators
      { type: 'constantTOP', name: 'Constant' },
      { type: 'noiseTOP', name: 'Noise' },
      { type: 'rampTOP', name: 'Ramp' },
      { type: 'circleTOP', name: 'Circle' },
      { type: 'rectangleTOP', name: 'Rectangle' },
      { type: 'shapeTOP', name: 'Shape' },
      { type: 'textTOP', name: 'Text' },
      { type: 'canvasTOP', name: 'Canvas' },
      { type: 'fontTOP', name: 'Font' },
      // Input
      { type: 'moviefileinTOP', name: 'Movie File In' },
      { type: 'videodevinTOP', name: 'Video Device In' },
      { type: 'webcamTOP', name: 'Webcam' },
      { type: 'kinect2TOP', name: 'Kinect 2' },
      { type: 'kinectazureTOP', name: 'Kinect Azure' },
      { type: 'ndiTOP', name: 'NDI In' },
      { type: 'videoStreamInTOP', name: 'Video Stream In' },
      { type: 'screenGrabTOP', name: 'Screen Grab' },
      { type: 'touchInTOP', name: 'Touch In' },
      // Filters
      { type: 'blurTOP', name: 'Blur' },
      { type: 'levelTOP', name: 'Level' },
      { type: 'transformTOP', name: 'Transform' },
      { type: 'chromakeyTOP', name: 'Chroma Key' },
      { type: 'hsvAdjustTOP', name: 'HSV Adjust' },
      { type: 'thresholdTOP', name: 'Threshold' },
      { type: 'edgeTOP', name: 'Edge' },
      { type: 'displaceTOP', name: 'Displace' },
      { type: 'twirlTOP', name: 'Twirl' },
      { type: 'flipTOP', name: 'Flip' },
      { type: 'cropTOP', name: 'Crop' },
      { type: 'scaleTOP', name: 'Scale' },
      { type: 'tileTOP', name: 'Tile' },
      { type: 'monochromeTOP', name: 'Monochrome' },
      { type: 'reorderTOP', name: 'Reorder' },
      { type: 'shuffleTOP', name: 'Shuffle' },
      { type: 'limitTOP', name: 'Limit' },
      { type: 'rgbdelayTOP', name: 'RGB Delay' },
      { type: 'opticalflowTOP', name: 'Optical Flow' },
      { type: 'lumablurTOP', name: 'Luma Blur' },
      { type: 'ssaoTOP', name: 'SSAO' },
      { type: 'slopeTOP', name: 'Slope' },
      // Compositing
      { type: 'compositeTOP', name: 'Composite' },
      { type: 'overTOP', name: 'Over' },
      { type: 'multiplyTOP', name: 'Multiply' },
      { type: 'addTOP', name: 'Add' },
      { type: 'differenceTOP', name: 'Difference' },
      { type: 'switchTOP', name: 'Switch' },
      { type: 'crossTOP', name: 'Cross' },
      { type: 'mathTOP', name: 'Math' },
      { type: 'layoutTOP', name: 'Layout' },
      { type: 'insideTOP', name: 'Inside' },
      // Conversion
      { type: 'choptoTOP', name: 'CHOP to' },
      { type: 'topToCHOP', name: 'TOP to CHOP' },
      { type: 'dattoTOP', name: 'DAT to' },
      { type: 'soptoTOP', name: 'SOP to' },
      { type: 'toptoSOP', name: 'TOP to SOP' },
      // Special
      { type: 'renderTOP', name: 'Render' },
      { type: 'glslTOP', name: 'GLSL' },
      { type: 'feedbackTOP', name: 'Feedback' },
      { type: 'nullTOP', name: 'Null' },
      { type: 'selectTOP', name: 'Select' },
      { type: 'cacheTOP', name: 'Cache' },
      { type: 'lookupTOP', name: 'Lookup' },
      { type: 'cubeMapTOP', name: 'Cube Map' },
      { type: 'depthTOP', name: 'Depth' },
      { type: 'hsvtoRGBTOP', name: 'HSV to RGB' },
      { type: 'rgbtoHSVTOP', name: 'RGB to HSV' },
      { type: 'packTOP', name: 'Pack' },
      { type: 'resolutionTOP', name: 'Resolution' },
      { type: 'gpupartsTOP', name: 'GPU Parts' },
      { type: 'trailTOP', name: 'Trail' },
      { type: 'inTOP', name: 'In' },
      { type: 'outTOP', name: 'Out' },
      // Output
      { type: 'moviefileoutTOP', name: 'Movie File Out' },
      { type: 'recordTOP', name: 'Record' },
      { type: 'videodevoutTOP', name: 'Video Device Out' },
      { type: 'videoStreamOutTOP', name: 'Video Stream Out' },
      { type: 'touchOutTOP', name: 'Touch Out' }
    ];

    tops.forEach(spec => {
      this.registerNode({ ...spec, category: 'TOP', outputs: ['out1'] });
    });
  }

  private loadCHOPs(): void {
    // Complete CHOP list
    const chops = [
      // Audio
      { type: 'audiofileinCHOP', name: 'Audio File In' },
      { type: 'audiospectrumCHOP', name: 'Audio Spectrum' },
      { type: 'audiodeviceoutCHOP', name: 'Audio Device Out' },
      { type: 'audiodeviceinCHOP', name: 'Audio Device In' },
      { type: 'audiobandeqCHOP', name: 'Audio Band EQ' },
      { type: 'audiodynamicsCHOP', name: 'Audio Dynamics' },
      { type: 'audiofilterCHOP', name: 'Audio Filter' },
      { type: 'audiooscillateCHOP', name: 'Audio Oscillate' },
      { type: 'audioparaeqCHOP', name: 'Audio Para EQ' },
      { type: 'audioplayCHOP', name: 'Audio Play' },
      { type: 'audiomovieoutCHOP', name: 'Audio Movie Out' },
      { type: 'beatCHOP', name: 'Beat' },
      // Generators
      { type: 'noiseCHOP', name: 'Noise' },
      { type: 'constantCHOP', name: 'Constant' },
      { type: 'patternCHOP', name: 'Pattern' },
      { type: 'lfoCHOP', name: 'LFO' },
      { type: 'waveCHOP', name: 'Wave' },
      { type: 'timerCHOP', name: 'Timer' },
      { type: 'pulseCHOP', name: 'Pulse' },
      { type: 'clockCHOP', name: 'Clock' },
      // Input
      { type: 'oscinCHOP', name: 'OSC In' },
      { type: 'midiinCHOP', name: 'MIDI In' },
      { type: 'keyboardinCHOP', name: 'Keyboard In' },
      { type: 'mouseCHOP', name: 'Mouse' },
      { type: 'mouseinCHOP', name: 'Mouse In' },
      { type: 'kinect2CHOP', name: 'Kinect 2' },
      { type: 'kinectazureCHOP', name: 'Kinect Azure' },
      { type: 'serialinCHOP', name: 'Serial In' },
      { type: 'udpinCHOP', name: 'UDP In' },
      { type: 'dmxinCHOP', name: 'DMX In' },
      { type: 'leapCHOP', name: 'Leap' },
      { type: 'pipeCHOP', name: 'Pipe' },
      { type: 'webcaminCHOP', name: 'Webcam In' },
      { type: 'touchInCHOP', name: 'Touch In' },
      // Math
      { type: 'mathCHOP', name: 'Math' },
      { type: 'addCHOP', name: 'Add' },
      { type: 'limitCHOP', name: 'Limit' },
      { type: 'analyzeCHOP', name: 'Analyze' },
      { type: 'expressionCHOP', name: 'Expression' },
      { type: 'functionCHOP', name: 'Function' },
      { type: 'logicCHOP', name: 'Logic' },
      { type: 'countCHOP', name: 'Count' },
      // Time
      { type: 'lagCHOP', name: 'Lag' },
      { type: 'filterCHOP', name: 'Filter' },
      { type: 'triggerCHOP', name: 'Trigger' },
      { type: 'speedCHOP', name: 'Speed' },
      { type: 'delayCHOP', name: 'Delay' },
      { type: 'springCHOP', name: 'Spring' },
      { type: 'eventCHOP', name: 'Event' },
      { type: 'recordCHOP', name: 'Record' },
      { type: 'trailCHOP', name: 'Trail' },
      // Filter
      { type: 'resampleCHOP', name: 'Resample' },
      { type: 'stretchCHOP', name: 'Stretch' },
      { type: 'shiftCHOP', name: 'Shift' },
      { type: 'trimCHOP', name: 'Trim' },
      { type: 'extendCHOP', name: 'Extend' },
      { type: 'interpolateCHOP', name: 'Interpolate' },
      { type: 'envelopeCHOP', name: 'Envelope' },
      // Utility
      { type: 'nullCHOP', name: 'Null' },
      { type: 'selectCHOP', name: 'Select' },
      { type: 'mergeCHOP', name: 'Merge' },
      { type: 'switchCHOP', name: 'Switch' },
      { type: 'joinCHOP', name: 'Join' },
      { type: 'shuffleCHOP', name: 'Shuffle' },
      { type: 'renameCHOP', name: 'Rename' },
      { type: 'replaceCHOP', name: 'Replace' },
      { type: 'deleteCHOP', name: 'Delete' },
      { type: 'sortCHOP', name: 'Sort' },
      { type: 'feedbackCHOP', name: 'Feedback' },
      { type: 'cplusCHOP', name: 'CPlusPlus' },
      { type: 'inCHOP', name: 'In' },
      { type: 'outCHOP', name: 'Out' },
      // Output
      { type: 'oscoutCHOP', name: 'OSC Out' },
      { type: 'midioutCHOP', name: 'MIDI Out' },
      { type: 'serialoutCHOP', name: 'Serial Out' },
      { type: 'udpoutCHOP', name: 'UDP Out' },
      { type: 'dmxoutCHOP', name: 'DMX Out' },
      { type: 'touchOutCHOP', name: 'Touch Out' }
    ];

    chops.forEach(spec => {
      this.registerNode({ ...spec, category: 'CHOP', outputs: ['out1'] });
    });
  }

  private loadSOPs(): void {
    // Complete SOP list
    const sops = [
      // Primitives
      { type: 'boxSOP', name: 'Box' },
      { type: 'sphereSOP', name: 'Sphere' },
      { type: 'torusSOP', name: 'Torus' },
      { type: 'gridSOP', name: 'Grid' },
      { type: 'circleSOP', name: 'Circle' },
      { type: 'lineSOP', name: 'Line' },
      { type: 'rectangleSOP', name: 'Rectangle' },
      { type: 'tubeSOP', name: 'Tube' },
      { type: 'coneSOP', name: 'Cone' },
      { type: 'cylinderSOP', name: 'Cylinder' },
      { type: 'metaballSOP', name: 'Metaball' },
      { type: 'platoncSOP', name: 'Platonic Solids' },
      { type: 'supershapeSOP', name: 'Super Shape' },
      { type: 'spiralSOP', name: 'Spiral' },
      { type: 'textSOP', name: 'Text' },
      // Transform
      { type: 'transformSOP', name: 'Transform' },
      { type: 'noiseSOP', name: 'Noise' },
      { type: 'twistSOP', name: 'Twist' },
      { type: 'bendSOP', name: 'Bend' },
      { type: 'bulkSOP', name: 'Bulk' },
      { type: 'cacheSOP', name: 'Cache' },
      { type: 'capSOP', name: 'Cap' },
      { type: 'carvcSOP', name: 'Carve' },
      { type: 'clipSOP', name: 'Clip' },
      { type: 'deformSOP', name: 'Deform' },
      { type: 'deleteSOP', name: 'Delete' },
      { type: 'divideSOP', name: 'Divide' },
      { type: 'holeSOP', name: 'Hole' },
      { type: 'latticeSOP', name: 'Lattice' },
      { type: 'limitSOP', name: 'Limit' },
      { type: 'lockSOP', name: 'Lock' },
      { type: 'mirrorSOP', name: 'Mirror' },
      { type: 'mountainSOP', name: 'Mountain' },
      { type: 'peakSOP', name: 'Peak' },
      { type: 'polyloftSOP', name: 'PolyLoft' },
      { type: 'profileSOP', name: 'Profile' },
      { type: 'projectSOP', name: 'Project' },
      { type: 'railsSOP', name: 'Rails' },
      { type: 'raySOP', name: 'Ray' },
      { type: 'refineSOP', name: 'Refine' },
      { type: 'relaxSOP', name: 'Relax' },
      { type: 'resampleSOP', name: 'Resample' },
      { type: 'revolveSOP', name: 'Revolve' },
      { type: 'sequenceBlendSOP', name: 'Sequence Blend' },
      { type: 'skinSOP', name: 'Skin' },
      { type: 'sortSOP', name: 'Sort' },
      { type: 'spriteSOP', name: 'Sprite' },
      { type: 'stitchSOP', name: 'Stitch' },
      { type: 'subdivideSOP', name: 'Subdivide' },
      { type: 'surfsectSOP', name: 'Surfsect' },
      { type: 'sweepSOP', name: 'Sweep' },
      { type: 'textureSOP', name: 'Texture' },
      { type: 'thickenSOP', name: 'Thicken' },
      { type: 'trimSOP', name: 'Trim' },
      { type: 'tristriperSOP', name: 'TriStriper' },
      { type: 'uvunwrapSOP', name: 'UV Unwrap' },
      { type: 'vertexSOP', name: 'Vertex' },
      { type: 'wrangleSOP', name: 'Wrangle' },
      // Mesh
      { type: 'extrudeSOP', name: 'Extrude' },
      { type: 'subdivSOP', name: 'Subdivide' },
      { type: 'facetSOP', name: 'Facet' },
      { type: 'convertSOP', name: 'Convert' },
      { type: 'polyknitSOP', name: 'PolyKnit' },
      { type: 'polypatchSOP', name: 'PolyPatch' },
      { type: 'polyreduceSOP', name: 'PolyReduce' },
      { type: 'polysplitSOP', name: 'PolySplit' },
      { type: 'polystitchSOP', name: 'PolyStitch' },
      { type: 'primitiveSOP', name: 'Primitive' },
      { type: 'solidifySOP', name: 'Solidify' },
      // Merge
      { type: 'mergeSOP', name: 'Merge' },
      { type: 'joinSOP', name: 'Join' },
      { type: 'booleanSOP', name: 'Boolean' },
      { type: 'addSOP', name: 'Add' },
      { type: 'blendSOP', name: 'Blend' },
      { type: 'bridgeSOP', name: 'Bridge' },
      { type: 'fuseSOP', name: 'Fuse' },
      // Particles
      { type: 'particlesGPUSOP', name: 'Particles GPU' },
      { type: 'particleSOP', name: 'Particle' },
      { type: 'sprinkleSOP', name: 'Sprinkle' },
      { type: 'copySOP', name: 'Copy' },
      { type: 'copyStampSOP', name: 'Copy Stamp' },
      // Analysis
      { type: 'analyzeSOP', name: 'Analyze' },
      { type: 'attributeCreateSOP', name: 'Attribute Create' },
      { type: 'attributeCopySOP', name: 'Attribute Copy' },
      { type: 'attributePromateSOP', name: 'Attribute Promote' },
      { type: 'attributeSOP', name: 'Attribute' },
      { type: 'groupSOP', name: 'Group' },
      { type: 'measureSOP', name: 'Measure' },
      { type: 'pointSOP', name: 'Point' },
      { type: 'traceSOPSOP', name: 'Trace' },
      // Conversion
      { type: 'choptoSOP', name: 'CHOP to' },
      { type: 'dattoSOP', name: 'DAT to' },
      { type: 'toptoSOP', name: 'TOP to' },
      { type: 'soptoDAT', name: 'SOP to DAT' },
      { type: 'soptoTOP', name: 'SOP to TOP' },
      // Animation
      { type: 'armatureCOMP2', name: 'Armature COMP 2' },
      { type: 'boneSOP', name: 'Bone' },
      { type: 'boneGroupSOP', name: 'Bone Group' },
      { type: 'deformSOP', name: 'Deform' },
      { type: 'kinectSOP', name: 'Kinect' },
      { type: 'kinect2SOP', name: 'Kinect 2' },
      { type: 'kinectazureSOP', name: 'Kinect Azure' },
      // Utility
      { type: 'nullSOP', name: 'Null' },
      { type: 'selectSOP', name: 'Select' },
      { type: 'switchSOP', name: 'Switch' },
      { type: 'feedbackSOP', name: 'Feedback' },
      { type: 'scriptSOP', name: 'Script' },
      { type: 'soptoSOP', name: 'SOP to SOP' },
      { type: 'cacheSOP', name: 'Cache' },
      { type: 'cplusSOP', name: 'CPlusPlus' },
      { type: 'inSOP', name: 'In' },
      { type: 'outSOP', name: 'Out' }
    ];

    sops.forEach(spec => {
      this.registerNode({ ...spec, category: 'SOP', outputs: ['out1'] });
    });
  }

  private loadMATs(): void {
    // Complete MAT list
    const mats = [
      // Standard Materials
      { type: 'constantMAT', name: 'Constant' },
      { type: 'phongMAT', name: 'Phong' },
      { type: 'pbrMAT', name: 'PBR' },
      { type: 'wireframeMAT', name: 'Wireframe' },
      { type: 'pointspriteMAT', name: 'Point Sprite' },
      { type: 'lineMat', name: 'Line' },
      // Shader Materials
      { type: 'glslMAT', name: 'GLSL' },
      { type: 'glsl_multiMAT', name: 'GLSL Multi' },
      { type: 'shaderBuilderMAT', name: 'Shader Builder' },
      // Special Purpose
      { type: 'depthMAT', name: 'Depth' },
      { type: 'displacementMAT', name: 'Displacement' },
      { type: 'environmentLightMAT', name: 'Environment Light' },
      { type: 'geoTextMAT', name: 'Geo Text' },
      { type: 'normalMAT', name: 'Normal' },
      { type: 'particlesGPUMAT', name: 'Particles GPU' },
      { type: 'projectionMAT', name: 'Projection' },
      { type: 'renderPassMAT', name: 'Render Pass' },
      { type: 'shadowMAT', name: 'Shadow' },
      { type: 'skyboxMAT', name: 'Skybox' },
      { type: 'ssaoMAT', name: 'SSAO' },
      { type: 'subsurfaceScatteringMAT', name: 'Subsurface Scattering' },
      { type: 'toonMAT', name: 'Toon' },
      // Utility
      { type: 'nullMAT', name: 'Null' },
      { type: 'selectMAT', name: 'Select' },
      { type: 'switchMAT', name: 'Switch' },
      { type: 'cacheMAT', name: 'Cache' },
      { type: 'inMAT', name: 'In' },
      { type: 'outMAT', name: 'Out' }
    ];

    mats.forEach(spec => {
      this.registerNode({ ...spec, category: 'MAT', outputs: ['out1'] });
    });
  }

  private loadDATs(): void {
    // Complete DAT list
    const dats = [
      // Text
      { type: 'textDAT', name: 'Text' },
      { type: 'tableDAT', name: 'Table' },
      { type: 'mergeDAT', name: 'Merge' },
      { type: 'selectDAT', name: 'Select' },
      { type: 'substrDAT', name: 'Substr' },
      { type: 'substituteDAT', name: 'Substitute' },
      { type: 'evalDAT', name: 'Evaluate' },
      { type: 'examineDAT', name: 'Examine' },
      { type: 'insertDAT', name: 'Insert' },
      { type: 'convertDAT', name: 'Convert' },
      { type: 'limitDAT', name: 'Limit' },
      { type: 'modifyDAT', name: 'Modify' },
      { type: 'renameDAT', name: 'Rename' },
      { type: 'reorderDAT', name: 'Reorder' },
      { type: 'replaceDAT', name: 'Replace' },
      { type: 'searchreplaceDAT', name: 'Search Replace' },
      { type: 'sortDAT', name: 'Sort' },
      { type: 'transposeDAT', name: 'Transpose' },
      // Script
      { type: 'scriptDAT', name: 'Script' },
      { type: 'executDAT', name: 'Execute' },
      { type: 'chopexecuteDAT', name: 'CHOP Execute' },
      { type: 'datexecuteDAT', name: 'DAT Execute' },
      { type: 'opexecuteDAT', name: 'OP Execute' },
      { type: 'parexecuteDAT', name: 'Par Execute' },
      { type: 'errorDAT', name: 'Error' },
      { type: 'infoDAT', name: 'Info' },
      { type: 'commandDAT', name: 'Command' },
      // Network
      { type: 'tcpipDAT', name: 'TCP/IP' },
      { type: 'udpinDAT', name: 'UDP In' },
      { type: 'udpoutDAT', name: 'UDP Out' },
      { type: 'webDAT', name: 'Web' },
      { type: 'webserverDAT', name: 'Web Server' },
      { type: 'webClientDAT', name: 'Web Client' },
      { type: 'webSocketDAT', name: 'Web Socket' },
      { type: 'emailDAT', name: 'Email' },
      { type: 'mqttclientDAT', name: 'MQTT Client' },
      { type: 'touchinDAT', name: 'Touch In' },
      { type: 'touchoutDAT', name: 'Touch Out' },
      // Data
      { type: 'oscinDAT', name: 'OSC In' },
      { type: 'oscoutDAT', name: 'OSC Out' },
      { type: 'serialDAT', name: 'Serial' },
      { type: 'jsonDAT', name: 'JSON' },
      { type: 'xmlDAT', name: 'XML' },
      { type: 'csvDAT', name: 'CSV' },
      { type: 'artnetDAT', name: 'Art-Net' },
      { type: 'dmxinDAT', name: 'DMX In' },
      { type: 'dmxoutDAT', name: 'DMX Out' },
      { type: 'midiinDAT', name: 'MIDI In Map' },
      { type: 'midioutDAT', name: 'MIDI Out Map' },
      { type: 'sysexDAT', name: 'Sysex' },
      // File
      { type: 'folderDAT', name: 'Folder' },
      { type: 'fileInDAT', name: 'File In' },
      { type: 'fileOutDAT', name: 'File Out' },
      { type: 'fifoDAT', name: 'FIFO' },
      { type: 'keyboardinDAT', name: 'Keyboard In' },
      // Conversion
      { type: 'choptoDAT', name: 'CHOP to' },
      { type: 'soptoDAT', name: 'SOP to' },
      { type: 'toptoDAT', name: 'TOP to' },
      { type: 'datToCHOP', name: 'DAT to CHOP' },
      { type: 'datToSOP', name: 'DAT to SOP' },
      // Utility
      { type: 'nullDAT', name: 'Null' },
      { type: 'switchDAT', name: 'Switch' },
      { type: 'inDAT', name: 'In' },
      { type: 'outDAT', name: 'Out' },
      { type: 'cacheDAT', name: 'Cache' },
      { type: 'countDAT', name: 'Count' },
      { type: 'clockDAT', name: 'Clock' },
      { type: 'eventDAT', name: 'Event' },
      { type: 'fpsDAT', name: 'FPS' },
      { type: 'monitorDAT', name: 'Monitor' },
      { type: 'performDAT', name: 'Perform' },
      { type: 'recordDAT', name: 'Record' },
      { type: 'replicatorDAT', name: 'Replicator' },
      { type: 'trailDAT', name: 'Trail' },
      { type: 'oscmonitorDAT', name: 'OSC Monitor' },
      { type: 'cplusdisDAT', name: 'CPlusPlus' }
    ];

    dats.forEach(spec => {
      this.registerNode({ ...spec, category: 'DAT', outputs: ['out1'] });
    });
  }

  private loadCOMPs(): void {
    // Complete COMP list
    const comps = [
      // Container
      { type: 'containerCOMP', name: 'Container' },
      { type: 'baseCOMP', name: 'Base' },
      { type: 'geometryCOMP', name: 'Geometry' },
      { type: 'animationCOMP', name: 'Animation' },
      // Camera/Light
      { type: 'cameraCOMP', name: 'Camera' },
      { type: 'lightCOMP', name: 'Light' },
      { type: 'ambientLightCOMP', name: 'Ambient Light' },
      { type: 'environmentLightCOMP', name: 'Environment Light' },
      // UI Components
      { type: 'buttonCOMP', name: 'Button' },
      { type: 'sliderCOMP', name: 'Slider' },
      { type: 'fieldCOMP', name: 'Field' },
      { type: 'listCOMP', name: 'List' },
      { type: 'parameterCOMP', name: 'Parameter' },
      { type: 'widgetCOMP', name: 'Widget' },
      { type: 'tableCOMP', name: 'Table' },
      { type: 'textCOMP', name: 'Text' },
      { type: 'keyframeCOMP', name: 'Keyframe' },
      // Panel/Window
      { type: 'windowCOMP', name: 'Window' },
      { type: 'panelCOMP', name: 'Panel' },
      { type: 'operatorviewerCOMP', name: 'OP Viewer' },
      // Advanced Components
      { type: 'selectCOMP', name: 'Select' },
      { type: 'replicatorCOMP', name: 'Replicator' },
      { type: 'timeCOMP', name: 'Time' },
      { type: 'clockCOMP', name: 'Clock' },
      { type: 'componentCOMP', name: 'Component' },
      { type: 'engineCOMP', name: 'Engine' },
      { type: 'actorCOMP', name: 'Actor' },
      { type: 'rigidBodyCOMP', name: 'Rigid Body' },
      { type: 'constraintCOMP', name: 'Constraint' },
      { type: 'fieldCOMP', name: 'Field' },
      { type: 'forceCOMP', name: 'Force' },
      { type: 'objectMergeCOMP', name: 'Object Merge' },
      { type: 'bulletSolverCOMP', name: 'Bullet Solver' },
      { type: 'nvflexEmitterCOMP', name: 'NVIDIA FleX Emitter' },
      { type: 'nvflexSolverCOMP', name: 'NVIDIA FleX Solver' },
      { type: 'nvflexForceCOMP', name: 'NVIDIA FleX Force' },
      // Audio
      { type: 'audioCOMP', name: 'Audio' },
      { type: 'audioAnalysisCOMP', name: 'Audio Analysis' },
      // Kinect
      { type: 'kinectCOMP', name: 'Kinect' },
      { type: 'kinect2COMP', name: 'Kinect 2' },
      { type: 'kinectazureCOMP', name: 'Kinect Azure' },
      // Leap Motion
      { type: 'leapCOMP', name: 'Leap' },
      // Oculus
      { type: 'oculusRiftCOMP', name: 'Oculus Rift' },
      // Other Hardware
      { type: 'cameraBlobTrackCOMP', name: 'Camera Blob Track' },
      { type: 'cameraCalibrateCOMP', name: 'Camera Calibrate' },
      { type: 'cameraPoseCOMP', name: 'Camera Pose' },
      { type: 'videostreamCOMP', name: 'Video Stream' },
      // OpenGL
      { type: 'gltextureCOMP', name: 'GL Texture' },
      { type: 'glslCOMP', name: 'GLSL' },
      // Spline
      { type: 'splineCOMP', name: 'Spline' },
      // Utility
      { type: 'nullCOMP', name: 'Null' },
      { type: 'inCOMP', name: 'In' },
      { type: 'outCOMP', name: 'Out' },
      { type: 'feedbackCOMP', name: 'Feedback' },
      { type: 'cacheCOMP', name: 'Cache' },
      { type: 'localCOMP', name: 'Local' },
      { type: 'performCOMP', name: 'Perform' },
      { type: 'infoCOMP', name: 'Info' },
      { type: 'errorCOMP', name: 'Error' },
      // Experimental
      { type: 'experimentalCOMP', name: 'Experimental' },
      { type: 'cpluslusCOMP', name: 'CPlusPlus' }
    ];

    comps.forEach(spec => {
      this.registerNode({ ...spec, category: 'COMP', outputs: [] });
    });
  }

  registerNode(spec: NodeSpec): void {
    this.nodeTypes.set(spec.type, spec);
  }

  getNode(type: string): NodeSpec | undefined {
    return this.nodeTypes.get(type);
  }

  getNodesByCategory(category: string): NodeSpec[] {
    return Array.from(this.nodeTypes.values()).filter(node => node.category === category);
  }

  searchNodes(query: string): NodeSpec[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.nodeTypes.values()).filter(node => 
      node.type.toLowerCase().includes(lowerQuery) ||
      node.name.toLowerCase().includes(lowerQuery)
    );
  }

  generateFromSpec(spec: NodeGenerationSpec): { nodes: GeneratedNode[], connections: any[] } {
    const nodes: GeneratedNode[] = [];
    const connections: any[] = [];
    
    let nodeIndex = 0;
    for (const nodeSpec of spec.nodes) {
      const count = nodeSpec.count || 1;
      for (let i = 0; i < count; i++) {
        const node: GeneratedNode = {
          id: nanoid(8),
          type: nodeSpec.type,
          name: `${nodeSpec.type}_${nodeIndex}`,
          x: 0,
          y: 0,
          parameters: { ...nodeSpec.parameters }
        };
        nodes.push(node);
        nodeIndex++;
      }
    }

    // Apply layout
    this.applyLayout(nodes, spec.layout || 'flow');

    // Create connections
    for (const conn of spec.connections) {
      connections.push({
        from: conn.from,
        to: conn.to,
        fromOutput: conn.fromOutput || 0,
        toInput: conn.toInput || 0
      });
    }

    return { nodes, connections };
  }

  private applyLayout(nodes: GeneratedNode[], layout: string): void {
    const spacing = 150;
    
    switch (layout) {
      case 'grid':
        const cols = Math.ceil(Math.sqrt(nodes.length));
        nodes.forEach((node, i) => {
          node.x = (i % cols) * spacing;
          node.y = Math.floor(i / cols) * spacing;
        });
        break;
        
      case 'flow':
        nodes.forEach((node, i) => {
          node.x = i * spacing;
          node.y = 0;
        });
        break;
        
      case 'radial':
        const radius = spacing * Math.max(1, nodes.length / 4);
        nodes.forEach((node, i) => {
          const angle = (i / nodes.length) * Math.PI * 2;
          node.x = Math.cos(angle) * radius;
          node.y = Math.sin(angle) * radius;
        });
        break;
        
      case 'tree':
        // Simple tree layout
        nodes.forEach((node, i) => {
          const level = Math.floor(Math.log2(i + 1));
          const levelIndex = i - (Math.pow(2, level) - 1);
          const levelCount = Math.pow(2, level);
          node.x = (levelIndex - (levelCount - 1) / 2) * spacing;
          node.y = level * spacing;
        });
        break;
    }
  }
}