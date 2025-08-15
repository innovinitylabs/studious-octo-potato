/*
	The Great Clown — fresh build focused on a gridded composition with
	parabolic (rounded) junctions.

	What is special here?
	- Each cell is a single bordered rectangle. The four sides are straight,
	  but the four corners are replaced by cubic Bézier arcs designed to feel
	  parabolic. This yields blocky tiles that soften at their junctions.
	- The grid uses a small number of columns/rows so the blocks read large.
	  Column widths and row heights are non-uniform to avoid rigid repetition.
	- The whole left half is drawn and then mirrored to the right with a tiny
	  registration jitter to keep a hand-pulled print vibe.
	- Red/pink circular motifs are sprinkled at interior grid intersections,
	  layered with a subtle wash and a paper texture overlay.

	Parabolic corner model (intuition):
	- For each corner we choose a radius r and a handle scale k.
	- We draw a cubic Bézier between the two straight edges. The two control
	  points are placed along the tangents of each edge at a distance r*k.
	  For k ≈ 1.5–2 the curve visually approximates a parabola more than a
	  perfect circular arc, which matches the etched/pressed look of the
	  reference print.

	Controls: R randomize · S save
*/

"use strict";

// ---------------------------------
// Config
// ---------------------------------
/**
	Core parameters for rendering. Tweak these live while exploring:
	- cols/rows: coarse grid resolution (left half only; mirrored after)
	- lineWeight*: stroke thickness range for cell borders
	- cornerRadius*Frac: min/max corner rounding as a fraction of local cell
	  size; higher values → rounder junctions
	- curveK*: scales Bézier handle length relative to radius; larger values
	  produce a more parabolic, less circular feel
	- circle*: distribution + sizes of red/pink dots at intersections
	- symmetryJitter: small sub-pixel registration offset for the mirrored pass
	- washOpacity/textureOpacity: post effects strength
*/
const Config = {
	canvasWidth: 800,
	canvasHeight: 1200,
	cols: 2, // mirrored → 4 across
	rows: 3,

	// Line bands
	linesPerBorderMin: 1,
	linesPerBorderMax: 1,
	lineSpacingMin: 1.0,
	lineSpacingMax: 1.0,
	lineWeightMin: 1.6,
	lineWeightMax: 1.6,
	lineAlpha: 255,

	// Intersection rounding (parabolic feel)
	cornerRadiusMinFrac: 0.2, // of min(cellW, cellH)
	cornerRadiusMaxFrac: 0.2,
	curveKMin: 0.5523, // handle length ≈ 0.5523 * r gives near-circular arc
	curveKMax: 0.5523,

	// Circles
	circleProbability: 0.26,
	circleSizeMin: 18,
	circleSizeMax: 69,

	// Presentation
	symmetryJitter: 2.0,
	washOpacity: 26,
	textureOpacity: 0.22
};

// Extra controls for pebble-like edge bands (multi-line ink along seams)
const Pebble = {
	vertLinesMin: 3,
	vertLinesMax: 7,
	horzLinesMin: 2,
	horzLinesMax: 6,
	bandWidthMin: 2.5,
	bandWidthMax: 6.5,
	bulgeIntensity: 0.22, // fraction of local cell size
	strokeAlpha: 90,
	weightMin: 0.7,
	weightMax: 1.6,
	redInkChance: 0.18 // chance a strand uses a reddish tint instead of blue-gray
};

// Clean grid example controls (for the provided rounded-rect mock)
const Example = {
	// Library integration flags
	useP5Brush: true, // Custom brush effects enabled
	useP5Bezier: true,
	useP5CMYK: true,
	useP5Anaglyph: false, // for future multi-color effects
	// Dynamic rows/cols — chosen on regenerate() between these min/max values
	minCols: 20,
	maxCols: 30,
	minRows: 30,
	maxRows: 50,
	cols: 4, // populated/overridden at runtime
	rows: 3, // populated/overridden at runtime

    gapX: 6.9, // horizontal gap in pixels
    gapY: 4.2, // vertical gap in pixels (tighter per request)
	cornerRadiusFrac: 0.14, // of tile min(w,h)
	strokeWeight: 1.0,
	barCount: 7, // optional center bars
	barWidthFrac: 0.012, // of canvas width
	barSpacingFrac: 0.012,
	drawBars: false, // default off per latest request
	colWidthWeightMin: 0.8, // randomness for non-fixed widths
	colWidthWeightMax: 1.4,
	rowHeightWeightMin: 0.8,
	rowHeightWeightMax: 1.6,

	// Watercolor stroke feel
	wcLayersMin: 6,
	wcLayersMax: 12,
	wcJitter: 0.8, // px
	wcAlphaMin: 30,
	wcAlphaMax: 110,
	// Frayed edge parameters
	frayStep: 2.2, // sampling step along the path (px)
	frayAmpMin: 0.6,
	frayAmpMax: 1.0,
	frayNoiseFreq: 0.08,
	frayOutwardBias: 0.7, // probability to bias displacement outward
	
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
	hatchingAngle: Math.PI / 4, // Base angle for hatching
	hatchingOpacity: 0.1, // Opacity of hatching lines
	hatchingVariation: 0.2, // Angle variation in hatching
	
	// Vector Field Configuration
	enableVectorFields: false, // Enable vector field influence
	vectorFieldScale: 0.01, // Scale of noise-based vector fields
	vectorFieldStrength: 30, // Strength of vector field influence
	
	// Compression System Configuration
	enableCompression: true, // Enable grid compression towards focal point
	compressionStrengthMin: 0.95, // Minimum compression strength (0-1) - extremely strong
	compressionStrengthMax: 0.99, // Maximum compression strength (0-1) - almost complete
	compressionRadiusMin: 0.4, // Minimum compression radius (fraction of canvas) - reasonable size
	compressionRadiusMax: 0.6, // Maximum compression radius (fraction of canvas) - reasonable size
	compressionFalloff: 2.0, // Sharp falloff for dramatic effect
};

// Palette
const RawPalette = {
	deepRed: [200, 30, 30],
	softPink: [255, 200, 200],
	mutedBlueGray: [150, 160, 180],
	warmBeige: [240, 230, 210]
};

let Palette = {};

// ---------------------------------
// Enhanced Brush System (inspired by p5.brush)
// ---------------------------------

// Brush pressure simulation
const BrushPressure = {
    // Pressure curve simulation
    curve: [0.15, 0.2], // [start, end] pressure factors
    min_max: [1.2, 0.9], // [min, max] pressure range
    
    // Calculate pressure based on stroke progress
    calculate: function(progress, length) {
        const t = progress / length;
        const pressureCurve = this.curve[0] + (this.curve[1] - this.curve[0]) * t;
        const pressure = map(pressureCurve, 0, 1, this.min_max[0], this.min_max[1]);
        return constrain(pressure, this.min_max[1], this.min_max[0]);
    },
    
    // Gaussian pressure variation
    gaussian: function(progress, length, variation = 0.3) {
        const basePressure = this.calculate(progress, length);
        const gaussianVariation = randomGaussian(0, variation);
        return constrain(basePressure + gaussianVariation, this.min_max[1], this.min_max[0]);
    }
};

// Vector field system for organic movement
const VectorField = {
    isActive: false,
    field: null,
    resolution: 50,
    
    // Create a noise-based vector field
    createNoiseField: function(scale = 0.01, strength = 30) {
        this.isActive = true;
        this.field = function(x, y) {
            const angle = noise(x * scale, y * scale) * TWO_PI;
            return angle * strength;
        };
    },
    
    // Create a circular field
    createCircularField: function(centerX, centerY, strength = 30) {
        this.isActive = true;
        this.field = function(x, y) {
            const dx = x - centerX;
            const dy = y - centerY;
            return atan2(dy, dx) * strength;
        };
    },
    
    // Get field angle at position
    getAngle: function(x, y) {
        if (!this.isActive || !this.field) return 0;
        return this.field(x, y);
    },
    
    // Disable vector field
    disable: function() {
        this.isActive = false;
        this.field = null;
    }
};

