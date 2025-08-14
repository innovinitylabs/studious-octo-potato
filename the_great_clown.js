/*
	The Great Clown — fresh build focused on grid with parabolic intersections.
	- Portrait canvas, vertical symmetry
	- Grid lines are bands of parallel straight segments
	- Only intersections are curved (cubic bezier, parabola-like)
	- Circles kept; NO central yellow bars
	- Wash + paper texture overlay

	Controls: R randomize · S save
*/

"use strict";

// ---------------------------------
// Config
// ---------------------------------
const Config = {
	canvasWidth: 800,
	canvasHeight: 1200,
	cols: 12,
	rows: 16,

	// Line bands
	linesPerBorderMin: 2,
	linesPerBorderMax: 5,
	lineSpacingMin: 1.1,
	lineSpacingMax: 2.0,
	lineWeightMin: 0.8,
	lineWeightMax: 1.8,
	lineAlpha: 120,

	// Intersection rounding (parabolic feel)
	cornerRadiusMinFrac: 0.05, // of min(cellW, cellH)
	cornerRadiusMaxFrac: 0.22,
	curveKMin: 0.7, // cubic-bezier handle length factor relative to radius
	curveKMax: 1.25,

	// Circles
	circleProbability: 0.26,
	circleSizeMin: 18,
	circleSizeMax: 48,

	// Presentation
	symmetryJitter: 2.0,
	washOpacity: 26,
	textureOpacity: 0.22
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

	// Pass 1: the grid with parabolic intersections
	drawMirrored(() => {
		renderParabolicGrid();
	}, Config.symmetryJitter, Config.symmetryJitter);

	// Pass 2: circles
	drawMirrored(() => {
		renderCircles();
	}, Config.symmetryJitter, Config.symmetryJitter);

	// Pass 3: washes
	renderWashes();

	// Pass 4: paper texture
	applyPaperTexture();
}

function regenerate() {
	randomSeed(seedValue);
	noiseSeed(seedValue);
	buildGrid();
	buildCorners();
	buildPaperTexture();
	redraw();
}

function keyPressed() {
	if (key === "r" || key === "R") {
		seedValue = Math.floor(Math.random() * 1e9);
		regenerate();
	}
	if (key === "s" || key === "S") saveCanvas("the_great_clown", "png");
}

// ---------------------------------
// Grid computation
// ---------------------------------
function buildGrid() {
	gridX = [];
	gridY = [];
	for (let i = 0; i <= Config.cols; i++) gridX.push(map(i, 0, Config.cols, 0, width / 2));
	for (let j = 0; j <= Config.rows; j++) gridY.push(map(j, 0, Config.rows, 0, height));
}

function buildCorners() {
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
function renderParabolicGrid() {
	stroke(Palette.mutedBlueGray);
	noFill();

	for (let i = 0; i < Config.cols; i++) {
		for (let j = 0; j < Config.rows; j++) {
			const xL = gridX[i];
			const xR = gridX[i + 1];
			const yT = gridY[j];
			const yB = gridY[j + 1];

			const rTL = constrain(cornerR[i][j], 0, 0.5 * min(xR - xL, yB - yT));
			const rTR = constrain(cornerR[i + 1][j], 0, 0.5 * min(xR - xL, yB - yT));
			const rBR = constrain(cornerR[i + 1][j + 1], 0, 0.5 * min(xR - xL, yB - yT));
			const rBL = constrain(cornerR[i][j + 1], 0, 0.5 * min(xR - xL, yB - yT));

			const kTL = cornerK[i][j];
			const kTR = cornerK[i + 1][j];
			const kBR = cornerK[i + 1][j + 1];
			const kBL = cornerK[i][j + 1];

			const lines = Math.floor(random(Config.linesPerBorderMin, Config.linesPerBorderMax + 1));
			const spacing = random(Config.lineSpacingMin, Config.lineSpacingMax);

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

				// Corners — cubic bezier arcs with parabolic feel
				// Top-left
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

