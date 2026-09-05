import { readNumber, readString, selectTarget } from "../core/config.js";

export const linkSwap = {
  name: "link-swap",
  category: "primitive",
  selector: '[data-motion~="link-swap"]',
  mount(element, { gsap, reducedMotion, supportsHover }) {
    const primary = selectTarget(element, "primary", null);
    const secondary = selectTarget(element, "secondary", null);
    if (!primary || !secondary || reducedMotion() || !supportsHover()) return;

    gsap.set(secondary, { yPercent: 110 });
    const timeline = gsap.timeline({
      defaults: {
        duration: readNumber(element, "motion-duration", 0.55),
        ease: readString(element, "motion-ease", "power4.inOut")
      },
      paused: true
    });
    timeline
      .to(primary, { yPercent: -110 }, 0)
      .to(secondary, { yPercent: 0 }, 0);

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
      gsap.set([primary, secondary], { clearProps: "transform" });
    };
  }
};
