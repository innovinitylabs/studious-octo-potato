/*
	The Great Clown — p5.js
	Portrait canvas with vertical symmetry, distorted grid/webbing,
	red/pink circular motifs, central clown-like figure, washes,
	and paper texture overlay.

	Controls:
		R – re-randomize
		S – save image
*/

"use strict";

// -----------------------------
// Adjustable parameters
// -----------------------------
const Params = {
	canvasWidth: 800,
	canvasHeight: 1200,
	gridColumns: 12,
	gridRows: 16,
	noiseScale: 0.015,
	distortionStrength: 34,
	circleProbability: 0.26,
	circleSizeMin: 18,
	circleSizeMax: 48,
	symmetryJitter: 3.0, // px offset to make mirroring imperfect
	washOpacity: 26, // 0–255
	textureOpacity: 0.22, // 0–1

	// Pebble-grid controls
	verticalLinesPerBandMin: 3,
	verticalLinesPerBandMax: 6,
	horizontalLinesPerBandMin: 2,
	horizontalLinesPerBandMax: 5,
	gridBandAlpha: 120,
	gridLineWeightMin: 0.7,
	gridLineWeightMax: 1.9,
	parabolaCurveIntensity: 0.22, // fraction of local cell width/height
	stepsPerCell: 10
};

// Palette
const RawPalette = {
	deepRed: [200, 30, 30],
	softPink: [255, 200, 200],
	goldenYellow: [255, 200, 100],
	mutedBlueGray: [150, 160, 180],
	warmBeige: [240, 230, 210]
};

let Palette = {};

// -----------------------------
// State
// -----------------------------
let leftHalfPoints = []; // 2D array: [col][row] -> {x, y}
let seedValue = Math.floor(Math.random() * 1e9);
let paperTextureGfx = null;

// -----------------------------
// Setup & draw
// -----------------------------
function setup() {
	const container = document.getElementById("container");
	const cnv = createCanvas(Params.canvasWidth, Params.canvasHeight);
	if (container) cnv.parent(container);
	pixelDensity(2);
	noLoop();
	smooth();

	buildPalette();
	regenerate();
}

function draw() {
	// Pass 0: background
	background(Palette.warmBeige);

	// Pass 1: grid (pebble-like with parallel bands) (mirrored)
	drawMirrored(() => {
		drawPebbleGrid();
	}, Params.symmetryJitter, Params.symmetryJitter);

	// Pass 2: shapes (circles + central figure)
	drawMirrored(() => {
		drawCircles();
		drawCentralClown();
	}, Params.symmetryJitter, Params.symmetryJitter);

	// Pass 3: semi-transparent washes
	drawWashes();

	// Pass 4: paper texture overlay (multiply)
	applyPaperTexture();
}

// -----------------------------
// Helpers: palette, seeding, regeneration
// -----------------------------
function buildPalette() {
	Palette = Object.fromEntries(
		Object.entries(RawPalette).map(([k, v]) => [k, color(...v)])
	);
}

function regenerate() {
	randomSeed(seedValue);
	noiseSeed(seedValue);
	buildGridPoints();
	distortGridPoints();
	buildPaperTexture();
	redraw();
}

function keyPressed() {
	if (key === "r" || key === "R") {
		seedValue = Math.floor(Math.random() * 1e9);
		regenerate();
	}
	if (key === "s" || key === "S") {
		saveCanvas("the_great_clown", "png");
	}
}

// -----------------------------
// Geometry builders
// -----------------------------
function buildGridPoints() {
	leftHalfPoints = [];
	for (let i = 0; i <= Params.gridColumns; i++) {
		const columnPoints = [];
		for (let j = 0; j <= Params.gridRows; j++) {
			const x = map(i, 0, Params.gridColumns, 0, width / 2);
			const y = map(j, 0, Params.gridRows, 0, height);
			columnPoints.push({ x, y });
		}
		leftHalfPoints.push(columnPoints);
	}
}

function distortGridPoints() {
	for (let i = 0; i < leftHalfPoints.length; i++) {
		for (let j = 0; j < leftHalfPoints[i].length; j++) {
			const p = leftHalfPoints[i][j];
			const n1 = noise(p.x * Params.noiseScale, p.y * Params.noiseScale);
			const n2 = noise((p.y + 1000) * Params.noiseScale, (p.x - 1000) * Params.noiseScale);
			const dx = (n1 - 0.5) * 2 * Params.distortionStrength;
			const dy = (n2 - 0.5) * 2 * Params.distortionStrength;
			p.x += dx;
			p.y += dy;
		}
	}
}

