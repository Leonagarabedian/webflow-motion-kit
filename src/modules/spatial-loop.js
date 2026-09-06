import * as THREE from "three/webgpu";
import { Fn, float, modelWorldMatrix, positionLocal, pow, sin } from "three/tsl";
import { readString } from "../core/config.js";

const STYLE_ID = "motion-kit-spatial-loop-styles";

// Source-port constants from Scheme Engine's Work gallery.
const WIDTH = 8;
const HEIGHT = 4.5;
const GAP = 0.35;
const SCROLL_SPEED = -0.01;
const TOUCH_SCROLL_SPEED_MULTIPLIER = 2.6;
const SCROLL_LERP = 0.1;
const TOUCH_SCROLL_LERP = 0.28;
const SNAP_DELAY = 500;
const SNAP_TRAILING_DELAY = 80;
const SNAP_TRAILING_DELTA = 4;
const SNAP_SMOOTHING = 0.055;
const TOUCH_SNAP_DELAY = 400;
const TOUCH_SNAP_SMOOTHING = 0.12;
const TOUCH_SNAP_VELOCITY_THRESHOLD = 0.04;
const SNAP_LOCK_EPSILON = 0.001;
const FOV = 75;
const SHORT_LANDSCAPE_QUERY = "(orientation: landscape) and (max-width: 1180px) and (max-height: 600px)";

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

export function nearestSpatialSnap(targetScrollPosition, itemStride, totalWidth, slides) {
  if (!slides?.length || !Number.isFinite(totalWidth) || totalWidth <= 0) return null;
  let nearest = null;
  let distance = Infinity;
  slides.forEach((slide) => {
    const anchor = slide.index * itemStride;
    const candidate = anchor + Math.round((targetScrollPosition - anchor) / totalWidth) * totalWidth;
    const delta = Math.abs(candidate - targetScrollPosition);
    if (delta < distance) {
      distance = delta;
      nearest = candidate;
    }
  });
  return nearest;
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

function createMaterial(texture) {
  if (THREE.MeshBasicNodeMaterial) {
    const material = new THREE.MeshBasicNodeMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true
    });

    // Scheme source: local position is scaled vertically by
    // 1 + pow(sin(worldX) * 0.075, 2).
    material.positionNode = Fn(() => {
      const position = positionLocal.xyz.toVar();
      const worldX = modelWorldMatrix.mul(position).x;
      const wave = sin(worldX);
      position.y.mulAssign(float(1).add(pow(wave.mul(0.075), 2)));
      return position;
    })();
    return material;
  }

  return new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    transparent: true
  });
}

class SchemeVirtualScroll {
  constructor(onChange) {
    this.onChange = onChange;
    this.x = 0;
    this.y = 0;
    this.mouseMultiplier = 1;
    this.firefoxMultiplier = 15;
    this.keyStep = 120;
    this._onWheel = this._onWheel.bind(this);
    this._onMouseWheel = this._onMouseWheel.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this.bind();
  }

  emit(deltaX, deltaY, originalEvent) {
    this.x += deltaX;
    this.y += deltaY;
    this.onChange({ x: this.x, y: this.y, deltaX, deltaY, originalEvent });
  }

  _onWheel(event) {
    let deltaX = event.wheelDeltaX || -event.deltaX;
    let deltaY = event.wheelDeltaY || -event.deltaY;
    if (event.deltaMode === 1) {
      deltaX *= this.firefoxMultiplier;
      deltaY *= this.firefoxMultiplier;
    }
    this.emit(deltaX * this.mouseMultiplier, deltaY * this.mouseMultiplier, event);
  }

  _onMouseWheel(event) {
    const deltaX = event.wheelDeltaX ? event.wheelDeltaX : 0;
    const deltaY = event.wheelDeltaY ? event.wheelDeltaY : event.wheelDelta;
    this.emit(deltaX * this.mouseMultiplier, deltaY * this.mouseMultiplier, event);
  }

  _onKeyDown(event) {
    let deltaY = 0;
    switch (event.keyCode) {
      case 37: deltaY = 0; this.emit(this.keyStep, 0, event); return;
      case 39: deltaY = 0; this.emit(-this.keyStep, 0, event); return;
      case 38: deltaY = this.keyStep; break;
      case 40: deltaY = -this.keyStep; break;
      case 32: deltaY = event.shiftKey ? this.keyStep : -this.keyStep; break;
      default: return;
    }
    this.emit(0, deltaY, event);
  }

  bind() {
    window.addEventListener("wheel", this._onWheel, { passive: true });
    window.addEventListener("mousewheel", this._onMouseWheel, { passive: true });
    window.addEventListener("keydown", this._onKeyDown, { passive: true });
  }

  destroy() {
    window.removeEventListener("wheel", this._onWheel);
    window.removeEventListener("mousewheel", this._onMouseWheel);
    window.removeEventListener("keydown", this._onKeyDown);
  }
}

