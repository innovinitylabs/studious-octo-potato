# Enhanced Brush System Documentation

## Overview

Our Enhanced Brush System is a custom implementation inspired by the p5.brush library, designed to create natural media effects using standard p5.js functions. This system provides advanced brush stroke simulation, pressure sensitivity, vector field integration, and various natural media effects.

## Key Features

### 1. Pressure Simulation
- **BrushPressure.calculate()**: Simulates pressure curves based on stroke progress
- **BrushPressure.gaussian()**: Adds natural pressure variation using Gaussian distribution
- **Configurable pressure curves**: Adjustable start/end pressure factors and min/max ranges

### 2. Vector Field Integration
- **VectorField.createNoiseField()**: Creates organic movement using Perlin noise
- **VectorField.createCircularField()**: Creates radial flow patterns
- **Field influence**: Strokes can follow vector field directions for organic movement

### 3. Enhanced Brush Strokes
- **Multiple overlapping strokes**: Creates natural brush texture
- **Pressure-based variation**: Alpha and weight vary based on pressure simulation
- **Quality-based subdivision**: Strokes are subdivided for smooth curves
- **Vibration and jitter**: Adds natural hand-drawn feel

### 4. Natural Media Effects
- **Natural Media Fill**: Multi-layered fills with bleeding and texture
- **Watercolor Effect**: Simulates watercolor bleeding and layering
- **Hatching System**: Creates texture patterns with configurable angles and spacing

## Core Functions

### enhancedBrushStroke(x1, y1, x2, y2, color, baseAlpha, baseWeight, options)
Draws a brush-like stroke with pressure simulation and vector field integration.

**Parameters:**
- `x1, y1, x2, y2`: Stroke endpoints
- `color`: p5.js color object
- `baseAlpha`: Base opacity (0-255)
- `baseWeight`: Base stroke weight
- `options`: Configuration object with:
  - `pressureVariation`: Pressure variation factor (default: 0.3)
  - `fieldInfluence`: Vector field influence (0-1, default: 0.5)
  - `strokeCount`: Number of overlapping strokes (default: 3)
  - `vibration`: Jitter amount (default: 0.8)
  - `quality`: Stroke subdivision quality (default: 4)

### naturalMediaFill(points, color, baseAlpha, options)
Fills a polygon with natural media texture and bleeding effects.

**Parameters:**
- `points`: Array of [x, y] coordinate pairs
- `color`: p5.js color object
- `baseAlpha`: Base opacity
- `options`: Configuration object with:
  - `bleedStrength`: Bleeding intensity (default: 0.15)
  - `textureStrength`: Texture intensity (default: 0.4)
  - `borderStrength`: Border intensity (default: 0.4)
  - `layers`: Number of fill layers (default: 5)

### watercolorEffect(points, color, baseAlpha, options)
Creates watercolor bleeding effects with multiple expanding layers.

**Parameters:**
- `points`: Array of [x, y] coordinate pairs
- `color`: p5.js color object
- `baseAlpha`: Base opacity
- `options`: Configuration object with:
  - `bleedStrength`: Bleeding intensity (default: 0.2)
  - `textureStrength`: Texture intensity (default: 0.6)
  - `layers`: Number of bleeding layers (default: 8)

### createHatching(points, color, baseAlpha, options)
Creates hatching patterns for texture and shading.

**Parameters:**
- `points`: Array of [x, y] coordinate pairs
- `color`: p5.js color object
- `baseAlpha`: Base opacity
- `options`: Configuration object with:
  - `distance`: Distance between hatch lines (default: 8)
  - `angle`: Base hatching angle (default: PI/4)
  - `opacity`: Hatching opacity (default: 0.3)
  - `variation`: Angle variation (default: 0.2)

## Configuration

The system is configured through the `Example` object:

```javascript
const Example = {
    // Enhanced Brush System Configuration
    useP5Brush: true, // Enable enhanced brush effects
    brushPressureVariation: 0.3, // Pressure variation in brush strokes
    brushFieldInfluence: 0.5, // How much vector fields influence strokes
    brushVibration: 0.8, // Vibration/jitter in brush strokes
    brushQuality: 4, // Quality of brush stroke subdivision
    brushStrokeCount: 3, // Number of overlapping strokes per brush stroke
    
    // Natural Media Effects
    naturalMediaBleedStrength: 0.15, // Bleeding strength for natural media fills
    naturalMediaTextureStrength: 0.4, // Texture strength for fills
    naturalMediaBorderStrength: 0.4, // Border strength for fills
    naturalMediaLayers: 5, // Number of layers for depth
    
    // Watercolor Effects
    watercolorBleedStrength: 0.2, // Bleeding strength for watercolor effects
    watercolorTextureStrength: 0.6, // Texture strength for watercolor
    watercolorLayers: 8, // Number of watercolor layers
    
    // Hatching Configuration
    hatchingDistance: 8, // Distance between hatching lines
    hatchingAngle: PI / 4, // Base angle for hatching
    hatchingOpacity: 0.3, // Opacity of hatching lines
    hatchingVariation: 0.2, // Angle variation in hatching
    
    // Vector Field Configuration
    enableVectorFields: false, // Enable vector field influence
    vectorFieldScale: 0.01, // Scale of noise-based vector fields
    vectorFieldStrength: 30, // Strength of vector field influence
};
```

