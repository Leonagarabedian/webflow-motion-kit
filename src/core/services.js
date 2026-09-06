export function createServices({ gsap, plugins }) {
  return {
    gsap,
    ...plugins,
    logger: console,
    reducedMotion: () =>
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
    supportsHover: () =>
      window.matchMedia?.("(hover: hover) and (pointer: fine)").matches ?? true
  };
}
