import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import * as THREE from "three";
import "./advanced.css";
import { number, reducedMotion, restoreStyle, string, target, targets } from "./shared/config.js";
import { createAdvancedPackage } from "./shared/runtime.js";

gsap.registerPlugin(ScrollTrigger, CustomEase);

CustomEase.create("mkCinematicSilk", "0.45,0.05,0.55,0.95");
CustomEase.create("mkCinematicSmooth", "0.25,0.1,0.25,1");
CustomEase.create("mkCinematicFlow", "0.33,0,0.2,1");
CustomEase.create("mkCinematicLinear", "0.4,0,0.6,1");

const fallbackPalette = ["#232323", "#fcd5d7", "#e93223", "#f1f1f1", "#9e88ff", "#d8ff64", "#6ea9ff", "#f4c563"];

function drawCover(context, image, x, y, width, height) {
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;

  if (imageRatio > targetRatio) {
    sourceWidth = image.naturalHeight * targetRatio;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = image.naturalWidth / targetRatio;
    sourceY = (image.naturalHeight - sourceHeight) / 2;
  }

  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function createFallbackAtlas(count, tileSize) {
  const canvas = document.createElement("canvas");
  canvas.width = count * tileSize;
  canvas.height = tileSize;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return canvas;

  for (let index = 0; index < count; index += 1) {
    const x = index * tileSize;
    const base = fallbackPalette[index % fallbackPalette.length];
    const next = fallbackPalette[(index + 2) % fallbackPalette.length];
    const gradient = context.createLinearGradient(x, 0, x + tileSize, tileSize);
    gradient.addColorStop(0, base);
    gradient.addColorStop(1, next);
    context.fillStyle = gradient;
    context.fillRect(x, 0, tileSize, tileSize);
    context.fillStyle = "rgba(255,255,255,0.18)";
    context.beginPath();
    context.arc(x + tileSize * 0.5, tileSize * 0.5, tileSize * 0.22, 0, Math.PI * 2);
    context.fill();
  }
  return canvas;
}

function loadImage(source, crossOrigin) {
  return new Promise((resolve) => {
    const image = new Image();
    if (crossOrigin !== "none") image.crossOrigin = crossOrigin;
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
  });
}

function parseShots(element, defaultZ) {
  const nodes = [...element.querySelectorAll("[data-advanced-cylinder-shot]")];
  if (!nodes.length) {
    return [{ x: 0, y: 0, z: defaultZ, duration: 1, ease: "none" }];
  }

  return nodes.map((node) => ({
    x: number(node, "advanced-camera-x", 0),
    y: number(node, "advanced-camera-y", 0),
    z: number(node, "advanced-camera-z", defaultZ),
    duration: Math.max(0.001, number(node, "advanced-duration", 1)),
    ease: string(node, "advanced-ease", "none")
  }));
}

function makeParticle(radius, height, index, count, segments, span, color) {
  const startAngle = (index / count) * Math.PI * 2;
  const upper = index < count / 2;
  const offset = ((index * 37) % 100) / 100;
  const y = upper ? height * (0.65 + offset * 0.35) : -height * (0.65 + offset * 0.35);
  const positions = new Float32Array((segments + 1) * 3);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    depthTest: true
  });
  const line = new THREE.Line(geometry, material);
  line.userData = {
    angleSpan: span,
    baseAngle: startAngle,
    baseY: y,
    radius,
    segments,
    speed: 0.55 + ((index * 23) % 100) / 100
  };
  return line;
}

function updateParticle(line, velocity) {
  const data = line.userData;
  if (Math.abs(velocity) > 0.00001) data.baseAngle += velocity * data.speed * 1.5;
  const positions = line.geometry.attributes.position.array;

  for (let index = 0; index <= data.segments; index += 1) {
    const t = index / data.segments;
    const angle = data.baseAngle + data.angleSpan * t;
    positions[index * 3] = Math.cos(angle) * data.radius;
    positions[index * 3 + 1] = data.baseY;
    positions[index * 3 + 2] = Math.sin(angle) * data.radius;
  }
  line.geometry.attributes.position.needsUpdate = true;
}

