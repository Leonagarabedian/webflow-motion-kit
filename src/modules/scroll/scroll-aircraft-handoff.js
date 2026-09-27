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
  aircraftScaleFrom: 1,
  aircraftScaleTo: 0.4,
  aircraftYFrom: 0,
  aircraftYTo: -15,
  aircraftOpacityFrom: 1,
  aircraftOpacityTo: 0,
  aircraftMaskFrom: "100% 150%",
  aircraftMaskTo: "100% 150%",
  blueprintOpacityFrom: 0,
  blueprintOpacityTo: 1,
  blueprintMaskFrom: "100% 0%",
  blueprintMaskTo: "100% 150%",
  blueprintMaskYFrom: "200%",
  blueprintMaskYTo: "50%",
  backgroundAt: 0,
  backgroundDuration: 0.28,
  contentAt: 0.28,
  contentDuration: 0.44,
  aircraftAt: 0.18,
  aircraftDuration: 0.54,
  handoffAt: 0.78,
  handoffDuration: 0.22,
  ease: "none",
  aircraftEase: "none",
  handoffEase: "none",
  coordinateMode: "authored",
  stageScale: 1,
  stageXOffset: 0,
  stageYOffset: 0
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

function rectCenter(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function panelFinalYOffset(stage, contentYTo) {
  const panel = stage?.closest?.('[data-motion-target~="content-panel"]');
  if (!panel) return 0;
  const rect = panel.getBoundingClientRect();
  return rect.height * (contentYTo / 100);
}

function computeStageTravel({ aircraftImage, aircraft, stage, contentYTo, stageScale, xOffset, yOffset }) {
  const source = aircraftImage || aircraft;
  if (!source || !stage) return null;

  const sourceRect = source.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  if (!sourceRect.width || !sourceRect.height || !stageRect.width || !stageRect.height) return null;

  const finalStageYOffset = panelFinalYOffset(stage, contentYTo);
  const sourceCenter = rectCenter(sourceRect);
  const stageCenter = rectCenter(stageRect);
  const fitScale = (stageRect.width / sourceRect.width) * stageScale;

  return {
    x: stageCenter.x - sourceCenter.x + xOffset,
    y: stageCenter.y + finalStageYOffset - sourceCenter.y + yOffset,
    scale: fitScale
  };
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
        "opacity,transform,x,y,scale,willChange,webkitMaskSize,maskSize,webkitMaskPosition,maskPosition,--motion-mask-size,--motion-mask-y,--mask-size,--mask-y"
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
        const handoffEase = readString(root, "motion-handoff-ease", DEFAULTS.handoffEase);
        const coordinateMode = readString(root, "motion-coordinate-mode", DEFAULTS.coordinateMode);

        const background = selectTarget(root, "background", null);
        const panels = selectTargets(root, "content-panel");
        const aircraft = selectTarget(root, "aircraft", null);
        const aircraftImage = selectTarget(root, "aircraft-image", null);
        const blueprint = selectTarget(root, "blueprint", null);
        const blueprintStage = selectTarget(root, "blueprint-stage", blueprint?.parentElement || null);

        const backgroundAt = normalizedPosition(root, "motion-background-at", DEFAULTS.backgroundAt);
        const backgroundDuration = normalizedDuration(root, "motion-background-duration", DEFAULTS.backgroundDuration);
        const contentAt = normalizedPosition(root, "motion-content-at", DEFAULTS.contentAt);
        const contentDuration = normalizedDuration(root, "motion-content-duration", DEFAULTS.contentDuration);
        const aircraftAt = normalizedPosition(root, "motion-aircraft-at", DEFAULTS.aircraftAt);
        const aircraftDuration = normalizedDuration(root, "motion-aircraft-duration", DEFAULTS.aircraftDuration);
        const handoffAt = normalizedPosition(root, "motion-handoff-at", DEFAULTS.handoffAt);
        const handoffDuration = normalizedDuration(root, "motion-handoff-duration", DEFAULTS.handoffDuration);
        const contentYTo = readNumber(root, "motion-content-y-to", DEFAULTS.contentYTo);
        const stageScale = readNumber(root, "motion-stage-scale", DEFAULTS.stageScale);
        const stageXOffset = readNumber(root, "motion-stage-x-offset", DEFAULTS.stageXOffset);
        const stageYOffset = readNumber(root, "motion-stage-y-offset", DEFAULTS.stageYOffset);
        const useSourceStage = coordinateMode === "source-stage" && blueprintStage && aircraft;

        const animations = [];
        const targets = [background, ...panels, aircraft, aircraftImage, blueprint, blueprintStage];

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

        if (aircraft) {
          gsap.set(aircraft, {
            x: 0,
            y: 0,
            scale: readNumber(root, "motion-aircraft-scale-from", DEFAULTS.aircraftScaleFrom),
            yPercent: useSourceStage ? 0 : readNumber(root, "motion-aircraft-y-from", DEFAULTS.aircraftYFrom),
            translateZ: 10,
            willChange: "transform"
          });
        }

        if (aircraftImage) {
          gsap.set(aircraftImage, {
            opacity: readNumber(root, "motion-aircraft-opacity-from", DEFAULTS.aircraftOpacityFrom),
            ...maskProps(readString(root, "motion-aircraft-mask-from", DEFAULTS.aircraftMaskFrom)),
            willChange: "opacity, -webkit-mask-size, mask-size"
          });
        }

        if (blueprint) {
          gsap.set(blueprint, {
            opacity: readNumber(root, "motion-blueprint-opacity-from", DEFAULTS.blueprintOpacityFrom),
            ...maskProps(
              readString(root, "motion-blueprint-mask-from", DEFAULTS.blueprintMaskFrom),
              readString(root, "motion-blueprint-mask-y-from", DEFAULTS.blueprintMaskYFrom)
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
              yPercent: contentYTo,
              duration: contentDuration
            },
            contentAt
          );
        }

        if (aircraft) {
          const authoredScaleTo = readNumber(root, "motion-aircraft-scale-to", DEFAULTS.aircraftScaleTo);
          const authoredYTo = readNumber(root, "motion-aircraft-y-to", DEFAULTS.aircraftYTo);

          timeline.to(
            aircraft,
            useSourceStage
              ? {
                  x: () =>
                    computeStageTravel({
                      aircraftImage,
                      aircraft,
                      stage: blueprintStage,
                      contentYTo,
                      stageScale,
                      xOffset: stageXOffset,
                      yOffset: stageYOffset
                    })?.x ?? 0,
                  y: () =>
                    computeStageTravel({
                      aircraftImage,
                      aircraft,
                      stage: blueprintStage,
                      contentYTo,
                      stageScale,
                      xOffset: stageXOffset,
                      yOffset: stageYOffset
                    })?.y ?? 0,
                  scale: () =>
                    computeStageTravel({
                      aircraftImage,
                      aircraft,
                      stage: blueprintStage,
                      contentYTo,
                      stageScale,
                      xOffset: stageXOffset,
                      yOffset: stageYOffset
                    })?.scale ?? authoredScaleTo,
                  ease: aircraftEase,
                  duration: aircraftDuration
                }
              : {
                  scale: authoredScaleTo,
                  yPercent: authoredYTo,
                  ease: aircraftEase,
                  duration: aircraftDuration
                },
            aircraftAt
          );
        }

        if (aircraftImage) {
          timeline.to(
            aircraftImage,
            {
              opacity: readNumber(root, "motion-aircraft-opacity-to", DEFAULTS.aircraftOpacityTo),
              ...maskProps(readString(root, "motion-aircraft-mask-to", DEFAULTS.aircraftMaskTo)),
              ease: handoffEase,
              duration: handoffDuration
            },
            handoffAt
          );
        }

        if (blueprint) {
          timeline.to(
            blueprint,
            {
              opacity: readNumber(root, "motion-blueprint-opacity-to", DEFAULTS.blueprintOpacityTo),
              ...maskProps(
                readString(root, "motion-blueprint-mask-to", DEFAULTS.blueprintMaskTo),
                readString(root, "motion-blueprint-mask-y-to", DEFAULTS.blueprintMaskYTo)
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
