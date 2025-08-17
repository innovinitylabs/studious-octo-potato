// ========================================
// THE GREAT CLOWN - Cleaned & Refactored
// ========================================

let seedValue = 123456789;
let gridX = [];
let gridY = [];

// Global compression variables
let compressionCenter = { x: 0, y: 0 };
let compressionStrength = 0.0;
let compressionRadius = 0.0;

// ========================================
// CONFIGURATION
// ========================================

const Config = {
    // Canvas settings
    canvasWidth: 800,
    canvasHeight: 1200,
    
    // Grid settings - Reduced density for larger, visible cells
    minCols: 8,  // Much lower density
    maxCols: 12, // Much lower density
    minRows: 10, // Much lower density
    maxRows: 15, // Much lower density
    
    // Visual settings
    cornerRadiusFrac: 0.15,
    strokeWeight: 2.0, // Increased stroke weight for visibility
    textureOpacity: 0.25,
    
    // Compression settings - Softer compression to prevent cell collapse
    enableCompression: true,
    compressionStrengthMin: 0.3, // Much softer compression
    compressionStrengthMax: 0.6, // Much softer compression
    compressionRadiusMin: 0.3,
    compressionRadiusMax: 0.5,
    compressionFalloff: 1.5,
    
    // Brush settings
    useEnhancedBrush: true,
    brushPressureVariation: 0.8,
    brushVibration: 0.6,
    brushQuality: 3,
    brushStrokeCount: 2
};

let Palette = {};

// ========================================
// SETUP & DRAW
// ========================================

function setup() {
    console.log("=== SETUP START ===");
    createCanvas(Config.canvasWidth, Config.canvasHeight);
    console.log("Canvas created:", width, "x", height);
    
    // Initialize palette after p5.js is loaded
    Palette = {
        warmBeige: color(245, 240, 230),
        mutedBlueGray: color(120, 130, 140),
        deepRed: color(180, 60, 60)
    };
    console.log("Palette initialized");
    
    regenerate();
    console.log("=== SETUP COMPLETE ===");
}

function draw() {
    // Stop continuous drawing
    noLoop();
    
    console.log("=== DRAW START ===");
    
    // 1. Paper background first
    renderPaperBackground();
    console.log("Background rendered");
    
    // 2. Compression visualization (if enabled)
    if (Config.enableCompression) {
        drawCompressionVisualization();
        console.log("Compression visualization rendered");
    }
    
    // 3. Main grid of rounded rectangles
    renderGrid();
    console.log("Grid rendered");
    
    // 4. Compression focal point (for debugging)
    if (Config.enableCompression) {
        drawCompressionFocalPoint();
        console.log("Focal point rendered");
    }
    
    console.log("=== DRAW COMPLETE ===");
}

