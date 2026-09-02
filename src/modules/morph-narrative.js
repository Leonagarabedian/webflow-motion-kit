import {
  readNumber,
  readString,
  resolveTrigger,
  selectTarget
} from "../core/config.js";

export const morphNarrative = {
  name: "morph-narrative",
  selector: '[data-motion~="morph-narrative"]',
  mount(element, { gsap, reducedMotion }) {
    const source = selectTarget(element, "morph-source", null);
    const shapes = [...element.querySelectorAll("[data-motion-morph-shape]")];
    if (!source || !shapes.length) return;

    const originalD = source.getAttribute("d");
    const originalPoints = source.getAttribute("points");
    const originalStyle = source.getAttribute("style");
    if (reducedMotion()) return;

    const timeline = gsap.timeline({
      scrollTrigger: {
        end: readString(element, "motion-end", "bottom bottom"),
        scrub: readNumber(element, "motion-scrub", 1),
        start: readString(element, "motion-start", "top top"),
        trigger: resolveTrigger(element)
      }
    });
    shapes.forEach((shape) => {
      timeline.to(source, {
        duration: 1,
        ease: "none",
        morphSVG: {
          map: readString(element, "motion-morph-map", "size"),
          shape,
          type: readString(element, "motion-morph-type", "rotational")
        }
      });
    });

    return () => {
      timeline.scrollTrigger?.kill();
      timeline.kill();
      if (originalD == null) source.removeAttribute("d");
      else source.setAttribute("d", originalD);
      if (originalPoints == null) source.removeAttribute("points");
      else source.setAttribute("points", originalPoints);
      if (originalStyle == null) source.removeAttribute("style");
      else source.setAttribute("style", originalStyle);
    };
  }
};
