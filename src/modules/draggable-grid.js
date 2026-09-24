// Adapted from Joffrey Spitzer / Codrops "Smooth, Draggable Product Grid".
// Original source: https://github.com/joffreysp/draggable-grid
// MIT License.

import {
  readBoolean,
  readNumber,
  readString,
  selectTarget,
  selectTargets
} from "../core/config.js";

const DEFAULTS = Object.freeze({
  wheel: true,
  wheelStrength: 7,
  wheelDuration: 0.3,
  wheelEase: "power3.out",
  edgeResistance: 0.9,
  inertia: true,
  overscanX: 200,
  overscanY: 100,
  intro: true,
  introGridScale: 0.5,
  introItemScale: 0.5,
  introItemDuration: 0.6,
  introStaggerAmount: 1.2,
  introGridDuration: 1.2,
  introEase: "power3.out",
  introGridEase: "power3.inOut",
  observeItems: true,
  itemHiddenScale: 0.5,
  itemHiddenOpacity: 0,
  itemVisibleDuration: 0.5,
  minWidth: 0
});

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function restoreStyle(node, value) {
  if (!node) return;
  if (value == null) node.removeAttribute("style");
  else node.setAttribute("style", value);
}

function axisBounds(viewportSize, contentSize, overscan) {
  if (contentSize <= viewportSize) {
    const centered = (viewportSize - contentSize) / 2;
    return { min: centered, max: centered };
  }

  return {
    min: viewportSize - contentSize - overscan,
    max: overscan
  };
}

