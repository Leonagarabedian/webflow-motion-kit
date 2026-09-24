/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { draggableGridDetail } from "../src/modules/draggable-grid-detail.js";

function createGsap() {
  const set = vi.fn();
  const to = vi.fn((target, vars) => {
    vars.onComplete?.();
    return { kill: vi.fn() };
  });
  const timeline = vi.fn(() => {
    const api = {
      to: vi.fn(() => api),
      kill: vi.fn()
    };
    return api;
  });

  return { set, to, timeline };
}

describe("draggable-grid-detail", () => {
  let root;
  let shell;
  let item;
  let media;
  let panel;
  let thumb;
  let close;
  let detail;

  beforeEach(() => {
    document.body.innerHTML = `
      <section data-motion="draggable-grid draggable-grid-detail">
        <div data-motion-target="detail-grid-shell">
          <div data-motion-target="drag-grid">
            <div data-grid-item="project-1" data-motion-target="drag-item">
              <img data-motion-target="detail-media" alt="">
            </div>
          </div>
        </div>

        <aside data-motion-target="detail-panel">
          <button data-motion-target="detail-close">Close</button>
          <div data-motion-target="detail-thumb"></div>

          <div data-grid-detail="project-1">
            <h2 data-motion-target="detail-title">Project One</h2>
            <p data-motion-target="detail-text">Project description.</p>
          </div>
        </aside>
      </section>
    `;

    root = document.querySelector('[data-motion~="draggable-grid-detail"]');
    shell = root.querySelector('[data-motion-target="detail-grid-shell"]');
    item = root.querySelector('[data-grid-item="project-1"]');
    media = item.querySelector('[data-motion-target="detail-media"]');
    panel = root.querySelector('[data-motion-target="detail-panel"]');
    thumb = root.querySelector('[data-motion-target="detail-thumb"]');
    close = root.querySelector('[data-motion-target="detail-close"]');
    detail = root.querySelector('[data-grid-detail="project-1"]');
  });

  it("Flips the selected media into the detail thumb and opens the panel", () => {
    const gsap = createGsap();
    const Flip = {
      getState: vi.fn(() => ({ state: true })),
      from: vi.fn(() => ({ kill: vi.fn() }))
    };

    class FakeSplitText {
      constructor(element, options) {
        this.chars = options.type.includes("chars") ? [element] : [];
        this.lines = options.type.includes("lines") ? [element] : [];
      }
      revert() {}
    }

    const cleanup = draggableGridDetail.mount(root, {
      gsap,
      Flip,
      SplitText: FakeSplitText,
      reducedMotion: () => false,
      logger: console
    });

    item.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(media.parentElement).toBe(thumb);
    expect(Flip.getState).toHaveBeenCalledWith(media);
    expect(Flip.from).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        absolute: true,
        scale: true,
        duration: 1.2,
        ease: "power3.inOut"
      })
    );

    expect(gsap.to).toHaveBeenCalledWith(
      shell,
      expect.objectContaining({ xPercent: -50 })
    );
    expect(gsap.to).toHaveBeenCalledWith(
      panel,
      expect.objectContaining({ xPercent: 0 })
    );
    expect(detail.getAttribute("aria-hidden")).toBe("false");
    expect(root.classList.contains("is-detail-open")).toBe(true);

    cleanup();
  });

  it("reverses the Flip and restores the exact media to its original item", () => {
    const gsap = createGsap();
    const Flip = {
      getState: vi.fn(() => ({ state: true })),
      from: vi.fn(() => ({ kill: vi.fn() }))
    };

    class FakeSplitText {
      constructor(element, options) {
        this.chars = options.type.includes("chars") ? [element] : [];
        this.lines = options.type.includes("lines") ? [element] : [];
      }
      revert() {}
    }

    const cleanup = draggableGridDetail.mount(root, {
      gsap,
      Flip,
      SplitText: FakeSplitText,
      reducedMotion: () => false,
      logger: console
    });

    item.click();
    close.click();

    expect(media.parentElement).toBe(item);
    expect(Flip.getState).toHaveBeenCalledTimes(2);
    expect(Flip.from).toHaveBeenCalledTimes(2);
    expect(gsap.to).toHaveBeenCalledWith(
      shell,
      expect.objectContaining({
        xPercent: 0,
        delay: 0.3
      })
    );
    expect(gsap.to).toHaveBeenCalledWith(
      panel,
      expect.objectContaining({
        xPercent: 100,
        delay: 0.3
      })
    );
    expect(root.classList.contains("is-detail-open")).toBe(false);

    cleanup();
  });

  it("pairs items and details by key rather than DOM position", () => {
    const second = document.createElement("div");
    second.setAttribute("data-grid-detail", "project-2");
    second.innerHTML = '<h2 data-motion-target="detail-title">Other</h2>';
    panel.appendChild(second);

    const gsap = createGsap();
    const Flip = {
      getState: vi.fn(() => ({})),
      from: vi.fn(() => ({ kill: vi.fn() }))
    };

    const cleanup = draggableGridDetail.mount(root, {
      gsap,
      Flip,
      SplitText: null,
      reducedMotion: () => false,
      logger: console
    });

    item.click();

    expect(detail.getAttribute("aria-hidden")).toBe("false");
    expect(second.getAttribute("aria-hidden")).toBe("true");

    cleanup();
  });

  it("does not open while the drag module reports an active drag", () => {
    root.classList.add("is-dragging");

    const gsap = createGsap();
    const Flip = {
      getState: vi.fn(() => ({})),
      from: vi.fn(() => ({ kill: vi.fn() }))
    };

    const cleanup = draggableGridDetail.mount(root, {
      gsap,
      Flip,
      SplitText: null,
      reducedMotion: () => false,
      logger: console
    });

    item.click();

    expect(Flip.getState).not.toHaveBeenCalled();
    expect(media.parentElement).toBe(item);

    cleanup();
  });
});
