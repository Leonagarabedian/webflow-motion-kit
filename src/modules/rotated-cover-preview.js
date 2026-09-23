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
  logger?.warn?.(`[MotionKit] rotated-cover-preview: ${message}`, element);
}

export const rotatedCoverPreview = {
  name: "rotated-cover-preview",
  category: "component",
  selector: '[data-motion~="rotated-cover-preview"]',

  mount(root, { gsap, logger, reducedMotion }) {
    const overlayInner = root.querySelector('[data-motion-target="preview-overlay-inner"]');
    const back = root.querySelector('[data-motion-target="preview-back"]');
    const layer = root.querySelector('[data-motion-target="preview-layer"]');
    const triggers = [...root.querySelectorAll("[data-motion-preview-trigger]")];
    const previews = [...root.querySelectorAll("[data-motion-preview]")];

    if (!overlayInner || !back || !triggers.length || !previews.length) {
      warn(logger, "missing overlay-inner, back control, triggers, or previews.", root);
      return;
    }

    const byKey = new Map(previews.map((preview) => [
      preview.getAttribute("data-motion-preview"),
      preview
    ]));

    const items = [];
    triggers.forEach((trigger) => {
      const key = trigger.getAttribute("data-motion-preview-trigger");
      const preview = byKey.get(key);
      if (!key || !preview) {
        warn(logger, `missing matching preview for "${key || "unnamed"}".`, trigger);
        return;
      }

      const media = trigger.querySelector('[data-motion-target="media"]');
      const previewWrap = preview.querySelector('[data-motion-target="preview-media-wrap"]');
      const previewImage = preview.querySelector('[data-motion-target="preview-image"]');
      const slideTexts = [...preview.querySelectorAll('[data-motion-target="slide-text"]')];
      const descriptions = [...preview.querySelectorAll('[data-motion-target="description"]')];

      if (!media || !previewWrap || !previewImage) {
        warn(logger, `"${key}" requires media, preview-media-wrap, and preview-image.`, trigger);
        return;
      }

      items.push({ descriptions, key, media, preview, previewImage, previewWrap, slideTexts, trigger });
    });

    if (!items.length) return;

    const reduce = reducedMotion();
    const duration = reduce ? 0 : readNumber(root, "motion-duration", 1.1);
    const ease = readString(root, "motion-ease", "expo");
    const previewDelay = reduce ? 0 : readNumber(root, "motion-preview-delay", 0.3);
    const stagger = reduce ? 0 : readNumber(root, "motion-stagger", 0.05);
    const closeDuration = reduce ? 0 : readNumber(root, "motion-close-duration", 1);

    const original = {
      overlay: overlayInner.getAttribute("style"),
      back: back.getAttribute("style"),
      state: root.getAttribute("data-motion-preview-state"),
      layerAria: layer?.getAttribute("aria-hidden") ?? null,
      previews: previews.map((preview) => preview.getAttribute("style"))
    };

    let active = null;
    let timeline = null;
    let isAnimating = false;

    root.setAttribute("data-motion-preview-state", "closed");
    gsap.set(overlayInner, { xPercent: -100 });
    gsap.set(back, { autoAlpha: 0, pointerEvents: "none" });
    previews.forEach((preview) => gsap.set(preview, { visibility: "hidden", pointerEvents: "none" }));
    if (layer) layer.setAttribute("aria-hidden", "true");

    const close = () => {
      if (!active || isAnimating) return;
      isAnimating = true;
      const item = active;
      gsap.set(back, { pointerEvents: "none" });

      timeline?.kill();
      timeline = gsap.timeline({
        defaults: { duration: closeDuration, ease: "power4" },
        onComplete: () => {
          gsap.set(item.preview, { visibility: "hidden", pointerEvents: "none" });
          root.setAttribute("data-motion-preview-state", "closed");
          if (layer) layer.setAttribute("aria-hidden", "true");
          isAnimating = false;
          active = null;
          item.media.focus?.({ preventScroll: true });
        }
      })
        .addLabel("start", 0)
        .to(back, { ease: "power2", autoAlpha: 0 }, "start")
        .to(item.descriptions, { ease: "power2", opacity: 0 }, "start")
        .to(item.descriptions, { yPercent: 15 }, "start")
        .to(item.slideTexts, { yPercent: 100 }, "start")
        .to(item.previewImage, { xPercent: -100 }, "start")
        .to(item.previewWrap, { xPercent: 100, opacity: 1 }, "start")
        .to(overlayInner, {
          ease: "power2",
          xPercent: 100
        }, `start+=${reduce ? 0 : 0.4}`);
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
          gsap.set(item.previewImage, { xPercent: 100 });
          gsap.set(item.previewWrap, { xPercent: -102, opacity: 0 });
          gsap.set(item.slideTexts, { yPercent: 100 });
          gsap.set(item.descriptions, { yPercent: 15, opacity: 0 });
          gsap.set(back, {
            autoAlpha: 0,
            pointerEvents: "none",
            xPercent: 15
          });
          gsap.set(item.preview, { visibility: "visible", pointerEvents: "auto" });
          if (layer) layer.setAttribute("aria-hidden", "false");
        },
        onComplete: () => {
          isAnimating = false;
          gsap.set(back, { pointerEvents: "auto" });
          back.focus?.({ preventScroll: true });
        }
      })
        .addLabel("start", 0)
        .addLabel("preview", `start+=${previewDelay}`)
        .to(overlayInner, {
          ease: "power2",
          startAt: { xPercent: -100 },
          xPercent: 0
        }, "start")
        .to([item.previewImage, item.previewWrap], {
          xPercent: 0
        }, "preview")
        .to(item.previewWrap, {
          opacity: 1
        }, "preview")
        .to(item.slideTexts, {
          yPercent: 0,
          stagger
        }, "preview")
        .to(item.descriptions, {
          ease: "power2",
          opacity: 1,
          stagger
        }, "preview")
        .to(item.descriptions, {
          yPercent: 0,
          stagger
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

      restoreStyle(overlayInner, original.overlay);
      restoreStyle(back, original.back);
      previews.forEach((preview, index) => restoreStyle(preview, original.previews[index]));
      restoreAttr(root, "data-motion-preview-state", original.state);
      restoreAttr(layer, "aria-hidden", original.layerAria);
    };
  }
};
