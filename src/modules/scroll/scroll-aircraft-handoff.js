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
  backgroundStart: "top top",
  backgroundEnd: "center center",
  contentStart: "50% center",
  contentEnd: "85% bottom",
  aircraftStart: "25% center",
  aircraftEnd: "85% bottom",
  maskStart: "85% bottom",
  maskEnd: "bottom bottom",
  backgroundOpacityFrom: 0,
  backgroundOpacityTo: 1,
  contentYFrom: 0,
  contentYTo: 100,
  aircraftScaleFrom: 1,
  aircraftScaleTo: 0.4,
  aircraftYFrom: 0,
  aircraftYTo: -15,
  aircraftMaskFrom: "100% 150%",
  aircraftMaskTo: "100% 0%",
  blueprintMaskFrom: "100% 0%",
  blueprintMaskTo: "100% 150%",
  blueprintMaskYFrom: "200%",
  blueprintMaskYTo: "50%",
  ease: "none",
  aircraftEase: "power2.in"
});

function configuredScrub(element, name, fallback) {
  const raw = element.getAttribute(`data-${name}`);
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

export const scrollAircraftHandoff = {
  name: "scroll-aircraft-handoff",
  category: "composition",
  selector: '[data-motion~="scroll-aircraft-handoff"]',

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
        const aircraftEase = readString(root, "motion-aircraft-ease", DEFAULTS.aircraftEase);

        const background = selectTarget(root, "background", null);
        const panels = selectTargets(root, "content-panel");
        const aircraft = selectTarget(root, "aircraft", null);
        const aircraftImage = selectTarget(root, "aircraft-image", null);
        const blueprint = selectTarget(root, "blueprint", null);

        const animations = [];
        const targets = [background, ...panels, aircraft, aircraftImage, blueprint];

        if (background) {
          animations.push(
            gsap.fromTo(
              background,
              {
                opacity: readNumber(root, "motion-background-opacity-from", DEFAULTS.backgroundOpacityFrom),
                translateZ: 10,
                willChange: "opacity"
              },
              {
                opacity: readNumber(root, "motion-background-opacity-to", DEFAULTS.backgroundOpacityTo),
                translateZ: 10,
                ease,
                scrollTrigger: {
                  trigger,
                  start: readString(root, "motion-background-start", DEFAULTS.backgroundStart),
                  end: readString(root, "motion-background-end", DEFAULTS.backgroundEnd),
                  scrub: configuredScrub(root, "motion-background-scrub", true),
                  invalidateOnRefresh: true,
                  markers
                }
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
                translateZ: 10,
                willChange: "transform"
              },
              {
                yPercent: readNumber(root, "motion-content-y-to", DEFAULTS.contentYTo),
                translateZ: 10,
                ease,
                scrollTrigger: {
                  trigger,
                  start: readString(root, "motion-content-start", DEFAULTS.contentStart),
                  end: readString(root, "motion-content-end", DEFAULTS.contentEnd),
                  scrub: configuredScrub(root, "motion-content-scrub", 1.2),
                  invalidateOnRefresh: true,
                  markers
                }
              }
            )
          );
        }

        if (aircraft) {
          animations.push(
            gsap.fromTo(
              aircraft,
              {
                scale: readNumber(root, "motion-aircraft-scale-from", DEFAULTS.aircraftScaleFrom),
                yPercent: readNumber(root, "motion-aircraft-y-from", DEFAULTS.aircraftYFrom),
                translateZ: 10,
                willChange: "transform"
              },
              {
                scale: readNumber(root, "motion-aircraft-scale-to", DEFAULTS.aircraftScaleTo),
                yPercent: readNumber(root, "motion-aircraft-y-to", DEFAULTS.aircraftYTo),
                translateZ: 10,
                ease: aircraftEase,
                scrollTrigger: {
                  trigger,
                  start: readString(root, "motion-aircraft-start", DEFAULTS.aircraftStart),
                  end: readString(root, "motion-aircraft-end", DEFAULTS.aircraftEnd),
                  scrub: configuredScrub(root, "motion-aircraft-scrub", 1.2),
                  invalidateOnRefresh: true,
                  markers
                }
              }
            )
          );
        }

        if (aircraftImage) {
          animations.push(
            gsap.fromTo(
              aircraftImage,
              {
                ...maskProps(readString(root, "motion-aircraft-mask-from", DEFAULTS.aircraftMaskFrom)),
                willChange: "-webkit-mask-size, mask-size"
              },
              {
                ...maskProps(readString(root, "motion-aircraft-mask-to", DEFAULTS.aircraftMaskTo)),
                ease,
                scrollTrigger: {
                  trigger,
                  start: readString(root, "motion-mask-start", DEFAULTS.maskStart),
                  end: readString(root, "motion-mask-end", DEFAULTS.maskEnd),
                  scrub: configuredScrub(root, "motion-mask-scrub", true),
                  invalidateOnRefresh: true,
                  markers
                }
              }
            )
          );
        }

        if (blueprint) {
          animations.push(
            gsap.fromTo(
              blueprint,
              {
                ...maskProps(
                  readString(root, "motion-blueprint-mask-from", DEFAULTS.blueprintMaskFrom),
                  readString(root, "motion-blueprint-mask-y-from", DEFAULTS.blueprintMaskYFrom)
                ),
                willChange: "-webkit-mask-size, mask-size, -webkit-mask-position, mask-position"
              },
              {
                ...maskProps(
                  readString(root, "motion-blueprint-mask-to", DEFAULTS.blueprintMaskTo),
                  readString(root, "motion-blueprint-mask-y-to", DEFAULTS.blueprintMaskYTo)
                ),
                ease,
                scrollTrigger: {
                  trigger,
                  start: readString(root, "motion-mask-start", DEFAULTS.maskStart),
                  end: readString(root, "motion-mask-end", DEFAULTS.maskEnd),
                  scrub: configuredScrub(root, "motion-mask-scrub", true),
                  invalidateOnRefresh: true,
                  markers
                }
              }
            )
          );
        }

        ScrollTrigger.refresh();

        return () => cleanup(gsap, animations, targets);
      }
    );

    return () => mm.revert();
  }
};
