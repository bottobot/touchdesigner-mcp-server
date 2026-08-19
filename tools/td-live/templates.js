/**
 * Buildable network templates for td_build_template.
 *
 * These are MACHINE-BUILDABLE templates: every operator, connection and
 * parameter below is verified to compile against the operator map
 * (wiki/data/maps/operators.json) and to wire against DEFAULT operators —
 * no connections into COMPs that have no connectors, no parameters that do
 * not resolve. (The richer teaching versions of these networks, with Python
 * snippets and 3D render setups, live in tools/get_network_template.js;
 * those are documentation, not build input.)
 *
 * Each template provides:
 *   operators:    [{ id, type }]                        — type = human op name
 *   connections:  [{ from, fromPort, to, toPort }]      — id -> id port wiring
 *   parameters:   [{ op, param?, parName?, value }]
 *   texts:        [{ op, text }]                        — DAT contents (set_text)
 *
 * `type` and `param` are HUMAN labels resolved via the operator map
 * (resolveOpType / resolveParName); the compiler hard-errors on a miss.
 * `parName` (when given) is used VERBATIM — it exists for documented
 * parameter-tuple components the wiki scrape does not list as labels
 * (e.g. Transform TOP 'sx'/'sy', Level TOP 'brightness1', Math CHOP
 * 'torange1'/'torange2', Noise TOP 'tz'). Each such use cites its source.
 * Menu parameter values are written as scripting TOKENS (e.g. 'add'); the
 * compiler also label->token translates via the map as a second line of
 * defense.
 *
 * @module tools/td-live/templates
 */

export const BUILD_TEMPLATES = {
  "video-player": {
    name: "Video Player",
    description:
      "Plays the Movie File In TOP's default sample movie through a colour/transform " +
      "chain. Point 'movieIn'.file at your own movie to change the source.",
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
      // Movie File In plays its bundled sample movie by default — no file path
      // is set here so the template renders real frames out of the box.
      { op: "movieIn", param: "Play", value: "1" }
    ]
  },

  "generative-art": {
    name: "Generative Art (Feedback Loop)",
    description:
      "Feedback-zoom generative art: Noise TOP seed, Feedback TOP loop, post FX. " +
      "Verified live topology (TD 2025.32820).",
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
      // Feedback TOP 'Target TOP' must point at the downstream Null to close
      // the loop. The compiler rewrites 'target1' to the node's real name.
      { op: "feedback1", param: "Target TOP", value: "target1" },
      // Transform TOP scale is the documented 's' tuple -> components sx / sy
      // (Transform TOP page, Transform page parameters).
      { op: "transform1", parName: "sx", value: "1.01" },
      { op: "transform1", parName: "sy", value: "1.01" },
      { op: "transform1", param: "Rotate", value: "0.1" },
      // Level TOP brightness is 'brightness1' (Level TOP page, Pre page).
      { op: "level1", parName: "brightness1", value: "0.97" },
      { op: "blur1", parName: "size", value: "4" },
      // Composite TOP operand — scripting token (menu label 'Add').
      { op: "composite1", param: "Operand", value: "add" }
    ]
  },

  "audio-reactive": {
    name: "Audio Reactive Visuals",
    description:
      "Microphone level (RMS) drives the brightness of an evolving noise field. " +
      "Flat TOP/CHOP network — every wire lands on a real connector.",
    operators: [
      { id: "audioIn", type: "Audio Device In CHOP" },
      { id: "analyze1", type: "Analyze CHOP" },
      { id: "lag1", type: "Lag CHOP" },
      { id: "null1", type: "Null CHOP" },
      { id: "noise1", type: "Noise TOP" },
      { id: "level1", type: "Level TOP" },
      { id: "out1", type: "Out TOP" }
    ],
    connections: [
      { from: "audioIn", fromPort: 0, to: "analyze1", toPort: 0 },
      { from: "analyze1", fromPort: 0, to: "lag1", toPort: 0 },
      { from: "lag1", fromPort: 0, to: "null1", toPort: 0 },
      { from: "noise1", fromPort: 0, to: "level1", toPort: 0 },
      { from: "level1", fromPort: 0, to: "out1", toPort: 0 }
    ],
    parameters: [
      { op: "audioIn", param: "Active", value: "1" },
      // Analyze CHOP function — scripting token (menu label 'RMS Power').
      { op: "analyze1", param: "Function", value: "rmspower" },
      // Animate the noise field over time. 'tz' is the z component of the
      // documented Noise TOP Transform-page translate tuple 't'.
      { op: "noise1", parName: "tz", value: "absTime.seconds * 0.2" },
      // Audio level -> brightness. op('null1')[0] reads the first channel by
      // index (documented CHOP subscript access), so channel naming never
      // breaks the binding. 'brightness1' per the Level TOP Pre page.
      { op: "level1", parName: "brightness1", value: "0.5 + op('null1')[0] * 4" }
    ]
  },

  "data-visualization": {
    name: "Data Visualization",
    description:
      "Table DAT -> CHOP -> colour-mapped texture with a text overlay. The table " +
      "is pre-filled with sample values so the network shows real data at once.",
    operators: [
      { id: "table1", type: "Table DAT" },
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
      { from: "table1", fromPort: 0, to: "datToChop1", toPort: 0 },
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
      // Math CHOP range mapping — documented Range-page tuple components
      // torange1 / torange2 (the map lists only the tuple label).
      { op: "math1", parName: "torange1", value: "0" },
      { op: "math1", parName: "torange2", value: "1" },
      // Composite TOP operand — scripting token (menu label 'Over').
      { op: "composite1", param: "Operand", value: "over" }
    ],
    texts: [
      // Sample data so the network is non-empty on first cook (DAT.text —
      // documented writable DAT member, applied via the bridge set_text).
      { op: "table1", text: "0.2\n0.5\n0.9\n0.4\n0.7\n0.3" }
    ]
  },

  "live-performance": {
    name: "Live Performance Rig",
    description:
      "Three generator scenes cycled by an LFO through a Switch TOP, with a " +
      "Beat CHOP pulsing to the microphone. Flat and fully wireable.",
    operators: [
      { id: "audioIn", type: "Audio Device In CHOP" },
      { id: "beat1", type: "Beat CHOP" },
      { id: "lfo1", type: "LFO CHOP" },
      { id: "sceneA", type: "Noise TOP" },
      { id: "sceneB", type: "Ramp TOP" },
      { id: "sceneC", type: "Circle TOP" },
      { id: "switch1", type: "Switch TOP" },
      { id: "level1", type: "Level TOP" },
      { id: "null_out", type: "Null TOP" },
      { id: "out1", type: "Out TOP" }
    ],
    connections: [
      { from: "audioIn", fromPort: 0, to: "beat1", toPort: 0 },
      { from: "sceneA", fromPort: 0, to: "switch1", toPort: 0 },
      { from: "sceneB", fromPort: 0, to: "switch1", toPort: 1 },
      { from: "sceneC", fromPort: 0, to: "switch1", toPort: 2 },
      { from: "switch1", fromPort: 0, to: "level1", toPort: 0 },
      { from: "level1", fromPort: 0, to: "null_out", toPort: 0 },
      { from: "null_out", fromPort: 0, to: "out1", toPort: 0 }
    ],
    parameters: [
      { op: "audioIn", param: "Active", value: "1" },
      { op: "lfo1", param: "Frequency", value: "0.1" },
      // LFO sine is -1..1; +1 sweeps the switch smoothly across inputs 0..2.
      { op: "switch1", param: "Index", value: "op('lfo1')[0] + 1" }
    ]
  }
};

export default BUILD_TEMPLATES;
