import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import { readNumber, readString } from "../core/config.js";

const STYLE_ID = "motion-kit-branda-spatial-works-styles";
const SECTION_SELECTOR = "[data-branda-spatial-section]";
const STAGE_SELECTOR = '[data-motion~="branda-spatial-works"]';

const DEFAULTS = Object.freeze({
  itemSelector: ".work-item",
  mediaSelector: ".work-image",
  titleSelector: "[data-spatial-title-source]",
  planeHeight: 4.5,
  gap: 0.65,
  curve: 0.075,
  lerp: 0.14,
  fov: 75,
  cameraZ: 6.15,
  mobileCameraZ: 12.5,
  scrollPerItem: 42,
  baseScroll: 100,
  edgeMargin: 1.15,
  maxPixelRatio: 2
});

function ensureStyles(doc) {
  if (doc.getElementById(STYLE_ID)) return;

  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    ${SECTION_SELECTOR} {
      position: relative;
      min-height: var(--branda-spatial-height, 320svh);
    }

    ${STAGE_SELECTOR} {
      position: sticky;
      top: 0;
      width: 100%;
      height: 100svh;
      min-height: 100svh;
      overflow: hidden;
      isolation: isolate;
    }

    [data-branda-spatial-canvas] {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
      z-index: 1;
      cursor: pointer;
    }

    [data-branda-spatial-source-hidden] {
      visibility: hidden !important;
      pointer-events: none !important;
    }

    [data-branda-spatial-title-host] {
      position: absolute;
      z-index: 3;
      left: 50%;
      bottom: clamp(2rem, 7svh, 4.5rem);
      width: min(90vw, 48rem);
      transform: translateX(-50%);
      text-align: center;
      pointer-events: none;
    }

    [data-branda-spatial-title-item] {
      position: absolute;
      left: 0;
      bottom: 0;
      width: 100%;
      margin: 0;
      font: inherit;
      color: inherit;
      line-height: .95;
    }

    @media screen and (max-width: 767px) {
      ${SECTION_SELECTOR} {
        min-height: var(--branda-spatial-height-mobile, var(--branda-spatial-height, 320svh));
      }

      [data-branda-spatial-title-host] {
        bottom: 6svh;
      }
    }
  `;
  doc.head.appendChild(style);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getMediaUrl(media) {
  if (!media) return null;
  return media.currentSrc || media.src || media.getAttribute("src") || null;
}

function getMediaAspect(media) {
  if (!media) return 16 / 9;

  if (media instanceof HTMLVideoElement) {
    const width = media.videoWidth || media.getAttribute("width");
    const height = media.videoHeight || media.getAttribute("height");
    const ratio = Number(width) / Number(height);
    return Number.isFinite(ratio) && ratio > 0 ? ratio : 16 / 9;
  }

  const width = media.naturalWidth || media.getAttribute("width");
  const height = media.naturalHeight || media.getAttribute("height");
  const ratio = Number(width) / Number(height);
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 16 / 9;
}

function titleFromItem(item, media, titleSelector, index) {
  const explicit = item.getAttribute("data-spatial-title");
  const titleNode = titleSelector ? item.querySelector(titleSelector) : null;
  const title =
    explicit ||
    titleNode?.textContent ||
    media?.getAttribute("alt") ||
    `Project ${index + 1}`;

  return title.trim();
}

function linkFromItem(item) {
  if (item instanceof HTMLAnchorElement && item.href) return item.href;
  return item.querySelector("a[href]")?.href || null;
}

async function createTexture(media) {
  if (media instanceof HTMLVideoElement) {
    media.muted = true;
    media.loop = true;
    media.playsInline = true;
    media.play?.().catch(() => {});
    const texture = new THREE.VideoTexture(media);
    texture.colorSpace = THREE.SRGBColorSpace;
    return { texture, video: media };
  }

  const url = getMediaUrl(media);
  if (!url) return null;

  const loader = new THREE.TextureLoader();
  const texture = await loader.loadAsync(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, video: null };
}

async function createRenderer(root, maxPixelRatio) {
  const options = { antialias: true, alpha: true };
  let renderer = null;
  let backend = "webgpu";

  try {
    renderer = new WebGPURenderer(options);
    await renderer.init();
  } catch (error) {
    console.warn(
      "[MotionKit branda-spatial-works] WebGPU unavailable. Falling back to WebGL.",
      error
    );
    renderer?.dispose?.();
    renderer = new THREE.WebGLRenderer(options);
    backend = "webgl";
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
  renderer.domElement.setAttribute("data-branda-spatial-canvas", "");
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.dataset.renderer = backend;
  root.prepend(renderer.domElement);
  return renderer;
}

function deformGeometry(slide, worldX, curve) {
  const position = slide.geometry.attributes.position;

  for (let index = 0; index < position.count; index += 1) {
    const vertexWorldX = slide.baseX[index] + worldX;
    const scaled = vertexWorldX * curve;
    position.setY(index, slide.baseY[index] * (1 + scaled * scaled));
  }

  position.needsUpdate = true;
}

function isVisibleInViewport(element) {
  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

export const brandaSpatialWorks = {
  name: "branda-spatial-works",
  category: "composition",
  selector: STAGE_SELECTOR,

  mount(root, { gsap, ScrollTrigger, reducedMotion }) {
    if (reducedMotion()) return;

    const section = root.closest(SECTION_SELECTOR);
    if (!section) {
      console.warn(
        `[MotionKit branda-spatial-works] Missing ${SECTION_SELECTOR} ancestor. Module not mounted.`
      );
      return;
    }

    ensureStyles(root.ownerDocument);

    const itemSelector = readString(root, "motion-item-selector", DEFAULTS.itemSelector);
    const mediaSelector = readString(root, "motion-media-selector", DEFAULTS.mediaSelector);
    const titleSelector = readString(root, "motion-title-selector", DEFAULTS.titleSelector);
    const planeHeight = Math.max(0.5, readNumber(root, "motion-plane-height", DEFAULTS.planeHeight));
    const gap = Math.max(0, readNumber(root, "motion-gap", DEFAULTS.gap));
    const curve = Math.max(0, readNumber(root, "motion-curve", DEFAULTS.curve));
    const lerp = clamp(readNumber(root, "motion-lerp", DEFAULTS.lerp), 0.01, 1);
    const fov = clamp(readNumber(root, "motion-fov", DEFAULTS.fov), 25, 120);
    const desktopCameraZ = Math.max(1, readNumber(root, "motion-camera-z", DEFAULTS.cameraZ));
    const mobileCameraZ = Math.max(
      1,
      readNumber(root, "motion-camera-z-mobile", DEFAULTS.mobileCameraZ)
    );
    const scrollPerItem = Math.max(
      10,
      readNumber(root, "motion-scroll-per-item", DEFAULTS.scrollPerItem)
    );
    const baseScroll = Math.max(
      100,
      readNumber(root, "motion-base-scroll", DEFAULTS.baseScroll)
    );
    const edgeMarginScale = Math.max(
      0,
      readNumber(root, "motion-edge-margin", DEFAULTS.edgeMargin)
    );
    const maxPixelRatio = clamp(
      readNumber(root, "motion-pixel-ratio", DEFAULTS.maxPixelRatio),
      1,
      2
    );

    const sourceItems = Array.from(root.querySelectorAll(itemSelector));
    if (!sourceItems.length) return;

    const sectionHeight = readString(root, "motion-section-height", "");
    const mobileSectionHeight = readString(root, "motion-section-height-mobile", "");
    const autoHeight = `${baseScroll + sourceItems.length * scrollPerItem}svh`;
    section.style.setProperty("--branda-spatial-height", sectionHeight || autoHeight);
    section.style.setProperty(
      "--branda-spatial-height-mobile",
      mobileSectionHeight || sectionHeight || autoHeight
    );

    const titleHost = root.ownerDocument.createElement("div");
    titleHost.setAttribute("data-branda-spatial-title-host", "");
    root.appendChild(titleHost);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
    scene.add(camera);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    let renderer = null;
    let slides = [];
    let titleItems = [];
    let travelDistance = 0;
    let targetProgress = 0;
    let progress = 0;
    let previousProgress = 0;
    let currentCenterIndex = -1;
    let rafId = null;
    let destroyed = false;
    let scrollTrigger = null;
    let resizeObserver = null;
    let active = false;
    let dirty = true;

    const cameraZ = () => (window.innerWidth <= 767 ? mobileCameraZ : desktopCameraZ);

    const visibleWorldWidth = () =>
      2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2) * camera.position.z * camera.aspect;

    const showTitle = (nextIndex) => {
      if (nextIndex === currentCenterIndex || !titleItems.length) return;

      const previousIndex = currentCenterIndex;
      currentCenterIndex = nextIndex;
      const direction = progress >= previousProgress ? "right" : "left";
      previousProgress = progress;

      const outgoing = titleItems[previousIndex];
      const incoming = titleItems[nextIndex];

      if (outgoing) {
        gsap.to(outgoing, {
          yPercent: direction === "right" ? -30 : 30,
          opacity: 0,
          duration: 0.16,
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
          duration: 0.22,
          delay: 0.04,
          ease: "power2.out",
          overwrite: true
        });
      }
    };

    const layoutSlides = () => {
      if (!slides.length) return;

      const viewportEdge = visibleWorldWidth() / 2;
      const largestWidth = Math.max(...slides.map((slide) => slide.width));
      const edgeMargin = largestWidth * edgeMarginScale;

      let cursor = -viewportEdge - edgeMargin;
      slides.forEach((slide) => {
        slide.startX = cursor - slide.width / 2;
        cursor -= slide.width + gap;
      });

      const lastSlide = slides[slides.length - 1];
      travelDistance =
        viewportEdge + edgeMargin + lastSlide.width / 2 - lastSlide.startX;
      dirty = true;
    };

    const resize = () => {
      if (!renderer) return;
      const width = Math.max(1, root.clientWidth || window.innerWidth);
      const height = Math.max(1, root.clientHeight || window.innerHeight);

      camera.aspect = width / height;
      camera.position.z = cameraZ();
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      layoutSlides();
      ScrollTrigger.refresh?.();
    };

    const updateSlides = () => {
      const before = progress;
      progress += (targetProgress - progress) * lerp;
      if (Math.abs(targetProgress - progress) < 0.0001) progress = targetProgress;

      const offset = progress * travelDistance;
      let nearestIndex = currentCenterIndex < 0 ? 0 : currentCenterIndex;
      let nearestDistance = Infinity;

      slides.forEach((slide) => {
        const x = slide.startX + offset;
        slide.mesh.position.x = x;
        deformGeometry(slide, x, curve);

        const distance = Math.abs(x);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = slide.order;
        }
      });

      showTitle(nearestIndex);
      return Math.abs(progress - before) > 0.000001;
    };

    const renderFrame = () => {
      rafId = null;
      if (destroyed || !renderer || !active) return;

      const moved = updateSlides();
      if (dirty || moved) {
        renderer.renderAsync?.(scene, camera) ?? renderer.render(scene, camera);
        dirty = false;
      }

      if (moved || Math.abs(targetProgress - progress) > 0.0001) {
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    const requestRender = () => {
      dirty = true;
      if (!destroyed && active && rafId == null) {
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    const onPointerUp = (event) => {
      if (!renderer || !slides.length) return;

      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const hit = raycaster.intersectObjects(slides.map((slide) => slide.mesh), false)[0];
      if (!hit) return;

      const slide = slides.find((candidate) => candidate.mesh === hit.object);
      if (slide?.href) window.location.href = slide.href;
    };

    renderer = null;

    (async () => {
      try {
        renderer = await createRenderer(root, maxPixelRatio);
        if (destroyed) {
          renderer.dispose?.();
          renderer.domElement.remove();
          return;
        }

        const resolved = [];
        for (const [index, item] of sourceItems.entries()) {
          const media = item.querySelector(mediaSelector);
          if (!media) continue;

          try {
            const asset = await createTexture(media);
            if (!asset) continue;
            resolved.push({ item, media, asset, index });
          } catch (error) {
            console.warn(
              "[MotionKit branda-spatial-works] Skipping media that failed to load.",
              item,
              error
            );
          }
        }

        if (!resolved.length || destroyed) return;

        titleItems = resolved.map(({ item, media }, order) => {
          const title = root.ownerDocument.createElement("div");
          title.setAttribute("data-branda-spatial-title-item", "");
          title.textContent = titleFromItem(item, media, titleSelector, order);
          titleHost.appendChild(title);
          gsap.set(title, { yPercent: 30, opacity: 0 });
          return title;
        });

        slides = resolved.map(({ item, media, asset }, order) => {
          const aspect = clamp(getMediaAspect(media), 0.45, 2.4);
          const width = planeHeight * aspect;
          const geometry = new THREE.PlaneGeometry(width, planeHeight, 24, 12);
          const position = geometry.attributes.position;
          const baseX = new Float32Array(position.count);
          const baseY = new Float32Array(position.count);

          for (let vertex = 0; vertex < position.count; vertex += 1) {
            baseX[vertex] = position.getX(vertex);
            baseY[vertex] = position.getY(vertex);
          }

          const material = new THREE.MeshBasicMaterial({
            map: asset.texture,
            transparent: true,
            side: THREE.DoubleSide
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.frustumCulled = false;
          scene.add(mesh);

          return {
            order,
            item,
            href: linkFromItem(item),
            mesh,
            geometry,
            material,
            texture: asset.texture,
            video: asset.video,
            width,
            startX: 0,
            baseX,
            baseY
          };
        });

        sourceItems.forEach((item) =>
          item.setAttribute("data-branda-spatial-source-hidden", "")
        );

        renderer.domElement.addEventListener("pointerup", onPointerUp);

        resizeObserver = new ResizeObserver(() => resize());
        resizeObserver.observe(root);
        window.addEventListener("resize", resize, { passive: true });

        scrollTrigger = ScrollTrigger.create({
          id: "mk-branda-spatial-works",
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          invalidateOnRefresh: true,
          onEnter() {
            active = true;
            requestRender();
          },
          onEnterBack() {
            active = true;
            requestRender();
          },
          onLeave() {
            active = false;
            if (rafId != null) cancelAnimationFrame(rafId);
            rafId = null;
          },
          onLeaveBack() {
            active = false;
            if (rafId != null) cancelAnimationFrame(rafId);
            rafId = null;
          },
          onUpdate(self) {
            targetProgress = self.progress;
            active = isVisibleInViewport(section);
            requestRender();
          },
          onRefresh(self) {
            targetProgress = self.progress;
            progress = self.progress;
            active = isVisibleInViewport(section);
            requestRender();
          }
        });

        resize();
        active = isVisibleInViewport(section);
        requestRender();
      } catch (error) {
        console.error(
          "[MotionKit branda-spatial-works] Unable to initialize spatial Works experiment.",
          error
        );
        sourceItems.forEach((item) =>
          item.removeAttribute("data-branda-spatial-source-hidden")
        );
        renderer?.domElement?.remove();
        titleHost.remove();
      }
    })();

    return () => {
      destroyed = true;

      if (rafId != null) cancelAnimationFrame(rafId);
      rafId = null;

      scrollTrigger?.kill?.();
      resizeObserver?.disconnect?.();
      window.removeEventListener("resize", resize);
      renderer?.domElement?.removeEventListener("pointerup", onPointerUp);
      gsap.killTweensOf(titleItems);

      slides.forEach((slide) => {
        slide.video?.pause?.();
        slide.texture?.dispose?.();
        slide.material?.dispose?.();
        slide.geometry?.dispose?.();
        scene.remove(slide.mesh);
      });

      renderer?.dispose?.();
      renderer?.domElement?.remove();
      titleHost.remove();

      sourceItems.forEach((item) =>
        item.removeAttribute("data-branda-spatial-source-hidden")
      );

      section.style.removeProperty("--branda-spatial-height");
      section.style.removeProperty("--branda-spatial-height-mobile");
    };
  }
};