// Enhanced brush stroke with pressure and field integration
function enhancedBrushStroke(x1, y1, x2, y2, color, baseAlpha, baseWeight, options = {}) {
    const {
        pressureVariation = Example.brushPressureVariation,
        fieldInfluence = Example.brushFieldInfluence,
        strokeCount = Example.brushStrokeCount,
        vibration = Example.brushVibration,
        quality = Example.brushQuality
    } = options;
    
    const length = dist(x1, y1, x2, y2);
    const baseAngle = atan2(y2 - y1, x2 - x1);
    
    for (let i = 0; i < strokeCount; i++) {
        // Calculate pressure for this stroke
        const progress = (i / strokeCount) * length;
        const pressure = BrushPressure.gaussian(progress, length, pressureVariation);
        
        // Apply vector field influence
        let finalAngle = baseAngle;
        if (VectorField.isActive) {
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const fieldAngle = VectorField.getAngle(midX, midY);
            finalAngle = lerp(baseAngle, fieldAngle, fieldInfluence);
        }
        
        // Add vibration and jitter
        const vibrationOffset = random(-vibration, vibration);
        const perpAngle = finalAngle + HALF_PI;
        const offsetX = cos(perpAngle) * vibrationOffset;
        const offsetY = sin(perpAngle) * vibrationOffset;
        
        // Vary alpha and weight based on pressure
        const alpha = baseAlpha * pressure * random(0.7, 1.3);
        const weight = baseWeight * pressure * random(0.8, 1.2);
        
        // Add jitter to endpoints
        const jitterX1 = random(-1, 1);
        const jitterY1 = random(-1, 1);
        const jitterX2 = random(-1, 1);
        const jitterY2 = random(-1, 1);
        
        // Draw the stroke with quality-based subdivision
        const segments = Math.ceil(length / quality);
        for (let s = 0; s < segments; s++) {
            const t1 = s / segments;
            const t2 = (s + 1) / segments;
            
            const px1 = lerp(x1, x2, t1) + offsetX + jitterX1;
            const py1 = lerp(y1, y2, t1) + offsetY + jitterY1;
            const px2 = lerp(x1, x2, t2) + offsetX + jitterX2;
            const py2 = lerp(y1, y2, t2) + offsetY + jitterY2;
            
            stroke(red(color), green(color), blue(color), alpha);
            strokeWeight(weight);
            line(px1, py1, px2, py2);
        }
    }
}

// Natural media fill with bleeding and texture
function naturalMediaFill(points, color, baseAlpha, options = {}) {
    const {
        bleedStrength = 0.15,
        textureStrength = 0.4,
        borderStrength = 0.4,
        layers = 5
    } = options;
    
    // Create multiple layers for depth
    for (let layer = 0; layer < layers; layer++) {
        const layerAlpha = baseAlpha * (1 - layer * 0.2);
        const layerBleed = bleedStrength * (1 + layer * 0.3);
        
        // Create jittered polygon for natural edge
        const jitteredPoints = points.map(pt => {
            const jitterX = random(-layerBleed * 10, layerBleed * 10);
            const jitterY = random(-layerBleed * 10, layerBleed * 10);
            return [pt[0] + jitterX, pt[1] + jitterY];
        });
        
        // Fill with texture variation
        fill(red(color), green(color), blue(color), layerAlpha);
        noStroke();
        
        beginShape();
        for (let pt of jitteredPoints) {
            vertex(pt[0], pt[1]);
        }
        endShape(CLOSE);
        
        // Add border texture
        if (layer === 0 && borderStrength > 0) {
            stroke(red(color), green(color), blue(color), layerAlpha * borderStrength);
            strokeWeight(1);
            noFill();
            
            beginShape();
            for (let pt of jitteredPoints) {
                vertex(pt[0], pt[1]);
            }
            endShape(CLOSE);
        }
    }
}

// Hatching system for texture
function createHatching(points, color, baseAlpha, options = {}) {
    const {
        distance = 8,
        angle = Math.PI / 4,
        opacity = 0.3,
        variation = 0.2
    } = options;
    
    // Calculate bounding box
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (let pt of points) {
        minX = min(minX, pt[0]);
        maxX = max(maxX, pt[0]);
        minY = min(minY, pt[1]);
        maxY = max(maxY, pt[1]);
    }
    
    // Create hatching lines
    const hatchCount = Math.ceil((maxX - minX + maxY - minY) / distance);
    
    for (let i = 0; i < hatchCount; i++) {
        const offset = i * distance;
        const hatchAngle = angle + random(-variation, variation);
        
        // Calculate hatch line endpoints
        const cosA = cos(hatchAngle);
        const sinA = sin(hatchAngle);
        
        let x1, y1, x2, y2;
        
        if (abs(cosA) > abs(sinA)) {
            // Horizontal hatching
            x1 = minX + offset;
            y1 = minY;
            x2 = minX + offset;
            y2 = maxY;
        } else {
            // Vertical hatching
            x1 = minX;
            y1 = minY + offset;
            x2 = maxX;
            y2 = minY + offset;
        }
        
        // Draw hatch line with brush effect
        enhancedBrushStroke(x1, y1, x2, y2, color, baseAlpha * opacity, 0.5, {
            strokeCount: 1,
            vibration: 0.3
        });
    }
}

// Watercolor effect with bleeding
function watercolorEffect(points, color, baseAlpha, options = {}) {
    const {
        bleedStrength = 0.2,
        textureStrength = 0.6,
        layers = 8
    } = options;
    
    // Create multiple bleeding layers
    for (let layer = 0; layer < layers; layer++) {
        const layerAlpha = baseAlpha * (1 - layer * 0.1);
        const layerBleed = bleedStrength * (1 + layer * 0.5);
        
        // Create expanded polygon for bleeding effect
        const expandedPoints = [];
        for (let i = 0; i < points.length; i++) {
            const pt = points[i];
            const nextPt = points[(i + 1) % points.length];
            
            // Calculate outward normal
            const dx = nextPt[0] - pt[0];
            const dy = nextPt[1] - pt[1];
            const length = sqrt(dx * dx + dy * dy);
            
            if (length > 0) {
                const nx = -dy / length;
                const ny = dx / length;
                
                const bleedDistance = layerBleed * random(5, 15);
                expandedPoints.push([
                    pt[0] + nx * bleedDistance,
                    pt[1] + ny * bleedDistance
                ]);
            }
        }
        
        // Fill with watercolor texture
        fill(red(color), green(color), blue(color), layerAlpha);
        noStroke();
        
        beginShape();
        for (let pt of expandedPoints) {
            vertex(pt[0], pt[1]);
        }
        endShape(CLOSE);
    }
}

// ---------------------------------
// State
// ---------------------------------
let gridX = [];
let gridY = [];
let cornerR = []; // [i][j]
let cornerK = []; // [i][j]
let seedValue = Math.floor(Math.random() * 1e9);
let paperTextureGfx = null;

// Compression focal point system
let compressionCenter = { x: 0, y: 0 };
let compressionStrength = 0.0;
let compressionRadius = 0.0;

