import {
  resolveScrollContract,
  viewportScroll
} from "../../core/scroll-alignment/contract.js";
import {
  readBoolean,
  readNumber,
  readString,
  selectTarget
} from "../../core/config.js";

const DEFAULTS = Object.freeze({
  perspective: 500,
  mediaScale: 2,
  z: 350,
  backgroundScale: 1.1,
  scrollVh: 150,
  ease: "power1.inOut",
  pin: true,
  minWidth: 0
});

function restoreStyle(node, value) {
  if (!node) return;
  if (value == null) node.removeAttribute("style");
  else node.setAttribute("style", value);
}

export const pinnedImageDepthZoom = {
  name: "pinned-image-depth-zoom",
  category: "composition",
  selector: '[data-motion~="pinned-image-depth-zoom"]',

  mount(element, { gsap, reducedMotion, logger }) {
    if (reducedMotion()) return;

    const depthFrame = selectTarget(
      element,
      "depth-frame",
      null
    );

    if (!depthFrame) {
      logger?.warn?.(
        "[MotionKit] pinned-image-depth-zoom requires a depth-frame target."
      );
      return;
    }

    const media = selectTarget(
      element,
      "depth-media",
      depthFrame.querySelector("img, picture, video")
    );

    if (!media) {
      logger?.warn?.(
        "[MotionKit] pinned-image-depth-zoom requires a depth-media target."
      );
      return;
    }

    const background = selectTarget(element, "background", null);
    const minWidth = Math.max(
      0,
      readNumber(element, "motion-min-width", DEFAULTS.minWidth)
    );

    const rootStyle = element.getAttribute("style");
    const frameStyle = depthFrame.getAttribute("style");
    const mediaStyle = media.getAttribute("style");
    const backgroundStyle = background?.getAttribute("style") ?? null;

    const mm = gsap.matchMedia();

    mm.add(
      {
        enabled: `(min-width: ${minWidth}px)`,
        reduceMotion: "(prefers-reduced-motion: reduce)"
      },
      ({ conditions }) => {
        if (!conditions.enabled || conditions.reduceMotion) return;

        const perspective = Math.max(
          1,
          readNumber(element, "motion-perspective", DEFAULTS.perspective)
        );
        const mediaScale = readNumber(
          element,
          "motion-media-scale",
          DEFAULTS.mediaScale
        );
        const z = readNumber(element, "motion-z", DEFAULTS.z);
        const backgroundScale = readNumber(
          element,
          "motion-background-scale",
          DEFAULTS.backgroundScale
        );
        const scrollVh = Math.max(
          1,
          readNumber(element, "motion-scroll-vh", DEFAULTS.scrollVh)
        );
        const ease = readString(element, "motion-ease", DEFAULTS.ease);
        const pinEnabled = readBoolean(
          element,
          "motion-pin",
          DEFAULTS.pin
        );

        gsap.set(depthFrame, {
          perspective,
          transformStyle: "preserve-3d"
        });

        gsap.set(media, {
          scale: 1,
          z: 0,
          transformOrigin: "center center",
          willChange: "transform"
        });

        if (background) {
          gsap.set(background, {
            scale: 1,
            transformOrigin: "center center",
            willChange: "transform"
          });
        }

        const scrollTrigger = resolveScrollContract(
          element,
          {
            trigger: element,
            start: "top top",
            end: "+=150%",
            pin: pinEnabled ? element : false,
            scrub: true,
            invalidateOnRefresh: true
          },
          () => viewportScroll(
            element,
            0,
            () => window.innerHeight * (scrollVh / 100)
          )
        );

        const timeline = gsap.timeline({ scrollTrigger });

        timeline.to(
          media,
          {
            scale: mediaScale,
            z,
            transformOrigin: "center center",
            ease
          },
          0
        );

        if (background) {
          timeline.to(
            background,
            {
              scale: backgroundScale,
              transformOrigin: "center center",
              ease
            },
            0
          );
        }

        return () => {
          timeline.kill();
          timeline.scrollTrigger?.kill?.();
          restoreStyle(depthFrame, frameStyle);
          restoreStyle(media, mediaStyle);
          restoreStyle(background, backgroundStyle);
          restoreStyle(element, rootStyle);
        };
      }
    );

    return () => {
      mm.revert();
      restoreStyle(depthFrame, frameStyle);
      restoreStyle(media, mediaStyle);
      restoreStyle(background, backgroundStyle);
      restoreStyle(element, rootStyle);
    };
  }
};
