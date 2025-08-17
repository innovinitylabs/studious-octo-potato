// ============================================================================
// THE GREAT CLOWN - Fresh Start
// ============================================================================
// A grid-based artwork with paper texture and dynamic compression effects
// Features: Curved rectangles, focal point compression, PRNG for reproducibility

// ============================================================================
// PSEUDO-RANDOM NUMBER GENERATOR (PRNG)
// ============================================================================
// This class provides reproducible randomness - same seed always produces same sequence
// Useful for creating consistent artwork that can be regenerated exactly
class PRNG {
    constructor(seed = null) {
        this.seed = seed || Math.floor(Math.random() * 1000000);  // Use provided seed or generate random one
        this.state = this.seed;                                   // Current state of the generator
        console.log("PRNG initialized with seed:", this.seed);
    }
    
    // Generate the next random number in the sequence
    // Uses Linear Congruential Generator algorithm for good randomness
    next() {
        this.state = (this.state * 1664525 + 1013904223) % 4294967296;
        return this.state / 4294967296;  // Returns value between 0 and 1
    }
    
    // Get a random number between min and max values
    random(min, max) {
        return min + this.next() * (max - min);
    }
    
    // Get a random integer between min and max (inclusive)
    randomInt(min, max) {
        return Math.floor(this.random(min, max + 1));
    }
    
    // Get a random element from an array
    randomChoice(array) {
        return array[this.randomInt(0, array.length - 1)];
    }
    
    // Reset the generator back to its initial seed state
    reset() {
        this.state = this.seed;
    }
}

// Configuration
// ============================================================================
// CONFIGURATION - All settings for the artwork generation
// ============================================================================
const Config = {
    // ===== COMPRESSION DENSITY SETTINGS (EASY TO EDIT) =====
    compressionRadius: 400,        // How far the compression effect reaches (pixels)
    compressionStrength: 50,       // How strong the compression is (multiplier)
    compressionFalloff: 0.8,       // How quickly compression fades from center (smoothness)
    horizontalDensityMultiplier: 8, // How many additional horizontal lines to add (was 4)
    verticalDensityMultiplier: 12,  // How many additional vertical lines to add (was 4)
    
    // ===== GRID STRUCTURE =====
    gridCols: 8,                   // Number of columns in the base grid
    gridRows: 8,                   // Number of rows in the base grid
    
    // ===== SPACING BETWEEN RECTANGLES =====
    minGap: 8,                     // Minimum gap between rectangles (pixels)
    maxGap: 11,                    // Maximum gap between rectangles (pixels)
    gapRatio: 0.06,                // Gap as percentage of cell size (6% = moderate spacing)
    
    // ===== CANVAS DIMENSIONS =====
    canvasWidth: 800,              // Width of the artwork canvas
    canvasHeight: 1200,            // Height of the artwork canvas
    
    // ===== RANDOMNESS CONTROL =====
    usePRNG: true,                 // Use Pseudo-Random Number Generator for reproducible results
    seed: null,                    // null = random seed each time, or set a number for consistent results
    
    // ===== VISUAL APPEARANCE =====
    strokeWeight: 2,               // Thickness of rectangle borders
    cornerRadius: 8,               // How rounded the rectangle corners are
    paperColor: [245, 240, 230],   // Background color (light beige)
    gridColor: [80, 70, 60]        // Rectangle border color (dark brown)
};

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================
let prng;                    // Pseudo-random number generator instance
let gridX = [];              // Array of X positions for vertical grid lines
let gridY = [];              // Array of Y positions for horizontal grid lines
let focalPoint = { x: 0, y: 0 };  // Center point where compression effect is strongest

