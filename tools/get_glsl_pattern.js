/**
 * Get GLSL Pattern Tool
 * Retrieve specific GLSL shader patterns with full code, ready to paste into a GLSL TOP.
 * Also searches gpu-compute and other categories for shader-adjacent code.
 * v2.9.0: Initial implementation
 * @module tools/get_glsl_pattern
 */

import { z } from "zod";
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EXPERIMENTAL_DIR = join(__dirname, '..', 'wiki', 'data', 'experimental');

// Pattern index mapping user-friendly names to technique IDs and categories
const PATTERN_INDEX = {
  // Raymarching / SDF
  'raymarching':            { category: 'glsl', id: 'raymarching_basic' },
  'raymarching_basic':      { category: 'glsl', id: 'raymarching_basic' },
  'sdf_sphere':             { category: 'glsl', id: 'raymarching_basic' },
  'sdf_basic':              { category: 'glsl', id: 'raymarching_basic' },
  'sdf':                    { category: 'glsl', id: 'raymarching_basic' },
  'domain_repetition':      { category: 'glsl', id: 'sdf_domain_repetition' },
  'sdf_repeat':             { category: 'glsl', id: 'sdf_domain_repetition' },
  'domain_warp':            { category: 'glsl', id: 'sdf_domain_repetition' },
  // Reaction-Diffusion
  'reaction_diffusion':     { category: 'glsl', id: 'reaction_diffusion_gs' },
  'gray_scott':             { category: 'glsl', id: 'reaction_diffusion_gs' },
  'rd':                     { category: 'glsl', id: 'reaction_diffusion_gs' },
  // Feedback
  'feedback':               { category: 'glsl', id: 'feedback_loop' },
  'feedback_zoom':          { category: 'glsl', id: 'feedback_loop' },
  'zoom_rotate':            { category: 'glsl', id: 'feedback_loop' },
  'trail':                  { category: 'glsl', id: 'feedback_loop' },
  // Procedural
  'fbm':                    { category: 'glsl', id: 'procedural_fbm_texture' },
  'fbm_noise':              { category: 'glsl', id: 'procedural_fbm_texture' },
  'procedural_noise':       { category: 'glsl', id: 'procedural_fbm_texture' },
  'clouds':                 { category: 'glsl', id: 'procedural_fbm_texture' },
  'voronoi':                { category: 'glsl', id: 'voronoi_cellular' },
  'cellular':               { category: 'glsl', id: 'voronoi_cellular' },
  'worley':                 { category: 'glsl', id: 'voronoi_cellular' },
  // Multi-pass
  'multi_pass':             { category: 'glsl', id: 'glsl_multi_pass' },
  'glsl_multi':             { category: 'glsl', id: 'glsl_multi_pass' },
  'gbuffer':                { category: 'glsl', id: 'glsl_multi_pass' },
  // GPU Compute
  'particle_compute':       { category: 'gpu-compute', id: 'compute_shader_glsl' },
  'particle_simulation':    { category: 'gpu-compute', id: 'compute_shader_glsl' },
  'ping_pong':              { category: 'gpu-compute', id: 'compute_shader_glsl' },
  // Cellular Automata
  'game_of_life':           { category: 'generative-systems', id: 'cellular_automata_gol' },
  'gol':                    { category: 'generative-systems', id: 'cellular_automata_gol' },
  'cellular_automata':      { category: 'generative-systems', id: 'cellular_automata_gol' },
  // Boids
  'boids':                  { category: 'generative-systems', id: 'agent_flocking' },
  'flocking':               { category: 'generative-systems', id: 'agent_flocking' },
  'agent_flocking':         { category: 'generative-systems', id: 'agent_flocking' }
};