// -----------------------------
// Pass 1: Grid + Webbing
// -----------------------------
function drawGridLines() {
	stroke(Palette.mutedBlueGray);
	strokeWeight(1);
	noFill();

	// Vertical lines
	for (let i = 0; i < leftHalfPoints.length; i++) {
		for (let j = 0; j < leftHalfPoints[i].length - 1; j++) {
			const a = leftHalfPoints[i][j];
			const b = leftHalfPoints[i][j + 1];
			line(a.x, a.y, b.x, b.y);
		}
	}

	// Horizontal lines
	for (let j = 0; j <= Params.gridRows; j++) {
		for (let i = 0; i < Params.gridColumns; i++) {
			const a = leftHalfPoints[i][j];
			const b = leftHalfPoints[i + 1][j];
			line(a.x, a.y, b.x, b.y);
		}
	}
}

function drawWebbing() {
	// Organic connections using soft bezier strands between neighbors
	stroke(red(Palette.mutedBlueGray), green(Palette.mutedBlueGray), blue(Palette.mutedBlueGray), 90);
	strokeWeight(1);
	noFill();

	for (let i = 0; i < Params.gridColumns; i++) {
		for (let j = 0; j < Params.gridRows; j++) {
			const p00 = leftHalfPoints[i][j];
			const p10 = leftHalfPoints[i + 1][j];
			const p01 = leftHalfPoints[i][j + 1];
			const p11 = leftHalfPoints[i + 1][j + 1];

			// Horizontal strand (p00 -> p10)
			const midHX = (p00.x + p10.x) * 0.5;
			const bulgeH = (noise(midHX * 0.03, p00.y * 0.03) - 0.5) * 20;
			bezier(p00.x, p00.y, midHX, p00.y + bulgeH, midHX, p10.y - bulgeH, p10.x, p10.y);

			// Vertical strand (p00 -> p01)
			const midVY = (p00.y + p01.y) * 0.5;
			const bulgeV = (noise(p00.x * 0.03, midVY * 0.03) - 0.5) * 20;
			bezier(p00.x, p00.y, p00.x + bulgeV, midVY, p01.x - bulgeV, midVY, p01.x, p01.y);

			// Diagonal thin web
			strokeWeight(0.7);
			const n = noise((p00.x + p11.x) * 0.01, (p00.y + p11.y) * 0.01);
			if (n > 0.55) line(p00.x, p00.y, p11.x, p11.y);
			strokeWeight(1);
		}
	}
}

