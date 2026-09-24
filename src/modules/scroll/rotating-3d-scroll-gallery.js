// Adapted from Codrops "Rotating On-Scroll Animations" — Variations 1–5.
// Original source: https://github.com/codrops/RotatingOnScrollAnimations
// MIT License.

import { readNumber, readString } from "../../core/config.js";
import { scrollMode } from "../../core/scroll-alignment/contract.js";
import { computeAlignedStart } from "../../core/scroll-alignment/geometry.js";

const BASE = Object.freeze({
  perspective: 900,
  itemStart: "top bottom+=20%",
  itemEnd: "bottom top-=20%",
  marqueeStart: "top bottom",
  marqueeEnd: "bottom top"
});

const VARIANTS = Object.freeze({
  "1": Object.freeze({
    amplitude: 0.2,
    angleStep: 0.45,
    rotationXMin: 70,
    rotationXMax: 120,
    rotationYMin: -20,
    rotationYMax: 20,
    rotationZMin: -20,
    rotationZMax: 20,
    depth: -50,
    depthPower: 1
  }),
  "2": Object.freeze({
    amplitude: 0.2,
    angleStep: 0.45,
    rotationXMin: 240,
    rotationXMax: 290,
    rotationYMin: -20,
    rotationYMax: 20,
    rotationZMin: -50,
    rotationZMax: 50,
    depth: -300,
    depthPower: 4
  }),
  "3": Object.freeze({
    amplitude: 0,
    angleStep: 0,
    depth: -800,
    depthPower: 8
  }),
  "4": Object.freeze({
    amplitude: 0.2,
    angleStep: 1,
    rotationXMin: -10,
    rotationXMax: 10,
    rotationYMin: 200,
    rotationYMax: 290,
    rotationZMin: -10,
    rotationZMax: 10,
    depth: -150,
    velocityScale: 2400,
    velocityBlur: 15,
    velocityEase: 0.45
  }),
  "5": Object.freeze({
    amplitude: 0.05,
    angleStep: 0.9,
    rotationXMin: 130,
    rotationXMax: 220,
    rotationZ: -50,
    depth: -750,
    hold: 0.25,
    blur: 12
  })
});

function restoreStyle(element, value) {
  if (!element) return;
  if (value == null) element.removeAttribute("style");
  else element.setAttribute("style", value);
}

function normalizeVariant(value) {
  const raw = String(value || "").trim().toLowerCase();
  const number = raw.replace(/^variation[-_ ]?/, "").replace(/^v/, "");
  return VARIANTS[number] ? number : "2";
}

function autoItemRange(item) {
  return {
    start: () =>
      computeAlignedStart({
        trigger: item,
        anchor: "top",
        viewport: 120
      }),
    end: () =>
      computeAlignedStart({
        trigger: item,
        anchor: "bottom",
        viewport: -0.2
      }),
    invalidateOnRefresh: true
  };
}

function autoGalleryRange(gallery) {
  return {
    start: () =>
      computeAlignedStart({
        trigger: root,
        anchor: "top",
        viewport: 1
      }),
    end: () =>
      computeAlignedStart({
        trigger: root,
        anchor: "bottom",
        viewport: 0
      }),
    invalidateOnRefresh: true
  };
}

function holdAtMiddle(progress, hold) {
  const half = hold * 0.5;

  if (progress < 0.5 - half) {
    const span = Math.max(0.0001, 0.5 - half);
    return (progress / span) * 0.5;
  }

  if (progress > 0.5 + half) {
    const start = 0.5 + half;
    const span = Math.max(0.0001, 1 - start);
    return 0.5 + ((progress - start) / span) * 0.5;
  }

  return 0.5;
}

function randomBetween(gsap, min, max) {
  return gsap.utils.random(Math.min(min, max), Math.max(min, max));
}

