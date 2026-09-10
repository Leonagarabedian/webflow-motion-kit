import { readNumber, readString } from "../core/config.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function encodeMask(cols, rows, cells, gap) {
  const inset = clamp(gap, 0, 0.48);
  const size = 1 - inset * 2;
  const rects = cells
    .map((cell, index) => {
      if (cell.value <= 0.002) return "";
      const x = index % cols;
      const y = Math.floor(index / cols);
      const opacity = clamp(cell.value, 0, 1).toFixed(3);
      return `<rect x="${(x + inset).toFixed(3)}" y="${(y + inset).toFixed(3)}" width="${size.toFixed(3)}" height="${size.toFixed(3)}" fill="white" fill-opacity="${opacity}"/>`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols} ${rows}" preserveAspectRatio="none" shape-rendering="crispEdges">${rects}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function randomNearbyIndex(baseCol, baseRow, cols, rows, scatterRadius, previousIndex) {
  const radius = Math.max(0, Math.round(scatterRadius));
  const candidates = [];

  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const col = baseCol + dx;
      const row = baseRow + dy;
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
      const index = row * cols + col;
      if (index !== previousIndex) candidates.push(index);
    }
  }

  if (!candidates.length) return baseRow * cols + baseCol;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export const gridVideoReveal = {
  name: "grid-video-reveal",
  category: "interaction",
  selector: '[data-motion~="grid-video-reveal"]',

  mount(element, { gsap, reducedMotion, supportsHover }) {
    const media = element.querySelector("[data-grid-video-reveal-media]");
    if (!media) return;

    const cols = Math.max(1, Math.round(readNumber(element, "grid-cols", 12)));
    const rows = Math.max(1, Math.round(readNumber(element, "grid-rows", 7)));
    const scatterRadius = Math.max(0, readNumber(element, "grid-scatter-radius", 1.5));
    const switchDelay = Math.max(0, readNumber(element, "grid-switch-delay", 0.09));
    const openDuration = Math.max(0, readNumber(element, "grid-open", 0.12));
    const closeDuration = Math.max(0, readNumber(element, "grid-close", 0.22));
    const gap = clamp(readNumber(element, "grid-gap", 0.05), 0, 0.48);
    const ease = readString(element, "grid-ease", "power2.out");
    const leaveMode = readString(element, "grid-leave", "close");
    const idleOpacity = clamp(readNumber(element, "grid-idle-opacity", 0), 0, 1);
    const maxOpacity = clamp(readNumber(element, "grid-max-opacity", 1), 0, 1);

    const cellCount = cols * rows;
    const cells = Array.from({ length: cellCount }, () => ({ value: idleOpacity }));
    const tweens = new Set();
    let destroyed = false;
    let lastMask = "";
    let activeIndex = -1;
    let lastBaseIndex = -1;
    let lastSwitchTime = 0;

    const original = {
      maskImage: media.style.maskImage,
      webkitMaskImage: media.style.webkitMaskImage,
      maskSize: media.style.maskSize,
      webkitMaskSize: media.style.webkitMaskSize,
      maskRepeat: media.style.maskRepeat,
      webkitMaskRepeat: media.style.webkitMaskRepeat,
      pointerEvents: media.style.pointerEvents,
      willChange: media.style.willChange
    };

    media.style.pointerEvents = "none";
    media.style.maskSize = "100% 100%";
    media.style.webkitMaskSize = "100% 100%";
    media.style.maskRepeat = "no-repeat";
    media.style.webkitMaskRepeat = "no-repeat";
    media.style.willChange = "mask-image, -webkit-mask-image";

    if (media instanceof HTMLVideoElement) {
      media.muted = true;
      media.loop = true;
      media.playsInline = true;
      media.autoplay = true;
      const play = () => media.play().catch(() => {});
      if (media.readyState >= 2) play();
      else media.addEventListener("canplay", play, { once: true });
    }

    const render = () => {
      if (destroyed) return;
      const mask = encodeMask(cols, rows, cells, gap);
      if (mask === lastMask) return;
      lastMask = mask;
      media.style.maskImage = mask;
      media.style.webkitMaskImage = mask;
    };

    const tweenCell = (index, value, duration) => {
      if (index < 0 || index >= cells.length) return;
      const cell = cells[index];
      gsap.killTweensOf(cell);
      const tween = gsap.to(cell, {
        value,
        duration,
        ease,
        overwrite: "auto",
        onUpdate: render,
        onComplete: () => tweens.delete(tween)
      });
      tweens.add(tween);
    };

    const closeActive = (immediate = false) => {
      if (activeIndex < 0) return;
      const oldIndex = activeIndex;
      activeIndex = -1;
      tweenCell(oldIndex, idleOpacity, immediate || reducedMotion() ? 0 : closeDuration);
    };

    const activateIndex = (nextIndex) => {
      if (nextIndex === activeIndex) return;
      const previous = activeIndex;
      activeIndex = nextIndex;
      const openTime = reducedMotion() ? 0 : openDuration;
      const closeTime = reducedMotion() ? 0 : closeDuration;
      if (previous >= 0) tweenCell(previous, idleOpacity, closeTime);
      tweenCell(nextIndex, maxOpacity, openTime);
    };

    const revealAt = (clientX, clientY, timestamp = performance.now()) => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const col = clamp(Math.floor(((clientX - rect.left) / rect.width) * cols), 0, cols - 1);
      const row = clamp(Math.floor(((clientY - rect.top) / rect.height) * rows), 0, rows - 1);
      const baseIndex = row * cols + col;
      const delayMs = switchDelay * 1000;

      if (baseIndex === lastBaseIndex && timestamp - lastSwitchTime < delayMs) return;
      if (timestamp - lastSwitchTime < delayMs) return;

      const nextIndex = randomNearbyIndex(col, row, cols, rows, scatterRadius, activeIndex);
      lastBaseIndex = baseIndex;
      lastSwitchTime = timestamp;
      activateIndex(nextIndex);
    };

    const onPointerMove = (event) => revealAt(event.clientX, event.clientY, event.timeStamp || performance.now());
    const onPointerLeave = () => {
      lastBaseIndex = -1;
      if (leaveMode === "hold") return;
      closeActive(false);
    };

    render();

    const hoverEnabled = !supportsHover || supportsHover();
    if (hoverEnabled) {
      element.addEventListener("pointermove", onPointerMove, { passive: true });
      element.addEventListener("pointerleave", onPointerLeave);
    }

    return () => {
      destroyed = true;
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerleave", onPointerLeave);
      tweens.forEach((tween) => tween.kill());
      cells.forEach((cell) => gsap.killTweensOf(cell));

      media.style.maskImage = original.maskImage;
      media.style.webkitMaskImage = original.webkitMaskImage;
      media.style.maskSize = original.maskSize;
      media.style.webkitMaskSize = original.webkitMaskSize;
      media.style.maskRepeat = original.maskRepeat;
      media.style.webkitMaskRepeat = original.webkitMaskRepeat;
      media.style.pointerEvents = original.pointerEvents;
      media.style.willChange = original.willChange;
    };
  }
};
