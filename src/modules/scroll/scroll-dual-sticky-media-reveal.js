import {
  readBoolean,
  readNumber,
  readString,
  resolveTrigger,
  selectTargets
} from "../../core/config.js";

export const SCROLL_DUAL_STICKY_MEDIA_REVEAL_DEFAULTS = Object.freeze({
  minWidth: 992,
  allowMobile: false,
  markers: false,
  backgroundStart: "top top",
  backgroundEnd: "center center",
  backgroundScrub: true,
  contentStart: "50% center",
  contentEnd: "85% bottom",
  contentScrub: 1.2,
  mediaStart: "25% center",
  mediaEnd: "85% bottom",
  mediaScrub: 1.2,
  handoffStart: "85% bottom",
  handoffEnd: "bottom bottom",
  handoffScrub: true,
  backgroundOpacityFrom: 0,
  backgroundOpacityTo: 1,
  contentYFrom: 0,
  contentYTo: 100,
  mediaScaleFrom: 1,
  mediaScaleTo: 0.4,
  mediaYFrom: 0,
  mediaYTo: -15,
  primaryMaskFrom: "100% 150%",
  primaryMaskTo: "100% 0%",
  revealMaskFrom: "100% 0%",
  revealMaskTo: "100% 150%",
  revealMaskYFrom: "200%",
  revealMaskYTo: "50%",
  ease: "none",
  handoffEase: "none",
  mediaEaseCurve: "0.5,0,0.75,0"
});

const DEFAULTS = SCROLL_DUAL_STICKY_MEDIA_REVEAL_DEFAULTS;

function configuredScrub(element, name, fallback) {
  const raw = element.getAttribute("data-" + name);
  if (raw == null || raw === "") return fallback;
  if (raw === "true") return true;
  if (raw === "false" || raw === "0") return false;

  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
}

function maskProps(size, y = null) {
  const props = {
    "--mask-size": size
  };

  if (y != null) props["--mask-y"] = y;

  return props;
}

function captureStyles(elements) {
  return [...new Set(elements.filter(Boolean))].map((element) => ({
    element,
    style: element.getAttribute("style")
  }));
}

function restoreStyles(records) {
  records.forEach(({ element, style }) => {
    if (style == null) element.removeAttribute("style");
    else element.setAttribute("style", style);
  });
}

function destroyAnimations(animations) {
  animations.forEach((animation) => {
    animation.scrollTrigger?.kill();
    animation.kill();
  });
}

function scrollConfig(root, trigger, phase, defaults) {
  return {
    trigger,
    start: readString(root, "motion-" + phase + "-start", defaults.start),
    end: readString(root, "motion-" + phase + "-end", defaults.end),
    scrub: configuredScrub(root, "motion-" + phase + "-scrub", defaults.scrub),
    markers: readBoolean(root, "motion-markers", DEFAULTS.markers)
  };
}

function addFromTo(animations, gsap, targets, fromVars, toVarsFactory) {
  targets.forEach((target) => {
    animations.push(
      gsap.fromTo(
        target,
        fromVars(target),
        toVarsFactory(target)
      )
    );
  });
}

