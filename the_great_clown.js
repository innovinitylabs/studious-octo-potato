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
	// Dynamic rows/cols — chosen on regenerate() between these min/max values
	minCols: 6,
	maxCols: 10,
	minRows: 4,
	maxRows: 8,
	cols: 4, // populated/overridden at runtime
	rows: 3, // populated/overridden at runtime

    gapX: 20, // horizontal gap in pixels
    gapY: 4.2, // vertical gap in pixels (tighter per request)
	cornerRadiusFrac: 0.08, // of tile min(w,h)
	strokeWeight: 2.0,
	barCount: 7, // optional center bars
	barWidthFrac: 0.012, // of canvas width
	barSpacingFrac: 0.012,
	drawBars: false, // default off per latest request
	colWidthWeightMin: 0.8, // randomness for non-fixed widths
	colWidthWeightMax: 1.4,
	rowHeightWeightMin: 0.8,
	rowHeightWeightMax: 1.6
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
// State
// ---------------------------------
let gridX = [];
let gridY = [];
let cornerR = []; // [i][j]
let cornerK = []; // [i][j]
let seedValue = Math.floor(Math.random() * 1e9);
let paperTextureGfx = null;

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

	Palette = Object.fromEntries(Object.entries(RawPalette).map(([k, rgb]) => [k, color(...rgb)]));
	regenerate();
}

function draw() {
	background(Palette.warmBeige);

	// For the example view: clean rounded-rect tiles + center bar stack
	renderRoundedRectExample();
}

