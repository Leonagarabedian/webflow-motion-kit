import {
  readBoolean,
  readNumber,
  readString,
  resolveTrigger,
  selectTarget,
  selectTargets
} from "../../core/config.js";

const DEFAULTS = Object.freeze({
  minWidth: 992,
  allowMobile: false,
  markers: false,
  timelineStart: "top top",
  timelineEnd: "bottom bottom",
  backgroundOpacityFrom: 0,
  backgroundOpacityTo: 1,
  contentYFrom: 0,
  contentYTo: 100,
  primaryScaleFrom: 1,
  primaryScaleTo: 0.4,
  primaryYFrom: 0,
  primaryYTo: -15,
  primaryOpacityFrom: 1,
  primaryOpacityTo: 0,
  primaryMaskFrom: "100% 150%",
  primaryMaskTo: "100% 150%",
  revealOpacityFrom: 0,
  revealOpacityTo: 1,
  revealMaskFrom: "100% 0%",
  revealMaskTo: "100% 150%",
  revealMaskYFrom: "200%",
  revealMaskYTo: "50%",
  backgroundAt: 0,
  backgroundDuration: 0.28,
  contentAt: 0.28,
  contentDuration: 0.44,
  primaryAt: 0.18,
  primaryDuration: 0.54,
  handoffAt: 0.78,
  handoffDuration: 0.22,
  ease: "none",
  primaryEase: "none",
  handoffEase: "none"
});

function configuredScrub(element, name, fallback) {
  const raw = element.getAttribute(`data-${name}`);
  if (raw == null || raw === "") return fallback;
  if (raw === "true") return true;
  if (raw === "false" || raw === "0") return false;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
}

