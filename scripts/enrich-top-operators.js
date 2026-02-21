#!/usr/bin/env node
/**
 * Enrich Top Operators Script
 * Adds tips, warnings, version info, and Python examples to the most important operators.
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROCESSED_DIR = join(__dirname, '..', 'wiki', 'data', 'processed');

const enrichments = {
  "noise_chop": {
    version: "Available since TouchDesigner 2018+",
    tips: [
      "Use Transform parameters (Translate, Rotate) to sample different parts of noise space for unique patterns per channel.",
      "Set Type to 'Sparse' for highest quality continuous noise; use 'Random' for white noise.",
      "Increase Harmonics and adjust Roughness to add detail - higher roughness = bumpier noise.",
      "The Seed parameter gives completely different patterns for the same settings - useful for variation.",
      "Works identically with Time Slicing on/off, except Harmonic Summation and Brownian types."
    ],
    warnings: [
      "Constraint parameters only work when Time Slice is Off.",
      "Normalize only works when Time Slice is Off and only for Random and Harmonic Summation types."
    ],
    pythonExamples: [
      {
        title: "Create and Configure Noise CHOP",
        code: "# Create Noise CHOP\nnoise = op('/project1').create(noiseCHOP)\nnoise.name = 'noise1'\n\n# Set noise type\nnoise.par.type = 'sparse'  # Options: sparse, hermite, harmonic, brownian, random, alligator\nnoise.par.seed = 42\nnoise.par.period = 2.0  # Period in seconds\nnoise.par.amp = 1.0\nnoise.par.harmon = 3  # Number of harmonics\nnoise.par.rough = 0.5  # Roughness\n\n# Read noise values\nval = noise['chan1'][0]\nprint(f'Current noise value: {val}')",
        description: "Create a Noise CHOP and configure its parameters"
      }
    ],
    codeExamples: []
  },
  "null_chop": {
    version: "Available since TouchDesigner 2018+",
    tips: [
      "Use Null CHOPs as export endpoints - this lets you swap upstream CHOP networks without re-exporting.",
      "Set Cook Type to 'Selective' to optimize performance by only recooking downstream when values actually change.",
      "Use as a 'breakpoint' in your network for debugging - you can inspect values without affecting the chain."
    ],
    warnings: [
      "The Selective cook type may cause downstream nodes to cook for other reasons like viewing node contents."
    ],
    pythonExamples: [
      {
        title: "Use Null CHOP for Exports",
        code: "# Create Null CHOP for clean exports\nnull1 = op('/project1').create(nullCHOP)\nnull1.name = 'export_null'\nnull1.par.cooktype = 'selective'\nnull1.par.checkvalues = True\n\n# Read values from Null CHOP\nfor chan in null1.chans():\n    print(f'{chan.name}: {chan[0]}')",
        description: "Null CHOP as an export point with selective cooking"
      }
    ],
    codeExamples: []
  },
  "null_top": {
    version: "Available since TouchDesigner 2018+",
    tips: [
      "Use Null TOPs as output points for referencing textures elsewhere in your network.",
      "Null TOPs are lightweight and don't consume extra GPU memory beyond the input texture.",
      "Great for organizing complex networks - name your Null TOPs descriptively (e.g., 'final_output')."
    ],
    warnings: [],
    pythonExamples: [
      {
        title: "Reference Null TOP Output",
        code: "# Reference a Null TOP's texture\noutput = op('final_output')  # Null TOP\nwidth = output.width\nheight = output.height\n\n# Save screenshot\noutput.save('screenshot.png')",
        description: "Using Null TOP as a named reference point"
      }
    ],
    codeExamples: []
  },
  "null_dat": {
    version: "Available since TouchDesigner 2018+",
    tips: [
      "Use Null DATs to create clean reference points for table data.",
      "Like other Null operators, great for exports and organizing complex DAT networks."
    ],
    warnings: [],
    pythonExamples: [
      {
        title: "Read Null DAT Table Data",
        code: "# Read data from Null DAT\ndat = op('null_data')\nfor row in range(dat.numRows):\n    for col in range(dat.numCols):\n        print(f'[{row},{col}]: {dat[row, col]}')",
        description: "Reading table data through a Null DAT"
      }
    ],
    codeExamples: []
  },
  "math_chop": {
    version: "Available since TouchDesigner 2018+",
    tips: [
      "Use the Range page to remap values between different ranges (e.g., 0-1 to -1 to +1).",
      "The Combine CHOPs section lets you add, subtract, multiply or average multiple input channels.",
      "Set 'Match By' to 'Channel Name' when combining CHOPs with different channel orders.",
      "Use Multiply post-operation to scale values quickly."
    ],
    warnings: [
      "When combining channels, mismatched sample rates will be resampled according to the Common page settings."
    ],
    pythonExamples: [
      {
        title: "Configure Math CHOP Range Mapping",
        code: "# Create Math CHOP for range mapping\nmath1 = op('/project1').create(mathCHOP)\nmath1.name = 'remap'\n\n# Set range mapping\nmath1.par.fromrange1 = 0\nmath1.par.fromrange2 = 1\nmath1.par.torange1 = -180\nmath1.par.torange2 = 180\n\n# Read remapped value\nval = math1['chan1'][0]",
        description: "Map CHOP values from one range to another"
      }
    ],
    codeExamples: []
  },
  "switch_top": {
    version: "Available since TouchDesigner 2018+",
    tips: [
      "Use fractional index values for cross-fading between inputs (e.g., 0.5 blends input 0 and input 1).",
      "Wire a CHOP channel to the Index parameter for dynamic switching.",
      "Great for A/B comparisons and live performance switching."
    ],
    warnings: [
      "All inputs cook every frame regardless of which is selected, unless you use the 'Cook' parameter to limit this."
    ],
    pythonExamples: [
      {
        title: "Control Switch TOP Programmatically",
        code: "# Switch between TOP inputs\nswitch1 = op('switch1')\nswitch1.par.index = 0  # Show first input\nswitch1.par.index = 1  # Show second input\nswitch1.par.index = 0.5  # Crossfade between first and second",
        description: "Dynamically switch or crossfade between TOP inputs"
      }
    ],
    codeExamples: []
  },
  "blur_top": {
    version: "Available since TouchDesigner 2018+",
    tips: [
      "Use Pre-Shrink to reduce resolution before blurring for better performance.",
      "Gaussian blur is the most common and natural-looking blur type.",
      "For real-time applications, keep blur size moderate - very large blurs are GPU-intensive."
    ],
    warnings: [
      "Large blur sizes can significantly impact GPU performance. Consider using Pre-Shrink or lower resolution."
    ],
    pythonExamples: [
      {
        title: "Apply Gaussian Blur",
        code: "# Configure Blur TOP\nblur = op('blur1')\nblur.par.size = 10  # Blur radius\nblur.par.type = 'gaussian'",
        description: "Apply Gaussian blur to a TOP"
      }
    ],
    codeExamples: []
  },
  "level_top": {
    version: "Available since TouchDesigner 2018+",
    tips: [
      "Use Level TOP for quick brightness, contrast, and gamma adjustments.",
      "The Opacity parameter is great for fading textures in and out.",
      "Combine with Composite TOP for layered effects."
    ],
    warnings: [],
    pythonExamples: [
      {
        title: "Adjust Levels",
        code: "# Configure Level TOP\nlevel = op('level1')\nlevel.par.opacity = 0.8\nlevel.par.brightness1 = 1.2  # Increase brightness\nlevel.par.gamma1 = 0.8  # Adjust gamma\nlevel.par.contrast = 1.1  # Boost contrast",
        description: "Adjust brightness, gamma, and contrast"
      }
    ],
    codeExamples: []
  },
  "composite_top": {
    version: "Available since TouchDesigner 2018+",
    tips: [
      "Use different operation modes (Over, Add, Multiply, Screen) for various compositing effects.",
      "The 'Over' operation is standard alpha compositing.",
      "Multiple inputs are composited in order - first input is the bottom layer."
    ],
    warnings: [],
    pythonExamples: [
      {
        title: "Composite Multiple Layers",
        code: "# Configure Composite TOP\ncomp = op('comp1')\ncomp.par.operand = 'over'  # Alpha compositing\n# Also: 'add', 'multiply', 'screen', 'subtract'",
        description: "Set up layer compositing"
      }
    ],
    codeExamples: []
  },
  "transform_top": {
    version: "Available since TouchDesigner 2018+",
    tips: [
      "Use Extend mode to control what happens outside the transformed area (hold, zero, repeat, mirror).",
      "Combine translate, rotate, and scale for complex 2D transformations.",
      "The Pivot parameter sets the center of rotation and scale operations."
    ],
    warnings: [],
    pythonExamples: [
      {
        title: "Apply 2D Transform",
        code: "# Configure Transform TOP\nxform = op('transform1')\nxform.par.tx = 0.1  # Translate X\nxform.par.ty = -0.05  # Translate Y\nxform.par.rz = 45  # Rotate 45 degrees\nxform.par.sx = 0.5  # Scale to half size\nxform.par.sy = 0.5\nxform.par.extend = 'zero'  # Black outside bounds",
        description: "Apply translation, rotation, and scale to a texture"
      }
    ],
    codeExamples: []
  },
  "ramp_top": {
    version: "Available since TouchDesigner 2018+",
    tips: [
      "Use Ramp TOP to create gradient textures for color lookup or masking.",
      "Set Type to 'Radial' for circular gradients, 'Linear' for directional gradients.",
      "Combine with Lookup TOP to create color-mapped visualizations."
    ],
    warnings: [],
    pythonExamples: [
      {
        title: "Create Gradient Ramp",
        code: "# Configure Ramp TOP\nramp = op('ramp1')\nramp.par.type = 'linear'  # or 'radial', 'circular'\nramp.par.phase = 0\nramp.par.period = 1",
        description: "Create a linear gradient ramp"
      }
    ],
    codeExamples: []
  },
  "merge_chop": {
    version: "Available since TouchDesigner 2018+",
    tips: [
      "Merge CHOP combines channels from multiple input CHOPs into one CHOP.",
      "Use Duplicate Names to control how channels with the same name are handled.",
      "Great for collecting channels from different sources into a single CHOP for export."
    ],
    warnings: [],
    pythonExamples: [
      {
        title: "Merge Multiple CHOPs",
        code: "# Reference merged channels\nmerge = op('merge1')\nfor chan in merge.chans():\n    print(f'{chan.name}: {chan[0]}')",
        description: "Access merged CHOP channel data"
      }
    ],
    codeExamples: []
  },
  "movie_file_in_top": {
    version: "Available since TouchDesigner 2018+",
    tips: [
      "Use HAP codec for fastest playback performance on GPU.",
      "Set Pre-Read Frames to buffer ahead for smoother playback.",
      "NotchLC and HAP Q provide good quality with GPU-accelerated decoding.",
      "Use the 'File' parameter to load image sequences with patterns like 'image$F4.png'."
    ],
    warnings: [
      "H.264/H.265 decoding uses CPU and may cause frame drops at high resolutions.",
      "Very large files or high frame rates may require SSD storage for smooth playback."
    ],
    pythonExamples: [
      {
        title: "Load and Control Movie Playback",
        code: "# Configure Movie File In TOP\nmovie = op('moviefilein1')\nmovie.par.file = 'path/to/video.mov'\nmovie.par.play = True\nmovie.par.speed = 1.0\nmovie.par.index = 0.5  # Seek to 50%\n\n# Get movie info\nwidth = movie.width\nheight = movie.height",
        description: "Load a video file and control playback"
      }
    ],
    codeExamples: []
  },
  "constant_chop": {
    version: "Available since TouchDesigner 2018+",
    tips: [
      "Use Constant CHOP to define named channels with static values for parameter driving.",
      "Great as a starting point for expressions and exports.",
      "Name channels to match target parameters for easy auto-export (e.g., 'tx', 'ty', 'tz')."
    ],
    warnings: [],
    pythonExamples: [
      {
        title: "Create Constant Values",
        code: "# Create and configure Constant CHOP\nconst = op('/project1').create(constantCHOP)\nconst.name = 'controls'\nconst.par.name0 = 'speed'\nconst.par.value0 = 1.0\nconst.par.name1 = 'scale'\nconst.par.value1 = 0.5\n\n# Read values\nspeed = const['speed'][0]\nscale = const['scale'][0]",
        description: "Create named constant values for parameter driving"
      }
    ],
    codeExamples: []
  },
  "text_dat": {
    version: "Available since TouchDesigner 2018+",
    tips: [
      "Text DAT is the primary container for Python scripts, GLSL shaders, and any text content.",
      "Use the edit callback to run code whenever the text is modified.",
      "Right-click and select 'Run Script' to execute Python code in a Text DAT."
    ],
    warnings: [],
    pythonExamples: [
      {
        title: "Read and Write Text DAT",
        code: "# Read text content\ntext = op('text1').text\n\n# Write text content\nop('text1').text = 'print(\"Hello from TouchDesigner\")'\n\n# Run as script\nop('text1').run()",
        description: "Interact with Text DAT content programmatically"
      }
    ],
    codeExamples: []
  }
};

async function main() {
  let enriched = 0;
  let errors = 0;

  for (const [fileId, enrichment] of Object.entries(enrichments)) {
    try {
      const filePath = join(PROCESSED_DIR, `${fileId}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      // Apply enrichments
      if (enrichment.version) data.version = enrichment.version;
      if (enrichment.tips && enrichment.tips.length > 0) data.tips = enrichment.tips;
      if (enrichment.warnings && enrichment.warnings.length > 0) data.warnings = enrichment.warnings;
      if (enrichment.pythonExamples && enrichment.pythonExamples.length > 0) data.pythonExamples = enrichment.pythonExamples;
      if (enrichment.codeExamples && enrichment.codeExamples.length > 0) data.codeExamples = enrichment.codeExamples;

      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      enriched++;
      console.log(`  Enriched: ${fileId}.json`);
    } catch (err) {
      errors++;
      console.error(`  Error enriching ${fileId}: ${err.message}`);
    }
  }

  console.log(`\nEnriched ${enriched} operators, ${errors} errors`);
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
