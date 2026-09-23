import { readNumber, readString } from "../core/config.js";

function restoreAttribute(element, name, value) {
  if (!element) return;
  if (value == null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}

function restoreInlineStyle(element, value) {
  if (!element) return;
  if (value == null) element.removeAttribute("style");
  else element.setAttribute("style", value);
}

function warn(logger, message, element) {
  logger?.warn?.(`[MotionKit] strip-flip-preview: ${message}`, element);
}

export const stripFlipPreview = {
  name: "strip-flip-preview",
  category: "component",
  selector: '[data-motion~="strip-flip-preview"]',

  mount(root, { Flip, gsap, logger, reducedMotion }) {
    const overlay = root.querySelector('[data-motion-target="preview-overlay"]');
    const back = root.querySelector('[data-motion-target="preview-back"]');
    const previewLayer = root.querySelector('[data-motion-target="preview-layer"]');
    const triggers = [...root.querySelectorAll("[data-motion-preview-trigger]")];
    const previews = [...root.querySelectorAll("[data-motion-preview]")];

    if (!overlay) {
      warn(logger, 'missing data-motion-target="preview-overlay".', root);
      return;
    }
    if (!back) {
      warn(logger, 'missing data-motion-target="preview-back".', root);
      return;
    }
    if (!triggers.length) {
      warn(logger, "no data-motion-preview-trigger elements found.", root);
      return;
    }
    if (!previews.length) {
      warn(logger, "no data-motion-preview elements found.", root);
      return;
    }

    const previewByKey = new Map();
    previews.forEach((preview) => {
      const key = preview.getAttribute("data-motion-preview");
      if (!key) {
        warn(logger, "preview is missing its key.", preview);
        return;
      }
      if (previewByKey.has(key)) {
        warn(logger, `duplicate preview key "${key}".`, preview);
        return;
      }
      previewByKey.set(key, preview);
    });

    const items = [];
    triggers.forEach((trigger, index) => {
      const key = trigger.getAttribute("data-motion-preview-trigger");
      if (!key) {
        warn(logger, "trigger is missing its preview key.", trigger);
        return;
      }

      const preview = previewByKey.get(key);
      if (!preview) {
        warn(logger, `missing data-motion-preview="${key}".`, trigger);
        return;
      }

      const titleInner = trigger.querySelector('[data-motion-target="title-inner"]');
      const media = trigger.querySelector('[data-motion-target="media"]');
      const caption = trigger.querySelector('[data-motion-target="caption"]');
      const previewMedia = preview.querySelector('[data-motion-target="preview-media"]');

      if (!titleInner) {
        warn(logger, `missing data-motion-target="title-inner" for "${key}".`, trigger);
        return;
      }
      if (!media) {
        warn(logger, `missing data-motion-target="media" for "${key}".`, trigger);
        return;
      }
      if (!caption) {
        warn(logger, `missing data-motion-target="caption" for "${key}".`, trigger);
        return;
      }
      if (!previewMedia) {
        warn(logger, `missing data-motion-target="preview-media" for "${key}".`, preview);
        return;
      }

      items.push({
        caption,
        index,
        key,
        media,
        preview,
        previewMedia,
        trigger,
        titleInner,
        descriptions: [...preview.querySelectorAll('[data-motion-target="description"]')],
        slideTexts: [...preview.querySelectorAll('[data-motion-target="slide-text"]')]
      });
    });

    if (!items.length) {
      warn(logger, "no valid trigger/preview pairs could be mounted.", root);
      return;
    }

    const reduce = reducedMotion();
    const duration = reduce ? 0 : readNumber(root, "motion-duration", 0.8);
    const ease = readString(root, "motion-ease", "power4.inOut");
    const contentDelay = reduce ? 0 : readNumber(root, "motion-content-delay", 0.6);
    const textDuration = reduce ? 0 : readNumber(root, "motion-text-duration", 1.1);
    const textEase = readString(root, "motion-text-ease", "expo");
    const textDelay = reduce ? 0 : readNumber(root, "motion-text-delay", 0.3);
    const descriptionOffset = readNumber(root, "motion-description-offset", 5);

    const original = {
      backStyle: back.getAttribute("style"),
      overlayStyle: overlay.getAttribute("style"),
      previewLayerAria: previewLayer?.getAttribute("aria-hidden") ?? null,
      previewStyles: previews.map((preview) => preview.getAttribute("style")),
      rootState: root.getAttribute("data-motion-preview-state"),
      triggerStyles: items.map((item) => item.trigger.getAttribute("style"))
    };

    let activeTimeline;
    let activeFlip;
    let current = null;
    let inPreview = false;
    let isAnimating = false;
    let mediaHome = null;
    let savedBodyOverflow = "";
    let lastTrigger = null;

    root.setAttribute("data-motion-preview-state", "closed");
    gsap.set(overlay, { scaleX: 1, scaleY: 0, x: 0 });
    gsap.set(back, {
      autoAlpha: 0,
      pointerEvents: "none"
    });
    previews.forEach((preview) => {
      gsap.set(preview, {
        pointerEvents: "none",
        visibility: "hidden"
      });
    });
    if (previewLayer) previewLayer.setAttribute("aria-hidden", "true");

    const restoreMediaHome = () => {
      if (!current || !mediaHome) return;
      const { media } = current;
      if (media.parentElement !== mediaHome.parent) {
        mediaHome.parent.insertBefore(media, mediaHome.nextSibling);
      }
      restoreInlineStyle(media, mediaHome.style);
    };

    const close = () => {
      if (!inPreview || isAnimating || !current || !mediaHome) return;

      isAnimating = true;
      gsap.set(back, { pointerEvents: "none" });

      const item = current;
      const rect = item.trigger.getBoundingClientRect();

      activeTimeline?.kill();
      activeTimeline = gsap.timeline({
        defaults: {
          duration,
          ease
        },
        onComplete: () => {
          gsap.set(item.preview, {
            pointerEvents: "none",
            visibility: "hidden"
          });
          gsap.set(item.trigger, { clearProps: "zIndex" });
          gsap.set(back, {
            autoAlpha: 0,
            pointerEvents: "none"
          });

          if (previewLayer) previewLayer.setAttribute("aria-hidden", "true");
          root.setAttribute("data-motion-preview-state", "closed");
          document.body.style.overflow = savedBodyOverflow;

          inPreview = false;
          isAnimating = false;
          current = null;
          mediaHome = null;
          lastTrigger?.focus?.({ preventScroll: true });
          lastTrigger = null;
        }
      });

      activeTimeline
        .addLabel("start", 0)
        .to(back, {
          autoAlpha: 0,
          ease: "power2"
        }, "start");

      if (item.descriptions.length) {
        activeTimeline
          .to(item.descriptions, {
            ease: "power2",
            opacity: 0
          }, "start")
          .to(item.descriptions, {
            yPercent: 15
          }, "start");
      }

      if (item.slideTexts.length) {
        activeTimeline.to(item.slideTexts, {
          yPercent: 100
        }, "start");
      }

      activeTimeline
        .add(() => {
          activeFlip?.kill();
          const state = Flip.getState(item.media);
          mediaHome.parent.insertBefore(item.media, mediaHome.nextSibling);
          restoreInlineStyle(item.media, mediaHome.style);
          activeFlip = Flip.from(state, {
            absolute: true,
            duration,
            ease
          });
        }, "start")
        .to(overlay, {
          scaleX: rect.width / window.innerWidth,
          x: rect.left
        }, "start")
        .to(overlay, {
          scaleY: 0
        }, `start+=${reduce ? 0 : 0.6}`)
        .to(item.titleInner, {
          yPercent: 0
        }, `start+=${reduce ? 0 : 0.6}`)
        .to(item.caption, {
          opacity: 1,
          yPercent: 0
        }, `start+=${reduce ? 0 : 0.6}`);
    };

    const open = (item, event) => {
      event?.preventDefault?.();
      if (inPreview || isAnimating) return;

      isAnimating = true;
      current = item;
      lastTrigger = item.media;
      mediaHome = {
        nextSibling: item.media.nextSibling,
        parent: item.media.parentElement,
        style: item.media.getAttribute("style")
      };

      const rect = item.trigger.getBoundingClientRect();

      activeTimeline?.kill();
      activeTimeline = gsap.timeline({
        defaults: {
          duration,
          ease
        },
        onStart: () => {
          inPreview = true;
          savedBodyOverflow = document.body.style.overflow;
          document.body.style.overflow = "hidden";
          root.setAttribute("data-motion-preview-state", "open");

          gsap.set(item.trigger, { zIndex: 10 });
          gsap.set(overlay, {
            scaleX: rect.width / window.innerWidth,
            scaleY: 0,
            transformOrigin: item.index % 2 ? "0% 100%" : "0% 0%",
            x: rect.left
          });

          if (item.slideTexts.length) {
            gsap.set(item.slideTexts, { yPercent: 100 });
          }
          if (item.descriptions.length) {
            gsap.set(item.descriptions, {
              opacity: 0,
              xPercent: (index) => index ? -descriptionOffset : descriptionOffset
            });
          }

          gsap.set(back, {
            autoAlpha: 0,
            pointerEvents: "none",
            xPercent: 15
          });
          gsap.set(item.preview, {
            pointerEvents: "auto",
            visibility: "visible"
          });
          if (previewLayer) previewLayer.setAttribute("aria-hidden", "false");
        },
        onComplete: () => {
          isAnimating = false;
          gsap.set(back, { pointerEvents: "auto" });
          back.focus?.({ preventScroll: true });
        }
      });

      activeTimeline
        .addLabel("start", 0)
        .addLabel("content", `start+=${contentDelay}`)
        .to(item.titleInner, {
          yPercent: item.index % 2 ? -100 : 100
        }, "start")
        .to(item.caption, {
          opacity: 0,
          yPercent: item.index % 2 ? -10 : 10
        }, "start")
        .to(overlay, {
          scaleY: 1
        }, "start")
        .to(overlay, {
          scaleX: 1,
          x: 0
        }, "content")
        .add(() => {
          activeFlip?.kill();
          const state = Flip.getState(item.media);
          item.previewMedia.appendChild(item.media);
          activeFlip = Flip.from(state, {
            absolute: true,
            duration,
            ease
          });
        }, "content");

      if (item.slideTexts.length) {
        activeTimeline.to(item.slideTexts, {
          duration: textDuration,
          ease: textEase,
          yPercent: 0
        }, `content+=${textDelay}`);
      }

      if (item.descriptions.length) {
        activeTimeline.to(item.descriptions, {
          duration: textDuration,
          ease: textEase,
          opacity: 1,
          xPercent: 0
        }, `content+=${textDelay}`);
      }

      activeTimeline.to(back, {
        autoAlpha: 1,
        xPercent: 0
      }, "content");
    };

    const triggerListeners = items.map((item) => {
      const listener = (event) => open(item, event);
      item.media.addEventListener("click", listener);
      return listener;
    });

    const backListener = (event) => {
      event.preventDefault();
      close();
    };
    const keyListener = (event) => {
      if (event.key === "Escape" && inPreview) close();
    };

    back.addEventListener("click", backListener);
    document.addEventListener("keydown", keyListener);

    return () => {
      activeTimeline?.kill();
      activeFlip?.kill();

      items.forEach((item, index) => {
        item.media.removeEventListener("click", triggerListeners[index]);
      });
      back.removeEventListener("click", backListener);
      document.removeEventListener("keydown", keyListener);

      if (inPreview) {
        restoreMediaHome();
        document.body.style.overflow = savedBodyOverflow;
      }

      restoreInlineStyle(overlay, original.overlayStyle);
      restoreInlineStyle(back, original.backStyle);
      previews.forEach((preview, index) => {
        restoreInlineStyle(preview, original.previewStyles[index]);
      });
      items.forEach((item, index) => {
        restoreInlineStyle(item.trigger, original.triggerStyles[index]);
      });

      restoreAttribute(root, "data-motion-preview-state", original.rootState);
      restoreAttribute(previewLayer, "aria-hidden", original.previewLayerAria);
    };
  }
};
