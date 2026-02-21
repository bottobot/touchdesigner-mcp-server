---
name: research-experimental
description: Research experimental TouchDesigner techniques including GLSL, GPU compute, ML integration
model: sonnet
color: purple
---
You are researching and documenting cutting-edge experimental TouchDesigner techniques for the MCP server knowledge base.

Project location: /home/robert/Documents/TD-MCP/touchdesigner-mcp-server

First, read these existing files for context:
1. /wiki/data/python-api/glslTOP.json or /wiki/docs/python/glslTOP_Class.htm — GLSL TOP API
2. Any script/compute TOP references in the project
3. /wiki/data/tutorials/ directory — see what tutorials exist

Then create /wiki/data/experimental/ directory with these comprehensive data files:

a) /wiki/data/experimental/index.json:
{
  "categories": ["glsl", "gpu-compute", "machine-learning", "generative-systems", "audio-visual", "networking", "python-advanced"],
  "totalTechniques": 0,
  "lastUpdated": "2026-02-21"
}

b) /wiki/data/experimental/glsl.json — GLSL techniques:
At minimum include these techniques with full detail:
- Raymarching / SDF rendering in GLSL TOP
- Reaction-diffusion systems via GLSL
- Feedback loop patterns (GLSL + Feedback TOP)
- Custom post-processing pipelines
- Procedural texture generation
For each technique provide: name, description, operators[], codeExample (real GLSL code), performance (low/medium/high), versionRequirement, useCases[], relatedTechniques[]

c) /wiki/data/experimental/gpu-compute.json — GPU compute patterns:
- Script TOP for GPU buffer operations
- CUDA integration patterns
- Shared memory TOP/CHOP patterns
- GPU instancing via Geometry COMP
- Particle systems using compute shaders

d) /wiki/data/experimental/machine-learning.json — ML integration:
- TouchEngine CHOP/TOP for ML models
- ONNX model integration
- Stable Diffusion via Script TOP
- Real-time pose estimation (MediaPipe patterns)
- Audio ML (classification, generation)
- Version requirement: 2022+ for TouchEngine

e) /wiki/data/experimental/generative-systems.json — generative art techniques:
- L-system implementations in SOPs
- Cellular automata via DAT + Script
- Strange attractors (Lorenz, Rössler) in CHOPs
- Agent-based systems using Replicator COMP
- Recursive network patterns

f) /wiki/data/experimental/audio-visual.json — audio-visual synthesis:
- FFT analysis to geometry (CHOP to SOP)
- Granular synthesis patterns
- MIDI-driven visual generation
- Spectral analysis visualization
- Beat detection algorithms

g) /wiki/data/experimental/networking.json — multi-system networking:
- TouchDesigner OSC server/client setup
- WebSocket DAT for browser integration
- NDI video streaming patterns
- Shared memory CHOP/TOP for inter-process
- Multi-instance synchronization via TDAbleton

h) /wiki/data/experimental/python-advanced.json — advanced Python in TD:
- Asyncio patterns in TD (run() coroutines)
- Custom extensions (tdu.Dependency)
- Python threading with callbacks
- External library integration (numpy, scipy, opencv)
- Custom DAT operators

Update /wiki/data/experimental/index.json with accurate totalTechniques count after creating all files.