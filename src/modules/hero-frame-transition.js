import { readNumber, readString, selectTarget } from "../core/config.js";

function restoreClass(target, className, hadClass) {
  target.classList.toggle(className, hadClass);
}

function restoreInlineStyle(target, style) {
  if (style == null) target.removeAttribute("style");
  else target.setAttribute("style", style);
}

export const heroFrameTransition = {
  name: "hero-frame-transition",
  category: "composition",
  selector: '[data-motion~="hero-frame-transition"]',
  mount(element, { Flip, gsap, ScrollTrigger }) {
    const sticky = selectTarget(element, "sticky", element);
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
      [sticky, ...targets].map((target) => [target, target.getAttribute("style")])
    );
    const minWidth = readNumber(element, "motion-min-width", 992);
    const scrollVh = readNumber(element, "motion-scroll-vh", 250);
    const scrub = readNumber(element, "motion-scrub", 1);
    const frameEnd = readNumber(element, "motion-frame-end", 0.78);
    const sideStart = readNumber(element, "motion-side-start", 0.68);
    const sideEnd = readNumber(element, "motion-side-end", 1);
    const start = readString(element, "motion-start", "top top");
    const mm = gsap.matchMedia();

    const restoreAuthoredState = () => {
      targets.forEach((target) => {
        restoreClass(target, stateClass, originalClassState.get(target));
        restoreInlineStyle(target, originalStyles.get(target));
      });
      restoreInlineStyle(sticky, originalStyles.get(sticky));
    };

    mm.add(
      {
        desktop: `(min-width: ${minWidth}px)`,
        reduceMotion: "(prefers-reduced-motion: reduce)"
      },
      ({ conditions }) => {
        restoreAuthoredState();
        if (!conditions.desktop || conditions.reduceMotion) return;

        // Frame A is always the authored base state at scroll progress 0.
        targets.forEach((target) => target.classList.remove(stateClass));

        const frameTargets = [frame, intro].filter(Boolean);
        const frameState = Flip.getState(frameTargets, {
          props: "opacity,visibility"
        });
        const sideState = sides.length
          ? Flip.getState(sides, { props: "opacity,visibility" })
          : null;

        // Apply the authored Frame B classes first. Flip then inverts the elements
        // back to their captured Frame A appearance, so scroll progress can scrub
        // between the two real Webflow states without hardcoded geometry.
        frameTargets.forEach((target) => target.classList.add(stateClass));
        sides.forEach((target) => target.classList.add(stateClass));

        const frameFlip = Flip.from(frameState, {
          duration: Math.max(frameEnd, 0.001),
          ease: "none",
          nested: true,
          paused: true,
          scale: true
        });

        const sideDuration = Math.max(sideEnd - sideStart, 0.001);
        const sideFlip = sideState
          ? Flip.from(sideState, {
              duration: sideDuration,
              ease: "none",
              nested: true,
              paused: true,
              scale: true
            })
          : null;

        const timeline = gsap.timeline({ paused: true });
        timeline.add(frameFlip, 0);
        if (sideFlip) timeline.add(sideFlip, sideStart);
        timeline.duration(Math.max(1, frameEnd, sideEnd));

        const trigger = ScrollTrigger.create({
          animation: timeline,
          anticipatePin: 1,
          end: () => `+=${window.innerHeight * (scrollVh / 100)}`,
          invalidateOnRefresh: true,
          pin: sticky,
          pinSpacing: true,
          scrub,
          start,
          trigger: element
        });

        return () => {
          trigger?.kill();
          timeline.kill();
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
