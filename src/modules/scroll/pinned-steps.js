import { scrollMode } from "../../core/scroll-alignment/contract.js";
import {
  readBoolean,
  readNumber,
  readString,
  selectTarget,
  selectTargets
} from "../../core/config.js";

function buildPinnedStepStages(panels) {
  return Array.from({ length: Math.max(1, panels.length - 1) }, (_, index) => ({
    name: `pinned-step-${index + 2}`,
    start: index,
    end: index + 1,
    duration: 1,
    target: panels[index + 1],
    yPercentFrom: 100,
    yPercentTo: 0,
    opacityFrom: 0,
    opacityTo: 1
  }));
}

export const pinnedSteps = {
  name: "pinned-steps",
  category: "component",
  selector: '[data-motion~="pinned-steps"]',
  mount(element, { gsap, scrollAlignment }) {
    const panels = [...element.querySelectorAll("[data-motion-step]")];
    const progress = selectTargets(element, "progress");
    const sticky = selectTarget(element, "sticky", element);
    if (panels.length < 2) return;

    const minWidth = readNumber(element, "motion-min-width", 992);
    const mm = gsap.matchMedia();
    mm.add(
      {
        desktop: `(min-width: ${minWidth}px)`,
        reduceMotion: "(prefers-reduced-motion: reduce)"
      },
      ({ conditions }) => {
        if (!conditions.desktop || conditions.reduceMotion) {
          gsap.set(panels, { autoAlpha: 1, clearProps: "transform" });
          return;
        }

        gsap.set(panels, { autoAlpha: 0, yPercent: 100 });
        gsap.set(panels[0], { autoAlpha: 1, yPercent: 0 });
        if (progress.length) {
          gsap.set(progress, { scaleX: 0, transformOrigin: "left center" });
        }

        const scrub = readNumber(element, "motion-scrub", 1);
        const pinEnabled = readBoolean(element, "motion-pin", false);
        const mode = scrollMode(element);
        const scrollTrigger = mode === "auto"
          ? scrollAlignment.build(element, {
              mode: "auto",
              id: readString(element, "motion-alignment-id", "pinned-steps"),
              trigger: element,
              profile: "spatial",
              stages: buildPinnedStepStages(panels),
              scrub: element.hasAttribute("data-motion-scrub") ? scrub : true,
              pin: pinEnabled ? { enabled: true, target: sticky } : false,
              invalidateOnRefresh: true,
              emphasis: 1.15
            }).scrollTrigger
          : {
              end: readString(element, "motion-end", "bottom bottom"),
              pin: pinEnabled ? sticky : false,
              scrub,
              start: readString(element, "motion-start", "top top"),
              trigger: element
            };

        const timeline = gsap.timeline({
          defaults: { duration: 1, ease: "none" },
          scrollTrigger
        });

        panels.slice(1).forEach((panel, index) => {
          const at = index;
          timeline
            .to(panels[index], { autoAlpha: 0, yPercent: -15 }, at)
            .fromTo(
              panel,
              { autoAlpha: 0, yPercent: 100 },
              { autoAlpha: 1, yPercent: 0 },
              at
            );
          if (progress[index]) timeline.to(progress[index], { scaleX: 1 }, at);
        });

        return () => {
          timeline.kill();
          gsap.set([...panels, ...progress], { clearProps: "all" });
        };
      }
    );

    return () => mm.revert();
  }
};
