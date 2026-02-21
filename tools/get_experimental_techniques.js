/**
 * Get Experimental Techniques Tool
 * Browse TouchDesigner experimental techniques by category.
 * Returns techniques, code snippets, operator chains, and setup notes.
 * v2.9.0: Initial implementation
 * @module tools/get_experimental_techniques
 */

import { z } from "zod";
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EXPERIMENTAL_DIR = join(__dirname, '..', 'wiki', 'data', 'experimental');

// Valid categories and their file names
const CATEGORY_MAP = {
  'glsl':               'glsl.json',
  'gpu-compute':        'gpu-compute.json',
  'machine-learning':   'machine-learning.json',
  'generative-systems': 'generative-systems.json',
  'audio-visual':       'audio-visual.json',
  'networking':         'networking.json',
  'python-advanced':    'python-advanced.json'
};

const CATEGORY_ALIASES = {
  'shader':        'glsl',
  'shaders':       'glsl',
  'raymarching':   'glsl',
  'sdf':           'glsl',
  'gpu':           'gpu-compute',
  'compute':       'gpu-compute',
  'cuda':          'gpu-compute',
  'ml':            'machine-learning',
  'ai':            'machine-learning',
  'ml-ai':         'machine-learning',
  'generative':    'generative-systems',
  'lsystem':       'generative-systems',
  'l-system':      'generative-systems',
  'cellular':      'generative-systems',
  'audio':         'audio-visual',
  'av':            'audio-visual',
  'music':         'audio-visual',
  'fft':           'audio-visual',
  'network':       'networking',
  'osc':           'networking',
  'ndi':           'networking',
  'websocket':     'networking',
  'python':        'python-advanced',
  'numpy':         'python-advanced',
  'opencv':        'python-advanced',
  'scipy':         'python-advanced'
};