export const spatialLoop = {
  name: "spatial-loop",
  category: "composition",
  selector: '[data-motion~="spatial-loop"]',

  mount(root, { reducedMotion }) {
    if (reducedMotion()) return;

    ensureStyles(root.ownerDocument);

    const itemSelector = readString(root, "motion-item-selector", ".work-item");
    const mediaSelector = readString(root, "motion-media-selector", ".work-image");
    const sourceItems = Array.from(root.querySelectorAll(itemSelector));
    if (sourceItems.length < 2) return;

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
    renderer.domElement.style.touchAction = "pan-x pan-y";
    renderer.domElement.style.overscrollBehavior = "contain";
    root.prepend(renderer.domElement);

    const stride = WIDTH + GAP;
    let slides = [];
    let totalWidth = 0;
    let scrollPosition = 0;
    let targetScrollPosition = 0;
    let lastFrameScrollDelta = 0;
    let isScrolling = false;
    let scrollStopTimeout = null;
    let pointerIsDown = false;
    let touchActive = false;
    let lastScrollInputWasTouch = false;
    let destroyed = false;
    let rafId = null;
    const isCoarsePointer = !!(window.matchMedia?.("(pointer: coarse)")?.matches || navigator.maxTouchPoints > 0);

    const isTouchInput = () => isCoarsePointer || lastScrollInputWasTouch;
    const isTouchGlideActive = () => isTouchInput() && Math.abs(lastFrameScrollDelta) > TOUCH_SNAP_VELOCITY_THRESHOLD;
    const canApplyScrollSnap = () => !isScrolling && !pointerIsDown && !touchActive && !isTouchGlideActive() && slides.length >= 2 && !!totalWidth;

    const applyScrollSnap = () => {
      const nearest = nearestSpatialSnap(targetScrollPosition, stride, totalWidth, slides);
      if (nearest === null) return;
      targetScrollPosition = nearest;
      const smoothing = isTouchInput() ? TOUCH_SNAP_SMOOTHING : SNAP_SMOOTHING;
      const delta = nearest - scrollPosition;
      if (Math.abs(delta) < SNAP_LOCK_EPSILON) scrollPosition = nearest;
      else scrollPosition += delta * smoothing;
    };

    const updateInfiniteScroll = () => {
      const previous = scrollPosition;
      if (canApplyScrollSnap()) {
        applyScrollSnap();
      } else {
        const lerp = isTouchInput() ? TOUCH_SCROLL_LERP : SCROLL_LERP;
        scrollPosition += (targetScrollPosition - scrollPosition) * lerp;
      }

      lastFrameScrollDelta = scrollPosition - previous;
      const halfWidth = totalWidth / 2;
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
      });
    };

    const animate = () => {
      if (destroyed) return;
      updateInfiniteScroll();
      renderer.renderAsync(scene, camera);
      rafId = requestAnimationFrame(animate);
    };

    const scroller = new SchemeVirtualScroll((event) => {
      const type = event.originalEvent?.type || "";
      const touch = type.startsWith("touch");
      lastScrollInputWasTouch = touch;
      const deltaX = event.deltaX || 0;
      const deltaY = event.deltaY || 0;
      const dominantDelta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
      const speed = SCROLL_SPEED * (touch ? TOUCH_SCROLL_SPEED_MULTIPLIER : 1);
      targetScrollPosition += dominantDelta * speed;
      isScrolling = true;
      clearTimeout(scrollStopTimeout);
      const delay = touch
        ? TOUCH_SNAP_DELAY
        : Math.abs(dominantDelta) < SNAP_TRAILING_DELTA
          ? SNAP_TRAILING_DELAY
          : SNAP_DELAY;
      scrollStopTimeout = setTimeout(() => {
        isScrolling = false;
      }, delay);
    });

    const canvas = renderer.domElement;
    const onPointerDown = () => { pointerIsDown = true; };
    const onPointerUp = () => { pointerIsDown = false; };
    const onTouchStart = (event) => {
      event.preventDefault();
      touchActive = true;
      lastScrollInputWasTouch = true;
    };
    const onTouchEnd = () => { touchActive = false; };
    const onResize = () => {
      const width = window.innerWidth;
      const height = Math.max(1, window.innerHeight);
      const nextAspect = width / height;
      camera.aspect = nextAspect;
      camera.updateProjectionMatrix();
      camera.position.z = getCameraZ(nextAspect);
      renderer.setSize(width, height);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerUp, { passive: true });
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: true });
    canvas.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("resize", onResize);

    (async () => {
      try {
        await renderer.init();
        if (destroyed) return;

        slides = sourceItems.map((item, index) => {
          const media = item.querySelector(mediaSelector);
          const asset = createTexture(media);
          if (!asset) return null;
          const geometry = new THREE.PlaneGeometry(WIDTH, HEIGHT, 10, 10);
          const material = createMaterial(asset.texture);
          const mesh = new THREE.Mesh(geometry, material);
          const originalPosition = index * stride;
          mesh.position.x = originalPosition;
          scene.add(mesh);
          return {
            index,
            mesh,
            geometry,
            material,
            texture: asset.texture,
            video: asset.video,
            originalPosition
          };
        }).filter(Boolean);

        if (slides.length < 2) return;
        totalWidth = slides.length * stride;
        sourceItems.forEach((item) => item.setAttribute("data-mk-spatial-loop-source-hidden", ""));
        rafId = requestAnimationFrame(animate);
      } catch (error) {
        console.error("[MotionKit spatial-loop] Unable to initialize Scheme-style WebGPU gallery", error);
      }
    })();

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(scrollStopTimeout);
      scroller.destroy();
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
      slides.forEach((slide) => {
        slide.video?.pause?.();
        slide.texture?.dispose?.();
        slide.material?.dispose?.();
        slide.geometry?.dispose?.();
        scene.remove(slide.mesh);
      });
      renderer.dispose();
      canvas.remove();
      sourceItems.forEach((item) => item.removeAttribute("data-mk-spatial-loop-source-hidden"));
    };
  }
};
