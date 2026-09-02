import { readBoolean, readNumber, readString, resolveTrigger } from "../core/config.js";

export const scrambleText = {
  name: "scramble-text",
  selector: '[data-motion~="scramble-text"]',
  mount(element, { gsap, ScrollTrigger, reducedMotion, supportsHover }) {
    const original = element.textContent;
    const text = readString(element, "motion-text", original);
    const event = readString(element, "motion-event", "hover");
    const vars = {
      duration: reducedMotion() ? 0 : readNumber(element, "motion-duration", 0.8),
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
      const trigger = ScrollTrigger.create({
        once: readBoolean(element, "motion-once", true),
        onEnter: () => tween.restart(),
        start: readString(element, "motion-start", "top 85%"),
        trigger: resolveTrigger(element)
      });
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
