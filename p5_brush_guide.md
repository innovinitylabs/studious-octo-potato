# p5.brush.js Library Guide & Examples

*Based on examples from [p5-brush.cargo.site](https://p5-brush.cargo.site/)*

## Overview

**p5.brush.js** is a versatile library for the p5.js ecosystem that extends drawing capabilities with:
- Dynamic and customizable brushes
- Natural fill effects with texture
- Intuitive hatching patterns
- Vector-field integration
- High-resolution artwork optimization

**Author**: Alejandro Campos (Architect, Researcher, Creative Coder based in Rotterdam)

## Core Concepts

### 1. Basic Operations

#### `brush.stroke(color, opacity)`
- Sets brush stroke color and opacity
- Example: `brush.stroke("black", 50)`

#### `brush.fill(color, opacity, bleed, texture)`
- Fills shapes with natural media effects
- Parameters:
  - `color`: RGB string or color object
  - `opacity`: 0-255 alpha value
  - `bleed`: 0-1 bleed factor (default: 0.1)
  - `texture`: "noise", "smooth", or custom texture

#### `brush.hatch(distance, angle, options)`
- Creates hatching patterns
- Parameters:
  - `distance`: Space between hatch lines
  - `angle`: Hatch line angle in radians
  - `options`: Additional hatching parameters

### 2. Advanced Classes

#### `brush.Polygon(pointsArray)`
- Represents multi-sided shapes
- Methods:
  - `.intersect(line)`: Find intersection points
  - `.draw(brush, color, weight)`: Draw polygon
  - `.fill(color, opacity, bleed, texture)`: Fill polygon
  - `.hatch(distance, angle, options)`: Apply hatching

#### `brush.Plot(type)`
- Creates complex stroke paths
- Types: "curve" or "segments"
- Methods:
  - `.addSegment(angle, length, pressure)`: Add path segment
  - `.endPlot(angle, pressure)`: Finalize plot
  - `.rotate(angle)`: Rotate entire plot
  - `.genPol(x, y)`: Generate polygon from plot
  - `.draw(x, y)`: Draw plot with current stroke
  - `.fill(x, y)`: Fill plot with current fill
  - `.hatch(x, y)`: Apply hatching to plot

#### `brush.Position(x, y)`
- Represents points in 2D space
- Integrates with vector fields
- Methods:
  - `.moveTo(length, dir, step_length, isFlow)`: Move along flow field
  - `.plotTo(plot, length, step_length, scale)`: Plot to position
  - `.angle()`: Get vector field angle
  - `.reset()`: Reset plotted distance

### 3. Vector Fields

#### `brush.field(fieldFunction)`
- Defines vector field for organic movement
- Example: `brush.field((x, y) => noise(x * 0.01, y * 0.01) * TWO_PI)`

#### `brush.beginStroke()`
- Starts stroke following vector field
- Creates organic, flowing lines

### 4. Custom Brushes

#### `brush.add(brushName, brushConfig)`
- Creates custom brush types
- Configurable parameters for unique stroke styles

## Example Patterns

### Example 1: Brush Rain
```javascript
// Basic brushing with natural stroke variation
brush.stroke("black", 50);
brush.fill("black", 50);

// Create multiple strokes with slight variations
for (let i = 0; i < 100; i++) {
  let x = random(width);
  let y = random(height);
  brush.stroke("black", random(30, 80));
  // Draw organic strokes
}
```

### Example 2: The Happy Grid
```javascript
// Basic operations: stroke, fill, and hatch
brush.stroke("blue", 60);
brush.fill("red", 40, 0.2, "noise");

// Create grid of shapes
for (let x = 0; x < width; x += 50) {
  for (let y = 0; y < height; y += 50) {
    // Fill with natural texture
    brush.fill("yellow", 30, 0.1, "smooth");
    // Apply hatching
    brush.hatch(10, PI/4, {opacity: 20});
  }
}
```

### Example 3: Stroke Field Mania
```javascript
// Vector field integration
brush.field((x, y) => {
  return noise(x * 0.01, y * 0.01) * TWO_PI;
});

brush.beginStroke();
// Strokes follow the vector field automatically
```

### Example 4: Tip My Face
```javascript
// Custom brush creation
brush.add("customBrush", {
  size: 10,
  pressure: 0.8,
  texture: "noise"
});

// Use custom brush for specific effects
brush.stroke("customBrush", "black", 70);
```

### Example 5: Complex Polygon Operations
```javascript
// Create polygon from points
let points = [[0, 0], [100, 0], [100, 100], [0, 100]];
let polygon = new brush.Polygon(points);

// Fill with natural media effect
polygon.fill("rgb(200, 100, 50)", 80, 0.15, "noise");

// Apply hatching
polygon.hatch(8, PI/6, {opacity: 30});
```

## Integration with Our Project

### Current Usage in the_great_clown.js:

1. **Watercolor Rounded Rectangles**:
   ```javascript
   // Using brush.Polygon for natural fills
   const polygon = new brush.Polygon(points);
   polygon.fill(brushColor, a, 0.1, "noise");
   ```

2. **Gut Lines with brush.Plot**:
   ```javascript
   // Create organic stroke paths
   const plot = new brush.Plot("curve");
   plot.addSegment(angle, length, pressure);
   plot.draw(x, y);
   ```

3. **CMYK Integration**:
   ```javascript
   // Print-ready color conversion
   if (Example.useP5CMYK && typeof cmyk !== 'undefined') {
     cmyk.convert();
   }
   ```

## Best Practices

1. **High Resolution**: Library optimized for high-res artwork, not real-time interaction
2. **Texture Quality**: Use "noise" texture for organic feel, "smooth" for clean fills
3. **Bleed Control**: 0.1-0.2 bleed factor for natural media simulation
4. **Pressure Variation**: Use pressure 0.3-0.8 for realistic stroke variation
5. **Vector Fields**: Combine with noise functions for organic movement

## Advanced Techniques

### Natural Media Simulation
```javascript
// Watercolor effect
brush.fill("blue", 60, 0.2, "noise");
// Multiple layers for depth
brush.fill("blue", 30, 0.1, "smooth");
```

### Complex Hatching
```javascript
// Multi-directional hatching
polygon.hatch(10, 0, {opacity: 20});
polygon.hatch(10, PI/2, {opacity: 15});
polygon.hatch(10, PI/4, {opacity: 10});
```

### Flow Field Integration
```javascript
// Perlin noise flow field
brush.field((x, y) => {
  let angle = noise(x * 0.005, y * 0.005) * TWO_PI;
  return angle;
});
```

## Resources

- **Official Site**: [p5-brush.cargo.site](https://p5-brush.cargo.site/)
- **GitHub**: [github.com/acamposuribe/p5.brush](https://github.com/acamposuribe/p5.brush)
- **Documentation**: Full reference on GitHub
- **Examples**: Available on editor.p5js.org

## Version Information

- **Current Version**: 1.1.4
- **License**: MIT
- **Requires**: p5.js 1.11 or higher

---

*This guide captures the key patterns and techniques from the official p5.brush examples for integration into our generative art project.*