// New: Pebble-like grid made of bands of parallel curved lines
function drawPebbleGrid() {
	noFill();
	const baseCol = Palette.mutedBlueGray;

	// ---------------- Vertical bands ----------------
	for (let i = 0; i <= Params.gridColumns; i++) {
		const bandCount = Math.floor(random(Params.verticalLinesPerBandMin, Params.verticalLinesPerBandMax + 1));
		const bandWidth = random(3.0, 7.0);

		for (let j = 0; j < Params.gridRows; j++) {
			const a = leftHalfPoints[i][j];
			const b = leftHalfPoints[i][j + 1];
			const seg = createVector(b.x - a.x, b.y - a.y);
			const segLen = seg.mag();
			if (segLen < 0.0001) continue;
			const nrm = createVector(-seg.y, seg.x).normalize();

			// Estimate local cell width using neighbor column
			let localWidth = 20;
			if (i < Params.gridColumns) {
				const rTop = leftHalfPoints[i + 1][j];
				const rBot = leftHalfPoints[i + 1][j + 1];
				const w1 = createVector(rTop.x - a.x, rTop.y - a.y).mag();
				const w2 = createVector(rBot.x - b.x, rBot.y - b.y).mag();
				localWidth = (w1 + w2) * 0.5;
			} else if (i > 0) {
				const lTop = leftHalfPoints[i - 1][j];
				const lBot = leftHalfPoints[i - 1][j + 1];
				const w1 = createVector(a.x - lTop.x, a.y - lTop.y).mag();
				const w2 = createVector(b.x - lBot.x, b.y - lBot.y).mag();
				localWidth = (w1 + w2) * 0.5;
			}

			const bulge = localWidth * Params.parabolaCurveIntensity * random(0.7, 1.3);

			for (let k = 0; k < bandCount; k++) {
				const centerT = bandCount <= 1 ? 0 : map(k, 0, bandCount - 1, -0.5, 0.5);
				const offsetBase = centerT * bandWidth;
				const startOffset = offsetBase + randomGaussian(0, 0.25);
				const endOffset = offsetBase + randomGaussian(0, 0.25);

				const sx = a.x + nrm.x * startOffset;
				const sy = a.y + nrm.y * startOffset;
				const ex = b.x + nrm.x * endOffset;
				const ey = b.y + nrm.y * endOffset;

				const mx = (a.x + b.x) * 0.5;
				const my = (a.y + b.y) * 0.5;
				const c1x = lerp(sx, mx, 0.66) + nrm.x * bulge;
				const c1y = lerp(sy, my, 0.66) + nrm.y * bulge;
				const c2x = lerp(mx, ex, 0.66) + nrm.x * bulge;
				const c2y = lerp(my, ey, 0.66) + nrm.y * bulge;

				strokeWeight(random(Params.gridLineWeightMin, Params.gridLineWeightMax));
				stroke(red(baseCol), green(baseCol), blue(baseCol), Params.gridBandAlpha + random(-24, 36));
				bezier(sx, sy, c1x, c1y, c2x, c2y, ex, ey);
			}
		}
	}

	// ---------------- Horizontal bands ----------------
	for (let j = 0; j <= Params.gridRows; j++) {
		const bandCount = Math.floor(random(Params.horizontalLinesPerBandMin, Params.horizontalLinesPerBandMax + 1));
		const bandWidth = random(2.5, 6.5);

		for (let i = 0; i < Params.gridColumns; i++) {
			const a = leftHalfPoints[i][j];
			const b = leftHalfPoints[i + 1][j];
			const seg = createVector(b.x - a.x, b.y - a.y);
			const segLen = seg.mag();
			if (segLen < 0.0001) continue;
			const nrm = createVector(seg.y, -seg.x).normalize();

			// Estimate local cell height using neighbor row
			let localHeight = 20;
			if (j < Params.gridRows) {
				const bL = leftHalfPoints[i][j + 1];
				const bR = leftHalfPoints[i + 1][j + 1];
				const h1 = createVector(bL.x - a.x, bL.y - a.y).mag();
				const h2 = createVector(bR.x - b.x, bR.y - b.y).mag();
				localHeight = (h1 + h2) * 0.5;
			} else if (j > 0) {
				const tL = leftHalfPoints[i][j - 1];
				const tR = leftHalfPoints[i + 1][j - 1];
				const h1 = createVector(a.x - tL.x, a.y - tL.y).mag();
				const h2 = createVector(b.x - tR.x, b.y - tR.y).mag();
				localHeight = (h1 + h2) * 0.5;
			}

			const bulge = localHeight * Params.parabolaCurveIntensity * random(0.7, 1.3);

			for (let k = 0; k < bandCount; k++) {
				const centerT = bandCount <= 1 ? 0 : map(k, 0, bandCount - 1, -0.5, 0.5);
				const offsetBase = centerT * bandWidth;
				const startOffset = offsetBase + randomGaussian(0, 0.25);
				const endOffset = offsetBase + randomGaussian(0, 0.25);

				const sx = a.x + nrm.x * startOffset;
				const sy = a.y + nrm.y * startOffset;
				const ex = b.x + nrm.x * endOffset;
				const ey = b.y + nrm.y * endOffset;

				const mx = (a.x + b.x) * 0.5;
				const my = (a.y + b.y) * 0.5;
				const c1x = lerp(sx, mx, 0.66) + nrm.x * bulge;
				const c1y = lerp(sy, my, 0.66) + nrm.y * bulge;
				const c2x = lerp(mx, ex, 0.66) + nrm.x * bulge;
				const c2y = lerp(my, ey, 0.66) + nrm.y * bulge;

				strokeWeight(random(Params.gridLineWeightMin, Params.gridLineWeightMax));
				stroke(red(baseCol), green(baseCol), blue(baseCol), Params.gridBandAlpha + random(-24, 36));
				bezier(sx, sy, c1x, c1y, c2x, c2y, ex, ey);
			}
		}
	}
}

// -----------------------------
// Pass 2: Shapes (Circles + Central Figure)
// -----------------------------
function drawCircles() {
	noStroke();
	for (let i = 0; i < leftHalfPoints.length; i++) {
		for (let j = 0; j < leftHalfPoints[i].length; j++) {
			if (random() < Params.circleProbability) {
				const p = leftHalfPoints[i][j];
				const d = random(Params.circleSizeMin, Params.circleSizeMax);
				const jitterX = randomGaussian(0, 1.2);
				const jitterY = randomGaussian(0, 1.2);

				// Outer ring (deep red)
				fill(Palette.deepRed);
				ellipse(p.x + jitterX, p.y + jitterY, d * 0.98, d * 0.98);

				// Inner core (soft pink)
				fill(Palette.softPink);
				ellipse(p.x + jitterX * 0.6, p.y + jitterY * 0.6, d * 0.52, d * 0.52);

				// Slight highlight
				fill(255, 255, 255, 50);
				ellipse(p.x + jitterX - d * 0.12, p.y + jitterY - d * 0.12, d * 0.25, d * 0.25);
			}
		}
	}
}