// ============================================================================
// P5.JS SETUP FUNCTION - Called once at the start
// ============================================================================
function setup() {
    console.log("=== SETUP START ===");
    
    // Create the canvas with specified dimensions
    createCanvas(Config.canvasWidth, Config.canvasHeight);
    console.log("Canvas created:", width, "x", height);
    
    // Initialize the pseudo-random number generator if enabled
    if (Config.usePRNG) {
        prng = new PRNG(Config.seed);
        console.log("PRNG initialized with seed:", prng.seed);
    }
    
    // Set the focal point (center of compression effect)
    // Place it in the middle 40% of the canvas for good visual balance
    if (Config.usePRNG && prng) {
        focalPoint.x = prng.random(width * 0.3, width * 0.7);   // 30% to 70% of width
        focalPoint.y = prng.random(height * 0.3, height * 0.7); // 30% to 70% of height
    } else {
        focalPoint.x = width / 2;   // Center of canvas
        focalPoint.y = height / 2;  // Center of canvas
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

// ============================================================================
// BUILD GRID - Create the base grid structure
// ============================================================================
// This function creates the foundation grid that will be compressed later
// It builds the grid from the center outward to ensure proper centering
function buildGrid() {
    console.log("=== BUILDING GRID ===");
    
    // Clear previous grid data
    gridX = [];  // Will store X positions of vertical lines
    gridY = [];  // Will store Y positions of horizontal lines
    
    // Get gap settings for spacing between rectangles
    const minGap = Config.minGap;  // Minimum space between rectangles
    const maxGap = Config.maxGap;  // Maximum space between rectangles
    
    // Calculate grid dimensions with proper centering
    const edgeMargin = 20;                    // Space from canvas edge
    const gridWidth = width - (edgeMargin * 2);   // Available width for grid
    const gridHeight = height - (edgeMargin * 2); // Available height for grid
    
    // Calculate how much space gaps will take up
    const totalGapsX = Config.gridCols + 1;   // Number of gaps between columns
    const totalGapsY = Config.gridRows + 1;   // Number of gaps between rows
    const totalGapSpaceX = totalGapsX * maxGap;  // Total horizontal gap space
    const totalGapSpaceY = totalGapsY * maxGap;  // Total vertical gap space
    
    // Calculate available space for actual rectangles
    const availableWidth = gridWidth - totalGapSpaceX;   // Space for rectangles
    const availableHeight = gridHeight - totalGapSpaceY; // Space for rectangles
    const baseCellWidth = availableWidth / Config.gridCols;   // Width of each rectangle
    const baseCellHeight = availableHeight / Config.gridRows; // Height of each rectangle
    
    console.log("Grid dimensions:", gridWidth, "x", gridHeight);
    console.log("Base cell size:", baseCellWidth, "x", baseCellHeight);
    console.log("Dynamic gaps:", minGap, "to", maxGap, "pixels");
    
    // ===== BUILD HORIZONTAL GRID LINES (X positions) =====
    // Start from center and build outward to ensure proper centering
    const centerX = width / 2;                    // Center of canvas
    const halfCols = Math.floor(Config.gridCols / 2);  // Half the number of columns
    
    // Place the center line first
    let currentX = centerX;
    gridX.push(currentX);  // Add center line to array
    
    // ===== BUILD RIGHT SIDE (from center to right edge) =====
    for (let i = 1; i <= halfCols; i++) {
        // Generate random gap between rectangles
        const dynamicGap = Config.usePRNG ? 
            prng.random(minGap, maxGap) : 
            random(minGap, maxGap);
        
        // Move to next position: current + gap + rectangle width
        currentX += dynamicGap + baseCellWidth;
        
        // Add subtle random jitter for organic feel
        let x = currentX;
        if (Config.usePRNG && prng) {
            const jitter = prng.random(-baseCellWidth * 0.05, baseCellWidth * 0.05);
            x += jitter;  // Small random offset
        }
        
        // Keep within boundaries (center to right edge)
        x = constrain(x, centerX, width - edgeMargin);
        gridX.push(x);  // Add to end of array
    }
    
    // ===== BUILD LEFT SIDE (from center to left edge) =====
    currentX = centerX;  // Start from center again
    for (let i = 1; i <= halfCols; i++) {
        // Generate random gap between rectangles
        const dynamicGap = Config.usePRNG ? 
            prng.random(minGap, maxGap) : 
            random(minGap, maxGap);
        
        // Move to next position: current - gap - rectangle width
        currentX -= (dynamicGap + baseCellWidth);
        
        // Add subtle random jitter for organic feel
        let x = currentX;
        if (Config.usePRNG && prng) {
            const jitter = prng.random(-baseCellWidth * 0.05, baseCellWidth * 0.05);
            x += jitter;  // Small random offset
        }
        
        // Keep within boundaries (left edge to center)
        x = constrain(x, edgeMargin, centerX);
        gridX.unshift(x);  // Add to beginning of array (left side)
    }
    
    // ===== BUILD VERTICAL GRID LINES (Y positions) =====
    // Same process as horizontal lines, but for vertical positioning
    const centerY = height / 2;                   // Center of canvas
    const halfRows = Math.floor(Config.gridRows / 2);  // Half the number of rows
    
    // Place the center line first
    let currentY = centerY;
    gridY.push(currentY);  // Add center line to array
    
    // ===== BUILD BOTTOM SIDE (from center to bottom edge) =====
    for (let j = 1; j <= halfRows; j++) {
        // Generate random gap between rectangles
        const dynamicGap = Config.usePRNG ? 
            prng.random(minGap, maxGap) : 
            random(minGap, maxGap);
        
        // Move to next position: current + gap + rectangle height
        currentY += dynamicGap + baseCellHeight;
        
        // Add subtle random jitter for organic feel
        let y = currentY;
        if (Config.usePRNG && prng) {
            const jitter = prng.random(-baseCellHeight * 0.05, baseCellHeight * 0.05);
            y += jitter;  // Small random offset
        }
        
        // Keep within boundaries (center to bottom edge)
        y = constrain(y, centerY, height - edgeMargin);
        gridY.push(y);  // Add to end of array
    }
    
    // ===== BUILD TOP SIDE (from center to top edge) =====
    currentY = centerY;  // Start from center again
    for (let j = 1; j <= halfRows; j++) {
        // Generate random gap between rectangles
        const dynamicGap = Config.usePRNG ? 
            prng.random(minGap, maxGap) : 
            random(minGap, maxGap);
        
        // Move to next position: current - gap - rectangle height
        currentY -= (dynamicGap + baseCellHeight);
        
        // Add subtle random jitter for organic feel
        let y = currentY;
        if (Config.usePRNG && prng) {
            const jitter = prng.random(-baseCellHeight * 0.05, baseCellHeight * 0.05);
            y += jitter;  // Small random offset
        }
        
        // Keep within boundaries (top edge to center)
        y = constrain(y, edgeMargin, centerY);
        gridY.unshift(y);  // Add to beginning of array (top side)
    }
    
    // Apply compression to create more density in compression area
    if (Config.compressionRadius > 0) {
        applyCompressionDensity();
    }
    
    console.log("Grid X positions:", gridX.length);
    console.log("Grid Y positions:", gridY.length);
    console.log("First X:", gridX[0], "Last X:", gridX[gridX.length - 1]);
    console.log("First Y:", gridY[0], "Last Y:", gridY[gridY.length - 1]);
    console.log("=== GRID BUILT ===");
}

// ============================================================================
// APPLY COMPRESSION DENSITY - Add more grid lines in compression area
// ============================================================================
// This function creates additional grid lines within the compression radius
// to make the compression area more dense with smaller rectangles
function applyCompressionDensity() {
    console.log("=== APPLYING COMPRESSION DENSITY ===");
    
    // Array to store all additional grid lines we'll create
    const additionalLines = [];
    
    // ===== ADD HORIZONTAL LINES (vertical compression) =====
    // Skip the first 2 and last 3 lines to avoid edge issues
    for (let i = 2; i < gridX.length - 3; i++) {
        const x1 = gridX[i];      // Left edge of current cell
        const x2 = gridX[i + 1];  // Right edge of current cell
        const midX = (x1 + x2) / 2;  // Center of current cell
        
        // Check if this cell is within the compression radius
        const distance = dist(midX, focalPoint.y, focalPoint.x, focalPoint.y);
        if (distance < Config.compressionRadius) {
            // Calculate how many additional lines to add based on distance from focal point
            const factor = getCompressionFactor(distance);
            const additionalLinesCount = Math.floor(factor * Config.horizontalDensityMultiplier);
            
            // Create evenly spaced additional lines within this cell
            for (let j = 1; j <= additionalLinesCount; j++) {
                const t = j / (additionalLinesCount + 1);  // Position between 0 and 1
                const newX = lerp(x1, x2, t);              // Interpolate position
                additionalLines.push({ x: newX, y: null, type: 'horizontal' });
            }
        }
    }
    
    // ===== ADD VERTICAL LINES (horizontal compression) =====
    // Skip the first 2 and last 3 lines to avoid edge issues
    for (let j = 2; j < gridY.length - 3; j++) {
        const y1 = gridY[j];      // Top edge of current cell
        const y2 = gridY[j + 1];  // Bottom edge of current cell
        const midY = (y1 + y2) / 2;  // Center of current cell
        
        // Check if this cell is within the compression radius
        const distance = dist(focalPoint.x, midY, focalPoint.x, focalPoint.y);
        if (distance < Config.compressionRadius) {
            // Calculate how many additional lines to add based on distance from focal point
            const factor = getCompressionFactor(distance);
            const additionalLinesCount = Math.floor(factor * Config.verticalDensityMultiplier);
            
            // Create evenly spaced additional lines within this cell
            for (let k = 1; k <= additionalLinesCount; k++) {
                const t = k / (additionalLinesCount + 1);  // Position between 0 and 1
                const newY = lerp(y1, y2, t);              // Interpolate position
                additionalLines.push({ x: null, y: newY, type: 'vertical' });
            }
        }
    }
    
    // ===== INTEGRATE ADDITIONAL LINES INTO GRID =====
    // Add all the new lines to the appropriate grid arrays
    additionalLines.forEach(line => {
        if (line.type === 'horizontal') {
            gridX.push(line.x);  // Add to horizontal grid lines
        } else {
            gridY.push(line.y);  // Add to vertical grid lines
        }
    });
    
    // Sort arrays to maintain proper order (left to right, top to bottom)
    gridX.sort((a, b) => a - b);  // Sort X positions
    gridY.sort((a, b) => a - b);  // Sort Y positions
    
    // Now apply compression to move lines toward focal point
    applyCompressionToGrid();
    
    console.log("Added", additionalLines.length, "additional grid lines");
}

// ============================================================================
// APPLY COMPRESSION TO GRID - Move grid lines toward focal point
// ============================================================================
// This function moves existing grid lines toward the focal point to create
// the compression effect - lines closer to focal point move more
function applyCompressionToGrid() {
    console.log("=== APPLYING COMPRESSION TO GRID ===");
    
    // Define grid boundaries to prevent lines from moving outside canvas
    const gridStartX = 20;  // Left boundary
    const gridStartY = 20;  // Top boundary
    const gridEndX = width - 20;   // Right boundary
    const gridEndY = height - 20;  // Bottom boundary
    
    // ===== COMPRESS HORIZONTAL LINES (move toward focal point X) =====
    // Skip the first 2 and last 2 lines to avoid edge issues
    for (let i = 2; i < gridX.length - 2; i++) {
        // Calculate distance from this line to the focal point
        const distance = dist(gridX[i], focalPoint.y, focalPoint.x, focalPoint.y);
        
        // Only compress lines within the compression radius
        if (distance < Config.compressionRadius) {
            // Calculate compression factor (0 = no compression, 1 = full compression)
            const factor = getCompressionFactor(distance);
            
            // Move line toward focal point using linear interpolation
            const newX = lerp(gridX[i], focalPoint.x, factor);
            
            // Ensure we don't move lines outside grid boundaries
            const constrainedX = constrain(newX, gridStartX, gridEndX);
            gridX[i] = constrainedX;  // Update the grid line position
        }
    }
    
    // ===== COMPRESS VERTICAL LINES (move toward focal point Y) =====
    // Skip the first 2 and last 2 lines to avoid edge issues
    for (let j = 2; j < gridY.length - 2; j++) {
        // Calculate distance from this line to the focal point
        const distance = dist(focalPoint.x, gridY[j], focalPoint.x, focalPoint.y);
        
        // Only compress lines within the compression radius
        if (distance < Config.compressionRadius) {
            // Calculate compression factor (0 = no compression, 1 = full compression)
            const factor = getCompressionFactor(distance);
            
            // Move line toward focal point using linear interpolation
            const newY = lerp(gridY[j], focalPoint.y, factor);
            
            // Ensure we don't move lines outside grid boundaries
            const constrainedY = constrain(newY, gridStartY, gridEndY);
            gridY[j] = constrainedY;  // Update the grid line position
        }
    }
    
    console.log("Compression applied - focal point:", focalPoint.x, focalPoint.y, "radius:", Config.compressionRadius);
    console.log("Grid boundaries:", gridStartX, gridStartY, "to", gridEndX, gridEndY);
}

function getCompressionFactor(distance) {
    const normalizedDistance = distance / Config.compressionRadius;
    if (normalizedDistance >= 1.0) return 0.0;
    
    // Create smooth falloff from center - maximum compression at center
    const falloff = pow(1.0 - normalizedDistance, Config.compressionFalloff);
    // Scale the factor to create moderate compression
    return falloff * 0.4; // 0.4 = 40% compression at center (reduced from 0.9)
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
    
    console.log("=== RENDERING RECTANGLES WITH GAPS ===");
    let rectangleCount = 0;
    
    // Draw each cell in the grid as a complete rectangle with bezier curves and gaps
    for (let i = 0; i < gridX.length - 1; i++) {
        for (let j = 0; j < gridY.length - 1; j++) {
            const x = gridX[i];
            const y = gridY[j];
            const w = gridX[i + 1] - gridX[i];
            const h = gridY[j + 1] - gridY[j];
            
            // Only draw if cell has positive dimensions
            if (w > 0 && h > 0) {
                // Calculate adaptive gaps based on cell size
                const gapX = Math.max(Config.minGap, Math.min(Config.maxGap, w * Config.gapRatio));
                const gapY = Math.max(Config.minGap, Math.min(Config.maxGap, h * Config.gapRatio));
                
                // Add small random variation to gaps for organic feel
                const randomVariation = 0.2; // 20% variation
                const finalGapX = gapX + (Config.usePRNG ? 
                    prng.random(-gapX * randomVariation, gapX * randomVariation) : 
                    random(-gapX * randomVariation, gapX * randomVariation));
                const finalGapY = gapY + (Config.usePRNG ? 
                    prng.random(-gapY * randomVariation, gapY * randomVariation) : 
                    random(-gapY * randomVariation, gapY * randomVariation));
                
                const rectX = x + finalGapX * 0.5;
                const rectY = y + finalGapY * 0.5;
                const rectW = w - finalGapX;
                const rectH = h - finalGapY;
                
                // Only draw if rectangle still has positive dimensions after gaps
                if (rectW > 2 && rectH > 2) { // Minimum 2px to be visible
                    drawCurvedRectangle(rectX, rectY, rectW, rectH);
                    rectangleCount++;
                }
            }
        }
    }
    
    console.log("Drew", rectangleCount, "curved rectangles with adaptive gaps");
    console.log("Gap ratio:", Config.gapRatio, "Min/Max gaps:", Config.minGap, "/", Config.maxGap);
}

function drawCurvedRectangle(x, y, w, h) {
    // Calculate corner radius (smaller than the cell size)
    const radius = min(Config.cornerRadius, min(w, h) * 0.3);
    
    // Calculate control points for subtle bezier curves
    const controlOffset = radius * 0.3; // Subtle control points to avoid oval shape
    
    // Draw the rectangle with much smoother bezier-curved corners
    beginShape();
    
    // Top edge
    vertex(x + radius, y);
    vertex(x + w - radius, y);
    
    // Top-right corner (much smoother bezier curve)
    bezierVertex(x + w - controlOffset, y, x + w, y + controlOffset, x + w, y + radius);
    
    // Right edge
    vertex(x + w, y + radius);
    vertex(x + w, y + h - radius);
    
    // Bottom-right corner (much smoother bezier curve)
    bezierVertex(x + w, y + h - controlOffset, x + w - controlOffset, y + h, x + w - radius, y + h);
    
    // Bottom edge
    vertex(x + w - radius, y + h);
    vertex(x + radius, y + h);
    
    // Bottom-left corner (much smoother bezier curve)
    bezierVertex(x + controlOffset, y + h, x, y + h - controlOffset, x, y + h - radius);
    
    // Left edge
    vertex(x, y + h - radius);
    vertex(x, y + radius);
    
    // Top-left corner (much smoother bezier curve)
    bezierVertex(x, y + controlOffset, x + controlOffset, y, x + radius, y);
    
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
