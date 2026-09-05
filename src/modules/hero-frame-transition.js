import { readNumber, readString, selectTarget } from "../core/config.js";

function restoreClass(target, className, hadClass) {
  target.classList.toggle(className, hadClass);
}

function restoreInlineStyle(target, style) {
  if (style == null) target.removeAttribute("style");
  else target.setAttribute("style", style);
}

function phaseProgress(progress, start, end, clamp) {
  const span = Math.max(end - start, 0.0001);
  return clamp(0, 1, (progress - start) / span);
}

function interpolate(from, to, progress) {
  return from + (to - from) * progress;
}

export const heroFrameTransition = {
  name: "hero-frame-transition",
  category: "composition",
  selector: '[data-motion~="hero-frame-transition"]',

  mount(element, { Flip, gsap, ScrollTrigger }) {
    const frame = selectTarget(element, "frame", null);
    const intro = selectTarget(element, "intro", null);
    const sides = [
      selectTarget(element, "side-left", null),
      selectTarget(element, "side-right", null)
    ].filter(Boolean);

    if (!frame) return;

    const targets = [...new Set([frame, intro, ...sides].filter(Boolean))];
    const stateClass = readString(element, "motion-state-class", "is-frame-b");

    const minWidth = readNumber(element, "motion-min-width", 992);
    const scrollVh = readNumber(element, "motion-scroll-vh", 250);
    const scrub = readNumber(element, "motion-scrub", 1);
    const start = readString(element, "motion-start", "top top");

    const closeEnd = readNumber(element, "motion-close-end", 0.32);
    const introFadeEnd = readNumber(
      element,
      "motion-intro-fade-end",
      closeEnd
    );
    const closeTo = readNumber(element, "motion-close-to", 0.52);

    const shrinkStart = readNumber(
      element,
      "motion-shrink-start",
      closeEnd
    );
    const shrinkEnd = readNumber(element, "motion-shrink-end", 0.52);
    const shrinkTo = readNumber(element, "motion-shrink-to", 0.78);

    const rotateStart = readNumber(
      element,
      "motion-rotate-start",
      shrinkEnd
    );
    const rotateEnd = readNumber(element, "motion-rotate-end", 0.68);

    const squeezeStart = readNumber(
      element,
      "motion-squeeze-start",
      rotateEnd
    );
    const squeezeEnd = readNumber(element, "motion-squeeze-end", 1);

    const sideStart = readNumber(
      element,
      "motion-sides-start",
      squeezeStart
    );
    const sideEnd = readNumber(element, "motion-sides-end", 1);

    const originalClassState = new Map(
      targets.map((target) => [target, target.classList.contains(stateClass)])
    );

    const originalStyles = new Map(
      targets.map((target) => [target, target.getAttribute("style")])
    );

    const mm = gsap.matchMedia();

    const restoreAuthoredState = () => {
      targets.forEach((target) => {
        restoreClass(
          target,
          stateClass,
          originalClassState.get(target)
        );

        restoreInlineStyle(
          target,
          originalStyles.get(target)
        );
      });
    };

    mm.add(
      {
        desktop: `(min-width: ${minWidth}px)`,
        reduceMotion: "(prefers-reduced-motion: reduce)"
      },
      ({ conditions }) => {
        restoreAuthoredState();

        if (!conditions.desktop || conditions.reduceMotion) return;

        // Start from authored Frame A.
        targets.forEach((target) => {
          target.classList.remove(stateClass);
        });

        // Capture frame geometry separately.
        const frameState = Flip.getState(frame);

        const sideState = sides.length
          ? Flip.getState(sides, {
              props: "opacity,visibility"
            })
          : null;

        const introStartOpacity = intro
          ? Number(gsap.getProperty(intro, "opacity")) || 0
          : 0;

        // Apply authored Frame B.
        frame.classList.add(stateClass);
        intro?.classList.add(stateClass);

        sides.forEach((target) => {
          target.classList.add(stateClass);
        });

        const finalRotation =
          Number(gsap.getProperty(frame, "rotation")) || 0;

        const introEndOpacity = intro
          ? Number(gsap.getProperty(intro, "opacity")) || 0
          : 0;

        // Remove rotation from the geometry interpolation.
        gsap.set(frame, {
          rotation: 0,
          opacity: 1,
          visibility: "visible"
        });

        const frameFlip = Flip.from(frameState, {
          duration: 1,
          ease: "none",
          nested: true,
          paused: true,
          scale: true
        });

        frameFlip.progress(0);

        gsap.set(frame, {
          opacity: 1,
          visibility: "visible"
        });

        const introTween = intro
          ? gsap.fromTo(
              intro,
              {
                opacity: introStartOpacity
              },
              {
                opacity: introEndOpacity,
                duration: 1,
                ease: "none",
                paused: true
              }
            )
          : null;

        introTween?.progress(0);

        const rotateTween = gsap.fromTo(
          frame,
          {
            rotation: 0
          },
          {
            rotation: finalRotation,
            duration: 1,
            ease: "none",
            paused: true
          }
        );

        rotateTween.progress(0);

        const sideFlip = sideState
          ? Flip.from(sideState, {
              duration: 1,
              ease: "none",
              nested: true,
              paused: true,
              scale: true
            })
          : null;

        sideFlip?.progress(0);

        const clamp = gsap.utils.clamp;

        const trigger = ScrollTrigger.create({
          trigger: element,
          start,
          end: () =>
            `+=${window.innerHeight * (scrollVh / 100)}`,
          pin: element,
          pinSpacing: true,
          scrub,
          anticipatePin: 1,
          invalidateOnRefresh: true,

          onUpdate(self) {
            const progress = self.progress;

            let geometryProgress = 0;

            // PHASE 1
            // Full-screen frame closes toward center.
            if (progress <= closeEnd) {
              geometryProgress = interpolate(
                0,
                closeTo,
                phaseProgress(
                  progress,
                  0,
                  closeEnd,
                  clamp
                )
              );
            }

            // Hold first rectangle if there is a gap.
            else if (progress < shrinkStart) {
              geometryProgress = closeTo;
            }

            // PHASE 2
            // Rectangle shrinks farther while staying straight.
            else if (progress <= shrinkEnd) {
              geometryProgress = interpolate(
                closeTo,
                shrinkTo,
                phaseProgress(
                  progress,
                  shrinkStart,
                  shrinkEnd,
                  clamp
                )
              );
            }

            // PHASE 3
            // Hold smaller geometry while rotation happens.
            else if (progress < squeezeStart) {
              geometryProgress = shrinkTo;
            }

            // PHASE 4
            // Finish squeezing while side text enters.
            else {
              geometryProgress = interpolate(
                shrinkTo,
                1,
                phaseProgress(
                  progress,
                  squeezeStart,
                  squeezeEnd,
                  clamp
                )
              );
            }

            frameFlip.progress(
              clamp(0, 1, geometryProgress)
            );

            introTween?.progress(
              phaseProgress(
                progress,
                0,
                introFadeEnd,
                clamp
              )
            );

            rotateTween.progress(
              phaseProgress(
                progress,
                rotateStart,
                rotateEnd,
                clamp
              )
            );

            sideFlip?.progress(
              phaseProgress(
                progress,
                sideStart,
                sideEnd,
                clamp
              )
            );

            // Keep the video/frame visible the entire time.
            gsap.set(frame, {
              opacity: 1,
              visibility: "visible"
            });
          }
        });

        return () => {
          trigger.kill();
          frameFlip.kill();
          introTween?.kill();
          rotateTween.kill();
          sideFlip?.kill();

          restoreAuthoredState();
        };
      }
    );

    return () => {
      mm.revert();
      restoreAuthoredState();
    };
  }
};
