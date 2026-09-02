export function createServices({
  gsap,
  ScrollTrigger,
  Flip,
  ScrambleTextPlugin,
  SplitText
}) {
  return {
    Flip,
    ScrambleTextPlugin,
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
