export function createServices({
  DrawSVGPlugin,
  gsap,
  ScrollTrigger,
  Flip,
  MorphSVGPlugin,
  ScrambleTextPlugin,
  SplitText
}) {
  return {
    DrawSVGPlugin,
    Flip,
    MorphSVGPlugin,
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
