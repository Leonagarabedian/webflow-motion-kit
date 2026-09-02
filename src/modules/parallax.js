import {
  readNumber,
  readString,
  resolveTrigger,
  selectTarget
} from "../core/config.js";

export const parallax = {
  name: "parallax",
  selector: '[data-motion~="parallax"]',
  mount(element, { gsap, reducedMotion }) {
    const target = selectTarget(element, "parallax", element);
    if (reducedMotion()) {
      gsap.set(target, { yPercent: 0 });
      return;
    }

    target.style.willChange = "transform";
    const tween = gsap.fromTo(
      target,
      { yPercent: readNumber(element, "motion-from", -5) },
      {
        ease: "none",
        yPercent: readNumber(element, "motion-to", -20),
        scrollTrigger: {
          end: readString(element, "motion-end", "bottom top"),
          invalidateOnRefresh: true,
          scrub: readNumber(element, "motion-scrub", 1.5),
          start: readString(element, "motion-start", "top bottom"),
          trigger: resolveTrigger(element)
        }
      }
    );

    return () => {
      tween.kill();
      gsap.set(target, { clearProps: "transform" });
      target.style.willChange = "";
    };
  }
};