// ---------------------------------
// Setup / Draw
// ---------------------------------
function setup() {
	// Create a portrait canvas and attach it to the DOM container. We render
	// at device pixel density to keep fine lines crisp.
	const container = document.getElementById("container");
	const cnv = createCanvas(Config.canvasWidth, Config.canvasHeight);
	if (container) cnv.parent(container);
	noLoop();
	pixelDensity(2);
	smooth();

	// Initialize p5.cmyk if enabled
	if (Example.useP5CMYK && typeof cmyk !== 'undefined') {
		cmyk.setup();
	}

	Palette = Object.fromEntries(Object.entries(RawPalette).map(([k, rgb]) => [k, color(...rgb)]));
	regenerate();

	// Initialize vector field system if enabled
	if (Example.enableVectorFields) {
		VectorField.createNoiseField(Example.vectorFieldScale, Example.vectorFieldStrength);
	}
}

function draw() {
    // Paper background first, then ink
    renderPaperBackground();

    // Draw compression visualization (background)
    drawCompressionVisualization();

    // For the example view: clean rounded-rect tiles + center bar stack
    renderRoundedRectExample();

    // Use enhanced brush effects for natural brush strokes
    if (Example.useP5Brush) {
        // Add some additional subtle brush texture overlays
        const overlayCount = Math.floor(random(2, 5));
        for (let i = 0; i < overlayCount; i++) {
            const col = random([Palette.mutedBlueGray, Palette.deepRed]);
            const alpha = random(10, 30);
            
            // Create organic texture strokes
            const strokeCount = Math.floor(random(3, 8));
            for (let s = 0; s < strokeCount; s++) {
                const startX = random(width);
                const startY = random(height);
                const strokeLength = random(15, 40);
                const angle = random(TWO_PI);
                const endX = startX + cos(angle) * strokeLength;
                const endY = startY + sin(angle) * strokeLength;
                
                enhancedBrushStroke(startX, startY, endX, endY, col, alpha, random(0.3, 0.8), {
                    strokeCount: 1,
                    vibration: 0.9,
                    quality: 2
                });
            }
        }
    }

    // Draw compression focal point (for debugging - can be disabled)
    drawCompressionFocalPoint();

    // Apply CMYK conversion for print-ready output if enabled
    if (Example.useP5CMYK && typeof cmyk !== 'undefined') {
        cmyk.convert();
    }
}

function regenerate() {
	// Seed PRNG + Perlin and rebuild all dependent data.
	randomSeed(seedValue);
	noiseSeed(seedValue);
	// Choose dynamic grid size each regeneration
	Example.cols = Math.floor(random(Example.minCols, Example.maxCols + 1));
	Example.rows = Math.floor(random(Example.minRows, Example.maxRows + 1));
	
	// Update Config with the new grid size
	Config.cols = Example.cols;
	Config.rows = Example.rows;
	
	// Initialize compression system (now with correct grid size)
	initializeCompression();
	
	buildGrid();
	buildCorners();
	buildPaperTexture();
	redraw();
}

function keyPressed() {
	// Simple UX helpers for fast iteration.
	if (key === "r" || key === "R") {
		seedValue = Math.floor(Math.random() * 1e9);
		regenerate();
	}
	if (key === "s" || key === "S") saveCanvas("the_great_clown", "png");
}

// ---------------------------------
// Grid computation
// ---------------------------------
/**
	Compute non-uniform grid coordinates for the left half of the canvas.
	We start at 0 and accumulate proportional widths/heights so the last
	coordinate lands exactly at width/2 or height.
*/
function buildGrid() {
	gridX = [0];
	gridY = [0];

	console.log("=== GRID BUILD DEBUG ===");
	console.log("Config.cols:", Config.cols, "Config.rows:", Config.rows);
	console.log("Canvas width:", width, "Canvas height:", height);

	// Variable column widths — heavier randomness here produces a mix of
	// squarer and more elongated cells while still filling the full canvas.
    let accX = 0;
    const gutterX = width * 0.02; // Reduced gutter for more tiles
    const tileW = (width - gutterX * (Config.cols + 1)) / Config.cols;
    console.log("Gutter X:", gutterX, "Tile W:", tileW);
    
    for (let i = 0; i < Config.cols; i++) {
        accX += gutterX + tileW;
        gridX.push(accX);
    }
    
    // Ensure the last grid line reaches the canvas edge
    if (gridX[gridX.length - 1] < width) {
        gridX[gridX.length - 1] = width;
    }

	// Variable row heights — same proportional approach as columns.
    let accY = 0;
    const gutterY = height * 0.02; // Reduced gutter for more tiles
    const tileH = (height - gutterY * (Config.rows + 1)) / Config.rows;
    console.log("Gutter Y:", gutterY, "Tile H:", tileH);
    
    for (let j = 0; j < Config.rows; j++) {
        accY += gutterY + tileH;
        gridY.push(accY);
    }
    
    // Ensure the last grid line reaches the canvas edge
    if (gridY[gridY.length - 1] < height) {
        gridY[gridY.length - 1] = height;
    }
    
    console.log("Grid built - X positions:", gridX.length, "Y positions:", gridY.length);
    console.log("Grid X range:", gridX[0], "to", gridX[gridX.length-1]);
    console.log("Grid Y range:", gridY[0], "to", gridY[gridY.length-1]);
    console.log("=== END GRID BUILD DEBUG ===");
    
    // Apply compression to the grid if enabled
    if (Example.enableCompression) {
        applyCompressionToGrid();
    }
}

function buildCorners() {
	// For every grid intersection we assign a rounding radius r and a handle
	// scale k (used later to compute Bézier control points). Intersections on
	// the outer frame remain sharp (r = 0) so the outer silhouette stays boxy.
	cornerR = [];
	cornerK = [];
	for (let i = 0; i <= Config.cols; i++) {
		const rCol = [];
		const kCol = [];
		for (let j = 0; j <= Config.rows; j++) {
			// Edge intersections remain sharp (radius 0) to keep sides flat
			if (i === 0 || j === 0 || i === Config.cols || j === Config.rows) {
				rCol.push(0);
				kCol.push(1.0);
				continue;
			}
			const cellW = min(gridX[i] - gridX[i - 1], gridX[i + 1] - gridX[i]);
			const cellH = min(gridY[j] - gridY[j - 1], gridY[j + 1] - gridY[j]);
			const base = min(cellW, cellH);
			const r = random(Config.cornerRadiusMinFrac, Config.cornerRadiusMaxFrac) * base;
			rCol.push(r);
			kCol.push(random(Config.curveKMin, Config.curveKMax));
		}
		cornerR.push(rCol);
		cornerK.push(kCol);
	}
}