function drawCentralClown() {
	const centerX = width / 4; // center of left half

	// Vertical body band
	noStroke();
	fill(red(Palette.goldenYellow), green(Palette.goldenYellow), blue(Palette.goldenYellow), 190);
	const bodyWidth = Math.max(18, width * 0.04);
	rect(centerX - bodyWidth * 0.5, height * 0.22, bodyWidth, height * 0.58, 3);

	// Face circle (upper-mid)
	fill(Palette.goldenYellow);
	const faceD = 68;
	ellipse(centerX, height * 0.34, faceD, faceD);
	fill(255, 255, 255, 45);
	ellipse(centerX - faceD * 0.18, height * 0.33, faceD * 0.35, faceD * 0.35);

	// Vertical streaks below (pant-legs feel)
	stroke(Palette.mutedBlueGray);
	strokeWeight(1.2);
	const legBaseY = height * 0.79;
	const legBottomY = height * 0.98;
	for (let k = -2; k <= 2; k++) {
		const off = k * (bodyWidth * 0.18);
		const split = k % 2 === 0 ? -1 : 1;
		const cx = centerX + off + random(-1, 1);
		line(cx, legBaseY, cx + split * random(16, 36), legBottomY);
	}

	// Horizontal crossbar
	noStroke();
	fill(200, 200, 100, 180);
	rect(0, height * 0.5 - 6, width / 2, 12);
}

// -----------------------------
// Pass 3: Washes
// -----------------------------
function drawWashes() {
	noStroke();
	// Soft overall warm glaze
	fill(255, 255, 200, Params.washOpacity);
	rect(0, 0, width, height);

	// Subtle vignetting using translucent bands
	for (let i = 0; i < 6; i++) {
		const alpha = map(i, 0, 5, 10, 30);
		fill(0, 0, 0, alpha);
		rect(0, (i / 6) * height, width, height / 20);
	}

	// Light lavender wash near top to echo print ink
	fill(210, 190, 230, 16);
	rect(0, 0, width, height * 0.42);
}

// -----------------------------
// Pass 4: Paper Texture
// -----------------------------
function buildPaperTexture() {
	paperTextureGfx = createGraphics(width, height);
	paperTextureGfx.pixelDensity(1);
	paperTextureGfx.noStroke();
	paperTextureGfx.clear();

	// Base grain
	for (let i = 0; i < width * height * 0.004; i++) {
		const x = random(width);
		const y = random(height);
		const v = random(230, 255);
		paperTextureGfx.fill(v, v, v, 18);
		paperTextureGfx.rect(x, y, random(0.5, 1.2), random(0.5, 1.2));
	}

	// Soft cloudy pulp
	for (let i = 0; i < 1400; i++) {
		const x = random(width);
		const y = random(height);
		const r = random(6, 24);
		paperTextureGfx.fill(255, 255, 255, 10);
		paperTextureGfx.ellipse(x, y, r, r);
	}

	// Deckled edges
	paperTextureGfx.noFill();
	paperTextureGfx.stroke(0, 0, 0, 20);
	for (let i = 0; i < 30; i++) {
		paperTextureGfx.strokeWeight(random(0.2, 0.6));
		paperTextureGfx.rect(
			2 + random(-1, 1),
			2 + random(-1, 1),
			width - 4 + random(-2, 2),
			height - 4 + random(-2, 2),
			2
		);
	}
}

function applyPaperTexture() {
	if (!paperTextureGfx) return;
	push();
	blendMode(MULTIPLY);
	tint(255, Params.textureOpacity * 255);
	image(paperTextureGfx, 0, 0, width, height);
	pop();
	noTint();
}

// -----------------------------
// Utility: Vertical mirroring with slight jitter
// -----------------------------
function drawMirrored(drawHalfFn, jitterX = 0, jitterY = 0) {
	push();
	drawHalfFn();
	pop();

	push();
	translate(width, 0);
	scale(-1, 1); // mirror across center line
	translate(random(-jitterX, jitterX), random(-jitterY, jitterY)); // misregistration
	drawHalfFn();
	pop();
}


