import {
  readBoolean,
  readNumber,
  readString,
  resolveTrigger,
  selectTargets
} from "../../core/config.js";

const DEFAULTS = Object.freeze({
  minWidth: 992,
  scrub: true,
  start: "top bottom",
  end: "bottom top",
  yFrom: "-50vh",
  yTo: "-200vh",
  ease: "none"
});

function configuredScrub(element) {
  const raw = element.getAttribute("data-motion-scrub");
  if (raw == null || raw === "" || raw === "true") return DEFAULTS.scrub;
  if (raw === "false" || raw === "0") return false;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : DEFAULTS.scrub;
}

function collectLiftItems(root) {
  const descendants = selectTargets(root, "lift-item");
  return root.getAttribute("data-motion-target") === "lift-item"
    ? [root, ...descendants]
    : descendants;
}

function cleanupTween(gsap, tween) {
  const targets = tween.targets?.() ?? [];
  tween.scrollTrigger?.kill();
  tween.kill();
  if (targets.length) {
    gsap.set(targets, { clearProps: "transform,willChange" });
  }
}

export const scrollSectionLift = {
  name: "scroll-section-lift",
  category: "scroll",
  selector: '[data-motion~="scroll-section-lift"]',

  mount(root, { gsap, ScrollTrigger, reducedMotion }) {
    if (reducedMotion()) return;

    const minWidth = readNumber(root, "motion-min-width", DEFAULTS.minWidth);
    const mm = gsap.matchMedia();

    mm.add(
      {
        desktop: `(min-width: ${minWidth}px)`,
        mobile: `(max-width: ${minWidth - 1}px)`,
        reduceMotion: "(prefers-reduced-motion: reduce)"
      },
      ({ conditions }) => {
        if (conditions.reduceMotion || reducedMotion()) return;

        const desktop = Boolean(conditions.desktop);
        const allowMobile = readBoolean(root, "motion-mobile", false);
        if (!desktop && !allowMobile) return;

        const targets = collectLiftItems(root);
        if (!targets.length) return;

        const triggerElement = resolveTrigger(root);
        const tween = gsap.fromTo(
          targets,
          {
            y: readString(root, "motion-y-from", DEFAULTS.yFrom),
            translateZ: 10,
            willChange: "transform"
          },
          {
            y: readString(root, "motion-y-to", DEFAULTS.yTo),
            translateZ: 10,
            ease: readString(root, "motion-ease", DEFAULTS.ease),
            scrollTrigger: {
              trigger: triggerElement,
              start: readString(root, "motion-start", DEFAULTS.start),
              end: readString(root, "motion-end", DEFAULTS.end),
              scrub: configuredScrub(root),
              invalidateOnRefresh: true,
              markers: readBoolean(root, "motion-markers", false)
            }
          }
        );

        ScrollTrigger.refresh();

        return () => cleanupTween(gsap, tween);
      }
    );

    return () => mm.revert();
  }
};
