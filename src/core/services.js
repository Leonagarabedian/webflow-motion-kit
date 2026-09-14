import { createScrollAlignment } from "./scroll-alignment/index.js";

export function createServices({ gsap, plugins, getPageScroll = () => null }) {
  const services = {
    gsap,
    ...plugins,
    logger: console,
    reducedMotion: () =>
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
    supportsHover: () =>
      window.matchMedia?.("(hover: hover) and (pointer: fine)").matches ?? true
  };

  services.scrollAlignment = createScrollAlignment({
    gsap,
    ScrollTrigger: plugins.ScrollTrigger,
    getScroller: getPageScroll,
    logger: services.logger
  });

  return services;
}
