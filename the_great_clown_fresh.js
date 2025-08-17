// THE GREAT CLOWN - Fresh Start
// A grid-based artwork with paper texture and compression effects

// PRNG (Pseudo-Random Number Generator) Setup
class PRNG {
    constructor(seed = null) {
        this.seed = seed || Math.floor(Math.random() * 1000000);
        this.state = this.seed;
        console.log("PRNG initialized with seed:", this.seed);
    }
    
    // Linear Congruential Generator
    next() {
        this.state = (this.state * 1664525 + 1013904223) % 4294967296;
        return this.state / 4294967296;
    }
    
    // Get random number between min and max
    random(min, max) {
        return min + this.next() * (max - min);
    }
    
    // Get random integer between min and max (inclusive)
    randomInt(min, max) {
        return Math.floor(this.random(min, max + 1));
    }
    
    // Get random element from array
    randomChoice(array) {
        return array[this.randomInt(0, array.length - 1)];
    }
    
    // Reset to initial seed
    reset() {
        this.state = this.seed;
    }
}

// Configuration
const Config = {
    // Canvas settings
    canvasWidth: 800,
    canvasHeight: 1200,
    
    // PRNG settings
    usePRNG: true,
    seed: null, // null = random seed, or set a number for reproducible results
    
    // Grid settings
    gridCols: 15,
    gridRows: 20,
    
    // Visual settings
    strokeWeight: 2,
    cornerRadius: 11,
    paperColor: [245, 240, 230],
    gridColor: [80, 70, 60],
    
    // Compression settings
    compressionRadius: 250,
    compressionStrength: 5,
    compressionFalloff: 2.0
};

// Global variables
let prng;
let gridX = [];
let gridY = [];
let focalPoint = { x: 0, y: 0 };

function setup() {
    console.log("=== SETUP START ===");
    createCanvas(Config.canvasWidth, Config.canvasHeight);
    console.log("Canvas created:", width, "x", height);
    
    // Initialize PRNG
    if (Config.usePRNG) {
        prng = new PRNG(Config.seed);
        console.log("PRNG initialized with seed:", prng.seed);
    }
    
    // Initialize focal point with PRNG
    if (Config.usePRNG && prng) {
        focalPoint.x = prng.random(width * 0.3, width * 0.7);
        focalPoint.y = prng.random(height * 0.3, height * 0.7);
    } else {
        focalPoint.x = width / 2;
        focalPoint.y = height / 2;
    }
    
    console.log("Focal point:", focalPoint.x, focalPoint.y);
    
    // Build the grid
    buildGrid();
    
    console.log("=== SETUP COMPLETE ===");
}

function draw() {
    // Stop continuous drawing
    noLoop();
    
    console.log("=== DRAW START ===");
    
    // 1. Paper background
    renderPaperBackground();
    console.log("Paper background rendered");
    
    // 2. Main grid
    renderGrid();
    console.log("Grid rendered");
    
    // 3. Focal point visualization
    drawFocalPoint();
    console.log("Focal point rendered");
    
    console.log("=== DRAW COMPLETE ===");
}

function buildGrid() {
    console.log("=== BUILDING GRID ===");
    
    // Initialize grid arrays
    gridX = [];
    gridY = [];
    
    // Calculate base cell sizes with gutters
    const gutterX = width * 0.05;
    const gutterY = height * 0.05;
    const baseCellWidth = (width - gutterX * (Config.gridCols + 1)) / Config.gridCols;
    const baseCellHeight = (height - gutterY * (Config.gridRows + 1)) / Config.gridRows;
    
    console.log("Base cell size:", baseCellWidth, "x", baseCellHeight);
    console.log("Gutters:", gutterX, "x", gutterY);
    
    // Build horizontal grid lines with density variation
    for (let i = 0; i <= Config.gridCols; i++) {
        let x = gutterX + i * (baseCellWidth + gutterX);
        
        // Add subtle random jitter if PRNG is enabled
        if (Config.usePRNG && prng) {
            const jitter = prng.random(-baseCellWidth * 0.1, baseCellWidth * 0.1);
            x += jitter;
        }
        
        gridX.push(x);
    }
    
    // Build vertical grid lines with density variation
    for (let j = 0; j <= Config.gridRows; j++) {
        let y = gutterY + j * (baseCellHeight + gutterY);
        
        // Add subtle random jitter if PRNG is enabled
        if (Config.usePRNG && prng) {
            const jitter = prng.random(-baseCellHeight * 0.1, baseCellHeight * 0.1);
            y += jitter;
        }
        
        gridY.push(y);
    }
    
    // Apply compression to create more density in compression area
    if (Config.compressionRadius > 0) {
        applyCompressionDensity();
    }
    
    console.log("Grid X positions:", gridX.length);
    console.log("Grid Y positions:", gridY.length);
    console.log("=== GRID BUILT ===");
}

