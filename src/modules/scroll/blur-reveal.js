import { scrollMode } from "../../core/scroll-alignment/contract.js";
import { readNumber, readString, resolveTrigger } from "../../core/config.js";

export const blurReveal = {
  name: "blur-reveal",
  category: "primitive",
  selector: '[data-motion~="blur-reveal"]',
  mount(element, { gsap, SplitText, reducedMotion, scrollAlignment }) {
    if (reducedMotion()) {
      gsap.set(element, { autoAlpha: 1, filter: "none" });
      return;
    }

    const targetMode = readString(element, "motion-target-mode", "split");
    const unit = readString(element, "motion-split", "lines");
    const type = unit === "chars" ? "words,chars" : unit;
    const duration = readNumber(element, "motion-duration", 1);
    const delay = Math.max(0, readNumber(element, "motion-delay", 0));
    const stagger = readNumber(element, "motion-stagger", 0.06);
    const blur = readNumber(element, "motion-blur", 12);
    const yPercent = readNumber(element, "motion-y", 35);
    const mode = scrollMode(element);

    const createReveal = (units) => {
      if (!units.length) return null;

      const trigger = resolveTrigger(element);
      let scrollTrigger;

      if (mode === "auto") {
        const alignment = scrollAlignment.build(element, {
          mode: "auto",
          id: readString(element, "motion-alignment-id", "blur-reveal"),
          trigger,
          profile: "reveal",
          stages: units.map((target, index) => ({
            start: delay + index * stagger,
            end: delay + index * stagger + duration,
            duration,
            target,
            yPercentFrom: yPercent,
            yPercentTo: 0,
            opacityFrom: 0,
            opacityTo: 1,
            blurFrom: blur,
            blurTo: 0
          })),
          scrub: false,
          invalidateOnRefresh: true
        });
        scrollTrigger = { ...alignment.scrollTrigger, once: true, scrub: false };
      } else {
        scrollTrigger = {
          once: true,
          start: readString(element, "motion-start", "top 85%"),
          trigger
        };
      }

      return gsap.fromTo(
        units,
        {
          autoAlpha: 0,
          filter: `blur(${blur}px)`,
          yPercent
        },
        {
          autoAlpha: 1,
          delay,
          duration,
          ease: readString(element, "motion-ease", "power3.out"),
          filter: "blur(0px)",
          stagger,
          yPercent: 0,
          scrollTrigger
        }
      );
    };

    if (targetMode === "children") {
      const units = Array.from(element.children);
      const tween = createReveal(units);

      return () => {
        tween?.scrollTrigger?.kill();
        tween?.kill();
        if (units.length) {
          gsap.set(units, { clearProps: "filter,opacity,visibility,yPercent,transform" });
        }
      };
    }

    const split = SplitText.create(element, {
      aria: "auto",
      autoSplit: unit === "lines",
      type,
      onSplit(self) {
        const units = unit === "chars" ? self.chars : unit === "words" ? self.words : self.lines;
        return createReveal(units);
      }
    });

    return () => split.revert();
  }
};
