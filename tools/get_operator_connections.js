/**
 * Get Operator Connections Tool
 * Returns what operators typically connect to/from a named operator:
 * inputs, outputs, and common operator chains.
 * @module tools/get_operator_connections
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Static connection map: covers the most-used operators in each family.
// Structure per entry:
//   inputs   - operators that typically feed INTO this operator (upstream)
//   outputs  - operators that typically receive output FROM this operator (downstream)
//   chains   - full named patterns this operator commonly appears in
//   notes    - port-level wiring notes ("A output 0 -> B input 0")
// ---------------------------------------------------------------------------
const CONNECTION_MAP = {
  // TOP family -----------------------------------------------------------
  "movie_file_in_top": {
    displayName: "Movie File In TOP",
    category: "TOP",
    inputs: [],
    outputs: [
      { op: "Level TOP",       port: "output 0 -> Level input 0",  reason: "Brightness / contrast adjustment" },
      { op: "Blur TOP",        port: "output 0 -> Blur input 0",   reason: "Soften image" },
      { op: "Composite TOP",   port: "output 0 -> Composite input 0", reason: "Layer over other images" },
      { op: "Transform TOP",   port: "output 0 -> Transform input 0", reason: "Scale, rotate, translate" },
      { op: "Feedback TOP",    port: "output 0 -> Feedback input 0",  reason: "Create trail/echo effects" },
      { op: "Null TOP",        port: "output 0 -> Null input 0",    reason: "Reference point / passthrough" },
      { op: "Out TOP",         port: "output 0 -> Out input 0",     reason: "Export from container" }
    ],
    chains: ["video-player", "video-fx-chain", "compositing-pipeline"],
    notes: "Movie File In TOP has no inputs. Its single output (port 0) carries the decoded video frame each cook."
  },
  "feedback_top": {
    displayName: "Feedback TOP",
    category: "TOP",
    inputs: [
      { op: "Movie File In TOP", port: "Movie File In output 0 -> Feedback input 0", reason: "Source image for feedback loop" },
      { op: "Noise TOP",         port: "Noise output 0 -> Feedback input 0",         reason: "Generative feedback source" },
      { op: "GLSL TOP",          port: "GLSL output 0 -> Feedback input 0",          reason: "Shader-driven feedback" },
      { op: "Composite TOP",     port: "Composite output 0 -> Feedback input 0",     reason: "Blended feedback source" }
    ],
    outputs: [
      { op: "Level TOP",       port: "Feedback output 0 -> Level input 0",     reason: "Adjust brightness of feedback buffer" },
      { op: "Blur TOP",        port: "Feedback output 0 -> Blur input 0",      reason: "Smear/soften the echo" },
      { op: "Transform TOP",   port: "Feedback output 0 -> Transform input 0", reason: "Zoom/rotate feedback loop" },
      { op: "Composite TOP",   port: "Feedback output 0 -> Composite input 1", reason: "Layer feedback over source" },
      { op: "Null TOP",        port: "Feedback output 0 -> Null input 0",      reason: "Named reference for Target TOP param" }
    ],
    chains: ["generative-art", "feedback-zoom", "motion-blur-fake"],
    notes: "The Target TOP parameter must point to a TOP that is DOWNSTREAM of the Feedback TOP — this closes the loop. Place filter TOPs (Blur, Level, Transform) between Feedback and its Target to modulate the echo."
  },
  "render_top": {
    displayName: "Render TOP",
    category: "TOP",
    inputs: [],
    outputs: [
      { op: "Level TOP",       port: "Render output 0 -> Level input 0",     reason: "Post-process render brightness" },
      { op: "Blur TOP",        port: "Render output 0 -> Blur input 0",      reason: "Depth-of-field simulation" },
      { op: "Composite TOP",   port: "Render output 0 -> Composite input 0", reason: "Overlay HUD or 2D elements" },
      { op: "Null TOP",        port: "Render output 0 -> Null input 0",      reason: "Named output reference" },
      { op: "Out TOP",         port: "Render output 0 -> Out input 0",       reason: "Export rendered image" },
      { op: "Video Device Out TOP", port: "Render output 0 -> VideoOut input 0", reason: "Send to display / capture card" }
    ],
    chains: ["3d-render-pipeline", "live-performance", "data-visualization"],
    notes: "Render TOP has no TOP inputs. Connect Camera COMP path and Geometry COMP paths via its Camera and Geometry parameters (not wires). Its output port 0 carries the rendered RGBA frame."
  },
  "composite_top": {
    displayName: "Composite TOP",
    category: "TOP",
    inputs: [
      { op: "Movie File In TOP", port: "Movie File In output 0 -> Composite input 0", reason: "Background layer" },
      { op: "Noise TOP",         port: "Noise output 0 -> Composite input 1",         reason: "Texture/pattern layer" },
      { op: "Text TOP",          port: "Text output 0 -> Composite input 1",          reason: "HUD or title overlay" },
      { op: "Render TOP",        port: "Render output 0 -> Composite input 0",        reason: "3D render as base layer" },
      { op: "Level TOP",         port: "Level output 0 -> Composite input 0",         reason: "Colour-corrected layer" }
    ],
    outputs: [
      { op: "Out TOP",   port: "Composite output 0 -> Out input 0",     reason: "Final composite output" },
      { op: "Null TOP",  port: "Composite output 0 -> Null input 0",    reason: "Reference point" },
      { op: "Level TOP", port: "Composite output 0 -> Level input 0",   reason: "Global brightness pass" }
    ],
    chains: ["compositing-pipeline", "video-player", "live-performance"],
    notes: "Composite TOP accepts up to 8 input images (input 0 = bottom layer, higher indices = top layers). The Operand parameter controls blend mode per layer."
  },
  "level_top": {
    displayName: "Level TOP",
    category: "TOP",
    inputs: [
      { op: "Movie File In TOP", port: "Movie File In output 0 -> Level input 0", reason: "Colour-correct video" },
      { op: "Render TOP",        port: "Render output 0 -> Level input 0",        reason: "Post-process 3D render" },
      { op: "Noise TOP",         port: "Noise output 0 -> Level input 0",         reason: "Remap noise values" },
      { op: "Feedback TOP",      port: "Feedback output 0 -> Level input 0",      reason: "Decay feedback buffer" }
    ],
    outputs: [
      { op: "Composite TOP",     port: "Level output 0 -> Composite input 0",    reason: "Feed into composite" },
      { op: "Blur TOP",          port: "Level output 0 -> Blur input 0",          reason: "Smooth after level adjust" },
      { op: "Out TOP",           port: "Level output 0 -> Out input 0",           reason: "Final output" }
    ],
    chains: ["video-fx-chain", "compositing-pipeline"],
    notes: "Level TOP input 0 is the primary image. An optional second input (input 1) can supply a mask to limit the effect to regions."
  },
  "blur_top": {
    displayName: "Blur TOP",
    category: "TOP",
    inputs: [
      { op: "Level TOP",         port: "Level output 0 -> Blur input 0",         reason: "Blur colour-corrected image" },
      { op: "Feedback TOP",      port: "Feedback output 0 -> Blur input 0",      reason: "Soften feedback trail" },
      { op: "Render TOP",        port: "Render output 0 -> Blur input 0",        reason: "Blur 3D render" }
    ],
    outputs: [
      { op: "Composite TOP",     port: "Blur output 0 -> Composite input 1",    reason: "Blurred layer in comp" },
      { op: "Level TOP",         port: "Blur output 0 -> Level input 0",         reason: "Adjust after blur" },
      { op: "Threshold TOP",     port: "Blur output 0 -> Threshold input 0",    reason: "Bloom / glow step" }
    ],
    chains: ["generative-art", "video-fx-chain"],
    notes: "Blur TOP input 0 is the image to blur. Input 1 (optional) is a mask texture."
  },
  "noise_top": {
    displayName: "Noise TOP",
    category: "TOP",
    inputs: [],
    outputs: [
      { op: "Level TOP",         port: "Noise output 0 -> Level input 0",        reason: "Remap noise range" },
      { op: "Feedback TOP",      port: "Noise output 0 -> Feedback input 0",     reason: "Animate feedback with noise" },
      { op: "Displace TOP",      port: "Noise output 0 -> Displace input 1",     reason: "Use noise as displacement map" },
      { op: "CHOP to TOP",       port: "Noise output 0 -> CHOP to TOP input 0",  reason: "Convert noise image to channels" }
    ],
    chains: ["generative-art", "audio-reactive"],
    notes: "Noise TOP is a generator — no required inputs. It produces RGBA noise each cook based on its Type, Frequency, and Period parameters."
  },
  // CHOP family ----------------------------------------------------------
  "audio_file_in_chop": {
    displayName: "Audio File In CHOP",
    category: "CHOP",
    inputs: [],
    outputs: [
      { op: "Audio Spectrum CHOP", port: "AudioFileIn output -> Spectrum input 0",  reason: "FFT frequency analysis" },
      { op: "Math CHOP",           port: "AudioFileIn output -> Math input 0",      reason: "Scale/remap amplitude" },
      { op: "Analyze CHOP",        port: "AudioFileIn output -> Analyze input 0",   reason: "RMS / peak detection" },
      { op: "Audio Device Out CHOP", port: "AudioFileIn output -> DevOut input 0",  reason: "Route to speakers" }
    ],
    chains: ["audio-reactive"],
    notes: "Audio File In CHOP outputs one channel per audio channel (ch1 = left, ch2 = right). Its cook rate is determined by the sample rate and the timeline FPS."
  },
  "audio_device_in_chop": {
    displayName: "Audio Device In CHOP",
    category: "CHOP",
    inputs: [],
    outputs: [
      { op: "Audio Spectrum CHOP", port: "DeviceIn output -> Spectrum input 0",    reason: "Real-time FFT" },
      { op: "Analyze CHOP",        port: "DeviceIn output -> Analyze input 0",     reason: "RMS level metering" },
      { op: "Math CHOP",           port: "DeviceIn output -> Math input 0",        reason: "Gain / offset" },
      { op: "CHOP to TOP",         port: "DeviceIn output -> CHOP to TOP input 0", reason: "Visualise waveform" }
    ],
    chains: ["audio-reactive", "live-performance"],
    notes: "Set Active to On and choose your interface under the Device parameter. Time Slice mode is recommended for low-latency audio-reactive work."
  },
  "audio_spectrum_chop": {
    displayName: "Audio Spectrum CHOP",
    category: "CHOP",
    inputs: [
      { op: "Audio File In CHOP",   port: "AudioFileIn output -> Spectrum input 0",   reason: "Offline audio analysis" },
      { op: "Audio Device In CHOP", port: "DeviceIn output -> Spectrum input 0",      reason: "Real-time microphone/line analysis" }
    ],
    outputs: [
      { op: "Math CHOP",  port: "Spectrum output -> Math input 0",   reason: "Scale frequency bins" },
      { op: "Null CHOP",  port: "Spectrum output -> Null input 0",   reason: "Reference for expressions" },
      { op: "CHOP to TOP", port: "Spectrum output -> CHOP to TOP input 0", reason: "Visualise spectrum as image" },
      { op: "Limit CHOP", port: "Spectrum output -> Limit input 0",  reason: "Clamp loud peaks" }
    ],
    chains: ["audio-reactive"],
    notes: "The output channels represent frequency bins; their number depends on the Window Size parameter. Time Slice must be Off for FFT analysis."
  },
  "noise_chop": {
    displayName: "Noise CHOP",
    category: "CHOP",
    inputs: [],
    outputs: [
      { op: "Math CHOP",      port: "Noise output -> Math input 0",      reason: "Remap noise values" },
      { op: "Transform CHOP", port: "Noise output -> Transform input 0", reason: "Offset channels over time" },
      { op: "Lag CHOP",       port: "Noise output -> Lag input 0",       reason: "Smooth noise" },
      { op: "Null CHOP",      port: "Noise output -> Null input 0",      reason: "Named reference" }
    ],
    chains: ["generative-art", "audio-reactive"],
    notes: "Noise CHOP is a generator with no required inputs. Add channels via the Channel parameter. Wire the output into Math CHOP to remap the -1..1 range to any desired range."
  },
  "lfo_chop": {
    displayName: "LFO CHOP",
    category: "CHOP",
    inputs: [],
    outputs: [
      { op: "Math CHOP",      port: "LFO output -> Math input 0",      reason: "Scale amplitude" },
      { op: "Transform CHOP", port: "LFO output -> Transform input 0", reason: "Drive position/rotation" },
      { op: "Lag CHOP",       port: "LFO output -> Lag input 0",       reason: "Ease the oscillation" },
      { op: "Null CHOP",      port: "LFO output -> Null input 0",      reason: "Reference for expressions" }
    ],
    chains: ["generative-art", "live-performance"],
    notes: "LFO CHOP generates periodic waveforms (sine, square, sawtooth, etc.). Connect its Null output to parameter expressions: op('lfo1')['chan1']"
  },
  "math_chop": {
    displayName: "Math CHOP",
    category: "CHOP",
    inputs: [
      { op: "Noise CHOP",          port: "Noise output -> Math input 0",     reason: "Remap noise" },
      { op: "Audio Spectrum CHOP", port: "Spectrum output -> Math input 0",  reason: "Scale frequency data" },
      { op: "LFO CHOP",            port: "LFO output -> Math input 0",       reason: "Scale oscillation" }
    ],
    outputs: [
      { op: "Null CHOP",    port: "Math output -> Null input 0",    reason: "Named reference" },
      { op: "Lag CHOP",     port: "Math output -> Lag input 0",     reason: "Smooth remapped value" },
      { op: "CHOP to TOP",  port: "Math output -> CHOP to TOP input 0", reason: "Convert channel to texture" }
    ],
    chains: ["audio-reactive", "generative-art", "data-visualization"],
    notes: "Math CHOP accepts up to 2 inputs when using two-input operations (Add, Multiply, etc.). Single-input operations (Range, Exp) only use input 0."
  },
  "null_chop": {
    displayName: "Null CHOP",
    category: "CHOP",
    inputs: [
      { op: "Math CHOP",    port: "Math output -> Null input 0",    reason: "Stable expression reference" },
      { op: "Noise CHOP",   port: "Noise output -> Null input 0",   reason: "Named noise reference" },
      { op: "Lag CHOP",     port: "Lag output -> Null input 0",     reason: "Smoothed value reference" }
    ],
    outputs: [
      { op: "expressions",  port: "op('null1')['chan1']",           reason: "Drive parameters via Python expressions" }
    ],
    chains: ["generative-art", "audio-reactive", "data-visualization"],
    notes: "Null CHOP is a passthrough. It serves as a stable reference point so that renaming upstream operators does not break expressions."
  },
  // COMP family ----------------------------------------------------------
  "geometry_comp": {
    displayName: "Geometry COMP",
    category: "COMP",
    inputs: [
      { op: "Box SOP",      port: "Box output 0 -> Geometry input 0",      reason: "Provide geometry to render" },
      { op: "Sphere SOP",   port: "Sphere output 0 -> Geometry input 0",   reason: "Provide sphere geometry" },
      { op: "Script SOP",   port: "Script output 0 -> Geometry input 0",   reason: "Procedural geometry" },
      { op: "Text SOP",     port: "Text output 0 -> Geometry input 0",     reason: "3D text geometry" }
    ],
    outputs: [],
    chains: ["3d-render-pipeline", "generative-art", "live-performance"],
    notes: "Geometry COMP wraps SOP geometry for rendering. It appears in the Render TOP's Geometry parameter (not wired). Its Material parameter links to a MAT for shading."
  },
  "camera_comp": {
    displayName: "Camera COMP",
    category: "COMP",
    inputs: [],
    outputs: [],
    chains: ["3d-render-pipeline", "live-performance"],
    notes: "Camera COMP is referenced by the Render TOP's Camera parameter — it is not wire-connected. Transform parameters (Translate, Rotate) control the viewpoint. Use CHOP expressions or Null CHOPs to animate the camera."
  },
  "render_top_comp_link": {
    displayName: "Render TOP (COMP relationship)",
    category: "TOP",
    inputs: [],
    outputs: [],
    chains: ["3d-render-pipeline"],
    notes: "Render TOP connects to 3D scene objects via parameters, not wires: Camera parameter -> Camera COMP path; Geometry parameter -> one or more Geometry COMP paths; Light parameter -> Light COMP paths."
  },
  // SOP family -----------------------------------------------------------
  "box_sop": {
    displayName: "Box SOP",
    category: "SOP",
    inputs: [],
    outputs: [
      { op: "Noise SOP",        port: "Box output 0 -> Noise input 0",        reason: "Deform geometry with noise" },
      { op: "Transform SOP",    port: "Box output 0 -> Transform input 0",    reason: "Position / scale / rotate" },
      { op: "Geometry COMP",    port: "Box output 0 -> Geometry input 0",     reason: "Render the box" },
      { op: "Copy SOP",         port: "Box output 0 -> Copy input 0",         reason: "Instanced copies" }
    ],
    chains: ["3d-render-pipeline", "generative-art"],
    notes: "Box SOP is a generator — no inputs. Its single output port carries the polygon mesh."
  },
  "noise_sop": {
    displayName: "Noise SOP",
    category: "SOP",
    inputs: [
      { op: "Box SOP",      port: "Box output 0 -> Noise input 0",      reason: "Deform box surface" },
      { op: "Sphere SOP",   port: "Sphere output 0 -> Noise input 0",   reason: "Deform sphere surface" },
      { op: "Grid SOP",     port: "Grid output 0 -> Noise input 0",     reason: "Create terrain-like surface" }
    ],
    outputs: [
      { op: "Geometry COMP", port: "Noise output 0 -> Geometry input 0", reason: "Render deformed geometry" },
      { op: "Convert SOP",   port: "Noise output 0 -> Convert input 0",  reason: "Change primitive type" }
    ],
    chains: ["generative-art", "3d-render-pipeline"],
    notes: "Noise SOP deforms point positions. Input 0 is the geometry to deform. The noise is applied in object space."
  },
  // DAT family -----------------------------------------------------------
  "table_dat": {
    displayName: "Table DAT",
    category: "DAT",
    inputs: [],
    outputs: [
      { op: "DAT to CHOP",  port: "Table output 0 -> DAT to CHOP input 0", reason: "Convert table rows to channels" },
      { op: "DAT to SOP",   port: "Table output 0 -> DAT to SOP input 0",  reason: "Drive point positions from table" },
      { op: "Select DAT",   port: "Table output 0 -> Select input 0",      reason: "Filter rows / columns" },
      { op: "Evaluate DAT", port: "Table output 0 -> Evaluate input 0",    reason: "Evaluate cells as expressions" }
    ],
    chains: ["data-visualization"],
    notes: "Table DAT is the primary structured-data container. Right-click -> Insert Row/Column to edit in the network editor, or write to it via Python: op('table1')['rowname','colname'] = value"
  },
  "script_dat": {
    displayName: "Script DAT",
    category: "DAT",
    inputs: [
      { op: "Table DAT",  port: "Table output 0 -> Script input 0",  reason: "Process table data with Python" },
      { op: "Text DAT",   port: "Text output 0 -> Script input 0",   reason: "Transform text" }
    ],
    outputs: [
      { op: "DAT to CHOP", port: "Script output 0 -> DAT to CHOP input 0", reason: "Feed processed data to CHOP" },
      { op: "Table DAT",   port: "Script output 0 -> Table input 0",       reason: "Structured output" }
    ],
    chains: ["data-visualization"],
    notes: "The cook() callback is called every frame when the DAT is dirty. Access input DAT via op.inputs[0]. Return data by writing to the output table."
  }
};

// Alias lookup: maps common name variants to the canonical key
const ALIAS_MAP = {
  "feedback top":       "feedback_top",
  "feedback":           "feedback_top",
  "feedbacktop":        "feedback_top",
  "render top":         "render_top",
  "render":             "render_top",
  "rendertop":          "render_top",
  "movie file in top":  "movie_file_in_top",
  "movie file in":      "movie_file_in_top",
  "moviefilein":        "movie_file_in_top",
  "moviefileintop":     "movie_file_in_top",
  "composite top":      "composite_top",
  "composite":          "composite_top",
  "compositetop":       "composite_top",
  "level top":          "level_top",
  "level":              "level_top",
  "leveltop":           "level_top",
  "blur top":           "blur_top",
  "blur":               "blur_top",
  "blurtop":            "blur_top",
  "noise top":          "noise_top",
  "noise top (top)":    "noise_top",
  "audio file in chop": "audio_file_in_chop",
  "audio file in":      "audio_file_in_chop",
  "audiofilein":        "audio_file_in_chop",
  "audio device in chop": "audio_device_in_chop",
  "audio device in":    "audio_device_in_chop",
  "audio spectrum chop": "audio_spectrum_chop",
  "audio spectrum":     "audio_spectrum_chop",
  "noise chop":         "noise_chop",
  "noise (chop)":       "noise_chop",
  "lfo chop":           "lfo_chop",
  "lfo":                "lfo_chop",
  "math chop":          "math_chop",
  "math":               "math_chop",
  "null chop":          "null_chop",
  "null (chop)":        "null_chop",
  "geometry comp":      "geometry_comp",
  "geometry":           "geometry_comp",
  "geo comp":           "geometry_comp",
  "camera comp":        "camera_comp",
  "camera":             "camera_comp",
  "box sop":            "box_sop",
  "box":                "box_sop",
  "noise sop":          "noise_sop",
  "noise (sop)":        "noise_sop",
  "table dat":          "table_dat",
  "table":              "table_dat",
  "script dat":         "script_dat",
  "script (dat)":       "script_dat"
};

function resolveKey(operatorName) {
  const lower = operatorName.toLowerCase().trim();
  if (CONNECTION_MAP[lower]) return lower;
  // Try alias map
  if (ALIAS_MAP[lower]) return ALIAS_MAP[lower];
  // Try replacing spaces with underscores
  const underscore = lower.replace(/\s+/g, "_");
  if (CONNECTION_MAP[underscore]) return underscore;
  return null;
}

// Tool schema
export const schema = {
  title: "Get Operator Connections",
  description:
    "Returns the typical upstream inputs, downstream outputs, and common operator chains for a named TouchDesigner operator. " +
    "Includes connection port instructions (e.g., 'A output 0 -> B input 0') so you know exactly how to wire nodes together.",
  inputSchema: {
    operator_name: z.string().describe(
      "Name of the TouchDesigner operator (e.g., 'Feedback TOP', 'Noise CHOP', 'Geometry COMP')"
    ),
    direction: z.enum(["all", "inputs", "outputs"]).optional().describe(
      "Which connections to return: 'inputs' (what feeds into this op), 'outputs' (what this op feeds), or 'all' (default)"
    )
  }
};

// Tool handler
export async function handler({ operator_name, direction = "all" }, _context) {
  const key = resolveKey(operator_name);

  if (!key) {
    // Build suggestion list from alias map keys for fuzzy guidance
    const knownOps = [...new Set(Object.values(ALIAS_MAP))].map(k => {
      const entry = CONNECTION_MAP[k];
      return entry ? entry.displayName : k;
    });

    return {
      content: [{
        type: "text",
        text:
          `No connection data found for "${operator_name}".\n\n` +
          `**Operators with connection data:**\n` +
          knownOps.map(n => `- ${n}`).join("\n") +
          `\n\n**Tips:**\n` +
          `- Include the family suffix: "Feedback TOP", "Noise CHOP", "Geometry COMP"\n` +
          `- Case-insensitive matching is applied automatically\n` +
          `- Use search_operators to find the exact operator name`
      }]
    };
  }

  const data = CONNECTION_MAP[key];
  let text = `# Connections: ${data.displayName}\n\n`;
  text += `**Category:** ${data.category}\n\n`;

  if (data.notes) {
    text += `> ${data.notes}\n\n`;
  }

  // Inputs
  if (direction === "all" || direction === "inputs") {
    text += `## Typical Inputs (what feeds INTO ${data.displayName})\n\n`;
    if (!data.inputs || data.inputs.length === 0) {
      text += `${data.displayName} is a **generator** — it has no required inputs.\n\n`;
    } else {
      data.inputs.forEach(inp => {
        text += `### ${inp.op}\n`;
        text += `- **Wiring:** \`${inp.port}\`\n`;
        text += `- **Why:** ${inp.reason}\n\n`;
      });
    }
  }

  // Outputs
  if (direction === "all" || direction === "outputs") {
    text += `## Typical Outputs (what ${data.displayName} feeds INTO)\n\n`;
    if (!data.outputs || data.outputs.length === 0) {
      text += `${data.displayName} outputs are consumed via parameter references, not direct wires. See the notes above.\n\n`;
    } else {
      data.outputs.forEach(out => {
        text += `### ${out.op}\n`;
        text += `- **Wiring:** \`${out.port}\`\n`;
        text += `- **Why:** ${out.reason}\n\n`;
      });
    }
  }

  // Common chains
  if (data.chains && data.chains.length > 0) {
    text += `## Common Operator Chains\n\n`;
    text += `${data.displayName} appears in these workflow patterns:\n`;
    data.chains.forEach(chain => {
      text += `- \`${chain}\` — use **get_network_template** with this name for a full setup\n`;
    });
    text += "\n";
  }

  text += `---\n`;
  text += `*Use \`get_network_template\` to get a full wiring diagram for any chain listed above.*\n`;
  text += `*Use \`suggest_workflow\` for broader operator suggestions.*\n`;

  return {
    content: [{ type: "text", text }]
  };
}
