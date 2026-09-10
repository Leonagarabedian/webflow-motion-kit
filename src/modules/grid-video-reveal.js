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

export const gridVideoReveal = {
  name: "grid-video-reveal",
  category: "interaction",
  selector: '[data-motion~="grid-video-reveal"]',

  mount(element, { gsap, reducedMotion, supportsHover }) {
    const media = element.querySelector("[data-grid-video-reveal-media]");
    if (!media) return;

    const cols = Math.max(1, Math.round(readNumber(element, "grid-cols", 12)));
    const rows = Math.max(1, Math.round(readNumber(element, "grid-rows", 7)));
    const radius = Math.max(0.1, readNumber(element, "grid-radius", 2.2));
    const openDuration = Math.max(0, readNumber(element, "grid-open", 0.18));
    const closeDuration = Math.max(0, readNumber(element, "grid-close", 0.5));
    const falloff = Math.max(0.05, readNumber(element, "grid-falloff", 1));
    const gap = clamp(readNumber(element, "grid-gap", 0.03), 0, 0.48);
    const ease = readString(element, "grid-ease", "power2.out");
    const leaveMode = readString(element, "grid-leave", "close");
    const idleOpacity = clamp(readNumber(element, "grid-idle-opacity", 0), 0, 1);
    const maxOpacity = clamp(readNumber(element, "grid-max-opacity", 1), 0, 1);

    const cellCount = cols * rows;
    const cells = Array.from({ length: cellCount }, () => ({ value: idleOpacity }));
    const tweens = new Set();
    let destroyed = false;
    let lastMask = "";

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

    const render = () => {
      if (destroyed) return;
      const mask = encodeMask(cols, rows, cells, gap);
      if (mask === lastMask) return;
      lastMask = mask;
      media.style.maskImage = mask;
      media.style.webkitMaskImage = mask;
    };

    const tweenCell = (cell, value, duration) => {
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

    const closeAll = (immediate = false) => {
      const duration = immediate || reducedMotion() ? 0 : closeDuration;
      cells.forEach((cell) => tweenCell(cell, idleOpacity, duration));
    };

    const revealAt = (clientX, clientY) => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const px = clamp((clientX - rect.left) / rect.width, 0, 0.999999) * cols;
      const py = clamp((clientY - rect.top) / rect.height, 0, 0.999999) * rows;
      const durationOpen = reducedMotion() ? 0 : openDuration;
      const durationClose = reducedMotion() ? 0 : closeDuration;

      cells.forEach((cell, index) => {
        const x = (index % cols) + 0.5;
        const y = Math.floor(index / cols) + 0.5;
        const distance = Math.hypot(x - px, y - py);
        const normalized = clamp(1 - distance / radius, 0, 1);
        const influence = Math.pow(normalized, falloff);
        const target = idleOpacity + (maxOpacity - idleOpacity) * influence;
        const opening = target > cell.value;
        tweenCell(cell, target, opening ? durationOpen : durationClose);
      });
    };

    const onPointerMove = (event) => revealAt(event.clientX, event.clientY);
    const onPointerLeave = () => {
      if (leaveMode === "hold") return;
      closeAll(false);
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
