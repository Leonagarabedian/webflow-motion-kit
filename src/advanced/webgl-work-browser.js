import { ScrollTrigger } from "gsap/all";
import * as THREE from "three";
import "./advanced.css";
import { clamp, number, reducedMotion, string, target } from "./shared/config.js";
import { createAdvancedPackage } from "./shared/runtime.js";

gsap.registerPlugin(ScrollTrigger);

function colorFor(index) {
  return [0x5940ff, 0xbdff00, 0xff5c35, 0x2d9cdb, 0xf2c94c][index % 5];
}

function mount(element) {
  const viewport = target(element, "viewport") || element;
  const items = [...element.querySelectorAll("[data-advanced-work-item]")];
  if (!items.length) return;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("data-advanced-canvas", "");
  canvas.setAttribute("aria-hidden", "true");
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas });
  viewport.prepend(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.z = 7;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(10, 10);
  const spacing = number(element, "advanced-spacing", 3.3);
  const meshes = [];
  const textures = [];
  let activeItems = items.map((_, index) => index);
  let cameraTargetY = 0;
  let raf = 0;
  let visible = true;

  items.forEach((item, index) => {
    const media = item.querySelector("img, video");
    let texture;
    if (media instanceof HTMLVideoElement && media.readyState >= 2) {
      texture = new THREE.VideoTexture(media);
    } else if (media instanceof HTMLImageElement && media.complete && media.naturalWidth) {
      texture = new THREE.Texture(media);
      texture.needsUpdate = true;
    }
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      textures.push(texture);
    }
    const material = new THREE.MeshBasicMaterial({
      color: texture ? 0xffffff : colorFor(index),
      map: texture || null,
      transparent: true
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 2.7, 1, 1), material);
    mesh.position.set(index % 2 ? 0.65 : -0.65, -index * spacing, 0);
    mesh.userData = { index, item };
    scene.add(mesh);
    meshes.push(mesh);
  });

  const layout = () => {
    const width = Math.max(1, viewport.clientWidth);
    const height = Math.max(1, viewport.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const compact = width < 768;
    meshes.forEach((mesh) => {
      mesh.scale.setScalar(compact ? 0.72 : 1);
      mesh.position.x = compact ? 0 : mesh.userData.index % 2 ? 0.65 : -0.65;
    });
  };
  const render = () => {
    raf = 0;
    camera.position.y += (cameraTargetY - camera.position.y) * 0.085;
    renderer.render(scene, camera);
    if (visible && Math.abs(cameraTargetY - camera.position.y) > 0.001) {
      raf = requestAnimationFrame(render);
    }
  };
  const ensureRender = () => {
    if (!raf) raf = requestAnimationFrame(render);
  };
  const setActive = (index) => {
    element.setAttribute("data-advanced-active-index", String(index));
    items.forEach((item, itemIndex) => item.classList.toggle("is-active", itemIndex === index));
  };
  const trigger = ScrollTrigger.create({
    end: string(element, "advanced-end", "bottom bottom"),
    onUpdate: (self) => {
      const max = Math.max(0, activeItems.length - 1);
      const position = self.progress * max;
      cameraTargetY = position * -spacing;
      setActive(activeItems[Math.round(position)] ?? 0);
      ensureRender();
    },
    start: string(element, "advanced-start", "top top"),
    trigger: element
  });

  const filterButtons = [...element.querySelectorAll("[data-advanced-filter]")];
  const filterListeners = filterButtons.map((button) => {
    const listener = () => {
      const filter = button.getAttribute("data-advanced-filter");
      activeItems = [];
      meshes.forEach((mesh) => {
        const category = mesh.userData.item.getAttribute("data-advanced-category") || "all";
        const active = filter === "all" || category === filter;
        mesh.visible = active;
        if (active) activeItems.push(mesh.userData.index);
      });
      activeItems.forEach((itemIndex, order) => {
        meshes[itemIndex].position.y = -order * spacing;
      });
      cameraTargetY = 0;
      camera.position.y = 0;
      filterButtons.forEach((candidate) => {
        candidate.setAttribute("aria-pressed", String(candidate === button));
      });
      setActive(activeItems[0] ?? 0);
      ensureRender();
    };
    button.addEventListener("click", listener);
    return listener;
  });

  const onPointerMove = (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  };
  const onClick = () => {
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(meshes.filter((mesh) => mesh.visible))[0];
    const href = hit?.object.userData.item.getAttribute("data-advanced-href");
    if (href) window.location.assign(href);
  };
  const resizeObserver = new ResizeObserver(() => {
    layout();
    ensureRender();
  });
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) ensureRender();
  });
  canvas.addEventListener("pointermove", onPointerMove, { passive: true });
  canvas.addEventListener("click", onClick);
  resizeObserver.observe(viewport);
  intersectionObserver.observe(element);
  layout();
  renderer.render(scene, camera);
  setActive(0);
  if (reducedMotion()) trigger.disable();

  return () => {
    trigger.kill();
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("click", onClick);
    filterButtons.forEach((button, index) => button.removeEventListener("click", filterListeners[index]));
    if (raf) cancelAnimationFrame(raf);
    textures.forEach((texture) => texture.dispose());
    meshes.forEach((mesh) => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    renderer.dispose();
    canvas.remove();
    items.forEach((item) => item.classList.remove("is-active"));
    element.removeAttribute("data-advanced-active-index");
  };
}

createAdvancedPackage({
  mount,
  name: "webgl-work-browser",
  selector: '[data-advanced="webgl-work-browser"]'
});
