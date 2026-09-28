import {
  readBoolean,
  readNumber,
  readString,
  resolveTrigger,
  selectTarget,
  selectTargets
} from "../../core/config.js";

export const SCROLL_MEDIA_SCALE_REVEAL_DEFAULTS = Object.freeze({
  minWidth: 992,
  allowMobile: false,
  markers: false,
  backgroundStart: "top top",
  backgroundEnd: "center center",
  backgroundScrub: true,
  contentStart: "50% center",
  contentEnd: "85% bottom",
  contentScrub: 1.2,
  primaryStart: "25% center",
  primaryEnd: "85% bottom",
  primaryScrub: 1.2,
  handoffStart: "85% bottom",
  handoffEnd: "bottom bottom",
  handoffScrub: true,
  backgroundOpacityFrom: 0,
  backgroundOpacityTo: 1,
  contentYFrom: 0,
  contentYTo: 100,
  primaryScaleFrom: 1,
  primaryScaleTo: 0.4,
  primaryYFrom: 0,
  primaryYTo: -15,
  primaryXFrom: 0,
  primaryXTo: 0,
  primaryOpacityFrom: 1,
  primaryOpacityTo: 1,
  primaryMaskFrom: "100% 150%",
  primaryMaskTo: "100% 0%",
  revealOpacityFrom: 1,
  revealOpacityTo: 1,
  revealMaskFrom: "100% 0%",
  revealMaskTo: "100% 150%",
  revealMaskYFrom: "200%",
  revealMaskYTo: "50%",
  ease: "none",
  handoffEase: "none",
  primaryEaseCurve: "0.5,0,0.75,0"
});

const DEFAULTS = SCROLL_MEDIA_SCALE_REVEAL_DEFAULTS;

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

export const scrollMediaScaleReveal = {
  name: "scroll-media-scale-reveal",
  category: "composition",
  selector: '[data-motion~="scroll-media-scale-reveal"]',

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
        const panels = selectTargets(root, "content-panel");
        const primary = selectTarget(root, "primary", null);
        const primaryImage = selectTarget(root, "primary-image", null);
        const reveal = selectTarget(root, "reveal", null);
        const allTargets = [background, ...panels, primary, primaryImage, reveal];
        const initialStyles = captureStyles(allTargets);
        const animations = [];

        const ease = readString(root, "motion-ease", DEFAULTS.ease);
        const handoffEase = readString(root, "motion-handoff-ease", DEFAULTS.handoffEase);
        const primaryEaseName = readString(root, "motion-primary-ease", null);
        const primaryEase = primaryEaseName || CustomEase.create(
          "motionMediaScaleRevealIn",
          readString(root, "motion-primary-ease-curve", DEFAULTS.primaryEaseCurve)
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

        if (panels.length) {
          animations.push(
            gsap.fromTo(
              panels,
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

        if (primary) {
          animations.push(
            gsap.fromTo(
              primary,
              {
                scale: readNumber(root, "motion-primary-scale-from", DEFAULTS.primaryScaleFrom),
                xPercent: readNumber(root, "motion-primary-x-from", DEFAULTS.primaryXFrom),
                yPercent: readNumber(root, "motion-primary-y-from", DEFAULTS.primaryYFrom),
                translateZ: 10
              },
              {
                scale: readNumber(root, "motion-primary-scale-to", DEFAULTS.primaryScaleTo),
                xPercent: readNumber(root, "motion-primary-x-to", DEFAULTS.primaryXTo),
                yPercent: readNumber(root, "motion-primary-y-to", DEFAULTS.primaryYTo),
                translateZ: 10,
                ease: primaryEase,
                scrollTrigger: scrollConfig(root, trigger, "primary", {
                  start: DEFAULTS.primaryStart,
                  end: DEFAULTS.primaryEnd,
                  scrub: DEFAULTS.primaryScrub
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

        if (primaryImage) {
          animations.push(
            gsap.fromTo(
              primaryImage,
              {
                opacity: readNumber(
                  root,
                  "motion-primary-opacity-from",
                  DEFAULTS.primaryOpacityFrom
                ),
                ...maskProps(
                  readString(root, "motion-primary-mask-from", DEFAULTS.primaryMaskFrom)
                )
              },
              {
                opacity: readNumber(
                  root,
                  "motion-primary-opacity-to",
                  DEFAULTS.primaryOpacityTo
                ),
                ...maskProps(readString(root, "motion-primary-mask-to", DEFAULTS.primaryMaskTo)),
                ease: handoffEase,
                scrollTrigger: handoffTrigger()
              }
            )
          );
        }

        if (reveal) {
          animations.push(
            gsap.fromTo(
              reveal,
              {
                opacity: readNumber(
                  root,
                  "motion-reveal-opacity-from",
                  DEFAULTS.revealOpacityFrom
                ),
                ...maskProps(
                  readString(root, "motion-reveal-mask-from", DEFAULTS.revealMaskFrom),
                  readString(root, "motion-reveal-mask-y-from", DEFAULTS.revealMaskYFrom)
                )
              },
              {
                opacity: readNumber(
                  root,
                  "motion-reveal-opacity-to",
                  DEFAULTS.revealOpacityTo
                ),
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
