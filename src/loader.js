/**
 * Neural Network Loading Screen
 * Draws animated nodes + edges that converge into the center,
 * simulating a neural network training/inference visual.
 */

const LOADER_ID = "app-loader";
const MIN_DISPLAY_MS = 1200;
let stopAnimation = null;
let removalTimeout = null;
let dotsInterval = null;
let bootTime = 0;

function createLoaderDOM() {
  const existing = document.getElementById(LOADER_ID);
  if (existing) existing.remove();
  const loader = document.createElement("div");
  loader.id = LOADER_ID;
  loader.style.background = "#0a0a0a";
  loader.innerHTML = `
    <canvas id="loader-canvas"></canvas>
    <div class="loader-brand">
      <div class="loader-topline">
        <span class="loader-sigil">MS</span>
        <span class="loader-text">Initializing Sameer OS<span class="loader-dots"><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span></span>
      </div>
      <span class="loader-line"></span>
      <div class="loader-status-grid" aria-hidden="true">
        <span>content graph</span>
        <span>AI signal</span>
        <span>interface ready</span>
      </div>
      <div class="loader-progress" aria-hidden="true"><span></span></div>
      <span class="loader-subtext">AI/ML / GenAI / Cloud / Data Science</span>
    </div>
  `;
  document.body.prepend(loader);

  // JS-driven dot cycling (cross-browser safe)
  let dotStep = 0;
  const dots = loader.querySelectorAll(".dot");
  if (dotsInterval) { clearInterval(dotsInterval); dotsInterval = null; }
  dotsInterval = setInterval(() => {
    dotStep = (dotStep + 1) % 4;
    dots.forEach((d, i) => { d.style.opacity = i < dotStep ? "1" : "0"; });
  }, 400);
}

function animateLoader() {
  const canvas = document.getElementById("loader-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let width, height, nodes, frame = 0;
  let rafId = null;
  let stopped = false;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function initNodes() {
    nodes = [];
    const count = Math.min(Math.floor((width * height) / 10500), 78);
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r: Math.random() * 2.5 + 1,
        pulse: Math.random() * Math.PI * 2
      });
    }
  }

  function draw() {
    if (stopped) return;
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const scanX = ((frame * 5) % (width + 220)) - 110;

    ctx.fillStyle = "rgba(7, 9, 12, 0.36)";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(100, 244, 209, 0.07)";
    ctx.lineWidth = 1;
    for (let x = (frame % 58) - 58; x < width; x += 58) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 58) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    const scan = ctx.createLinearGradient(scanX - 90, 0, scanX + 90, 0);
    scan.addColorStop(0, "rgba(100, 244, 209, 0)");
    scan.addColorStop(0.5, "rgba(100, 244, 209, 0.18)");
    scan.addColorStop(1, "rgba(255, 93, 143, 0)");
    ctx.fillStyle = scan;
    ctx.fillRect(scanX - 90, 0, 180, height);

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 160) {
          const alpha = (1 - dist / 160) * 0.22;
          ctx.strokeStyle = `rgba(100, 244, 209, ${alpha})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    for (const node of nodes) {
      node.pulse += 0.03;
      const glow = 0.4 + Math.sin(node.pulse) * 0.3;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.fillStyle = node.r > 2.8 ? `rgba(255, 200, 97, ${glow})` : `rgba(100, 244, 209, ${glow})`;
      ctx.fill();
      const toCenterX = (cx - node.x) * 0.0004;
      const toCenterY = (cy - node.y) * 0.0004;
      node.x += node.vx + toCenterX;
      node.y += node.vy + toCenterY;
      if (node.x < -10) node.x = width + 10;
      if (node.x > width + 10) node.x = -10;
      if (node.y < -10) node.y = height + 10;
      if (node.y > height + 10) node.y = -10;
    }

    const pulseR = 40 + Math.sin(frame * 0.04) * 12;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR);
    gradient.addColorStop(0, "rgba(100, 244, 209, 0.16)");
    gradient.addColorStop(0.46, "rgba(255, 93, 143, 0.06)");
    gradient.addColorStop(1, "rgba(100, 244, 209, 0)");
    ctx.beginPath();
    ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 200, 97, 0.26)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, pulseR + 22, frame * 0.02, frame * 0.02 + Math.PI * 1.1);
    ctx.stroke();

    frame++;
    rafId = requestAnimationFrame(draw);
  }

  function resizeHandler() { resize(); initNodes(); }

  resize();
  initNodes();
  draw();
  window.addEventListener("resize", resizeHandler);

  stopAnimation = () => {
    stopped = true;
    if (rafId != null) cancelAnimationFrame(rafId);
    rafId = null;
    window.removeEventListener("resize", resizeHandler);
    stopAnimation = null;
  };
}

export function bootLoader() {
  if (stopAnimation) stopAnimation();
  if (removalTimeout != null) { clearTimeout(removalTimeout); removalTimeout = null; }
  bootTime = Date.now();
  createLoaderDOM();
  requestAnimationFrame(() => animateLoader());

  // Safety: auto-dismiss after 6s in case dismissLoader is never called
  removalTimeout = setTimeout(() => dismissLoader(), 6000);
}

function fadeAndRemove() {
  if (stopAnimation) stopAnimation();
  if (dotsInterval) { clearInterval(dotsInterval); dotsInterval = null; }
  const loader = document.getElementById(LOADER_ID);
  if (!loader) return;
  loader.classList.add("is-done");
  removalTimeout = setTimeout(() => { loader.remove(); removalTimeout = null; }, 600);
}

export function dismissLoader() {
  if (removalTimeout != null) { clearTimeout(removalTimeout); removalTimeout = null; }
  const elapsed = Date.now() - bootTime;
  const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
  if (remaining > 0) {
    removalTimeout = setTimeout(fadeAndRemove, remaining);
  } else {
    fadeAndRemove();
  }
}