function applyCompressionDensity() {
    console.log("=== APPLYING COMPRESSION DENSITY ===");
    
    // Create additional grid lines in compression area
    const additionalLines = [];
    
    // Add horizontal lines in compression area
    for (let i = 0; i < gridX.length - 1; i++) {
        const x1 = gridX[i];
        const x2 = gridX[i + 1];
        const midX = (x1 + x2) / 2;
        
        // Check if this cell is in compression area
        const distance = dist(midX, focalPoint.y, focalPoint.x, focalPoint.y);
        if (distance < Config.compressionRadius) {
            const factor = getCompressionFactor(distance);
            const additionalLinesCount = Math.floor(factor * 3); // 0-3 additional lines
            
            for (let j = 1; j <= additionalLinesCount; j++) {
                const t = j / (additionalLinesCount + 1);
                const newX = lerp(x1, x2, t);
                additionalLines.push({ x: newX, y: null, type: 'horizontal' });
            }
        }
    }
    
    // Add vertical lines in compression area
    for (let j = 0; j < gridY.length - 1; j++) {
        const y1 = gridY[j];
        const y2 = gridY[j + 1];
        const midY = (y1 + y2) / 2;
        
        // Check if this cell is in compression area
        const distance = dist(focalPoint.x, midY, focalPoint.x, focalPoint.y);
        if (distance < Config.compressionRadius) {
            const factor = getCompressionFactor(distance);
            const additionalLinesCount = Math.floor(factor * 3); // 0-3 additional lines
            
            for (let k = 1; k <= additionalLinesCount; k++) {
                const t = k / (additionalLinesCount + 1);
                const newY = lerp(y1, y2, t);
                additionalLines.push({ x: null, y: newY, type: 'vertical' });
            }
        }
    }
    
    // Add the additional lines to the grid arrays
    additionalLines.forEach(line => {
        if (line.type === 'horizontal') {
            gridX.push(line.x);
        } else {
            gridY.push(line.y);
        }
    });
    
    // Sort the arrays to maintain order
    gridX.sort((a, b) => a - b);
    gridY.sort((a, b) => a - b);
    
    // Now apply compression to move lines toward focal point
    applyCompressionToGrid();
    
    console.log("Added", additionalLines.length, "additional grid lines");
}

function applyCompressionToGrid() {
    console.log("=== APPLYING COMPRESSION TO GRID ===");
    
    // Compress horizontal lines
    for (let i = 0; i < gridX.length; i++) {
        const distance = dist(gridX[i], focalPoint.y, focalPoint.x, focalPoint.y);
        if (distance < Config.compressionRadius) {
            const factor = getCompressionFactor(distance);
            // Move line toward focal point (compression)
            gridX[i] = lerp(gridX[i], focalPoint.x, factor);
        }
    }
    
    // Compress vertical lines
    for (let j = 0; j < gridY.length; j++) {
        const distance = dist(focalPoint.x, gridY[j], focalPoint.x, focalPoint.y);
        if (distance < Config.compressionRadius) {
            const factor = getCompressionFactor(distance);
            // Move line toward focal point (compression)
            gridY[j] = lerp(gridY[j], focalPoint.y, factor);
        }
    }
}

