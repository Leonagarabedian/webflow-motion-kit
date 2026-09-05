import {
  readBoolean,
  readNumber,
  readString,
  resolveTrigger,
  selectTarget,
  selectTargets
} from "../core/config.js";

export const svgReveal = {
  name: "svg-reveal",
  category: "primitive",
  selector: '[data-motion~="svg-reveal"]',
  mount(element, { gsap, reducedMotion, supportsHover }) {
    const explicitPaths = selectTargets(element, "svg-path");
    const paths = explicitPaths.length
      ? explicitPaths
      : [...element.querySelectorAll("path, line, polyline, polygon, rect, ellipse")];
    if (!paths.length) return;

    const originalStyles = paths.map((path) => path.getAttribute("style"));
    const hoverTarget = selectTarget(element, "svg-hover", element.querySelector("svg"));
    const originalHoverStyle = hoverTarget?.getAttribute("style");
    const timeline = gsap.timeline({
      scrollTrigger: {
        once: readBoolean(element, "motion-once", true),
        start: readString(element, "motion-start", "top 85%"),
        trigger: resolveTrigger(element)
      }
    });

    timeline.fromTo(
      paths,
      { drawSVG: reducedMotion() ? "0% 100%" : "0% 0%" },
      {
        drawSVG: "0% 100%",
        duration: reducedMotion() ? 0 : readNumber(element, "motion-duration", 1.2),
        ease: readString(element, "motion-ease", "power2.inOut"),
        stagger: reducedMotion() ? 0 : readNumber(element, "motion-stagger", 0.08)
      }
    );

    let hoverTimeline;
    const hoverEnabled = readBoolean(element, "motion-hover", false);
    if (hoverEnabled && hoverTarget && supportsHover() && !reducedMotion()) {
      hoverTimeline = gsap.timeline({ paused: true }).to(hoverTarget, {
        duration: readNumber(element, "motion-hover-duration", 0.8),
        ease: readString(element, "motion-hover-ease", "elastic.out(1, 0.35)"),
        rotation: readNumber(element, "motion-hover-rotation", 3),
        scale: readNumber(element, "motion-hover-scale", 1.06),
        transformOrigin: "center center"
      });
    }

    const enter = () => hoverTimeline?.play();
    const leave = () => hoverTimeline?.reverse();
    if (hoverTimeline) {
      element.addEventListener("pointerenter", enter);
      element.addEventListener("focusin", enter);
      element.addEventListener("pointerleave", leave);
      element.addEventListener("focusout", leave);
    }

    return () => {
      element.removeEventListener("pointerenter", enter);
      element.removeEventListener("focusin", enter);
      element.removeEventListener("pointerleave", leave);
      element.removeEventListener("focusout", leave);
      timeline.scrollTrigger?.kill();
      timeline.kill();
      hoverTimeline?.kill();
      paths.forEach((path, index) => {
        if (originalStyles[index] == null) path.removeAttribute("style");
        else path.setAttribute("style", originalStyles[index]);
      });
      if (hoverTarget) {
        if (originalHoverStyle == null) hoverTarget.removeAttribute("style");
        else hoverTarget.setAttribute("style", originalHoverStyle);
      }
    };
  }
};