// ---------------------------------
// Rendering — Parabolic grid
// ---------------------------------
/**
	Draw each cell's border exactly once using four straight segments and
	four rounded corners. The rounded corners are implemented as cubic Bézier
	arcs whose handles lie on the tangents of the touching edges. With handle
	length = radius * k, larger k exaggerates the curvature toward a parabola.
*/
function renderParabolicGrid() {
	// Use enhanced brush effects for natural brush strokes
	if (Example.useP5Brush) {
		// Custom brush stroke setup
		noFill();
	} else {
		stroke(Palette.mutedBlueGray);
	}
	noFill();

	for (let i = 0; i < Config.cols; i++) {
		for (let j = 0; j < Config.rows; j++) {
			const xL = gridX[i];
			const xR = gridX[i + 1];
			const yT = gridY[j];
			const yB = gridY[j + 1];

			// Clamp radii so opposite rounded corners never overlap.
			const rTL = constrain(cornerR[i][j], 0, 0.5 * min(xR - xL, yB - yT));
			const rTR = constrain(cornerR[i + 1][j], 0, 0.5 * min(xR - xL, yB - yT));
			const rBR = constrain(cornerR[i + 1][j + 1], 0, 0.5 * min(xR - xL, yB - yT));
			const rBL = constrain(cornerR[i][j + 1], 0, 0.5 * min(xR - xL, yB - yT));

			const kTL = cornerK[i][j];
			const kTR = cornerK[i + 1][j];
			const kBR = cornerK[i + 1][j + 1];
			const kBL = cornerK[i][j + 1];

			// Single border per cell now
			const lines = 1;
			const spacing = 1.0;

			for (let n = 0; n < lines; n++) {
				const o = n * spacing; // inward offset only to keep outside crisp

				const xL2 = xL + o;
				const xR2 = xR - o;
				const yT2 = yT + o;
				const yB2 = yB - o;

				const tl = max(rTL - o, 0);
				const tr = max(rTR - o, 0);
				const br = max(rBR - o, 0);
				const bl = max(rBL - o, 0);

				if (Example.useP5Brush) {
					// Use enhanced brush strokes for natural media effect
					const alpha = Config.lineAlpha + random(-24, 24);
					const weight = random(Config.lineWeightMin, Config.lineWeightMax);
					
					// Draw edges with enhanced brush strokes
					// Top edge
					enhancedBrushStroke(xL2 + tl, yT2, xR2 - tr, yT2, Palette.mutedBlueGray, alpha, weight, {
						strokeCount: 2,
						vibration: 0.4,
						quality: 4
					});
					// Right edge
					enhancedBrushStroke(xR2, yT2 + tr, xR2, yB2 - br, Palette.mutedBlueGray, alpha, weight, {
						strokeCount: 2,
						vibration: 0.4,
						quality: 4
					});
					// Bottom edge
					enhancedBrushStroke(xR2 - br, yB2, xL2 + bl, yB2, Palette.mutedBlueGray, alpha, weight, {
						strokeCount: 2,
						vibration: 0.4,
						quality: 4
					});
					// Left edge
					enhancedBrushStroke(xL2, yB2 - bl, xL2, yT2 + tl, Palette.mutedBlueGray, alpha, weight, {
						strokeCount: 2,
						vibration: 0.4,
						quality: 4
					});

					// Corners — use enhanced brush curves for rounded corners
					// Top-left
					if (tl > 0) {
						const sx = xL2 + tl, sy = yT2;
						const ex = xL2, ey = yT2 + tl;
						const c1x = sx - tl * kTL, c1y = sy;
						const c2x = ex, c2y = ey - tl * kTL;
						
						// Draw curved corner with multiple brush strokes
						const cornerSegments = Math.floor(random(4, 8));
						for (let s = 0; s < cornerSegments; s++) {
							const t = s / cornerSegments;
							const px = bezierPoint(sx, c1x, c2x, ex, t);
							const py = bezierPoint(sy, c1y, c2y, ey, t);
							const nextT = (s + 1) / cornerSegments;
							const px2 = bezierPoint(sx, c1x, c2x, ex, nextT);
							const py2 = bezierPoint(sy, c1y, c2y, ey, nextT);
							
							enhancedBrushStroke(px, py, px2, py2, Palette.mutedBlueGray, alpha, weight, {
								strokeCount: 1,
								vibration: 0.3,
								quality: 3
							});
						}
					}
					// Top-right
					if (tr > 0) {
						const sx = xR2 - tr, sy = yT2;
						const ex = xR2, ey = yT2 + tr;
						const c1x = sx + tr * kTR, c1y = sy;
						const c2x = ex, c2y = ey - tr * kTR;
						
						const cornerSegments = Math.floor(random(4, 8));
						for (let s = 0; s < cornerSegments; s++) {
							const t = s / cornerSegments;
							const px = bezierPoint(sx, c1x, c2x, ex, t);
							const py = bezierPoint(sy, c1y, c2y, ey, t);
							const nextT = (s + 1) / cornerSegments;
							const px2 = bezierPoint(sx, c1x, c2x, ex, nextT);
							const py2 = bezierPoint(sy, c1y, c2y, ey, nextT);
							
							enhancedBrushStroke(px, py, px2, py2, Palette.mutedBlueGray, alpha, weight, {
								strokeCount: 1,
								vibration: 0.3,
								quality: 3
							});
						}
					}
					// Bottom-right
					if (br > 0) {
						const sx = xR2, sy = yB2 - br;
						const ex = xR2 - br, ey = yB2;
						const c1x = sx, c1y = sy + br * kBR;
						const c2x = ex + br * kBR, c2y = ey;
						
						const cornerSegments = Math.floor(random(4, 8));
						for (let s = 0; s < cornerSegments; s++) {
							const t = s / cornerSegments;
							const px = bezierPoint(sx, c1x, c2x, ex, t);
							const py = bezierPoint(sy, c1y, c2y, ey, t);
							const nextT = (s + 1) / cornerSegments;
							const px2 = bezierPoint(sx, c1x, c2x, ex, nextT);
							const py2 = bezierPoint(sy, c1y, c2y, ey, nextT);
							
							enhancedBrushStroke(px, py, px2, py2, Palette.mutedBlueGray, alpha, weight, {
								strokeCount: 1,
								vibration: 0.3,
								quality: 3
							});
						}
					}
					// Bottom-left
					if (bl > 0) {
						const sx = xL2 + bl, sy = yB2;
						const ex = xL2, ey = yB2 - bl;
						const c1x = sx - bl * kBL, c1y = sy;
						const c2x = ex, c2y = ey + bl * kBL;
						
						const cornerSegments = Math.floor(random(4, 8));
						for (let s = 0; s < cornerSegments; s++) {
							const t = s / cornerSegments;
							const px = bezierPoint(sx, c1x, c2x, ex, t);
							const py = bezierPoint(sy, c1y, c2y, ey, t);
							const nextT = (s + 1) / cornerSegments;
							const px2 = bezierPoint(sx, c1x, c2x, ex, nextT);
							const py2 = bezierPoint(sy, c1y, c2y, ey, nextT);
							
							enhancedBrushStroke(px, py, px2, py2, Palette.mutedBlueGray, alpha, weight, {
								strokeCount: 1,
								vibration: 0.3,
								quality: 3
							});
						}
					}
				} else {
					// Fallback to original method
					strokeWeight(random(Config.lineWeightMin, Config.lineWeightMax));
					stroke(red(Palette.mutedBlueGray), green(Palette.mutedBlueGray), blue(Palette.mutedBlueGray), Config.lineAlpha + random(-24, 24));

					// Top edge (flat)
					line(xL2 + tl, yT2, xR2 - tr, yT2);
					// Right edge (flat)
					line(xR2, yT2 + tr, xR2, yB2 - br);
					// Bottom edge (flat)
					line(xR2 - br, yB2, xL2 + bl, yB2);
					// Left edge (flat)
					line(xL2, yB2 - bl, xL2, yT2 + tl);

					// Corners — cubic Bézier arcs with parabolic feel
					// Top-left (stronger parabola: longer handles)
					if (tl > 0) {
						const sx = xL2 + tl, sy = yT2;
						const ex = xL2, ey = yT2 + tl;
						const c1x = sx - tl * kTL, c1y = sy;
						const c2x = ex, c2y = ey - tl * kTL;
						bezier(sx, sy, c1x, c1y, c2x, c2y, ex, ey);
					}
					// Top-right
					if (tr > 0) {
						const sx = xR2 - tr, sy = yT2;
						const ex = xR2, ey = yT2 + tr;
						const c1x = sx + tr * kTR, c1y = sy;
						const c2x = ex, c2y = ey - tr * kTR;
						bezier(sx, sy, c1x, c1y, c2x, c2y, ex, ey);
					}
					// Bottom-right
					if (br > 0) {
						const sx = xR2, sy = yB2 - br;
						const ex = xR2 - br, ey = yB2;
						const c1x = sx, c1y = sy + br * kBR;
						const c2x = ex + br * kBR, c2y = ey;
						bezier(sx, sy, c1x, c1y, c2x, c2y, ex, ey);
					}
					// Bottom-left
					if (bl > 0) {
						const sx = xL2 + bl, sy = yB2;
						const ex = xL2, ey = yB2 - bl;
						const c1x = sx - bl * kBL, c1y = sy;
						const c2x = ex, c2y = ey + bl * kBL;
						bezier(sx, sy, c1x, c1y, c2x, c2y, ex, ey);
					}
				}
			}
		}
	}
}

