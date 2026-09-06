import { readNumber, readString } from "../core/config.js";

const STYLE_ID = "motion-kit-nav-flip-styles";

function ensureStyles(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [data-motion~="nav-flip"] { perspective: var(--mk-nav-flip-perspective, 500px); }
    [data-mk-nav-flip-inner] {
      display: inline-block;
      transform-style: preserve-3d;
      transform-origin: 50% 50%;
      will-change: transform;
    }
  `;
  doc.head.appendChild(style);
}

export const navFlip = {
  name: "nav-flip",
  category: "primitive",
  selector: '[data-motion~="nav-flip"]',
  mount(element, { gsap, reducedMotion, supportsHover }) {
    if (reducedMotion() || !supportsHover()) return;

    ensureStyles(element.ownerDocument);
    const originalHTML = element.innerHTML;
    const inner = element.ownerDocument.createElement("span");
    inner.setAttribute("data-mk-nav-flip-inner", "");
    while (element.firstChild) inner.appendChild(element.firstChild);
    element.appendChild(inner);
    element.style.setProperty(
      "--mk-nav-flip-perspective",
      `${readNumber(element, "motion-perspective", 500)}px`
    );

    const timeline = gsap.timeline({ paused: true });
    timeline.to(inner, {
      rotationX: readNumber(element, "motion-rotation-x", -90),
      duration: readNumber(element, "motion-duration", 0.35),
      ease: readString(element, "motion-ease", "power2.inOut")
    });

    const enter = () => timeline.play();
    const leave = () => timeline.reverse();
    element.addEventListener("pointerenter", enter);
    element.addEventListener("focusin", enter);
    element.addEventListener("pointerleave", leave);
    element.addEventListener("focusout", leave);

    return () => {
      element.removeEventListener("pointerenter", enter);
      element.removeEventListener("focusin", enter);
      element.removeEventListener("pointerleave", leave);
      element.removeEventListener("focusout", leave);
      timeline.kill();
      element.innerHTML = originalHTML;
      element.style.removeProperty("--mk-nav-flip-perspective");
    };
  }
};
