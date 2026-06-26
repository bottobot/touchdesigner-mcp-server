/**
 * Buildable network templates for td_build_template.
 *
 * These mirror the templates documented by tools/get_network_template.js. That
 * module keeps its TEMPLATES table private (only {schema,handler} are exported),
 * so this file holds an equivalent, machine-buildable copy that the live
 * compiler (td_build_template) consumes. Each template provides:
 *   operators:    [{ id, type }]                       — type = human op name
 *   connections:  [{ from, fromPort, to, toPort }]     — id -> id port wiring
 *   parameters:   [{ op, param, value }]               — param = human label
 *
 * `type` and `param` are HUMAN labels; the compiler resolves them to a
 * createType / parName via the operator map (resolveOpType / resolveParName)
 * and hard-errors if a mapping is missing.
 *
 * @module tools/td-live/templates
 */

export const BUILD_TEMPLATES = {
  "video-player": {
    name: "Video Player",
    description:
      "Plays a video file with basic colour correction and output.",
    operators: [
      { id: "movieIn", type: "Movie File In TOP" },
      { id: "level1", type: "Level TOP" },
      { id: "transform1", type: "Transform TOP" },
      { id: "null1", type: "Null TOP" },
      { id: "out1", type: "Out TOP" }
    ],
    connections: [
      { from: "movieIn", fromPort: 0, to: "level1", toPort: 0 },
      { from: "level1", fromPort: 0, to: "transform1", toPort: 0 },
      { from: "transform1", fromPort: 0, to: "null1", toPort: 0 },
      { from: "null1", fromPort: 0, to: "out1", toPort: 0 }
    ],
    parameters: [
      { op: "movieIn", param: "File", value: "'your_video.mp4'" },
      { op: "movieIn", param: "Play", value: "1" },
      { op: "movieIn", param: "Loop", value: "1" },
      { op: "level1", param: "Brightness", value: "1.0" },
      { op: "level1", param: "Contrast", value: "1.0" },
      { op: "transform1", param: "Scale X", value: "1" },
      { op: "transform1", param: "Scale Y", value: "1" }
    ]
  },

  "generative-art": {
    name: "Generative Art (Feedback Loop)",
    description:
      "Feedback-zoom generative art: Noise TOP seed, Feedback TOP loop, post FX.",
    operators: [
      { id: "noise1", type: "Noise TOP" },
      { id: "feedback1", type: "Feedback TOP" },
      { id: "transform1", type: "Transform TOP" },
      { id: "level1", type: "Level TOP" },
      { id: "blur1", type: "Blur TOP" },
      { id: "target1", type: "Null TOP" },
      { id: "composite1", type: "Composite TOP" },
      { id: "out1", type: "Out TOP" }
    ],
    connections: [
      { from: "noise1", fromPort: 0, to: "feedback1", toPort: 0 },
      { from: "feedback1", fromPort: 0, to: "transform1", toPort: 0 },
      { from: "transform1", fromPort: 0, to: "level1", toPort: 0 },
      { from: "level1", fromPort: 0, to: "blur1", toPort: 0 },
      { from: "blur1", fromPort: 0, to: "target1", toPort: 0 },
      { from: "target1", fromPort: 0, to: "composite1", toPort: 0 },
      { from: "noise1", fromPort: 0, to: "composite1", toPort: 1 },
      { from: "composite1", fromPort: 0, to: "out1", toPort: 0 }
    ],
    parameters: [
      // Target TOP must point at the downstream Null (target1) to close the loop.
      { op: "feedback1", param: "Target TOP", value: "target1" },
      { op: "transform1", param: "Scale X", value: "1.01" },
      { op: "transform1", param: "Scale Y", value: "1.01" },
      { op: "transform1", param: "Rotate", value: "0.1" },
      { op: "level1", param: "Brightness", value: "0.97" },
      { op: "blur1", param: "Filter Width", value: "1" },
      { op: "composite1", param: "Operand", value: "Add" }
    ]
  },

  "audio-reactive": {
    name: "Audio Reactive Visuals",
    description:
      "Audio analysis (FFT) driving texture brightness and geometry deformation.",
    operators: [
      { id: "audioIn", type: "Audio Device In CHOP" },
      { id: "spectrum1", type: "Audio Spectrum CHOP" },
      { id: "math1", type: "Math CHOP" },
      { id: "lag1", type: "Lag CHOP" },
      { id: "null1", type: "Null CHOP" },
      { id: "noise1", type: "Noise TOP" },
      { id: "level1", type: "Level TOP" },
      { id: "grid1", type: "Grid SOP" },
      { id: "noiseSop1", type: "Noise SOP" },
      { id: "geo1", type: "Geometry COMP" },
      { id: "render1", type: "Render TOP" },
      { id: "composite1", type: "Composite TOP" },
      { id: "out1", type: "Out TOP" }
    ],
    connections: [
      { from: "audioIn", fromPort: 0, to: "spectrum1", toPort: 0 },
      { from: "spectrum1", fromPort: 0, to: "math1", toPort: 0 },
      { from: "math1", fromPort: 0, to: "lag1", toPort: 0 },
      { from: "lag1", fromPort: 0, to: "null1", toPort: 0 },
      { from: "noise1", fromPort: 0, to: "level1", toPort: 0 },
      { from: "grid1", fromPort: 0, to: "noiseSop1", toPort: 0 },
      { from: "noiseSop1", fromPort: 0, to: "geo1", toPort: 0 },
      { from: "render1", fromPort: 0, to: "composite1", toPort: 0 },
      { from: "level1", fromPort: 0, to: "composite1", toPort: 1 },
      { from: "composite1", fromPort: 0, to: "out1", toPort: 0 }
    ],
    parameters: [
      { op: "audioIn", param: "Active", value: "1" },
      { op: "spectrum1", param: "Window Size", value: "1024" },
      { op: "math1", param: "To Range Max", value: "1" },
      { op: "lag1", param: "Lag +", value: "0.15" },
      { op: "lag1", param: "Lag -", value: "0.3" }
    ]
  },

  "data-visualization": {
    name: "Data Visualization",
    description:
      "Table DAT -> Python processing -> CHOP -> colour-mapped texture + labels.",
    operators: [
      { id: "table1", type: "Table DAT" },
      { id: "script1", type: "Script DAT" },
      { id: "datToChop1", type: "DAT to CHOP" },
      { id: "math1", type: "Math CHOP" },
      { id: "null1", type: "Null CHOP" },
      { id: "chopToTop1", type: "CHOP to TOP" },
      { id: "ramp1", type: "Ramp TOP" },
      { id: "lookup1", type: "Lookup TOP" },
      { id: "text1", type: "Text TOP" },
      { id: "composite1", type: "Composite TOP" },
      { id: "out1", type: "Out TOP" }
    ],
    connections: [
      { from: "table1", fromPort: 0, to: "script1", toPort: 0 },
      { from: "script1", fromPort: 0, to: "datToChop1", toPort: 0 },
      { from: "datToChop1", fromPort: 0, to: "math1", toPort: 0 },
      { from: "math1", fromPort: 0, to: "null1", toPort: 0 },
      { from: "null1", fromPort: 0, to: "chopToTop1", toPort: 0 },
      { from: "chopToTop1", fromPort: 0, to: "lookup1", toPort: 0 },
      { from: "ramp1", fromPort: 0, to: "lookup1", toPort: 1 },
      { from: "lookup1", fromPort: 0, to: "composite1", toPort: 0 },
      { from: "text1", fromPort: 0, to: "composite1", toPort: 1 },
      { from: "composite1", fromPort: 0, to: "out1", toPort: 0 }
    ],
    parameters: [
      { op: "math1", param: "To Range Min", value: "0" },
      { op: "math1", param: "To Range Max", value: "1" }
    ]
  },

  "live-performance": {
    name: "Live Performance Rig",
    description:
      "Scene switching + crossfade + audio/MIDI reactivity + multi-output.",
    operators: [
      { id: "midiIn", type: "MIDI In CHOP" },
      { id: "audioIn", type: "Audio Device In CHOP" },
      { id: "spectrum1", type: "Audio Spectrum CHOP" },
      { id: "null1", type: "Null CHOP" },
      { id: "scene1", type: "Container COMP" },
      { id: "scene2", type: "Container COMP" },
      { id: "scene3", type: "Container COMP" },
      { id: "switch1", type: "Switch TOP" },
      { id: "crossfade1", type: "Cross TOP" },
      { id: "level1", type: "Level TOP" },
      { id: "lfo1", type: "LFO CHOP" },
      { id: "beat1", type: "Beat CHOP" },
      { id: "geo1", type: "Geometry COMP" },
      { id: "cam1", type: "Camera COMP" },
      { id: "render1", type: "Render TOP" },
      { id: "videoOut", type: "Video Device Out TOP" },
      { id: "null_out", type: "Null TOP" }
    ],
    connections: [
      { from: "audioIn", fromPort: 0, to: "spectrum1", toPort: 0 },
      { from: "audioIn", fromPort: 0, to: "beat1", toPort: 0 },
      { from: "spectrum1", fromPort: 0, to: "null1", toPort: 0 },
      { from: "scene1", fromPort: 0, to: "switch1", toPort: 0 },
      { from: "scene2", fromPort: 0, to: "switch1", toPort: 1 },
      { from: "scene3", fromPort: 0, to: "switch1", toPort: 2 },
      { from: "switch1", fromPort: 0, to: "crossfade1", toPort: 0 },
      { from: "switch1", fromPort: 0, to: "crossfade1", toPort: 1 },
      { from: "crossfade1", fromPort: 0, to: "level1", toPort: 0 },
      { from: "level1", fromPort: 0, to: "null_out", toPort: 0 },
      { from: "null_out", fromPort: 0, to: "videoOut", toPort: 0 },
      { from: "render1", fromPort: 0, to: "scene2", toPort: 0 }
    ],
    parameters: [
      { op: "midiIn", param: "Active", value: "1" },
      { op: "audioIn", param: "Active", value: "1" },
      { op: "switch1", param: "Index", value: "0" },
      // LFO rate synced to detected BPM — applied as an expression.
      { op: "lfo1", param: "Rate", value: "op('beat1')['bpm'] / 60" },
      { op: "level1", param: "Brightness", value: "1" },
      { op: "videoOut", param: "Active", value: "1" }
    ]
  }
};

export default BUILD_TEMPLATES;