// -------------------------------------------------
// Edge bands: layered strands hugging cell borders
// Gives the marbled/ink-pulled feel in the reference crop
// -------------------------------------------------
function renderPebbleEdgeBands() {
    const rows = Example.rows;
    const cols = Example.cols;
    const gx = Example.gapX;
    const gy = Example.gapY;

    // Use enhanced brush effects for natural brush strokes
    if (Example.useP5Brush) {
        // Vertical pebble lines (between columns)
        for (let i = 1; i < cols; i++) {
            const x = gridX[i] - gx * 0.5;
            const lineCount = Math.floor(random(2, 5));
            for (let l = 0; l < lineCount; l++) {
                const col = random([Palette.mutedBlueGray, Palette.deepRed]);
                const alpha = random(30, 75);
                
                const y1 = gy;
                const y2 = height - gy;
                const xOff = random(-gx * 0.4, gx * 0.4);
                
                // Create organic pebble-like strokes
                const segments = Math.floor(random(4, 8));
                for (let s = 0; s < segments; s++) {
                    const t = s / segments;
                    const y = lerp(y1, y2, t);
                    const xPos = x + xOff + random(-3, 3);
                    
                    // Create pebble-like curves
                    const strokeLength = random(10, 25);
                    const curveAngle = random(-PI/6, PI/6);
                    const endX = xPos + cos(curveAngle) * strokeLength;
                    const endY = y + sin(curveAngle) * strokeLength;
                    
                    enhancedBrushStroke(xPos, y, endX, endY, col, alpha * random(0.6, 1.0), random(0.6, 1.8), {
                        strokeCount: 2,
                        vibration: 0.7,
                        quality: 3
                    });
                }
            }
        }

        // Horizontal pebble lines (between rows)
        for (let j = 1; j < rows; j++) {
            const y = gridY[j] - gy * 0.5;
            const lineCount = Math.floor(random(1, 4));
            for (let l = 0; l < lineCount; l++) {
                const col = random([Palette.mutedBlueGray, Palette.deepRed]);
                const alpha = random(25, 70);
                
                const x1 = gx;
                const x2 = width - gx;
                const yOff = random(-gy * 0.5, gy * 0.5);
                
                // Create organic pebble-like strokes
                const segments = Math.floor(random(3, 6));
                for (let s = 0; s < segments; s++) {
                    const t = s / segments;
                    const x = lerp(x1, x2, t);
                    const yPos = y + yOff + random(-2, 2);
                    
                    // Create pebble-like curves
                    const strokeLength = random(8, 20);
                    const curveAngle = random(-PI/6, PI/6);
                    const endX = x + cos(curveAngle) * strokeLength;
                    const endY = yPos + sin(curveAngle) * strokeLength;
                    
                    enhancedBrushStroke(x, yPos, endX, endY, col, alpha * random(0.6, 1.0), random(0.5, 1.5), {
                        strokeCount: 2,
                        vibration: 0.6,
                        quality: 3
                    });
                }
            }
        }
    } else {
        // Fallback to original method
        // Vertical pebble lines (between columns)
        for (let i = 1; i < cols; i++) {
            const x = gridX[i] - gx * 0.5;
            const lineCount = Math.floor(random(2, 5));
            for (let l = 0; l < lineCount; l++) {
                const col = random([Palette.mutedBlueGray, Palette.deepRed]);
                const alpha = random(30, 75);
                stroke(red(col), green(col), blue(col), alpha);
                strokeWeight(random(0.6, 1.8));
                
                const y1 = gy;
                const y2 = height - gy;
                const xOff = random(-gx * 0.4, gx * 0.4);
                const segments = Math.floor(random(2, 4));
                
                beginShape();
                for (let s = 0; s <= segments; s++) {
                    const t = s / segments;
                    const y = lerp(y1, y2, t);
                    const xPos = x + xOff + random(-2, 2);
                    vertex(xPos, y);
                }
                endShape();
            }
        }

        // Horizontal pebble lines (between rows)
        for (let j = 1; j < rows; j++) {
            const y = gridY[j] - gy * 0.5;
            const lineCount = Math.floor(random(1, 4));
            for (let l = 0; l < lineCount; l++) {
                const col = random([Palette.mutedBlueGray, Palette.deepRed]);
                const alpha = random(25, 70);
                stroke(red(col), green(col), blue(col), alpha);
                strokeWeight(random(0.5, 1.5));
                
                const x1 = gx;
                const x2 = width - gx;
                const yOff = random(-gy * 0.5, gy * 0.5);
                const segments = Math.floor(random(2, 3));
                
                beginShape();
                for (let s = 0; s <= segments; s++) {
                    const t = s / segments;
                    const x = lerp(x1, x2, t);
                    const yPos = y + yOff + random(-1.5, 1.5);
                    vertex(x, yPos);
                }
                endShape();
            }
        }
    }
}

// -------------------------------------------------
// Simple example renderer: 3 rows × 4 columns of rounded rectangles
// with a stack of vertical rounded bars at the exact middle.
// Mirrors are not used here; we explicitly draw both sides for clarity.
// -------------------------------------------------
function renderRoundedRectExample() {
    noFill();

    const rows = Example.rows;
    const cols = Example.cols;

    // Use the compressed grid positions instead of creating new ones
    const xs = gridX;
    const ys = gridY;

    // Calculate widths and heights from the compressed grid positions
    let colWidths = [];
    for (let i = 0; i < cols; i++) {
        colWidths.push(xs[i + 1] - xs[i]);
    }

    let rowHeights = [];
    for (let j = 0; j < rows; j++) {
        rowHeights.push(ys[j + 1] - ys[j]);
    }

    // Tiles with per-tile radius based on its min dimension
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            const x = xs[i];
            const y = ys[j];
            const w = colWidths[i];
            const h = rowHeights[j];
            const r = min(w, h) * Example.cornerRadiusFrac;
            watercolorRoundedRectFrayed(x, y, w, h, r);
        }
    }

    // Loose gut lines between boxes
    renderGutLines(xs, ys, colWidths, rowHeights);

    if (Example.drawBars) {
        const tileHApprox = usableH / rows;
    const barW = width * Example.barWidthFrac;
    const barS = width * Example.barSpacingFrac;
        const totalBarsW = Example.barCount * barW + (Example.barCount - 1) * barS;
        let startX = (width - totalBarsW) / 2;
        const barR = tileHApprox * 0.18;
        for (let i = 0; i < Example.barCount; i++) {
            watercolorRoundedRectFrayed(startX, gy, barW, height - 2 * gy, barR);
            startX += barW + barS;
        }
    }
}

function roundedRect(x, y, w, h, r) {
	const k = 0.5523; // near-circular corner
	const ox = r * k;
	const oy = r * k;
	beginShape();
	vertex(x + r, y);
	bezierVertex(x + r - ox, y, x, y + r - oy, x, y + r);
	vertex(x, y + h - r);
	bezierVertex(x, y + h - r + oy, x + r - ox, y + h, x + r, y + h);
	vertex(x + w - r, y + h);
	bezierVertex(x + w - r + ox, y + h, x + w, y + h - r + oy, x + w, y + h - r);
	vertex(x + w, y + r);
	bezierVertex(x + w, y + r - oy, x + w - r + ox, y, x + w - r, y);
	endShape(CLOSE);
}

