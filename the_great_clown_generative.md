# Generative Art: "The Great Clown" (PRNG Style)

**Goal:**  
Create a p5.js sketch that algorithmically generates an abstract vertical-symmetry artwork inspired by *The Great Clown*.  
The result should have an architectural grid base, organic distortions, repeated red/pink circular motifs, a central clown-like vertical figure, and layered textures for a hand-pulled printmaking effect.

---

## Functional Requirements

### 1. Canvas & Symmetry
- **Canvas:** Portrait (`800 x 1200` px default).
- **Symmetry:**  
  - Mirror vertically across the central axis.  
  - Add noise offsets for imperfect mirroring.
- Create a helper function to draw **half the canvas** and mirror it.

---

### 2. Underlying Grid
- Grid size: `cols = 12`, `rows = 16` (adjustable).
- Store grid coordinates for later use.
- Render thin base lines before any shapes.

---

### 3. Organic Distortion
- Apply Perlin noise to shift grid points for a stretched “webbing” effect.
- Adjustable distortion strength via `distortionStrength`.

---

### 4. Red/Pink Circles
- Place circles at random grid intersections with:
  - Outer ring (saturated red/pink)
  - Inner core (pale pink/white)
  - Size jitter ±15%
  - Slight positional jitter

---

### 5. Central Clown Structure
- Vertical band as “body”.
- Large bright circle in upper-mid (“face”).
- Vertical streaks below (“pant legs”).
- Horizontal band across center (cross shape).

---

### 6. Color Passes
- **Pass 1:** Flat base colors and shapes.
- **Pass 2:** Semi-transparent washes to blend tones.
- **Pass 3:** Gradient lighting overlay for depth.

---

### 7. Texture Simulation
- Apply paper texture with `blendMode(MULTIPLY)`.
- Optional print misalignment by offsetting a color layer slightly.

---

## Adjustable Parameters
- `cols`, `rows`
- `distortionStrength`
- Circle size range
- Color palette
- Noise scale
- Symmetry imperfection strength
- Texture opacity

---

## Suggested Rendering Order
1. Setup and grid definition.
2. Draw and distort grid lines.
3. Add webbing between points.
4. Add circles at intersections.
5. Draw central clown structure.
6. Apply color washes.
7. Apply texture overlay.

---

## **Step-by-Step Build Instructions for Cursor**

### **Stage 1 — Canvas & Symmetry**
**Goal:** Set up a portrait canvas and implement half-draw mirroring.

**Implementation:**
```javascript
function setup() {
  createCanvas(800, 1200);
  noLoop();
}

function drawHalf(callback) {
  push();
  callback();
  pop();

  // Mirror to right side
  push();
  scale(-1, 1);
  translate(-width, 0);
  callback();
  pop();
}

function draw() {
  background(240);
  drawHalf(() => {
    stroke(180);
    noFill();
    rect(0, 0, width/2, height);
  });
}
```

---

### **Stage 2 — Grid Generation**
**Goal:** Create a grid and draw its lines inside the mirrored half.

**Implementation:**
```javascript
let cols = 12, rows = 16;
let points = [];

function buildGrid() {
  points = [];
  for (let i = 0; i <= cols; i++) {
    for (let j = 0; j <= rows; j++) {
      let x = (i / cols) * (width / 2);
      let y = (j / rows) * height;
      points.push({x, y});
    }
  }
}

function drawHalfGrid() {
  stroke(200);
  for (let i = 0; i <= cols; i++) {
    let x = (i / cols) * (width / 2);
    line(x, 0, x, height);
  }
  for (let j = 0; j <= rows; j++) {
    let y = (j / rows) * height;
    line(0, y, width / 2, y);
  }
}

function draw() {
  background(240);
  buildGrid();
  drawHalf(drawHalfGrid);
}
```

---

### **Stage 3 — Distortion & Webbing**
**Goal:** Apply Perlin noise to grid points and connect them organically.