function getCompressionFactor(distance) {
    const normalizedDistance = distance / Config.compressionRadius;
    if (normalizedDistance >= 1.0) return 0.0;
    
    // Create smooth falloff from center - maximum compression at center
    const falloff = pow(1.0 - normalizedDistance, Config.compressionFalloff);
    // Scale the factor to create more dramatic compression
    return falloff * 0.8; // 0.8 = 80% compression at center
}

function renderPaperBackground() {
    // Paper color
    background(Config.paperColor[0], Config.paperColor[1], Config.paperColor[2]);
    
    // Add subtle paper texture
    for (let i = 0; i < 1000; i++) {
        const x = Config.usePRNG ? prng.random(0, width) : random(width);
        const y = Config.usePRNG ? prng.random(0, height) : random(height);
        const alpha = Config.usePRNG ? prng.random(5, 15) : random(5, 15);
        stroke(200, 195, 185, alpha);
        strokeWeight(0.5);
        point(x, y);
    }
}

function renderGrid() {
    stroke(Config.gridColor[0], Config.gridColor[1], Config.gridColor[2]);
    strokeWeight(Config.strokeWeight);
    noFill();
    
    // Draw each cell in the grid
    for (let i = 0; i < gridX.length - 1; i++) {
        for (let j = 0; j < gridY.length - 1; j++) {
            const x = gridX[i];
            const y = gridY[j];
            const w = gridX[i + 1] - gridX[i];
            const h = gridY[j + 1] - gridY[j];
            
            // Only draw if cell has positive dimensions
            if (w > 0 && h > 0) {
                drawCurvedCell(x, y, w, h);
            }
        }
    }
}

function drawCurvedCell(x, y, w, h) {
    // Calculate corner radius (smaller than the cell size)
    const radius = min(Config.cornerRadius, min(w, h) * 0.3);
    
    // Draw the cell with curved corners using bezier curves
    beginShape();
    
    // Top edge
    vertex(x + radius, y);
    vertex(x + w - radius, y);
    
    // Top-right corner
    bezierVertex(x + w, y, x + w, y, x + w, y + radius);
    
    // Right edge
    vertex(x + w, y + radius);
    vertex(x + w, y + h - radius);
    
    // Bottom-right corner
    bezierVertex(x + w, y + h, x + w, y + h, x + w - radius, y + h);
    
    // Bottom edge
    vertex(x + w - radius, y + h);
    vertex(x + radius, y + h);
    
    // Bottom-left corner
    bezierVertex(x, y + h, x, y + h, x, y + h - radius);
    
    // Left edge
    vertex(x, y + h - radius);
    vertex(x, y + radius);
    
    // Top-left corner
    bezierVertex(x, y, x, y, x + radius, y);
    
    endShape(CLOSE);
}

function drawFocalPoint() {
    // Draw compression radius
    noFill();
    stroke(255, 0, 0, 100);
    strokeWeight(2);
    circle(focalPoint.x, focalPoint.y, Config.compressionRadius * 2);
    
    // Draw focal point center
    fill(255, 0, 0);
    noStroke();
    circle(focalPoint.x, focalPoint.y, 10);
}

// Keyboard controls
function keyPressed() {
    if (key === 'r' || key === 'R') {
        console.log("=== REGENERATING WITH NEW SEED ===");
        // Generate new random seed
        Config.seed = Math.floor(Math.random() * 1000000);
        console.log("New seed:", Config.seed);
        
        // Rebuild everything
        if (Config.usePRNG) {
            prng = new PRNG(Config.seed);
        }
        
        // New focal point
        if (Config.usePRNG && prng) {
            focalPoint.x = prng.random(width * 0.3, width * 0.7);
            focalPoint.y = prng.random(height * 0.3, height * 0.7);
        }
        
        buildGrid();
        redraw();
    }
    
    if (key === 's' || key === 'S') {
        console.log("=== SAVING ARTWORK ===");
        saveCanvas('the_great_clown_' + prng.seed + '.png');
    }
    
    if (key === 'd' || key === 'D') {
        console.log("=== TOGGLING PRNG ===");
        Config.usePRNG = !Config.usePRNG;
        console.log("PRNG enabled:", Config.usePRNG);
        redraw();
    }
}
