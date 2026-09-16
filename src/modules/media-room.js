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
      isolation: isolate;
    }
    [data-mk-media-room-canvas] {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
    }
    [data-mk-media-room-atmosphere],
    [data-mk-media-room-grain] {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    [data-mk-media-room-atmosphere] {
      z-index: 2;
      background:
        radial-gradient(ellipse at 50% 46%, rgba(255,255,255,0) 38%, rgba(26,39,58,.055) 73%, rgba(18,29,45,.13) 100%),
        linear-gradient(180deg, rgba(255,255,255,.025) 0%, rgba(255,255,255,0) 28%, rgba(15,25,40,.045) 100%);
      mix-blend-mode: multiply;
      opacity: .72;
    }
    [data-mk-media-room-grain] {
      z-index: 3;
      opacity: var(--mk-media-room-grain, .11);
      mix-blend-mode: soft-light;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.88' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.9'/%3E%3C/svg%3E");
      background-size: 180px 180px;
      animation: mk-media-room-grain .8s steps(2) infinite;
    }
    @keyframes mk-media-room-grain {
      0% { transform: translate3d(0,0,0); }
      25% { transform: translate3d(-1.5%,1%,0); }
      50% { transform: translate3d(1%,-1.5%,0); }
      75% { transform: translate3d(.75%,1.25%,0); }
      100% { transform: translate3d(-1%,.5%,0); }
    }
    @media (prefers-reduced-motion: reduce) {
      [data-mk-media-room-grain] { animation: none; }
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

function parseCssColor(value, fallback = "#c7d5ff") {
  try {
    const color = new THREE.Color(value || fallback);
    if (Number.isFinite(color.r) && Number.isFinite(color.g) && Number.isFinite(color.b)) return color;
  } catch (_) {}
  return new THREE.Color(fallback);
}

function nearestBackgroundColor(element) {
  let node = element;
  while (node && node !== document.documentElement) {
    const value = getComputedStyle(node).backgroundColor;
    if (value && value !== "transparent" && value !== "rgba(0, 0, 0, 0)") return value;
    node = node.parentElement;
  }
  const bodyColor = getComputedStyle(document.body).backgroundColor;
  return bodyColor && bodyColor !== "transparent" ? bodyColor : "#c7d5ff";
}

function shiftLightness(color, amount) {
  const hsl = {};
  color.getHSL(hsl);
  const shifted = new THREE.Color();
  shifted.setHSL(hsl.h, hsl.s, clamp(hsl.l + amount, 0.04, 0.96));
  return shifted;
}

function buildRoomShell(scene, baseColor, depth, cameraStartZ) {
  const shell = [];
  const width = 12.8;
  const height = 8.4;
  const centerZ = (cameraStartZ - depth) / 2;
  const length = Math.abs(depth - cameraStartZ) + 18;

  const backColor = shiftLightness(baseColor, -0.012);
  const sideColor = shiftLightness(baseColor, -0.06);
  const floorColor = shiftLightness(baseColor, -0.105);
  const ceilingColor = shiftLightness(baseColor, -0.042);

  const createPlane = (geometry, color, position, rotation, roughness = 1) => {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness: 0,
      side: THREE.DoubleSide,
      fog: true
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y, position.z);
    mesh.rotation.set(rotation.x, rotation.y, rotation.z);
    scene.add(mesh);
    shell.push(mesh);
    return mesh;
  };

  createPlane(
    new THREE.PlaneGeometry(width, height),
    backColor,
    { x: 0, y: 0, z: depth - 5.5 },
    { x: 0, y: 0, z: 0 }
  );

  createPlane(
    new THREE.PlaneGeometry(length, height),
    sideColor,
    { x: -width * 0.5, y: 0, z: centerZ },
    { x: 0, y: Math.PI / 2, z: 0 }
  );

  createPlane(
    new THREE.PlaneGeometry(length, height),
    sideColor,
    { x: width * 0.5, y: 0, z: centerZ },
    { x: 0, y: -Math.PI / 2, z: 0 }
  );

  createPlane(
    new THREE.PlaneGeometry(width, length),
    floorColor,
    { x: 0, y: -height * 0.5, z: centerZ },
    { x: -Math.PI / 2, y: 0, z: 0 },
    0.96
  );

  createPlane(
    new THREE.PlaneGeometry(width, length),
    ceilingColor,
    { x: 0, y: height * 0.5, z: centerZ },
    { x: Math.PI / 2, y: 0, z: 0 }
  );

  const coveMaterial = new THREE.MeshBasicMaterial({
    color: shiftLightness(baseColor, -0.28),
    transparent: true,
    opacity: 0.105,
    depthWrite: false,
    fog: true
  });
  const coveDepth = length;
  const strips = [
    { x: -width * 0.5 + 0.055, y: -height * 0.5 + 0.055 },
    { x: width * 0.5 - 0.055, y: -height * 0.5 + 0.055 },
    { x: -width * 0.5 + 0.055, y: height * 0.5 - 0.055 },
    { x: width * 0.5 - 0.055, y: height * 0.5 - 0.055 }
  ];
  strips.forEach(({ x, y }) => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, coveDepth), coveMaterial.clone());
    strip.position.set(x, y, centerZ);
    scene.add(strip);
    shell.push(strip);
  });

  return shell;
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
    root.style.setProperty("--mk-media-room-grain", `${readNumber(root, "motion-grain", 0.11)}`);

    const stage = root.ownerDocument.createElement("div");
    stage.setAttribute("data-mk-media-room-stage", "");
    const canvas = root.ownerDocument.createElement("canvas");
    canvas.setAttribute("data-mk-media-room-canvas", "");
    canvas.setAttribute("aria-hidden", "true");
    const atmosphere = root.ownerDocument.createElement("div");
    atmosphere.setAttribute("data-mk-media-room-atmosphere", "");
    const grain = root.ownerDocument.createElement("div");
    grain.setAttribute("data-mk-media-room-grain", "");
    stage.appendChild(canvas);
    stage.appendChild(atmosphere);
    stage.appendChild(grain);
    root.appendChild(stage);

    const renderer = new THREE.WebGLRenderer({
      alpha: false,
      antialias: true,
      canvas,
      powerPreference: "high-performance"
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;

    const scene = new THREE.Scene();
    const configuredRoomColor = readString(root, "motion-room-color", "");
    const baseColor = parseCssColor(configuredRoomColor || nearestBackgroundColor(root));
    scene.background = baseColor.clone();

    const ambient = new THREE.HemisphereLight(
      shiftLightness(baseColor, 0.12),
      shiftLightness(baseColor, -0.24),
      1.6
    );
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
    keyLight.position.set(-3.5, 5.5, 7.5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(shiftLightness(baseColor, 0.08), 0.42);
    fillLight.position.set(5, 1.5, 2);
    scene.add(fillLight);

    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 140);
    const startZ = 5.2;
    const finalItemZ = -(sourceMedia.length - 1) * spacing;
    const endZ = finalItemZ + 4.2;
    camera.position.set(0, 0, startZ);

    const fogNear = readNumber(root, "motion-fog-near", 6.8);
    const fogFar = readNumber(root, "motion-fog-far", 21.5);
    scene.fog = new THREE.Fog(shiftLightness(baseColor, -0.01), fogNear, fogFar);

    const meshes = [];
    const shadows = [];
    const textures = [];
    const loader = new THREE.TextureLoader();
    const shell = buildRoomShell(scene, baseColor, finalItemZ, startZ);
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

          const shadowGeometry = new THREE.PlaneGeometry(width * 1.055, height * 1.055, 1, 1);
          const shadowMaterial = new THREE.MeshBasicMaterial({
            color: 0x101820,
            transparent: true,
            opacity: 0.115,
            side: THREE.DoubleSide,
            depthWrite: false,
            fog: true
          });
          const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
          shadow.position.set(layout.x + 0.08, layout.y - 0.08, layout.z - 0.055);
          shadow.rotation.y = layout.rotationY;
          scene.add(shadow);
          shadows.push(shadow);

          const geometry = new THREE.PlaneGeometry(width, height, 1, 1);
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            fog: true
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
      shadows.forEach((shadow) => {
        shadow.geometry.dispose();
        shadow.material.dispose();
        scene.remove(shadow);
      });
      shell.forEach((mesh) => {
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
