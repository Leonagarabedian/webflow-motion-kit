// Adapted from Codrops "On-Scroll Text Motion".
// Original source: https://github.com/codrops/ScrollTextMotion
// MIT License.

import { readNumber, readString } from "../../core/config.js";
import { scrollMode } from "../../core/scroll-alignment/contract.js";
import { computeAlignedStart } from "../../core/scroll-alignment/geometry.js";

const DEFAULTS = Object.freeze({
  ease: "expo.inOut",
  props: "opacity,filter,width",
  minWidth: 0,
  enterStart: "clamp(bottom bottom-=10%)",
  enterEnd: "clamp(center center)",
  returnStart: "clamp(center center)",
  returnEnd: "clamp(top top)"
});

function classList(value) {
  return String(value || "")
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function restoreStyle(element, value) {
  if (value == null) element.removeAttribute("style");
  else element.setAttribute("style", value);
}

function scrubValue(element) {
  const raw = element.getAttribute("data-motion-scrub");
  if (raw == null || raw === "" || raw === "true") return true;
  if (raw === "false") return false;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : true;
}

function clampScroll(value, ScrollTrigger) {
  const max = ScrollTrigger?.maxScroll?.(window);
  if (!Number.isFinite(max)) return Math.max(0, value);
  return Math.max(0, Math.min(max, value));
}

function autoRange(element, phase, ScrollTrigger) {
  if (phase === "enter") {
    return {
      start: () =>
        clampScroll(
          computeAlignedStart({
            trigger: element,
            anchor: "bottom",
            viewport: 0.9
          }),
          ScrollTrigger
        ),
      end: () =>
        clampScroll(
          computeAlignedStart({
            trigger: element,
            anchor: "center",
            viewport: 0.5
          }),
          ScrollTrigger
        )
    };
  }

  return {
    start: () =>
      clampScroll(
        computeAlignedStart({
          trigger: element,
          anchor: "center",
          viewport: 0.5
        }),
        ScrollTrigger
      ),
    end: () =>
      clampScroll(
        computeAlignedStart({
          trigger: element,
          anchor: "top",
          viewport: 0
        }),
        ScrollTrigger
      )
  };
}

export const scrollTextPositionFlip = {
  name: "scroll-text-position-flip",
  category: "primitive",
  selector: '[data-motion~="scroll-text-position-flip"]',

  mount(element, { Flip, ScrollTrigger, gsap, reducedMotion, logger }) {
    if (!Flip || !ScrollTrigger) {
      logger?.warn?.(
        "[MotionKit] scroll-text-position-flip requires GSAP Flip and ScrollTrigger."
      );
      return;
    }

    const sourceClasses = classList(
      readString(element, "motion-source-class", "")
    );
    const altClasses = classList(
      readString(element, "motion-alt-class", "")
    );

    if (!altClasses.length) {
      logger?.warn?.(
        "[MotionKit] scroll-text-position-flip requires data-motion-alt-class."
      );
      return;
    }

    const originalStyle = element.getAttribute("style");
    const minWidth = Math.max(
      0,
      readNumber(element, "motion-min-width", DEFAULTS.minWidth)
    );
    const ease = readString(element, "motion-flip-ease", DEFAULTS.ease);
    const props = readString(element, "motion-flip-props", DEFAULTS.props);
    const scrub = scrubValue(element);
    const mm = gsap.matchMedia();

    mm.add(
      {
        width: `(min-width: ${minWidth}px)`,
        reduceMotion: "(prefers-reduced-motion: reduce)"
      },
      ({ conditions }) => {
        if (!conditions.width || conditions.reduceMotion || reducedMotion()) {
          return;
        }

        let enterTween = null;
        let returnTween = null;
        let resizeRaf = null;
        let fontReadyCancelled = false;

        const killTweens = () => {
          enterTween?.scrollTrigger?.kill?.();
          returnTween?.scrollTrigger?.kill?.();
          enterTween?.kill?.();
          returnTween?.kill?.();
          enterTween = null;
          returnTween = null;
        };

        const captureAltState = () => {
          const removedSource = [];
          const addedAlt = [];

          sourceClasses.forEach((name) => {
            if (!element.classList.contains(name)) return;
            element.classList.remove(name);
            removedSource.push(name);
          });

          altClasses.forEach((name) => {
            if (element.classList.contains(name)) return;
            element.classList.add(name);
            addedAlt.push(name);
          });

          const state = Flip.getState(element, { props });

          addedAlt.forEach((name) => element.classList.remove(name));
          removedSource.forEach((name) => element.classList.add(name));

          return state;
        };

        const build = () => {
          killTweens();
          restoreStyle(element, originalStyle);

          const state = captureAltState();
          const mode = scrollMode(element);

          const enterRange =
            mode === "auto"
              ? autoRange(element, "enter", ScrollTrigger)
              : {
                  start: readString(
                    element,
                    "motion-enter-start",
                    DEFAULTS.enterStart
                  ),
                  end: readString(
                    element,
                    "motion-enter-end",
                    DEFAULTS.enterEnd
                  )
                };

          const returnRange =
            mode === "auto"
              ? autoRange(element, "return", ScrollTrigger)
              : {
                  start: readString(
                    element,
                    "motion-return-start",
                    DEFAULTS.returnStart
                  ),
                  end: readString(
                    element,
                    "motion-return-end",
                    DEFAULTS.returnEnd
                  )
                };

          enterTween = Flip.to(state, {
            ease,
            scrollTrigger: {
              trigger: element,
              ...enterRange,
              scrub,
              invalidateOnRefresh: true
            }
          });

          returnTween = Flip.from(state, {
            ease,
            scrollTrigger: {
              trigger: element,
              ...returnRange,
              scrub,
              invalidateOnRefresh: true
            }
          });
        };

        const scheduleBuild = () => {
          if (resizeRaf != null) cancelAnimationFrame(resizeRaf);
          resizeRaf = requestAnimationFrame(() => {
            resizeRaf = null;
            build();
            ScrollTrigger.refresh();
          });
        };

        build();
        window.addEventListener("resize", scheduleBuild);

        if (document.fonts?.ready) {
          document.fonts.ready.then(() => {
            if (!fontReadyCancelled) scheduleBuild();
          });
        }

        return () => {
          fontReadyCancelled = true;
          window.removeEventListener("resize", scheduleBuild);
          if (resizeRaf != null) cancelAnimationFrame(resizeRaf);
          killTweens();
          restoreStyle(element, originalStyle);
        };
      }
    );

    return () => {
      mm.revert();
      restoreStyle(element, originalStyle);
    };
  }
};
