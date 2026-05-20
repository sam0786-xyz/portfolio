export function setupScrollAnimations(root = document) {
  const animated = Array.from(root.querySelectorAll("[data-animate], .section, .metric, .project-card, .skill-panel, .credential-card, .blog-card, .timeline-card"));
  animated.forEach((element, index) => {
    if (!element.dataset.animate) element.dataset.animate = "fade-up";
    element.style.setProperty("--reveal-delay", `${Math.min(index % 8, 7) * 70}ms`);
  });

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    animated.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
  );

  animated.forEach((element) => observer.observe(element));
}

export function setupMagneticButtons(root = document) {
  if (window.matchMedia("(pointer: coarse), (prefers-reduced-motion: reduce)").matches) return;
  root.querySelectorAll(".primary-link, .secondary-link, .command-link, .tool-button, .project-list button, .filter-rail button").forEach((button) => {
    button.addEventListener("pointermove", (event) => {
      const rect = button.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) * 0.12;
      const y = (event.clientY - rect.top - rect.height / 2) * 0.18;
      button.style.transform = `translate(${x}px, ${y}px)`;
    });
    button.addEventListener("pointerleave", () => {
      button.style.transform = "";
    });
  });
}

export function setupSignalHover(root = document) {
  if (window.matchMedia("(pointer: coarse), (prefers-reduced-motion: reduce)").matches) return;
  root.querySelectorAll(".blog-card, .credential-card, .project-spotlight, .timeline-card, .skill-panel, .linkedin-card, .cms-panel, .studio-post-row").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--signal-x", `${event.clientX - rect.left}px`);
      card.style.setProperty("--signal-y", `${event.clientY - rect.top}px`);
    });
  });
}

export function setupNeuralCanvas(canvas) {
  if (!canvas) return;
  const context = canvas.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let frame = 0;
  let animationId = 0;
  let width = 0;
  let height = 0;
  let nodes = [];

  function resize() {
    const box = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    width = Math.max(320, box.width);
    height = Math.max(240, box.height);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    nodes = Array.from({ length: Math.max(18, Math.floor(width / 46)) }, (_, index) => ({
      x: ((index * 89) % Math.max(width, 1)) + Math.sin(index) * 18,
      y: ((index * 131) % Math.max(height, 1)) + Math.cos(index) * 20,
      vx: Math.sin(index * 1.7) * 0.22,
      vy: Math.cos(index * 1.3) * 0.18,
      r: 2 + (index % 4)
    }));
  }

  function draw() {
    frame += 1;
    context.clearRect(0, 0, width, height);
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "rgba(82, 199, 184, 0.18)");
    gradient.addColorStop(0.52, "rgba(227, 165, 58, 0.08)");
    gradient.addColorStop(1, "rgba(169, 151, 224, 0.12)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    nodes.forEach((node) => {
      if (!reducedMotion) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < -20) node.x = width + 20;
        if (node.x > width + 20) node.x = -20;
        if (node.y < -20) node.y = height + 20;
        if (node.y > height + 20) node.y = -20;
      }
    });

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance > 145) continue;
        context.strokeStyle = `rgba(82, 199, 184, ${0.22 * (1 - distance / 145)})`;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }
    }

    nodes.forEach((node, index) => {
      const pulse = reducedMotion ? 0 : Math.sin(frame * 0.035 + index) * 0.8;
      context.fillStyle = index % 5 === 0 ? "rgba(227, 165, 58, 0.88)" : "rgba(82, 199, 184, 0.86)";
      context.beginPath();
      context.arc(node.x, node.y, node.r + pulse, 0, Math.PI * 2);
      context.fill();
    });

    if (!reducedMotion) animationId = requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener("resize", resize);
  return () => {
    cancelAnimationFrame(animationId);
    window.removeEventListener("resize", resize);
  };
}

export function bootInteractions(root = document) {
  setupScrollAnimations(root);
  setupMagneticButtons(root);
  setupSignalHover(root);
  root.querySelectorAll("[data-neural-canvas]").forEach(setupNeuralCanvas);
}