export const rotating3dScrollGallery = {
  name: "rotating-3d-scroll-gallery",
  category: "composition",
  selector: '[data-motion~="rotating-3d-scroll-gallery"]',

  mount(root, { gsap, ScrollTrigger, reducedMotion, logger }) {
    if (!ScrollTrigger) {
      logger?.warn?.(
        "[MotionKit] rotating-3d-scroll-gallery requires ScrollTrigger."
      );
      return;
    }

    const wraps = [...root.querySelectorAll('[data-motion-target="rotate-wrap"]')];
    const pairs = wraps
      .map((wrap) => ({
        wrap,
        item: wrap.querySelector('[data-motion-target="rotate-item"]')
      }))
      .filter(({ item }) => item);

    if (!pairs.length) {
      logger?.warn?.(
        "[MotionKit] rotating-3d-scroll-gallery requires rotate-wrap targets containing rotate-item targets."
      );
      return;
    }

    const gallery =
      root.querySelector('[data-motion-target="rotate-gallery"]') || root;
    const marquee = root.querySelector('[data-motion-target="gallery-marquee"]');
    const marqueeTrack =
      marquee?.querySelector('[data-motion-target="gallery-marquee-track"]') || null;

    const variant = normalizeVariant(readString(root, "motion-variant", "2"));
    const source = VARIANTS[variant];
    const minWidth = Math.max(0, readNumber(root, "motion-min-width", 0));
    const perspective = Math.max(
      1,
      readNumber(root, "motion-perspective", BASE.perspective)
    );
    const amplitude = Math.max(
      0,
      readNumber(root, "motion-amplitude", source.amplitude)
    );
    const angleStep = readNumber(
      root,
      "motion-angle-step",
      source.angleStep
    );

    const tracked = new Map();
    const remember = (element) => {
      if (element && !tracked.has(element)) {
        tracked.set(element, element.getAttribute("style"));
      }
      return element;
    };

    pairs.forEach(({ wrap, item }) => {
      remember(wrap);
      remember(item);
    });
    remember(marquee);
    remember(marqueeTrack);

    const mm = gsap.matchMedia();

    mm.add(
      {
        width: `(min-width: ${minWidth}px)`,
        reduceMotion: "(prefers-reduced-motion: reduce)"
      },
      ({ conditions }) => {
        if (!conditions.width) return;

        const reduce = conditions.reduceMotion || reducedMotion();
        const triggers = [];
        const setters = [];
        let marqueeTween = null;
        let marqueeVisibilityTrigger = null;
        let resizeRaf = null;
        let velocityTrigger = null;
        let velocityTicker = null;

        const positionWraps = () => {
          const amount = window.innerWidth * amplitude;
          pairs.forEach(({ wrap }, index) => {
            gsap.set(wrap, {
              x: amplitude ? Math.sin(index * angleStep) * amount : 0,
              perspective
            });
          });
        };

        positionWraps();

        pairs.forEach(({ item }) => {
          gsap.set(item, {
            transformStyle: "preserve-3d"
          });
        });

        if (reduce) {
          pairs.forEach(({ item }) => {
            gsap.set(item, {
              clearProps: "transform,filter"
            });
          });
          return () => {
            tracked.forEach((style, element) => restoreStyle(element, style));
          };
        }

        const mode = scrollMode(root);
        const itemTrigger = (item, onUpdate) => {
          const range =
            mode === "auto"
              ? autoItemRange(item)
              : {
                  start: readString(root, "motion-start", BASE.itemStart),
                  end: readString(root, "motion-end", BASE.itemEnd),
                  invalidateOnRefresh: true
                };

          const trigger = ScrollTrigger.create({
            trigger: item,
            ...range,
            scrub: true,
            onUpdate
          });
          triggers.push(trigger);
          return trigger;
        };

        if (variant === "1" || variant === "2") {
          const rotationXMin = readNumber(
            root,
            "motion-rotation-x-min",
            source.rotationXMin
          );
          const rotationXMax = readNumber(
            root,
            "motion-rotation-x-max",
            source.rotationXMax
          );
          const rotationYMin = readNumber(
            root,
            "motion-rotation-y-min",
            source.rotationYMin
          );
          const rotationYMax = readNumber(
            root,
            "motion-rotation-y-max",
            source.rotationYMax
          );
          const rotationZMin = readNumber(
            root,
            "motion-rotation-z-min",
            source.rotationZMin
          );
          const rotationZMax = readNumber(
            root,
            "motion-rotation-z-max",
            source.rotationZMax
          );
          const depth = readNumber(root, "motion-depth", source.depth);
          const depthPower = Math.max(
            0.1,
            readNumber(root, "motion-depth-power", source.depthPower)
          );

          pairs.forEach(({ item }) => {
            const rotationX = randomBetween(gsap, rotationXMin, rotationXMax);
            const rotationY = randomBetween(gsap, rotationYMin, rotationYMax);
            const rotationZ = randomBetween(gsap, rotationZMin, rotationZMax);
            const setTransform = gsap.quickSetter(item, "css");
            setters.push(setTransform);

            itemTrigger(item, (self) => {
              const p = self.progress;
              const arc = Math.max(0, Math.sin(p * Math.PI));
              setTransform({
                rotationX: gsap.utils.interpolate(rotationX, -rotationX, p),
                rotationY: gsap.utils.interpolate(rotationY, -rotationY, p),
                rotationZ: gsap.utils.interpolate(rotationZ, -rotationZ, p),
                z: Math.pow(arc, depthPower) * depth
              });
            });
          });
        }

        if (variant === "3") {
          const depth = readNumber(root, "motion-depth", source.depth);
          const depthPower = Math.max(
            0.1,
            readNumber(root, "motion-depth-power", source.depthPower)
          );

          pairs.forEach(({ item }) => {
            const setTransform = gsap.quickSetter(item, "css");
            const setFilter = gsap.quickSetter(item, "filter");
            setters.push(setTransform, setFilter);

            itemTrigger(item, (self) => {
              const p = self.progress;
              const cos = Math.cos(p * Math.PI);
              const sin = Math.max(0, Math.sin(p * Math.PI));
              const rotationX =
                Math.sign(cos) *
                Math.pow(Math.abs(cos), 0.6) *
                90;
              const z = Math.pow(sin, depthPower) * depth;
              const yPercent = 1 + Math.pow(cos, 2) * -40;
              const saturate = Math.pow(sin, 3);
              const brightness = Math.pow(sin, 3);

              setTransform({
                rotationX,
                z,
                yPercent
              });
              setFilter(
                `saturate(${saturate}) brightness(${brightness})`
              );
            });
          });
        }

        if (variant === "4") {
          const rotationXMin = readNumber(
            root,
            "motion-rotation-x-min",
            source.rotationXMin
          );
          const rotationXMax = readNumber(
            root,
            "motion-rotation-x-max",
            source.rotationXMax
          );
          const rotationYMin = readNumber(
            root,
            "motion-rotation-y-min",
            source.rotationYMin
          );
          const rotationYMax = readNumber(
            root,
            "motion-rotation-y-max",
            source.rotationYMax
          );
          const rotationZMin = readNumber(
            root,
            "motion-rotation-z-min",
            source.rotationZMin
          );
          const rotationZMax = readNumber(
            root,
            "motion-rotation-z-max",
            source.rotationZMax
          );
          const depth = readNumber(root, "motion-depth", source.depth);
          const velocityScale = Math.max(
            1,
            readNumber(root, "motion-velocity-scale", source.velocityScale)
          );
          const maxBlur = Math.max(
            0,
            readNumber(root, "motion-velocity-blur", source.velocityBlur)
          );
          const velocityEase = Math.min(
            1,
            Math.max(
              0,
              readNumber(root, "motion-velocity-ease", source.velocityEase)
            )
          );

          const filterSetters = pairs.map(({ item }) => {
            const setter = gsap.quickSetter(item, "filter");
            setters.push(setter);
            return setter;
          });

          pairs.forEach(({ item }) => {
            const rotationX = randomBetween(gsap, rotationXMin, rotationXMax);
            const rotationY = randomBetween(gsap, rotationYMin, rotationYMax);
            const rotationZ = randomBetween(gsap, rotationZMin, rotationZMax);
            const setTransform = gsap.quickSetter(item, "css");
            setters.push(setTransform);

            itemTrigger(item, (self) => {
              const p = self.progress;
              setTransform({
                rotationX: gsap.utils.interpolate(rotationX, -rotationX, p),
                rotationY: gsap.utils.interpolate(rotationY, -rotationY, p),
                rotationZ: gsap.utils.interpolate(rotationZ, -rotationZ, p),
                z: Math.sin(p * Math.PI) * depth
              });
            });
          });

          const velocityRange =
            mode === "auto"
              ? autoGalleryRange(gallery)
              : {
                  start: readString(root, "motion-marquee-start", BASE.marqueeStart),
                  end: readString(root, "motion-marquee-end", BASE.marqueeEnd)
                };

          let latestVelocity = 0;
          let latestVelocityAt = 0;
          let blurAmount = 0;

          velocityTrigger = ScrollTrigger.create({
            trigger: gallery,
            ...velocityRange,
            onUpdate(self) {
              latestVelocity = Math.abs(self.getVelocity?.() || 0);
              latestVelocityAt = performance.now();
            }
          });

          velocityTicker = () => {
            const age = performance.now() - latestVelocityAt;
            const activeVelocity = age > 120 ? 0 : latestVelocity;
            const velocityNorm = Math.min(activeVelocity / velocityScale, 1);
            const targetBlur = velocityNorm * maxBlur;
            blurAmount = gsap.utils.interpolate(
              blurAmount,
              targetBlur,
              velocityEase
            );
            const saturation = 1 - velocityNorm;
            const filter = `blur(${blurAmount}px) saturate(${saturation})`;
            filterSetters.forEach((setFilter) => setFilter(filter));
          };

          gsap.ticker.add(velocityTicker);
        }

        if (variant === "5") {
          const rotationXMin = readNumber(
            root,
            "motion-rotation-x-min",
            source.rotationXMin
          );
          const rotationXMax = readNumber(
            root,
            "motion-rotation-x-max",
            source.rotationXMax
          );
          const rotationZ = readNumber(
            root,
            "motion-rotation-z",
            source.rotationZ
          );
          const depth = readNumber(root, "motion-depth", source.depth);
          const hold = Math.min(
            0.98,
            Math.max(0, readNumber(root, "motion-hold", source.hold))
          );
          const blurMax = Math.max(
            0,
            readNumber(root, "motion-blur", source.blur)
          );

          pairs.forEach(({ item }) => {
            const rotationX = randomBetween(gsap, rotationXMin, rotationXMax);
            const setTransform = gsap.quickSetter(item, "css");
            const setFilter = gsap.quickSetter(item, "filter");
            setters.push(setTransform, setFilter);

            itemTrigger(item, (self) => {
              const t = holdAtMiddle(self.progress, hold);
              const cos = Math.cos(t * Math.PI);
              const sin = Math.max(0, Math.sin(t * Math.PI));

              setTransform({
                scaleX: 1 + Math.pow(cos, 2) * 0.6,
                scaleY: 0.5 + Math.pow(sin, 2) * 0.5,
                rotationX: gsap.utils.interpolate(-rotationX, rotationX, t),
                rotationZ: gsap.utils.interpolate(-rotationZ, rotationZ, t),
                z: sin * depth
              });
              setFilter(
                `blur(${Math.pow(cos, 2) * blurMax}px) brightness(${Math.pow(
                  sin,
                  6
                )})`
              );
            });
          });
        }

        if (marqueeTrack) {
          const range =
            mode === "auto"
              ? autoGalleryRange(gallery)
              : {
                  start: readString(
                    root,
                    "motion-marquee-start",
                    BASE.marqueeStart
                  ),
                  end: readString(
                    root,
                    "motion-marquee-end",
                    BASE.marqueeEnd
                  ),
                  invalidateOnRefresh: true
                };

          gsap.set(marquee, { autoAlpha: 0 });

          marqueeVisibilityTrigger = ScrollTrigger.create({
            trigger: gallery,
            ...range,
            onEnter: () => gsap.set(marquee, { autoAlpha: 1 }),
            onEnterBack: () => gsap.set(marquee, { autoAlpha: 1 }),
            onLeave: () => gsap.set(marquee, { autoAlpha: 0 }),
            onLeaveBack: () => gsap.set(marquee, { autoAlpha: 0 })
          });

          marqueeTween = gsap.fromTo(
            marqueeTrack,
            {
              x: () => window.innerWidth
            },
            {
              x: () => -marqueeTrack.offsetWidth,
              ease: "none",
              scrollTrigger: {
                trigger: gallery,
                ...range,
                scrub: true
              }
            }
          );
        }

        const onResize = () => {
          if (resizeRaf != null) cancelAnimationFrame(resizeRaf);
          resizeRaf = requestAnimationFrame(() => {
            resizeRaf = null;
            positionWraps();
            ScrollTrigger.refresh();
          });
        };

        window.addEventListener("resize", onResize);

        return () => {
          window.removeEventListener("resize", onResize);
          if (resizeRaf != null) cancelAnimationFrame(resizeRaf);
          if (velocityTicker) gsap.ticker.remove(velocityTicker);
          velocityTrigger?.kill?.();
          marqueeVisibilityTrigger?.kill?.();
          marqueeTween?.scrollTrigger?.kill?.();
          marqueeTween?.kill?.();
          triggers.forEach((trigger) => trigger.kill?.());
          tracked.forEach((style, element) => restoreStyle(element, style));
        };
      }
    );

    return () => {
      mm.revert();
      tracked.forEach((style, element) => restoreStyle(element, style));
    };
  }
};
