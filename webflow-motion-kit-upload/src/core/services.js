export function createServices({ gsap, ScrollTrigger, Flip, SplitText }) {
  return {
    Flip,
    ScrollTrigger,
    SplitText,
    gsap,
    logger: console,
    reducedMotion: () =>
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
    supportsHover: () =>
      window.matchMedia?.("(hover: hover) and (pointer: fine)").matches ?? true
  };
}
