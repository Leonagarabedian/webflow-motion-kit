import { readNumber, readString } from "../core/config.js";

function restoreInlineStyle(element, value) {
  if (value == null) element.removeAttribute("style");
  else element.setAttribute("style", value);
}

export const titleRollMediaZoomHover = {
  name: "title-roll-media-zoom-hover",
  category: "interaction",
  selector: '[data-motion~="title-roll-media-zoom-hover"]',

  mount(element, { gsap, logger, reducedMotion, supportsHover }) {
    const titleInner = element.querySelector('[data-motion-target="title-inner"]');
    const media = element.querySelector('[data-motion-target="media"]');
    const image = element.querySelector('[data-motion-target="media-image"]');

    if (!titleInner || !media || !image) {
      logger?.warn?.(
        '[MotionKit] title-roll-media-zoom-hover: requires data-motion-target="title-inner", "media", and "media-image".',
        element
      );
      return;
    }

    if (reducedMotion()) return;

    const duration = readNumber(element, "motion-duration", 0.8);
    const ease = readString(element, "motion-ease", "power4");
    const titleExitDuration = readNumber(element, "motion-title-exit-duration", 0.2);
    const titleExitEase = readString(element, "motion-title-exit-ease", "power1.in");
    const rotation = readNumber(element, "motion-title-rotation", 4);
    const blur = readNumber(element, "motion-title-blur", 6);
    const mediaScale = readNumber(element, "motion-media-scale", 0.95);
    const imageScale = readNumber(element, "motion-image-scale", 1.2);

    const original = {
      imageStyle: image.getAttribute("style"),
      mediaStyle: media.getAttribute("style"),
      titleStyle: titleInner.getAttribute("style")
    };

    const previewRoot = element.closest('[data-motion~="strip-flip-preview"]');
    let timeline;

    const previewIsOpen = () =>
      previewRoot?.getAttribute("data-motion-preview-state") === "open";

    const enter = () => {
      if (previewIsOpen()) return;

      timeline?.kill();
      timeline = gsap.timeline({
        defaults: {
          duration,
          ease
        }
      })
        .addLabel("start", 0)
        .set(titleInner, { transformOrigin: "0% 50%" }, "start")
        .to(titleInner, {
          startAt: { filter: "blur(0px)" },
          duration: titleExitDuration,
          ease: titleExitEase,
          yPercent: -100,
          rotation: -rotation,
          filter: `blur(${blur}px)`
        }, "start")
        .to(titleInner, {
          startAt: {
            yPercent: 100,
            rotation,
            filter: `blur(${blur}px)`
          },
          yPercent: 0,
          rotation: 0,
          filter: "blur(0px)"
        }, `start+=${titleExitDuration}`)
        .to(media, {
          scale: mediaScale
        }, "start")
        .to(image, {
          scale: imageScale
        }, "start");
    };

    const leave = () => {
      if (previewIsOpen()) return;

      timeline?.kill();
      timeline = gsap.timeline({
        defaults: {
          duration,
          ease
        }
      }).to([media, image], {
        scale: 1
      }, 0);
    };

    if (!supportsHover || supportsHover()) {
      media.addEventListener("pointerenter", enter);
      media.addEventListener("pointerleave", leave);
    }
    media.addEventListener("focus", enter);
    media.addEventListener("blur", leave);

    return () => {
      media.removeEventListener("pointerenter", enter);
      media.removeEventListener("pointerleave", leave);
      media.removeEventListener("focus", enter);
      media.removeEventListener("blur", leave);
      timeline?.kill();
      restoreInlineStyle(titleInner, original.titleStyle);
      restoreInlineStyle(media, original.mediaStyle);
      restoreInlineStyle(image, original.imageStyle);
    };
  }
};