## Usage Examples

### Basic Brush Stroke
```javascript
enhancedBrushStroke(100, 100, 200, 150, color(255, 0, 0), 80, 2.0);
```

### Brush Stroke with Custom Options
```javascript
enhancedBrushStroke(100, 100, 200, 150, color(255, 0, 0), 80, 2.0, {
    strokeCount: 5,
    vibration: 1.2,
    quality: 6,
    pressureVariation: 0.5
});
```

### Natural Media Fill
```javascript
const points = [[100, 100], [200, 100], [200, 200], [100, 200]];
naturalMediaFill(points, color(0, 0, 255), 60, {
    bleedStrength: 0.2,
    layers: 6
});
```

### Watercolor Effect
```javascript
const points = [[100, 100], [200, 100], [200, 200], [100, 200]];
watercolorEffect(points, color(255, 0, 0), 40, {
    bleedStrength: 0.25,
    layers: 10
});
```

### Hatching Pattern
```javascript
const points = [[100, 100], [200, 100], [200, 200], [100, 200]];
createHatching(points, color(0, 0, 255), 50, {
    distance: 6,
    angle: PI / 6,
    opacity: 0.4
});
```

## Vector Field Integration

### Enable Vector Fields
```javascript
Example.enableVectorFields = true;
VectorField.createNoiseField(0.01, 30);
```

### Create Circular Field
```javascript
VectorField.createCircularField(width/2, height/2, 25);
```

### Disable Vector Fields
```javascript
VectorField.disable();
```

## Advantages Over p5.brush

1. **No External Dependencies**: Uses only standard p5.js functions
2. **Version Compatibility**: Works with any p5.js version
3. **Customizable**: Full control over all brush parameters
4. **Reliable**: No risk of library compatibility issues
5. **Lightweight**: No additional library loading required
6. **Maintainable**: Easy to modify and extend

## Performance Considerations

- **Stroke Count**: Higher values create more realistic brushes but impact performance
- **Quality**: Higher quality values create smoother curves but use more segments
- **Layers**: More layers in fills create richer textures but increase rendering time
- **Vector Fields**: Can impact performance on complex fields

## Tips for Best Results

1. **Start Simple**: Begin with basic brush strokes and gradually add complexity
2. **Balance Parameters**: Find the right balance between realism and performance
3. **Layer Effects**: Combine multiple effects for rich textures
4. **Experiment**: Try different parameter combinations for unique effects
5. **Optimize**: Adjust quality and layer counts based on your needs

## Future Enhancements

Potential improvements could include:
- **Brush Tip Shapes**: Different brush tip geometries
- **Color Blending**: Advanced color mixing effects
- **Texture Maps**: Custom texture patterns
- **Animation**: Animated brush effects
- **GPU Acceleration**: WebGL-based rendering for better performance

## Compression System

The compression system creates focal points where grid lines converge, creating areas of increased visual density and interest.

### Key Features

- **Random Focal Points**: Automatically chooses focal points in the core canvas area
- **Variable Compression Strength**: Configurable intensity of grid convergence
- **Adjustable Radius**: Control over the area affected by compression
- **Smooth Falloff**: Natural transition from compressed to normal grid spacing

### Configuration

```javascript
const Example = {
    // Compression System Configuration
    enableCompression: true, // Enable grid compression towards focal point
    compressionStrengthMin: 0.3, // Minimum compression strength (0-1)
    compressionStrengthMax: 0.7, // Maximum compression strength (0-1)
    compressionRadiusMin: 0.2, // Minimum compression radius (fraction of canvas)
    compressionRadiusMax: 0.4, // Maximum compression radius (fraction of canvas)
    compressionFalloff: 2.0, // How quickly compression falls off (higher = sharper falloff)
};
```

### Usage

The compression system is automatically applied when `enableCompression` is set to `true`. Each regeneration will:

1. **Choose a Random Focal Point**: Positioned away from canvas edges
2. **Set Compression Parameters**: Random strength and radius within configured ranges
3. **Apply Grid Compression**: Modify grid positions based on distance from focal point
4. **Create Visual Convergence**: Grid lines move closer together near the focal point

### Visual Effects

- **Increased Density**: More grid lines per area near the focal point
- **Natural Convergence**: Grid lines smoothly converge towards the center
- **Dynamic Composition**: Each regeneration creates a different focal area
- **Organic Feel**: Creates natural visual interest and movement

### Debug Visualization

To see the compression focal point and parameters, uncomment this line in the draw function:

```javascript
drawCompressionFocalPoint(); // Shows focal point, radius, and strength
```

This will display:
- **Red Circle**: The focal point location
- **Large Circle**: The compression radius
- **Inner Circle**: Compression strength indicator