function regenerate() {
    randomSeed(seedValue);
    noiseSeed(seedValue);
    
    // Choose dynamic grid size
    Config.cols = Math.floor(random(Config.minCols, Config.maxCols + 1));
    Config.rows = Math.floor(random(Config.minRows, Config.maxRows + 1));
    
    // Initialize compression
    initializeCompression();
    
    // Build grid
    buildGrid();
    
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

// ========================================
// GRID SYSTEM
// ========================================

function buildGrid() {
    gridX = [0];
    gridY = [0];
    
    // Build horizontal grid lines
    const gutterX = width * 0.08; // Much larger gutter
    const tileW = (width - gutterX * (Config.cols + 1)) / Config.cols;
    
    for (let i = 0; i < Config.cols; i++) {
        const x = gridX[i] + tileW + random(-tileW * 0.1, tileW * 0.1); // Much smaller jitter
        gridX.push(x);
    }
    gridX[gridX.length - 1] = width; // Ensure last line reaches edge
    
    // Build vertical grid lines
    const gutterY = height * 0.08; // Much larger gutter
    const tileH = (height - gutterY * (Config.rows + 1)) / Config.rows;
    
    for (let j = 0; j < Config.rows; j++) {
        const y = gridY[j] + tileH + random(-tileH * 0.1, tileH * 0.1); // Much smaller jitter
        gridY.push(y);
    }
    gridY[gridY.length - 1] = height; // Ensure last line reaches edge
    
    // Apply compression if enabled
    if (Config.enableCompression) {
        applyCompressionToGrid();
    }
}

// ========================================
// COMPRESSION SYSTEM
// ========================================

function initializeCompression() {
    if (!Config.enableCompression) {
        compressionStrength = 0.0;
        compressionRadius = 0.0;
        return;
    }
    
    // Choose focal point away from edges
    const margin = 0.15;
    compressionCenter.x = random(width * margin, width * (1 - margin));
    compressionCenter.y = random(height * margin, height * (1 - margin));
    
    // Set compression parameters
    compressionStrength = random(Config.compressionStrengthMin, Config.compressionStrengthMax);
    compressionRadius = random(Config.compressionRadiusMin, Config.compressionRadiusMax) * min(width, height);
}

function getCompressionFactor(x, y) {
    if (compressionStrength === 0.0) return 1.0;
    
    const distance = dist(x, y, compressionCenter.x, compressionCenter.y);
    const normalizedDistance = distance / compressionRadius;
    
    if (normalizedDistance >= 1.0) return 1.0;
    
    // Two-zone gradient system with softer compression
    if (normalizedDistance <= 0.25) {
        // Inside yellow circle: gradient from center to yellow circle
        const yellowGradient = normalizedDistance / 0.25;
        const compressionFactor = 0.3 + (0.4 * yellowGradient); // Softer compression (0.3-0.7)
        return constrain(compressionFactor, 0.3, 0.7);
    } else {
        // Between yellow and red circles: gradient from yellow to red
        const redGradient = (normalizedDistance - 0.25) / 0.75;
        const falloff = pow(1.0 - redGradient, Config.compressionFalloff);
        const compressionFactor = 0.7 + (0.3 * falloff);
        return constrain(compressionFactor, 0.7, 1.0);
    }
}

function applyCompressionToGrid() {
    if (!Config.enableCompression || compressionStrength === 0.0) return;
    
    const compressedGridX = [];
    const compressedGridY = [];
    
    // Compress horizontal lines
    for (let i = 0; i < gridX.length; i++) {
        const originalX = gridX[i];
        const compressionFactor = getCompressionFactor(originalX, compressionCenter.y);
        const compressedX = lerp(originalX, compressionCenter.x, 1.0 - compressionFactor);
        compressedGridX.push(compressedX);
    }
    
    // Compress vertical lines
    for (let j = 0; j < gridY.length; j++) {
        const originalY = gridY[j];
        const compressionFactor = getCompressionFactor(compressionCenter.x, originalY);
        const compressedY = lerp(originalY, compressionCenter.y, 1.0 - compressionFactor);
        compressedGridY.push(compressedY);
    }
    
    gridX = compressedGridX;
    gridY = compressedGridY;
}

// ========================================
// RENDERING FUNCTIONS
// ========================================

function renderPaperBackground() {
    background(Palette.warmBeige);
    
    // Subtle paper texture
    noStroke();
    for (let i = 0; i < 800; i++) {
        const x = random(width);
        const y = random(height);
        const r = random(6, 24);
        fill(255, 255, 255, 6);
        ellipse(x, y, r, r);
    }
}

function renderGrid() {
    console.log("=== RENDER GRID DEBUG ===");
    console.log("Grid X:", gridX);
    console.log("Grid Y:", gridY);
    console.log("Config cols:", Config.cols, "rows:", Config.rows);
    
    noFill();
    
    // Calculate cell dimensions from compressed grid
    const colWidths = [];
    for (let i = 0; i < Config.cols; i++) {
        colWidths.push(gridX[i + 1] - gridX[i]);
    }
    
    const rowHeights = [];
    for (let j = 0; j < Config.rows; j++) {
        rowHeights.push(gridY[j + 1] - gridY[j]);
    }
    
    console.log("Col widths:", colWidths);
    console.log("Row heights:", rowHeights);
    
    // Draw rounded rectangles
    for (let j = 0; j < Config.rows; j++) {
        for (let i = 0; i < Config.cols; i++) {
            const x = gridX[i];
            const y = gridY[j];
            const w = colWidths[i];
            const h = rowHeights[j];
            const r = min(w, h) * Config.cornerRadiusFrac;
            
            console.log(`Drawing cell ${i},${j} at (${x},${y}) with size (${w},${h}) and radius ${r}`);
            
            drawRoundedRect(x, y, w, h, r);
        }
    }
    
    // Draw gut lines between cells
    renderGutLines();
    console.log("=== END RENDER GRID DEBUG ===");
}

function drawRoundedRect(x, y, w, h, r) {
    const layers = Math.floor(random(2, 4));
    const colors = [Palette.mutedBlueGray, Palette.deepRed];
    
    for (let i = 0; i < layers; i++) {
        const col = random(colors);
        const alpha = random(40, 80);
        stroke(red(col), green(col), blue(col), alpha);
        strokeWeight(Config.strokeWeight + random(-0.4, 0.4));
        
        const jitter = 2;
        push();
        translate(random(-jitter, jitter), random(-jitter, jitter));
        roundedRect(x, y, w, h, r);
        pop();
    }
}

function roundedRect(x, y, w, h, r) {
    const k = 0.5523;
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

function renderGutLines() {
    stroke(Palette.mutedBlueGray);
    strokeWeight(0.8);
    
    // Vertical gut lines
    for (let i = 1; i < gridX.length - 1; i++) {
        const x = gridX[i];
        line(x, 0, x, height);
    }
    
    // Horizontal gut lines
    for (let j = 1; j < gridY.length - 1; j++) {
        const y = gridY[j];
        line(0, y, width, y);
    }
}

// ========================================
// COMPRESSION VISUALIZATION
// ========================================

function drawCompressionVisualization() {
    if (!Config.enableCompression || compressionStrength === 0.0) return;
    
    push();
    noStroke();
    
    // Draw compressed grid cells with color intensity
    for (let i = 0; i < Config.cols; i++) {
        for (let j = 0; j < Config.rows; j++) {
            const xL = gridX[i];
            const xR = gridX[i + 1];
            const yT = gridY[j];
            const yB = gridY[j + 1];
            
            const cellCenterX = (xL + xR) / 2;
            const cellCenterY = (yT + yB) / 2;
            
            const compressionFactor = getCompressionFactor(cellCenterX, cellCenterY);
            const intensity = (1.0 - compressionFactor) * 255;
            fill(255, 0, 0, intensity * 0.2);
            
            rect(xL, yT, xR - xL, yB - yT);
        }
    }
    pop();
}

function drawCompressionFocalPoint() {
    if (!Config.enableCompression || compressionStrength === 0.0) return;
    
    push();
    noFill();
    
    // Red boundary circle
    stroke(255, 0, 0, 150);
    strokeWeight(3);
    circle(compressionCenter.x, compressionCenter.y, compressionRadius * 2);
    
    // Yellow core circle (25% of radius)
    stroke(255, 255, 0, 150);
    strokeWeight(6);
    const coreRadius = compressionRadius * 0.25;
    circle(compressionCenter.x, compressionCenter.y, coreRadius * 2);
    
    // Center dot
    stroke(255, 255, 0, 255);
    strokeWeight(4);
    circle(compressionCenter.x, compressionCenter.y, 15);
    
    pop();
}
