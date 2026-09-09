import { readNumber, readString } from "../core/config.js";

const DEFAULTS = Object.freeze({
  start: "top 55%",
  end: "top 15%",
  scrub: 1,
  ease: "none",
  scale: true
});

function restoreToHome(element, home) {
  if (!home?.parent) return false;

  if (home.placeholder?.parentNode === home.parent) {
    home.parent.insertBefore(element, home.placeholder);
  } else if (home.nextSibling?.parentNode === home.parent) {
    home.parent.insertBefore(element, home.nextSibling);
  } else {
    home.parent.appendChild(element);
  }

  return true;
}

export const elementLayoutReturn = {
  name: "element-layout-return",
  category: "primitive",
  selector: '[data-motion~="element-layout-return"]',

  mount(element, { Flip, ScrollTrigger, gsap, reducedMotion }) {
    if (reducedMotion()) return;

    const home = element.__mkLayoutHome;
    if (!home?.parent || !home.placeholder) return;

    const start = readString(element, "motion-layout-return-start", DEFAULTS.start);
    const end = readString(element, "motion-layout-return-end", DEFAULTS.end);
    const scrub = readNumber(element, "motion-layout-return-scrub", DEFAULTS.scrub);
    const ease = readString(element, "motion-layout-return-ease", DEFAULTS.ease);
    const scale = readString(element, "motion-layout-return-scale", String(DEFAULTS.scale)) !== "false";
    const triggerSelector = readString(element, "motion-layout-return-trigger", "");
    const trigger = triggerSelector
      ? element.closest(triggerSelector) || document.querySelector(triggerSelector) || element
      : element;

    const currentParent = element.parentElement;
    if (!currentParent) return;

    const currentStyle = element.getAttribute("style");
    const state = Flip.getState(element, { props: "opacity,visibility" });

    restoreToHome(element, home);

    const finalStyle = element.getAttribute("style");
    element.removeAttribute("style");

    const tween = Flip.from(state, {
      absolute: true,
      scale,
      ease,
      paused: true,
      simple: false,
      prune: true
    });

    const scrollTrigger = ScrollTrigger.create({
      id: `mk-element-layout-return-${Math.random().toString(36).slice(2, 8)}`,
      trigger,
      start,
      end,
      scrub,
      animation: tween,
      invalidateOnRefresh: true,
      onLeave: () => {
        gsap.set(element, { clearProps: "transform,width,height,left,top,position" });
        home.placeholder?.remove();
        delete element.__mkLayoutHome;
      },
      onLeaveBack: () => {
        const backState = Flip.getState(element, { props: "opacity,visibility" });
        if (currentParent.isConnected) currentParent.appendChild(element);
        if (currentStyle == null) element.removeAttribute("style");
        else element.setAttribute("style", currentStyle);
        Flip.from(backState, { duration: 0, absolute: true, scale, prune: true });
      }
    });

    return () => {
      scrollTrigger.kill();
      tween.kill();

      if (element.__mkLayoutHome) {
        restoreToHome(element, home);
        home.placeholder?.remove();
        delete element.__mkLayoutHome;
      }

      if (finalStyle == null) element.removeAttribute("style");
      else element.setAttribute("style", finalStyle);
      gsap.set(element, { clearProps: "transform,width,height,left,top,position" });
    };
  }
};