**Implementation:**
```javascript
let distortionStrength = 20;

function distortPoints() {
  for (let p of points) {
    let dx = noise(p.x * 0.05, p.y * 0.05) * distortionStrength;
    let dy = noise(p.y * 0.05, p.x * 0.05) * distortionStrength;
    p.x += dx - distortionStrength/2;
    p.y += dy - distortionStrength/2;
  }
}

function drawWebbing() {
  stroke(150, 50);
  noFill();
  for (let i = 0; i < points.length - 1; i++) {
    if ((i + 1) % (rows + 1) != 0) {
      let p1 = points[i];
      let p2 = points[i + 1];
      bezier(p1.x, p1.y, p1.x+10, p1.y, p2.x-10, p2.y, p2.x, p2.y);
    }
  }
}
```

---

### **Stage 4 — Circles**
**Goal:** Add random red/pink circles at some intersections.

**Implementation:**
```javascript
function drawCircles() {
  noStroke();
  for (let p of points) {
    if (random() < 0.25) { // 25% chance
      let size = random(10, 30);
      fill(220, 80, 80);
      ellipse(p.x, p.y, size);
      fill(255, 200, 200);
      ellipse(p.x, p.y, size * 0.5);
    }
  }
}
```

---

### **Stage 5 — Central Clown Form**
**Goal:** Draw the main vertical and horizontal shapes.

**Implementation:**
```javascript
function drawClownBody() {
  // Vertical body
  fill(255, 220, 150);
  rect(width/4 - 10, height*0.2, 20, height*0.6);

  // Face circle
  fill(255, 180, 50);
  ellipse(width/4, height*0.35, 60);

  // Pant legs
  stroke(0);
  line(width/4 - 10, height*0.8, width/4 - 30, height);
  line(width/4 + 10, height*0.8, width/4 + 30, height);

  // Horizontal crossbar
  fill(200, 200, 100, 180);
  rect(0, height*0.5 - 5, width/2, 10);
}
```

---

### **Stage 6 — Washes & Texture**
**Goal:** Add semi-transparent overlays and paper texture.

**Implementation:**
```javascript
function drawWashes() {
  noStroke();
  fill(255, 255, 200, 30);
  rect(0, 0, width, height);
}

function applyTexture() {
  // Optional: loadImage('paperTexture.png') and blend
}
```

---

### **Final Draw Call**
```javascript
function draw() {
  background(240);
  buildGrid();
  distortPoints();

  drawHalf(() => {
    drawWebbing();
    drawCircles();
    drawClownBody();
  });

  drawWashes();
  applyTexture();
}
```

---

## Cursor Command
> Implement the above stages in order, testing after each stage before moving to the next. Do not skip to the final version until the previous stage is visually correct. Ensure vertical mirroring, organic distortions, circular motifs, central clown form, color washes, and texture overlay are all present. Keep parameters adjustable at the top of the script.


---

## Color Palette Suggestions

### Primary Colors (Shapes & Main Forms)
- **Deep Red:** `rgb(200, 30, 30)` — For outer ring of circles and strong accents.
- **Soft Pink:** `rgb(255, 200, 200)` — Inner glow for circles, highlights.
- **Golden Yellow:** `rgb(255, 200, 100)` — Central “face” and body sections.
- **Muted Blue-Gray:** `rgb(150, 160, 180)` — Grid lines and subtle shadows.

### Secondary Colors (Washes & Background)
- **Warm Beige:** `rgb(240, 230, 210)` — Paper base tone.
- **Soft Lavender:** `rgb(210, 190, 230)` — Light wash overlay for harmony.
- **Burnt Orange:** `rgb(220, 120, 60)` — Occasional accents.

### Texture & Overlay Colors
- Paper grain: `rgba(255, 255, 255, 0.05)` or `rgba(0, 0, 0, 0.05)` depending on blend mode.
- Shadow wash: `rgba(0, 0, 0, 0.1)` for subtle depth.

**Tip:** Keep saturation slightly muted for most shapes so the reds and yellows pop as focal points.