// Watercolor-style multi-layered stroke of a rounded rect using palette hues
function watercolorRoundedRect(x, y, w, h, r) {
    const layers = Math.floor(random(Example.wcLayersMin, Example.wcLayersMax + 1));
    const colors = [Palette.mutedBlueGray, Palette.deepRed];
    for (let i = 0; i < layers; i++) {
        const col = random(colors);
        const a = random(Example.wcAlphaMin, Example.wcAlphaMax);
        stroke(red(col), green(col), blue(col), a);
        strokeWeight(Example.strokeWeight + random(-0.6, 0.6));
        const jitter = Example.wcJitter;
        push();
        translate(random(-jitter, jitter), random(-jitter, jitter));
        roundedRect(x, y, w, h, r);
        pop();
    }
}

// Frayed variant: strokes rendered as noisy polylines following the rounded rect
function watercolorRoundedRectFrayed(x, y, w, h, r) {
    const layers = Math.floor(random(Example.wcLayersMin, Example.wcLayersMax + 1));
    const colors = [Palette.mutedBlueGray, Palette.deepRed];

    // Use enhanced brush effects for natural brush strokes
    if (Example.useP5Brush) {
        for (let i = 0; i < layers; i++) {
            const col = random(colors);
            const a = random(Example.wcAlphaMin, Example.wcAlphaMax);
            
            // Create a polygon from the rounded rect and fill it with natural texture
            const outline = sampleRoundedRect(x, y, w, h, r, Example.frayStep);
            const points = outline.map(pt => [pt.x, pt.y]);
            
            // Use enhanced natural media fill
            naturalMediaFill(points, col, a, {
                bleedStrength: Example.naturalMediaBleedStrength,
                textureStrength: Example.naturalMediaTextureStrength,
                borderStrength: Example.naturalMediaBorderStrength,
                layers: Example.naturalMediaLayers
            });
            
            // Add some hatching for additional texture
            if (random() < 0.4) {
                createHatching(points, col, a * Example.hatchingOpacity, {
                    distance: Example.hatchingDistance,
                    angle: Example.hatchingAngle,
                    opacity: Example.hatchingOpacity,
                    variation: Example.hatchingVariation
                });
            }
        }
        
        // Add watercolor bleeding effect
        const watercolorLayers = Math.floor(random(2, 4));
        for (let i = 0; i < watercolorLayers; i++) {
            const col = random(colors);
            const a = random(15, 45);
            
            const outline = sampleRoundedRect(x, y, w, h, r, Example.frayStep);
            const points = outline.map(pt => [pt.x, pt.y]);
            
            watercolorEffect(points, col, a, {
                bleedStrength: Example.watercolorBleedStrength,
                textureStrength: Example.watercolorTextureStrength,
                layers: Example.watercolorLayers
            });
        }
        
        // Add some additional brush strokes around the edges for more texture
        const edgeStrokes = Math.floor(random(3, 7));
        for (let i = 0; i < edgeStrokes; i++) {
            const col = random(colors);
            const a = random(20, 60);
            
            // Create organic edge strokes
            const strokeCount = Math.floor(random(4, 8));
            for (let s = 0; s < strokeCount; s++) {
                const strokeLength = random(12, 28);
                const angle = random(-PI/6, PI/6);
                const startX = x + random(-8, w + 8);
                const startY = y + random(-8, h + 8);
                const endX = startX + cos(angle) * strokeLength;
                const endY = startY + sin(angle) * strokeLength;
                
                enhancedBrushStroke(startX, startY, endX, endY, col, a * random(0.6, 1.0), random(0.4, 1.2), {
                    strokeCount: 1,
                    vibration: 0.8,
                    quality: 4
                });
            }
        }
    } else {
        // Fallback to original method
        const outline = sampleRoundedRect(x, y, w, h, r, Example.frayStep);
        for (let i = 0; i < layers; i++) {
            const col = random(colors);
            const a = random(Example.wcAlphaMin, Example.wcAlphaMax);
            stroke(red(col), green(col), blue(col), a);
            strokeWeight(Example.strokeWeight + random(-0.7, 0.7));

            // Displace each point outward-ish with noise to create fray
            const amp = random(Example.frayAmpMin, Example.frayAmpMax);
            beginShape();
            for (let p = 0; p < outline.length; p++) {
                const pt = outline[p];
                const nx = cos(pt.angle);
                const ny = sin(pt.angle);
                const outward = random() < Example.frayOutwardBias ? 1 : -1;
                const n = noise(pt.x * Example.frayNoiseFreq + i * 10.0, pt.y * Example.frayNoiseFreq + i * 17.0);
                const d = (n - 0.5) * 2 * amp * outward;
                const jx = random(-Example.wcJitter, Example.wcJitter);
                const jy = random(-Example.wcJitter, Example.wcJitter);
                vertex(pt.x + nx * d + jx, pt.y + ny * d + jy);
            }
            endShape(CLOSE);
        }
    }
}

// Sample points around a rounded rectangle with their outward normal angle
function sampleRoundedRect(x, y, w, h, r, step) {
    const pts = [];
    const k = 0.5523;
    const ox = r * k, oy = r * k;

    function addPoint(px, py, tangAngle, isArc) {
        const normalAngle = tangAngle - HALF_PI;
        pts.push({ x: px, y: py, angle: normalAngle, tang: tangAngle, isArc });
    }

    function sampleBezier(ax, ay, bx, by, cx, cy, dx, dy, forward = true) {
        const len = max(6, Math.ceil(dist(ax, ay, dx, dy) / step));
        const dt = 1 / len;
        for (let t = 0; t <= 1.00001; t += dt) {
            const x1 = bezierPoint(ax, bx, cx, dx, t);
            const y1 = bezierPoint(ay, by, cy, dy, t);
            const tx = bezierTangent(ax, bx, cx, dx, t);
            const ty = bezierTangent(ay, by, cy, dy, t);
            const tangAngle = atan2(ty, tx);
            addPoint(x1, y1, tangAngle, true);
        }
    }

    function sampleLine(ax, ay, bx, by) {
        const length = dist(ax, ay, bx, by);
        const steps = max(2, Math.ceil(length / step));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const px = lerp(ax, bx, t);
            const py = lerp(ay, by, t);
            const tangAngle = atan2(by - ay, bx - ax);
            addPoint(px, py, tangAngle, false);
        }
    }

    // Top edge: straight from (x+r,y) to (x+w-r,y)
    sampleLine(x + r, y, x + w - r, y);
    // Top-right arc
    sampleBezier(x + w - r, y, x + w - r + ox, y, x + w, y + r - oy, x + w, y + r);
    // Right edge: straight down
    sampleLine(x + w, y + r, x + w, y + h - r);
    // Bottom-right arc
    sampleBezier(x + w, y + h - r, x + w, y + h - r + oy, x + w - r + ox, y + h, x + w - r, y + h);
    // Bottom edge: straight left
    sampleLine(x + w - r, y + h, x + r, y + h);
    // Bottom-left arc
    sampleBezier(x + r, y + h, x + r - ox, y + h, x, y + h - r + oy, x, y + h - r);
    // Left edge: straight up
    sampleLine(x, y + h - r, x, y + r);
    // Top-left arc (back to start)
    sampleBezier(x, y + r, x, y + r - oy, x + r - ox, y, x + r, y);

    return pts;
}

