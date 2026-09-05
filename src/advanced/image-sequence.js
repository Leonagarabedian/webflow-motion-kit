import { gsap, ScrollTrigger } from "gsap/all";
import "./advanced.css";
import { clamp, number, reducedMotion, string, target } from "./shared/config.js";
import { createAdvancedPackage } from "./shared/runtime.js";

gsap.registerPlugin(ScrollTrigger);

export function buildFrameSources(element) {
  const embedded = [...element.querySelectorAll("img[data-advanced-frame]")];
  if (embedded.length) return embedded.map((image) => image.currentSrc || image.src);
  const pattern = string(element, "advanced-src", "");
  const count = Math.max(0, Math.floor(number(element, "advanced-frame-count", 0)));
  const start = Math.floor(number(element, "advanced-frame-start", 0));
  const pad = Math.max(0, Math.floor(number(element, "advanced-frame-pad", 0)));
  return Array.from({ length: count }, (_, index) => {
    const frame = String(start + index).padStart(pad, "0");
    return pattern.replace("{index}", frame);
  });
}

export function coverRect(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return { height, width, x: (targetWidth - width) / 2, y: (targetHeight - height) / 2 };
}

function mount(element) {
  const sticky = target(element, "sticky") || element;
  let canvas = target(element, "canvas");
  let createdCanvas = false;
  if (!(canvas instanceof HTMLCanvasElement)) {
    canvas = document.createElement("canvas");
    canvas.setAttribute("data-advanced-target", "canvas");
    sticky.prepend(canvas);
    createdCanvas = true;
  }
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return () => createdCanvas && canvas.remove();
  const sources = buildFrameSources(element);
  if (!sources.length) return () => createdCanvas && canvas.remove();
  const stages = [...element.querySelectorAll("[data-advanced-sequence-stage]")];
  const frames = [];
  let activeStage = -1;
  let currentIndex = 0;
  let drawWidth = 1;
  let drawHeight = 1;
  const crossOrigin = string(element, "advanced-crossorigin", "anonymous");

  const updateStages = (index) => {
    if (!stages.length) return;
    const next = Math.min(stages.length - 1, Math.floor((index / Math.max(1, sources.length - 1)) * stages.length));
    if (next === activeStage) return;
    activeStage = next;
    stages.forEach((stage, stageIndex) => {
      const active = stageIndex === next;
      stage.classList.toggle("is-active", active);
      stage.setAttribute("aria-hidden", String(!active));
    });
  };
  const nearestLoaded = (index) => {
    if (frames[index]?.complete && frames[index].naturalWidth) return frames[index];
    for (let offset = 1; offset < frames.length; offset += 1) {
      const before = frames[index - offset];
      const after = frames[index + offset];
      if (before?.complete && before.naturalWidth) return before;
      if (after?.complete && after.naturalWidth) return after;
    }
    return null;
  };
  const draw = (index = currentIndex) => {
    currentIndex = clamp(Math.round(index), 0, sources.length - 1);
    const image = nearestLoaded(currentIndex);
    if (!image) return;
    const rect = coverRect(image.naturalWidth, image.naturalHeight, drawWidth, drawHeight);
    context.clearRect(0, 0, drawWidth, drawHeight);
    context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
    updateStages(currentIndex);
  };
  sources.forEach((source, index) => {
    const image = new Image();
    if (crossOrigin !== "none") image.crossOrigin = crossOrigin;
    image.decoding = "async";
    image.onload = () => {
      if (index === 0 || index === currentIndex) draw();
      element.dispatchEvent(
        new CustomEvent("advanced:frame-loaded", { detail: { index, total: sources.length } })
      );
    };
    image.src = source;
    frames.push(image);
  });

  const resize = () => {
    const rect = sticky.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, number(element, "advanced-dpr", 2));
    drawWidth = Math.max(1, Math.round(rect.width * dpr));
    drawHeight = Math.max(1, Math.round(rect.height * dpr));
    canvas.width = drawWidth;
    canvas.height = drawHeight;
    draw();
  };
  const state = { frame: 0 };
  let tween;
  if (!reducedMotion()) {
    tween = gsap.to(state, {
      ease: "none",
      frame: sources.length - 1,
      onUpdate: () => draw(state.frame),
      scrollTrigger: {
        end: string(element, "advanced-end", "bottom bottom"),
        scrub: number(element, "advanced-scrub", 0.5),
        start: string(element, "advanced-start", "top top"),
        trigger: element
      }
    });
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(sticky);
  resize();

  return () => {
    resizeObserver.disconnect();
    tween?.scrollTrigger?.kill();
    tween?.kill();
    frames.forEach((image) => {
      image.onload = null;
      image.src = "";
    });
    stages.forEach((stage) => {
      stage.classList.remove("is-active");
      stage.removeAttribute("aria-hidden");
    });
    if (createdCanvas) canvas.remove();
    else context.clearRect(0, 0, canvas.width, canvas.height);
  };
}

createAdvancedPackage({
  category: "component",
  mount,
  name: "image-sequence",
  selector: '[data-advanced="image-sequence"]'
});
