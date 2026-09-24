import { computeAlignedStart } from "../../core/scroll-alignment/geometry.js";
import { resolveScrollContract } from "../../core/scroll-alignment/contract.js";
import { readBoolean, readNumber, readString } from "../../core/config.js";

const VARIANTS = Object.freeze({
  "1": "image-drift",
  "2": "rounded-dim",
  "3": "center-collapse",
  "4": "corner-collapse",
  "5": "hinge-collapse",
  "6": "perspective-fold",
  "7": "fade-shrink",
  "8": "blur-shrink",
  "9": "media-rise",
  "10": "slide-up",
  "11": "tilt-fade",
  "12": "contrast-drift",
  "13": "side-throw",
  "14": "vertical-squash",
  "15": "media-sweep"
});

const DEFAULTS = Object.freeze({
  variant: "image-drift",
  top: "0px",
  minHeight: "100svh",
  scrub: 1,
  perspective: 1000
});

function normalizeVariant(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return DEFAULTS.variant;
  return VARIANTS[raw] || raw;
}

function restoreStyle(element, value) {
  if (!element) return;
  if (value == null) element.removeAttribute("style");
  else element.setAttribute("style", value);
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function mediaTargets(panel) {
  const explicit = [...panel.querySelectorAll('[data-motion-target="media"]')];
  if (explicit.length) return explicit;
  return [...panel.querySelectorAll("img,video,picture")];
}

function target(panel, role, fallbackSelector = "") {
  return (
    panel.querySelector(`[data-motion-target="${role}"]`) ||
    (fallbackSelector ? panel.querySelector(fallbackSelector) : null)
  );
}

function panelRange(root, panel, variant, isLast, isPreLast, multiplier = 1) {
  let legacyStart = "top top";
  let legacyEnd = `+=${100 * multiplier}%`;

  if (variant === "fade-shrink" || variant === "blur-shrink") {
    legacyStart = "center center";
  }

  if (variant === "media-rise") {
    legacyStart = isLast ? "top top" : isPreLast ? "bottom top" : "bottom+=100% top";
  }

  if (variant === "slide-up") {
    legacyStart = isLast ? "top top" : "bottom top";
  }

  if (variant === "blur-shrink") {
    legacyEnd = "max";
  }

  return resolveScrollContract(
    root,
    {
      trigger: panel,
      start: legacyStart,
      end: legacyEnd,
      scrub: readNumber(root, "motion-sticky-scrub", DEFAULTS.scrub),
      invalidateOnRefresh: true
    },
    () => {
      let start;
      if (variant === "fade-shrink" || variant === "blur-shrink") {
        start = () => computeAlignedStart({ trigger: panel, anchor: "center", viewport: 0.5 });
      } else if (variant === "media-rise") {
        start = isLast
          ? () => computeAlignedStart({ trigger: panel, anchor: "top", viewport: 0 })
          : isPreLast
            ? () => computeAlignedStart({ trigger: panel, anchor: "bottom", viewport: 0 })
            : () => computeAlignedStart({ trigger: panel, anchor: "bottom", viewport: 0 }) + window.innerHeight;
      } else if (variant === "slide-up") {
        start = isLast
          ? () => computeAlignedStart({ trigger: panel, anchor: "top", viewport: 0 })
          : () => computeAlignedStart({ trigger: panel, anchor: "bottom", viewport: 0 });
      } else {
        start = () => computeAlignedStart({ trigger: panel, anchor: "top", viewport: 0 });
      }

      return {
        start,
        end:
          variant === "blur-shrink"
            ? "max"
            : () => `+=${Math.max(1, window.innerHeight * multiplier)}`
      };
    }
  );
}

function contactRange(root, panel, incomingPanel) {
  const scrub = root.hasAttribute("data-motion-sticky-contact-scrub")
    ? readNumber(root, "motion-sticky-contact-scrub", DEFAULTS.scrub)
    : true;

  return resolveScrollContract(
    root,
    {
      trigger: panel,
      endTrigger: incomingPanel,
      start: "top top",
      end: "top top",
      scrub,
      invalidateOnRefresh: true
    },
    () => ({
      start: () =>
        computeAlignedStart({
          trigger: panel,
          anchor: "top",
          viewport: 0
        }),
      end: () =>
        computeAlignedStart({
          trigger: incomingPanel,
          anchor: "top",
          viewport: 0
        })
    })
  );
}

function mediaRange(root, panel, variant) {
  const legacy = {
    trigger: panel,
    start: readString(root, "motion-sticky-media-start", "top bottom"),
    end: readString(root, "motion-sticky-media-end", "max"),
    scrub: readNumber(root, "motion-sticky-media-scrub", DEFAULTS.scrub),
    invalidateOnRefresh: true
  };

  return resolveScrollContract(
    root,
    legacy,
    () => ({
      start: () => computeAlignedStart({ trigger: panel, anchor: "top", viewport: 1 }),
      end: "max"
    })
  );
}

export const stickySectionExit = {
  name: "sticky-section-exit",
  category: "composition",
  selector: '[data-motion~="sticky-section-exit"]',

  mount(root, { gsap, reducedMotion }) {
    const panels = [...root.querySelectorAll("[data-motion-sticky-section]")];
    if (panels.length < 2 || reducedMotion()) return;

    const minWidth = Math.max(0, readNumber(root, "motion-min-width", 0));
    if (window.innerWidth < minWidth) return;

    const variant = normalizeVariant(
      readString(root, "motion-sticky-variant", DEFAULTS.variant)
    );
    const top = readString(root, "motion-sticky-top", DEFAULTS.top);
    const minHeight = readString(
      root,
      "motion-sticky-min-height",
      DEFAULTS.minHeight
    );
    const perspective = readNumber(
      root,
      "motion-sticky-perspective",
      DEFAULTS.perspective
    );
    const contact = readBoolean(root, "motion-sticky-contact", false);
    const contactHeight = readString(
      root,
      "motion-sticky-contact-height",
      "100svh"
    );

    const rootStyle = root.getAttribute("style");
    const tracked = new Map();
    const remember = (node) => {
      if (node && !tracked.has(node)) tracked.set(node, node.getAttribute("style"));
      return node;
    };

    panels.forEach((panel) => {
      remember(panel);
      mediaTargets(panel).forEach(remember);
      remember(target(panel, "inner"));
      remember(target(panel, "title", "h1,h2,h3"));
      remember(target(panel, "text", "p"));
    });

    gsap.set(root, {
      position: getComputedStyle(root).position === "static" ? "relative" : undefined,
      overflow: "visible"
    });

    panels.forEach((panel) => {
      const explicitInner = target(panel, "inner");

      gsap.set(panel, {
        position: "sticky",
        top,
        minHeight: contact ? contactHeight : minHeight,
        height: contact ? contactHeight : undefined,
        boxSizing: contact ? "border-box" : undefined,
        overflow: "hidden"
      });

      if (contact && explicitInner) {
        gsap.set(explicitInner, {
          height: "100%",
          minHeight: 0,
          boxSizing: "border-box"
        });
      }

      if (variant === "perspective-fold") {
        gsap.set(panel, { perspective });
      }
    });

    const tweens = [];
    const timelines = [];

    panels.forEach((panel, position) => {
      const isLast = position === panels.length - 1;
      const isPreLast = position === panels.length - 2;
      const incomingPanel = panels[position + 1] || null;
      const media = mediaTargets(panel);
      const firstMedia = media[0] || null;
      const title = target(panel, "title", "h1,h2,h3");
      const text = target(panel, "text", "p");
      const inner = target(panel, "inner") || panel.firstElementChild || panel;

      const main = (multiplier = 1) =>
        gsap.timeline({ scrollTrigger: panelRange(root, panel, variant, isLast, isPreLast, multiplier) });

      const collapseMain = () =>
        gsap.timeline({
          scrollTrigger:
            contact && incomingPanel
              ? contactRange(root, panel, incomingPanel)
              : panelRange(root, panel, variant, isLast, isPreLast, 1)
        });

      if (variant === "image-drift") {
        const tl = main(1);
        tl.fromTo(
          panel,
          { filter: "brightness(100%) contrast(100%)" },
          {
            filter: isLast ? "none" : `brightness(${readNumber(root, "motion-sticky-brightness", 60)}%) contrast(${readNumber(root, "motion-sticky-contrast", 135)}%)`,
            yPercent: isLast ? 0 : readNumber(root, "motion-sticky-y", -15),
            ease: "none"
          },
          0
        );
        if (firstMedia) {
          tl.to(
            firstMedia,
            {
              yPercent: readNumber(root, "motion-sticky-media-y", -40),
              rotation: readNumber(root, "motion-sticky-media-rotation", -20),
              ease: "power1.in"
            },
            0
          );
        }
        timelines.push(tl);
        return;
      }

      if (variant === "rounded-dim") {
        const tl = main(1);
        tl.fromTo(
          panel,
          { filter: "brightness(100%)" },
          {
            filter: isLast ? "none" : `brightness(${readNumber(root, "motion-sticky-brightness", 50)}%)`,
            scale: readNumber(root, "motion-sticky-scale", 0.95),
            borderRadius: readNumber(root, "motion-sticky-radius", 40),
            ease: "none"
          },
          0
        );
        timelines.push(tl);
        return;
      }

      if (variant === "center-collapse") {
        gsap.set(panel, { transformOrigin: `50% ${isLast ? 100 : 0}%` });
        const tl = collapseMain().to(panel, {
          scale: readNumber(root, "motion-sticky-scale", 0),
          ease: "none"
        });
        timelines.push(tl);
        return;
      }

      if (variant === "corner-collapse") {
        gsap.set(panel, {
          transformOrigin: `${position % 2 === 0 ? 0 : 100}% ${isLast ? 100 : 0}%`
        });
        const tl = collapseMain().to(panel, {
          scale: readNumber(root, "motion-sticky-scale", 0),
          borderRadius: readNumber(root, "motion-sticky-radius", 200),
          ease: "none"
        });
        timelines.push(tl);
        return;
      }

      if (variant === "hinge-collapse") {
        gsap.set(panel, {
          transformOrigin: `${position % 2 === 0 ? 2 : 98}% ${isLast ? 0 : 2}%`
        });
        const tl = collapseMain().to(panel, {
          scale: readNumber(root, "motion-sticky-scale", 0),
          yPercent: isLast ? 100 : 0,
          rotation:
            (position % 2 === 0 ? 1 : -1) *
            Math.abs(readNumber(root, "motion-sticky-rotation", 10)),
          ease: "none"
        });
        timelines.push(tl);
        return;
      }

      if (variant === "perspective-fold") {
        remember(inner);
        gsap.set(inner, {
          transformOrigin: "50% 0%",
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden"
        });
        const tl = main(2);
        tl.fromTo(
          inner,
          { filter: "brightness(100%)" },
          {
            filter: `brightness(${readNumber(root, "motion-sticky-brightness", 60)}%)`,
            scale: readNumber(root, "motion-sticky-scale", 0.9),
            rotationX: readNumber(root, "motion-sticky-rotation-x", -90),
            yPercent: isLast ? 100 : 0,
            ease: "power1"
          },
          0
        );
        timelines.push(tl);
        return;
      }

      if (variant === "fade-shrink") {
        const tl = main(1).to(panel, {
          scale: readNumber(root, "motion-sticky-scale", 0.6),
          opacity: readNumber(root, "motion-sticky-opacity", 0),
          yPercent: isLast ? 125 : 0,
          ease: "none"
        });
        timelines.push(tl);
        return;
      }

      if (variant === "blur-shrink") {
        const tl = main(1).to(panel, {
          scale: readNumber(root, "motion-sticky-scale", 0.4),
          yPercent: readNumber(root, "motion-sticky-y", -50),
          ease: "none"
        });
        timelines.push(tl);
        const blurTween = gsap.fromTo(
          panel,
          { filter: "blur(0px)" },
          {
            filter: `blur(${readNumber(root, "motion-sticky-blur", 3)}px)`,
            ease: "none",
            scrollTrigger: {
              trigger: panel,
              start: "center center",
              end: "+=100%",
              scrub: readNumber(root, "motion-sticky-scrub", DEFAULTS.scrub)
            }
          }
        );
        tweens.push(blurTween);
        return;
      }

      if (variant === "media-rise") {
        const tl = main(1).to(panel, { yPercent: -100, ease: "none" });
        timelines.push(tl);
        if (firstMedia) {
          const mediaTween = gsap.fromTo(
            firstMedia,
            {
              yPercent: 20,
              rotation: 40,
              scale: 0.8,
              filter: "contrast(400%)"
            },
            {
              yPercent: -100,
              rotation: 0,
              scale: 1,
              filter: "contrast(100%)",
              ease: "none",
              scrollTrigger: mediaRange(root, panel, variant)
            }
          );
          tweens.push(mediaTween);
        }
        return;
      }

      if (variant === "slide-up") {
        const tl = main(1).to(panel, { yPercent: -100, ease: "none" });
        timelines.push(tl);
        return;
      }

      if (variant === "tilt-fade") {
        gsap.set(panel, { transformOrigin: "100% 0%" });
        const tl = main(1).to(panel, {
          opacity: readNumber(root, "motion-sticky-opacity", 0),
          borderRadius: readNumber(root, "motion-sticky-radius", 20),
          yPercent: isLast ? 105 : 5,
          scale: readNumber(root, "motion-sticky-scale", 0.75),
          rotation: readNumber(root, "motion-sticky-rotation", -20),
          ease: "none"
        });
        timelines.push(tl);
        return;
      }

      if (variant === "contrast-drift") {
        gsap.set(panel, {
          transformOrigin: `${position % 2 === 0 ? 100 : 0}% 0%`
        });
        const tl = main(2);
        tl.fromTo(
          panel,
          { filter: "brightness(100%) contrast(100%)" },
          {
            yPercent: -100,
            scale: readNumber(root, "motion-sticky-scale", 0.9),
            rotation:
              (position % 2 === 0 ? -1 : 1) *
              Math.abs(readNumber(root, "motion-sticky-rotation", 2)),
            filter: `brightness(${readNumber(root, "motion-sticky-brightness", 50)}%) contrast(${readNumber(root, "motion-sticky-contrast", 300)}%)`,
            ease: "none"
          },
          0
        );
        if (media.length) {
          tl.to(
            media,
            {
              xPercent: readNumber(root, "motion-sticky-media-x", -40),
              rotation:
                (position % 2 === 0 ? -1 : 1) *
                Math.abs(readNumber(root, "motion-sticky-media-rotation", 20)),
              ease: "power1.in"
            },
            0
          );
        }
        timelines.push(tl);
        return;
      }

      if (variant === "side-throw") {
        gsap.set(panel, {
          transformOrigin: `${position % 2 === 0 ? 100 : 0}% ${isLast ? 0 : 100}%`
        });
        const direction = position % 2 === 0 ? -1 : 1;
        const tl = main(isLast ? 1 : 2);
        tl.fromTo(
          panel,
          { filter: "brightness(100%)", opacity: 1 },
          {
            xPercent: direction * Math.abs(readNumber(root, "motion-sticky-x", 150)),
            yPercent: isLast ? 100 : 0,
            rotation: direction * Math.abs(readNumber(root, "motion-sticky-rotation", 20)),
            scale: readNumber(root, "motion-sticky-scale", 0.8),
            filter: `brightness(${readNumber(root, "motion-sticky-brightness", 0)}%)`,
            duration: 0.82,
            ease: "none"
          },
          0
        );
        if (title) {
          tl.to(
            title,
            {
              scale: readNumber(root, "motion-sticky-title-scale", 0.5),
              yPercent: readNumber(root, "motion-sticky-title-y", -400),
              ease: "none"
            },
            0
          );
        }
        if (text) {
          tl.to(
            text,
            {
              yPercent: readNumber(root, "motion-sticky-text-y", 100),
              ease: "none"
            },
            0
          );
        }
        if (firstMedia) {
          tl.to(
            firstMedia,
            {
              scale: readNumber(root, "motion-sticky-media-scale", 0.2),
              duration: 0.82,
              ease: "none"
            },
            0
          );
        }
        tl.to(
          panel,
          {
            opacity: readNumber(root, "motion-sticky-exit-opacity", 0),
            duration: 0.18,
            ease: "none"
          },
          0.82
        );
        timelines.push(tl);
        return;
      }

      if (variant === "vertical-squash") {
        gsap.set(panel, { transformOrigin: `50% ${isLast ? 100 : 0}%` });
        const tl = collapseMain().to(
          panel,
          {
            scaleY: readNumber(root, "motion-sticky-scale-y", 0),
            ease: "none"
          },
          0
        );
        const innerTargets = unique([title, text, ...media]);
        if (innerTargets.length) {
          tl.to(
            innerTargets,
            {
              scale: readNumber(root, "motion-sticky-inner-scale", 1.7),
              opacity: readNumber(root, "motion-sticky-opacity", 0),
              ease: "back.in(0.1)"
            },
            0
          );
        }
        timelines.push(tl);
        return;
      }

      if (variant === "media-sweep") {
        if (!firstMedia) return;
        const tween = gsap.fromTo(
          firstMedia,
          {
            yPercent: readNumber(root, "motion-sticky-media-y-from", 10),
            rotation: readNumber(root, "motion-sticky-media-rotation-from", 20)
          },
          {
            yPercent: readNumber(root, "motion-sticky-media-y", -60),
            rotation: readNumber(root, "motion-sticky-media-rotation", -20),
            ease: "power1",
            scrollTrigger: mediaRange(root, panel, variant)
          }
        );
        tweens.push(tween);
        return;
      }

      console.warn("[motion-kit] Unknown sticky-section-exit variant:", variant);
    });

    return () => {
      timelines.forEach((timeline) => {
        timeline.scrollTrigger?.kill(true);
        timeline.kill();
      });
      tweens.forEach((tween) => {
        tween.scrollTrigger?.kill(true);
        tween.kill();
      });
      tracked.forEach((style, node) => restoreStyle(node, style));
      restoreStyle(root, rootStyle);
    };
  }
};
