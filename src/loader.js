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
      <span class="loader-sigil">MS</span>
      <span class="loader-text">Initializing neural workspace<span class="loader-dots"><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span></span>
    </div>
  `;
  document.body.prepend(loader);

  // JS-driven dot cycling (cross-browser safe)
  let dotStep = 0;
  const dots = loader.querySelectorAll(".dot");
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
    const count = Math.min(Math.floor((width * height) / 12000), 60);
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

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 160) {
          const alpha = (1 - dist / 160) * 0.25;
          ctx.strokeStyle = `rgba(82, 199, 184, ${alpha})`;
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
      ctx.fillStyle = `rgba(82, 199, 184, ${glow})`;
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
    gradient.addColorStop(0, "rgba(82, 199, 184, 0.12)");
    gradient.addColorStop(1, "rgba(82, 199, 184, 0)");
    ctx.beginPath();
    ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

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
