// ========================================
// THE GREAT CLOWN - Fresh Start
// ========================================

let seedValue = 123456789;

// ========================================
// SETUP & DRAW
// ========================================

function setup() {
    console.log("=== SETUP START ===");
    createCanvas(800, 1200);
    console.log("Canvas created:", width, "x", height);
    
    // Test basic drawing
    testDrawing();
    
    console.log("=== SETUP COMPLETE ===");
}

function draw() {
    // Don't run continuously
    noLoop();
}

function testDrawing() {
    console.log("=== TEST DRAWING ===");
    
    // 1. Background
    background(245, 240, 230);
    console.log("Background drawn");
    
    // 2. Test rectangle
    fill(120, 130, 140);
    stroke(180, 60, 60);
    strokeWeight(3);
    rect(100, 100, 200, 150);
    console.log("Test rectangle drawn");
    
    // 3. Test circle
    fill(180, 60, 60, 100);
    noStroke();
    circle(400, 300, 100);
    console.log("Test circle drawn");
    
    // 4. Test text
    fill(0);
    textSize(24);
    text("THE GREAT CLOWN", 200, 500);
    console.log("Test text drawn");
    
    console.log("=== TEST DRAWING COMPLETE ===");
}

function keyPressed() {
    if (key === "r" || key === "R") {
        console.log("R key pressed - regenerating");
        seedValue = Math.floor(Math.random() * 1e9);
        testDrawing();
    }
    if (key === "s" || key === "S") {
        console.log("S key pressed - saving");
        saveCanvas("the_great_clown", "png");
    }
}