// ---------------------------------
// Gut lines between boxes
// ---------------------------------
function renderGutLines(xs, ys, colWidths, rowHeights) {
    const rows = Example.rows;
    const cols = Example.cols;
    const gx = Example.gapX;
    const gy = Example.gapY;

    // Use enhanced brush effects for natural brush strokes
    if (Example.useP5Brush) {
        // Vertical gut lines (between columns)
        for (let i = 1; i < cols; i++) {
            const x = xs[i] - gx * 0.5;
            const lineCount = Math.floor(random(3, 8));
            for (let l = 0; l < lineCount; l++) {
                const col = random([Palette.mutedBlueGray, Palette.deepRed]);
                const alpha = random(40, 90);
                
                const y1 = gy;
                const y2 = height - gy;
                const xOff = random(-gx * 0.3, gx * 0.3);
                
                // Create enhanced brush strokes
                const segments = Math.floor(random(3, 6));
                for (let s = 0; s < segments; s++) {
                    const t = s / segments;
                    const y = lerp(y1, y2, t);
                    const xPos = x + xOff + random(-2, 2);
                    
                    // Draw enhanced brush stroke
                    const strokeLength = random(8, 20);
                    const angle = random(-PI/8, PI/8);
                    const endX = xPos + cos(angle) * strokeLength;
                    const endY = y + sin(angle) * strokeLength;
                    
                    enhancedBrushStroke(xPos, y, endX, endY, col, alpha * random(0.7, 1.0), random(0.8, 2.2), {
                        strokeCount: 2,
                        vibration: 0.6,
                        quality: 3
                    });
                }
            }
        }

        // Horizontal gut lines (between rows)
        for (let j = 1; j < rows; j++) {
            const y = ys[j] - gy * 0.5;
            const lineCount = Math.floor(random(2, 6));
            for (let l = 0; l < lineCount; l++) {
                const col = random([Palette.mutedBlueGray, Palette.deepRed]);
                const alpha = random(35, 85);
                
                const x1 = gx;
                const x2 = width - gx;
                const yOff = random(-gy * 0.4, gy * 0.4);
                
                // Create enhanced brush strokes
                const segments = Math.floor(random(2, 5));
                for (let s = 0; s < segments; s++) {
                    const t = s / segments;
                    const x = lerp(x1, x2, t);
                    const yPos = y + yOff + random(-1.5, 1.5);
                    
                    // Draw enhanced brush stroke
                    const strokeLength = random(6, 16);
                    const angle = random(-PI/8, PI/8);
                    const endX = x + cos(angle) * strokeLength;
                    const endY = yPos + sin(angle) * strokeLength;
                    
                    enhancedBrushStroke(x, yPos, endX, endY, col, alpha * random(0.7, 1.0), random(0.7, 1.8), {
                        strokeCount: 2,
                        vibration: 0.5,
                        quality: 3
                    });
                }
            }
        }
    } else {
        // Fallback to original method
        // Vertical gut lines (between columns)
        for (let i = 1; i < cols; i++) {
            const x = xs[i] - gx * 0.5;
            const lineCount = Math.floor(random(3, 8));
            for (let l = 0; l < lineCount; l++) {
                const col = random([Palette.mutedBlueGray, Palette.deepRed]);
                const alpha = random(40, 90);
                stroke(red(col), green(col), blue(col), alpha);
                strokeWeight(random(0.8, 2.2));
                
                const y1 = gy;
                const y2 = height - gy;
                const xOff = random(-gx * 0.3, gx * 0.3);
                const segments = Math.floor(random(2, 5));
                
                beginShape();
                for (let s = 0; s <= segments; s++) {
                    const t = s / segments;
                    const y = lerp(y1, y2, t);
                    const xPos = x + xOff + random(-1.5, 1.5);
                    vertex(xPos, y);
                }
                endShape();
            }
        }

        // Horizontal gut lines (between rows)
        for (let j = 1; j < rows; j++) {
            const y = ys[j] - gy * 0.5;
            const lineCount = Math.floor(random(2, 6));
            for (let l = 0; l < lineCount; l++) {
                const col = random([Palette.mutedBlueGray, Palette.deepRed]);
                const alpha = random(35, 85);
                stroke(red(col), green(col), blue(col), alpha);
                strokeWeight(random(0.7, 1.8));
                
                const x1 = gx;
                const x2 = width - gx;
                const yOff = random(-gy * 0.4, gy * 0.4);
                const segments = Math.floor(random(2, 4));
                
                beginShape();
                for (let s = 0; s <= segments; s++) {
                    const t = s / segments;
                    const x = lerp(x1, x2, t);
                    const yPos = y + yOff + random(-1.2, 1.2);
                    vertex(x, yPos);
                }
                endShape();
            }
        }
    }
}

// ---------------------------------
// Circles
// ---------------------------------
function renderCircles() {
	noStroke();
	for (let i = 0; i <= Config.cols; i++) {
		for (let j = 0; j <= Config.rows; j++) {
			if (i === 0 || j === 0 || i === Config.cols || j === Config.rows) continue;
			if (random() < Config.circleProbability) {
				const x = gridX[i] + randomGaussian(0, 1.2);
				const y = gridY[j] + randomGaussian(0, 1.2);
				const d = random(Config.circleSizeMin, Config.circleSizeMax);
				fill(Palette.deepRed);
				ellipse(x, y, d * 0.98, d * 0.98);
				fill(Palette.softPink);
				ellipse(x, y, d * 0.52, d * 0.52);
				fill(255, 255, 255, 50);
				ellipse(x - d * 0.12, y - d * 0.12, d * 0.25, d * 0.25);
			}
		}
	}
}

// ---------------------------------
// Wash + Paper Texture
// ---------------------------------
function renderWashes() {
	noStroke();
	fill(255, 255, 200, Config.washOpacity);
	rect(0, 0, width, height);
}

function buildPaperTexture() {
	paperTextureGfx = createGraphics(width, height);
	paperTextureGfx.pixelDensity(1);
	paperTextureGfx.noStroke();
	paperTextureGfx.clear();

    // Fine grain dots
    for (let i = 0; i < width * height * 0.006; i++) {
		const x = random(width);
		const y = random(height);
        const v = random(230, 250);
        paperTextureGfx.fill(v, v, v, 20);
        paperTextureGfx.rect(x, y, random(0.4, 1.1), random(0.4, 1.1));
	}

    // Subtle pulp clouds
    for (let i = 0; i < 2200; i++) {
		const x = random(width);
		const y = random(height);
        const r = random(4, 26);
        paperTextureGfx.fill(255, 255, 255, 12);
		paperTextureGfx.ellipse(x, y, r, r);
	}

    // Light vignette
    const g = paperTextureGfx;
    g.noFill();
    g.stroke(0, 0, 0, 18);
    for (let i = 0; i < 35; i++) {
        g.strokeWeight(0.6);
        g.rect(3 + i, 3 + i, width - 6 - i * 2, height - 6 - i * 2, 2);
    }
}

function applyPaperTexture() {
	if (!paperTextureGfx) return;
	push();
	blendMode(MULTIPLY);
	tint(255, Config.textureOpacity * 255);
	image(paperTextureGfx, 0, 0, width, height);
	pop();
	noTint();
}

// Soft paper base using noise and grain; called at start of draw
function renderPaperBackground() {
    background(Palette.warmBeige);
    // Subtle mottling
    noStroke();
    for (let i = 0; i < 1200; i++) {
        const x = random(width);
        const y = random(height);
        const r = random(8, 36);
        fill(255, 255, 255, 8);
        ellipse(x, y, r, r);
    }
    // Long soft fibers
    stroke(255, 255, 255, 12);
    strokeWeight(0.6);
    noFill();
    const fiberCount = 90;
    for (let f = 0; f < fiberCount; f++) {
        const y0 = random(height);
        const len = random(width * 0.35, width * 0.9);
        const amp = random(6, 18);
        const freq = random(0.004, 0.012);
        beginShape();
        for (let x0 = -50; x0 <= len; x0 += 8) {
            const x = (width - len) * random() + x0;
            const y = y0 + sin((x0 + f * 13) * freq) * amp + random(-1, 1);
            vertex(constrain(x, 0, width), constrain(y, 0, height));
        }
        endShape();
        if (random() < 0.35) {
            stroke(230, 220, 200, 14);
        } else {
            stroke(255, 255, 255, 12);
        }
    }
    // Stronger visible grain
    const prev = Config.textureOpacity;
    Config.textureOpacity = 0.35;
    applyPaperTexture();
    Config.textureOpacity = prev;
}