// Built-in GLSL utility functions that apply to any shader
const GLSL_UTILITIES = {
  'sdf_primitives': {
    name: 'SDF Primitive Library',
    description: 'Collection of signed distance functions for common 3D shapes. Include at the top of any raymarching shader.',
    language: 'glsl',
    code: `// SDF Primitive Library — include in any raymarching GLSL TOP\n// Source: based on Inigo Quilez's SDF functions (https://iquilezles.org)\n\n// --- Basic Primitives ---\nfloat sdSphere(vec3 p, float r) {\n    return length(p) - r;\n}\n\nfloat sdBox(vec3 p, vec3 b) {\n    vec3 q = abs(p) - b;\n    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);\n}\n\nfloat sdCylinder(vec3 p, vec2 h) {\n    // h.x = radius, h.y = half-height\n    vec2 d = abs(vec2(length(p.xz), p.y)) - h;\n    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));\n}\n\nfloat sdTorus(vec3 p, vec2 t) {\n    // t.x = major radius, t.y = minor radius\n    vec2 q = vec2(length(p.xz) - t.x, p.y);\n    return length(q) - t.y;\n}\n\nfloat sdCone(vec3 p, vec2 c, float h) {\n    // c = sin/cos of angle, h = height\n    vec2 q = h * vec2(c.x / c.y, -1.0);\n    vec2 w = vec2(length(p.xz), p.y);\n    vec2 a = w - q * clamp(dot(w, q) / dot(q, q), 0.0, 1.0);\n    vec2 b2 = w - q * vec2(clamp(w.x / q.x, 0.0, 1.0), 1.0);\n    float k = sign(q.y);\n    float d = min(dot(a, a), dot(b2, b2));\n    float s = max(k * (w.x * q.y - w.y * q.x), k * (w.y - q.y));\n    return sqrt(d) * sign(s);\n}\n\nfloat sdCapsule(vec3 p, vec3 a, vec3 b, float r) {\n    vec3 pa = p - a, ba = b - a;\n    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);\n    return length(pa - ba * h) - r;\n}\n\nfloat sdPlane(vec3 p, vec3 n, float h) {\n    return dot(p, normalize(n)) + h;\n}\n\n// --- Boolean Operations ---\nfloat opUnion(float d1, float d2) { return min(d1, d2); }\nfloat opSubtract(float d1, float d2) { return max(-d2, d1); }\nfloat opIntersect(float d1, float d2) { return max(d1, d2); }\n\n// Smooth blend versions (k = blend radius)\nfloat opSmoothUnion(float d1, float d2, float k) {\n    float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);\n    return mix(d2, d1, h) - k * h * (1.0 - h);\n}\nfloat opSmoothSubtract(float d1, float d2, float k) {\n    float h = clamp(0.5 - 0.5 * (d2 + d1) / k, 0.0, 1.0);\n    return mix(d1, -d2, h) + k * h * (1.0 - h);\n}\nfloat opSmoothIntersect(float d1, float d2, float k) {\n    float h = clamp(0.5 - 0.5 * (d2 - d1) / k, 0.0, 1.0);\n    return mix(d2, d1, h) + k * h * (1.0 - h);\n}\n\n// --- Transformations ---\nvec3 opTranslate(vec3 p, vec3 t) { return p - t; }\nvec3 opScale(vec3 p, float s) { return p / s; } // divide SDF result by s too!\nvec3 opRotateY(vec3 p, float angle) {\n    float c = cos(angle), s2 = sin(angle);\n    return vec3(c * p.x + s2 * p.z, p.y, -s2 * p.x + c * p.z);\n}\n\n// Infinite repetition\nvec3 opRepeat(vec3 p, vec3 c) { return mod(p + 0.5 * c, c) - 0.5 * c; }\n\n// --- Noise (for displacement) ---\nvec2 hash2(vec2 p) {\n    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));\n    return fract(sin(p) * 43758.5453);\n}\n\nfloat noise3D(vec3 p) {\n    vec3 i = floor(p);\n    vec3 f = fract(p);\n    vec3 u = f * f * (3.0 - 2.0 * f);\n    return mix(mix(mix(fract(sin(dot(i + vec3(0,0,0), vec3(127.1,311.7,74.7))) * 43758.5453),\n                       fract(sin(dot(i + vec3(1,0,0), vec3(127.1,311.7,74.7))) * 43758.5453), u.x),\n               mix(fract(sin(dot(i + vec3(0,1,0), vec3(127.1,311.7,74.7))) * 43758.5453),\n                       fract(sin(dot(i + vec3(1,1,0), vec3(127.1,311.7,74.7))) * 43758.5453), u.x), u.y),\n           mix(mix(fract(sin(dot(i + vec3(0,0,1), vec3(127.1,311.7,74.7))) * 43758.5453),\n                       fract(sin(dot(i + vec3(1,0,1), vec3(127.1,311.7,74.7))) * 43758.5453), u.x),\n               mix(fract(sin(dot(i + vec3(0,1,1), vec3(127.1,311.7,74.7))) * 43758.5453),\n                       fract(sin(dot(i + vec3(1,1,1), vec3(127.1,311.7,74.7))) * 43758.5453), u.x), u.y), u.z);\n}`
  },
  'color_utils': {
    name: 'GLSL Color Utilities',
    description: 'HSV/RGB conversion, palette functions, and color grading utilities for GLSL shaders.',
    language: 'glsl',
    code: `// GLSL Color Utilities\n\n// --- HSV <-> RGB ---\nvec3 rgb2hsv(vec3 c) {\n    vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);\n    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));\n    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));\n    float d = q.x - min(q.w, q.y);\n    float e = 1.0e-10;\n    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);\n}\n\nvec3 hsv2rgb(vec3 c) {\n    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);\n    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\n    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);\n}\n\n// --- Cosine Palette (Inigo Quilez) ---\n// a, b, c, d are vec3 palette coefficients\nvec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {\n    return a + b * cos(6.28318 * (c * t + d));\n}\n\n// Preset palettes (t: 0..1)\nvec3 paletteFire(float t)   { return palette(t, vec3(0.5,0.0,0.0), vec3(0.5,0.3,0.0), vec3(1.0,0.5,0.5), vec3(0.0,0.0,0.0)); }\nvec3 paletteOcean(float t)  { return palette(t, vec3(0.5,0.5,0.5), vec3(0.5,0.5,0.5), vec3(1.0,1.0,1.0), vec3(0.0,0.33,0.67)); }\nvec3 paletteNeon(float t)   { return palette(t, vec3(0.5,0.5,0.5), vec3(0.5,0.5,0.5), vec3(2.0,1.0,0.0), vec3(0.5,0.2,0.25)); }\nvec3 paletteRainbow(float t){ return palette(t, vec3(0.5,0.5,0.5), vec3(0.5,0.5,0.5), vec3(1.0,1.0,1.0), vec3(0.0,0.33,0.67)); }\n\n// --- Tone Mapping ---\nvec3 tonemapReinhard(vec3 c) { return c / (1.0 + c); }\nvec3 tonemapACES(vec3 x) {\n    float a = 2.51, b = 0.03, c2 = 2.43, d = 0.59, e = 0.14;\n    return clamp((x*(a*x+b))/(x*(c2*x+d)+e), 0.0, 1.0);\n}\n\n// --- Gamma ---\nvec3 linearToSRGB(vec3 c) { return mix(12.92 * c, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }\nvec3 sRGBToLinear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }`
  },
  'math_utils': {
    name: 'GLSL Math Utilities',
    description: 'Rotation matrices, smooth step variants, hash functions, and common math helpers.',
    language: 'glsl',
    code: `// GLSL Math Utilities\n\n// --- Rotation Matrices ---\nmat2 rot2(float a) { float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }\n\nmat3 rotX(float a) { float c=cos(a),s=sin(a); return mat3(1,0,0, 0,c,-s, 0,s,c); }\nmat3 rotY(float a) { float c=cos(a),s=sin(a); return mat3(c,0,s, 0,1,0, -s,0,c); }\nmat3 rotZ(float a) { float c=cos(a),s=sin(a); return mat3(c,-s,0, s,c,0, 0,0,1); }\n\n// Rodrigues rotation around axis n by angle a\nmat3 rotAxis(vec3 n, float a) {\n    n = normalize(n);\n    float c = cos(a), s = sin(a);\n    return mat3(\n        c + n.x*n.x*(1.0-c),     n.x*n.y*(1.0-c)-n.z*s, n.x*n.z*(1.0-c)+n.y*s,\n        n.y*n.x*(1.0-c)+n.z*s,   c + n.y*n.y*(1.0-c),   n.y*n.z*(1.0-c)-n.x*s,\n        n.z*n.x*(1.0-c)-n.y*s,   n.z*n.y*(1.0-c)+n.x*s, c + n.z*n.z*(1.0-c)\n    );\n}\n\n// --- Easing Functions ---\nfloat easeIn(float t, float p)  { return pow(t, p); }\nfloat easeOut(float t, float p) { return 1.0 - pow(1.0-t, p); }\nfloat easeInOut(float t, float p) {\n    return t < 0.5 ? easeIn(t*2.0, p) * 0.5 : 0.5 + easeOut(t*2.0-1.0, p) * 0.5;\n}\nfloat smootherstep(float e0, float e1, float t) {\n    t = clamp((t-e0)/(e1-e0), 0.0, 1.0);\n    return t*t*t*(t*(t*6.0-15.0)+10.0); // 6t^5-15t^4+10t^3\n}\n\n// --- Hash Functions ---\nfloat hash11(float p) { return fract(sin(p) * 43758.5453123); }\nfloat hash12(vec2 p)  { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }\nvec2  hash21(float p) { return fract(sin(vec2(p, p+1.0)) * vec2(43758.5, 22578.1)); }\nvec2  hash22(vec2 p)  { return fract(sin(vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)))) * 43758.5453); }\nvec3  hash31(float p) { return fract(sin(vec3(p,p+1.0,p+2.0)) * vec3(43758.5,22578.1,19642.3)); }\n\n// --- UV Helpers ---\n// Aspect-correct UV from 0..1 to -1..1 with pixel aspect\nvec2 uvToScreen(vec2 uv, vec2 resolution) {\n    vec2 s = uv * 2.0 - 1.0;\n    s.x *= resolution.x / resolution.y;\n    return s;\n}\n\n// Polar coordinates\nvec2 toPolar(vec2 p)      { return vec2(length(p), atan(p.y, p.x)); }\nvec2 fromPolar(vec2 polar) { return polar.x * vec2(cos(polar.y), sin(polar.y)); }`
  }
};

