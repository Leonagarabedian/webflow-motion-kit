/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { draggableGrid } from "../src/modules/draggable-grid.js";

function createGsap() {
  const positions = new WeakMap();
  const timelines = [];
  const tweens = [];

  const set = vi.fn((target, vars) => {
    const targets = Array.isArray(target) ? target : [target];
    targets.forEach((node) => {
      if (!node) return;
      const current = positions.get(node) || {};
      positions.set(node, { ...current, ...vars });
      if (vars.opacity != null) node.style.opacity = String(vars.opacity);
      if (vars.scale != null) node.dataset.testScale = String(vars.scale);
    });
  });

  const to = vi.fn((target, vars) => {
    const targets = Array.isArray(target) ? target : [target];
    targets.forEach((node) => {
      if (!node) return;
      const current = positions.get(node) || {};
      const next = { ...current };
      if (vars.x != null) next.x = vars.x;
      if (vars.y != null) next.y = vars.y;
      if (vars.scale != null) next.scale = vars.scale;
      if (vars.opacity != null) next.opacity = vars.opacity;
      positions.set(node, next);
      if (vars.opacity != null) node.style.opacity = String(vars.opacity);
      if (vars.scale != null) node.dataset.testScale = String(vars.scale);
    });
    vars.onUpdate?.();
    const tween = { kill: vi.fn() };
    tweens.push({ target, vars, tween });
    return tween;
  });

  const timeline = vi.fn((config = {}) => {
    const steps = [];
    const api = {
      set: vi.fn((target, vars) => {
        set(target, vars);
        steps.push({ type: "set", target, vars });
        return api;
      }),
      to: vi.fn((target, vars) => {
        to(target, vars);
        steps.push({ type: "to", target, vars });
        return api;
      }),
      kill: vi.fn()
    };
    timelines.push({ config, steps, api });
    return api;
  });

  return {
    gsap: {
      set,
      to,
      timeline,
      getProperty: vi.fn((node, prop) => positions.get(node)?.[prop] ?? 0)
    },
    positions,
    timelines,
    tweens
  };
}

describe("draggable-grid", () => {
  let root;
  let grid;
  let items;
  let draggableInstance;
  let Draggable;

  beforeEach(() => {
    document.body.innerHTML = `
      <section data-motion="draggable-grid"
               data-motion-intro="false"
               data-motion-observe-items="false">
        <div data-motion-target="drag-grid">
          <div data-motion-target="drag-column">
            <div data-motion-target="drag-item"></div>
            <div data-motion-target="drag-item"></div>
          </div>
          <div data-motion-target="drag-column">
            <div data-motion-target="drag-item"></div>
            <div data-motion-target="drag-item"></div>
          </div>
        </div>
      </section>
    `;

    root = document.querySelector('[data-motion="draggable-grid"]');
    grid = root.querySelector('[data-motion-target="drag-grid"]');
    items = [...root.querySelectorAll('[data-motion-target="drag-item"]')];

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1200
    });
    Object.defineProperty(window, "ResizeObserver", {
      configurable: true,
      value: undefined
    });
    Object.defineProperty(window, "IntersectionObserver", {
      configurable: true,
      value: undefined
    });

    Object.defineProperty(root, "clientWidth", { configurable: true, value: 800 });
    Object.defineProperty(root, "clientHeight", { configurable: true, value: 600 });
    root.getBoundingClientRect = () => ({
      top: 0,
      left: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600
    });

    Object.defineProperty(grid, "offsetWidth", { configurable: true, value: 1600 });
    Object.defineProperty(grid, "offsetHeight", { configurable: true, value: 1200 });
    grid.getBoundingClientRect = () => ({
      top: 0,
      left: 0,
      right: 1600,
      bottom: 1200,
      width: 1600,
      height: 1200
    });

    draggableInstance = {
      applyBounds: vi.fn(),
      update: vi.fn(),
      kill: vi.fn()
    };

    Draggable = {
      create: vi.fn(() => [draggableInstance])
    };

    vi.stubGlobal("requestAnimationFrame", vi.fn((callback) => {
      callback();
      return 1;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("centers the oversized grid and creates an x/y draggable with inertia", () => {
    const fake = createGsap();

    const cleanup = draggableGrid.mount(root, {
      gsap: fake.gsap,
      Draggable,
      reducedMotion: () => false,
      logger: console
    });

    expect(fake.gsap.set).toHaveBeenCalledWith(
      grid,
      expect.objectContaining({
        x: -400,
        y: -300
      })
    );

    expect(Draggable.create).toHaveBeenCalledWith(
      grid,
      expect.objectContaining({
        type: "x,y",
        inertia: true,
        edgeResistance: 0.9,
        bounds: {
          minX: -1000,
          maxX: 200,
          minY: -700,
          maxY: 100
        }
      })
    );

    cleanup();
    expect(draggableInstance.kill).toHaveBeenCalled();
  });

  it("moves the grid with wheel input and only prevents page scroll when movement is possible", () => {
    const fake = createGsap();

    const cleanup = draggableGrid.mount(root, {
      gsap: fake.gsap,
      Draggable,
      reducedMotion: () => false,
      logger: console
    });

    const wheel = new WheelEvent("wheel", {
      deltaY: 20,
      bubbles: true,
      cancelable: true
    });

    root.dispatchEvent(wheel);

    expect(wheel.defaultPrevented).toBe(true);
    expect(fake.gsap.to).toHaveBeenCalledWith(
      grid,
      expect.objectContaining({
        y: -440,
        duration: 0.3,
        ease: "power3.out"
      })
    );

    fake.gsap.set(grid, { x: -400, y: -700 });

    const boundaryWheel = new WheelEvent("wheel", {
      deltaY: 20,
      bubbles: true,
      cancelable: true
    });
    root.dispatchEvent(boundaryWheel);

    expect(boundaryWheel.defaultPrevented).toBe(false);

    cleanup();
  });

  it("recalculates bounds on resize and reapplies them to Draggable", () => {
    const fake = createGsap();

    const cleanup = draggableGrid.mount(root, {
      gsap: fake.gsap,
      Draggable,
      reducedMotion: () => false,
      logger: console
    });

    window.dispatchEvent(new Event("resize"));

    expect(draggableInstance.applyBounds).toHaveBeenCalledWith({
      minX: -1000,
      maxX: 200,
      minY: -700,
      maxY: 100
    });
    expect(draggableInstance.update).toHaveBeenCalled();

    cleanup();
  });

  it("keeps authored content static when reduced motion is requested", () => {
    const fake = createGsap();

    const cleanup = draggableGrid.mount(root, {
      gsap: fake.gsap,
      Draggable,
      reducedMotion: () => true,
      logger: console
    });

    expect(Draggable.create).toHaveBeenCalled();
    expect(fake.gsap.set).toHaveBeenCalledWith(items, {
      scale: 1,
      opacity: 1
    });

    cleanup();
  });
});
