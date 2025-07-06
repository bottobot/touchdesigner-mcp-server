# Noise TOP

## Overview
The Noise TOP generates various types of procedural noise patterns that can be used for textures, displacement maps, or as input to other operators.

## Parameters

### Noise Type
- **Sparse** - Generates sparse convolution noise
- **Hermite** - Smooth interpolated noise
- **Harmon Summation** - Fractal noise with harmonic frequencies
- **Perlin** - Classic Perlin noise
- **Simplex** - Improved Perlin noise variant
- **Worley** - Cellular/Voronoi noise
- **Alligator** - Turbulent noise pattern

### Transform
- **Translate** - Move the noise pattern in X, Y, Z
- **Rotate** - Rotate the noise pattern
- **Scale** - Scale the noise pattern

### Output
- **Monochrome** - Single channel output
- **Color** - RGB output

## Common Use Cases

1. **Texture Generation**
   - Create organic textures for materials
   - Generate displacement maps for geometry
   - Create animated backgrounds

2. **Motion Graphics**
   - Drive particle systems
   - Create organic animations
   - Generate random variations

3. **Data Visualization**
   - Create heat maps
   - Visualize data patterns
   - Generate test patterns

## Performance Tips

- Use lower resolutions when possible
- Cache static noise patterns
- Consider using Simplex over Perlin for better performance
- Limit the number of octaves for fractal noise

## Examples

### Basic Noise Setup
```
# Create a Noise TOP
noise = op('noise1')
noise.par.type = 'simplex'
noise.par.period = 4
noise.par.phase = absTime.seconds * 0.1
```

### Animated Turbulence
```
# Animate noise for turbulent effect
noise.par.transform = 1
noise.par.translate = [0, absTime.seconds * 0.2, 0]
noise.par.harmonicgain = 0.5
noise.par.harmonicoctaves = 4
```
