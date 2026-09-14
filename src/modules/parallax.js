import {
  readNumber,
  readString,
  resolveTrigger,
  selectTarget
} from "../core/config.js";

export const parallax = {
  name: "parallax",
  category: "primitive",
  selector: '[data-motion~="parallax"]',
  mount(element, { gsap, reducedMotion, scrollAlignment }) {
    const target = selectTarget(element, "parallax", element);
    if (reducedMotion()) {
      gsap.set(target, { yPercent: 0 });
      return;
    }

    const from = readNumber(element, "motion-from", -5);
    const to = readNumber(element, "motion-to", -20);
    const scrub = readNumber(element, "motion-scrub", 1.5);
    const trigger = resolveTrigger(element);
    const mode = readString(element, "motion-alignment", "legacy");

    target.style.willChange = "transform";

    let scrollTrigger;
    if (mode === "auto") {
      scrollTrigger = scrollAlignment.build(element, {
        mode: "auto",
        id: readString(element, "motion-alignment-id", "parallax"),
        trigger,
        profile: "composition",
        stages: [{
          name: "parallax",
          start: 0,
          end: 1,
          duration: 1,
          yFrom: from,
          yTo: to
        }],
        scrub,
        invalidateOnRefresh: true
      }).scrollTrigger;
    } else {
      scrollTrigger = {
        end: readString(element, "motion-end", "bottom top"),
        invalidateOnRefresh: true,
        scrub,
        start: readString(element, "motion-start", "top bottom"),
        trigger
      };
    }

    const tween = gsap.fromTo(
      target,
      { yPercent: from },
      {
        ease: "none",
        yPercent: to,
        scrollTrigger
      }
    );

    return () => {
      tween.kill();
      gsap.set(target, { clearProps: "transform" });
      target.style.willChange = "";
    };
  }
};