function regenerate() {
	// Seed PRNG + Perlin and rebuild all dependent data.
	randomSeed(seedValue);
	noiseSeed(seedValue);
	// Choose dynamic grid size each regeneration
	Example.cols = Math.floor(random(Example.minCols, Example.maxCols + 1));
	Example.rows = Math.floor(random(Example.minRows, Example.maxRows + 1));
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

	// Variable column widths — heavier randomness here produces a mix of
	// squarer and more elongated cells while still filling the half-canvas.
    let accX = 0;
    const gutterX = width * 0.04; // spacing between tiles inside half
    const tileW = ((width / 2) - gutterX * (Config.cols + 1)) / Config.cols;
    for (let i = 0; i < Config.cols; i++) {
        accX += gutterX + tileW;
        gridX.push(accX);
    }

	// Variable row heights — same proportional approach as columns.
    let accY = 0;
    const gutterY = height * 0.04;
    const tileH = (height - gutterY * (Config.rows + 1)) / Config.rows;
    for (let j = 0; j < Config.rows; j++) {
        accY += gutterY + tileH;
        gridY.push(accY);
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
	stroke(Palette.mutedBlueGray);
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

// -------------------------------------------------
// Edge bands: layered strands hugging cell borders
// Gives the marbled/ink-pulled feel in the reference crop
// -------------------------------------------------
function renderPebbleEdgeBands() {
	noFill();
	for (let i = 0; i < Config.cols; i++) {
		for (let j = 0; j < Config.rows; j++) {
			const xL = gridX[i];
			const xR = gridX[i + 1];
			const yT = gridY[j];
			const yB = gridY[j + 1];

			const cellW = xR - xL;
			const cellH = yB - yT;
			const bulgeBase = min(cellW, cellH) * Pebble.bulgeIntensity;

			// Vertical seam on the right side of the cell (skip outermost border)
			if (i < Config.cols - 1) {
			const vCount = Math.floor(random(Pebble.vertLinesMin, Pebble.vertLinesMax + 1));
			const vBand = random(Pebble.bandWidthMin, Pebble.bandWidthMax);
			for (let k = 0; k < vCount; k++) {
				const centerT = vCount <= 1 ? 0 : map(k, 0, vCount - 1, -0.5, 0.5);
				const off = centerT * vBand + randomGaussian(0, 0.35);
				const sx = xR - off;
				const ex = xR - off;
				const y1 = yT;
				const y2 = yB;
				const midY = (y1 + y2) * 0.5;
				const curve = bulgeBase * random(0.7, 1.3);
				strokeWeight(random(Pebble.weightMin, Pebble.weightMax));
				if (random() < Pebble.redInkChance) {
					stroke(red(Palette.deepRed), green(Palette.deepRed), blue(Palette.deepRed), Pebble.strokeAlpha);
				} else {
					stroke(red(Palette.mutedBlueGray), green(Palette.mutedBlueGray), blue(Palette.mutedBlueGray), Pebble.strokeAlpha);
				}
				bezier(sx, y1, sx + curve, lerp(y1, midY, 0.66), ex + curve, lerp(midY, y2, 0.66), ex, y2);
			}
			}

			// Horizontal seam at the bottom of the cell (skip outermost border)
			if (j < Config.rows - 1) {
			const hCount = Math.floor(random(Pebble.horzLinesMin, Pebble.horzLinesMax + 1));
			const hBand = random(Pebble.bandWidthMin, Pebble.bandWidthMax);
			for (let k = 0; k < hCount; k++) {
				const centerT = hCount <= 1 ? 0 : map(k, 0, hCount - 1, -0.5, 0.5);
				const off = centerT * hBand + randomGaussian(0, 0.35);
				const sy = yB - off;
				const ey = yB - off;
				const x1 = xL;
				const x2 = xR;
				const midX = (x1 + x2) * 0.5;
				const curve = bulgeBase * random(0.7, 1.3);
				strokeWeight(random(Pebble.weightMin, Pebble.weightMax));
				if (random() < Pebble.redInkChance) {
					stroke(red(Palette.deepRed), green(Palette.deepRed), blue(Palette.deepRed), Pebble.strokeAlpha);
				} else {
					stroke(red(Palette.mutedBlueGray), green(Palette.mutedBlueGray), blue(Palette.mutedBlueGray), Pebble.strokeAlpha);
				}
				bezier(x1, sy, lerp(x1, midX, 0.66), sy + curve, lerp(midX, x2, 0.66), ey + curve, x2, ey);
			}
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
    background(255);
    stroke(20);
    strokeWeight(Example.strokeWeight);
    noFill();

    const rows = Example.rows;
    const cols = Example.cols;

    // Build non-uniform column widths and row heights that still fit the
    // overall canvas with consistent gutters.
    const gx = Example.gapX;
    const gy = Example.gapY;

    // Column widths by weights
    let colWeights = [];
    for (let i = 0; i < cols; i++) colWeights.push(random(Example.colWidthWeightMin, Example.colWidthWeightMax));
    const sumW = colWeights.reduce((a, b) => a + b, 0);
    const usableW = width - gx * (cols + 1);
    let colWidths = colWeights.map(w => (w / sumW) * usableW);

    // Row heights by weights
    let rowWeights = [];
    for (let j = 0; j < rows; j++) rowWeights.push(random(Example.rowHeightWeightMin, Example.rowHeightWeightMax));
    const sumH = rowWeights.reduce((a, b) => a + b, 0);
    const usableH = height - gy * (rows + 1);
    let rowHeights = rowWeights.map(h => (h / sumH) * usableH);

    // Precompute x,y origins for each col/row
    let xs = [gx];
    for (let i = 0; i < cols - 1; i++) xs.push(xs[xs.length - 1] + colWidths[i] + gx);
    let ys = [gy];
    for (let j = 0; j < rows - 1; j++) ys.push(ys[ys.length - 1] + rowHeights[j] + gy);

    // Tiles with per-tile radius based on its min dimension
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            const x = xs[i];
            const y = ys[j];
            const w = colWidths[i];
            const h = rowHeights[j];
            const r = min(w, h) * Example.cornerRadiusFrac;
            roundedRect(x, y, w, h, r);
        }
    }

    if (Example.drawBars) {
        const tileHApprox = usableH / rows;
    const barW = width * Example.barWidthFrac;
    const barS = width * Example.barSpacingFrac;
        const totalBarsW = Example.barCount * barW + (Example.barCount - 1) * barS;
        let startX = (width - totalBarsW) / 2;
        const barR = tileHApprox * 0.18;
        for (let i = 0; i < Example.barCount; i++) {
            roundedRect(startX, gy, barW, height - 2 * gy, barR);
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

	for (let i = 0; i < width * height * 0.004; i++) {
		const x = random(width);
		const y = random(height);
		const v = random(230, 255);
		paperTextureGfx.fill(v, v, v, 18);
		paperTextureGfx.rect(x, y, random(0.5, 1.2), random(0.5, 1.2));
	}

	for (let i = 0; i < 1200; i++) {
		const x = random(width);
		const y = random(height);
		const r = random(6, 20);
		paperTextureGfx.fill(255, 255, 255, 10);
		paperTextureGfx.ellipse(x, y, r, r);
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

