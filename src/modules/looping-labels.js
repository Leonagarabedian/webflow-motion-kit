import { readBoolean, readNumber, readString, selectTarget } from "../core/config.js";

function sanitizeClone(clone) {
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("data-motion-loop-clone", "");
  clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  clone.querySelectorAll("a, button, input, select, textarea, [tabindex]").forEach((node) => {
    node.setAttribute("tabindex", "-1");
  });
}

export const loopingLabels = {
  name: "looping-labels",
  selector: '[data-motion~="looping-labels"]',
  mount(element, { gsap, reducedMotion, supportsHover }) {
    const track = selectTarget(element, "loop-track", null);
    const group = selectTarget(element, "loop-group", null);
    if (!track || !group || reducedMotion()) return;

    const clone = group.cloneNode(true);
    const initialTrackStyle = track.getAttribute("style");
    sanitizeClone(clone);
    track.appendChild(clone);
    const direction = readString(element, "motion-direction", "left");
    const from = direction === "right" ? -50 : 0;
    const to = direction === "right" ? 0 : -50;
    const tween = gsap.fromTo(
      track,
      { xPercent: from },
      {
        duration: readNumber(element, "motion-duration", 18),
        ease: "none",
        repeat: -1,
        xPercent: to
      }
    );

    const pause = () => tween.pause();
    const resume = () => tween.play();
    const pauseOnHover = readBoolean(element, "motion-pause-hover", false) && supportsHover();
    if (pauseOnHover) {
      element.addEventListener("pointerenter", pause);
      element.addEventListener("focusin", pause);
      element.addEventListener("pointerleave", resume);
      element.addEventListener("focusout", resume);
    }
    const observer = window.IntersectionObserver
      ? new IntersectionObserver(([entry]) => (entry.isIntersecting ? resume() : pause()))
      : null;
    observer?.observe(element);

    return () => {
      element.removeEventListener("pointerenter", pause);
      element.removeEventListener("focusin", pause);
      element.removeEventListener("pointerleave", resume);
      element.removeEventListener("focusout", resume);
      observer?.disconnect();
      tween.kill();
      clone.remove();
      if (initialTrackStyle == null) track.removeAttribute("style");
      else track.setAttribute("style", initialTrackStyle);
    };
  }
};
