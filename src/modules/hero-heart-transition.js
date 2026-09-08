import {
  readNumber,
  readString,
  selectTarget
} from "../core/config.js";

function restoreInlineStyle(target, originalStyle) {
  if (!target) return;
  if (originalStyle == null) target.removeAttribute("style");
  else target.setAttribute("style", originalStyle);
}

function phaseProgress(progress, start, end, clamp) {
  const duration = Math.max(end - start, 0.0001);
  return clamp(0, 1, (progress - start) / duration);
}

function interpolate(from, to, progress) {
  return from + (to - from) * progress;
}

function createHeartOverlay(element, color, sizePx) {
  const ns = "http://www.w3.org/2000/svg";
  const wrapper = document.createElement("div");
  const svg = document.createElementNS(ns, "svg");
  const path = document.createElementNS(ns, "path");

  wrapper.setAttribute("data-motion-generated", "hero-heart-shape");
  wrapper.setAttribute("aria-hidden", "true");

  Object.assign(wrapper.style, {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: `${sizePx}px`,
    height: `${sizePx}px`,
    transform: "translate(-50%, -50%)",
    transformOrigin: "50% 50%",
    pointerEvents: "none",
    zIndex: "4",
    visibility: "hidden"
  });

  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.style.display = "block";
  svg.style.overflow = "visible";

  path.setAttribute("fill", color);
  svg.appendChild(path);
  wrapper.appendChild(svg);
  element.appendChild(wrapper);

  return { wrapper, path };
}

