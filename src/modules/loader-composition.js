import { readNumber, readString, selectTarget, selectTargets } from "../core/config.js";

export const loaderComposition = {
  name: "loader-composition",
  category: "component",
  selector: '[data-motion~="loader-composition"]',
  mount(element, { gsap, reducedMotion }) {
    const panel = selectTarget(element, "loader-panel", element);
    const progress = selectTarget(element, "loader-progress", null);
    const items = selectTargets(element, "loader-item");
    const initialStyle = element.getAttribute("style");
    const initialAriaHidden = element.getAttribute("aria-hidden");
    const animationTargets = [...new Set([panel, progress, ...items].filter(Boolean))];
    const initialTargetStyles = animationTargets.map((target) => target.getAttribute("style"));
    let timer;

    if (reducedMotion()) {
      gsap.set(element, { display: "none" });
      element.setAttribute("aria-hidden", "true");
      return () => {
        if (initialStyle == null) element.removeAttribute("style");
        else element.setAttribute("style", initialStyle);
        if (initialAriaHidden == null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", initialAriaHidden);
      };
    }

    if (progress) gsap.set(progress, { scaleX: 0, transformOrigin: "left center" });
    gsap.set(items, { autoAlpha: 0, yPercent: 30 });
    const timeline = gsap.timeline({
      defaults: { ease: readString(element, "motion-ease", "power3.out") },
      onComplete: () => {
        gsap.set(element, { display: "none" });
        element.setAttribute("aria-hidden", "true");
      },
      paused: true
    });
    if (items.length) {
      timeline.to(items, {
        autoAlpha: 1,
        duration: readNumber(element, "motion-item-duration", 0.55),
        stagger: readNumber(element, "motion-stagger", 0.06),
        yPercent: 0
      });
    }
    if (progress) {
      timeline.to(
        progress,
        { duration: readNumber(element, "motion-progress-duration", 0.9), scaleX: 1 },
        0
      );
    }
    timeline.to(panel, {
      autoAlpha: 0,
      duration: readNumber(element, "motion-exit-duration", 0.8),
      ease: "power4.inOut",
      yPercent: -100
    });

    const play = () => {
      timer = window.setTimeout(
        () => timeline.play(),
        readNumber(element, "motion-delay", 0.1) * 1000
      );
    };
    if (document.readyState === "complete") play();
    else window.addEventListener("load", play, { once: true });

    return () => {
      window.removeEventListener("load", play);
      window.clearTimeout(timer);
      timeline.kill();
      animationTargets.forEach((target, index) => {
        if (initialTargetStyles[index] == null) target.removeAttribute("style");
        else target.setAttribute("style", initialTargetStyles[index]);
      });
      if (initialStyle == null) element.removeAttribute("style");
      else element.setAttribute("style", initialStyle);
      if (initialAriaHidden == null) element.removeAttribute("aria-hidden");
      else element.setAttribute("aria-hidden", initialAriaHidden);
    };
  }
};