export const draggableGrid = {
  name: "draggable-grid",
  category: "composition",
  selector: '[data-motion~="draggable-grid"]',

  mount(root, { gsap, Draggable, reducedMotion, logger }) {
    if (!Draggable) {
      logger?.warn?.("[MotionKit] draggable-grid requires GSAP Draggable.");
      return;
    }

    const minWidth = Math.max(
      0,
      readNumber(root, "motion-min-width", DEFAULTS.minWidth)
    );
    if (window.innerWidth < minWidth) return;

    const grid = selectTarget(root, "drag-grid", root.firstElementChild);
    if (!grid) {
      logger?.warn?.("[MotionKit] draggable-grid requires a drag-grid target.");
      return;
    }

    const items = selectTargets(root, "drag-item");
    if (!items.length) {
      logger?.warn?.("[MotionKit] draggable-grid requires drag-item targets.");
      return;
    }

    const rootStyle = root.getAttribute("style");
    const gridStyle = grid.getAttribute("style");
    const itemStyles = new Map(
      items.map((item) => [item, item.getAttribute("style")])
    );
    const originalRootDragging = root.classList.contains("is-dragging");

    const wheelEnabled = readBoolean(root, "motion-wheel", DEFAULTS.wheel);
    const wheelStrength = readNumber(
      root,
      "motion-wheel-strength",
      DEFAULTS.wheelStrength
    );
    const wheelDuration = Math.max(
      0,
      readNumber(root, "motion-wheel-duration", DEFAULTS.wheelDuration)
    );
    const wheelEase = readString(
      root,
      "motion-wheel-ease",
      DEFAULTS.wheelEase
    );
    const edgeResistance = clamp(
      readNumber(root, "motion-edge-resistance", DEFAULTS.edgeResistance),
      0,
      1
    );
    const inertia = readBoolean(root, "motion-inertia", DEFAULTS.inertia);
    const overscanX = Math.max(
      0,
      readNumber(root, "motion-overscan-x", DEFAULTS.overscanX)
    );
    const overscanY = Math.max(
      0,
      readNumber(root, "motion-overscan-y", DEFAULTS.overscanY)
    );
    const introEnabled = readBoolean(root, "motion-intro", DEFAULTS.intro);
    const observeItems = readBoolean(
      root,
      "motion-observe-items",
      DEFAULTS.observeItems
    );

    const introGridScale = readNumber(
      root,
      "motion-intro-grid-scale",
      DEFAULTS.introGridScale
    );
    const introItemScale = readNumber(
      root,
      "motion-intro-item-scale",
      DEFAULTS.introItemScale
    );
    const introItemDuration = Math.max(
      0,
      readNumber(
        root,
        "motion-intro-item-duration",
        DEFAULTS.introItemDuration
      )
    );
    const introStaggerAmount = Math.max(
      0,
      readNumber(
        root,
        "motion-intro-stagger-amount",
        DEFAULTS.introStaggerAmount
      )
    );
    const introGridDuration = Math.max(
      0,
      readNumber(
        root,
        "motion-intro-grid-duration",
        DEFAULTS.introGridDuration
      )
    );
    const introEase = readString(
      root,
      "motion-intro-ease",
      DEFAULTS.introEase
    );
    const introGridEase = readString(
      root,
      "motion-intro-grid-ease",
      DEFAULTS.introGridEase
    );

    const itemHiddenScale = readNumber(
      root,
      "motion-item-hidden-scale",
      DEFAULTS.itemHiddenScale
    );
    const itemHiddenOpacity = clamp(
      readNumber(
        root,
        "motion-item-hidden-opacity",
        DEFAULTS.itemHiddenOpacity
      ),
      0,
      1
    );
    const itemVisibleDuration = Math.max(
      0,
      readNumber(
        root,
        "motion-item-visible-duration",
        DEFAULTS.itemVisibleDuration
      )
    );

    let bounds = null;
    let draggable = null;
    let introTimeline = null;
    let wheelTween = null;
    let resizeFrame = 0;
    let observer = null;
    let destroyed = false;

    function measureBounds() {
      const rootRect = root.getBoundingClientRect();
      const rootWidth = Math.max(1, root.clientWidth || rootRect.width);
      const rootHeight = Math.max(1, root.clientHeight || rootRect.height);
      const gridRect = grid.getBoundingClientRect();
      const gridWidth = Math.max(1, grid.offsetWidth || grid.scrollWidth || gridRect.width);
      const gridHeight = Math.max(1, grid.offsetHeight || grid.scrollHeight || gridRect.height);

      const x = axisBounds(rootWidth, gridWidth, overscanX);
      const y = axisBounds(rootHeight, gridHeight, overscanY);

      bounds = {
        minX: x.min,
        maxX: x.max,
        minY: y.min,
        maxY: y.max
      };

      return { rootWidth, rootHeight, gridWidth, gridHeight };
    }

    function centerGrid() {
      const metrics = measureBounds();
      const centerX = (metrics.rootWidth - metrics.gridWidth) / 2;
      const centerY = (metrics.rootHeight - metrics.gridHeight) / 2;

      gsap.set(grid, {
        x: clamp(centerX, bounds.minX, bounds.maxX),
        y: clamp(centerY, bounds.minY, bounds.maxY)
      });
    }

    function currentPosition() {
      return {
        x: Number(gsap.getProperty(grid, "x")) || 0,
        y: Number(gsap.getProperty(grid, "y")) || 0
      };
    }

    function applyWheelDelta(event) {
      if (!wheelEnabled || !bounds) return false;

      const deltaX = -(Number(event.deltaX) || 0) * wheelStrength;
      const deltaY = -(Number(event.deltaY) || 0) * wheelStrength;
      const current = currentPosition();

      const nextX = clamp(current.x + deltaX, bounds.minX, bounds.maxX);
      const nextY = clamp(current.y + deltaY, bounds.minY, bounds.maxY);

      const movedX = Math.abs(nextX - current.x) > 0.01;
      const movedY = Math.abs(nextY - current.y) > 0.01;

      if (!movedX && !movedY) return false;

      wheelTween?.kill?.();
      wheelTween = gsap.to(grid, {
        x: nextX,
        y: nextY,
        duration: wheelDuration,
        ease: wheelEase,
        overwrite: true,
        onUpdate: () => draggable?.update?.()
      });

      return true;
    }

    function onWheel(event) {
      if (applyWheelDelta(event)) event.preventDefault();
    }

    function updateBounds() {
      if (destroyed) return;
      measureBounds();

      if (draggable) {
        draggable.applyBounds(bounds);
        draggable.update();
      }

      const current = currentPosition();
      gsap.set(grid, {
        x: clamp(current.x, bounds.minX, bounds.maxX),
        y: clamp(current.y, bounds.minY, bounds.maxY)
      });
    }

    function scheduleBoundsUpdate() {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(updateBounds);
    }

    function setupObserver() {
      if (!observeItems || !window.IntersectionObserver || reducedMotion()) return;

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            gsap.to(entry.target, {
              scale: entry.isIntersecting ? 1 : itemHiddenScale,
              opacity: entry.isIntersecting ? 1 : itemHiddenOpacity,
              duration: itemVisibleDuration,
              ease: entry.isIntersecting ? "power2.out" : "power2.in",
              overwrite: true
            });
          });
        },
        {
          root,
          threshold: 0.1
        }
      );

      items.forEach((item) => observer.observe(item));
    }

    function setupDraggable() {
      const created = Draggable.create(grid, {
        type: "x,y",
        bounds,
        inertia,
        edgeResistance,
        allowEventDefault: true,
        onDragStart: () => {
          root.classList.add("is-dragging");
        },
        onDragEnd: () => {
          root.classList.remove("is-dragging");
        }
      });

      draggable = created?.[0] || null;
    }

    function playIntro() {
      if (!introEnabled || reducedMotion()) {
        gsap.set(grid, { scale: 1 });
        gsap.set(items, { scale: 1, opacity: 1 });
        setupDraggable();
        setupObserver();
        return;
      }

      introTimeline = gsap.timeline({
        onComplete: () => {
          setupDraggable();
          setupObserver();
        }
      });

      introTimeline.set(root, { transformOrigin: "center center" });
      introTimeline.set(grid, { scale: introGridScale, transformOrigin: "center center" });
      introTimeline.set(items, { scale: introItemScale, opacity: 0 });
      introTimeline.to(items, {
        scale: 1,
        opacity: 1,
        duration: introItemDuration,
        ease: introEase,
        stagger: {
          amount: introStaggerAmount,
          from: "random"
        }
      });
      introTimeline.to(grid, {
        scale: 1,
        duration: introGridDuration,
        ease: introGridEase
      });
    }

    gsap.set(root, {
      overflow: "hidden",
      position: window.getComputedStyle(root).position === "static" ? "relative" : undefined
    });

    centerGrid();
    playIntro();

    if (wheelEnabled) {
      root.addEventListener("wheel", onWheel, { passive: false });
    }
    window.addEventListener("resize", scheduleBoundsUpdate, { passive: true });

    const resizeObserver = window.ResizeObserver
      ? new ResizeObserver(scheduleBoundsUpdate)
      : null;
    resizeObserver?.observe(root);
    resizeObserver?.observe(grid);

    return () => {
      destroyed = true;
      cancelAnimationFrame(resizeFrame);
      introTimeline?.kill?.();
      wheelTween?.kill?.();
      observer?.disconnect();
      resizeObserver?.disconnect();
      draggable?.kill?.();
      window.removeEventListener("resize", scheduleBoundsUpdate);
      root.removeEventListener("wheel", onWheel);
      root.classList.toggle("is-dragging", originalRootDragging);
      restoreStyle(grid, gridStyle);
      itemStyles.forEach((style, item) => restoreStyle(item, style));
      restoreStyle(root, rootStyle);
    };
  }
};
