import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import "./advanced.css";
import { boolean, number, reducedMotion, restoreStyle, string, target, targets } from "./shared/config.js";
import { createAdvancedPackage } from "./shared/runtime.js";

gsap.registerPlugin(ScrollTrigger, SplitText);

function parseShots(element) {
  return [...element.querySelectorAll("[data-advanced-scene-shot]")].map((node, index) => ({
    node,
    index,
    start: Math.min(100, Math.max(0, number(node, "advanced-start-progress", 0))),
    end: Math.min(100, Math.max(0, number(node, "advanced-end-progress", 100))),
    camera: {
      x: number(node, "advanced-camera-x", 0),
      y: number(node, "advanced-camera-y", 2),
      z: number(node, "advanced-camera-z", 10)
    },
    target: {
      x: number(node, "advanced-target-x", 0),
      y: number(node, "advanced-target-y", 5),
      z: number(node, "advanced-target-z", 0)
    },
    hideText: boolean(node, "advanced-hide-text", false)
  })).sort((a, b) => a.start - b.start);
}

function disposeObject(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose?.());
    else child.material?.dispose?.();
  });
}

function createPlaceholderArchitecture(color) {
  const group = new THREE.Group();
  const heights = [8, 14, 10, 18, 24, 15, 11, 20, 13];
  heights.forEach((height, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const geometry = new THREE.BoxGeometry(2.4, height, 2.4);
    const material = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.15,
      roughness: 0.72
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set((column - 1) * 4, height / 2, (row - 1) * 4);
    group.add(mesh);
  });
  return group;
}

