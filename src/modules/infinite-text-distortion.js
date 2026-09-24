// Adapted from Jorge Toloza's "Infinite Scrolling Text Organic Distortion" demo.
// Original source: https://github.com/JorgeCapillo/infinite-scrolling-text-distortion
// Copyright (c) 2024 Jorge Toloza. MIT License.

import {
  readNumber,
  readString,
  selectTarget
} from "../core/config.js";

const DEFAULTS = Object.freeze({
  autoSpeed: 0.5,
  ease: 0.05,
  speedEase: 0.05,
  wheelStrength: 0.254,
  touchStrength: 1,
  distortion: 15,
  velocityDistortion: 5,
  phaseSpeed: 0.0007,
  minCycles: 2
});

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function sanitizeClone(clone) {
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("data-motion-distortion-clone", "");
  clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  clone
    .querySelectorAll("a, button, input, select, textarea, [tabindex]")
    .forEach((node) => node.setAttribute("tabindex", "-1"));
}

function directItems(track) {
  const children = [...track.children].filter(
    (node) => !node.hasAttribute("data-motion-distortion-clone")
  );
  const explicit = children.filter(
    (node) => node.getAttribute("data-motion-target") === "distortion-item"
  );
  return explicit.length ? explicit : children;
}

function restoreStyle(node, value) {
  if (!node) return;
  if (value == null) node.removeAttribute("style");
  else node.setAttribute("style", value);
}

