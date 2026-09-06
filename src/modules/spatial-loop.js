import * as THREE from "three/webgpu";
import { readNumber, readString } from "../core/config.js";

const STYLE_ID = "motion-kit-spatial-loop-styles";
let sequence = 0;

function ensureStyles(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [data-motion~="spatial-loop"] { position: relative; overflow: hidden; }
    [data-mk-spatial-loop-canvas] { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
    [data-mk-spatial-loop-source-hidden] { visibility: hidden !important; pointer-events: none !important; }
  `;
  doc.head.appendChild(style);
}

export function wrapSpatialPosition(originalPosition, scrollPosition, totalWidth) {
  if (!Number.isFinite(totalWidth) || totalWidth <= 0) {
    return { x: originalPosition - scrollPosition, originalPosition };
  }

  const half = totalWidth / 2;
  let x = originalPosition - scrollPosition;
  let nextOriginal = originalPosition;

  while (x < -half) {
    x += totalWidth;
    nextOriginal += totalWidth;
  }
  while (x > half) {
    x -= totalWidth;
    nextOriginal -= totalWidth;
  }

  return { x, originalPosition: nextOriginal };
}

export function nearestSpatialSnap(targetScrollPosition, itemStride, totalWidth, count) {
  if (!Number.isFinite(itemStride) || itemStride <= 0 || !Number.isFinite(totalWidth) || totalWidth <= 0 || count < 1) {
    return null;
  }

  let nearest = null;
  let distance = Infinity;
  for (let index = 0; index < count; index += 1) {
    const anchor = index * itemStride;
    const candidate = anchor + Math.round((targetScrollPosition - anchor) / totalWidth) * totalWidth;
    const delta = Math.abs(candidate - targetScrollPosition);
    if (delta < distance) {
      distance = delta;
      nearest = candidate;
    }
  }
  return nearest;
}

function sourceUrl(media) {
  if (!media) return null;
  return media.currentSrc || media.src || media.getAttribute("src");
}

async function buildTexture(media) {
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
  const texture = await new THREE.TextureLoader().loadAsync(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, video: null };
}

function itemTitle(item, selector) {
  return selector ? item.querySelector(selector) : null;
}

export const spatialLoop = {
  name: "spatial-loop",
  category: "composition",
  selector: '[data-motion~="spatial-loop"]',

  mount(root, { gsap, plugins, reducedMotion }) {
    if (reducedMotion()) return;

    ensureStyles(root.ownerDocument);

    const ScrollTrigger = plugins?.ScrollTrigger;
    const itemSelector = readString(root, "motion-item-selector", "[data-spatial-loop-item]");
    const mediaSelector = readString(root, "motion-media-selector", "img, video");
    const titleSelector = readString(root, "motion-title-selector", "[data-spatial-loop-title]");
    const titleHostSelector = readString(root, "motion-title-host-selector", null);
    const inputMode = readString(root, "motion-input-mode", "pinned-page");

    const planeWidth = readNumber(root, "motion-plane-width", 8);
    const planeHeight = readNumber(root, "motion-plane-height", 4.5);
    const gap = readNumber(root, "motion-gap", 0.35);
    const cameraFov = readNumber(root, "motion-camera-fov", 75);
    const cameraZ = readNumber(root, "motion-camera-z", 5.5);
    const desktopLerp = readNumber(root, "motion-scroll-lerp", 0.1);
    const touchLerp = readNumber(root, "motion-touch-lerp", 0.28);
    const touchMultiplier = readNumber(root, "motion-touch-multiplier", 2.6);
    const wheelMultiplier = readNumber(root, "motion-wheel-multiplier", 0.01);
    const snapDelay = readNumber(root, "motion-snap-delay", 500);
    const snapSmoothing = readNumber(root, "motion-snap-smoothing", 0.055);
    const touchSnapSmoothing = readNumber(root, "motion-touch-snap-smoothing", 0.12);
    const pinDistanceVh = readNumber(root, "motion-pin-distance-vh", 100);

    const sourceItems = Array.from(root.querySelectorAll(itemSelector));
    if (sourceItems.length < 2) return;

    const titleHost = titleHostSelector ? root.querySelector(titleHostSelector) : null;
    const sourceTitles = sourceItems.map((item) => itemTitle(item, titleSelector));
    const titleClones = titleHost
      ? sourceTitles.map((title) => {
          if (!title) return null;
          const clone = title.cloneNode(true);
          clone.removeAttribute("data-spatial-loop-title");
          titleHost.appendChild(clone);
          return clone;
        })
      : sourceTitles;

    titleClones.forEach((title, index) => {
      if (!title) return;
      gsap.set(title, { yPercent: index === 0 ? 0 : 30, opacity: index === 0 ? 1 : 0 });
    });

    const canvas = root.ownerDocument.createElement("canvas");
    canvas.setAttribute("data-mk-spatial-loop-canvas", `mk-spatial-loop-${++sequence}`);
    canvas.setAttribute("aria-hidden", "true");
    root.prepend(canvas);

    sourceItems.forEach((item) => item.setAttribute("data-mk-spatial-loop-source-hidden", ""));

    let destroyed = false;
    let raf = 0;
    let resizeObserver = null;
    let renderer = null;
    let scene = null;
    let camera = null;
    let slides = [];
    let scrollPosition = 0;
    let targetScrollPosition = 0;
    let previousScrollPosition = 0;
    let currentCenterIndex = 0;
    let previousCenterIndex = 0;
    let lastInputWasTouch = false;
    let pointerDown = false;
    let scrolling = false;
    let scrollStopTimer = null;
    let pinnedTrigger = null;

    const stride = planeWidth + gap;
    const totalWidth = stride * sourceItems.length;
    const cleanups = [];

    const animateTitles = (nextIndex) => {
      if (nextIndex === currentCenterIndex || !titleClones.length) return;
      previousCenterIndex = currentCenterIndex;
      currentCenterIndex = nextIndex;
      const direction = scrollPosition > previousScrollPosition ? "right" : "left";
      previousScrollPosition = scrollPosition;
      const outgoing = titleClones[previousCenterIndex];
      const incoming = titleClones[currentCenterIndex];
      if (outgoing) gsap.to(outgoing, { yPercent: direction === "right" ? -30 : 30, opacity: 0, duration: 0.15, ease: "power2.out", overwrite: true });
      if (incoming) {
        gsap.set(incoming, { yPercent: direction === "right" ? 30 : -30, opacity: 0 });
        gsap.to(incoming, { yPercent: 0, opacity: 1, duration: 0.2, delay: 0.05, ease: "power2.out", overwrite: true });
      }
    };

    const updateSlides = () => {
      if (inputMode !== "pinned-page") {
        const lerp = lastInputWasTouch ? touchLerp : desktopLerp;
        if (scrolling || pointerDown) {
          scrollPosition += (targetScrollPosition - scrollPosition) * lerp;
        } else {
          const nearest = nearestSpatialSnap(targetScrollPosition, stride, totalWidth, slides.length);
          if (nearest !== null) targetScrollPosition = nearest;
          const smoothing = lastInputWasTouch ? touchSnapSmoothing : snapSmoothing;
          scrollPosition += (targetScrollPosition - scrollPosition) * smoothing;
        }
      } else {
        scrollPosition += (targetScrollPosition - scrollPosition) * desktopLerp;
      }

      let nearestIndex = 0;
      let nearestDistance = Infinity;
      slides.forEach((slide) => {
        const wrapped = wrapSpatialPosition(slide.originalPosition, scrollPosition, totalWidth);
        slide.originalPosition = wrapped.originalPosition;
        slide.mesh.position.x = wrapped.x;
        const distance = Math.abs(wrapped.x);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = slide.index;
        }
      });
      animateTitles(nearestIndex);
    };

    const render = () => {
      if (destroyed || !renderer || !scene || !camera) return;
      updateSlides();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };

    const scheduleStop = () => {
      scrolling = true;
      clearTimeout(scrollStopTimer);
      scrollStopTimer = setTimeout(() => {
        scrolling = false;
      }, snapDelay);
    };

    const applyDelta = (delta, touch = false) => {
      if (!Number.isFinite(delta) || delta === 0) return;
      lastInputWasTouch = touch;
      const multiplier = wheelMultiplier * (touch ? touchMultiplier : 1);
      targetScrollPosition += delta * multiplier;
      scheduleStop();
    };

    if (inputMode === "capture") {
      const onWheel = (event) => {
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        event.preventDefault();
        applyDelta(delta, false);
      };
      let touchX = 0;
      let touchY = 0;
      const onTouchBegin = (event) => {
        pointerDown = true;
        lastInputWasTouch = true;
        const point = event.touches[0];
        touchX = point?.clientX ?? 0;
        touchY = point?.clientY ?? 0;
      };
      const onTouchMove = (event) => {
        const point = event.touches[0];
        if (!point) return;
        const dx = touchX - point.clientX;
        const dy = touchY - point.clientY;
        touchX = point.clientX;
        touchY = point.clientY;
        event.preventDefault();
        applyDelta(Math.abs(dx) > Math.abs(dy) ? dx : dy, true);
      };
      const onTouchEnd = () => {
        pointerDown = false;
        scheduleStop();
      };
      root.addEventListener("wheel", onWheel, { passive: false });
      root.addEventListener("touchstart", onTouchBegin, { passive: true });
      root.addEventListener("touchmove", onTouchMove, { passive: false });
      root.addEventListener("touchend", onTouchEnd, { passive: true });
      cleanups.push(() => root.removeEventListener("wheel", onWheel));
      cleanups.push(() => root.removeEventListener("touchstart", onTouchBegin));
      cleanups.push(() => root.removeEventListener("touchmove", onTouchMove));
      cleanups.push(() => root.removeEventListener("touchend", onTouchEnd));
    }

    (async () => {
      try {
        scene = new THREE.Scene();
        const rect = root.getBoundingClientRect();
        camera = new THREE.PerspectiveCamera(cameraFov, Math.max(1, rect.width) / Math.max(1, rect.height), 0.1, 100);
        camera.position.z = cameraZ;
        scene.add(camera);

        renderer = new THREE.WebGPURenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
        await renderer.init();
        if (destroyed) return;

        const built = await Promise.all(sourceItems.map(async (item, index) => {
          const media = item.querySelector(mediaSelector);
          const asset = await buildTexture(media);
          if (!asset || destroyed) return null;
          const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 24, 24);
          const material = new THREE.MeshBasicMaterial({ map: asset.texture, transparent: true, side: THREE.DoubleSide });
          const mesh = new THREE.Mesh(geometry, material);
          const originalPosition = index * stride;
          mesh.position.x = originalPosition;
          scene.add(mesh);
          return { index, mesh, geometry, material, texture: asset.texture, video: asset.video, originalPosition };
        }));

        slides = built.filter(Boolean);
        if (slides.length < 2) return;

        if (inputMode === "pinned-page" && ScrollTrigger) {
          const travel = stride * Math.max(1, slides.length - 1);
          pinnedTrigger = ScrollTrigger.create({
            trigger: root,
            start: "top top",
            end: () => `+=${window.innerHeight * (pinDistanceVh / 100) * Math.max(1, slides.length - 1)}`,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            snap: slides.length > 1 ? {
              snapTo: 1 / (slides.length - 1),
              duration: { min: 0.12, max: 0.35 },
              delay: 0.05,
              ease: "power2.out"
            } : false,
            onUpdate: (self) => {
              targetScrollPosition = self.progress * travel;
            }
          });
        }

        const onResize = () => {
          if (!renderer || !camera) return;
          const bounds = root.getBoundingClientRect();
          camera.aspect = Math.max(1, bounds.width) / Math.max(1, bounds.height);
          camera.updateProjectionMatrix();
          renderer.setSize(Math.max(1, bounds.width), Math.max(1, bounds.height), false);
        };
        resizeObserver = new ResizeObserver(onResize);
        resizeObserver.observe(root);
        render();
      } catch (error) {
        console.error("[MotionKit spatial-loop] Unable to initialize Three.js/WebGPU gallery", error);
      }
    })();

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      clearTimeout(scrollStopTimer);
      pinnedTrigger?.kill?.();
      resizeObserver?.disconnect();
      cleanups.forEach((cleanup) => cleanup());
      slides.forEach((slide) => {
        slide.video?.pause?.();
        slide.texture?.dispose?.();
        slide.material?.dispose?.();
        slide.geometry?.dispose?.();
        scene?.remove(slide.mesh);
      });
      renderer?.dispose?.();
      canvas.remove();
      sourceItems.forEach((item) => item.removeAttribute("data-mk-spatial-loop-source-hidden"));
      if (titleHost) titleClones.forEach((title) => title?.remove());
    };
  }
};
