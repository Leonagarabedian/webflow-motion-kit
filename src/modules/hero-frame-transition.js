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
    const frameEnd = readNumber(element, "motion-frame-end", 0.72);
    const sideStart = readNumber(element, "motion-side-start", 0.62);
    const sideEnd = readNumber(element, "motion-side-end", 0.92);
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

        // Apply the authored Frame B classes. Flip creates paused A -> B
        // interpolators, while the ScrollTrigger below owns all progress.
        frameTargets.forEach((target) => target.classList.add(stateClass));
        sides.forEach((target) => target.classList.add(stateClass));

        const frameFlip = Flip.from(frameState, {
          duration: 1,
          ease: "none",
          nested: true,
          paused: true,
          scale: true
        });
        frameFlip.progress(0);

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
            frameFlip.progress(phaseProgress(progress, 0, frameEnd, clamp));
            sideFlip?.progress(
              phaseProgress(progress, sideStart, sideEnd, clamp)
            );
          }
        });

        return () => {
          trigger.kill();
          frameFlip.kill();
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
