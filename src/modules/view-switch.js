import { readNumber, readString, selectTargets } from "../core/config.js";

export const viewSwitch = {
  name: "view-switch",
  category: "component",
  selector: '[data-motion~="view-switch"]',
  mount(element, { Flip, ScrollTrigger, reducedMotion }) {
    const buttons = [...element.querySelectorAll("[data-motion-view]")];
    const items = selectTargets(element, "view-item");
    if (buttons.length < 2 || !items.length) return;

    const initialView = element.getAttribute("data-motion-view-state");
    const gridClass = readString(element, "motion-grid-class", "is-grid");
    const sliderClass = readString(element, "motion-slider-class", "is-slider");
    const initiallyGrid = element.classList.contains(gridClass);
    const initiallySlider = element.classList.contains(sliderClass);
    const originalPressed = buttons.map((button) => button.getAttribute("aria-pressed"));
    const originalItemStyles = items.map((item) => item.getAttribute("style"));
    let activeView = readString(element, "motion-default-view", "grid");
    let flipTween;

    const apply = (view, animate = true) => {
      if (view === activeView && animate) return;
      const state = animate && !reducedMotion() ? Flip.getState(items) : null;
      activeView = view;
      element.classList.toggle(gridClass, view === "grid");
      element.classList.toggle(sliderClass, view === "slider");
      element.setAttribute("data-motion-view-state", view);
      buttons.forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.motionView === view));
      });
      flipTween?.kill();
      if (state) {
        flipTween = Flip.from(state, {
          absolute: true,
          duration: readNumber(element, "motion-duration", 0.7),
          ease: readString(element, "motion-ease", "power3.inOut"),
          nested: true,
          onComplete: () => ScrollTrigger.refresh(),
          scale: true
        });
      } else {
        ScrollTrigger.refresh();
      }
    };
    const listeners = buttons.map((button) => {
      const listener = () => apply(button.dataset.motionView);
      button.addEventListener("click", listener);
      return listener;
    });
    apply(activeView, false);

    return () => {
      buttons.forEach((button, index) => {
        button.removeEventListener("click", listeners[index]);
        if (originalPressed[index] == null) button.removeAttribute("aria-pressed");
        else button.setAttribute("aria-pressed", originalPressed[index]);
      });
      flipTween?.kill();
      items.forEach((item, index) => {
        if (originalItemStyles[index] == null) item.removeAttribute("style");
        else item.setAttribute("style", originalItemStyles[index]);
      });
      element.classList.toggle(gridClass, initiallyGrid);
      element.classList.toggle(sliderClass, initiallySlider);
      if (initialView == null) element.removeAttribute("data-motion-view-state");
      else element.setAttribute("data-motion-view-state", initialView);
    };
  }
};