export const heroHeartTransition = {
  name: "hero-heart-transition",
  category: "composition",
  selector: '[data-motion~="hero-heart-transition"]',

  mount(element, { gsap, ScrollTrigger, MorphSVGPlugin }) {
    const frame = selectTarget(element, "frame", null);
    const intro = selectTarget(element, "intro", null);
    const overlayDark = selectTarget(element, "overlay-dark", null);
    const bgCopyLeft = selectTarget(element, "bg-copy-left", null);
    const bgCopyRight = selectTarget(element, "bg-copy-right", null);

    if (!frame || !ScrollTrigger || !MorphSVGPlugin) return;

    const minWidth = readNumber(element, "motion-min-width", 992);
    const scrollVh = readNumber(element, "motion-scroll-vh", 500);
    const scrub = readNumber(element, "motion-scrub", 1);
    const start = readString(element, "motion-start", "top top");

    const clipEnd = readNumber(element, "motion-clip-end", 0.25);
    const slitLeft = readNumber(element, "motion-slit-left", 48);
    const slitRight = readNumber(element, "motion-slit-right", 52);
    const darkOpacityEnd = readNumber(element, "motion-dark-opacity", 1);
    const introFadeStart = readNumber(element, "motion-intro-fade-start", 0);
    const introFadeEnd = readNumber(element, "motion-intro-fade-end", clipEnd);

    const rotateStart = readNumber(element, "motion-rotate-start", 0.25);
    const rotateEnd = readNumber(element, "motion-rotate-end", 0.45);
    const rotateTo = readNumber(element, "motion-rotate", 65);

    const scaleStart = readNumber(element, "motion-scale-start", 0.45);
    const morphStart = readNumber(element, "motion-heart-start", 0.56);
    const morphEnd = readNumber(element, "motion-heart-end", 0.63);
    const settleEnd = readNumber(element, "motion-heart-settle-end", 0.65);
    const handoffScale = readNumber(element, "motion-heart-handoff-scale", 1);
    const heartScale = readNumber(element, "motion-heart-scale", 1);
    const heartSettleFrom = readNumber(element, "motion-heart-settle-from", 0.94);
    const heartRotation = readNumber(element, "motion-heart-rotation", 0);
    const heartColor = readString(element, "motion-heart-color", "#000000");
    const heartSize = readNumber(element, "motion-heart-size", 160);

    const copyStartWidth = readNumber(element, "motion-copy-start-width", 30);
    const copyEndWidth = readNumber(element, "motion-copy-end-width", 20);
    const leftStartCenter = readNumber(element, "motion-copy-left-start-center", 15);
    const leftEndCenter = readNumber(element, "motion-copy-left-end-center", 32);
    const rightStartCenter = readNumber(element, "motion-copy-right-start-center", 85);
    const rightEndCenter = readNumber(element, "motion-copy-right-end-center", 64);
    const copyOpacityStart = readNumber(element, "motion-copy-opacity-start", 0);
    const copyOpacityEnd = readNumber(element, "motion-copy-opacity-end", 1);
    const copyZ = readNumber(element, "motion-copy-z", 3);

    const targets = [frame, intro, overlayDark, bgCopyLeft, bgCopyRight].filter(Boolean);
    const originalStyles = new Map(
      targets.map((target) => [target, target.getAttribute("style")])
    );
    const originalElementPosition = element.style.position;

    if (getComputedStyle(element).position === "static") {
      element.style.position = "relative";
    }

    const { wrapper: heartShape, path: heartPath } = createHeartOverlay(
      element,
      heartColor,
      heartSize
    );

    const slitD = "M48 0 H52 V100 H48 Z";
    const heartD =
      "M50 92 C42 84 10 64 10 38 C10 21 22 10 38 10 C45 10 49 14 50 29 C51 14 55 10 62 10 C78 10 90 21 90 38 C90 64 58 84 50 92 Z";

    heartPath.setAttribute("d", slitD);

    const morphTween = gsap.to(heartPath, {
      morphSVG: { shape: heartD },
      duration: 1,
      ease: "none",
      paused: true
    });

    const mm = gsap.matchMedia();

    mm.add(
      {
        desktop: `(min-width: ${minWidth}px)`,
        reduceMotion: "(prefers-reduced-motion: reduce)"
      },
      ({ conditions }) => {
        if (!conditions.desktop || conditions.reduceMotion) return;

        const clamp = gsap.utils.clamp;
        const introStartOpacity = intro
          ? Number(gsap.getProperty(intro, "opacity")) || 1
          : 1;

        gsap.set(frame, {
          clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
          WebkitClipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
          rotation: 0,
          scale: 1,
          opacity: 1,
          visibility: "visible",
          transformOrigin: "50% 50%",
          willChange: "clip-path, transform"
        });

        if (intro) {
          gsap.set(intro, {
            opacity: introStartOpacity,
            visibility: "visible",
            willChange: "opacity"
          });
        }

        if (overlayDark) {
          gsap.set(overlayDark, {
            opacity: 0,
            visibility: "visible",
            willChange: "opacity"
          });
        }

        if (bgCopyLeft) {
          gsap.set(bgCopyLeft, {
            left: `${leftStartCenter - copyStartWidth / 2}%`,
            right: "auto",
            width: `${copyStartWidth}%`,
            opacity: copyOpacityStart,
            visibility: copyOpacityStart > 0 ? "visible" : "hidden",
            zIndex: copyZ,
            pointerEvents: "none",
            willChange: "left, width, opacity"
          });
        }

        if (bgCopyRight) {
          gsap.set(bgCopyRight, {
            left: `${rightStartCenter - copyStartWidth / 2}%`,
            right: "auto",
            width: `${copyStartWidth}%`,
            opacity: copyOpacityStart,
            visibility: copyOpacityStart > 0 ? "visible" : "hidden",
            zIndex: copyZ,
            pointerEvents: "none",
            willChange: "left, width, opacity"
          });
        }

        gsap.set(heartShape, {
          rotation: rotateTo,
          scale: handoffScale,
          opacity: 0,
          visibility: "hidden",
          transformOrigin: "50% 50%",
          willChange: "transform, opacity"
        });

        function render(scrollProgress) {
          const phase1 = phaseProgress(scrollProgress, 0, clipEnd, clamp);
          const leftEdge = interpolate(0, slitLeft, phase1);
          const rightEdge = interpolate(100, slitRight, phase1);
          const slitPath = `polygon(${leftEdge}% 0%, ${rightEdge}% 0%, ${rightEdge}% 100%, ${leftEdge}% 100%)`;

          gsap.set(frame, {
            clipPath: slitPath,
            WebkitClipPath: slitPath
          });

          if (overlayDark) {
            gsap.set(overlayDark, {
              opacity: interpolate(0, darkOpacityEnd, phase1)
            });
          }

          if (intro) {
            const introProgress = phaseProgress(
              scrollProgress,
              introFadeStart,
              introFadeEnd,
              clamp
            );
            gsap.set(intro, {
              opacity: interpolate(introStartOpacity, 0, introProgress),
              visibility: introProgress >= 1 ? "hidden" : "visible"
            });
          }

          const phase2 = phaseProgress(
            scrollProgress,
            rotateStart,
            rotateEnd,
            clamp
          );
          const rotation = interpolate(0, rotateTo, phase2);
          gsap.set(frame, { rotation });

          const shrinkProgress = phaseProgress(
            scrollProgress,
            scaleStart,
            morphStart,
            clamp
          );
          const frameScale = interpolate(1, 0.18, shrinkProgress);
          const handoffReached = scrollProgress >= morphStart;

          gsap.set(frame, {
            scale: frameScale,
            opacity: handoffReached ? 0 : 1,
            visibility: handoffReached ? "hidden" : "visible"
          });

          const copyProgress = phaseProgress(
            scrollProgress,
            scaleStart,
            settleEnd,
            clamp
          );
          const copyWidth = interpolate(copyStartWidth, copyEndWidth, copyProgress);
          const leftCenter = interpolate(leftStartCenter, leftEndCenter, copyProgress);
          const rightCenter = interpolate(rightStartCenter, rightEndCenter, copyProgress);
          const copyOpacity = interpolate(
            copyOpacityStart,
            copyOpacityEnd,
            copyProgress
          );
          const copiesShouldShow = scrollProgress >= scaleStart;

          if (bgCopyLeft) {
            gsap.set(bgCopyLeft, {
              left: `${leftCenter - copyWidth / 2}%`,
              width: `${copyWidth}%`,
              opacity: copyOpacity,
              visibility: copiesShouldShow ? "visible" : "hidden"
            });
          }

          if (bgCopyRight) {
            gsap.set(bgCopyRight, {
              left: `${rightCenter - copyWidth / 2}%`,
              width: `${copyWidth}%`,
              opacity: copyOpacity,
              visibility: copiesShouldShow ? "visible" : "hidden"
            });
          }

          const morphProgress = phaseProgress(
            scrollProgress,
            morphStart,
            morphEnd,
            clamp
          );
          morphTween.progress(morphProgress);

          const settleProgress = phaseProgress(
            scrollProgress,
            morphEnd,
            settleEnd,
            clamp
          );
          const shapeScaleDuringMorph = interpolate(
            handoffScale,
            heartScale * heartSettleFrom,
            morphProgress
          );
          const settledScale = interpolate(
            heartScale * heartSettleFrom,
            heartScale,
            settleProgress
          );
          const shapeScale =
            scrollProgress < morphEnd ? shapeScaleDuringMorph : settledScale;
          const shapeRotation = interpolate(
            rotateTo,
            heartRotation,
            morphProgress
          );

          gsap.set(heartShape, {
            scale: shapeScale,
            rotation: shapeRotation,
            opacity: handoffReached ? 1 : 0,
            visibility: handoffReached ? "visible" : "hidden"
          });
        }

        render(0);

        const trigger = ScrollTrigger.create({
          trigger: element,
          start,
          end: () => `+=${window.innerHeight * (scrollVh / 100)}`,
          pin: element,
          pinSpacing: true,
          scrub,
          invalidateOnRefresh: true,
          onUpdate: (self) => render(self.progress),
          onRefresh: (self) => render(self.progress)
        });

        return () => trigger.kill();
      }
    );

    return () => {
      mm.revert();
      morphTween.kill();
      heartShape.remove();
      element.style.position = originalElementPosition;
      for (const [target, originalStyle] of originalStyles) {
        restoreInlineStyle(target, originalStyle);
      }
    };
  }
};
