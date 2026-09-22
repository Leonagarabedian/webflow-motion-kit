import { readNumber, readString } from "../core/config.js";

const STYLE_ID = "motion-kit-hover-underline-sweep-v1-styles";

function addStyles(doc) {
  if (doc.getElementById(STYLE_ID)) return;

  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [data-motion~="hover-underline-sweep"] {
      position: relative;
      --mk-underline-scale: 0;
      --mk-underline-height: 1px;
      --mk-underline-offset: 3px;
      --mk-underline-color: currentColor;
      --mk-underline-origin: left center;
    }

    [data-motion~="hover-underline-sweep"]::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      bottom: calc(-1 * var(--mk-underline-offset));
      height: var(--mk-underline-height);
      background: var(--mk-underline-color);
      transform: scaleX(var(--mk-underline-scale));
      transform-origin: var(--mk-underline-origin);
      pointer-events: none;
      will-change: transform;
    }
  `;

  doc.head.appendChild(style);
}

function resolveOrigin(value) {
  switch (value) {
    case "center":
      return "center center";
    case "right":
      return "right center";
    default:
      return "left center";
  }
}

export const hoverUnderlineSweep = {
  name: "hover-underline-sweep",
  category: "primitive",
  selector: '[data-motion~="hover-underline-sweep"]',

  mount(element, { gsap, reducedMotion, supportsHover }) {
    const doc = element.ownerDocument;
    addStyles(doc);

    const duration = reducedMotion() ? 0 : readNumber(element, "motion-duration", 0.35);
    const ease = readString(element, "motion-ease", "power3.out");
    const height = Math.max(0, readNumber(element, "motion-underline-height", 1));
    const offset = readNumber(element, "motion-underline-offset", 3);
    const color = readString(element, "motion-underline-color", "currentColor");
    const origin = resolveOrigin(readString(element, "motion-underline-origin", "left"));

    const previous = {
      scale: element.style.getPropertyValue("--mk-underline-scale"),
      height: element.style.getPropertyValue("--mk-underline-height"),
      offset: element.style.getPropertyValue("--mk-underline-offset"),
      color: element.style.getPropertyValue("--mk-underline-color"),
      origin: element.style.getPropertyValue("--mk-underline-origin")
    };

    element.style.setProperty("--mk-underline-scale", "0");
    element.style.setProperty("--mk-underline-height", height + "px");
    element.style.setProperty("--mk-underline-offset", offset + "px");
    element.style.setProperty("--mk-underline-color", color);
    element.style.setProperty("--mk-underline-origin", origin);

    const timeline = gsap.timeline({
      paused: true,
      defaults: { duration, ease }
    }).to(element, { "--mk-underline-scale": 1 }, 0);

    const update = () => {
      const active =
        (supportsHover?.() && element.matches(":hover")) ||
        element.matches(":focus-visible");
      active ? timeline.play() : timeline.reverse();
    };

    const cleanups = [];

    if (!supportsHover || supportsHover()) {
      element.addEventListener("pointerenter", update);
      element.addEventListener("pointerleave", update);
      cleanups.push(() => {
        element.removeEventListener("pointerenter", update);
        element.removeEventListener("pointerleave", update);
      });
    }

    element.addEventListener("focus", update);
    element.addEventListener("blur", update);
    cleanups.push(() => {
      element.removeEventListener("focus", update);
      element.removeEventListener("blur", update);
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      timeline.kill();

      const restore = (name, value) => {
        if (value) element.style.setProperty(name, value);
        else element.style.removeProperty(name);
      };

      restore("--mk-underline-scale", previous.scale);
      restore("--mk-underline-height", previous.height);
      restore("--mk-underline-offset", previous.offset);
      restore("--mk-underline-color", previous.color);
      restore("--mk-underline-origin", previous.origin);
    };
  }
};