export const scrollDualStickyMediaReveal = {
  name: "scroll-dual-sticky-media-reveal",
  category: "composition",
  selector: '[data-motion~="scroll-dual-sticky-media-reveal"]',

  mount(root, { gsap, ScrollTrigger, CustomEase, reducedMotion }) {
    if (reducedMotion()) return;

    const trigger = resolveTrigger(root);
    const backgroundTargets = selectTargets(root, "background");
    const backgroundStyles = captureStyles(backgroundTargets);
    const backgroundAnimations = [];
    const ease = readString(root, "motion-ease", DEFAULTS.ease);

    addFromTo(
      backgroundAnimations,
      gsap,
      backgroundTargets,
      () => ({
        opacity: readNumber(
          root,
          "motion-background-opacity-from",
          DEFAULTS.backgroundOpacityFrom
        ),
        translateZ: 10
      }),
      () => ({
        opacity: readNumber(
          root,
          "motion-background-opacity-to",
          DEFAULTS.backgroundOpacityTo
        ),
        translateZ: 10,
        ease,
        scrollTrigger: scrollConfig(root, trigger, "background", {
          start: DEFAULTS.backgroundStart,
          end: DEFAULTS.backgroundEnd,
          scrub: DEFAULTS.backgroundScrub
        })
      })
    );

    const minWidth = readNumber(root, "motion-min-width", DEFAULTS.minWidth);
    const mm = gsap.matchMedia();

    mm.add(
      {
        desktop: "(min-width: " + minWidth + "px)",
        mobile: "(max-width: " + (minWidth - 1) + "px)",
        reduceMotion: "(prefers-reduced-motion: reduce)"
      },
      ({ conditions }) => {
        if (conditions.reduceMotion || reducedMotion()) return;

        const desktop = Boolean(conditions.desktop);
        const allowMobile = readBoolean(root, "motion-mobile", DEFAULTS.allowMobile);
        if (!desktop && !allowMobile) return;

        const contentPrimaryTargets = selectTargets(root, "content-primary");
        const contentRevealTargets = selectTargets(root, "content-reveal");
        const contentTargets = [
          ...contentPrimaryTargets,
          ...contentRevealTargets
        ];
        const mediaTargets = selectTargets(root, "media");
        const primaryVisualTargets = selectTargets(root, "primary-visual");
        const revealVisualTargets = selectTargets(root, "reveal-visual");
        const allTargets = [
          ...contentTargets,
          ...mediaTargets,
          ...primaryVisualTargets,
          ...revealVisualTargets
        ];
        const initialStyles = captureStyles(allTargets);
        const animations = [];

        const handoffEase = readString(root, "motion-handoff-ease", DEFAULTS.handoffEase);
        const mediaEaseName = readString(root, "motion-media-ease", null);
        const mediaEase = mediaEaseName || CustomEase.create(
          "motionDualStickyMediaRevealIn",
          readString(root, "motion-media-ease-curve", DEFAULTS.mediaEaseCurve)
        );

        addFromTo(
          animations,
          gsap,
          contentTargets,
          () => ({
            yPercent: readNumber(root, "motion-content-y-from", DEFAULTS.contentYFrom),
            translateZ: 10
          }),
          () => ({
            yPercent: readNumber(root, "motion-content-y-to", DEFAULTS.contentYTo),
            translateZ: 10,
            ease,
            scrollTrigger: scrollConfig(root, trigger, "content", {
              start: DEFAULTS.contentStart,
              end: DEFAULTS.contentEnd,
              scrub: DEFAULTS.contentScrub
            })
          })
        );

        addFromTo(
          animations,
          gsap,
          mediaTargets,
          () => ({
            scale: readNumber(root, "motion-media-scale-from", DEFAULTS.mediaScaleFrom),
            yPercent: readNumber(root, "motion-media-y-from", DEFAULTS.mediaYFrom),
            translateZ: 10
          }),
          () => ({
            scale: readNumber(root, "motion-media-scale-to", DEFAULTS.mediaScaleTo),
            yPercent: readNumber(root, "motion-media-y-to", DEFAULTS.mediaYTo),
            translateZ: 10,
            ease: mediaEase,
            scrollTrigger: scrollConfig(root, trigger, "media", {
              start: DEFAULTS.mediaStart,
              end: DEFAULTS.mediaEnd,
              scrub: DEFAULTS.mediaScrub
            })
          })
        );

        const handoffTrigger = () =>
          scrollConfig(root, trigger, "handoff", {
            start: DEFAULTS.handoffStart,
            end: DEFAULTS.handoffEnd,
            scrub: DEFAULTS.handoffScrub
          });

        addFromTo(
          animations,
          gsap,
          primaryVisualTargets,
          () => ({
            ...maskProps(
              readString(root, "motion-primary-mask-from", DEFAULTS.primaryMaskFrom)
            )
          }),
          () => ({
            ...maskProps(
              readString(root, "motion-primary-mask-to", DEFAULTS.primaryMaskTo)
            ),
            ease: handoffEase,
            scrollTrigger: handoffTrigger()
          })
        );

        addFromTo(
          animations,
          gsap,
          revealVisualTargets,
          () => ({
            ...maskProps(
              readString(root, "motion-reveal-mask-from", DEFAULTS.revealMaskFrom),
              readString(root, "motion-reveal-mask-y-from", DEFAULTS.revealMaskYFrom)
            )
          }),
          () => ({
            ...maskProps(
              readString(root, "motion-reveal-mask-to", DEFAULTS.revealMaskTo),
              readString(root, "motion-reveal-mask-y-to", DEFAULTS.revealMaskYTo)
            ),
            ease: handoffEase,
            scrollTrigger: handoffTrigger()
          })
        );

        requestAnimationFrame(() => ScrollTrigger.refresh());

        return () => {
          destroyAnimations(animations);
          restoreStyles(initialStyles);
        };
      }
    );

    requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      mm.revert();
      destroyAnimations(backgroundAnimations);
      restoreStyles(backgroundStyles);
    };
  }
};
