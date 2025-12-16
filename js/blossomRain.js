// Blossom Rain for Scene 8
// Uses Web Animations API to spawn and animate falling blossom petals based on assets/img/Blossom.svg

(() => {
  // Scoped state (avoid globals)
  let sceneEl = null;
  let container = null;
  let running = false;
  let spawnIntervalId = null;
  let petalsActive = new Set();
  let maxPetals = 90; // adjustable cap (50–120 recommended)
  let blossomSvgText = null;

  // Utility: load SVG once (text) and reuse
  async function loadBlossomSVG() {
    if (blossomSvgText) return blossomSvgText;
    const res = await fetch('assets/img/Blossom.svg');
    const txt = await res.text();
    blossomSvgText = txt;
    return txt;
  }

  // Create a single petal element (as inline SVG for easiest reuse)
  function createPetalNode() {
    const wrap = document.createElement('div');
    wrap.className = 'blossom-petal';
    wrap.style.position = 'fixed';
    wrap.style.willChange = 'transform, opacity';
    wrap.style.pointerEvents = 'none';
    wrap.style.zIndex = '7'; // above fog, below bubbles

    // Size variation
    const scale = 0.35 + Math.random() * 0.4; // 0.35–0.75
    wrap.style.transform = `translate3d(0,0,0) scale(${scale})`;

    // Insert inline SVG content
    wrap.innerHTML = blossomSvgText;

    // Ensure SVG fits its container
    const svg = wrap.querySelector('svg');
    if (svg) {
      svg.style.display = 'block';
      svg.style.width = '64px';
      svg.style.height = '64px';
    }

    return wrap;
  }

  // Spawn logic: creates and animates a petal using Web Animations API
  function spawnPetal() {
    if (!running || !container) return;
    if (petalsActive.size >= maxPetals) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const startX = Math.random() * vw; // anywhere horizontally
    const startY = -50 - Math.random() * 100; // -50 to -150 px

    const fallDuration = 6000 + Math.random() * 4000; // 6–10s
    const swayAmplitude = 40 + Math.random() * 50; // 40–90px
    const swayPeriod = 1800 + Math.random() * 1600; // 1.8–3.4s per sway cycle
    const totalFall = vh + 200; // extra to fall past viewport

    const initialRotation = Math.random() * 360;
    const rotationDelta = 120 + Math.random() * 240; // 120–360 deg over fall

    const petal = createPetalNode();

    // Position starting point
    petal.style.left = `${startX}px`;
    petal.style.top = `${startY}px`;
    petal.style.opacity = '0.95';

    container.appendChild(petal);
    petalsActive.add(petal);

    // Composite keyframe function for sway: simulate horizontal wobble using sinus
    const keyframes = [];
    const steps = Math.max(8, Math.floor(fallDuration / 300));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = startY + t * totalFall;
      const sway = Math.sin((t * fallDuration) / swayPeriod * 2 * Math.PI) * swayAmplitude;
      const x = startX + sway;
      const rot = initialRotation + t * rotationDelta;
      const opacity = t < 0.85 ? 0.95 : 0.95 * (1 - (t - 0.85) / 0.15); // gentle fade at end
      keyframes.push({ transform: `translate(${x}px, ${y}px) rotate(${rot}deg)`, opacity });
    }

    const anim = petal.animate(keyframes, {
      duration: fallDuration,
      easing: 'linear',
      fill: 'forwards',
      iterations: 1,
      composite: 'replace'
    });

    anim.onfinish = () => {
      // Cleanup this petal
      try { petal.remove(); } catch (e) {}
      petalsActive.delete(petal);
    };
  }

  // Start spawner loop
  function startSpawner() {
    if (spawnIntervalId) return;
    // Spawn rate adapts to cap: faster when fewer active
    spawnIntervalId = setInterval(() => {
      // Spawn 0–3 petals per tick depending on active count
      const deficit = Math.max(0, maxPetals - petalsActive.size);
      const toSpawn = deficit > 60 ? 3 : deficit > 30 ? 2 : 1;
      for (let i = 0; i < toSpawn; i++) spawnPetal();
    }, 220); // ~4–13 petals/sec depending on cap
  }

  // Stop spawner loop
  function stopSpawner() {
    if (spawnIntervalId) {
      clearInterval(spawnIntervalId);
      spawnIntervalId = null;
    }
  }

  // Public API
  function initBlossomRainForScene8() {
    if (running) return;
    sceneEl = document.getElementById('fog-scene');
    if (!sceneEl) return;

    // Create or reuse container
    container = document.createElement('div');
    container.className = 'blossom-rain-container';
    container.style.position = 'fixed';
    container.style.inset = '0';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '7';

    sceneEl.appendChild(container);
    running = true;

    loadBlossomSVG()
      .then(() => {
        startSpawner();
      })
      .catch(err => {
        console.log('[BLOSSOM] Failed to load Blossom.svg:', err);
      });
  }

  function destroyBlossomRain() {
    running = false;
    stopSpawner();
    // Fade out all active petals before removal for a smooth exit
    const fadeDuration = 600; // ms
    petalsActive.forEach(petal => {
      try {
        petal.animate([
          { opacity: petal.style.opacity || 0.95 },
          { opacity: 0 }
        ], { duration: fadeDuration, easing: 'ease', fill: 'forwards' }).onfinish = () => {
          try { petal.remove(); } catch (e) {}
          petalsActive.delete(petal);
        };
      } catch (e) {
        // Fallback remove if animation fails
        try { petal.remove(); } catch (err) {}
        petalsActive.delete(petal);
      }
    });

    // Also fade out any remaining children in container (extra safety)
    if (container) {
      Array.from(container.children).forEach(child => {
        try {
          child.animate([{ opacity: child.style.opacity || 0.95 }, { opacity: 0 }], { duration: fadeDuration, easing: 'ease', fill: 'forwards' }).onfinish = () => {
            try { child.remove(); } catch (e) {}
          };
        } catch (e) {
          try { child.remove(); } catch (err) {}
        }
      });
    }

    // Remove container after fade completes
    setTimeout(() => {
      if (container && container.parentNode) {
        try { container.remove(); } catch (e) {}
      }
      container = null;
      sceneEl = null;
    }, fadeDuration + 50);
  }

  // Expose functions without polluting global namespace too much
  window.BlossomRain = {
    initBlossomRainForScene8,
    destroyBlossomRain
  };
})();
