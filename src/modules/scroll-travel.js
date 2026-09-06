import { readNumber, readString } from "../core/config.js";

const STYLE_ID = "motion-kit-scroll-travel-styles";
let sequence = 0;

function ensureStyles(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `[data-mk-scroll-travel-layer] { display: block; will-change: transform; }`;
  doc.head.appendChild(style);
}

function resolveContainer(element) {
  const selector = readString(element, "motion-container", null);
  if (selector) return element.closest(selector) ?? element.ownerDocument.querySelector(selector);
  return element.closest("section") ?? element.parentElement;
}

function createLayer(element) {
  const existing = element.querySelector(":scope > [data-mk-scroll-travel-layer]");
  if (existing) return { layer: existing, created: false };
  const layer = element.ownerDocument.createElement("span");
  layer.setAttribute("data-mk-scroll-travel-layer", "");
  while (element.firstChild) layer.appendChild(element.firstChild);
  element.appendChild(layer);
  return { layer, created: true };
}

function unwrap(element, layer) {
  while (layer.firstChild) element.insertBefore(layer.firstChild, layer);
  layer.remove();
}

export const scrollTravel = {
  name: "scroll-travel",
  category: "primitive",
  selector: '[data-motion~="scroll-travel"]',
  mount(element, { gsap, ScrollTrigger, reducedMotion }) {
    if (reducedMotion()) return;

    const container = resolveContainer(element);
    if (!container) return;
    ensureStyles(element.ownerDocument);

    const { layer, created } = createLayer(element);
    const bottomOffset = readNumber(element, "motion-bottom-offset", 0);
    const axis = readString(element, "motion-axis", "y");
    const direction = readNumber(element, "motion-direction", 1);
    const explicitDistance = element.getAttribute("data-motion-distance");

    function distance() {
      const configured = Number.parseFloat(explicitDistance);
      if (Number.isFinite(configured)) return configured * direction;

      if (axis === "x") {
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        return Math.max(0, containerRect.right - elementRect.right - bottomOffset) * direction;
      }

      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const paddingBottom = parseFloat(getComputedStyle(container).paddingBottom) || 0;
      return Math.max(
        0,
        containerRect.bottom - paddingBottom - bottomOffset - elementRect.bottom
      ) * direction;
    }

    const prop = axis === "x" ? "x" : "y";
    const tween = gsap.fromTo(
      layer,
      { [prop]: 0 },
      {
        [prop]: distance,
        ease: "none",
        overwrite: "auto",
        scrollTrigger: {
          id: `mk-scroll-travel-${++sequence}`,
          trigger: container,
          start: readString(element, "motion-start", "top top"),
          end: readString(element, "motion-end", `+=${Math.max(1, container.offsetHeight)}`),
          scrub: readNumber(element, "motion-scrub", 1),
          invalidateOnRefresh: true,
          markers: readString(element, "motion-markers", "false") === "true"
        }
      }
    );

    ScrollTrigger.refresh();

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      gsap.set(layer, { clearProps: "transform" });
      if (created && layer.isConnected) unwrap(element, layer);
    };
  }
};
