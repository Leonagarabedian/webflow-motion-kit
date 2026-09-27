import {
  readBoolean,
  readNumber,
  readString,
  selectTarget
} from "../../core/config.js";

const DEFAULTS = Object.freeze({
  minWidth: 992,
  scrub: true,
  start: "top top",
  end: "bottom bottom",
  backgroundScaleTo: 6.5,
  backgroundXPercentTo: -2,
  apertureScaleTo: 8,
  panelDistanceVw: 50,
  parallaxYTo: "100vh",
  logoYFrom: "44vh",
  logoScaleFrom: 1.25
});

function configuredScrub(element) {
  const raw = element.getAttribute("data-motion-scrub");
  if (raw == null || raw === "" || raw === "true") return DEFAULTS.scrub;
  if (raw === "false" || raw === "0") return false;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : DEFAULTS.scrub;
}

function optionalTarget(root, role) {
  const target = selectTarget(root, role, null);
  return target === root ? null : target;
}

function collectTargets(root) {
  return {
    logo: optionalTarget(root, "logo"),
    background: optionalTarget(root, "background"),
    aperture: optionalTarget(root, "aperture"),
    leftPanel: optionalTarget(root, "left-panel"),
    rightPanel: optionalTarget(root, "right-panel"),
    parallaxLayer: optionalTarget(root, "parallax-layer")
  };
}

function addTween(tweens, tween) {
  if (tween) tweens.push(tween);
}

function cleanupTween(gsap, tween) {
  const targets = tween.targets?.() ?? [];
  tween.scrollTrigger?.kill();
  tween.kill();
  if (targets.length) {
    gsap.set(targets, { clearProps: "transform,opacity,willChange" });
  }
}

export const scrollApertureWindow = {
  name: "scroll-aperture-window",
  category: "composition",
  selector: '[data-motion~="scroll-aperture-window"]',

  mount(root, { gsap, ScrollTrigger, reducedMotion }) {
    if (reducedMotion()) return;

    const minWidth = readNumber(root, "motion-min-width", DEFAULTS.minWidth);
    const mm = gsap.matchMedia();

    mm.add(
      {
        desktop: `(min-width: ${minWidth}px)`,
        mobile: `(max-width: ${minWidth - 1}px)`,
        reduceMotion: "(prefers-reduced-motion: reduce)"
      },
      ({ conditions }) => {
        if (conditions.reduceMotion || reducedMotion()) return;

        const targets = collectTargets(root);
        const tweens = [];
        const start = readString(root, "motion-start", DEFAULTS.start);
        const end = readString(root, "motion-end", DEFAULTS.end);
        const scrub = configuredScrub(root);
        const mobilePanels = readBoolean(root, "motion-mobile-panels", false);
        const desktop = Boolean(conditions.desktop);
        const includePanels = desktop || mobilePanels;

        const trigger = {
          trigger: root,
          start,
          end,
          scrub,
          invalidateOnRefresh: true,
          markers: readBoolean(root, "motion-markers", false)
        };

        if (targets.logo) {
          gsap.set(targets.logo, {
            y: readString(root, "motion-logo-y-from", DEFAULTS.logoYFrom),
            scale: readNumber(root, "motion-logo-scale-from", DEFAULTS.logoScaleFrom),
            translateZ: 10
          });
          addTween(
            tweens,
            gsap.to(targets.logo, {
              y: readString(root, "motion-logo-y-to", "0vh"),
              scale: readNumber(root, "motion-logo-scale-to", 1),
              translateZ: 10,
              ease: readString(root, "motion-logo-ease", "power1.inOut"),
              scrollTrigger: trigger
            })
          );
        }

        if (targets.background || targets.aperture || (includePanels && (targets.leftPanel || targets.rightPanel))) {
          const timeline = gsap.timeline({ scrollTrigger: trigger });

          if (targets.background) {
            timeline.fromTo(
              targets.background,
              {
                scale: readNumber(root, "motion-bg-scale-from", 1),
                xPercent: readNumber(root, "motion-bg-x-from", 0),
                translateZ: 100
              },
              {
                scale: readNumber(root, "motion-bg-scale-to", DEFAULTS.backgroundScaleTo),
                xPercent: readNumber(root, "motion-bg-x-to", DEFAULTS.backgroundXPercentTo),
                translateZ: 100,
                ease: "none",
                duration: 1
              },
              0
            );
          }

          if (targets.aperture) {
            timeline.fromTo(
              targets.aperture,
              { scale: readNumber(root, "motion-aperture-scale-from", 1) },
              {
                scale: readNumber(root, "motion-aperture-scale-to", DEFAULTS.apertureScaleTo),
                ease: "none",
                duration: 1
              },
              0
            );
          }

          if (includePanels && targets.leftPanel) {
            timeline.fromTo(
              targets.leftPanel,
              { x: "0vw" },
              {
                x: `${-Math.abs(readNumber(root, "motion-panel-distance-vw", DEFAULTS.panelDistanceVw))}vw`,
                ease: "none",
                duration: 1
              },
              0
            );
          }

          if (includePanels && targets.rightPanel) {
            timeline.fromTo(
              targets.rightPanel,
              { x: "0vw" },
              {
                x: `${Math.abs(readNumber(root, "motion-panel-distance-vw", DEFAULTS.panelDistanceVw))}vw`,
                ease: "none",
                duration: 1
              },
              0
            );
          }

          addTween(tweens, timeline);
        }

        if (desktop && targets.parallaxLayer) {
          addTween(
            tweens,
            gsap.fromTo(
              targets.parallaxLayer,
              { y: readString(root, "motion-parallax-y-from", "0vh"), translateZ: 10 },
              {
                y: readString(root, "motion-parallax-y-to", DEFAULTS.parallaxYTo),
                translateZ: 10,
                ease: "none",
                scrollTrigger: trigger
              }
            )
          );
        }

        ScrollTrigger.refresh();

        return () => {
          tweens.forEach((tween) => cleanupTween(gsap, tween));
        };
      }
    );

    return () => mm.revert();
  }
};
