import {
  readBoolean,
  readNumber,
  readString,
  resolveTrigger,
  selectTarget
} from "../../core/config.js";

const DEFAULTS = Object.freeze({
  minWidth: 992,
  scrub: true,
  start: "top center",
  end: "bottom center",
  direction: "up",
  mode: "reveal",
  ease: "none",
  baseScaleFrom: 1,
  baseScaleTo: 1.03,
  revealScaleFrom: 1.08,
  revealScaleTo: 1,
  baseOpacityFrom: 1,
  baseOpacityTo: 1,
  revealOpacityFrom: 1,
  revealOpacityTo: 1
});

const FULL_CLIP = "inset(0% 0% 0% 0%)";
const SUPPORTED_MODES = new Set(["reveal", "swap"]);

const CLIPS = Object.freeze({
  up: {
    revealHidden: "inset(100% 0% 0% 0%)",
    baseHidden: "inset(0% 0% 100% 0%)"
  },
  down: {
    revealHidden: "inset(0% 0% 100% 0%)",
    baseHidden: "inset(100% 0% 0% 0%)"
  },
  left: {
    revealHidden: "inset(0% 100% 0% 0%)",
    baseHidden: "inset(0% 0% 0% 100%)"
  },
  right: {
    revealHidden: "inset(0% 0% 0% 100%)",
    baseHidden: "inset(0% 100% 0% 0%)"
  }
});

function configuredScrub(element) {
  const raw = element.getAttribute("data-motion-scrub");
  if (raw == null || raw === "" || raw === "true") return DEFAULTS.scrub;
  if (raw === "false" || raw === "0") return false;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : DEFAULTS.scrub;
}

function configuredClips(root) {
  const direction = readString(root, "motion-direction", DEFAULTS.direction).toLowerCase();
  return CLIPS[direction] ?? CLIPS[DEFAULTS.direction];
}

function configuredMode(root) {
  const mode = readString(root, "motion-mode", DEFAULTS.mode).toLowerCase();
  return SUPPORTED_MODES.has(mode) ? mode : DEFAULTS.mode;
}

function clipProps(value) {
  return {
    clipPath: value,
    webkitClipPath: value
  };
}

function cleanupTimeline(gsap, timeline) {
  const targets = timeline.getChildren(false, true, false).flatMap((tween) => tween.targets?.() ?? []);
  timeline.scrollTrigger?.kill();
  timeline.kill();
  if (targets.length) {
    gsap.set(targets, { clearProps: "clipPath,webkitClipPath,transform,opacity,willChange" });
  }
}

export const scrollMediaMaskSwitch = {
  name: "scroll-media-mask-switch",
  category: "composition",
  selector: '[data-motion~="scroll-media-mask-switch"]',

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

        const baseLayer = selectTarget(root, "base-layer", null);
        const revealLayer = selectTarget(root, "reveal-layer", null);
        if (!baseLayer && !revealLayer) return;

        const clips = configuredClips(root);
        const mode = configuredMode(root);
        const triggerElement = resolveTrigger(root);

        const timeline = gsap.timeline({
          defaults: {
            ease: readString(root, "motion-ease", DEFAULTS.ease)
          },
          scrollTrigger: {
            trigger: triggerElement,
            start: readString(root, "motion-start", DEFAULTS.start),
            end: readString(root, "motion-end", DEFAULTS.end),
            scrub: configuredScrub(root),
            invalidateOnRefresh: true,
            markers: readBoolean(root, "motion-markers", false)
          }
        });

        if (baseLayer) {
          const baseToClip = mode === "swap" ? clips.baseHidden : FULL_CLIP;
          timeline.fromTo(
            baseLayer,
            {
              ...clipProps(FULL_CLIP),
              scale: readNumber(root, "motion-base-scale-from", DEFAULTS.baseScaleFrom),
              opacity: readNumber(root, "motion-base-opacity-from", DEFAULTS.baseOpacityFrom),
              willChange: "clip-path, transform, opacity"
            },
            {
              ...clipProps(baseToClip),
              scale: readNumber(root, "motion-base-scale-to", DEFAULTS.baseScaleTo),
              opacity: readNumber(root, "motion-base-opacity-to", DEFAULTS.baseOpacityTo)
            },
            0
          );
        }

        if (revealLayer) {
          timeline.fromTo(
            revealLayer,
            {
              ...clipProps(clips.revealHidden),
              scale: readNumber(root, "motion-reveal-scale-from", DEFAULTS.revealScaleFrom),
              opacity: readNumber(root, "motion-reveal-opacity-from", DEFAULTS.revealOpacityFrom),
              willChange: "clip-path, transform, opacity"
            },
            {
              ...clipProps(FULL_CLIP),
              scale: readNumber(root, "motion-reveal-scale-to", DEFAULTS.revealScaleTo),
              opacity: readNumber(root, "motion-reveal-opacity-to", DEFAULTS.revealOpacityTo)
            },
            0
          );
        }

        ScrollTrigger.refresh();

        return () => cleanupTimeline(gsap, timeline);
      }
    );

    return () => mm.revert();
  }
};