function mount(element) {
  const viewport = target(element, "viewport") || element;
  const chapters = targets(element, "chapter");
  const progressBar = target(element, "progress-bar");
  const progressText = target(element, "progress-text");
  const chapterStyles = chapters.map((chapter) => chapter.getAttribute("style"));
  const progressBarStyle = progressBar?.getAttribute("style") ?? null;
  const progressTextValue = progressText?.textContent ?? null;
  const shots = parseShots(element);

  const canvas = document.createElement("canvas");
  canvas.setAttribute("data-advanced-canvas", "");
  canvas.setAttribute("aria-hidden", "true");
  viewport.prepend(canvas);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    canvas,
    powerPreference: "high-performance"
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = boolean(element, "advanced-shadows", false);

  const background = new THREE.Color(string(element, "advanced-background", "#0a0a0a"));
  const scene = new THREE.Scene();
  scene.background = background;
  scene.fog = new THREE.Fog(
    new THREE.Color(string(element, "advanced-fog-color", "#0a0a0a")),
    number(element, "advanced-fog-near", 12),
    number(element, "advanced-fog-far", 28)
  );

  const camera = new THREE.PerspectiveCamera(
    number(element, "advanced-fov", 45),
    1,
    number(element, "advanced-near", 0.1),
    number(element, "advanced-far", 1000)
  );
  const firstShot = shots[0];
  const cameraState = {
    x: number(element, "advanced-camera-x", firstShot?.camera.x ?? -20),
    y: number(element, "advanced-camera-y", firstShot?.camera.y ?? 0),
    z: number(element, "advanced-camera-z", firstShot?.camera.z ?? 0)
  };
  const targetState = {
    x: number(element, "advanced-target-x", firstShot?.target.x ?? 0),
    y: number(element, "advanced-target-y", firstShot?.target.y ?? 15),
    z: number(element, "advanced-target-z", firstShot?.target.z ?? 0)
  };

  scene.add(new THREE.AmbientLight(0xffffff, number(element, "advanced-ambient-light", 0.4)));
  const key = new THREE.DirectionalLight(0xffffff, number(element, "advanced-key-light", 1.2));
  key.position.set(10, 20, 10);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, number(element, "advanced-fill-light", 0.6));
  fill.position.set(-10, 10, -10);
  scene.add(fill);
  const accent = new THREE.PointLight(
    new THREE.Color(string(element, "advanced-accent-color", "#00ffff")),
    number(element, "advanced-accent-light", 0.8)
  );
  accent.position.set(0, 50, 20);
  scene.add(accent);

  const placeholder = createPlaceholderArchitecture(
    new THREE.Color(string(element, "advanced-placeholder-color", "#585858"))
  );
  scene.add(placeholder);
  let activeObject = placeholder;
  let loadedModel = null;
  let disposed = false;
  let visible = true;
  let masterTimeline = null;
  const textTimelines = [];
  const splitInstances = [];

  const modelSrc = string(element, "advanced-model-src", "");
  if (modelSrc) {
    const loader = new GLTFLoader();
    loader.load(
      modelSrc,
      (gltf) => {
        if (disposed) {
          disposeObject(gltf.scene);
          return;
        }
        loadedModel = gltf.scene;
        loadedModel.scale.setScalar(number(element, "advanced-model-scale", 1));
        loadedModel.position.set(
          number(element, "advanced-model-x", 0),
          number(element, "advanced-model-y", 0),
          number(element, "advanced-model-z", 0)
        );
        scene.add(loadedModel);
        scene.remove(placeholder);
        disposeObject(placeholder);
        activeObject = loadedModel;
      },
      undefined,
      () => {
        element.dispatchEvent(new CustomEvent("advanced:model-error", { detail: { src: modelSrc } }));
      }
    );
  }

  const resize = () => {
    const rect = viewport.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, number(element, "advanced-dpr", 2)));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const render = () => {
    if (!visible || disposed) return;
    camera.position.set(cameraState.x, cameraState.y, cameraState.z);
    camera.lookAt(targetState.x, targetState.y, targetState.z);
    renderer.render(scene, camera);
  };

  const updateProgress = (progress) => {
    if (progressBar) gsap.set(progressBar, { width: `${progress * 100}%` });
    if (progressText) progressText.textContent = `${String(Math.round(progress * 100)).padStart(3, "0")}%`;
  };

  const setupText = () => {
    if (disposed || reducedMotion()) return;

    chapters.forEach((chapter, index) => {
      const shot = shots[index];
      if (!shot || shot.hideText) {
        gsap.set(chapter, { opacity: 0, pointerEvents: "none" });
        return;
      }

      const title = chapter.querySelector('[data-advanced-target="chapter-title"], h1, h2, h3');
      const subtitle = chapter.querySelector('[data-advanced-target="chapter-subtitle"], p');
      if (!title || !subtitle) return;

      const titleSplit = new SplitText(title, { type: "chars" });
      const subtitleSplit = new SplitText(subtitle, { type: "chars" });
      splitInstances.push(titleSplit, subtitleSplit);
      const chars = [...subtitleSplit.chars, ...titleSplit.chars];
      const textTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: element,
          start: `${shot.start}% top`,
          end: `${shot.end}% top`,
          scrub: number(element, "advanced-text-scrub", 0.5)
        }
      });

      if (index === 0) {
        gsap.set(chars, { x: 0, opacity: 1 });
        textTimeline.to(chars, {
          x: 100,
          opacity: 0,
          duration: 1,
          stagger: -number(element, "advanced-text-stagger", 0.02),
          ease: "power2.in"
        });
      } else {
        const last = index === shots.length - 1;
        textTimeline
          .fromTo(
            chars,
            { x: -100, opacity: 0 },
            {
              x: 0,
              opacity: 1,
              duration: last ? 0.2 : 0.25,
              stagger: -(last ? 0.01 : number(element, "advanced-text-stagger", 0.02)),
              ease: "power2.out"
            }
          )
          .to({}, { duration: last ? 1 : 0.5 })
          .to(chars, {
            x: 100,
            opacity: 0,
            duration: 0.25,
            stagger: -number(element, "advanced-text-stagger", 0.02),
            ease: "power2.in"
          });
      }
      textTimelines.push(textTimeline);
    });
  };

  if (!reducedMotion() && shots.length) {
    masterTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: element,
        start: string(element, "advanced-start", "top top"),
        end: string(element, "advanced-end", "bottom bottom"),
        scrub: number(element, "advanced-scrub", 1),
        onUpdate: (self) => updateProgress(self.progress)
      }
    });

    shots.forEach((shot) => {
      const start = shot.start / 100;
      const duration = Math.max(0.001, (shot.end - shot.start) / 100);
      masterTimeline.to(cameraState, {
        x: shot.camera.x,
        y: shot.camera.y,
        z: shot.camera.z,
        duration,
        ease: "none"
      }, start);
      masterTimeline.to(targetState, {
        x: shot.target.x,
        y: shot.target.y,
        z: shot.target.z,
        duration,
        ease: "none"
      }, start);
    });

    const fontsReady = document.fonts?.ready || Promise.resolve();
    fontsReady.then(setupText);
  } else {
    updateProgress(0);
    chapters.forEach((chapter, index) => gsap.set(chapter, { opacity: index === 0 ? 1 : 0 }));
  }

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
  updateProgress(0);
  gsap.ticker.add(render);

  return () => {
    disposed = true;
    gsap.ticker.remove(render);
    masterTimeline?.scrollTrigger?.kill();
    masterTimeline?.kill();
    textTimelines.forEach((timeline) => {
      timeline.scrollTrigger?.kill();
      timeline.kill();
    });
    splitInstances.forEach((split) => split.revert());
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    chapters.forEach((chapter, index) => restoreStyle(chapter, chapterStyles[index]));
    restoreStyle(progressBar, progressBarStyle);
    if (progressText && progressTextValue != null) progressText.textContent = progressTextValue;
    if (activeObject) {
      scene.remove(activeObject);
      disposeObject(activeObject);
    }
    if (loadedModel && loadedModel !== activeObject) disposeObject(loadedModel);
    renderer.dispose();
    canvas.remove();
  };
}

createAdvancedPackage({
  category: "composition",
  mount,
  name: "cinematic-3d-camera-story",
  selector: '[data-advanced="cinematic-3d-camera-story"]'
});