export const infiniteTextDistortion = {
  name: "infinite-text-distortion",
  category: "composition",
  selector: '[data-motion~="infinite-text-distortion"]',

  mount(root, { gsap, SplitText, reducedMotion, logger }) {
    if (reducedMotion() || !SplitText) return;

    const track = selectTarget(root, "distortion-track", root.firstElementChild);
    if (!track) {
      logger?.warn?.(
        "[MotionKit] infinite-text-distortion requires a distortion-track target."
      );
      return;
    }

    const sourceItems = directItems(track);
    if (!sourceItems.length) {
      logger?.warn?.(
        "[MotionKit] infinite-text-distortion requires at least one track item."
      );
      return;
    }

    const sourceStyles = new Map(
      sourceItems.map((item) => [item, item.getAttribute("style")])
    );
    const rootStyle = root.getAttribute("style");
    const trackStyle = track.getAttribute("style");

    const direction = readString(root, "motion-direction", "up").toLowerCase();
    const movementSign = direction === "down" || direction === "reverse" ? 1 : -1;
    const waveName = readString(
      root,
      "motion-wave",
      movementSign > 0 ? "cos" : "sin"
    ).toLowerCase();
    const wave = waveName === "cos" ? Math.cos : Math.sin;

    const autoSpeed = Math.abs(
      readNumber(root, "motion-auto-speed", DEFAULTS.autoSpeed)
    );
    const ease = clamp(
      readNumber(root, "motion-ease-factor", DEFAULTS.ease),
      0.001,
      1
    );
    const speedEase = clamp(
      readNumber(root, "motion-speed-ease", DEFAULTS.speedEase),
      0.001,
      1
    );
    const wheelStrength = readNumber(
      root,
      "motion-wheel-strength",
      DEFAULTS.wheelStrength
    );
    const touchStrength = readNumber(
      root,
      "motion-touch-strength",
      DEFAULTS.touchStrength
    );
    const distortion = readNumber(
      root,
      "motion-distortion",
      DEFAULTS.distortion
    );
    const velocityDistortion = readNumber(
      root,
      "motion-velocity-distortion",
      DEFAULTS.velocityDistortion
    );
    const phaseSpeed = readNumber(
      root,
      "motion-phase-speed",
      DEFAULTS.phaseSpeed
    );
    const minCycles = Math.max(
      2,
      Math.round(readNumber(root, "motion-min-cycles", DEFAULTS.minCycles))
    );

    let items = [];
    let clones = [];
    let splits = [];
    let totalHeight = 0;
    let rootHeight = 0;
    let frame = 0;
    let rebuildFrame = 0;
    let active = true;
    let destroyed = false;
    let touchY = null;

    const scroll = {
      current: 0,
      target: 0,
      last: 0
    };
    const speed = {
      current: 0,
      target: autoSpeed
    };

    gsap.set(root, {
      overflow: "hidden"
    });

    function clearGenerated() {
      splits.forEach((split) => split.revert?.());
      splits = [];
      clones.forEach((clone) => clone.remove());
      clones = [];
      sourceStyles.forEach((style, item) => restoreStyle(item, style));
    }

    function ensureCopies() {
      const cycleHeight = Math.max(1, track.scrollHeight);
      const requiredHeight = Math.max(rootHeight * minCycles, cycleHeight);
      const copies = Math.min(
        24,
        Math.max(0, Math.ceil(requiredHeight / cycleHeight) - 1)
      );

      for (let copy = 0; copy < copies; copy += 1) {
        sourceItems.forEach((source) => {
          const clone = source.cloneNode(true);
          sanitizeClone(clone);
          track.appendChild(clone);
          clones.push(clone);
        });
      }
    }

    function splitAndMeasure() {
      const allItems = [
        ...sourceItems,
        ...clones
      ];

      items = allItems.map((item) => {
        const split = new SplitText(item, {
          type: "lines",
          linesClass: "mk-infinite-distortion-line"
        });
        splits.push(split);

        const itemBounds = item.getBoundingClientRect();
        const lines = (split.lines || []).map((line) => {
          const bounds = line.getBoundingClientRect();
          line.setAttribute("data-mk-infinite-distortion-line", "");
          gsap.set(line, {
            display: "block",
            willChange: "transform"
          });
          return {
            el: line,
            top: bounds.top - itemBounds.top
          };
        });

        gsap.set(item, {
          willChange: "transform"
        });

        return {
          el: item,
          top: item.offsetTop,
          height: Math.max(1, item.offsetHeight || itemBounds.height),
          extra: 0,
          lines
        };
      });

      totalHeight = Math.max(
        1,
        track.scrollHeight,
        ...items.map((item) => item.top + item.height)
      );
    }

    function updateElements(time = 0) {
      if (!items.length || !rootHeight || !totalHeight) return;

      const delta = scroll.target - scroll.current;
      const amplitude = distortion + velocityDistortion * (delta / 100);
      const phase = time * phaseSpeed;

      items.forEach((item) => {
        let y = movementSign * scroll.current + item.extra;
        let top = item.top + y;

        if (movementSign < 0) {
          let guard = 0;
          while (top + item.height < 0 && guard < 8) {
            item.extra += totalHeight;
            y += totalHeight;
            top += totalHeight;
            guard += 1;
          }
        } else {
          let guard = 0;
          while (top > rootHeight && guard < 8) {
            item.extra -= totalHeight;
            y -= totalHeight;
            top -= totalHeight;
            guard += 1;
          }
        }

        item.lines.forEach((line) => {
          const lineY = item.top + y + line.top;
          const progress = clamp(lineY / rootHeight, 0, 1);
          const x = wave(progress * Math.PI + phase) * amplitude;
          line.el.style.transform = `translate3d(${x}px,0,0)`;
        });

        item.el.style.transform = `translate3d(0,${y}px,0)`;
      });
    }

    function rebuild() {
      if (destroyed) return;

      clearGenerated();
      rootHeight = Math.max(1, root.clientHeight || root.getBoundingClientRect().height);
      scroll.current = 0;
      scroll.target = 0;
      scroll.last = 0;
      speed.current = 0;
      speed.target = autoSpeed;

      ensureCopies();
      splitAndMeasure();
      updateElements(0);
    }

    function scheduleRebuild() {
      if (destroyed) return;
      cancelAnimationFrame(rebuildFrame);
      rebuildFrame = requestAnimationFrame(rebuild);
    }

    function render(time) {
      if (destroyed) return;

      if (active) {
        speed.current += (speed.target - speed.current) * speedEase;
        scroll.target += speed.current;
        scroll.current += (scroll.target - scroll.current) * ease;

        if (scroll.current > scroll.last) speed.target = autoSpeed;
        else if (scroll.current < scroll.last) speed.target = -autoSpeed;

        updateElements(time);
        scroll.last = scroll.current;
      }

      frame = requestAnimationFrame(render);
    }

    function onWheel(event) {
      if (!active) return;
      const delta =
        Number.isFinite(event.deltaY) && event.deltaY !== 0
          ? event.deltaY
          : -(event.wheelDeltaY || 0);
      scroll.target += delta * wheelStrength;
    }

    function onTouchStart(event) {
      if (!active) return;
      touchY = event.touches?.[0]?.clientY ?? null;
    }

    function onTouchMove(event) {
      if (!active || touchY == null) return;
      const y = event.touches?.[0]?.clientY;
      if (!Number.isFinite(y)) return;
      scroll.target += (touchY - y) * touchStrength;
      touchY = y;
    }

    function onTouchEnd() {
      touchY = null;
    }

    const intersection = window.IntersectionObserver
      ? new IntersectionObserver(([entry]) => {
          active = entry?.isIntersecting ?? true;
        })
      : null;

    const resizeObserver = window.ResizeObserver
      ? new ResizeObserver(scheduleRebuild)
      : null;

    intersection?.observe(root);
    resizeObserver?.observe(root);
    resizeObserver?.observe(track);

    window.addEventListener("wheel", onWheel, { passive: true });
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: true });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    root.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("resize", scheduleRebuild);

    rebuild();
    frame = requestAnimationFrame(render);

    root.ownerDocument.fonts?.ready?.then(() => {
      if (!destroyed) scheduleRebuild();
    });

    return () => {
      destroyed = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(rebuildFrame);
      intersection?.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", scheduleRebuild);
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", onTouchEnd);
      root.removeEventListener("touchcancel", onTouchEnd);
      clearGenerated();
      restoreStyle(track, trackStyle);
      restoreStyle(root, rootStyle);
    };
  }
};
