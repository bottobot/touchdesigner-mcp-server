/**
 * Get Network Template Tool
 * Returns full network templates for common TouchDesigner use cases.
 * Each template includes operator list, connections, parameter settings,
 * and ready-to-use Python scripts.
 * @module tools/get_network_template
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------
const TEMPLATES = {
  "video-player": {
    name: "Video Player",
    description: "Plays a video file with basic colour correction and output to a display or container.",
    complexity: "simple",
    estimatedNodeCount: 6,
    minimumTdVersion: "2020",
    useCases: ["video playback", "media server", "background video"],
    operators: [
      { id: "movieIn",   type: "Movie File In TOP", purpose: "Decode video file frame by frame" },
      { id: "level1",    type: "Level TOP",         purpose: "Brightness / contrast / gamma correction" },
      { id: "transform1",type: "Transform TOP",     purpose: "Scale, crop, or position video" },
      { id: "null1",     type: "Null TOP",          purpose: "Named output reference point" },
      { id: "out1",      type: "Out TOP",           purpose: "Export from Container COMP (if inside one)" }
    ],
    connections: [
      { from: "movieIn",    fromPort: 0, to: "level1",    toPort: 0, note: "Raw video -> colour correction" },
      { from: "level1",     fromPort: 0, to: "transform1",toPort: 0, note: "Colour-corrected -> transform" },
      { from: "transform1", fromPort: 0, to: "null1",     toPort: 0, note: "Transformed -> reference null" },
      { from: "null1",      fromPort: 0, to: "out1",      toPort: 0, note: "Null -> container output" }
    ],
    parameters: [
      { op: "movieIn",    param: "File",         value: "'your_video.mp4'",   note: "Path to video file" },
      { op: "movieIn",    param: "Play",         value: "1",                  note: "Start playback immediately" },
      { op: "movieIn",    param: "Loop",         value: "1",                  note: "Loop when finished" },
      { op: "level1",     param: "Brightness",   value: "1.0",                note: "Neutral brightness" },
      { op: "level1",     param: "Contrast",     value: "1.0",                note: "Neutral contrast" },
      { op: "transform1", param: "Scale X",      value: "1",                  note: "Identity scale" },
      { op: "transform1", param: "Scale Y",      value: "1",                  note: "Identity scale" }
    ],
    pythonScripts: [
      {
        location: "Execute DAT (attached to parent Container COMP)",
        event: "onStart",
        code: `# Video Player - onStart callback
# Resets playback and starts the video when the project loads.

def onStart():
    movie = op('movieIn')
    movie.par.play = 1
    movie.par.cuepoint = 0
    print('[VideoPlayer] Playback started')
`
      },
      {
        location: "Script CHOP or Button COMP callback",
        event: "toggle_play",
        code: `# Toggle play/pause
def togglePlay(movieOp):
    \"\"\"Call with togglePlay(op('movieIn'))\"\"\"
    movieOp.par.play = 0 if movieOp.par.play else 1
`
      }
    ],
    tips: [
      "Use HAP or NotchLC codec for GPU-accelerated decode at high resolutions.",
      "Set Trim to 'Seconds' or 'Frames' on Movie File In TOP to loop a section.",
      "Connect a Timer CHOP to the Cue Point parameter for time-coded triggers.",
      "Use multiple Movie File In TOPs + Switch TOP for seamless clip switching."
    ]
  },

  "generative-art": {
    name: "Generative Art (Feedback Loop)",
    description: "Classic feedback-zoom generative art network using Noise TOP as a seed, a Feedback TOP for the loop, and post-processing filters.",
    complexity: "medium",
    estimatedNodeCount: 9,
    minimumTdVersion: "2020",
    useCases: ["generative visuals", "VJing", "live performance", "installations"],
    operators: [
      { id: "noise1",    type: "Noise TOP",      purpose: "Seed texture for feedback loop" },
      { id: "feedback1", type: "Feedback TOP",   purpose: "Core of the feedback loop — references target1" },
      { id: "transform1",type: "Transform TOP",  purpose: "Zoom / rotate / translate each feedback frame" },
      { id: "level1",    type: "Level TOP",      purpose: "Decay the feedback (reduce brightness each frame)" },
      { id: "blur1",     type: "Blur TOP",       purpose: "Soften feedback to prevent aliasing" },
      { id: "target1",   type: "Null TOP",       purpose: "Feedback target — Feedback TOP points here to close the loop" },
      { id: "composite1",type: "Composite TOP",  purpose: "Overlay noise seed onto feedback output" },
      { id: "out1",      type: "Out TOP",        purpose: "Final output" }
    ],
    connections: [
      { from: "noise1",     fromPort: 0, to: "feedback1",  toPort: 0,  note: "Noise seeds the feedback input" },
      { from: "feedback1",  fromPort: 0, to: "transform1", toPort: 0,  note: "Feedback buffer -> zoom/rotate" },
      { from: "transform1", fromPort: 0, to: "level1",     toPort: 0,  note: "Zoomed frame -> brightness decay" },
      { from: "level1",     fromPort: 0, to: "blur1",      toPort: 0,  note: "Decayed frame -> blur" },
      { from: "blur1",      fromPort: 0, to: "target1",    toPort: 0,  note: "Blurred frame -> feedback target (closes loop)" },
      { from: "target1",    fromPort: 0, to: "composite1", toPort: 0,  note: "Loop output -> base composite layer" },
      { from: "noise1",     fromPort: 0, to: "composite1", toPort: 1,  note: "Noise -> second composite layer (subtle injection)" },
      { from: "composite1", fromPort: 0, to: "out1",       toPort: 0,  note: "Final composite -> output" }
    ],
    parameters: [
      { op: "feedback1", param: "Target TOP", value: "target1",  note: "CRITICAL: must point to the Null TOP downstream" },
      { op: "transform1",param: "Scale X",    value: "1.01",     note: "Slow zoom in each frame" },
      { op: "transform1",param: "Scale Y",    value: "1.01",     note: "Slow zoom in each frame" },
      { op: "transform1",param: "Rotate",     value: "0.1",      note: "Gentle rotation each frame" },
      { op: "level1",    param: "Brightness", value: "0.97",     note: "3% decay per frame — tune for longer/shorter trails" },
      { op: "blur1",     param: "Filter Width",value: "1",       note: "1px blur to soften aliasing" },
      { op: "composite1",param: "Operand",    value: "Add",      note: "Additive blend for glow effect" }
    ],
    pythonScripts: [
      {
        location: "Execute DAT (frame-level animation)",
        event: "onFrameStart",
        code: `# Generative Art - Animate noise parameters each frame
import math

def onFrameStart(frame):
    t = absTime.seconds
    n = op('noise1')
    # Slowly drift noise through its parameter space
    n.par.tx = math.sin(t * 0.1) * 2
    n.par.ty = math.cos(t * 0.13) * 2
    n.par.tz = t * 0.05  # Continuous drift through noise z-slice

    # Modulate feedback zoom with a gentle LFO
    tf = op('transform1')
    zoom = 1.005 + math.sin(t * 0.07) * 0.004
    tf.par.sx = zoom
    tf.par.sy = zoom
`
      },
      {
        location: "Script DAT or Panel Execute DAT — reset button",
        event: "reset",
        code: `# Reset feedback to a clean black frame
def resetFeedback():
    fb = op('feedback1')
    fb.par.resetpulse.pulse()
    print('[GenerativeArt] Feedback loop reset')
`
      }
    ],
    tips: [
      "Set Feedback TOP Target TOP to the Null TOP that is downstream — if you target an upstream node the loop will not form.",
      "Use pixel format RGBA16Float on the Feedback TOP for smoother decay without banding.",
      "Lower the Level TOP Brightness below 0.99 to prevent the feedback from accumulating to white.",
      "Add a GLSL TOP between Level and the target Null for per-pixel shader-driven feedback effects.",
      "Use op('feedback1').par.resetpulse.pulse() from Python to clear the buffer on demand."
    ]
  },

  "audio-reactive": {
    name: "Audio Reactive Visuals",
    description: "Full audio analysis pipeline from microphone or file input through FFT to geometry deformation and visual output.",
    complexity: "medium",
    estimatedNodeCount: 12,
    minimumTdVersion: "2020",
    useCases: ["music visualizer", "live performance", "DJ visuals", "installation"],
    operators: [
      { id: "audioIn",   type: "Audio Device In CHOP", purpose: "Capture live audio from microphone or interface" },
      { id: "spectrum1", type: "Audio Spectrum CHOP",  purpose: "FFT frequency analysis" },
      { id: "math1",     type: "Math CHOP",            purpose: "Scale/remap frequency data to usable range" },
      { id: "lag1",      type: "Lag CHOP",             purpose: "Smooth channel values to reduce jitter" },
      { id: "null1",     type: "Null CHOP",            purpose: "Named reference for expressions" },
      { id: "noise1",    type: "Noise TOP",            purpose: "Background generative texture" },
      { id: "level1",    type: "Level TOP",            purpose: "Modulate texture brightness with audio level" },
      { id: "grid1",     type: "Grid SOP",             purpose: "Base geometry for deformation" },
      { id: "noiseSop1", type: "Noise SOP",            purpose: "Deform grid with audio-driven noise" },
      { id: "geo1",      type: "Geometry COMP",        purpose: "Wrap SOP for rendering" },
      { id: "render1",   type: "Render TOP",           purpose: "Render 3D geometry" },
      { id: "composite1",type: "Composite TOP",        purpose: "Layer 2D texture behind 3D render" },
      { id: "out1",      type: "Out TOP",              purpose: "Final output" }
    ],
    connections: [
      { from: "audioIn",   fromPort: 0, to: "spectrum1",  toPort: 0, note: "Live audio -> FFT" },
      { from: "spectrum1", fromPort: 0, to: "math1",      toPort: 0, note: "Frequency bins -> scaled data" },
      { from: "math1",     fromPort: 0, to: "lag1",       toPort: 0, note: "Scaled data -> smoothed" },
      { from: "lag1",      fromPort: 0, to: "null1",      toPort: 0, note: "Smoothed -> reference null" },
      { from: "noise1",    fromPort: 0, to: "level1",     toPort: 0, note: "Background texture -> brightness mod" },
      { from: "grid1",     fromPort: 0, to: "noiseSop1",  toPort: 0, note: "Base geometry -> deformation" },
      { from: "noiseSop1", fromPort: 0, to: "geo1",       toPort: 0, note: "Deformed geo -> Geometry COMP" },
      { from: "render1",   fromPort: 0, to: "composite1", toPort: 0, note: "3D render -> front layer" },
      { from: "level1",    fromPort: 0, to: "composite1", toPort: 1, note: "Textured background -> back layer" },
      { from: "composite1",fromPort: 0, to: "out1",       toPort: 0, note: "Final composite -> output" }
    ],
    parameters: [
      { op: "audioIn",   param: "Active",         value: "1",                  note: "Enable audio capture" },
      { op: "audioIn",   param: "Time Slice",     value: "1",                  note: "Time Slice mode for low latency" },
      { op: "spectrum1", param: "Window Size",    value: "1024",               note: "FFT window — larger = more frequency resolution" },
      { op: "math1",     param: "To Range Max",   value: "1",                  note: "Normalize frequency data to 0..1" },
      { op: "lag1",      param: "Lag +",          value: "0.15",               note: "Attack smoothing (seconds)" },
      { op: "lag1",      param: "Lag -",          value: "0.3",                note: "Decay smoothing (seconds)" },
      { op: "noiseSop1", param: "Amplitude",      value: "op('null1')['chan1'] * 0.5", note: "Drive deformation amplitude from audio" },
      { op: "level1",    param: "Brightness",     value: "op('null1')['chan1']",       note: "Pulse brightness with audio peak" }
    ],
    pythonScripts: [
      {
        location: "Execute DAT (frame-level)",
        event: "onFrameStart",
        code: `# Audio Reactive - Frame update
# Drive multiple parameters from audio analysis channels.

def onFrameStart(frame):
    audio = op('null1')

    # Get normalised audio level (0..1)
    level = min(audio['chan1'], 1.0)

    # Scale noise amplitude with audio
    op('noiseSop1').par.amp = level * 0.5

    # Pulse Level TOP brightness
    op('level1').par.brightness = 0.5 + level * 0.8

    # Rotate camera slightly with mid-range frequencies
    # Assumes null1 has multiple channels from a multi-band analysis
    if audio.numChans > 4:
        mid = audio['chan3']
        op('cam1').par.ry = mid * 15  # degrees
`
      },
      {
        location: "Script CHOP (multi-band energy extraction)",
        event: "cook",
        code: `# Compute 4-band energy from spectrum output.
# Place this in a Script CHOP, set its inputs to null1 (spectrum data).

import numpy as np

def cook(scriptOp):
    scriptOp.clear()

    if scriptOp.inputs:
        spec = scriptOp.inputs[0]
        data = np.array([spec[c][0] for c in range(spec.numChans)])
        n = len(data)
        # Split into 4 equal bands: sub, low, mid, high
        bands = [data[:n//4], data[n//4:n//2], data[n//2:3*n//4], data[3*n//4:]]
        labels = ['sub', 'low', 'mid', 'high']
        for label, band in zip(labels, bands):
            scriptOp.appendChan(label)[0] = float(np.mean(band))
`
      }
    ],
    tips: [
      "Set Audio Device In CHOP Time Slice to On for lowest latency.",
      "Use Lag CHOP with different Lag+ and Lag- values: quick attack (0.05s), slow release (0.5s) feels more musical.",
      "Use the Analyze CHOP (RMS mode) for a single 'loudness' channel instead of the full spectrum.",
      "Drive multiple visual parameters from different frequency bands: bass -> scale, mids -> rotation, highs -> colour.",
      "Add a Beat CHOP after Audio Device In CHOP to detect kick drum onsets."
    ]
  },

  "data-visualization": {
    name: "Data Visualization",
    description: "Read structured data from a Table DAT or external JSON, process it in Python, and render a visual chart or geometry-based graph.",
    complexity: "medium",
    estimatedNodeCount: 10,
    minimumTdVersion: "2020",
    useCases: ["data dashboard", "real-time monitoring", "infographics", "scientific visualization"],
    operators: [
      { id: "table1",    type: "Table DAT",       purpose: "Hold structured data (rows = records, columns = fields)" },
      { id: "script1",   type: "Script DAT",      purpose: "Process / filter / aggregate table data with Python" },
      { id: "datToChop1",type: "DAT to CHOP",     purpose: "Convert processed table rows to CHOP channels" },
      { id: "math1",     type: "Math CHOP",       purpose: "Normalise data values to 0..1 display range" },
      { id: "null1",     type: "Null CHOP",       purpose: "Stable reference for driving visual parameters" },
      { id: "chopToTop1",type: "CHOP to TOP",     purpose: "Convert channel data to a 1D texture for shader access" },
      { id: "ramp1",     type: "Ramp TOP",        purpose: "Colour gradient for data mapping" },
      { id: "lookup1",   type: "Lookup TOP",      purpose: "Map data values to colours via the ramp gradient" },
      { id: "text1",     type: "Text TOP",        purpose: "Render data labels and numeric readouts" },
      { id: "composite1",type: "Composite TOP",   purpose: "Combine bar chart, colour map, and labels" },
      { id: "out1",      type: "Out TOP",         purpose: "Final visualisation output" }
    ],
    connections: [
      { from: "table1",    fromPort: 0, to: "script1",    toPort: 0, note: "Raw data -> Python processing" },
      { from: "script1",   fromPort: 0, to: "datToChop1", toPort: 0, note: "Processed table -> CHOP channels" },
      { from: "datToChop1",fromPort: 0, to: "math1",      toPort: 0, note: "Channels -> normalised 0..1" },
      { from: "math1",     fromPort: 0, to: "null1",      toPort: 0, note: "Normalised -> reference null" },
      { from: "null1",     fromPort: 0, to: "chopToTop1", toPort: 0, note: "Channel data -> 1D texture" },
      { from: "chopToTop1",fromPort: 0, to: "lookup1",    toPort: 0, note: "Data texture -> colour lookup" },
      { from: "ramp1",     fromPort: 0, to: "lookup1",    toPort: 1, note: "Gradient -> lookup table for colour mapping" },
      { from: "lookup1",   fromPort: 0, to: "composite1", toPort: 0, note: "Colour-mapped data -> base layer" },
      { from: "text1",     fromPort: 0, to: "composite1", toPort: 1, note: "Labels -> overlay layer" },
      { from: "composite1",fromPort: 0, to: "out1",       toPort: 0, note: "Final visualisation -> output" }
    ],
    parameters: [
      { op: "datToChop1", param: "Output",      value: "Channel per Column", note: "Each column becomes a CHOP channel" },
      { op: "datToChop1", param: "First Row is",value: "Names",              note: "Use first row as channel names" },
      { op: "math1",      param: "To Range Min", value: "0",                 note: "Normalise minimum" },
      { op: "math1",      param: "To Range Max", value: "1",                 note: "Normalise maximum" },
      { op: "chopToTop1", param: "Width",        value: "256",               note: "Width = number of data points" },
      { op: "chopToTop1", param: "Height",       value: "1",                 note: "1D texture" },
      { op: "ramp1",      param: "Type",         value: "Horizontal",        note: "Gradient left to right" }
    ],
    pythonScripts: [
      {
        location: "Script DAT (cook callback)",
        event: "cook",
        code: `# Data Visualization - Script DAT cook
# Reads input table, aggregates values, writes to output.

def cook(scriptOp):
    scriptOp.clear()

    src = op('table1')
    if src.numRows < 2:
        return  # No data rows yet

    # Copy header row
    headers = [src[0, c].val for c in range(src.numCols)]
    scriptOp.appendRow(headers)

    # Filter, sort, or aggregate here
    rows = []
    for r in range(1, src.numRows):
        row = [src[r, c].val for c in range(src.numCols)]
        rows.append(row)

    # Example: sort by second column descending
    try:
        rows.sort(key=lambda x: float(x[1]), reverse=True)
    except (ValueError, IndexError):
        pass

    for row in rows:
        scriptOp.appendRow(row)
`
      },
      {
        location: "Execute DAT (data update trigger)",
        event: "onStart + periodic update",
        code: `# Reload data from an external JSON file periodically.
import json, os

DATA_PATH = project.folder + '/data/dataset.json'
UPDATE_INTERVAL = 60  # seconds

_last_update = 0

def onFrameStart(frame):
    global _last_update
    now = absTime.seconds
    if now - _last_update < UPDATE_INTERVAL:
        return
    _last_update = now

    try:
        with open(DATA_PATH, 'r') as f:
            data = json.load(f)

        tbl = op('table1')
        tbl.clear()

        if isinstance(data, list) and data:
            # Write headers from first item keys
            tbl.appendRow(list(data[0].keys()))
            for record in data:
                tbl.appendRow(list(record.values()))

        print(f'[DataViz] Loaded {len(data)} records from {DATA_PATH}')
    except Exception as e:
        print(f'[DataViz] Data load error: {e}')
`
      }
    ],
    tips: [
      "Use Web Client DAT to fetch JSON from an HTTP API and feed it into Script DAT for real-time data.",
      "Set the DAT to CHOP 'First Row is Names' so channel names match your column headers.",
      "Use CHOP to TOP with height=1 to create a 1D data texture sampled in a GLSL shader for GPU-side visualisation.",
      "Combine multiple Ramp TOPs (each with different colour schemes) and a Switch TOP for switchable palettes.",
      "Use Text TOP with the 'DAT' input mode to display a live Table DAT as formatted text."
    ]
  },

  "live-performance": {
    name: "Live Performance Rig",
    description: "Multi-scene live performance network with scene switching, audio reactivity, MIDI control, and multi-output support.",
    complexity: "complex",
    estimatedNodeCount: 18,
    minimumTdVersion: "2021",
    useCases: ["VJing", "live concert", "theatre show", "interactive installation"],
    operators: [
      { id: "midiIn",    type: "MIDI In CHOP",         purpose: "Receive MIDI CC / note events from controller" },
      { id: "audioIn",   type: "Audio Device In CHOP",  purpose: "Live audio for beat / level reactivity" },
      { id: "spectrum1", type: "Audio Spectrum CHOP",   purpose: "FFT for frequency-driven visuals" },
      { id: "null1",     type: "Null CHOP",             purpose: "Audio data reference for expressions" },
      { id: "scene1",    type: "Container COMP",        purpose: "Scene 1 — e.g. feedback loop" },
      { id: "scene2",    type: "Container COMP",        purpose: "Scene 2 — e.g. 3D geometry" },
      { id: "scene3",    type: "Container COMP",        purpose: "Scene 3 — e.g. video player" },
      { id: "switch1",   type: "Switch TOP",            purpose: "Select active scene output" },
      { id: "crossfade1",type: "Cross TOP",             purpose: "Crossfade between scenes" },
      { id: "level1",    type: "Level TOP",             purpose: "Master brightness / opacity control" },
      { id: "lfo1",      type: "LFO CHOP",              purpose: "Tempo-synced modulation" },
      { id: "beat1",     type: "Beat CHOP",             purpose: "BPM detection from audio" },
      { id: "geo1",      type: "Geometry COMP",         purpose: "3D scene geometry (used by scene2)" },
      { id: "cam1",      type: "Camera COMP",           purpose: "3D scene camera" },
      { id: "render1",   type: "Render TOP",            purpose: "Render 3D scene" },
      { id: "videoOut",  type: "Video Device Out TOP",  purpose: "Send output to display or capture card" },
      { id: "null_out",  type: "Null TOP",              purpose: "Master output reference" }
    ],
    connections: [
      { from: "audioIn",   fromPort: 0, to: "spectrum1",  toPort: 0, note: "Live audio -> FFT" },
      { from: "audioIn",   fromPort: 0, to: "beat1",      toPort: 0, note: "Live audio -> BPM detection" },
      { from: "spectrum1", fromPort: 0, to: "null1",      toPort: 0, note: "Spectrum data reference" },
      { from: "scene1",    fromPort: 0, to: "switch1",    toPort: 0, note: "Scene 1 -> switch input 0" },
      { from: "scene2",    fromPort: 0, to: "switch1",    toPort: 1, note: "Scene 2 -> switch input 1" },
      { from: "scene3",    fromPort: 0, to: "switch1",    toPort: 2, note: "Scene 3 -> switch input 2" },
      { from: "switch1",   fromPort: 0, to: "crossfade1", toPort: 0, note: "Current scene -> crossfade A" },
      { from: "switch1",   fromPort: 0, to: "crossfade1", toPort: 1, note: "Next scene -> crossfade B (use prev index)" },
      { from: "crossfade1",fromPort: 0, to: "level1",     toPort: 0, note: "Crossfaded output -> master level" },
      { from: "level1",    fromPort: 0, to: "null_out",   toPort: 0, note: "Master level -> output null" },
      { from: "null_out",  fromPort: 0, to: "videoOut",   toPort: 0, note: "Output -> display device" },
      { from: "render1",   fromPort: 0, to: "scene2",     toPort: 0, note: "3D render feeds scene2 container" }
    ],
    parameters: [
      { op: "midiIn",    param: "Active",         value: "1",                  note: "Enable MIDI input" },
      { op: "midiIn",    param: "Device",         value: "0",                  note: "Select MIDI device index" },
      { op: "audioIn",   param: "Active",         value: "1",                  note: "Enable audio capture" },
      { op: "audioIn",   param: "Time Slice",     value: "1",                  note: "Low-latency mode" },
      { op: "switch1",   param: "Index",          value: "0",                  note: "Start on scene 0; driven by MIDI CC" },
      { op: "crossfade1",param: "Cross",          value: "0",                  note: "0 = full A; 1 = full B; animate to crossfade" },
      { op: "lfo1",      param: "Rate",           value: "op('beat1')['bpm'] / 60", note: "Sync LFO to detected BPM" },
      { op: "level1",    param: "Brightness",     value: "1",                  note: "Master brightness — map to MIDI fader" },
      { op: "videoOut",  param: "Active",         value: "1",                  note: "Enable output to display" }
    ],
    pythonScripts: [
      {
        location: "MIDI In Map CHOP or Execute DAT",
        event: "MIDI CC handling",
        code: `# Live Performance - MIDI CC -> Scene Switcher
# Wire a MIDI In CHOP and handle CC messages via MIDI Event DAT.

def onReceiveCC(channel, cc, val, site):
    \"\"\"
    Called from MIDI Event DAT.
    cc 1 -> scene index
    cc 2 -> crossfade amount
    cc 7 -> master brightness
    \"\"\"
    if cc == 1:
        scene_idx = int((val / 127) * 2)  # Map 0-127 to 0-2
        op('switch1').par.index = scene_idx

    elif cc == 2:
        fade = val / 127.0
        op('crossfade1').par.cross = fade

    elif cc == 7:
        brightness = val / 127.0
        op('level1').par.brightness = brightness
`
      },
      {
        location: "Panel Execute DAT on a Container COMP (scene manager)",
        event: "onFrameStart",
        code: `# Live Performance - Beat-synced parameter modulation
import math

def onFrameStart(frame):
    beat = op('beat1')
    bpm  = beat['bpm'] if beat.numChans > 0 else 120.0
    t    = absTime.seconds

    # Beat phase 0..1 per bar (4 beats)
    beat_phase = (t * bpm / 60.0) % 4.0 / 4.0

    # Drive LFO rate to BPM
    op('lfo1').par.rate = bpm / 60.0

    # Flash level on every kick (phase near 0)
    flash = max(0, 1 - beat_phase * 8) if beat_phase < 0.125 else 0
    op('level1').par.brightness = 0.8 + flash * 0.2
`
      },
      {
        location: "Script CHOP (tempo-aligned crossfade automation)",
        event: "cook",
        code: `# Auto-crossfade between scenes every N bars.
# Place in a Script CHOP; it outputs a crossfade 0..1 value.

import math

BARS_PER_SCENE = 8

def cook(scriptOp):
    scriptOp.clear()
    ch = scriptOp.appendChan('crossfade')

    beat = op('beat1')
    bpm  = float(beat['bpm']) if beat and beat.numChans else 120.0
    t    = absTime.seconds
    bar_dur = 4.0 * 60.0 / bpm  # seconds per bar
    scene_dur = BARS_PER_SCENE * bar_dur

    phase = (t % scene_dur) / scene_dur
    # Last 10% of scene duration: crossfade
    fade_start = 0.9
    if phase > fade_start:
        ch[0] = (phase - fade_start) / (1.0 - fade_start)
    else:
        ch[0] = 0.0
`
      }
    ],
    tips: [
      "Put each scene in its own Container COMP with an Out TOP — the Switch TOP then selects between container outputs.",
      "Use Cross TOP (not Switch TOP) for smooth visual crossfades; set Cross parameter to 0.0 = A, 1.0 = B.",
      "Add a Perform CHOP to monitor frame rate and automatically reduce resolution if FPS drops below 50.",
      "Use TouchOSC or Lemur on an iPad to build a custom wireless MIDI/OSC controller.",
      "For true multi-output, use separate Video Device Out TOPs — one per display — with a Layout TOP upstream.",
      "Use Engine COMP (TD 2022+) to offload heavy computation to a background thread."
    ]
  }
};

// Alias map for user-friendly lookup
const ALIAS_MAP = {
  "video player":           "video-player",
  "videoplayer":            "video-player",
  "video":                  "video-player",
  "generative":             "generative-art",
  "generative art":         "generative-art",
  "generativeart":          "generative-art",
  "feedback":               "generative-art",
  "feedback loop":          "generative-art",
  "audio":                  "audio-reactive",
  "audio reactive":         "audio-reactive",
  "audioreactive":          "audio-reactive",
  "audio-visual":           "audio-reactive",
  "music visualizer":       "audio-reactive",
  "data":                   "data-visualization",
  "data visualization":     "data-visualization",
  "datavisualization":      "data-visualization",
  "data viz":               "data-visualization",
  "dataviz":                "data-visualization",
  "live":                   "live-performance",
  "live performance":       "live-performance",
  "liveperformance":        "live-performance",
  "vjing":                  "live-performance",
  "vj":                     "live-performance",
  "performance":            "live-performance"
};

function resolveTemplate(name) {
  const lower = name.toLowerCase().trim();
  if (TEMPLATES[lower]) return lower;
  if (ALIAS_MAP[lower]) return ALIAS_MAP[lower];
  return null;
}

// Tool schema
export const schema = {
  title: "Get TouchDesigner Network Template",
  description:
    "Returns a full TouchDesigner network template for a common use case. " +
    "Each template includes the operator list, wire connections with port numbers, " +
    "parameter settings, ready-to-paste Python scripts, and setup tips. " +
    "Available templates: video-player, generative-art, audio-reactive, data-visualization, live-performance.",
  inputSchema: {
    template: z.string().describe(
      "Template name. One of: video-player, generative-art, audio-reactive, data-visualization, live-performance. " +
      "Aliases like 'feedback loop', 'audio visual', 'vj', 'data viz' are also accepted."
    ),
    show_python: z.boolean().optional().describe(
      "Include Python script examples in the response (default: true)"
    )
  }
};

// Tool handler
export async function handler({ template, show_python = true }, _context) {
  // Handle list request
  if (template.toLowerCase().trim() === "list") {
    let text = `# Available Network Templates\n\n`;
    Object.entries(TEMPLATES).forEach(([key, tpl]) => {
      text += `## ${tpl.name} (\`${key}\`)\n`;
      text += `${tpl.description}\n`;
      text += `- **Complexity:** ${tpl.complexity}\n`;
      text += `- **Node count:** ~${tpl.estimatedNodeCount}\n`;
      text += `- **Min TD version:** ${tpl.minimumTdVersion}\n\n`;
    });
    return { content: [{ type: "text", text }] };
  }

  const key = resolveTemplate(template);

  if (!key) {
    const list = Object.keys(TEMPLATES).join(", ");
    return {
      content: [{
        type: "text",
        text:
          `No template found for "${template}".\n\n` +
          `**Available templates:** ${list}\n\n` +
          `Use \`template: "list"\` to see descriptions of all templates.`
      }]
    };
  }

  const tpl = TEMPLATES[key];

  let text = `# Network Template: ${tpl.name}\n\n`;
  text += `${tpl.description}\n\n`;

  // Metadata
  text += `| Property | Value |\n`;
  text += `|---|---|\n`;
  text += `| Complexity | ${tpl.complexity} |\n`;
  text += `| Estimated node count | ~${tpl.estimatedNodeCount} |\n`;
  text += `| Minimum TD version | ${tpl.minimumTdVersion} |\n`;
  text += `| Use cases | ${tpl.useCases.join(", ")} |\n\n`;

  // Operator list
  text += `## Operators\n\n`;
  text += `| ID | Type | Purpose |\n`;
  text += `|---|---|---|\n`;
  tpl.operators.forEach(op => {
    text += `| \`${op.id}\` | ${op.type} | ${op.purpose} |\n`;
  });
  text += "\n";

  // Connections
  text += `## Connections (port-level wiring)\n\n`;
  tpl.connections.forEach(conn => {
    text += `- **\`${conn.from}\` output ${conn.fromPort}** -> **\`${conn.to}\` input ${conn.toPort}** — ${conn.note}\n`;
  });
  text += "\n";

  // Parameters
  text += `## Parameter Settings\n\n`;
  text += `| Operator | Parameter | Value | Note |\n`;
  text += `|---|---|---|---|\n`;
  tpl.parameters.forEach(p => {
    text += `| \`${p.op}\` | ${p.param} | \`${p.value}\` | ${p.note} |\n`;
  });
  text += "\n";

  // Python scripts
  if (show_python && tpl.pythonScripts && tpl.pythonScripts.length > 0) {
    text += `## Python Scripts\n\n`;
    tpl.pythonScripts.forEach((script, i) => {
      text += `### Script ${i + 1}: ${script.event}\n`;
      text += `**Location:** ${script.location}\n\n`;
      text += "```python\n";
      text += script.code;
      text += "```\n\n";
    });
  }

  // Tips
  if (tpl.tips && tpl.tips.length > 0) {
    text += `## Setup Tips\n\n`;
    tpl.tips.forEach(tip => {
      text += `- ${tip}\n`;
    });
    text += "\n";
  }

  text += `---\n`;
  text += `*Use \`get_operator_connections\` for detailed per-operator wiring info.*\n`;
  text += `*Use \`get_operator\` to look up any operator's full parameter list.*\n`;

  return { content: [{ type: "text", text }] };
}
