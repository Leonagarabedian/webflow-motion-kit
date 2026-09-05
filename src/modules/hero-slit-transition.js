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

function phaseProgress(progress, start, end, clamp) {
  const duration = Math.max(end - start, 0.0001);

  return clamp(
    0,
    1,
    (progress - start) / duration
  );
}

function interpolate(from, to, progress) {
  return from + (to - from) * progress;
}

export const heroSlitTransition = {
  name: "hero-slit-transition",

  category: "composition",

  selector:
    '[data-motion~="hero-slit-transition"]',

  mount(element, { gsap, ScrollTrigger }) {
    /*
     * ----------------------------------------
     * TARGETS
     * ----------------------------------------
     */

    const frame = selectTarget(
      element,
      "frame",
      null
    );

    const intro = selectTarget(
      element,
      "intro",
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
     *
     * 0.00 → 0.25
     *
     * Frame closes horizontally into slit.
     * Intro disappears.
     * Dark overlay appears.
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

    const introFadeStart = readNumber(
      element,
      "motion-intro-fade-start",
      0
    );

    const introFadeEnd = readNumber(
      element,
      "motion-intro-fade-end",
      clipEnd
    );

    /*
     * ----------------------------------------
     * PHASE 2
     *
     * 0.25 → 0.45
     *
     * Slit rotates.
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
     *
     * 0.45 → 0.65
     *
     * Slit disappears.
     *
     * At the SAME TIME:
     *
     * left wording moves inward
     * right wording moves inward
     * wording becomes visible
     * wording reaches final width
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

    /*
     * ----------------------------------------
     * COPY GEOMETRY
     *
     * These are CENTER positions.
     *
     * Current Webflow starting geometry:
     *
     * left:
     * width 30%
     * visual center = 15%
     *
     * right:
     * width 30%
     * visual center = 85%
     *
     * Previous authored final geometry:
     *
     * left center = 32%
     * right center = 64%
     * width = 20%
     * ----------------------------------------
     */

    const copyStartWidth = readNumber(
      element,
      "motion-copy-start-width",
      30
    );

    const copyEndWidth = readNumber(
      element,
      "motion-copy-end-width",
      20
    );

    const leftStartCenter = readNumber(
      element,
      "motion-copy-left-start-center",
      15
    );

    const leftEndCenter = readNumber(
      element,
      "motion-copy-left-end-center",
      32
    );

    const rightStartCenter = readNumber(
      element,
      "motion-copy-right-start-center",
      85
    );

    const rightEndCenter = readNumber(
      element,
      "motion-copy-right-end-center",
      64
    );

    const copyOpacityStart = readNumber(
      element,
      "motion-copy-opacity-start",
      0
    );

    const copyOpacityEnd = readNumber(
      element,
      "motion-copy-opacity-end",
      1
    );

    const copyZ = readNumber(
      element,
      "motion-copy-z",
      3
    );

    /*
     * ----------------------------------------
     * SAVE AUTHORED STYLES
     * ----------------------------------------
     */

    const targets = [
      frame,
      intro,
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

        const clamp = gsap.utils.clamp;

        /*
         * ----------------------------------------
         * INTRO START OPACITY
         * ----------------------------------------
         */

        const introStartOpacity = intro
          ? Number(
              gsap.getProperty(
                intro,
                "opacity"
              )
            ) || 1
          : 1;

        /*
         * ----------------------------------------
         * FRAME INITIAL STATE
         * ----------------------------------------
         */

        gsap.set(frame, {
          clipPath:
            "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",

          WebkitClipPath:
            "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",

          rotation: 0,

          scale: 1,

          opacity: 1,

          visibility: "visible",

          transformOrigin: "50% 50%",

          willChange:
            "clip-path, transform"
        });

        /*
         * ----------------------------------------
         * INTRO INITIAL STATE
         * ----------------------------------------
         */

        if (intro) {
          gsap.set(intro, {
            opacity: introStartOpacity,
            visibility: "visible",
            willChange: "opacity"
          });
        }

        /*
         * ----------------------------------------
         * DARK OVERLAY INITIAL STATE
         * ----------------------------------------
         */

        if (overlayDark) {
          gsap.set(overlayDark, {
            opacity: 0,
            visibility: "visible",
            willChange: "opacity"
          });
        }

        /*
         * ----------------------------------------
         * COPY INITIAL STATE
         *
         * Explicitly hidden.
         * ----------------------------------------
         */

        if (bgCopyLeft) {
          const initialLeft =
            leftStartCenter -
            copyStartWidth / 2;

          gsap.set(bgCopyLeft, {
            left: `${initialLeft}%`,
            right: "auto",

            width: `${copyStartWidth}%`,

            opacity: copyOpacityStart,

            visibility:
              copyOpacityStart > 0
                ? "visible"
                : "hidden",

            zIndex: copyZ,

            pointerEvents: "none",

            willChange:
              "left, width, opacity"
          });
        }

        if (bgCopyRight) {
          const initialLeft =
            rightStartCenter -
            copyStartWidth / 2;

          gsap.set(bgCopyRight, {
            left: `${initialLeft}%`,
            right: "auto",

            width: `${copyStartWidth}%`,

            opacity: copyOpacityStart,

            visibility:
              copyOpacityStart > 0
                ? "visible"
                : "hidden",

            zIndex: copyZ,

            pointerEvents: "none",

            willChange:
              "left, width, opacity"
          });
        }

        /*
         * ----------------------------------------
         * RENDER
         * ----------------------------------------
         */

        function render(scrollProgress) {
          /*
           * ======================================
           * PHASE 1
           *
           * 0 → clipEnd
           *
           * Full-width frame closes into
           * full-height vertical slit.
           *
           * HEIGHT NEVER CHANGES.
           * ======================================
           */

          const phase1 =
            phaseProgress(
              scrollProgress,
              0,
              clipEnd,
              clamp
            );

          const leftEdge =
            interpolate(
              0,
              slitLeft,
              phase1
            );

          const rightEdge =
            interpolate(
              100,
              slitRight,
              phase1
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

          /*
           * --------------------------------------
           * DARK OVERLAY
           * --------------------------------------
           */

          if (overlayDark) {
            const darkOpacity =
              interpolate(
                0,
                darkOpacityEnd,
                phase1
              );

            gsap.set(overlayDark, {
              opacity: darkOpacity
            });
          }

          /*
           * --------------------------------------
           * FRAME A INTRO
           * --------------------------------------
           */

          if (intro) {
            const introProgress =
              phaseProgress(
                scrollProgress,
                introFadeStart,
                introFadeEnd,
                clamp
              );

            const introOpacity =
              interpolate(
                introStartOpacity,
                0,
                introProgress
              );

            gsap.set(intro, {
              opacity: introOpacity,

              visibility:
                introProgress >= 1
                  ? "hidden"
                  : "visible"
            });
          }

          /*
           * ======================================
           * PHASE 2
           *
           * rotateStart → rotateEnd
           *
           * 0° → rotateTo
           * ======================================
           */

          const phase2 =
            phaseProgress(
              scrollProgress,
              rotateStart,
              rotateEnd,
              clamp
            );

          const rotation =
            interpolate(
              0,
              rotateTo,
              phase2
            );

          gsap.set(frame, {
            rotation
          });

          /*
           * ======================================
           * PHASE 3
           *
           * scaleStart → scaleEnd
           *
           * Slit:
           * scale 1 → 0
           *
           * Wording:
           * moves inward simultaneously
           * and becomes visible.
           * ======================================
           */

          const phase3 =
            phaseProgress(
              scrollProgress,
              scaleStart,
              scaleEnd,
              clamp
            );

          const frameScale =
            interpolate(
              1,
              scaleTo,
              phase3
            );

          /*
           * Explicitly hide the frame after
           * Phase 3 completes.
           */

          gsap.set(frame, {
            scale: frameScale,

            opacity:
              scrollProgress >= scaleEnd
                ? 0
                : 1,

            visibility:
              scrollProgress >= scaleEnd
                ? "hidden"
                : "visible"
          });

          /*
           * --------------------------------------
           * COPY WIDTH
           * --------------------------------------
           */

          const copyWidth =
            interpolate(
              copyStartWidth,
              copyEndWidth,
              phase3
            );

          /*
           * --------------------------------------
           * LEFT COPY POSITION
           * --------------------------------------
           */

          const leftCenter =
            interpolate(
              leftStartCenter,
              leftEndCenter,
              phase3
            );

          const leftPosition =
            leftCenter -
            copyWidth / 2;

          /*
           * --------------------------------------
           * RIGHT COPY POSITION
           * --------------------------------------
           */

          const rightCenter =
            interpolate(
              rightStartCenter,
              rightEndCenter,
              phase3
            );

          const rightPosition =
            rightCenter -
            copyWidth / 2;

          /*
           * --------------------------------------
           * COPY VISIBILITY
           * --------------------------------------
           */

          const copyOpacity =
            interpolate(
              copyOpacityStart,
              copyOpacityEnd,
              phase3
            );

          const copiesShouldShow =
            scrollProgress >= scaleStart;

          if (bgCopyLeft) {
            gsap.set(bgCopyLeft, {
              left: `${leftPosition}%`,

              width: `${copyWidth}%`,

              opacity: copyOpacity,

              visibility:
                copiesShouldShow
                  ? "visible"
                  : "hidden"
            });
          }

          if (bgCopyRight) {
            gsap.set(bgCopyRight, {
              left: `${rightPosition}%`,

              width: `${copyWidth}%`,

              opacity: copyOpacity,

              visibility:
                copiesShouldShow
                  ? "visible"
                  : "hidden"
            });
          }
        }

        /*
         * ----------------------------------------
         * INITIAL RENDER
         * ----------------------------------------
         */

        render(0);

        /*
         * ----------------------------------------
         * SCROLLTRIGGER
         * ----------------------------------------
         */

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
