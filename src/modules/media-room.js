import * as THREE from "three";
import { readNumber, readString } from "../core/config.js";

const STYLE_ID = "motion-kit-media-room-styles";

function ensureStyles(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [data-motion~="media-room"] {
      position: relative;
      min-height: var(--mk-media-room-height, 320svh);
      overflow: visible;
    }
    [data-mk-media-room-stage] {
      position: sticky;
      top: 0;
      width: 100%;
      height: 100svh;
      overflow: hidden;
      pointer-events: none;
    }
    [data-mk-media-room-canvas] {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
    }
  `;
  doc.head.appendChild(style);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sourceUrl(media) {
  return media?.currentSrc || media?.src || media?.getAttribute?.("src") || "";
}

function roomPosition(index, spacing) {
  const lane = index % 6;
  const depth = -index * spacing;
  if (lane === 0) return { x: -3.35, y: 0.75, z: depth, rotationY: 0.38, scale: 1.08 };
  if (lane === 1) return { x: 3.45, y: -0.55, z: depth - 0.45, rotationY: -0.38, scale: 1.02 };
  if (lane === 2) return { x: -0.7, y: 1.45, z: depth - 0.9, rotationY: 0.04, scale: 0.9 };
  if (lane === 3) return { x: -3.7, y: -1.2, z: depth - 0.25, rotationY: 0.44, scale: 0.96 };
  if (lane === 4) return { x: 3.65, y: 1.05, z: depth - 0.7, rotationY: -0.44, scale: 1.06 };
  return { x: 0.85, y: -1.35, z: depth - 1.05, rotationY: -0.04, scale: 0.88 };
}

export const mediaRoom = {
  name: "media-room",
  category: "composition",
  selector: '[data-motion~="media-room"]',

  mount(root, { gsap, ScrollTrigger, reducedMotion }) {
    if (reducedMotion()) return;

    const minWidth = readNumber(root, "motion-min-width", 992);
    if (window.innerWidth < minWidth) return;

    const sourceSelector = readString(root, "motion-source", ".about-media-image");
    const sourceMedia = [...document.querySelectorAll(sourceSelector)].filter((media) => sourceUrl(media));
    if (sourceMedia.length < 4) return;

    ensureStyles(root.ownerDocument);

    const originalStyle = root.getAttribute("style");
    const spacing = readNumber(root, "motion-depth-spacing", 2.55);
    const explicitScrollVh = readNumber(root, "motion-scroll-vh", 0);
    const scrollVh = explicitScrollVh > 0
      ? explicitScrollVh
      : clamp(sourceMedia.length * 22, 280, 520);
    root.style.setProperty("--mk-media-room-height", `${scrollVh}svh`);

    const stage = root.ownerDocument.createElement("div");
    stage.setAttribute("data-mk-media-room-stage", "");
    const canvas = root.ownerDocument.createElement("canvas");
    canvas.setAttribute("data-mk-media-room-canvas", "");
    canvas.setAttribute("aria-hidden", "true");
    stage.appendChild(canvas);
    root.appendChild(stage);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas,
      powerPreference: "high-performance"
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 140);
    const startZ = 5.2;
    const finalItemZ = -(sourceMedia.length - 1) * spacing;
    const endZ = finalItemZ + 4.2;
    camera.position.set(0, 0, startZ);

    const meshes = [];
    const textures = [];
    const loader = new THREE.TextureLoader();
    let destroyed = false;
    let raf = null;

    const render = () => {
      if (destroyed) return;
      renderer.render(scene, camera);
    };

    sourceMedia.forEach((media, index) => {
      const url = sourceUrl(media);
      loader.load(
        url,
        (texture) => {
          if (destroyed) {
            texture.dispose();
            return;
          }
          texture.colorSpace = THREE.SRGBColorSpace;
          textures.push(texture);

          const image = texture.image;
          const ratio = image?.width && image?.height ? image.width / image.height : 1.35;
          const layout = roomPosition(index, spacing);
          const baseHeight = layout.x === 0 ? 2.65 : 2.35;
          const height = baseHeight * layout.scale;
          const width = clamp(height * ratio, 1.55, 4.15);
          const geometry = new THREE.PlaneGeometry(width, height, 1, 1);
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(layout.x, layout.y, layout.z);
          mesh.rotation.y = layout.rotationY;
          scene.add(mesh);
          meshes.push(mesh);
          render();
        },
        undefined,
        () => {}
      );
    });

    const resize = () => {
      const rect = stage.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    };

    const progress = { value: 0 };
    const updateCamera = () => {
      const p = progress.value;
      camera.position.z = startZ + (endZ - startZ) * p;
      camera.position.x = Math.sin(p * Math.PI * 3.2) * 0.16;
      camera.position.y = Math.sin(p * Math.PI * 2.1 + 0.6) * 0.1;
      render();
    };

    const tween = gsap.to(progress, {
      value: 1,
      ease: "none",
      onUpdate: updateCamera,
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: "bottom bottom",
        scrub: readNumber(root, "motion-scrub", 0.75),
        invalidateOnRefresh: true
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      if (raf != null) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = null;
        resize();
        ScrollTrigger.refresh?.();
      });
    });
    resizeObserver.observe(stage);
    resize();
    requestAnimationFrame(() => ScrollTrigger.refresh?.());

    return () => {
      destroyed = true;
      if (raf != null) cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      tween.scrollTrigger?.kill();
      tween.kill();
      meshes.forEach((mesh) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
        scene.remove(mesh);
      });
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
      stage.remove();
      if (originalStyle == null) root.removeAttribute("style");
      else root.setAttribute("style", originalStyle);
    };
  }
};
