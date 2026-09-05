import { readNumber, readString, selectTarget } from "../core/config.js";

function restoreClass(target, className, hadClass) {
  target.classList.toggle(className, hadClass);
}

export const heroFrameTransition = {
  name: "hero-frame-transition",
  category: "composition",
  selector: '[data-motion~="hero-frame-transition"]',
  mount(element, { Flip, gsap }) {
    const frame = selectTarget(element, "frame", null);
    const intro = selectTarget(element, "intro", null);
    const sides = [
      selectTarget(element, "side-left", null),
      selectTarget(element, "side-right", null)
    ].filter(Boolean);
    if (!frame) return;

    const targets = [...new Set([frame, intro, ...sides].filter(Boolean))];
    const stateClass = readString(element, "motion-state-class", "is-frame-b");
    const originalClassState = new Map(
      targets.map((target) => [target, target.classList.contains(stateClass)])
    );
    const originalStyles = new Map(
      targets.map((target) => [target, target.getAttribute("style")])
    );
    const minWidth = readNumber(element, "motion-min-width", 992);
    const delay = readNumber(element, "motion-delay", 0.25);
    const frameDuration = readNumber(element, "motion-frame-duration", 1.15);
    const sideDelay = readNumber(element, "motion-side-delay", frameDuration);
    const sideDuration = readNumber(element, "motion-side-duration", 0.7);
    const ease = readString(element, "motion-ease", "power3.inOut");
    const sideEase = readString(element, "motion-side-ease", ease);
    const mm = gsap.matchMedia();

    const restoreAuthoredState = () => {
      targets.forEach((target) => {
        restoreClass(target, stateClass, originalClassState.get(target));
        const style = originalStyles.get(target);
        if (style == null) target.removeAttribute("style");
        else target.setAttribute("style", style);
      });
    };

    mm.add(
      {
        desktop: `(min-width: ${minWidth}px)`,
        reduceMotion: "(prefers-reduced-motion: reduce)"
      },
      ({ conditions }) => {
        restoreAuthoredState();
        if (!conditions.desktop) return;

        targets.forEach((target) => target.classList.remove(stateClass));

        if (conditions.reduceMotion) {
          targets.forEach((target) => target.classList.add(stateClass));
          return restoreAuthoredState;
        }

        let frameTween;
        let sideTween;
        let sideTimer;
        const startTimer = gsap.delayedCall(delay, () => {
          const frameTargets = [frame, intro].filter(Boolean);
          const frameState = Flip.getState(frameTargets, {
            props: "opacity,visibility"
          });
          frameTargets.forEach((target) => target.classList.add(stateClass));
          frameTween = Flip.from(frameState, {
            duration: frameDuration,
            ease,
            nested: true,
            scale: true
          });

          if (!sides.length) return;
          sideTimer = gsap.delayedCall(sideDelay, () => {
            const sideState = Flip.getState(sides, {
              props: "opacity,visibility"
            });
            sides.forEach((target) => target.classList.add(stateClass));
            sideTween = Flip.from(sideState, {
              duration: sideDuration,
              ease: sideEase,
              nested: true,
              scale: true
            });
          });
        });

        return () => {
          startTimer.kill();
          sideTimer?.kill();
          frameTween?.kill();
          sideTween?.kill();
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
