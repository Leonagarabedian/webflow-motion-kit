import * as THREE from "three/webgpu";
import { readString } from "../core/config.js";
const STYLE_ID = "motion-kit-spatial-loop-styles";
const WIDTH = 8;
const HEIGHT = 4.5;
const GAP = 0.35;
const SCROLL_LERP = 0.1;
const FOV = 75;
const SHORT_LANDSCAPE_QUERY = "(orientation: landscape) and (max-width: 1180px) and (max-height: 600px)";
const CURVE_FACTOR = 0.075;
// Takeover interaction. Works owns input only while fully settled at the top.
// Once exit intent is clear, native vertical page flow resumes through a short
// sticky release runway instead of jumping the scroll position programmatically.
const INPUT_SCALE = 0.01;
const SNAP_DELAY = 140;
const EXIT_INTENT_THRESHOLD = 560;
const EXIT_INTENT_RESET_DELAY = 220;
const EXIT_ARM_DELAY = 550;
// FIX 3: an input arriving more than EXIT_INTENT_RESET_DELAY after the last one
// is not part of a flick — it is a deliberate discrete push (key press, mouse
// wheel notch). Credit it a quarter of the threshold so four deliberate pushes
// always escape, no matter how slowly they are made.
const EXIT_INTENT_STEP = EXIT_INTENT_THRESHOLD / 4;
// FIX 1: wheel delta normalization.
// WheelEvent.deltaY is only in pixels when deltaMode === 0. Firefox on
// Windows/Linux reports deltaMode 1 (lines, ~3 per notch) and some setups
// report deltaMode 2 (pages, ~1 per notch). Unnormalized, a Firefox notch
// moved the gallery 0.03 world units instead of 1.0, which made the section
// both unusable and impossible to exit. 40px/line matches Chromium's own
// internal conversion; page mode maps to the viewport height. The cap keeps a
// single page-mode event from clearing the exit threshold on its own while
// staying far above any real pixel-mode delta (trackpads emit 1-10, mouse
// wheels 100-120), so pixel-mode behavior is unchanged.
const LINE_SCROLL_PX = 40;
const MAX_WHEEL_DELTA = 320;
function ensureStyles(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [data-mk-spatial-loop-section] {
      position: relative !important;
      min-height: var(--mk-spatial-loop-height, 160svh) !important;
      overflow: visible !important;
    }
    [data-mk-spatial-loop-container] {
      position: relative !important;
      width: 100% !important;
      min-height: var(--mk-spatial-loop-height, 160svh) !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
    }
    [data-mk-spatial-loop-layout] {
      position: sticky !important;
      top: 0 !important;
      z-index: 20 !important;
      width: 100% !important;
      height: 100svh !important;
      min-height: 100svh !important;
      padding-top: 0 !important;
      padding-bottom: 0 !important;
      overflow: hidden !important;
      transform-origin: 50% 50%;
      will-change: transform;
    }
    [data-mk-spatial-loop-heading] {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      margin: -1px !important;
      padding: 0 !important;
      overflow: hidden !important;
      clip: rect(0 0 0 0) !important;
      white-space: nowrap !important;
    }
    [data-motion~="spatial-loop"] {
      position: absolute !important;
      top: 0 !important;
      left: 50% !important;
      width: 100vw !important;
      height: 100svh !important;
      min-height: 100svh !important;
      transform: translateX(-50%) !important;
      overflow: hidden !important;
      overscroll-behavior: contain;
    }
    [data-mk-spatial-loop-canvas] {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      display: block !important;
      touch-action: pan-x pan-y;
      overscroll-behavior: contain;
    }
    [data-motion~="spatial-loop"][data-mk-spatial-loop-locked] [data-mk-spatial-loop-canvas] {
      touch-action: none !important;
    }
    [data-mk-spatial-loop-source-hidden] {
      visibility: hidden !important;
      pointer-events: none !important;
    }
    [data-mk-spatial-loop-title] {
      position: absolute;
      z-index: 3;
      left: 50%;
      bottom: clamp(2rem, 7svh, 4.5rem);
      width: min(90vw, 44rem);
      transform: translateX(-50%);
      text-align: center;
      pointer-events: none;
    }
    [data-mk-spatial-loop-title-item] {
      position: absolute;
      left: 0;
      bottom: 0;
      width: 100%;
      margin: 0;
      font: inherit;
      color: inherit;
      font-size: clamp(1.35rem, 2.05vw, 2.15rem);
      line-height: .95;
      letter-spacing: -.035em;
      text-transform: uppercase;
    }
    @media screen and (max-width: 767px) {
      [data-mk-spatial-loop-section],
      [data-mk-spatial-loop-container] {
        min-height: var(--mk-spatial-loop-height-mobile, 150svh) !important;
      }
      [data-mk-spatial-loop-title] { bottom: 6svh; }
      [data-mk-spatial-loop-title-item] { font-size: 1.35rem; }
    }
  `;
  doc.head.appendChild(style);
}
function isShortLandscapeViewport() {
  return window.matchMedia?.(SHORT_LANDSCAPE_QUERY).matches ||
    (window.innerWidth > window.innerHeight && window.innerWidth <= 1180 && window.innerHeight <= 600);
}
// FIX 1: convert a WheelEvent axis delta into pixels regardless of deltaMode.
function normalizeWheelDelta(value, deltaMode) {
  if (!Number.isFinite(value) || value === 0) return 0;
  let pixels = value;
  if (deltaMode === 1) {
    pixels = value * LINE_SCROLL_PX;
  } else if (deltaMode === 2) {
    pixels = value * Math.max(1, window.innerHeight);
  }
  return Math.sign(pixels) * Math.min(Math.abs(pixels), MAX_WHEEL_DELTA);
}
function getCameraZ(aspectRatio) {
  if (isShortLandscapeViewport()) return 8.35;
  if (window.innerWidth > 768) return 5.5;
  const fovRadians = THREE.MathUtils.degToRad(FOV);
  const z = 11.5 / (2 * Math.tan(fovRadians / 2) * aspectRatio);
  return THREE.MathUtils.clamp(z, 12, 18);
}
function sourceUrl(media) {
  if (!media) return null;
  return media.currentSrc || media.src || media.getAttribute("src");
}
function createTexture(media) {
  if (media instanceof HTMLVideoElement) {
    media.muted = true;
    media.loop = true;
    media.playsInline = true;
    const texture = new THREE.VideoTexture(media);
    texture.colorSpace = THREE.SRGBColorSpace;
    return { texture, video: media };
  }
  const url = sourceUrl(media);
  if (!url) return null;
  const texture = new THREE.TextureLoader().load(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, video: null };
}
function curveGeometry(slide, worldOffsetX) {
  const position = slide.geometry.attributes.position;
  for (let index = 0; index < position.count; index += 1) {
    const worldX = slide.baseX[index] + worldOffsetX;
    const scaled = worldX * CURVE_FACTOR;
    position.setY(index, slide.baseY[index] * (1 + scaled * scaled));
  }
  position.needsUpdate = true;
}
function findSceneShell(root) {
  const layout = root.parentElement;
  const container = layout?.parentElement;
  const section = container?.parentElement;
  const heading = layout?.querySelector(".work-title") || null;
  return { layout, container, section, heading };
}
function titleFromItem(item, media, index) {
  return (
    item.getAttribute("data-spatial-title") ||
    media?.getAttribute("alt") ||
    media?.alt ||
    `Project ${index + 1}`
  ).trim();
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
export const spatialLoop = {
  name: "spatial-loop",
  category: "composition",
  selector: '[data-motion~="spatial-loop"]',
  mount(root, { gsap, ScrollTrigger, reducedMotion }) {
    if (reducedMotion()) return;
    ensureStyles(root.ownerDocument);
    const itemSelector = readString(root, "motion-item-selector", ".work-item");
    const mediaSelector = readString(root, "motion-media-selector", ".work-image");
    const sectionHeight = readString(root, "motion-section-height", "160svh");
    const mobileSectionHeight = readString(root, "motion-mobile-section-height", "150svh");
    const sourceItems = Array.from(root.querySelectorAll(itemSelector));
    if (sourceItems.length < 2) return;
    const shell = findSceneShell(root);
    if (!shell.layout || !shell.section) return;
    shell.section.setAttribute("data-mk-spatial-loop-section", "");
    shell.container?.setAttribute("data-mk-spatial-loop-container", "");
    shell.layout.setAttribute("data-mk-spatial-loop-layout", "");
    shell.heading?.setAttribute("data-mk-spatial-loop-heading", "");
    shell.section.style.setProperty("--mk-spatial-loop-height", sectionHeight);
    shell.section.style.setProperty("--mk-spatial-loop-height-mobile", mobileSectionHeight);
    shell.container?.style.setProperty("--mk-spatial-loop-height", sectionHeight);
    shell.container?.style.setProperty("--mk-spatial-loop-height-mobile", mobileSectionHeight);
    const titleHost = root.ownerDocument.createElement("div");
    titleHost.setAttribute("data-mk-spatial-loop-title", "");
    root.appendChild(titleHost);
    const scene = new THREE.Scene();
    const aspectRatio = window.innerWidth / Math.max(1, window.innerHeight);
    const camera = new THREE.PerspectiveCamera(FOV, aspectRatio, 0.1, 100);
    camera.position.z = getCameraZ(aspectRatio);
    scene.add(camera);
    const renderer = new THREE.WebGPURenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.setAttribute("data-mk-spatial-loop-canvas", "");
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.overscrollBehavior = "contain";
    root.prepend(renderer.domElement);
    const stride = WIDTH + GAP;
    let slides = [];
    let titleItems = [];
    let totalWidth = 0;
    let maxTravel = 0;
    let scrollPosition = 0;
    let targetScrollPosition = 0;
    let previousScrollPosition = 0;
    let currentCenterIndex = 0;
    let destroyed = false;
    let rafId = null;
    let lockTrigger = null;
    let releaseTimeline = null;
    let inputTimeout = null;
    let takeoverState = "idle";
    let exitIntent = 0;
    let exitIntentDirection = 0;
    let lastExitIntentAt = 0;
    let lockedAt = 0;
    let touchX = null;
    let touchY = null;
    const resetExitIntent = () => {
      exitIntent = 0;
      exitIntentDirection = 0;
      lastExitIntentAt = 0;
    };
    const showTitle = (nextIndex) => {
      if (nextIndex === currentCenterIndex || !titleItems.length) return;
      const previousIndex = currentCenterIndex;
      currentCenterIndex = nextIndex;
      const direction = scrollPosition > previousScrollPosition ? "right" : "left";
      previousScrollPosition = scrollPosition;
      const outgoing = titleItems[previousIndex];
      const incoming = titleItems[nextIndex];
      if (outgoing) {
        gsap.to(outgoing, {
          yPercent: direction === "right" ? -30 : 30,
          opacity: 0,
          duration: 0.15,
          ease: "power2.out",
          overwrite: true
        });
      }
      if (incoming) {
        gsap.set(incoming, { yPercent: direction === "right" ? 30 : -30, opacity: 0 });
        gsap.to(incoming, {
          yPercent: 0,
          opacity: 1,
          duration: 0.2,
          delay: 0.05,
          ease: "power2.out",
          overwrite: true
        });
      }
    };
    const updateInfiniteScroll = () => {
      scrollPosition += (targetScrollPosition - scrollPosition) * SCROLL_LERP;
      const halfWidth = totalWidth / 2;
      let nearestIndex = 0;
      let nearestDistance = Infinity;
      slides.forEach((slide) => {
        let x = slide.originalPosition - scrollPosition;
        if (x < -halfWidth) {
          x += totalWidth;
          slide.originalPosition += totalWidth;
        }
        if (x > halfWidth) {
          x -= totalWidth;
          slide.originalPosition -= totalWidth;
        }
        slide.mesh.position.x = x;
        slide.mesh.rotation.set(0, 0, 0);
        curveGeometry(slide, x);
        if (Math.abs(x) < nearestDistance) {
          nearestDistance = Math.abs(x);
          nearestIndex = slide.index;
        }
      });
      showTitle(nearestIndex);
    };
    const animate = () => {
      if (destroyed) return;
      updateInfiniteScroll();
      renderer.renderAsync(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    // FIX 3: snapping no longer clears exit intent. Snapping is a gallery
    // position concern; exit intent is a navigation concern. Because this ran
    // SNAP_DELAY (140ms) after every input, it wiped the accumulator before
    // EXIT_INTENT_RESET_DELAY (220ms) could ever apply — so the real window was
    // 140ms, and any input spaced wider than that could never accumulate at all.
    const snapGallery = () => {
      targetScrollPosition = clamp(Math.round(targetScrollPosition / stride) * stride, 0, maxTravel);
    };
    const lockTakeover = () => {
      if (destroyed || takeoverState === "locked" || !slides.length) return;
      takeoverState = "locked";
      lockedAt = performance.now();
      resetExitIntent();
      clearTimeout(inputTimeout);
      root.setAttribute("data-mk-spatial-loop-locked", "");
    };
    const releaseTakeover = () => {
      if (takeoverState !== "locked") return;
      takeoverState = "released";
      clearTimeout(inputTimeout);
      resetExitIntent();
      root.removeAttribute("data-mk-spatial-loop-locked");
    };
    const registerExitIntent = (delta) => {
      const now = performance.now();
      if (now - lockedAt < EXIT_ARM_DELAY) return false;
      const direction = Math.sign(delta);
      if (!direction) return false;
      // FIX 3: a long gap no longer discards the accumulated push. Only a
      // reversal does — that is the one signal that unambiguously means the
      // user changed their mind. Everything else is still the same push,
      // whether it arrives as a 16ms trackpad stream or one keypress a second.
      if (direction !== exitIntentDirection) {
        exitIntent = 0;
      }
      const idle = lastExitIntentAt ? now - lastExitIntentAt : Infinity;
      exitIntent += idle > EXIT_INTENT_RESET_DELAY
        ? Math.max(Math.abs(delta), EXIT_INTENT_STEP)
        : Math.abs(delta);
      exitIntentDirection = direction;
      lastExitIntentAt = now;
      if (exitIntent >= EXIT_INTENT_THRESHOLD) {
        releaseTakeover();
        return true;
      }
      return false;
    };
    const handleInput = (delta, allowExitIntent = true) => {
      if (takeoverState !== "locked" || !Number.isFinite(delta) || delta === 0) return;
      targetScrollPosition = clamp(targetScrollPosition + delta * INPUT_SCALE, 0, maxTravel);
      if (allowExitIntent) {
        if (registerExitIntent(delta)) return;
      } else {
        resetExitIntent();
      }
      clearTimeout(inputTimeout);
      inputTimeout = setTimeout(snapGallery, SNAP_DELAY);
    };
    const onWheel = (event) => {
      if (takeoverState !== "locked") return;
      event.preventDefault();
      event.stopPropagation();
      // FIX 1: normalize to pixels before any magnitude comparison, so the axis
      // pick, the scroll scale and the exit-intent accumulator all agree across
      // browsers and input devices.
      const deltaX = normalizeWheelDelta(event.deltaX, event.deltaMode);
      const deltaY = normalizeWheelDelta(event.deltaY, event.deltaMode);
      const horizontal = Math.abs(deltaX);
      const vertical = Math.abs(deltaY);
      const useHorizontal = horizontal > vertical;
      handleInput(useHorizontal ? deltaX : deltaY, !useHorizontal);
    };
    const onTouchStart = (event) => {
      if (takeoverState !== "locked" || !event.touches?.length) return;
      touchX = event.touches[0].clientX;
      touchY = event.touches[0].clientY;
    };
    const onTouchMove = (event) => {
      if (takeoverState !== "locked" || !event.touches?.length) return;
      event.preventDefault();
      event.stopPropagation();
      const nextX = event.touches[0].clientX;
      const nextY = event.touches[0].clientY;
      const deltaX = touchX == null ? 0 : touchX - nextX;
      const deltaY = touchY == null ? 0 : touchY - nextY;
      touchX = nextX;
      touchY = nextY;
      const useHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
      handleInput(useHorizontal ? deltaX : deltaY, !useHorizontal);
    };
    const onTouchEnd = () => {
      touchX = null;
      touchY = null;
    };
    const onKeyDown = (event) => {
      if (takeoverState !== "locked") return;
      // FIX 3: unconditional escape hatch. Anything that seizes the page's
      // scroll must be dismissible by one deliberate key, bypassing both the
      // arm delay and the accumulator. Left un-prevented and un-stopped so the
      // key can still reach a nav or overlay that also listens for it.
      if (event.key === "Escape") {
        releaseTakeover();
        return;
      }
      let delta = 0;
      if (["ArrowDown", "ArrowRight", "PageDown"].includes(event.key)) delta = 120;
      if (["ArrowUp", "ArrowLeft", "PageUp"].includes(event.key)) delta = -120;
      if (event.key === " ") delta = event.shiftKey ? -120 : 120;
      if (!delta) return;
      event.preventDefault();
      event.stopPropagation();
      handleInput(delta, !["ArrowLeft", "ArrowRight"].includes(event.key));
    };
    const onResize = () => {
      const width = window.innerWidth;
      const height = Math.max(1, window.innerHeight);
      const nextAspect = width / height;
      camera.aspect = nextAspect;
      camera.updateProjectionMatrix();
      camera.position.z = getCameraZ(nextAspect);
      renderer.setSize(width, height);
      ScrollTrigger.refresh?.();
    };
    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true, capture: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true, capture: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true, capture: true });
    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("resize", onResize);
    (async () => {
      try {
        await renderer.init();
        if (destroyed) return;
        // FIX 2: resolve every texture BEFORE assigning any layout position.
        // Previously `originalPosition` and the title index both came from the
        // pre-filter index, so one item whose media failed to resolve left a
        // stride-wide hole in the strip, desynced `totalWidth` from the real
        // extent (slides overlapped and teleported mid-view), and pushed
        // `slide.index` past the end of `titleItems` so titles stopped
        // appearing at all. Positions are now derived from the surviving list,
        // which is the same list `titleItems` is built from.
        const resolvedItems = [];
        sourceItems.forEach((item) => {
          const media = item.querySelector(mediaSelector);
          const asset = createTexture(media);
          if (!asset) {
            console.warn(
              `[MotionKit spatial-loop] Skipping item: no resolvable "${mediaSelector}" media`,
              item
            );
            return;
          }
          resolvedItems.push({ item, media, asset });
        });
        slides = resolvedItems.map(({ item, media, asset }, index) => {
          const geometry = new THREE.PlaneGeometry(WIDTH, HEIGHT, 24, 12);
          const position = geometry.attributes.position;
          const baseX = new Float32Array(position.count);
          const baseY = new Float32Array(position.count);
          for (let vertex = 0; vertex < position.count; vertex += 1) {
            baseX[vertex] = position.getX(vertex);
            baseY[vertex] = position.getY(vertex);
          }
          const material = new THREE.MeshBasicMaterial({ map: asset.texture, side: THREE.DoubleSide, transparent: true });
          const mesh = new THREE.Mesh(geometry, material);
          const originalPosition = index * stride;
          mesh.position.x = originalPosition;
          scene.add(mesh);
          const title = root.ownerDocument.createElement("div");
          title.setAttribute("data-mk-spatial-loop-title-item", "");
          title.textContent = titleFromItem(item, media, index);
          titleHost.appendChild(title);
          gsap.set(title, { yPercent: index === 0 ? 0 : 30, opacity: index === 0 ? 1 : 0 });
          return { index, mesh, geometry, material, texture: asset.texture, video: asset.video, originalPosition, title, baseX, baseY };
        });
        if (slides.length < 2) return;
        titleItems = slides.map((slide) => slide.title);
        totalWidth = slides.length * stride;
        maxTravel = stride * Math.max(1, slides.length - 1);
        sourceItems.forEach((item) => item.setAttribute("data-mk-spatial-loop-source-hidden", ""));
        // Natural scroll now owns the transition out. No scrollTop tween and no
        // synthetic jump. The scene simply eases back while the page advances.
        releaseTimeline = gsap.timeline({
          scrollTrigger: {
            id: "mk-spatial-loop-release",
            trigger: shell.section,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.75,
            invalidateOnRefresh: true,
            onUpdate(self) {
              if (self.progress > 0.015 && takeoverState === "locked") releaseTakeover();
              if (self.progress > 0.015 && takeoverState === "idle") takeoverState = "released";
            },
            onLeave() {
              takeoverState = "idle";
              root.removeAttribute("data-mk-spatial-loop-locked");
            },
            onLeaveBack() {
              takeoverState = "idle";
              root.removeAttribute("data-mk-spatial-loop-locked");
            }
          }
        });
        releaseTimeline.fromTo(
          shell.layout,
          { yPercent: 0, scale: 1 },
          { yPercent: -8, scale: 0.975, ease: "none" }
        );
        // One-pixel trigger at the fully expanded position. It locks only here,
        // so the approach and departure remain ordinary smooth vertical scroll.
        lockTrigger = ScrollTrigger.create({
          id: "mk-spatial-loop-lock",
          trigger: shell.section,
          start: "top top",
          end: "+=2",
          onEnter: lockTakeover,
          onEnterBack: lockTakeover
        });
        rafId = requestAnimationFrame(animate);
        ScrollTrigger.refresh?.();
      } catch (error) {
        console.error("[MotionKit spatial-loop] Unable to initialize takeover WebGPU gallery", error);
      }
    })();
    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(inputTimeout);
      lockTrigger?.kill?.();
      releaseTimeline?.scrollTrigger?.kill?.();
      releaseTimeline?.kill?.();
      window.removeEventListener("wheel", onWheel, true);
      window.removeEventListener("touchstart", onTouchStart, true);
      window.removeEventListener("touchmove", onTouchMove, true);
      window.removeEventListener("touchend", onTouchEnd, true);
      window.removeEventListener("touchcancel", onTouchEnd, true);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", onResize);
      root.removeAttribute("data-mk-spatial-loop-locked");
      gsap.set(shell.layout, { clearProps: "transform" });
      slides.forEach((slide) => {
        slide.video?.pause?.();
        slide.texture?.dispose?.();
        slide.material?.dispose?.();
        slide.geometry?.dispose?.();
        scene.remove(slide.mesh);
      });
      renderer.dispose();
      renderer.domElement.remove();
      titleHost.remove();
      sourceItems.forEach((item) => item.removeAttribute("data-mk-spatial-loop-source-hidden"));
      shell.section.removeAttribute("data-mk-spatial-loop-section");
      shell.container?.removeAttribute("data-mk-spatial-loop-container");
      shell.layout.removeAttribute("data-mk-spatial-loop-layout");
      shell.heading?.removeAttribute("data-mk-spatial-loop-heading");
      shell.section.style.removeProperty("--mk-spatial-loop-height");
      shell.section.style.removeProperty("--mk-spatial-loop-height-mobile");
      shell.container?.style.removeProperty("--mk-spatial-loop-height");
      shell.container?.style.removeProperty("--mk-spatial-loop-height-mobile");
    };
  }
};
 
