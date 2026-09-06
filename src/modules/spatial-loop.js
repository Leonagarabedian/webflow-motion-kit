import * as THREE from "three/webgpu";
import { readString } from "../core/config.js";

const STYLE_ID = "motion-kit-spatial-loop-styles";

// Scheme Engine Work gallery source values.
const WIDTH = 8;
const HEIGHT = 4.5;
const GAP = 0.35;
const SCROLL_LERP = 0.1;
const FOV = 75;
const SHORT_LANDSCAPE_QUERY = "(orientation: landscape) and (max-width: 1180px) and (max-height: 600px)";

// Exact Work-plane curve factor from Scheme's applyCurveNode():
// y *= 1 + pow(worldX * .075, 2)
const CURVE_FACTOR = 0.075;

// Works takeover choreography.
const INPUT_SCALE = 0.01;
const SNAP_DELAY = 140;
const EXIT_INTENT_THRESHOLD = 160;
const ENTER_DURATION = 0.55;
const RELEASE_DURATION = 0.8;

function ensureStyles(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [data-mk-spatial-loop-section] {
      position: relative !important;
      min-height: var(--mk-spatial-loop-height, 100svh) !important;
      overflow: visible !important;
    }
    [data-mk-spatial-loop-container] {
      position: relative !important;
      width: 100% !important;
      min-height: var(--mk-spatial-loop-height, 100svh) !important;
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
      will-change: transform, border-radius;
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
        min-height: var(--mk-spatial-loop-height-mobile, 100svh) !important;
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
  const baseX = slide.baseX;
  const baseY = slide.baseY;

  for (let index = 0; index < position.count; index += 1) {
    const worldX = baseX[index] + worldOffsetX;
    const scaled = worldX * CURVE_FACTOR;
    const scaleY = 1 + scaled * scaled;
    position.setY(index, baseY[index] * scaleY);
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
    const sectionHeight = readString(root, "motion-section-height", "100svh");
    const mobileSectionHeight = readString(root, "motion-mobile-section-height", "100svh");
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
    let pageTrigger = null;
    let inputTimeout = null;
    let takeoverState = "idle";
    let exitIntent = 0;
    let jumpGuard = false;
    let touchX = null;
    let touchY = null;

    const getSmoother = () => window.WebflowMotionKit?.scroll?.get?.() ?? null;
    const getPageY = () => {
      const smoother = getSmoother();
      if (smoother?.scrollTop) return smoother.scrollTop();
      return window.scrollY || window.pageYOffset || 0;
    };
    const setPageY = (value) => {
      const smoother = getSmoother();
      if (smoother?.scrollTo) smoother.scrollTo(value, false);
      else window.scrollTo(0, value);
    };
    const getSectionTop = () => getPageY() + shell.section.getBoundingClientRect().top;

    const resetSlidePositions = () => {
      slides.forEach((slide) => {
        slide.originalPosition = slide.index * stride;
      });
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
        gsap.set(incoming, {
          yPercent: direction === "right" ? 30 : -30,
          opacity: 0
        });
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

        const distance = Math.abs(x);
        if (distance < nearestDistance) {
          nearestDistance = distance;
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

    const snapGallery = () => {
      targetScrollPosition = clamp(
        Math.round(targetScrollPosition / stride) * stride,
        0,
        maxTravel
      );
      exitIntent = 0;
    };

    const lockTakeover = (direction) => {
      if (destroyed || jumpGuard || takeoverState !== "idle" || !slides.length) return;

      takeoverState = "locked";
      exitIntent = 0;
      clearTimeout(inputTimeout);
      resetSlidePositions();

      if (direction < 0) {
        targetScrollPosition = maxTravel;
        scrollPosition = maxTravel;
        currentCenterIndex = slides.length - 1;
      } else {
        targetScrollPosition = 0;
        scrollPosition = 0;
        currentCenterIndex = 0;
      }
      previousScrollPosition = scrollPosition;

      titleItems.forEach((title, index) => {
        gsap.set(title, {
          yPercent: index === currentCenterIndex ? 0 : 30,
          opacity: index === currentCenterIndex ? 1 : 0
        });
      });

      root.setAttribute("data-mk-spatial-loop-locked", "");
      gsap.killTweensOf(shell.layout);
      gsap.fromTo(
        shell.layout,
        { scale: 0.94, yPercent: 0, borderRadius: "2.5vw" },
        {
          scale: 1,
          yPercent: 0,
          borderRadius: "0vw",
          duration: ENTER_DURATION,
          ease: "power3.out",
          overwrite: true
        }
      );
    };

    const releaseTakeover = (direction) => {
      if (takeoverState !== "locked") return;
      takeoverState = "releasing";
      clearTimeout(inputTimeout);
      exitIntent = 0;

      const startY = getPageY();
      const sectionTop = getSectionTop();
      const targetY = direction > 0
        ? sectionTop + shell.section.offsetHeight + 2
        : Math.max(0, sectionTop - 2);
      const travelState = { y: startY };

      gsap.killTweensOf(shell.layout);
      gsap.to(shell.layout, {
        yPercent: direction > 0 ? -18 : 18,
        scale: 0.965,
        borderRadius: "2vw",
        duration: RELEASE_DURATION,
        ease: "power3.inOut",
        overwrite: true
      });

      gsap.to(travelState, {
        y: targetY,
        duration: RELEASE_DURATION,
        ease: "power3.inOut",
        onUpdate() {
          setPageY(travelState.y);
        },
        onComplete() {
          jumpGuard = true;
          setPageY(targetY);
          root.removeAttribute("data-mk-spatial-loop-locked");
          gsap.set(shell.layout, { clearProps: "transform,borderRadius" });
          takeoverState = "idle";
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              jumpGuard = false;
            });
          });
        }
      });
    };

    const handleInput = (delta) => {
      if (takeoverState !== "locked" || !Number.isFinite(delta) || delta === 0) return;

      const nextTarget = targetScrollPosition + delta * INPUT_SCALE;

      if (delta > 0 && nextTarget > maxTravel) {
        targetScrollPosition = maxTravel;
        exitIntent += delta;
        if (exitIntent >= EXIT_INTENT_THRESHOLD) {
          releaseTakeover(1);
          return;
        }
      } else if (delta < 0 && nextTarget < 0) {
        targetScrollPosition = 0;
        exitIntent += Math.abs(delta);
        if (exitIntent >= EXIT_INTENT_THRESHOLD) {
          releaseTakeover(-1);
          return;
        }
      } else {
        targetScrollPosition = clamp(nextTarget, 0, maxTravel);
        exitIntent = 0;
      }

      clearTimeout(inputTimeout);
      inputTimeout = setTimeout(snapGallery, SNAP_DELAY);
    };

    const onWheel = (event) => {
      if (takeoverState !== "locked") return;
      event.preventDefault();
      event.stopPropagation();
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;
      handleInput(delta);
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
      handleInput(Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY);
    };

    const onTouchEnd = () => {
      touchX = null;
      touchY = null;
    };

    const onKeyDown = (event) => {
      if (takeoverState !== "locked") return;
      let delta = 0;
      if (["ArrowDown", "ArrowRight", "PageDown"].includes(event.key)) delta = 120;
      if (["ArrowUp", "ArrowLeft", "PageUp"].includes(event.key)) delta = -120;
      if (event.key === " ") delta = event.shiftKey ? -120 : 120;
      if (!delta) return;
      event.preventDefault();
      event.stopPropagation();
      handleInput(delta);
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

        slides = sourceItems.map((item, index) => {
          const media = item.querySelector(mediaSelector);
          const asset = createTexture(media);
          if (!asset) return null;

          const geometry = new THREE.PlaneGeometry(WIDTH, HEIGHT, 24, 12);
          const position = geometry.attributes.position;
          const baseX = new Float32Array(position.count);
          const baseY = new Float32Array(position.count);
          for (let vertex = 0; vertex < position.count; vertex += 1) {
            baseX[vertex] = position.getX(vertex);
            baseY[vertex] = position.getY(vertex);
          }

          const material = new THREE.MeshBasicMaterial({
            map: asset.texture,
            side: THREE.DoubleSide,
            transparent: true
          });
          const mesh = new THREE.Mesh(geometry, material);
          const originalPosition = index * stride;
          mesh.position.x = originalPosition;
          scene.add(mesh);

          const title = root.ownerDocument.createElement("div");
          title.setAttribute("data-mk-spatial-loop-title-item", "");
          title.textContent = titleFromItem(item, media, index);
          titleHost.appendChild(title);
          gsap.set(title, {
            yPercent: index === 0 ? 0 : 30,
            opacity: index === 0 ? 1 : 0
          });

          return {
            index,
            mesh,
            geometry,
            material,
            texture: asset.texture,
            video: asset.video,
            originalPosition,
            title,
            baseX,
            baseY
          };
        }).filter(Boolean);

        if (slides.length < 2) return;
        titleItems = slides.map((slide) => slide.title);
        totalWidth = slides.length * stride;
        maxTravel = stride * Math.max(1, slides.length - 1);
        sourceItems.forEach((item) => item.setAttribute("data-mk-spatial-loop-source-hidden", ""));

        pageTrigger = ScrollTrigger.create({
          id: "mk-spatial-loop-takeover",
          trigger: shell.section,
          start: "top top",
          end: "bottom top",
          invalidateOnRefresh: true,
          onEnter() {
            lockTakeover(1);
          },
          onEnterBack() {
            lockTakeover(-1);
          }
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
      pageTrigger?.kill?.();
      window.removeEventListener("wheel", onWheel, true);
      window.removeEventListener("touchstart", onTouchStart, true);
      window.removeEventListener("touchmove", onTouchMove, true);
      window.removeEventListener("touchend", onTouchEnd, true);
      window.removeEventListener("touchcancel", onTouchEnd, true);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", onResize);
      root.removeAttribute("data-mk-spatial-loop-locked");
      gsap.set(shell.layout, { clearProps: "transform,borderRadius" });

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