// Load a category JSON file
async function loadCategory(categoryKey) {
  const filename = CATEGORY_MAP[categoryKey];
  if (!filename) return null;
  try {
    const raw = await fs.readFile(join(EXPERIMENTAL_DIR, filename), 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[get_experimental_techniques] Failed to load ${filename}:`, err.message);
    return null;
  }
}

// Resolve category key from user input (handles aliases)
function resolveCategory(input) {
  if (!input) return null;
  const lower = input.toLowerCase().trim();
  if (CATEGORY_MAP[lower]) return lower;
  return CATEGORY_ALIASES[lower] || null;
}

// Format a single technique for display
function formatTechnique(tech, showCode = true, showSetup = true) {
  let text = `### ${tech.name}\n`;
  if (tech.description) text += `${tech.description}\n\n`;

  const meta = [];
  if (tech.difficulty) meta.push(`Difficulty: ${tech.difficulty}`);
  if (tech.requiresVersion) meta.push(`Requires: TD ${tech.requiresVersion}`);
  if (meta.length) text += `**${meta.join(' | ')}**\n\n`;

  if (tech.operators && tech.operators.length > 0) {
    text += `**Operators:** ${tech.operators.join(', ')}\n`;
  }
  if (tech.tags && tech.tags.length > 0) {
    text += `**Tags:** ${tech.tags.join(', ')}\n`;
  }

  if (tech.notes) {
    text += `\n> Note: ${tech.notes}\n`;
  }

  if (showSetup && tech.setup) {
    const setup = tech.setup;
    if (setup.description) text += `\n**Setup:** ${setup.description}\n`;
    if (setup.operators_needed && setup.operators_needed.length > 0) {
      text += `\n**Operator Chain:**\n`;
      setup.operators_needed.forEach(node => {
        text += `- **${node.op}**`;
        if (node.purpose) text += ` — ${node.purpose}`;
        if (node.settings) {
          const settingStr = Object.entries(node.settings)
            .map(([k, v]) => `${k}: ${v}`).join(', ');
          text += ` (${settingStr})`;
        }
        text += '\n';
      });
    }
    if (setup.chain) {
      text += `\n**Signal Chain:**\n`;
      setup.chain.forEach((step, i) => {
        text += `${i + 1}. ${step}\n`;
      });
    }
    if (setup.steps) {
      text += `\n**Steps:**\n`;
      setup.steps.forEach((step, i) => {
        text += `${i + 1}. ${step}\n`;
      });
    }
    if (setup.install_command) {
      text += `\n**Install:**\n\`\`\`bash\n${setup.install_command}\n\`\`\`\n`;
    }
    if (setup.uniforms && setup.uniforms.length > 0) {
      text += `\n**Uniforms:**\n`;
      setup.uniforms.forEach(u => {
        text += `- \`${u.name}\` (${u.type}) — source: ${u.source}\n`;
      });
    }
  }

  if (showCode && tech.code) {
    const code = tech.code;
    text += `\n**${code.filename || 'Code'}:**\n`;
    text += `\`\`\`${code.language || 'glsl'}\n${code.snippet}\n\`\`\`\n`;
  }

  // Secondary code (visualization shader, variants, etc.)
  if (showCode && tech.visualization_shader) {
    text += `\n**Visualization Shader (${tech.visualization_shader.description || ''}):**\n`;
    text += `\`\`\`glsl\n${tech.visualization_shader.snippet}\n\`\`\`\n`;
  }

  if (tech.variants && tech.variants.length > 0 && showCode) {
    text += `\n**Variants:**\n`;
    tech.variants.forEach(v => {
      text += `- **${v.name}:** ${v.description}\n`;
      if (v.snippet) text += `  \`\`\`glsl\n${v.snippet}\n  \`\`\`\n`;
    });
  }

  if (tech.workflow) {
    const wf = tech.workflow;
    if (wf.description) text += `\n**Workflow:** ${wf.description}\n`;
    if (wf.steps) wf.steps.forEach((s, i) => { text += `${i+1}. ${s}\n`; });
  }

  if (tech.presets) {
    const pr = tech.presets;
    if (pr.description) text += `\n**Presets (${pr.description}):**\n`;
    if (pr.examples) {
      pr.examples.forEach(ex => {
        text += `- **${ex.name}:** axiom=\`${ex.axiom || ''}\`, angle=${ex.angle || ''}, gen=${ex.generations || ''}`;
        if (ex.note) text += ` (${ex.note})`;
        text += '\n';
      });
    }
  }

  return text + '\n';
}

// Tool schema
export const schema = {
  title: "Get Experimental Techniques",
  description: "Browse TouchDesigner experimental techniques by category. Categories: glsl, gpu-compute, machine-learning, generative-systems, audio-visual, networking, python-advanced. Returns technique descriptions, code snippets, operator chains, and setup notes.",
  inputSchema: {
    category: z.string().describe(
      "Technique category to browse. Options: glsl, gpu-compute, machine-learning, generative-systems, audio-visual, networking, python-advanced. " +
      "Aliases: shader/raymarching/sdf=glsl, gpu/cuda=gpu-compute, ml/ai=machine-learning, generative/lsystem=generative-systems, audio/fft=audio-visual, network/osc/ndi=networking, python/numpy/opencv=python-advanced"
    ),
    technique_id: z.string().optional().describe(
      "Optional specific technique ID to fetch (e.g. 'raymarching_basic', 'reaction_diffusion_gs'). If omitted, returns all techniques in the category."
    ),
    show_code: z.boolean().optional().describe("Include GLSL/Python code snippets in output (default: true)"),
    show_setup: z.boolean().optional().describe("Include operator setup details (default: true)")
  }
};

// Tool handler
export async function handler({ category, technique_id, show_code = true, show_setup = true }) {
  const resolvedCategory = resolveCategory(category);

  // List all categories if category is 'list' or unrecognized
  if (!resolvedCategory || category.toLowerCase() === 'list' || category.toLowerCase() === 'all') {
    let text = `# Experimental Techniques Knowledge Base\n\n`;
    text += `Available categories:\n\n`;
    const categoryDescriptions = {
      'glsl':               'GLSL shaders — raymarching, SDF, reaction-diffusion, feedback loops, procedural textures',
      'gpu-compute':        'GPU Compute — Script TOP buffers, CUDA, shared memory, GPU instancing',
      'machine-learning':   'Machine Learning — TouchEngine, ONNX, Stable Diffusion, MediaPipe (requires TD 2022+)',
      'generative-systems': 'Generative Systems — L-systems, cellular automata, strange attractors, Replicator COMP',
      'audio-visual':       'Audio-Visual — FFT to geometry, granular synthesis, MIDI visuals, beat detection',
      'networking':         'Networking — OSC server/client, WebSocket DAT, NDI streaming, TDAbleton sync',
      'python-advanced':    'Advanced Python — asyncio, tdu.Dependency, threading, numpy/scipy/OpenCV'
    };
    Object.entries(categoryDescriptions).forEach(([key, desc]) => {
      text += `- **${key}**: ${desc}\n`;
    });
    text += `\nUse \`get_experimental_techniques\` with a category name to browse techniques.\n`;
    text += `Use \`search_experimental\` to search across all categories.\n`;
    text += `Use \`get_glsl_pattern\` for specific GLSL patterns with full shader code.\n`;
    return { content: [{ type: "text", text }] };
  }

  const data = await loadCategory(resolvedCategory);
  if (!data) {
    return {
      content: [{
        type: "text",
        text: `Category '${category}' (resolved to '${resolvedCategory}') could not be loaded. ` +
              `Valid categories: ${Object.keys(CATEGORY_MAP).join(', ')}`
      }]
    };
  }

  // Single technique lookup
  if (technique_id) {
    const tech = data.techniques.find(t => t.id === technique_id);
    if (!tech) {
      const ids = data.techniques.map(t => t.id).join(', ');
      return {
        content: [{
          type: "text",
          text: `Technique '${technique_id}' not found in category '${resolvedCategory}'.\n\nAvailable IDs: ${ids}`
        }]
      };
    }
    let text = `# ${data.displayName} — ${tech.name}\n\n`;
    if (data.versionRequirement) text += `> ${data.versionRequirement}\n\n`;
    text += formatTechnique(tech, show_code, show_setup);
    if (data.resources && data.resources.length > 0) {
      text += `## Resources\n`;
      data.resources.forEach(r => { text += `- [${r.title}](${r.url})\n`; });
    }
    return { content: [{ type: "text", text }] };
  }

  // Full category listing
  let text = `# ${data.displayName} — Experimental Techniques\n\n`;
  if (data.description) text += `${data.description}\n\n`;
  if (data.versionRequirement) text += `> ${data.versionRequirement}\n\n`;
  text += `**${data.techniques.length} techniques available:**\n\n`;

  // Group by subcategory
  const bySubcat = {};
  data.techniques.forEach(tech => {
    const sub = tech.subcategory || 'General';
    if (!bySubcat[sub]) bySubcat[sub] = [];
    bySubcat[sub].push(tech);
  });

  for (const [subcat, techs] of Object.entries(bySubcat)) {
    text += `## ${subcat.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}\n\n`;
    techs.forEach(tech => {
      text += formatTechnique(tech, show_code, show_setup);
      text += '---\n\n';
    });
  }

  if (data.resources && data.resources.length > 0) {
    text += `## Resources\n`;
    data.resources.forEach(r => { text += `- [${r.title}](${r.url})\n`; });
    text += '\n';
  }

  text += `*Use \`get_experimental_techniques\` with \`technique_id\` to get a single technique in detail.*\n`;
  text += `*Use \`search_experimental\` to search across all categories.*\n`;

  return { content: [{ type: "text", text }] };
}