function mount(element) {
  const viewport = target(element, "viewport") || element;
  const chapters = targets(element, "chapter");
  const sourceImages = [...element.querySelectorAll("img[data-advanced-cylinder-image]")];
  const chapterStyles = chapters.map((chapter) => chapter.getAttribute("style"));
  const canvas = document.createElement("canvas");
  canvas.setAttribute("data-advanced-canvas", "");
  canvas.setAttribute("aria-hidden", "true");
  viewport.prepend(canvas);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    canvas,
    powerPreference: "high-performance"
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(new THREE.Color(string(element, "advanced-background", "#000000")), 1);

  const scene = new THREE.Scene();
  const mobile = window.matchMedia("(max-width: 767px)").matches;
  const defaultCameraZ = number(element, "advanced-camera-z", mobile ? 6 : 8);
  const camera = new THREE.PerspectiveCamera(
    number(element, "advanced-fov", mobile ? 50 : 45),
    1,
    0.1,
    100
  );
  const cameraState = {
    x: number(element, "advanced-camera-x", 0),
    y: number(element, "advanced-camera-y", 0),
    z: defaultCameraZ
  };
  camera.position.set(cameraState.x, cameraState.y, cameraState.z);

  const radius = number(element, "advanced-cylinder-radius", mobile ? 1.8 : 2.5);
  const height = number(element, "advanced-cylinder-height", mobile ? 1.2 : 2);
  const radialSegments = Math.max(16, Math.round(number(element, "advanced-radial-segments", 64)));
  const particleCount = Math.max(0, Math.round(number(element, "advanced-particle-count", 12)));
  const particleSegments = Math.max(4, Math.round(number(element, "advanced-particle-segments", 20)));
  const particleSpan = number(element, "advanced-particle-span", 0.3);
  const particleRadius = number(element, "advanced-particle-radius", radius + 0.8);
  const particleColor = new THREE.Color(string(element, "advanced-particle-color", "#ffffff"));
  const rotations = number(element, "advanced-rotations", 4.5);
  const darkness = Math.min(1, Math.max(0, number(element, "advanced-darkness", 0.3)));
  const scrub = number(element, "advanced-scrub", 1);
  const start = string(element, "advanced-start", "top top");
  const end = string(element, "advanced-end", "bottom bottom");
  const crossOrigin = string(element, "advanced-crossorigin", "anonymous");
  const tileSize = Math.max(128, Math.round(number(element, "advanced-atlas-tile-size", 768)));
  const shots = parseShots(element, defaultCameraZ);

  let disposed = false;
  let visible = true;
  let cylinder = null;
  let texture = null;
  let timeline = null;
  let lastRotation = 0;
  let momentum = 0;
  const particleLines = [];
  const chapterTimelines = [];

  const resize = () => {
    const rect = viewport.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const heightPx = Math.max(1, rect.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, number(element, "advanced-dpr", 2)));
    renderer.setSize(width, heightPx, false);
    camera.aspect = width / heightPx;
    camera.updateProjectionMatrix();
  };

  const render = () => {
    if (!visible || disposed) return;
    camera.position.set(cameraState.x, cameraState.y, cameraState.z);
    camera.lookAt(0, 0, 0);

    if (cylinder) {
      const velocity = cylinder.rotation.y - lastRotation;
      lastRotation = cylinder.rotation.y;
      momentum = momentum * 0.92 + velocity * 0.15;
      const speed = Math.abs(velocity) * 100;
      const rotating = Math.abs(velocity) > 0.0001;
      const targetOpacity = rotating ? Math.min(speed * 3, 0.95) : 0;

      particleLines.forEach((line) => {
        line.material.opacity += (targetOpacity - line.material.opacity) * 0.15;
        updateParticle(line, velocity + momentum * 0.04);
      });
    }
    renderer.render(scene, camera);
  };

  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) render();
  });
  const resizeObserver = new ResizeObserver(() => {
    resize();
    render();
  });
  intersectionObserver.observe(element);
  resizeObserver.observe(viewport);
  resize();

  const buildScene = async () => {
    let atlas = null;
    if (sourceImages.length) {
      const maxTexture = Math.min(renderer.capabilities.maxTextureSize, mobile ? 4096 : 8192);
      const count = sourceImages.length;
      const requestedWidth = count * tileSize;
      const scale = Math.min(1, maxTexture / requestedWidth);
      const tileWidth = Math.max(64, Math.floor(tileSize * scale));
      const tileHeight = tileWidth;
      const loaded = await Promise.all(
        sourceImages.map((image) => loadImage(image.currentSrc || image.src, crossOrigin))
      );
      if (disposed) return;

      const valid = loaded.filter(Boolean);
      if (valid.length) {
        atlas = document.createElement("canvas");
        atlas.width = tileWidth * count;
        atlas.height = tileHeight;
        const context = atlas.getContext("2d", { alpha: false });
        if (context) {
          sourceImages.forEach((_, index) => {
            const image = loaded[index];
            const x = index * tileWidth;
            if (image) drawCover(context, image, x, 0, tileWidth, tileHeight);
            else {
              context.fillStyle = fallbackPalette[index % fallbackPalette.length];
              context.fillRect(x, 0, tileWidth, tileHeight);
            }
          });
        }
      }
    }

    if (!atlas) {
      atlas = createFallbackAtlas(
        Math.max(4, Math.round(number(element, "advanced-placeholder-count", 8))),
        Math.min(tileSize, 512)
      );
    }

    texture = new THREE.CanvasTexture(atlas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const geometry = new THREE.CylinderGeometry(radius, radius, height, radialSegments, 1, true);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1 - darkness, 1 - darkness, 1 - darkness),
      map: texture,
      side: THREE.DoubleSide
    });
    cylinder = new THREE.Mesh(geometry, material);
    cylinder.rotation.y = number(element, "advanced-rotation-start", 0.5);
    scene.add(cylinder);
    lastRotation = cylinder.rotation.y;

    for (let index = 0; index < particleCount; index += 1) {
      const line = makeParticle(
        particleRadius,
        height,
        index,
        particleCount,
        particleSegments,
        particleSpan,
        particleColor
      );
      updateParticle(line, 0);
      scene.add(line);
      particleLines.push(line);
    }

    if (!reducedMotion()) {
      timeline = gsap.timeline({
        scrollTrigger: {
          trigger: element,
          start,
          end,
          scrub
        }
      });

      let totalDuration = 0;
      shots.forEach((shot) => {
        timeline.to(cameraState, {
          x: shot.x,
          y: shot.y,
          z: shot.z,
          duration: shot.duration,
          ease: shot.ease
        });
        totalDuration += shot.duration;
      });
      timeline.to(
        cylinder.rotation,
        {
          y: cylinder.rotation.y + rotations * Math.PI * 2,
          duration: totalDuration,
          ease: "none"
        },
        0
      );

      chapters.forEach((chapter, index) => {
        const section = 100 / Math.max(1, chapters.length);
        const chapterStart = number(chapter, "advanced-chapter-start", index * section);
        const chapterEnd = number(chapter, "advanced-chapter-end", (index + 1) * section);
        const chapterTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: element,
            start: `${chapterStart}% top`,
            end: `${chapterEnd}% top`,
            scrub: number(chapter, "advanced-chapter-scrub", 0.8)
          }
        });
        chapterTimeline
          .fromTo(chapter, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "mkCinematicSmooth" })
          .to(chapter, { opacity: 1, duration: 0.6, ease: "none" })
          .to(chapter, { opacity: 0, duration: 0.2, ease: "mkCinematicSmooth" });
        chapterTimelines.push(chapterTimeline);
      });
    } else if (chapters.length) {
      gsap.set(chapters, { opacity: 0 });
      gsap.set(chapters[0], { opacity: 1 });
    }

    render();
  };

  buildScene();
  gsap.ticker.add(render);

  return () => {
    disposed = true;
    gsap.ticker.remove(render);
    timeline?.scrollTrigger?.kill();
    timeline?.kill();
    chapterTimelines.forEach((item) => {
      item.scrollTrigger?.kill();
      item.kill();
    });
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    chapters.forEach((chapter, index) => restoreStyle(chapter, chapterStyles[index]));
    particleLines.forEach((line) => {
      scene.remove(line);
      line.geometry.dispose();
      line.material.dispose();
    });
    if (cylinder) {
      scene.remove(cylinder);
      cylinder.geometry.dispose();
      cylinder.material.dispose();
    }
    texture?.dispose();
    renderer.dispose();
    canvas.remove();
  };
}

createAdvancedPackage({
  category: "composition",
  mount,
  name: "cinematic-cylinder-scroll",
  selector: '[data-advanced="cinematic-cylinder-scroll"]'
});
