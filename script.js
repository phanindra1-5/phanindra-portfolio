(() => {
  const FRAME_COUNT = 210;
  const canvas = document.getElementById('animation-canvas');
  const ctx = canvas.getContext('2d');

  const getFramePath = (index) =>
    `ezgif-frame-${String(index).padStart(3, '0')}.jpg`;

  const images = new Array(FRAME_COUNT);
  let loadedCount = 0;
  let targetFrame = 1;
  let smoothFrame = 1;
  let lastDrawnFrame = -1;
  let isTicking = false;

  // Find closest loaded image to avoid blank screens or flickers
  function getClosestAvailableImage(frameNum) {
    const targetIdx = Math.max(0, Math.min(FRAME_COUNT - 1, frameNum - 1));
    if (images[targetIdx] && images[targetIdx].complete && images[targetIdx].naturalWidth > 0) {
      return images[targetIdx];
    }
    // Search backward
    for (let i = targetIdx - 1; i >= 0; i--) {
      if (images[i] && images[i].complete && images[i].naturalWidth > 0) {
        return images[i];
      }
    }
    // Search forward
    for (let i = targetIdx + 1; i < FRAME_COUNT; i++) {
      if (images[i] && images[i].complete && images[i].naturalWidth > 0) {
        return images[i];
      }
    }
    return null;
  }

  // Draw frame on canvas with aspect-ratio cover & centering
  function drawFrame(frameNum, forceRedraw = false) {
    const roundedFrame = Math.round(frameNum);
    if (!forceRedraw && roundedFrame === lastDrawnFrame) return;

    const img = getClosestAvailableImage(roundedFrame);
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    if (cw === 0 || ch === 0 || iw === 0 || ih === 0) return;

    const scale = Math.max(cw / iw, ch / ih);
    const renderWidth = iw * scale;
    const renderHeight = ih * scale;
    const offsetX = (cw - renderWidth) / 2;
    const offsetY = (ch - renderHeight) / 2;

    ctx.clearRect(0, 0, cw, ch);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, offsetX, offsetY, renderWidth, renderHeight);

    lastDrawnFrame = roundedFrame;
  }

  // Resize canvas to match window & screen DPR
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    drawFrame(smoothFrame, true);
  }

  // Calculate scroll progress percentage (0 to 1) across full document
  function getScrollProgress() {
    const scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
    );
    const maxScroll = docHeight - window.innerHeight;
    if (maxScroll <= 0) return 0;
    return Math.max(0, Math.min(1, scrollTop / maxScroll));
  }

  // Update active navbar item based on current scroll position
  function updateActiveNav() {
    const sections = document.querySelectorAll('section[id]');
    const navItems = document.querySelectorAll('.nav-item');
    const scrollPosition = window.scrollY + 200;

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute('id');

      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        navItems.forEach((item) => {
          item.classList.remove('active');
          if (item.getAttribute('href') === `#${sectionId}`) {
            item.classList.add('active');
          }
        });
      }
    });
  }

  // Update target frame based on current scroll position
  function updateScrollTarget() {
    const progress = getScrollProgress();
    targetFrame = 1 + progress * (FRAME_COUNT - 1);

    updateActiveNav();

    if (!isTicking) {
      isTicking = true;
      requestAnimationFrame(animationLoop);
    }
  }

  // Smooth lerp loop for fluid scrubbing animation
  function animationLoop() {
    const diff = targetFrame - smoothFrame;

    if (Math.abs(diff) > 0.001) {
      smoothFrame += diff * 0.15;
      drawFrame(smoothFrame);
      requestAnimationFrame(animationLoop);
    } else {
      smoothFrame = targetFrame;
      drawFrame(smoothFrame);
      isTicking = false;
    }
  }

  // Preload frames with load handlers attached BEFORE setting src
  for (let i = 1; i <= FRAME_COUNT; i++) {
    const img = new Image();
    const frameIndex = i;

    img.onload = () => {
      loadedCount++;
      if (frameIndex === 1 || Math.round(smoothFrame) === frameIndex) {
        drawFrame(smoothFrame, true);
      }
    };

    img.src = getFramePath(i);
    images[i - 1] = img;
  }

  // Window event listeners
  window.addEventListener('resize', resizeCanvas, { passive: true });
  window.addEventListener('scroll', updateScrollTarget, { passive: true });

  // Initial setup call
  resizeCanvas();
  updateScrollTarget();
})();
