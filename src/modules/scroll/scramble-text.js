import { scrollMode } from "../../core/scroll-alignment/contract.js";
import { readBoolean, readNumber, readString, resolveTrigger } from "../../core/config.js";

export const scrambleText = {
  name: "scramble-text",
  category: "primitive",
  selector: '[data-motion~="scramble-text"]',
  mount(element, { gsap, ScrollTrigger, reducedMotion, supportsHover, scrollAlignment }) {
    const original = element.textContent;
    const text = readString(element, "motion-text", original);
    const event = readString(element, "motion-event", "hover");
    const duration = reducedMotion() ? 0 : readNumber(element, "motion-duration", 0.8);
    const vars = {
      duration,
      ease: readString(element, "motion-ease", "power2.out"),
      paused: true,
      scrambleText: {
        chars: readString(element, "motion-chars", "upperCase"),
        speed: readNumber(element, "motion-speed", 0.6),
        text
      }
    };
    const tween = gsap.to(element, vars);

    if (event === "scroll") {
      const once = readBoolean(element, "motion-once", true);
      const triggerElement = resolveTrigger(element);
      const mode = scrollMode(element);
      const triggerConfig = mode === "auto"
        ? {
            ...scrollAlignment.build(element, {
              mode: "auto",
              id: readString(element, "motion-alignment-id", "scramble-text"),
              trigger: triggerElement,
              profile: "reveal",
              stages: [{
                name: "scramble",
                start: 0,
                end: duration,
                duration,
                opacityFrom: 1,
                opacityTo: 1
              }],
              scrub: false,
              invalidateOnRefresh: true
            }).scrollTrigger,
            scrub: false,
            once,
            onEnter: () => tween.restart()
          }
        : {
            once,
            onEnter: () => tween.restart(),
            start: readString(element, "motion-start", "top 85%"),
            trigger: triggerElement
          };

      const trigger = ScrollTrigger.create(triggerConfig);
      return () => {
        trigger.kill();
        tween.kill();
        element.textContent = original;
      };
    }

    if (!supportsHover()) return () => tween.kill();
    const play = () => tween.restart();
    const restore = () => {
      if (!readBoolean(element, "motion-restore", true)) return;
      gsap.to(element, {
        duration: vars.duration * 0.7,
        overwrite: true,
        scrambleText: { ...vars.scrambleText, text: original }
      });
    };
    element.addEventListener("pointerenter", play);
    element.addEventListener("focusin", play);
    element.addEventListener("pointerleave", restore);
    element.addEventListener("focusout", restore);

    return () => {
      element.removeEventListener("pointerenter", play);
      element.removeEventListener("focusin", play);
      element.removeEventListener("pointerleave", restore);
      element.removeEventListener("focusout", restore);
      gsap.killTweensOf(element);
      element.textContent = original;
    };
  }
};
