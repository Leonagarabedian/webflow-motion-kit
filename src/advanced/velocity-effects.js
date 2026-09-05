import { gsap, ScrollTrigger } from "gsap/all";
import "./advanced.css";
import { clamp, number, reducedMotion, restoreStyle } from "./shared/config.js";
import { createAdvancedPackage } from "./shared/runtime.js";

gsap.registerPlugin(ScrollTrigger);

function mount(element) {
  const layers = [...element.querySelectorAll("[data-advanced-velocity-layer]")];
  if (!layers.length || reducedMotion()) return;
  const originalStyles = layers.map((layer) => layer.getAttribute("style"));
  const strength = number(element, "advanced-strength", 28);
  const skew = number(element, "advanced-skew", 7);
  const xSetters = layers.map((layer) =>
    gsap.quickTo(layer, "x", { duration: 0.32, ease: "power3.out" })
  );
  const skewSetters = layers.map((layer) =>
    gsap.quickTo(layer, "skewX", { duration: 0.4, ease: "power3.out" })
  );
  let settleCall;

  const settle = () => {
    layers.forEach((_, index) => {
      xSetters[index](0);
      skewSetters[index](0);
    });
  };
  const trigger = ScrollTrigger.create({
    end: "bottom top",
    onUpdate: (self) => {
      const velocity = clamp(self.getVelocity() / 1800, -1, 1);
      layers.forEach((_, index) => {
        const direction = index % 2 ? -1 : 1;
        const depth = (index + 1) / layers.length;
        xSetters[index](velocity * strength * direction * depth);
        skewSetters[index](velocity * skew * direction);
      });
      settleCall?.kill();
      settleCall = gsap.delayedCall(0.12, settle);
    },
    start: "top bottom",
    trigger: element
  });

  return () => {
    trigger.kill();
    settleCall?.kill();
    gsap.killTweensOf(layers);
    layers.forEach((layer, index) => restoreStyle(layer, originalStyles[index]));
  };
}

createAdvancedPackage({
  category: "primitive",
  mount,
  name: "velocity-effects",
  selector: '[data-advanced="velocity-effects"]'
});
