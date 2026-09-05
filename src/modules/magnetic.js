import { readNumber, selectTarget } from "../core/config.js";

export const magnetic = {
  name: "magnetic",
  category: "primitive",
  selector: '[data-motion~="magnetic"]',
  mount(element, { gsap, reducedMotion, supportsHover }) {
    if (reducedMotion() || !supportsHover()) return;

    const target = selectTarget(element, "magnetic", element);
    const strength = readNumber(element, "motion-strength", 0.25);
    const max = readNumber(element, "motion-max", 40);
    const duration = readNumber(element, "motion-duration", 0.45);
    const xTo = gsap.quickTo(target, "x", { duration, ease: "power3.out" });
    const yTo = gsap.quickTo(target, "y", { duration, ease: "power3.out" });

    target.style.willChange = "transform";

    const onMove = (event) => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) * strength;
      const y = (event.clientY - rect.top - rect.height / 2) * strength;
      xTo(gsap.utils.clamp(-max, max, x));
      yTo(gsap.utils.clamp(-max, max, y));
    };
    const onLeave = () => {
      xTo(0);
      yTo(0);
    };

    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerleave", onLeave);

    return () => {
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerleave", onLeave);
      xTo.tween?.kill();
      yTo.tween?.kill();
      gsap.set(target, { clearProps: "transform" });
      target.style.willChange = "";
    };
  }
};