// ---------------------------------
// Utility — mirror
// ---------------------------------
function drawMirrored(fn, jitterX = 0, jitterY = 0) {
	push();
	fn();
	pop();
	push();
	translate(width, 0);
	scale(-1, 1);
	translate(random(-jitterX, jitterX), random(-jitterY, jitterY));
	fn();
	pop();
}

// ---------------------------------
// Compression System
// ---------------------------------

// Initialize compression focal point
function initializeCompression() {
    if (!Example.enableCompression) {
        compressionStrength = 0.0;
        compressionRadius = 0.0;
        return;
    }
    
    // Choose a random focal point in the core area (avoiding edges)
    // Note: Grid covers the full canvas width
    const margin = 0.15; // Keep focal point away from edges
    
    // Calculate the actual grid bounds (grid might not cover full canvas)
    const gridWidth = width; // Full canvas width
    const gridHeight = height; // Full canvas height
    
    compressionCenter.x = random(
        gridWidth * margin, 
        gridWidth * (1 - margin)
    );
    compressionCenter.y = random(
        gridHeight * margin, 
        gridHeight * (1 - margin)
    );
    
    console.log("Grid bounds - Width:", gridWidth, "Height:", gridHeight);
    console.log("Focal point chosen at:", compressionCenter.x, compressionCenter.y);
    
    // Set compression parameters
    compressionStrength = random(
        Example.compressionStrengthMin, 
        Example.compressionStrengthMax
    );
    compressionRadius = random(
        Example.compressionRadiusMin, 
        Example.compressionRadiusMax
    ) * min(Config.canvasWidth, Config.canvasHeight);
}

// Calculate compression factor for a given position
function getCompressionFactor(x, y) {
    if (compressionStrength === 0.0) return 1.0;
    
    const distance = dist(x, y, compressionCenter.x, compressionCenter.y);
    const normalizedDistance = distance / compressionRadius;
    
    if (normalizedDistance >= 1.0) return 1.0;
    
    // Create large core compression area (20-25% of canvas)
    const coreRadius = 0.25; // 25% of compression radius = large core area
    
    if (normalizedDistance <= coreRadius) {
        // Inside core area: lines are pushed away (strong compression)
        return 0.001;
    } else {
        // Outside core area: gradual return to normal spacing
        const adjustedDistance = (normalizedDistance - coreRadius) / (1.0 - coreRadius);
        const falloff = pow(1.0 - adjustedDistance, Example.compressionFalloff);
        const compressionFactor = 0.001 + (0.999 * falloff);
        return constrain(compressionFactor, 0.001, 1.0);
    }
}

// Apply compression to grid positions
function applyCompressionToGrid() {
    if (!Example.enableCompression || compressionStrength === 0.0) return;
    
    console.log("=== COMPRESSION DEBUG ===");
    console.log("Focal point:", compressionCenter.x, compressionCenter.y);
    console.log("Compression radius:", compressionRadius);
    console.log("Original gridX:", [...gridX]);
    console.log("Original gridY:", [...gridY]);
    
    // Create compressed grid arrays
    const compressedGridX = [];
    const compressedGridY = [];
    
    // Apply dramatic compression to horizontal grid lines (X positions)
    for (let i = 0; i < gridX.length; i++) {
        const originalX = gridX[i];
        // Calculate compression factor based on distance from focal point
        const compressionFactor = getCompressionFactor(originalX, compressionCenter.y);
        
        // Create dramatic compression: lines move away from focal point
        // compressionFactor = 0.001 means lines are pushed away from focal point
        // compressionFactor = 1.0 means lines stay at original position
        const direction = originalX > compressionCenter.x ? 1 : -1;
        const distance = abs(originalX - compressionCenter.x);
        const compressedX = originalX + direction * distance * (1.0 - compressionFactor);
        compressedGridX.push(compressedX);
        
        console.log(`X line ${i}: ${originalX.toFixed(1)} -> ${compressedX.toFixed(1)} (factor: ${compressionFactor.toFixed(3)})`);
    }
    
    // Apply dramatic compression to vertical grid lines (Y positions)
    for (let j = 0; j < gridY.length; j++) {
        const originalY = gridY[j];
        // Calculate compression factor based on distance from focal point
        const compressionFactor = getCompressionFactor(compressionCenter.x, originalY);
        
        // Create dramatic compression: lines move away from focal point
        const direction = originalY > compressionCenter.y ? 1 : -1;
        const distance = abs(originalY - compressionCenter.y);
        const compressedY = originalY + direction * distance * (1.0 - compressionFactor);
        compressedGridY.push(compressedY);
        
        console.log(`Y line ${j}: ${originalY.toFixed(1)} -> ${compressedY.toFixed(1)} (factor: ${compressionFactor.toFixed(3)})`);
    }
    
    // Apply the compressed values
    gridX = compressedGridX;
    gridY = compressedGridY;
    
    console.log("Compressed gridX:", [...gridX]);
    console.log("Compressed gridY:", [...gridY]);
    console.log("=== END COMPRESSION DEBUG ===");
}

// Visualize compression focal point (for debugging)
function drawCompressionFocalPoint() {
    if (!Example.enableCompression || compressionStrength === 0.0) return;
    
    push();
    noFill();
    
    // Draw dramatic compression boundary
    stroke(255, 0, 0, 150);
    strokeWeight(3);
    circle(compressionCenter.x, compressionCenter.y, compressionRadius * 2);
    
    // Draw large core compression area (25% of compression radius)
    stroke(255, 255, 0, 150);
    strokeWeight(6);
    const coreRadius = compressionRadius * 0.25;
    circle(compressionCenter.x, compressionCenter.y, coreRadius * 2);
    
    // Draw focal point center
    stroke(255, 255, 0, 255);
    strokeWeight(4);
    circle(compressionCenter.x, compressionCenter.y, 15);
    
    // Draw compression intensity gradient
    for (let r = 0; r < compressionRadius; r += 10) {
        const normalizedR = r / compressionRadius;
        const alpha = 100 * (1.0 - normalizedR);
        stroke(255, 0, 0, alpha);
        strokeWeight(1);
        circle(compressionCenter.x, compressionCenter.y, r * 2);
    }
    
    pop();
}

// Visualize compression effect on grid cells
function drawCompressionVisualization() {
    if (!Example.enableCompression || compressionStrength === 0.0) return;
    
    push();
    noStroke();
    
    // Draw compressed grid cells with color intensity based on compression
    for (let i = 0; i < Config.cols; i++) {
        for (let j = 0; j < Config.rows; j++) {
            const xL = gridX[i];
            const xR = gridX[i + 1];
            const yT = gridY[j];
            const yB = gridY[j + 1];
            
            // Calculate center of this cell
            const cellCenterX = (xL + xR) / 2;
            const cellCenterY = (yT + yB) / 2;
            
            // Get compression factor for this cell
            const compressionFactor = getCompressionFactor(cellCenterX, cellCenterY);
            
            // Color intensity based on compression (more compressed = more red)
            const intensity = (1.0 - compressionFactor) * 255;
            fill(255, 0, 0, intensity * 0.3); // Semi-transparent red
            
            // Draw cell background
            rect(xL, yT, xR - xL, yB - yT);
        }
    }
    
    pop();
}



