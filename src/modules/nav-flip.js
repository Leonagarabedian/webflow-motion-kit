import { readNumber, readString } from "../core/config.js";

const STYLE_ID = "motion-kit-nav-flip-v1-styles";

function addStyles(doc) {
  if (doc.getElementById(STYLE_ID)) return;

  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [data-mk-flip-link] {
      perspective: var(--mk-flip-perspective, 500px);
    }

    [data-mk-flip-clip] {
      position: relative;
      display: block;
      height: var(--mk-flip-height, 1.15em);
      overflow: hidden;
      line-height: var(--mk-flip-line-height, 1.15);
    }

    [data-mk-flip-current],
    [data-mk-flip-next] {
      display: block;
      white-space: nowrap;
      will-change: transform;
    }

    [data-mk-flip-current] {
      transform-origin: 50% 0%;
    }

    [data-mk-flip-next] {
      position: absolute;
      top: 100%;
      left: 0;
      transform-origin: 50% 100%;
    }
  `;
  doc.head.appendChild(style);
}

export const navFlip = {
  name: "nav-flip",
  category: "primitive",
  selector: '[data-motion~="nav-flip"]',

  mount(link, { gsap, reducedMotion, supportsHover }) {
    const respectReducedMotion =
      readString(link, "motion-respect-reduced-motion", "true") !== "false";

    if ((respectReducedMotion && reducedMotion()) || !supportsHover()) return;

    const doc = link.ownerDocument;
    const label = link.textContent.trim();
    if (!label) return;

    const duration = readNumber(link, "motion-duration", 0.42);
    const ease = readString(link, "motion-ease", "power3.out");
    const perspective = readNumber(link, "motion-perspective", 500);
    const rotation = readNumber(link, "motion-rotation", 75);
    const nextStartY = readNumber(link, "motion-next-start-y", 10);
    const currentEndY = readNumber(link, "motion-current-end-y", -110);
    const nextEndY = readNumber(link, "motion-next-end-y", -100);
    const overlap = readNumber(link, "motion-overlap", 0.03);
    const height = readString(link, "motion-height", "1.15em");
    const lineHeight = readString(link, "motion-line-height", "1.15");

    addStyles(doc);

    const originalHTML = link.innerHTML;
    const clip = doc.createElement("span");
    const current = doc.createElement("span");
    const next = doc.createElement("span");

    link.setAttribute("data-mk-flip-link", "");
    link.style.setProperty("--mk-flip-perspective", perspective + "px");
    link.style.setProperty("--mk-flip-height", height);
    link.style.setProperty("--mk-flip-line-height", lineHeight);

    clip.setAttribute("data-mk-flip-clip", "");
    current.setAttribute("data-mk-flip-current", "");
    next.setAttribute("data-mk-flip-next", "");
    next.setAttribute("aria-hidden", "true");

    current.textContent = label;
    next.textContent = label;
    clip.append(current, next);
    link.replaceChildren(clip);

    gsap.set(next, {
      yPercent: nextStartY,
      rotationX: rotation
    });

    const timeline = gsap.timeline({
      paused: true,
      defaults: {
        duration,
        ease
      }
    });

    timeline
      .to(
        current,
        {
          yPercent: currentEndY,
          rotationX: -rotation
        },
        0
      )
      .to(
        next,
        {
          yPercent: nextEndY,
          rotationX: 0
        },
        overlap
      );

    function update() {
      const active = link.matches(":hover") || link.matches(":focus");
      active ? timeline.play() : timeline.reverse();
    }

    link.addEventListener("mouseenter", update);
    link.addEventListener("mouseleave", update);
    link.addEventListener("focus", update);
    link.addEventListener("blur", update);

    return () => {
      link.removeEventListener("mouseenter", update);
      link.removeEventListener("mouseleave", update);
      link.removeEventListener("focus", update);
      link.removeEventListener("blur", update);
      timeline.kill();
      link.innerHTML = originalHTML;
      link.removeAttribute("data-mk-flip-link");
      link.style.removeProperty("--mk-flip-perspective");
      link.style.removeProperty("--mk-flip-height");
      link.style.removeProperty("--mk-flip-line-height");
    };
  }
};
