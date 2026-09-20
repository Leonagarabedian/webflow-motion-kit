import { readBoolean, readNumber, readString } from "../../core/config.js";

const lerp = (from, to, progress) => from + (to - from) * progress;
const clamp = (value) => Math.max(0, Math.min(1, value));

function restoreStyle(element, value) {
  if (value == null) element.removeAttribute("style");
  else element.setAttribute("style", value);
}

/**
 * The Created panel and portrait keep their authored grid parent. The grid is
 * the stationary clipping frame; only the children move.
 */
export function mountCreatedTakeover(root, { gsap, ScrollTrigger }) {
  if (!root || readBoolean(root, "motion-reparent", false)) return () => {};

  const frame = root.querySelector('[data-motion-target="takeover-bounds"]');
  const panel = root.querySelector('[data-motion-target="takeover-field"]');
  const portrait = root.querySelector('[data-motion-target="takeover-boundary"]');
  const portraitMode = readString(root, "motion-portrait-mode", "slide-away");

  if (
    !frame || !panel || !portrait ||
    panel.parentElement !== frame ||
    portrait.parentElement !== frame ||
    portraitMode !== "slide-away"
  ) return () => {};

  const minWidth = readNumber(root, "motion-min-width", 992);
  const mm = gsap.matchMedia();

  mm.add(
    "(min-width: " + minWidth + "px) and (prefers-reduced-motion: no-preference)",
    () => {
      const originals = new Map(
        [frame, panel, portrait].map((element) => [element, element.getAttribute("style")])
      );
      const restore = (element) => restoreStyle(element, originals.get(element));
      const spacer = root.ownerDocument.createElement("div");
      spacer.setAttribute("aria-hidden", "true");
      spacer.dataset.createdPlaceholder = "";
      frame.insertBefore(spacer, panel);

      const progress = { panel: 0, portrait: 0 };
      let geometry = null;
      let disposed = false;
      let refreshFrame = 0;

      function render() {
        if (!geometry) return;
        const panelProgress = clamp(progress.panel);
        const portraitProgress = clamp(progress.portrait);
        const { start, end, portraitTravel } = geometry;

        gsap.set(panel, {
          left: lerp(start.left, end.left, panelProgress),
          top: lerp(start.top, end.top, panelProgress),
          width: lerp(start.width, end.width, panelProgress),
          height: lerp(start.height, end.height, panelProgress)
        });
        gsap.set(portrait, { x: portraitTravel * portraitProgress });
      }

      function measure() {
        // Return both children to authored layout before taking new rectangles.
        spacer.style.display = "none";
        [frame, panel, portrait].forEach(restore);

        const frameRect = frame.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        const portraitRect = portrait.getBoundingClientRect();
        const frameStyle = window.getComputedStyle(frame);
        const paddingLeft = parseFloat(frameStyle.paddingLeft) || 0;
        const paddingTop = parseFloat(frameStyle.paddingTop) || 0;
        const paddingRight = parseFloat(frameStyle.paddingRight) || 0;
        const paddingBottom = parseFloat(frameStyle.paddingBottom) || 0;
        const start = {
          left: panelRect.left - frameRect.left - frame.clientLeft,
          top: panelRect.top - frameRect.top - frame.clientTop,
          width: panelRect.width,
          height: panelRect.height
        };
        const end = {
          left: paddingLeft,
          top: paddingTop,
          width: Math.max(1, frame.clientWidth - paddingLeft - paddingRight),
          height: Math.max(1, frame.clientHeight - paddingTop - paddingBottom)
        };
        const portraitLeft = portraitRect.left - frameRect.left - frame.clientLeft;
        const portraitTravel = Math.max(0, frame.clientWidth - portraitLeft);

        geometry = { start, end, portraitTravel };

        Object.assign(spacer.style, {
          display: "block",
          gridColumn: "1",
          gridRow: "1",
          height: start.height + "px",
          minWidth: "0",
          pointerEvents: "none",
          visibility: "hidden"
        });
        gsap.set(frame, { position: "relative", overflow: "hidden", isolation: "isolate" });
        gsap.set(panel, {
          position: "absolute",
          boxSizing: "border-box",
          minHeight: 0,
          maxWidth: "none",
          margin: 0,
          zIndex: 1
        });
        gsap.set(portrait, {
          position: "relative",
          gridColumn: "2",
          gridRow: "1",
          zIndex: 2
        });
        render();
      }

      measure();
      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        onUpdate: render,
        scrollTrigger: {
          id: "branda-created-bounded",
          trigger: root,
          start: readString(root, "motion-start", "top 90%"),
          end: readString(root, "motion-end", "bottom 75%"),
          scrub: readNumber(root, "motion-scrub", 0.5),
          invalidateOnRefresh: true,
          onRefreshInit: measure,
          onRefresh: render
        }
      });
      timeline.to(progress, { portrait: 1, duration: 0.8 }, 0.05);
      timeline.to(progress, { panel: 1, duration: 0.75 }, 0.25);

      function requestRefresh() {
        if (disposed || refreshFrame) return;
        refreshFrame = requestAnimationFrame(() => {
          refreshFrame = 0;
          if (!disposed) ScrollTrigger.refresh();
        });
      }

      const images = [...root.querySelectorAll("img")];
      images.forEach((image) => image.addEventListener("load", requestRefresh));
      const resizeObserver = typeof ResizeObserver === "function"
        ? new ResizeObserver(requestRefresh)
        : null;
      resizeObserver?.observe(root);
      resizeObserver?.observe(frame);
      window.addEventListener("resize", requestRefresh, { passive: true });
      root.ownerDocument.fonts?.addEventListener?.("loadingdone", requestRefresh);
      root.ownerDocument.fonts?.ready.then(requestRefresh);
      requestRefresh();

      return () => {
        disposed = true;
        cancelAnimationFrame(refreshFrame);
        images.forEach((image) => image.removeEventListener("load", requestRefresh));
        resizeObserver?.disconnect();
        window.removeEventListener("resize", requestRefresh);
        root.ownerDocument.fonts?.removeEventListener?.("loadingdone", requestRefresh);
        timeline.scrollTrigger?.kill();
        timeline.kill();
        spacer.remove();
        [frame, panel, portrait].forEach(restore);
      };
    }
  );

  return () => mm.revert();
}

export const createdTakeover = {
  name: "created-takeover",
  category: "composition",
  selector: '[data-motion~="created-takeover"]',
  mount(element, { gsap, ScrollTrigger }) {
    return mountCreatedTakeover(element, { gsap, ScrollTrigger });
  }
};
