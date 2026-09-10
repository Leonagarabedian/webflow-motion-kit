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

function areAdjacent(a, b, cols) {
  const ax = a % cols;
  const ay = Math.floor(a / cols);
  const bx = b % cols;
  const by = Math.floor(b / cols);
  return Math.abs(ax - bx) <= 1 && Math.abs(ay - by) <= 1;
}

function pickScatteredIndices({
  centerCol,
  centerRow,
  cols,
  rows,
  radius,
  count,
  blocked
}) {
  const r = Math.max(0, Math.round(radius));
  const candidates = [];

  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      const col = centerCol + dx;
      const row = centerRow + dy;
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
      const index = row * cols + col;
      if (blocked.includes(index)) continue;
      if (blocked.some((other) => areAdjacent(index, other, cols))) continue;
      candidates.push(index);
    }
  }

  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const chosen = [];
  for (const index of candidates) {
    if (chosen.some((other) => areAdjacent(index, other, cols))) continue;
    chosen.push(index);
    if (chosen.length >= count) break;
  }

  return chosen;
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
    const scatterRadius = Math.max(0, readNumber(element, "grid-scatter-radius", 2.5));
    const maxActive = Math.max(1, Math.round(readNumber(element, "grid-max-active", 5)));
    const spawnCount = Math.max(1, Math.round(readNumber(element, "grid-spawn-count", 2)));
    const switchDelay = Math.max(0, readNumber(element, "grid-switch-delay", 0.04));
    const minMove = Math.max(0, readNumber(element, "grid-min-move", 14));
    const directionLead = Math.max(0, readNumber(element, "grid-direction-lead", 1.1));
    const openDuration = Math.max(0, readNumber(element, "grid-open", 0.14));
    const closeDuration = Math.max(0, readNumber(element, "grid-close", 0.32));
    const gap = clamp(readNumber(element, "grid-gap", 0.06), 0, 0.48);
    const ease = readString(element, "grid-ease", "power2.out");
    const leaveMode = readString(element, "grid-leave", "close");
    const idleOpacity = clamp(readNumber(element, "grid-idle-opacity", 0), 0, 1);
    const maxOpacity = clamp(readNumber(element, "grid-max-opacity", 1), 0, 1);

    const cellCount = cols * rows;
    const cells = Array.from({ length: cellCount }, () => ({ value: idleOpacity }));
    const tweens = new Set();
    const active = [];
    let destroyed = false;
    let lastMask = "";
    let lastSwitchTime = 0;
    let lastPointer = null;

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

    const closeIndex = (index, immediate = false) => {
      const activePosition = active.indexOf(index);
      if (activePosition >= 0) active.splice(activePosition, 1);
      tweenCell(index, idleOpacity, immediate || reducedMotion() ? 0 : closeDuration);
    };

    const closeAll = (immediate = false) => {
      [...active].forEach((index) => closeIndex(index, immediate));
    };

    const activateIndices = (indices) => {
      const openTime = reducedMotion() ? 0 : openDuration;
      indices.forEach((index) => {
        if (active.includes(index)) return;
        active.push(index);
        tweenCell(index, maxOpacity, openTime);
      });

      while (active.length > maxActive) {
        closeIndex(active[0], false);
      }
    };

    const revealAt = (clientX, clientY, timestamp = performance.now()) => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      if (lastPointer) {
        const movement = Math.hypot(clientX - lastPointer.x, clientY - lastPointer.y);
        if (movement < minMove) return;
      }

      const delayMs = switchDelay * 1000;
      if (timestamp - lastSwitchTime < delayMs) return;

      const nx = clamp((clientX - rect.left) / rect.width, 0, 0.999999);
      const ny = clamp((clientY - rect.top) / rect.height, 0, 0.999999);
      let leadX = 0;
      let leadY = 0;

      if (lastPointer) {
        const dx = clientX - lastPointer.x;
        const dy = clientY - lastPointer.y;
        const length = Math.hypot(dx, dy) || 1;
        leadX = (dx / length) * directionLead;
        leadY = (dy / length) * directionLead;
      }

      const centerCol = clamp(Math.floor(nx * cols + leadX), 0, cols - 1);
      const centerRow = clamp(Math.floor(ny * rows + leadY), 0, rows - 1);
      const next = pickScatteredIndices({
        centerCol,
        centerRow,
        cols,
        rows,
        radius: scatterRadius,
        count: spawnCount,
        blocked: active
      });

      lastPointer = { x: clientX, y: clientY };
      lastSwitchTime = timestamp;
      activateIndices(next);
    };

    const onPointerMove = (event) => revealAt(event.clientX, event.clientY, event.timeStamp || performance.now());
    const onPointerLeave = () => {
      lastPointer = null;
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
