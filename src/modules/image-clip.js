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
  mount(element, { gsap, reducedMotion }) {
    const target = selectTarget(element, "clip", element);
    const from = readString(element, "motion-clip-from", "inset(0 0 100% 0)");
    const to = readString(element, "motion-clip-to", "inset(0%)");

    if (reducedMotion()) {
      gsap.set(target, { clipPath: to });
      return;
    }

    target.style.willChange = "clip-path";
    const tween = gsap.fromTo(
      target,
      { clipPath: from },
      {
        clipPath: to,
        duration: readNumber(element, "motion-duration", 1),
        ease: readString(element, "motion-ease", "power4.inOut"),
        scrollTrigger: {
          trigger: resolveTrigger(element),
          start: readString(element, "motion-start", "top 88%"),
          once: readBoolean(element, "motion-once", true)
        }
      }
    );

    return () => {
      tween.kill();
      gsap.set(target, { clearProps: "clipPath" });
      target.style.willChange = "";
    };
  }
};
