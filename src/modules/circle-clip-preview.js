import { readNumber, readString } from "../core/config.js";

function restoreStyle(element, value) {
  if (!element) return;
  if (value == null) element.removeAttribute("style");
  else element.setAttribute("style", value);
}

function restoreAttr(element, name, value) {
  if (!element) return;
  if (value == null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}

function warn(logger, message, element) {
  logger?.warn?.(`[MotionKit] circle-clip-preview: ${message}`, element);
}

export const circleClipPreview = {
  name: "circle-clip-preview",
  category: "component",
  selector: '[data-motion~="circle-clip-preview"]',

  mount(root, { gsap, logger, reducedMotion }) {
    const overlay = root.querySelector('[data-motion-target="preview-overlay"]');
    const back = root.querySelector('[data-motion-target="preview-back"]');
    const layer = root.querySelector('[data-motion-target="preview-layer"]');
    const triggers = [...root.querySelectorAll("[data-motion-preview-trigger]")];
    const previews = [...root.querySelectorAll("[data-motion-preview]")];

    if (!overlay || !back || !triggers.length || !previews.length) {
      warn(logger, "missing overlay, back control, triggers, or previews.", root);
      return;
    }

    const byKey = new Map(previews.map((preview) => [
      preview.getAttribute("data-motion-preview"),
      preview
    ]));

    const items = [];
    triggers.forEach((trigger, index) => {
      const key = trigger.getAttribute("data-motion-preview-trigger");
      const preview = byKey.get(key);
      if (!key || !preview) {
        warn(logger, `missing matching preview for "${key || "unnamed"}".`, trigger);
        return;
      }

      const media = trigger.querySelector('[data-motion-target="media"]');
      const previewImage = preview.querySelector('[data-motion-target="preview-image"]');
      const previewTitle = preview.querySelector('[data-motion-target="preview-title"]');
      const boxes = [...preview.querySelectorAll('[data-motion-target="preview-box"]')];

      if (!media || !previewImage || !previewTitle) {
        warn(logger, `"${key}" requires media, preview-image, and preview-title.`, trigger);
        return;
      }

      items.push({ boxes, index, key, media, preview, previewImage, previewTitle, trigger });
    });

    if (!items.length) return;

    const reduce = reducedMotion();
    const duration = reduce ? 0 : readNumber(root, "motion-duration", 1);
    const ease = readString(root, "motion-ease", "expo");
    const previewDelay = reduce ? 0 : readNumber(root, "motion-preview-delay", 0.3);
    const clipDuration = reduce ? 0 : readNumber(root, "motion-clip-duration", 0.9);
    const clipEase = readString(root, "motion-clip-ease", "power2");
    const closeClipDuration = reduce ? 0 : readNumber(root, "motion-close-clip-duration", 0.6);
    const radius = readNumber(root, "motion-circle-radius", 60);

    const original = {
      overlay: overlay.getAttribute("style"),
      back: back.getAttribute("style"),
      state: root.getAttribute("data-motion-preview-state"),
      layerAria: layer?.getAttribute("aria-hidden") ?? null,
      previews: previews.map((preview) => preview.getAttribute("style"))
    };

    let active = null;
    let timeline = null;
    let isAnimating = false;

    const circle = (amount) =>
      `circle(${amount}vmax at ${window.innerWidth / 2}px ${window.innerHeight / 2}px)`;

    root.setAttribute("data-motion-preview-state", "closed");
    gsap.set(overlay, { scale: 0 });
    gsap.set(back, { autoAlpha: 0, pointerEvents: "none" });
    previews.forEach((preview) => gsap.set(preview, { visibility: "hidden", pointerEvents: "none" }));
    if (layer) layer.setAttribute("aria-hidden", "true");

    const close = () => {
      if (!active || isAnimating) return;
      isAnimating = true;
      const item = active;

      timeline?.kill();
      gsap.set(item.preview, { clipPath: circle(radius) });
      gsap.set(back, { pointerEvents: "none" });

      timeline = gsap.timeline({
        defaults: { duration, ease: "power2" },
        onComplete: () => {
          gsap.set(item.preview, { visibility: "hidden", pointerEvents: "none", clearProps: "clipPath" });
          root.setAttribute("data-motion-preview-state", "closed");
          if (layer) layer.setAttribute("aria-hidden", "true");
          isAnimating = false;
          active = null;
          item.media.focus?.({ preventScroll: true });
        }
      })
        .addLabel("start", 0)
        .addLabel("content", `start+=${reduce ? 0 : 0.2}`)
        .to(back, { autoAlpha: 0 }, "start")
        .to(item.previewTitle, { scale: 0.6 }, "start")
        .to(item.previewImage, { scale: 0.9 }, "start")
        .to(item.preview, {
          duration: closeClipDuration,
          clipPath: circle(0)
        }, "start")
        .to(overlay, {
          duration: closeClipDuration,
          ease: "power3.inOut",
          scale: 0
        }, "content")
        .to(item.media, {
          startAt: { scale: 1.2 },
          scale: 1
        }, "content");
    };

    const open = (item, event) => {
      event?.preventDefault?.();
      if (isAnimating || active) return;
      isAnimating = true;
      active = item;

      timeline?.kill();
      timeline = gsap.timeline({
        defaults: { duration, ease },
        onStart: () => {
          root.setAttribute("data-motion-preview-state", "open");
          gsap.set(item.preview, {
            clipPath: circle(0),
            visibility: "visible",
            pointerEvents: "auto"
          });
          gsap.set(item.previewImage, { scale: 0.8 });
          gsap.set(item.previewTitle, { scale: 1.6 });
          gsap.set(item.boxes, {
            xPercent: (index) => index ? 20 : -20
          });
          gsap.set(back, {
            autoAlpha: 0,
            pointerEvents: "none",
            xPercent: 15
          });
          if (layer) layer.setAttribute("aria-hidden", "false");
        },
        onComplete: () => {
          gsap.set(item.preview, { clearProps: "clipPath" });
          gsap.set(back, { pointerEvents: "auto" });
          isAnimating = false;
          back.focus?.({ preventScroll: true });
        }
      })
        .addLabel("start", 0)
        .addLabel("preview", `start+=${previewDelay}`)
        .to(item.media, {
          ease: "power2",
          scale: 1.2
        }, "start")
        .to(overlay, {
          ease: "power2",
          scale: 1
        }, "start")
        .to(item.preview, {
          duration: clipDuration,
          ease: clipEase,
          clipPath: circle(radius)
        }, "preview")
        .to([item.previewImage, item.previewTitle], {
          scale: 1
        }, "preview")
        .to(item.boxes, {
          xPercent: 0
        }, "preview")
        .to(back, {
          ease: "power2",
          autoAlpha: 1,
          xPercent: 0
        }, "preview");
    };

    const listeners = items.map((item) => {
      const fn = (event) => open(item, event);
      item.media.addEventListener("click", fn);
      return fn;
    });
    const backListener = (event) => {
      event.preventDefault();
      close();
    };
    const keyListener = (event) => {
      if (event.key === "Escape") close();
    };

    back.addEventListener("click", backListener);
    document.addEventListener("keydown", keyListener);

    return () => {
      timeline?.kill();
      items.forEach((item, index) => item.media.removeEventListener("click", listeners[index]));
      back.removeEventListener("click", backListener);
      document.removeEventListener("keydown", keyListener);

      restoreStyle(overlay, original.overlay);
      restoreStyle(back, original.back);
      previews.forEach((preview, index) => restoreStyle(preview, original.previews[index]));
      restoreAttr(root, "data-motion-preview-state", original.state);
      restoreAttr(layer, "aria-hidden", original.layerAria);
      items.forEach((item) => gsap.set([item.media, item.previewImage, item.previewTitle, item.boxes], { clearProps: "transform" }));
    };
  }
};
