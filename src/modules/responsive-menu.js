import {
  readBoolean,
  readNumber,
  readString,
  selectTarget,
  selectTargets
} from "../core/config.js";

export const responsiveMenu = {
  name: "responsive-menu",
  category: "component",
  selector: '[data-motion~="responsive-menu"]',
  mount(element, { gsap, reducedMotion }) {
    const toggle = selectTarget(element, "menu-toggle", null);
    const panel = selectTarget(element, "menu-panel", null);
    const items = selectTargets(element, "menu-item");
    if (!toggle || !panel) return;

    const initialPanelStyle = panel.getAttribute("style");
    const initialItemStyles = items.map((item) => item.getAttribute("style"));
    const initialExpanded = toggle.getAttribute("aria-expanded");
    const initialHidden = panel.getAttribute("aria-hidden");
    const initialBodyOverflow = document.body.style.overflow;
    const duration = reducedMotion() ? 0 : readNumber(element, "motion-duration", 0.75);
    let open = false;

    gsap.set(panel, { autoAlpha: 0, clipPath: "inset(0 0 100% 0)", pointerEvents: "none" });
    gsap.set(items, { autoAlpha: 0, yPercent: 35 });

    const timeline = gsap.timeline({
      defaults: { ease: readString(element, "motion-ease", "power4.inOut") },
      paused: true
    });
    timeline
      .to(panel, { autoAlpha: 1, clipPath: "inset(0 0 0% 0)", duration }, 0)
      .to(
        items,
        {
          autoAlpha: 1,
          duration: duration * 0.65,
          ease: "power3.out",
          stagger: readNumber(element, "motion-stagger", 0.06),
          yPercent: 0
        },
        duration * 0.35
      );

    const setAccessibility = (isOpen) => {
      toggle.setAttribute("aria-expanded", String(isOpen));
      panel.setAttribute("aria-hidden", String(!isOpen));
      panel.style.pointerEvents = isOpen ? "auto" : "none";
      element.classList.toggle("is-open", isOpen);
      if (readBoolean(element, "motion-lock-scroll", true)) {
        document.body.style.overflow = isOpen ? "hidden" : initialBodyOverflow;
      }
    };

    const show = () => {
      if (open) return;
      open = true;
      setAccessibility(true);
      timeline.play();
    };
    const hide = ({ restoreFocus = false } = {}) => {
      if (!open) return;
      open = false;
      setAccessibility(false);
      timeline.reverse();
      if (restoreFocus) toggle.focus();
    };
    const toggleMenu = () => (open ? hide() : show());
    const onKeydown = (event) => event.key === "Escape" && hide({ restoreFocus: true });
    const onLinkClick = (event) => {
      if (event.target.closest("a[href]") && readBoolean(element, "motion-close-on-link", true)) {
        hide();
      }
    };

    toggle.addEventListener("click", toggleMenu);
    panel.addEventListener("click", onLinkClick);
    document.addEventListener("keydown", onKeydown);
    setAccessibility(false);

    return () => {
      toggle.removeEventListener("click", toggleMenu);
      panel.removeEventListener("click", onLinkClick);
      document.removeEventListener("keydown", onKeydown);
      timeline.kill();
      document.body.style.overflow = initialBodyOverflow;
      element.classList.remove("is-open");
      if (initialPanelStyle == null) panel.removeAttribute("style");
      else panel.setAttribute("style", initialPanelStyle);
      items.forEach((item, index) => {
        if (initialItemStyles[index] == null) item.removeAttribute("style");
        else item.setAttribute("style", initialItemStyles[index]);
      });
      if (initialExpanded == null) toggle.removeAttribute("aria-expanded");
      else toggle.setAttribute("aria-expanded", initialExpanded);
      if (initialHidden == null) panel.removeAttribute("aria-hidden");
      else panel.setAttribute("aria-hidden", initialHidden);
    };
  }
};
