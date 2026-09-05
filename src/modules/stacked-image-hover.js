import { readList, readNumber, readString, selectTargets } from "../core/config.js";

export const stackedImageHover = {
  name: "stacked-image-hover",
  category: "component",
  selector: '[data-motion~="stacked-image-hover"]',
  mount(element, { gsap, reducedMotion, supportsHover }) {
    const layers = selectTargets(element, "stack-layer");
    if (layers.length < 2 || reducedMotion() || !supportsHover()) return;

    const scales = readList(element, "motion-scales", ["1", ".3064", ".1236", ".0224"])
      .map(Number)
      .filter(Number.isFinite);
    const timeline = gsap.timeline({ paused: true });
    timeline.to(
      layers,
      {
        duration: readNumber(element, "motion-duration", 0.75),
        ease: readString(element, "motion-ease", "power4.inOut"),
        scale: (index) => scales[index] ?? scales.at(-1) ?? 1,
        stagger: readNumber(element, "motion-stagger", 0.035),
        transformOrigin: "center center"
      },
      0
    );

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
      gsap.set(layers, { clearProps: "transform" });
    };
  }
};
