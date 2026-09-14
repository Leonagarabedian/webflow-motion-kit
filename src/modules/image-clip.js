import {
  readBoolean,
  readNumber,
  readString,
  resolveTrigger,
  selectTarget
} from "../core/config.js";

export const imageClip = {
  name: "image-clip",
  category: "primitive",
  selector: '[data-motion~="image-clip"]',
  mount(element, { gsap, reducedMotion, scrollAlignment }) {
    const target = selectTarget(element, "clip", element);
    const from = readString(element, "motion-clip-from", "inset(0 0 100% 0)");
    const to = readString(element, "motion-clip-to", "inset(0%)");

    if (reducedMotion()) {
      gsap.set(target, { clipPath: to });
      return;
    }

    const duration = readNumber(element, "motion-duration", 1);
    const once = readBoolean(element, "motion-once", true);
    const trigger = resolveTrigger(element);
    const mode = readString(element, "motion-alignment", "legacy");

    target.style.willChange = "clip-path";

    const scrollTrigger = mode === "auto"
      ? {
          ...scrollAlignment.build(element, {
            mode: "auto",
            id: readString(element, "motion-alignment-id", "image-clip"),
            trigger,
            profile: "reveal",
            stages: [{ name: "clip-reveal", start: 0, end: duration, duration }],
            scrub: false,
            invalidateOnRefresh: true
          }).scrollTrigger,
          once,
          scrub: false
        }
      : {
          trigger,
          start: readString(element, "motion-start", "top 88%"),
          once
        };

    const tween = gsap.fromTo(
      target,
      { clipPath: from },
      {
        clipPath: to,
        duration,
        ease: readString(element, "motion-ease", "power4.inOut"),
        scrollTrigger
      }
    );

    return () => {
      tween.kill();
      gsap.set(target, { clearProps: "clipPath" });
      target.style.willChange = "";
    };
  }
};
