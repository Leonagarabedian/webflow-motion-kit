import { readNumber, readString, selectTarget } from "../core/config.js";

export function isTransitionLink(link, currentUrl = window.location.href) {
  if (!link || link.hasAttribute("download") || link.hasAttribute("data-motion-no-transition")) {
    return false;
  }
  if (link.target && link.target !== "_self") return false;
  const destination = new URL(link.href, currentUrl);
  const current = new URL(currentUrl);
  if (destination.origin !== current.origin) return false;
  if (destination.pathname === current.pathname && destination.search === current.search) {
    return !destination.hash && destination.href !== current.href;
  }
  return true;
}

export const pageTransition = {
  name: "page-transition",
  category: "component",
  selector: '[data-motion~="page-transition"]',
  mount(element, { gsap, reducedMotion }) {
    const panel = selectTarget(element, "transition-panel", element);
    const initialStyle = panel.getAttribute("style");
    const duration = reducedMotion() ? 0 : readNumber(element, "motion-duration", 0.7);
    let leaving = false;
    let leaveTween;

    gsap.set(panel, { autoAlpha: 1, pointerEvents: "none", yPercent: 0 });
    const entryTween = gsap.to(panel, {
      autoAlpha: reducedMotion() ? 0 : 1,
      delay: reducedMotion() ? 0 : readNumber(element, "motion-entry-delay", 0.05),
      duration,
      ease: readString(element, "motion-ease", "power4.inOut"),
      yPercent: reducedMotion() ? 0 : -100
    });

    const onClick = (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        leaving
      ) {
        return;
      }
      const link = event.target.closest("a[href]");
      if (!isTransitionLink(link)) return;
      if (reducedMotion()) return;

      event.preventDefault();
      leaving = true;
      entryTween.kill();
      leaveTween = gsap.to(panel, {
        autoAlpha: 1,
        duration,
        ease: readString(element, "motion-ease", "power4.inOut"),
        onComplete: () => window.location.assign(link.href),
        yPercent: 0
      });
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      entryTween.kill();
      leaveTween?.kill();
      if (initialStyle == null) panel.removeAttribute("style");
      else panel.setAttribute("style", initialStyle);
    };
  }
};
