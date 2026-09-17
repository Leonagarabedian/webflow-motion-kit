import { resolveScrollContract, relativeSpan, scrollMode } from "../../core/scroll-alignment/contract.js";
import * as THREE from "three";
import { readNumber, readString } from "../../core/config.js";

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
      position: relative;
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

function mix(a, b, t) {
  return a + (b - a) * t;
}

function mixAngle(a, b, t) {
  let delta = (b - a) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return a + delta * t;
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function sourceUrl(media) {
  return media?.currentSrc || media?.src || media?.getAttribute?.("src") || "";
}

function roomPosition(index, spacing, count) {
  const pattern = [
    { role: "left-wall", x: -3.55, y: 0.8, rotationY: 0.42, scale: 1.08, zOffset: 0 },
    { role: "right-wall", x: 3.55, y: -0.45, rotationY: -0.42, scale: 1.02, zOffset: -0.42 },
    { role: "deep-center", x: -0.55, y: 1.35, rotationY: 0.04, scale: 0.88, zOffset: -0.9 },
    { role: "left-peripheral", x: -4.0, y: -1.15, rotationY: 0.5, scale: 0.96, zOffset: -0.22 },
    { role: "right-peripheral", x: 3.95, y: 1.05, rotationY: -0.5, scale: 1.06, zOffset: -0.68 },
    { role: "deep-center", x: 0.75, y: -1.25, rotationY: -0.04, scale: 0.86, zOffset: -1.02 }
  ];
  const slot = pattern[index % pattern.length];
  const cycle = Math.floor(index / pattern.length);
  const depth = -index * spacing + slot.zOffset - cycle * 0.08;
  const depthRatio = count > 1 ? index / (count - 1) : 0;
  return { ...slot, z: depth, depthRatio };
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

function measureRoom(root, stage, imageCount, spacing, explicitScrollVh) {
  const viewportHeight = Math.max(1, window.innerHeight || stage.getBoundingClientRect().height || 1);
  const viewportWidth = Math.max(1, stage.getBoundingClientRect().width || window.innerWidth || 1);
  const depthUnits = Math.max(spacing * Math.max(1, imageCount - 1), spacing * 3);
  const aspect = viewportWidth / viewportHeight;

  const depthDistance = depthUnits * viewportHeight * (aspect > 1.55 ? 0.48 : 0.56);
  const countDistance = imageCount * viewportHeight * 0.205;
  const minimumDistance = viewportHeight * 2.8;
  const maximumDistance = viewportHeight * 6.4;
  const measuredDistance = clamp(Math.max(depthDistance, countDistance, minimumDistance), minimumDistance, maximumDistance);
  const explicitDistance = explicitScrollVh > 0 ? viewportHeight * (explicitScrollVh / 100) : 0;
  const scrollDistance = explicitDistance || measuredDistance;
  const rootHeight = viewportHeight + scrollDistance;

  root.style.setProperty("--mk-media-room-height", `${rootHeight}px`);

  return {
    viewportHeight,
    viewportWidth,
    aspect,
    depthUnits,
    scrollDistance,
    rootHeight
  };
}

function buildRoomShell(scene, baseColor, depth, cameraStartZ) {
  const shell = [];
  const width = 12.8;
  const height = 8.4;
  const centerZ = (cameraStartZ - depth) / 2;
  const length = Math.abs(depth - cameraStartZ) + 20;

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
    { x: 0, y: 0, z: depth - 8.5 },
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
    const getExplicitScrollVh = () => {
      if (scrollMode(root) === "auto") return 0;
      const pixels = readNumber(root, "motion-scroll-distance", 0);
      return pixels > 0 ? pixels / Math.max(1, window.innerHeight) * 100 : readNumber(root, "motion-scroll-vh", 0);
    };
    const velocityMax = readNumber(root, "motion-velocity-max", 1800);
    const velocityStrength = readNumber(root, "motion-velocity-strength", 0.72);
    const velocitySmoothing = clamp(readNumber(root, "motion-velocity-smoothing", 0.18), 0.04, 0.5);
    const entranceSpan = clamp(readNumber(root, "motion-entrance-span", 0.2), 0.08, 0.32);
    const releaseStart = clamp(readNumber(root, "motion-release-start", 0.82), 0.68, 0.94);
    const passStrength = readNumber(root, "motion-pass-strength", 0.95);
    const orbitStrength = readNumber(root, "motion-orbit-strength", 1.4);
    const orbitRadius = readNumber(root, "motion-orbit-radius", 1.45);
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
    const entranceZ = startZ + 2.7;
    const finalItemZ = -(sourceMedia.length - 1) * spacing;
    const endZ = finalItemZ + 4.0;
    camera.position.set(0, 0, entranceZ);

    const fogNear = readNumber(root, "motion-fog-near", 6.8);
    const fogFar = readNumber(root, "motion-fog-far", 21.5);
    scene.fog = new THREE.Fog(shiftLightness(baseColor, -0.01), fogNear, fogFar);

    const imageRecords = new Array(sourceMedia.length);
    const textures = [];
    const loader = new THREE.TextureLoader();
    const shell = buildRoomShell(scene, baseColor, finalItemZ, startZ);
    let destroyed = false;
    let resizeRaf = null;
    let metrics = measureRoom(root, stage, sourceMedia.length, spacing, getExplicitScrollVh());
    let progressValue = 0;
    let velocityTarget = 0;
    let velocityValue = 0;

    const render = () => {
      if (destroyed) return;
      renderer.render(scene, camera);
    };

    const applyChoreography = () => {
      const p = clamp(progressValue, 0, 1);
      const entrance = smoothstep(0, entranceSpan, p);
      const release = smoothstep(releaseStart, 1, p);
      const travel = smoothstep(0.035, 0.965, p);
      const roomPresence = entrance * (1 - release * 0.78);

      camera.position.z = mix(entranceZ, endZ, travel);
      camera.position.x = Math.sin(travel * Math.PI * 2.45) * 0.12 * roomPresence;
      camera.position.y = Math.sin(travel * Math.PI * 1.7 + 0.5) * 0.072 * roomPresence;
      camera.rotation.y = Math.sin(travel * Math.PI * 2.05) * 0.028 * roomPresence;
      camera.rotation.z = velocityValue * -0.0045;

      const velocityMagnitude = Math.min(1, Math.abs(velocityValue));
      const velocityDirection = Math.sign(velocityValue || 1);

      imageRecords.forEach((record, index) => {
        if (!record) return;
        const { mesh, shadow, layout } = record;
        const side = Math.sign(layout.x || 1);
        const peripheral = clamp((Math.abs(layout.x) - 1.1) / 3.0, 0, 1);
        const wallWeight = layout.role.includes("wall") ? 1 : 0;
        const centerWeight = layout.role === "deep-center" ? 1 : 0;

        const revealStart = 0.025 + layout.depthRatio * 0.12;
        const revealEnd = Math.min(entranceSpan + layout.depthRatio * 0.08, 0.34);
        const localReveal = smoothstep(revealStart, revealEnd, p);

        const cameraDelta = layout.z - camera.position.z;
        const nearWeight = clamp(1 - Math.abs(cameraDelta) / 10.5, 0, 1);
        const passProgress = smoothstep(-8.5, 4.0, cameraDelta);
        const passWindow = Math.pow(Math.sin(passProgress * Math.PI), 2);
        const arcPhase = (passProgress - 0.5) * Math.PI;
        const orbitX = side * Math.cos(arcPhase) * orbitRadius * passWindow * (0.72 + peripheral * 0.62);
        const orbitZ = Math.sin(arcPhase) * orbitRadius * 0.72 * passWindow;

        const entranceSpread = (1 - localReveal) * side * (0.95 + peripheral * 0.95 + centerWeight * 0.25);
        const entranceDepth = (1 - localReveal) * (1.5 + layout.depthRatio * 1.7);
        const entranceLift = (1 - localReveal) * (index % 2 === 0 ? 0.22 : -0.18);

        const releaseSpread = release * side * (1.15 + peripheral * 1.35 + wallWeight * 0.45);
        const releaseLift = release * (layout.y >= 0 ? 0.25 : -0.25) * (0.7 + peripheral * 0.45);
        const releaseDepth = release * (0.35 + layout.depthRatio * 0.95);

        const velocitySpread = side * peripheral * velocityMagnitude * velocityStrength * (0.32 + nearWeight * 0.78);
        const velocityDepthLag = -velocityDirection * velocityMagnitude * velocityStrength * (0.12 + nearWeight * 0.52);
        const velocityLift = velocityDirection * velocityMagnitude * nearWeight * 0.045 * (index % 2 ? 1 : -1);
        const breathing = Math.sin((p * Math.PI * 2.0) + index * 0.66) * 0.018 * roomPresence;

        const targetX = layout.x + entranceSpread + orbitX * passStrength + releaseSpread + velocitySpread;
        const targetY = layout.y + entranceLift + releaseLift + velocityLift + breathing;
        const targetZ = layout.z + entranceDepth + orbitZ + releaseDepth + velocityDepthLag;

        const lookYaw = Math.atan2(camera.position.x - targetX, camera.position.z - targetZ);
        const faceCameraAmount = passWindow * clamp(0.66 + peripheral * 0.28, 0, 0.94);
        const orbitYaw = side * (passProgress - 0.5) * orbitStrength;
        const targetRotationY = mixAngle(layout.rotationY + orbitYaw, lookYaw, faceCameraAmount)
          + velocityValue * side * peripheral * 0.018
          + release * side * peripheral * 0.04;

        const targetScale = (0.86 + localReveal * 0.14)
          * (1 + passWindow * nearWeight * 0.06)
          * (1 + nearWeight * velocityMagnitude * 0.014);
        const targetOpacity = clamp(localReveal * (1 - release * (0.18 + peripheral * 0.22)), 0, 1);

        mesh.position.set(targetX, targetY, targetZ);
        mesh.rotation.y = targetRotationY;
        mesh.scale.setScalar(targetScale);
        mesh.material.opacity = targetOpacity;

        shadow.position.set(targetX + 0.08, targetY - 0.08, targetZ - 0.055);
        shadow.rotation.y = targetRotationY;
        shadow.scale.setScalar(targetScale * (1 + nearWeight * velocityMagnitude * 0.014));
        shadow.material.opacity = targetOpacity * (0.055 + roomPresence * 0.055 + nearWeight * 0.03);
      });

      atmosphere.style.opacity = `${clamp(0.5 + roomPresence * 0.22 - release * 0.08 + velocityMagnitude * 0.02, 0.42, 0.78)}`;
      render();
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
          const layout = roomPosition(index, spacing, sourceMedia.length);
          const baseHeight = layout.role === "deep-center" ? 2.5 : 2.3;
          const height = baseHeight * layout.scale;
          const width = clamp(height * ratio, 1.5, 4.15);

          const shadowGeometry = new THREE.PlaneGeometry(width * 1.055, height * 1.055, 1, 1);
          const shadowMaterial = new THREE.MeshBasicMaterial({
            color: 0x101820,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            depthWrite: false,
            fog: true
          });
          const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
          shadow.position.set(layout.x + 0.08, layout.y - 0.08, layout.z - 0.055);
          shadow.rotation.y = layout.rotationY;
          scene.add(shadow);

          const geometry = new THREE.PlaneGeometry(width, height, 1, 1);
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0,
            fog: true
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(layout.x, layout.y, layout.z);
          mesh.rotation.y = layout.rotationY;
          scene.add(mesh);

          imageRecords[index] = { mesh, shadow, layout };
          applyChoreography();
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
      metrics = measureRoom(root, stage, sourceMedia.length, spacing, getExplicitScrollVh());
      applyChoreography();
    };

    const progress = { value: 0 };
    const tween = gsap.to(progress, {
      value: 1,
      ease: "none",
      paused: false,
      onUpdate: () => {
        progressValue = progress.value;
        applyChoreography();
      },
      scrollTrigger: resolveScrollContract(root, {
        trigger: root,
        start: "top top",
        end: () => `+=${metrics.scrollDistance}`,
        scrub: readNumber(root, "motion-scrub", 0.75),
        pin: stage,
        pinSpacing: false,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          velocityTarget = clamp(self.getVelocity() / Math.max(1, velocityMax), -1, 1);
        },
        onRefreshInit: () => {
          metrics = measureRoom(root, stage, sourceMedia.length, spacing, getExplicitScrollVh());
        },
        onRefresh: () => {
          progressValue = progress.value;
          applyChoreography();
        },
        onLeave: () => {
          velocityTarget = 0;
        },
        onLeaveBack: () => {
          velocityTarget = 0;
        }
      }, () => ({ start: "top top", end: () => relativeSpan(metrics.scrollDistance) }))
    });

    const velocityTick = () => {
      if (destroyed) return;
      const decay = Math.abs(velocityTarget) < 0.02 ? 0.86 : 0.94;
      velocityTarget *= decay;
      const response = Math.abs(velocityTarget) > Math.abs(velocityValue) ? velocitySmoothing * 1.35 : velocitySmoothing * 0.78;
      velocityValue += (velocityTarget - velocityValue) * clamp(response, 0.05, 0.55);
      if (Math.abs(velocityValue) < 0.0007 && Math.abs(velocityTarget) < 0.0007) {
        velocityValue = 0;
        velocityTarget = 0;
      }
      applyChoreography();
    };
    gsap.ticker.add(velocityTick);

    const resizeObserver = new ResizeObserver(() => {
      if (resizeRaf != null) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        resize();
        ScrollTrigger.refresh?.();
      });
    });
    resizeObserver.observe(stage);
    resize();
    requestAnimationFrame(() => ScrollTrigger.refresh?.());

    return () => {
      destroyed = true;
      if (resizeRaf != null) cancelAnimationFrame(resizeRaf);
      resizeObserver.disconnect();
      gsap.ticker.remove(velocityTick);
      tween.scrollTrigger?.kill();
      tween.kill();
      imageRecords.forEach((record) => {
        if (!record) return;
        record.mesh.geometry.dispose();
        record.mesh.material.dispose();
        scene.remove(record.mesh);
        record.shadow.geometry.dispose();
        record.shadow.material.dispose();
        scene.remove(record.shadow);
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
