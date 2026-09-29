import {
  readBoolean,
  readNumber,
  readString,
  resolveTrigger,
  selectTarget
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
    "--motion-mask-size": size,
    "--mask-size": size,
    webkitMaskSize: "var(--motion-mask-size)",
    maskSize: "var(--motion-mask-size)"
  };

  if (y != null) {
    props["--motion-mask-y"] = y;
    props["--mask-y"] = y;
    props.webkitMaskPosition = "50% var(--motion-mask-y)";
    props.maskPosition = "50% var(--motion-mask-y)";
  }

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
    invalidateOnRefresh: true,
    markers: readBoolean(root, "motion-markers", DEFAULTS.markers)
  };
}

export const scrollDualStickyMediaReveal = {
  name: "scroll-dual-sticky-media-reveal",
  category: "composition",
  selector: '[data-motion~="scroll-dual-sticky-media-reveal"]',

  mount(root, { gsap, ScrollTrigger, CustomEase, reducedMotion }) {
    if (reducedMotion()) return;

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

        const trigger = resolveTrigger(root);
        const background = selectTarget(root, "background", null);
        const contentPrimary = selectTarget(root, "content-primary", null);
        const contentReveal = selectTarget(root, "content-reveal", null);
        const media = selectTarget(root, "media", null);
        const primaryVisual = selectTarget(root, "primary-visual", null);
        const revealVisual = selectTarget(root, "reveal-visual", null);
        const contentStates = [contentPrimary, contentReveal].filter(Boolean);
        const allTargets = [
          background,
          contentPrimary,
          contentReveal,
          media,
          primaryVisual,
          revealVisual
        ];
        const initialStyles = captureStyles(allTargets);
        const animations = [];

        const ease = readString(root, "motion-ease", DEFAULTS.ease);
        const handoffEase = readString(root, "motion-handoff-ease", DEFAULTS.handoffEase);
        const mediaEaseName = readString(root, "motion-media-ease", null);
        const mediaEase = mediaEaseName || CustomEase.create(
          "motionDualStickyMediaRevealIn",
          readString(root, "motion-media-ease-curve", DEFAULTS.mediaEaseCurve)
        );

        if (background) {
          animations.push(
            gsap.fromTo(
              background,
              {
                opacity: readNumber(
                  root,
                  "motion-background-opacity-from",
                  DEFAULTS.backgroundOpacityFrom
                ),
                translateZ: 10
              },
              {
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
              }
            )
          );
        }

        if (contentStates.length) {
          animations.push(
            gsap.fromTo(
              contentStates,
              {
                yPercent: readNumber(root, "motion-content-y-from", DEFAULTS.contentYFrom),
                translateZ: 10
              },
              {
                yPercent: readNumber(root, "motion-content-y-to", DEFAULTS.contentYTo),
                translateZ: 10,
                ease,
                scrollTrigger: scrollConfig(root, trigger, "content", {
                  start: DEFAULTS.contentStart,
                  end: DEFAULTS.contentEnd,
                  scrub: DEFAULTS.contentScrub
                })
              }
            )
          );
        }

        if (media) {
          animations.push(
            gsap.fromTo(
              media,
              {
                scale: readNumber(root, "motion-media-scale-from", DEFAULTS.mediaScaleFrom),
                yPercent: readNumber(root, "motion-media-y-from", DEFAULTS.mediaYFrom),
                translateZ: 10
              },
              {
                scale: readNumber(root, "motion-media-scale-to", DEFAULTS.mediaScaleTo),
                yPercent: readNumber(root, "motion-media-y-to", DEFAULTS.mediaYTo),
                translateZ: 10,
                ease: mediaEase,
                scrollTrigger: scrollConfig(root, trigger, "media", {
                  start: DEFAULTS.mediaStart,
                  end: DEFAULTS.mediaEnd,
                  scrub: DEFAULTS.mediaScrub
                })
              }
            )
          );
        }

        const handoffTrigger = () =>
          scrollConfig(root, trigger, "handoff", {
            start: DEFAULTS.handoffStart,
            end: DEFAULTS.handoffEnd,
            scrub: DEFAULTS.handoffScrub
          });

        if (primaryVisual) {
          animations.push(
            gsap.fromTo(
              primaryVisual,
              {
                ...maskProps(
                  readString(root, "motion-primary-mask-from", DEFAULTS.primaryMaskFrom)
                )
              },
              {
                ...maskProps(
                  readString(root, "motion-primary-mask-to", DEFAULTS.primaryMaskTo)
                ),
                ease: handoffEase,
                scrollTrigger: handoffTrigger()
              }
            )
          );
        }

        if (revealVisual) {
          animations.push(
            gsap.fromTo(
              revealVisual,
              {
                ...maskProps(
                  readString(root, "motion-reveal-mask-from", DEFAULTS.revealMaskFrom),
                  readString(root, "motion-reveal-mask-y-from", DEFAULTS.revealMaskYFrom)
                )
              },
              {
                ...maskProps(
                  readString(root, "motion-reveal-mask-to", DEFAULTS.revealMaskTo),
                  readString(root, "motion-reveal-mask-y-to", DEFAULTS.revealMaskYTo)
                ),
                ease: handoffEase,
                scrollTrigger: handoffTrigger()
              }
            )
          );
        }

        ScrollTrigger.refresh();

        return () => {
          destroyAnimations(animations);
          restoreStyles(initialStyles);
        };
      }
    );

    return () => mm.revert();
  }
};
