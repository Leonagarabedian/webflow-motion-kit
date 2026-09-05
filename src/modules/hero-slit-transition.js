import {
  readNumber,
  readString,
  selectTarget
} from "../core/config.js";

function restoreInlineStyle(target, originalStyle) {
  if (!target) return;

  if (originalStyle == null) {
    target.removeAttribute("style");
  } else {
    target.setAttribute("style", originalStyle);
  }
}

function normalizePhase(progress, start, end, clamp) {
  const duration = Math.max(end - start, 0.0001);

  return clamp(
    0,
    1,
    (progress - start) / duration
  );
}

export const heroSlitTransition = {
  name: "hero-slit-transition",

  category: "composition",

  selector:
    '[data-motion~="hero-slit-transition"]',

  mount(element, { gsap, ScrollTrigger }) {
    const frame = selectTarget(
      element,
      "frame",
      null
    );

    const overlayDark = selectTarget(
      element,
      "overlay-dark",
      null
    );

    const bgCopyLeft = selectTarget(
      element,
      "bg-copy-left",
      null
    );

    const bgCopyRight = selectTarget(
      element,
      "bg-copy-right",
      null
    );

    if (!frame) return;

    /*
     * ----------------------------------------
     * GENERAL
     * ----------------------------------------
     */

    const minWidth = readNumber(
      element,
      "motion-min-width",
      992
    );

    const scrollVh = readNumber(
      element,
      "motion-scroll-vh",
      500
    );

    const scrub = readNumber(
      element,
      "motion-scrub",
      1
    );

    const start = readString(
      element,
      "motion-start",
      "top top"
    );

    /*
     * ----------------------------------------
     * PHASE 1
     * 0 → 0.25
     *
     * full frame → vertical slit
     * ----------------------------------------
     */

    const clipEnd = readNumber(
      element,
      "motion-clip-end",
      0.25
    );

    const slitLeft = readNumber(
      element,
      "motion-slit-left",
      48
    );

    const slitRight = readNumber(
      element,
      "motion-slit-right",
      52
    );

    const darkOpacityEnd = readNumber(
      element,
      "motion-dark-opacity",
      1
    );

    /*
     * ----------------------------------------
     * PHASE 2
     * 0.25 → 0.45
     *
     * slit rotates
     * ----------------------------------------
     */

    const rotateStart = readNumber(
      element,
      "motion-rotate-start",
      0.25
    );

    const rotateEnd = readNumber(
      element,
      "motion-rotate-end",
      0.45
    );

    const rotateTo = readNumber(
      element,
      "motion-rotate",
      65
    );

    /*
     * ----------------------------------------
     * PHASE 3
     * 0.45 → 0.65
     *
     * slit scales away
     * background copies move outward
     * ----------------------------------------
     */

    const scaleStart = readNumber(
      element,
      "motion-scale-start",
      0.45
    );

    const scaleEnd = readNumber(
      element,
      "motion-scale-end",
      0.65
    );

    const scaleTo = readNumber(
      element,
      "motion-scale-to",
      0
    );

    const copyLeftX = readNumber(
      element,
      "motion-copy-left-x",
      100
    );

    const copyRightX = readNumber(
      element,
      "motion-copy-right-x",
      -100
    );

    const copyOpacity = readNumber(
      element,
      "motion-copy-opacity",
      1
    );

    const copyZ = readNumber(
      element,
      "motion-copy-z",
      0
    );

    const targets = [
      frame,
      overlayDark,
      bgCopyLeft,
      bgCopyRight
    ].filter(Boolean);

    const originalStyles = new Map(
      targets.map((target) => [
        target,
        target.getAttribute("style")
      ])
    );

    const mm = gsap.matchMedia();

    mm.add(
      {
        desktop:
          `(min-width: ${minWidth}px)`,

        reduceMotion:
          "(prefers-reduced-motion: reduce)"
      },

      ({ conditions }) => {
        if (
          !conditions.desktop ||
          conditions.reduceMotion
        ) {
          return;
        }

        /*
         * ----------------------------------------
         * INITIAL STATE
         * ----------------------------------------
         */

        gsap.set(frame, {
          clipPath:
            "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",

          WebkitClipPath:
            "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",

          rotation: 0,

          scale: 1,

          transformOrigin: "50% 50%",

          opacity: 1,

          visibility: "visible",

          willChange:
            "clip-path, transform"
        });

        if (overlayDark) {
          gsap.set(overlayDark, {
            opacity: 0,
            willChange: "opacity"
          });
        }

        if (bgCopyLeft) {
          gsap.set(bgCopyLeft, {
            xPercent: 0,
            opacity: copyOpacity,
            zIndex: copyZ,
            visibility: "visible",
            willChange:
              "transform, opacity"
          });
        }

        if (bgCopyRight) {
          gsap.set(bgCopyRight, {
            xPercent: 0,
            opacity: copyOpacity,
            zIndex: copyZ,
            visibility: "visible",
            willChange:
              "transform, opacity"
          });
        }

        const clamp = gsap.utils.clamp;
        const interpolate =
          gsap.utils.interpolate;

        function render(scrollProgress) {
          /*
           * ====================================
           * PHASE 1
           *
           * Tutorial:
           *
           * 0 → 0.25
           *
           * left edge:
           * 0 → 48
           *
           * right edge:
           * 100 → 52
           *
           * Height remains 100%.
           * ====================================
           */

          const phase1Progress = clamp(
            0,
            1,
            scrollProgress / clipEnd
          );

          const leftEdge = interpolate(
            0,
            slitLeft,
            phase1Progress
          );

          const rightEdge = interpolate(
            100,
            slitRight,
            phase1Progress
          );

          const slitPath =
            `polygon(` +
            `${leftEdge}% 0%, ` +
            `${rightEdge}% 0%, ` +
            `${rightEdge}% 100%, ` +
            `${leftEdge}% 100%` +
            `)`;

          gsap.set(frame, {
            clipPath: slitPath,
            WebkitClipPath: slitPath
          });

          if (overlayDark) {
            const darkOpacity =
              interpolate(
                0,
                darkOpacityEnd,
                phase1Progress
              );

            gsap.set(overlayDark, {
              opacity: darkOpacity
            });
          }

          /*
           * ====================================
           * PHASE 2
           *
           * Tutorial:
           *
           * 0.25 → 0.45
           * rotation 0 → 65
           * ====================================
           */

          const phase2Progress =
            normalizePhase(
              scrollProgress,
              rotateStart,
              rotateEnd,
              clamp
            );

          const rotation =
            interpolate(
              0,
              rotateTo,
              phase2Progress
            );

          gsap.set(frame, {
            rotation
          });

          /*
           * ====================================
           * PHASE 3
           *
           * Tutorial:
           *
           * 0.45 → 0.65
           *
           * frame:
           * scale 1 → 0
           *
           * left copy:
           * x 0 → +100%
           *
           * right copy:
           * x 0 → -100%
           * ====================================
           */

          const phase3Progress =
            normalizePhase(
              scrollProgress,
              scaleStart,
              scaleEnd,
              clamp
            );

          const frameScale =
            interpolate(
              1,
              scaleTo,
              phase3Progress
            );

          gsap.set(frame, {
            scale: frameScale
          });

          if (bgCopyLeft) {
            const leftX =
              interpolate(
                0,
                copyLeftX,
                phase3Progress
              );

            gsap.set(bgCopyLeft, {
              xPercent: leftX
            });
          }

          if (bgCopyRight) {
            const rightX =
              interpolate(
                0,
                copyRightX,
                phase3Progress
              );

            gsap.set(bgCopyRight, {
              xPercent: rightX
            });
          }
        }

        render(0);

        const trigger =
          ScrollTrigger.create({
            trigger: element,

            start,

            end: () =>
              `+=${window.innerHeight *
                (scrollVh / 100)}`,

            pin: element,

            pinSpacing: true,

            scrub,

            anticipatePin: 1,

            invalidateOnRefresh: true,

            onUpdate(self) {
              render(self.progress);
            }
          });

        return () => {
          trigger.kill();

          targets.forEach((target) => {
            restoreInlineStyle(
              target,
              originalStyles.get(target)
            );
          });
        };
      }
    );

    return () => {
      mm.revert();

      targets.forEach((target) => {
        restoreInlineStyle(
          target,
          originalStyles.get(target)
        );
      });
    };
  }
};