function normalizedPosition(element, name, fallback) {
  const value = readNumber(element, name, fallback);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

function normalizedDuration(element, name, fallback) {
  const value = readNumber(element, name, fallback);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0.01, Math.min(1, value));
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

function cleanup(gsap, animations, targets) {
  animations.forEach((animation) => {
    animation.scrollTrigger?.kill();
    animation.kill();
  });

  const uniqueTargets = [...new Set(targets.filter(Boolean))];
  if (uniqueTargets.length) {
    gsap.set(uniqueTargets, {
      clearProps:
        "opacity,transform,willChange,webkitMaskSize,maskSize,webkitMaskPosition,maskPosition,--motion-mask-size,--motion-mask-y,--mask-size,--mask-y"
    });
  }
}

export const scrollMediaScaleReveal = {
  name: "scroll-media-scale-reveal",
  category: "composition",
  selector: '[data-motion~="scroll-media-scale-reveal"]',

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
        const allowMobile = readBoolean(root, "motion-mobile", DEFAULTS.allowMobile);
        if (!desktop && !allowMobile) return;

        const trigger = resolveTrigger(root);
        const markers = readBoolean(root, "motion-markers", DEFAULTS.markers);
        const ease = readString(root, "motion-ease", DEFAULTS.ease);
        const primaryEase = readString(root, "motion-primary-ease", DEFAULTS.primaryEase);
        const handoffEase = readString(root, "motion-handoff-ease", DEFAULTS.handoffEase);

        const background = selectTarget(root, "background", null);
        const panels = selectTargets(root, "content-panel");
        const primary = selectTarget(root, "primary", null);
        const primaryImage = selectTarget(root, "primary-image", null);
        const reveal = selectTarget(root, "reveal", null);

        const backgroundAt = normalizedPosition(root, "motion-background-at", DEFAULTS.backgroundAt);
        const backgroundDuration = normalizedDuration(root, "motion-background-duration", DEFAULTS.backgroundDuration);
        const contentAt = normalizedPosition(root, "motion-content-at", DEFAULTS.contentAt);
        const contentDuration = normalizedDuration(root, "motion-content-duration", DEFAULTS.contentDuration);
        const primaryAt = normalizedPosition(root, "motion-primary-at", DEFAULTS.primaryAt);
        const primaryDuration = normalizedDuration(root, "motion-primary-duration", DEFAULTS.primaryDuration);
        const handoffAt = normalizedPosition(root, "motion-handoff-at", DEFAULTS.handoffAt);
        const handoffDuration = normalizedDuration(root, "motion-handoff-duration", DEFAULTS.handoffDuration);

        const animations = [];
        const targets = [background, ...panels, primary, primaryImage, reveal];

        if (background) {
          gsap.set(background, {
            opacity: readNumber(root, "motion-background-opacity-from", DEFAULTS.backgroundOpacityFrom),
            translateZ: 10,
            willChange: "opacity"
          });
        }

        if (panels.length) {
          gsap.set(panels, {
            yPercent: readNumber(root, "motion-content-y-from", DEFAULTS.contentYFrom),
            translateZ: 10,
            willChange: "transform"
          });
        }

        if (primary) {
          gsap.set(primary, {
            scale: readNumber(root, "motion-primary-scale-from", DEFAULTS.primaryScaleFrom),
            yPercent: readNumber(root, "motion-primary-y-from", DEFAULTS.primaryYFrom),
            translateZ: 10,
            willChange: "transform"
          });
        }

        if (primaryImage) {
          gsap.set(primaryImage, {
            opacity: readNumber(root, "motion-primary-opacity-from", DEFAULTS.primaryOpacityFrom),
            ...maskProps(readString(root, "motion-primary-mask-from", DEFAULTS.primaryMaskFrom)),
            willChange: "opacity, -webkit-mask-size, mask-size"
          });
        }

        if (reveal) {
          gsap.set(reveal, {
            opacity: readNumber(root, "motion-reveal-opacity-from", DEFAULTS.revealOpacityFrom),
            ...maskProps(
              readString(root, "motion-reveal-mask-from", DEFAULTS.revealMaskFrom),
              readString(root, "motion-reveal-mask-y-from", DEFAULTS.revealMaskYFrom)
            ),
            willChange: "opacity, -webkit-mask-size, mask-size, -webkit-mask-position, mask-position"
          });
        }

        const timeline = gsap.timeline({
          defaults: { ease },
          scrollTrigger: {
            trigger,
            start: readString(root, "motion-start", DEFAULTS.timelineStart),
            end: readString(root, "motion-end", DEFAULTS.timelineEnd),
            scrub: configuredScrub(root, "motion-scrub", 1.2),
            invalidateOnRefresh: true,
            markers
          }
        });

        if (background) {
          timeline.to(
            background,
            {
              opacity: readNumber(root, "motion-background-opacity-to", DEFAULTS.backgroundOpacityTo),
              duration: backgroundDuration
            },
            backgroundAt
          );
        }

        if (panels.length) {
          timeline.to(
            panels,
            {
              yPercent: readNumber(root, "motion-content-y-to", DEFAULTS.contentYTo),
              duration: contentDuration
            },
            contentAt
          );
        }

        if (primary) {
          timeline.to(
            primary,
            {
              scale: readNumber(root, "motion-primary-scale-to", DEFAULTS.primaryScaleTo),
              yPercent: readNumber(root, "motion-primary-y-to", DEFAULTS.primaryYTo),
              ease: primaryEase,
              duration: primaryDuration
            },
            primaryAt
          );
        }

        if (primaryImage) {
          timeline.to(
            primaryImage,
            {
              opacity: readNumber(root, "motion-primary-opacity-to", DEFAULTS.primaryOpacityTo),
              ...maskProps(readString(root, "motion-primary-mask-to", DEFAULTS.primaryMaskTo)),
              ease: handoffEase,
              duration: handoffDuration
            },
            handoffAt
          );
        }

        if (reveal) {
          timeline.to(
            reveal,
            {
              opacity: readNumber(root, "motion-reveal-opacity-to", DEFAULTS.revealOpacityTo),
              ...maskProps(
                readString(root, "motion-reveal-mask-to", DEFAULTS.revealMaskTo),
                readString(root, "motion-reveal-mask-y-to", DEFAULTS.revealMaskYTo)
              ),
              ease: handoffEase,
              duration: handoffDuration
            },
            handoffAt
          );
        }

        animations.push(timeline);
        ScrollTrigger.refresh();

        return () => cleanup(gsap, animations, targets);
      }
    );

    return () => mm.revert();
  }
};
