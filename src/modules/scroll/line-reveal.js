import { scrollMode } from "../../core/scroll-alignment/contract.js";
import {
  readBoolean,
  readNumber,
  readString,
  resolveTrigger
} from "../../core/config.js";

function buildLineRevealStages(lines, {
  duration,
  stagger,
  delay,
  xPx,
  useXPx,
  yPercent,
  yPx,
  useYPx,
  fade
}) {
  return Array.from({ length: lines.length }, (_, index) => {
    const start = delay + index * stagger;
    return {
      name: `line-reveal-${index + 1}`,
      start,
      end: start + duration,
      duration,
      target: lines[index],
      xFrom: useXPx ? xPx : 0,
      xTo: 0,
      yFrom: useYPx ? yPx : 0,
      yTo: 0,
      yPercentFrom: useYPx ? 0 : yPercent,
      yPercentTo: 0,
      opacityFrom: fade ? 0 : 1,
      opacityTo: 1
    };
  });
}

export const lineReveal = {
  name: "line-reveal",
  category: "primitive",
  selector: '[data-motion~="line-reveal"]',
  mount(element, { gsap, SplitText, reducedMotion, scrollAlignment }) {
    if (reducedMotion()) {
      gsap.set(element, { autoAlpha: 1 });
      return;
    }

    const trigger = resolveTrigger(element);
    const duration = readNumber(element, "motion-duration", 1);
    const stagger = readNumber(element, "motion-stagger", 0.08);
    const delay = Math.max(0, readNumber(element, "motion-delay", 0));
    const xPx = readNumber(element, "motion-x-px", 0);
    const useXPx = element.hasAttribute("data-motion-x-px");
    const yPercent = readNumber(element, "motion-y", 110);
    const yPx = readNumber(element, "motion-y-px", 0);
    const useYPx = element.hasAttribute("data-motion-y-px");
    const fade = readBoolean(element, "motion-opacity", false);
    const start = readString(element, "motion-start", "top 85%");
    const end = readString(element, "motion-end", "top 55%");
    const ease = readString(element, "motion-ease", "power4.out");
    const once = readBoolean(element, "motion-once", true);
    const revealMode = readString(element, "motion-line-mode", "translate");
    const maskOnly = revealMode === "mask";
    const scrubRaw = element.getAttribute("data-motion-scrub");
    const scrub = scrubRaw === "false" ? false : readNumber(element, "motion-scrub", 0.65);
    const mode = scrollMode(element);

    if (!maskOnly) element.style.willChange = "transform, opacity";

    const split = SplitText.create(element, {
      aria: "auto",
      autoSplit: true,
      mask: "lines",
      type: "lines",
      onSplit(self) {
        const stages = buildLineRevealStages(self.lines, {
          duration,
          stagger,
          delay,
          xPx: maskOnly ? 0 : xPx,
          useXPx: maskOnly ? false : useXPx,
          yPercent: maskOnly ? 0 : yPercent,
          yPx: maskOnly ? 0 : yPx,
          useYPx: maskOnly ? false : useYPx,
          fade: maskOnly ? false : fade
        });

        let scrollTrigger;
        if (mode === "auto") {
          const alignment = scrollAlignment.build(element, {
            mode: "auto",
            id: readString(element, "motion-alignment-id", "line-reveal"),
            trigger,
            profile: "reveal",
            stages,
            scrub: maskOnly ? scrub : false,
            invalidateOnRefresh: true
          });

          scrollTrigger = maskOnly
            ? {
                ...alignment.scrollTrigger,
                scrub,
                ...((scrub === false) && {
                  once,
                  ...(!once && { toggleActions: "play none none reverse" })
                })
              }
            : {
                ...alignment.scrollTrigger,
                once,
                scrub: false,
                ...(!once && { toggleActions: "play none none reverse" })
              };
        } else {
          scrollTrigger = maskOnly
            ? {
                trigger,
                start,
                end,
                scrub,
                invalidateOnRefresh: true,
                ...((scrub === false) && {
                  once,
                  ...(!once && { toggleActions: "play none none reverse" })
                })
              }
            : {
                trigger,
                start,
                once,
                ...(!once && { toggleActions: "play none none reverse" })
              };
        }

        if (maskOnly) {
          return gsap.fromTo(
            self.lines,
            { clipPath: "inset(100% 0% 0% 0%)" },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              delay,
              duration,
              ease: scrub === false ? ease : "none",
              stagger,
              scrollTrigger
            }
          );
        }

        const fromState = useYPx ? { y: yPx } : { yPercent };
        if (useXPx) fromState.x = xPx;
        if (fade) fromState.autoAlpha = 0;

        return gsap.fromTo(
          self.lines,
          fromState,
          {
            delay,
            duration,
            ease,
            stagger,
            x: 0,
            y: 0,
            yPercent: 0,
            ...(fade ? { autoAlpha: 1 } : {}),
            scrollTrigger
          }
        );
      }
    });

    return () => {
      split.revert();
      element.style.willChange = "";
    };
  }
};
