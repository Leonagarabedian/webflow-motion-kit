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
    const shrinkEnd = readNumber(element, "motion-shrink-end", 0.55);
    const rotateStart = readNumber(element, "motion-rotate-start", shrinkEnd);
    const rotateEnd = readNumber(element, "motion-rotate-end", 0.75);
    const sideStart = readNumber(element, "motion-sides-start", 0.65);
    const sideEnd = readNumber(element, "motion-sides-end", 1);
    const start = readString(element, "motion-start", "top top");
    const originalClassState = new Map(
      targets.map((target) => [target, target.classList.contains(stateClass)])
    );
    const originalStyles = new Map(
      targets.map((target) => [target, target.getAttribute("style")])
    );
    const mm = gsap.matchMedia();

    const restoreAuthoredState = () => {
      targets.forEach((target) => {
        restoreClass(target, stateClass, originalClassState.get(target));
        restoreInlineStyle(target, originalStyles.get(target));
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

        // Capture the authored Frame A state first.
        targets.forEach((target) => target.classList.remove(stateClass));

        const frameTargets = [frame, intro].filter(Boolean);
        const frameState = Flip.getState(frameTargets, {
          props: "opacity,visibility"
        });
        const sideState = sides.length
          ? Flip.getState(sides, { props: "opacity,visibility" })
          : null;

        // Apply the authored Frame B classes so MotionKit can derive the final
        // geometry directly from Webflow. Rotation is split into its own later
        // phase so the frame shrinks first while remaining straight.
        frameTargets.forEach((target) => target.classList.add(stateClass));
        sides.forEach((target) => target.classList.add(stateClass));

        const finalRotation = Number(gsap.getProperty(frame, "rotation")) || 0;
        gsap.set(frame, { rotation: 0 });

        const frameFlip = Flip.from(frameState, {
          duration: 1,
          ease: "none",
          nested: true,
          paused: true,
          scale: true
        });
        frameFlip.progress(0);

        const rotateTween = gsap.fromTo(
          frame,
          { rotation: 0 },
          { rotation: finalRotation, duration: 1, ease: "none", paused: true }
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
          end: () => `+=${window.innerHeight * (scrollVh / 100)}`,
          pin: element,
          pinSpacing: true,
          scrub,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate(self) {
            const progress = self.progress;
            frameFlip.progress(phaseProgress(progress, 0, shrinkEnd, clamp));
            rotateTween.progress(
              phaseProgress(progress, rotateStart, rotateEnd, clamp)
            );
            sideFlip?.progress(
              phaseProgress(progress, sideStart, sideEnd, clamp)
            );
          }
        });

        return () => {
          trigger.kill();
          frameFlip.kill();
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