// Load a category file
async function loadCategory(categoryKey) {
  const CATEGORY_FILE_MAP = {
    'glsl':               'glsl.json',
    'gpu-compute':        'gpu-compute.json',
    'machine-learning':   'machine-learning.json',
    'generative-systems': 'generative-systems.json',
    'audio-visual':       'audio-visual.json',
    'networking':         'networking.json',
    'python-advanced':    'python-advanced.json'
  };
  const file = CATEGORY_FILE_MAP[categoryKey];
  if (!file) return null;
  try {
    const raw = await fs.readFile(join(EXPERIMENTAL_DIR, file), 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[get_glsl_pattern] Failed to load ${file}:`, err.message);
    return null;
  }
}

// Build the full pattern listing for the "list" view
function buildPatternList() {
  const seen = new Set();
  const items = [];
  for (const [alias, ref] of Object.entries(PATTERN_INDEX)) {
    const key = `${ref.category}/${ref.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      items.push({ alias, category: ref.category, id: ref.id });
    }
  }
  const utilItems = Object.entries(GLSL_UTILITIES).map(([id, u]) => ({
    alias: id, category: 'utilities', id, name: u.name, description: u.description
  }));
  return { patterns: items, utilities: utilItems };
}

// Tool schema
export const schema = {
  title: "Get GLSL Pattern",
  description: "Retrieve specific GLSL shader patterns or GPU technique code snippets with full code ready to paste into a TouchDesigner GLSL TOP. Also provides common GLSL utility libraries. Use 'list' to see all available patterns.",
  inputSchema: {
    pattern: z.string().describe(
      "Pattern name to retrieve. Use 'list' to see all available patterns. " +
      "Examples: 'raymarching', 'reaction_diffusion', 'fbm', 'voronoi', 'feedback_zoom', " +
      "'game_of_life', 'boids', 'particle_compute', 'sdf_primitives', 'color_utils', 'math_utils'"
    ),
    include_utilities: z.boolean().optional().describe(
      "Include GLSL utility functions (SDF primitives, color utils, math utils) alongside the pattern code (default: false)"
    )
  }
};

// Tool handler
export async function handler({ pattern, include_utilities = false }) {
  const lowerPattern = (pattern || '').toLowerCase().trim();

  // List all available patterns
  if (!lowerPattern || lowerPattern === 'list' || lowerPattern === 'all' || lowerPattern === 'help') {
    const { patterns, utilities } = buildPatternList();
    let text = `# Available GLSL Patterns\n\n`;
    text += `Use \`get_glsl_pattern\` with one of these pattern names to retrieve full shader code.\n\n`;

    // Group by category
    const byCategory = {};
    patterns.forEach(p => {
      if (!byCategory[p.category]) byCategory[p.category] = [];
      byCategory[p.category].push(p);
    });

    const categoryNames = {
      'glsl':               'GLSL Shaders',
      'gpu-compute':        'GPU Compute',
      'generative-systems': 'Generative Systems'
    };

    for (const [cat, items] of Object.entries(byCategory)) {
      text += `## ${categoryNames[cat] || cat}\n`;
      items.forEach(item => {
        text += `- \`${item.id}\` (aliases: \`${item.alias}\`)\n`;
      });
      text += '\n';
    }

    text += `## Utility Libraries\n`;
    utilities.forEach(u => {
      text += `- \`${u.id}\` — ${u.name}: ${u.description}\n`;
    });

    text += `\n*Example: \`get_glsl_pattern\` with pattern=\`raymarching\` to get a complete raymarching shader.*\n`;
    text += `*Add \`include_utilities: true\` to also get SDF primitives and color utils.*\n`;

    return { content: [{ type: "text", text }] };
  }

  // Check built-in utility patterns first
  if (GLSL_UTILITIES[lowerPattern]) {
    const util = GLSL_UTILITIES[lowerPattern];
    let text = `# GLSL Utility: ${util.name}\n\n`;
    text += `${util.description}\n\n`;
    text += `**Instructions:** Copy this code and paste at the top of your GLSL TOP pixel shader, before your main() function.\n\n`;
    text += `\`\`\`${util.language}\n${util.code}\n\`\`\`\n\n`;
    text += `*This is a utility library — combine with a complete shader (e.g. \`get_glsl_pattern\` with pattern=\`raymarching\`).*\n`;
    return { content: [{ type: "text", text }] };
  }

  // Look up pattern in index
  const ref = PATTERN_INDEX[lowerPattern];
  if (!ref) {
    // Try partial match
    const partialMatches = Object.keys(PATTERN_INDEX).filter(k => k.includes(lowerPattern));
    let text = `Pattern '${pattern}' not found.\n\n`;
    if (partialMatches.length > 0) {
      text += `**Partial matches:** ${partialMatches.join(', ')}\n\n`;
    }
    text += `Use \`get_glsl_pattern\` with pattern=\`list\` to see all available patterns.\n`;
    return { content: [{ type: "text", text }] };
  }

  // Load the category
  const data = await loadCategory(ref.category);
  if (!data) {
    return {
      content: [{
        type: "text",
        text: `Failed to load pattern data for category '${ref.category}'. Server error.`
      }]
    };
  }

  // Find the technique
  const tech = data.techniques.find(t => t.id === ref.id);
  if (!tech) {
    return {
      content: [{
        type: "text",
        text: `Technique '${ref.id}' not found in category '${ref.category}'.`
      }]
    };
  }

  // Build the response
  let text = `# GLSL Pattern: ${tech.name}\n\n`;
  if (tech.description) text += `${tech.description}\n\n`;

  const meta = [];
  if (tech.difficulty) meta.push(`Difficulty: ${tech.difficulty}`);
  if (tech.requiresVersion) meta.push(`Requires: TD ${tech.requiresVersion}`);
  if (meta.length) text += `**${meta.join(' | ')}**\n\n`;

  if (tech.operators && tech.operators.length > 0) {
    text += `**Operators:** ${tech.operators.join(', ')}\n`;
  }

  if (tech.notes) {
    text += `\n> ${tech.notes}\n\n`;
  }

  // Setup
  if (tech.setup) {
    const setup = tech.setup;
    if (setup.description) text += `**Setup:** ${setup.description}\n\n`;
    if (setup.operators_needed && setup.operators_needed.length > 0) {
      text += `**Operator Chain:**\n`;
      setup.operators_needed.forEach(node => {
        text += `1. **${node.op}**`;
        if (node.purpose) text += ` — ${node.purpose}`;
        if (node.settings && Object.keys(node.settings).length > 0) {
          const s = Object.entries(node.settings).map(([k,v]) => `${k}: ${v}`).join(', ');
          text += `\n   Settings: ${s}`;
        }
        text += '\n';
      });
      text += '\n';
    }
    if (setup.uniforms && setup.uniforms.length > 0) {
      text += `**Uniforms to set in GLSL TOP:**\n`;
      setup.uniforms.forEach(u => {
        text += `- \`${u.name}\` (${u.type}) — source: \`${u.source}\`\n`;
      });
      text += '\n';
    }
  }

  // Main code
  if (tech.code && tech.code.snippet) {
    text += `## Full Shader Code\n\n`;
    text += `**File:** \`${tech.code.filename || 'shader.glsl'}\`  `;
    text += `**Language:** ${tech.code.language || 'glsl'}\n\n`;
    text += `\`\`\`${tech.code.language || 'glsl'}\n${tech.code.snippet}\n\`\`\`\n\n`;
  }

  // Secondary code (visualization, variants)
  if (tech.visualization_shader) {
    text += `## Visualization Shader\n\n`;
    if (tech.visualization_shader.description) text += `${tech.visualization_shader.description}\n\n`;
    text += `\`\`\`glsl\n${tech.visualization_shader.snippet}\n\`\`\`\n\n`;
  }

  if (tech.variants && tech.variants.length > 0) {
    text += `## Variants\n\n`;
    tech.variants.forEach(v => {
      text += `### ${v.name}\n${v.description}\n\n`;
      if (v.snippet) text += `\`\`\`glsl\n${v.snippet}\n\`\`\`\n\n`;
    });
  }

  // Include utilities if requested
  if (include_utilities) {
    text += `---\n\n## Included Utilities\n\n`;
    for (const [uid, util] of Object.entries(GLSL_UTILITIES)) {
      text += `### ${util.name}\n${util.description}\n\n`;
      text += `\`\`\`glsl\n${util.code}\n\`\`\`\n\n`;
    }
  } else {
    text += `---\n\n*Tip: Add \`include_utilities: true\` to also get SDF primitives library, color utils, and math helpers.*\n`;
  }

  // Resources from category
  if (data.resources && data.resources.length > 0) {
    text += `\n## Resources\n`;
    data.resources.slice(0, 4).forEach(r => { text += `- [${r.title}](${r.url})\n`; });
  }

  return { content: [{ type: "text", text }] };
}
