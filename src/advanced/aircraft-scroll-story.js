import { gsap, ScrollTrigger } from "gsap/all";
import "./advanced.css";
import { number, restoreStyle, string, target, targets } from "./shared/config.js";
import { createAdvancedPackage } from "./shared/runtime.js";

gsap.registerPlugin(ScrollTrigger);

function mount(element) {
  const sticky = target(element, "sticky");
  const background = target(element, "hero-background");
  const leftTitle = target(element, "hero-left");
  const rightTitle = target(element, "hero-right");
  const aircraft = target(element, "aircraft");
  const blueprint = target(element, "blueprint");
  const globe = target(element, "globe");
  const specs = targets(element, "spec");
  if (!sticky || !aircraft) return;
  const animated = [background, leftTitle, rightTitle, aircraft, blueprint, globe, ...specs].filter(Boolean);
  const initialStyles = animated.map((item) => item.getAttribute("style"));
  const minWidth = number(element, "advanced-min-width", 992);
  const mm = gsap.matchMedia();

  mm.add(
    {
      desktop: `(min-width: ${minWidth}px)`,
      reduceMotion: "(prefers-reduced-motion: reduce)"
    },
    ({ conditions }) => {
      if (!conditions.desktop || conditions.reduceMotion) return;
      const timeline = gsap.timeline({
        scrollTrigger: {
          end: string(element, "advanced-end", "bottom bottom"),
          scrub: number(element, "advanced-scrub", 1),
          start: string(element, "advanced-start", "top top"),
          trigger: element
        }
      });
      if (background) {
        timeline.to(background, { duration: 1, ease: "none", scale: number(element, "advanced-hero-scale", 6.5) }, 0);
      }
      if (leftTitle) timeline.to(leftTitle, { duration: 1, ease: "none", x: () => -window.innerWidth / 2 }, 0);
      if (rightTitle) timeline.to(rightTitle, { duration: 1, ease: "none", x: () => window.innerWidth / 2 }, 0);
      timeline.to(
        aircraft,
        {
          duration: 0.65,
          ease: "power2.inOut",
          scale: number(element, "advanced-aircraft-scale", 0.4),
          yPercent: number(element, "advanced-aircraft-y", -8)
        },
        0.95
      );
      if (blueprint) {
        timeline.fromTo(
          blueprint,
          { autoAlpha: 0, yPercent: -110 },
          { autoAlpha: 1, duration: 0.45, ease: "power2.out", yPercent: 0 },
          1.2
        );
      }
      if (globe) {
        timeline.fromTo(
          globe,
          { autoAlpha: 0, rotation: -45, scale: 0.7 },
          { autoAlpha: 1, duration: 0.55, ease: "power2.out", rotation: 0, scale: 1 },
          1.35
        );
      }
      if (specs.length) {
        timeline.fromTo(
          specs,
          { autoAlpha: 0, yPercent: 30 },
          { autoAlpha: 1, duration: 0.35, ease: "power3.out", stagger: 0.06, yPercent: 0 },
          1.45
        );
      }
      return () => {
        timeline.scrollTrigger?.kill();
        timeline.kill();
      };
    }
  );

  return () => {
    mm.revert();
    animated.forEach((item, index) => restoreStyle(item, initialStyles[index]));
  };
}

createAdvancedPackage({
  category: "composition",
  mount,
  name: "aircraft-scroll-story",
  selector: '[data-advanced="aircraft-scroll-story"]'
});
