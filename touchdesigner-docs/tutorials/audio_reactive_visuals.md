# Creating Audio-Reactive Visuals

## Introduction
This tutorial will guide you through creating audio-reactive visuals in TouchDesigner.

## Prerequisites
- Basic understanding of TouchDesigner interface
- Audio input device or audio file

## Steps

### 1. Audio Input Setup
1. Create an **Audio Device In CHOP** or **Audio File In CHOP**
2. Set the device to your audio input
3. Monitor the audio levels in the CHOP viewer

### 2. Audio Analysis
1. Add an **Analyze CHOP** after your audio input
2. Set Function to "RMS Power" for overall volume
3. Add an **Audio Spectrum CHOP** for frequency analysis

### 3. Visual Generation
1. Create a **Circle SOP** for the base geometry
2. Add a **Noise TOP** for texture
3. Create a **Render TOP** to render the geometry

### 4. Connect Audio to Visuals
1. Use a **CHOP to SOP** to drive circle radius with RMS
2. Reference spectrum data to drive noise parameters
3. Map frequency bands to color channels

### 5. Fine-tuning
- Add **Lag CHOP** for smoother motion
- Use **Math CHOP** to scale values appropriately
- Add **Feedback TOP** for trails effect

## Advanced Techniques
- Use multiple frequency bands for complex reactions
- Implement beat detection with **Beat CHOP**
- Create particle systems driven by audio
- Add post-processing effects

## Performance Optimization
- Limit resolution to necessary size
- Use instancing for multiple objects
- Cache static elements
- Monitor GPU usage
