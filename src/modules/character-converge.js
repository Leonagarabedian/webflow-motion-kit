import { readNumber, readString, resolveTrigger } from "../core/config.js";

export const characterConverge = {
  name: "character-converge",
  category: "primitive",
  selector: '[data-motion~="character-converge"]',

  mount(element, { gsap, SplitText, reducedMotion }) {
    if (reducedMotion()) {
      gsap.set(element, { autoAlpha: 1 });
      return;
    }

    const trigger = resolveTrigger(element);
    const start = readString(element, "motion-start", "top 85%");
    const end = readString(element, "motion-end", "top 35%");
    const scrub = readNumber(element, "motion-scrub", 1);
    const baseX = readNumber(element, "motion-x", 28);
    const stepX = readNumber(element, "motion-x-step", 18);
    const y = readNumber(element, "motion-y", 0);
    const opacityFrom = readNumber(element, "motion-opacity-from", 1);
    const ease = readString(element, "motion-ease", "none");
    const order = readString(element, "motion-order", "reverse");

    element.style.willChange = "transform, opacity";

    const split = SplitText.create(element, {
      aria: "auto",
      type: "words,chars"
    });

    const chars = split.chars || [];
    const ordered = order === "forward" ? chars : [...chars].reverse();

    ordered.forEach((char, index) => {
      const distance = baseX + stepX * index;
      gsap.set(char, {
        x: distance,
        y,
        autoAlpha: opacityFrom,
        willChange: "transform, opacity"
      });
    });

    const tween = gsap.to(ordered, {
      x: 0,
      y: 0,
      autoAlpha: 1,
      ease,
      stagger: {
        each: readNumber(element, "motion-stagger", 0.06),
        from: "start"
      },
      scrollTrigger: {
        trigger,
        start,
        end,
        scrub,
        invalidateOnRefresh: true
      }
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      gsap.set(chars, { clearProps: "transform,opacity,visibility,willChange" });
      split.revert();
      element.style.willChange = "";
    };
  }
};
