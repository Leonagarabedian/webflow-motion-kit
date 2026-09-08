import { readNumber, readString } from "../core/config.js";

const STYLE_ID = "motion-kit-liquid-fill-styles";
let sequence = 0;

function ensureStyles(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [data-mk-liquid-shell] { position: relative; display: block; }
    [data-mk-liquid-base], [data-mk-liquid-fill] { display: block; }
    [data-mk-liquid-base] { opacity: var(--mk-liquid-base-opacity, 0.16); }
    [data-mk-liquid-fill] {
      position: absolute; inset: 0; color: var(--mk-liquid-fill-color, #ff3ea5);
      pointer-events: none; clip-path: inset(0 100% 0 0); will-change: clip-path;
    }
  `;
  doc.head.appendChild(style);
}

function resolveContainer(element) {
  const selector = readString(element, "motion-container", null);
  if (selector) return element.closest(selector) ?? element.ownerDocument.querySelector(selector);
  return element.closest("section") ?? element.parentElement;
}

function resolveOptionalTarget(element, attributeName) {
  const selector = readString(element, attributeName, null);
  if (!selector) return null;
  return element.closest(selector) ?? element.ownerDocument.querySelector(selector);
}

function contentHost(element) {
  return element.querySelector(":scope > [data-mk-scroll-travel-layer]") ?? element;
}

function createStructure(element) {
  const host = contentHost(element);
  const existing = host.querySelector(":scope > [data-mk-liquid-shell]");
  if (existing) {
    return {
      host,
      shell: existing,
      base: existing.querySelector("[data-mk-liquid-base]"),
      fill: existing.querySelector("[data-mk-liquid-fill]"),
      created: false
    };
  }

  const doc = element.ownerDocument;
  const shell = doc.createElement("span");
  const base = doc.createElement("span");
  const fill = doc.createElement("span");
  shell.setAttribute("data-mk-liquid-shell", "");
  base.setAttribute("data-mk-liquid-base", "");
  fill.setAttribute("data-mk-liquid-fill", "");
  fill.setAttribute("aria-hidden", "true");
  while (host.firstChild) base.appendChild(host.firstChild);
  fill.innerHTML = base.innerHTML;
  shell.append(base, fill);
  host.appendChild(shell);
  return { host, shell, base, fill, created: true };
}

function unwrap(structure) {
  while (structure.base.firstChild) {
    structure.host.insertBefore(structure.base.firstChild, structure.shell);
  }
  structure.shell.remove();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function wavePolygon(progress, amplitude, frequency, phaseTurns, points) {
  if (progress <= 0) return "inset(0 100% 0 0)";
  if (progress >= 1) return "inset(0 0% 0 0)";
  const edge = progress * 100;
  const polygon = ["0% 0%"];
  for (let index = 0; index <= points; index += 1) {
    const y = (index / points) * 100;
    const angle =
      (index / points) * Math.PI * 2 * frequency +
      progress * Math.PI * 2 * phaseTurns;
    const x = clamp(edge + Math.sin(angle) * amplitude, 0, 100);
    polygon.push(`${x.toFixed(3)}% ${y.toFixed(3)}%`);
  }
  polygon.push("0% 100%");
  return `polygon(${polygon.join(", ")})`;
}

export const liquidFill = {
  name: "liquid-fill",
  category: "primitive",
  selector: '[data-motion~="liquid-fill"]',
  mount(element, { gsap, ScrollTrigger, reducedMotion }) {
    if (reducedMotion()) return;

    const container = resolveContainer(element);
    if (!container) return;
    const endTrigger = resolveOptionalTarget(element, "motion-end-trigger");
    ensureStyles(element.ownerDocument);

    const structure = createStructure(element);
    if (!structure.base || !structure.fill) return;

    structure.shell.style.setProperty(
      "--mk-liquid-fill-color",
      readString(element, "motion-fill-color", "#ff3ea5")
    );
    structure.shell.style.setProperty(
      "--mk-liquid-base-opacity",
      String(readNumber(element, "motion-base-opacity", 0.16))
    );

    const amplitude = readNumber(element, "motion-wave-amplitude", 3);
    const frequency = readNumber(element, "motion-wave-frequency", 1.5);
    const phaseTurns = readNumber(element, "motion-wave-phase-turns", 1.25);
    const points = Math.max(6, readNumber(element, "motion-wave-points", 18));
    const state = { progress: 0 };

    const render = () => {
      structure.fill.style.clipPath = wavePolygon(
        state.progress,
        amplitude,
        frequency,
        phaseTurns,
        points
      );
    };
    render();

    const scrollTriggerConfig = {
      id: `mk-liquid-fill-${++sequence}`,
      trigger: container,
      start: readString(element, "motion-start", "top top"),
      end: readString(element, "motion-end", `+=${Math.max(1, container.offsetHeight)}`),
      scrub: readNumber(element, "motion-scrub", 1),
      invalidateOnRefresh: true,
      markers: readString(element, "motion-markers", "false") === "true"
    };

    if (endTrigger) scrollTriggerConfig.endTrigger = endTrigger;

    const tween = gsap.to(state, {
      progress: 1,
      ease: "none",
      onUpdate: render,
      scrollTrigger: scrollTriggerConfig
    });

    ScrollTrigger.refresh();

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      structure.fill.style.removeProperty("clip-path");
      if (structure.created && structure.shell.isConnected) unwrap(structure);
    };
  }
};
