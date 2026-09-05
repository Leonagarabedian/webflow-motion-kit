import {
  readBoolean,
  readNumber,
  readString,
  selectTarget,
  selectTargets
} from "../core/config.js";

export const pinnedSteps = {
  name: "pinned-steps",
  category: "component",
  selector: '[data-motion~="pinned-steps"]',
  mount(element, { gsap }) {
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

        const timeline = gsap.timeline({
          defaults: { duration: 1, ease: "none" },
          scrollTrigger: {
            end: readString(element, "motion-end", "bottom bottom"),
            pin: readBoolean(element, "motion-pin", false) ? sticky : false,
            scrub: readNumber(element, "motion-scrub", 1),
            start: readString(element, "motion-start", "top top"),
            trigger: element
          }
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
