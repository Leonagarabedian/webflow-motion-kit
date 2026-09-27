import {
  readBoolean,
  readNumber,
  readString,
  selectTarget
} from "../../core/config.js";

const STYLE_ID = "motion-kit-sticky-stage-runway-styles";
const DEFAULT_LAYER_SELECTOR =
  '[data-motion-layer], [data-motion-target="layer"], .about-choreo-layer';

function ensureStyles(doc) {
  if (doc.getElementById(STYLE_ID)) return;

  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [data-motion~="sticky-stage-runway"][data-mk-sticky-stage-active="true"] {
      position: relative;
      min-height: var(--mk-sticky-stage-height, 500svh);
      overflow: visible;
      isolation: isolate;
    }

    [data-mk-sticky-stage-sticky] {
      width: 100%;
      height: var(--mk-sticky-stage-viewport, 100svh);
      overflow: hidden;
      z-index: var(--mk-sticky-stage-z, 1);
    }

    [data-mk-sticky-stage-sticky="css"] {
      position: sticky;
      top: var(--mk-sticky-stage-top, 0px);
    }

    [data-mk-sticky-stage-stage] {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      isolation: isolate;
    }

    [data-mk-sticky-stage-layer] {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      will-change: transform, opacity;
    }

    [data-mk-sticky-stage-layer-state="hidden"] {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    [data-mk-sticky-stage-layer-state="active"] {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }

    @media screen and (max-width: 991px) {
      [data-motion~="sticky-stage-runway"][data-mk-sticky-stage-active="true"] {
        min-height: auto;
      }

      [data-mk-sticky-stage-sticky] {
        position: relative;
        height: auto;
        overflow: visible;
      }

      [data-mk-sticky-stage-stage] {
        height: auto;
        overflow: visible;
      }

      [data-mk-sticky-stage-layer] {
        position: relative;
        inset: auto;
        height: auto;
        min-height: auto;
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }
    }
  `;
  doc.head.appendChild(style);
}

function splitSelectorList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function queryLayers(root, selector) {
  const selectors = splitSelectorList(selector || DEFAULT_LAYER_SELECTOR);
  const layers = new Set();

  selectors.forEach((entry) => {
    try {
      root.querySelectorAll(entry).forEach((layer) => layers.add(layer));
    } catch (_) {}
  });

  return [...layers];
}

function layerName(layer, index) {
  return (
    layer.getAttribute("data-motion-layer") ||
    layer.getAttribute("data-motion-target") ||
    layer.getAttribute("data-about-choreo-layer") ||
    String(index)
  );
}

function originalInlineState(element) {
  return {
    style: element.getAttribute("style"),
    active: element.getAttribute("data-mk-sticky-stage-active"),
    sticky: element.getAttribute("data-mk-sticky-stage-sticky"),
    stage: element.getAttribute("data-mk-sticky-stage-stage"),
    layer: element.getAttribute("data-mk-sticky-stage-layer"),
    state: element.getAttribute("data-mk-sticky-stage-layer-state")
  };
}

function restoreAttribute(element, name, value) {
  if (value == null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}

function restoreInlineState(element, state) {
  if (!element) return;
  if (state.style == null) element.removeAttribute("style");
  else element.setAttribute("style", state.style);
  restoreAttribute(element, "data-mk-sticky-stage-active", state.active);
  restoreAttribute(element, "data-mk-sticky-stage-sticky", state.sticky);
  restoreAttribute(element, "data-mk-sticky-stage-stage", state.stage);
  restoreAttribute(element, "data-mk-sticky-stage-layer", state.layer);
  restoreAttribute(element, "data-mk-sticky-stage-layer-state", state.state);
}

export const stickyStageRunway = {
  name: "sticky-stage-runway",
  category: "primitive",
  selector: '[data-motion~="sticky-stage-runway"]',

  mount(root, { ScrollTrigger, gsap, reducedMotion }) {
    const minWidth = readNumber(root, "motion-min-width", 992);
    const media = gsap.matchMedia();

    media.add(
      {
        desktop: `(min-width: ${minWidth}px)`,
        reduceMotion: "(prefers-reduced-motion: reduce)"
      },
      ({ conditions }) => {
        if (!conditions.desktop) return;

        ensureStyles(root.ownerDocument);

        const scrollVh = Math.max(100, readNumber(root, "motion-scroll-vh", 500));
        const viewportVh = Math.max(1, readNumber(root, "motion-viewport-vh", 100));
        const stickyTop = readString(root, "motion-sticky-top", "0px");
        const zIndex = readNumber(root, "motion-z-index", 1);
        const pin = readBoolean(root, "motion-pin", true) && !conditions.reduceMotion && !reducedMotion();
        const start = readString(root, "motion-start", "top top");
        const end = readString(root, "motion-end", "bottom bottom");
        const id = readString(root, "motion-id", "sticky-stage-runway");
        const layerMode = readString(root, "motion-layer-mode", "stack");
        const activeLayer = readString(root, "motion-active-layer", "");
        const layerSelector = readString(root, "motion-layer-selector", DEFAULT_LAYER_SELECTOR);

        const sticky = selectTarget(root, "sticky", root);
        const stage = selectTarget(root, "stage", sticky);
        const layers = layerMode === "none" ? [] : queryLayers(stage, layerSelector);
        const originals = new Map();
        [root, sticky, stage, ...layers].forEach((element) => {
          if (!originals.has(element)) originals.set(element, originalInlineState(element));
        });

        root.setAttribute("data-mk-sticky-stage-active", "true");
        root.style.setProperty("--mk-sticky-stage-height", `${scrollVh}svh`);
        root.style.setProperty("--mk-sticky-stage-viewport", `${viewportVh}svh`);
        root.style.setProperty("--mk-sticky-stage-top", stickyTop);
        root.style.setProperty("--mk-sticky-stage-z", String(zIndex));

        sticky.setAttribute("data-mk-sticky-stage-sticky", pin ? "pinned" : "css");
        stage.setAttribute("data-mk-sticky-stage-stage", "");

        layers.forEach((layer, index) => {
          layer.setAttribute("data-mk-sticky-stage-layer", layerName(layer, index));
          if (activeLayer) {
            layer.setAttribute(
              "data-mk-sticky-stage-layer-state",
              layerName(layer, index) === activeLayer ? "active" : "hidden"
            );
          }
        });

        const trigger = pin
          ? ScrollTrigger.create({
              id,
              trigger: root,
              start,
              end,
              pin: sticky,
              pinSpacing: false,
              anticipatePin: 1,
              invalidateOnRefresh: true
            })
          : null;

        return () => {
          trigger?.kill();
          originals.forEach((state, element) => restoreInlineState(element, state));
        };
      }
    );

    return () => media.revert();
  }
};
