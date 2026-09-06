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

function ensureStyles(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [data-mk-spatial-loop-section] {
      position: relative !important;
      min-height: var(--mk-spatial-loop-height, 260svh) !important;
      overflow: visible !important;
    }
    [data-mk-spatial-loop-container] {
      position: relative !important;
      width: 100% !important;
      min-height: var(--mk-spatial-loop-height, 260svh) !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
    }
    [data-mk-spatial-loop-layout] {
      position: sticky !important;
      top: 0 !important;
      width: 100% !important;
      height: 100svh !important;
      min-height: 100svh !important;
      padding-top: 0 !important;
      padding-bottom: 0 !important;
      overflow: hidden !important;
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
        min-height: var(--mk-spatial-loop-height-mobile, 240svh) !important;
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

export const spatialLoop = {
  name: "spatial-loop",
  category: "composition",
  selector: '[data-motion~="spatial-loop"]',

  mount(root, { gsap, ScrollTrigger, reducedMotion }) {
    if (reducedMotion()) return;

    ensureStyles(root.ownerDocument);

    const itemSelector = readString(root, "motion-item-selector", ".work-item");
    const mediaSelector = readString(root, "motion-media-selector", ".work-image");
    const sectionHeight = readString(root, "motion-section-height", "260svh");
    const mobileSectionHeight = readString(root, "motion-mobile-section-height", "240svh");
    const sourceItems = Array.from(root.querySelectorAll(itemSelector));
    if (sourceItems.length < 2) return;

    const shell = findSceneShell(root);
    shell.section?.setAttribute("data-mk-spatial-loop-section", "");
    shell.container?.setAttribute("data-mk-spatial-loop-container", "");
    shell.layout?.setAttribute("data-mk-spatial-loop-layout", "");
    shell.heading?.setAttribute("data-mk-spatial-loop-heading", "");
    shell.section?.style.setProperty("--mk-spatial-loop-height", sectionHeight);
    shell.section?.style.setProperty("--mk-spatial-loop-height-mobile", mobileSectionHeight);
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
    renderer.domElement.style.touchAction = "pan-x pan-y";
    renderer.domElement.style.overscrollBehavior = "contain";
    root.prepend(renderer.domElement);

    const stride = WIDTH + GAP;
    let slides = [];
    let titleItems = [];
    let totalWidth = 0;
    let scrollPosition = 0;
    let targetScrollPosition = 0;
    let previousScrollPosition = 0;
    let currentCenterIndex = 0;
    let destroyed = false;
    let rafId = null;
    let pageTrigger = null;

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
        sourceItems.forEach((item) => item.setAttribute("data-mk-spatial-loop-source-hidden", ""));

        const travel = stride * Math.max(1, slides.length - 1);
        pageTrigger = ScrollTrigger.create({
          id: "mk-spatial-loop-page-flow",
          trigger: shell.section || root,
          start: "top top",
          end: "bottom bottom",
          invalidateOnRefresh: true,
          onUpdate(self) {
            targetScrollPosition = self.progress * travel;
          }
        });
        targetScrollPosition = pageTrigger.progress * travel;

        rafId = requestAnimationFrame(animate);
        ScrollTrigger.refresh?.();
      } catch (error) {
        console.error("[MotionKit spatial-loop] Unable to initialize page-directed WebGPU gallery", error);
      }
    })();

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
      pageTrigger?.kill?.();
      window.removeEventListener("resize", onResize);

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
      shell.section?.removeAttribute("data-mk-spatial-loop-section");
      shell.container?.removeAttribute("data-mk-spatial-loop-container");
      shell.layout?.removeAttribute("data-mk-spatial-loop-layout");
      shell.heading?.removeAttribute("data-mk-spatial-loop-heading");
      shell.section?.style.removeProperty("--mk-spatial-loop-height");
      shell.section?.style.removeProperty("--mk-spatial-loop-height-mobile");
      shell.container?.style.removeProperty("--mk-spatial-loop-height");
      shell.container?.style.removeProperty("--mk-spatial-loop-height-mobile");
    };
  }
};
