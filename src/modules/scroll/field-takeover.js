import {
  layoutSize,
  relativeSpan,
  resolveScrollContract
} from "../../core/scroll-alignment/contract.js";
import {
  readBoolean,
  readNumber,
  readString,
  selectTarget
} from "../../core/config.js";

const DEFAULTS = Object.freeze({
  contentEnd: 0.85,
  contentOpacityTo: 0,
  contentStart: 0.35,
  contentY: 0,
  contentLock: false,
  minWidth: 992,
  pin: true,
  preserveSpace: true,
  reparent: false,
  scale: false,
  scrub: 1,
  scrollVh: 100,
  start: "top top",
  stateClass: "is-field-takeover"
});

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function phaseProgress(progress, start, end) {
  const span = Math.max(end - start, 0.0001);
  return clamp((progress - start) / span);
}

function restoreInlineStyle(target, style) {
  if (style == null) target.removeAttribute("style");
  else target.setAttribute("style", style);
}

function autoDistance(element, field) {
  const rootSize = layoutSize(element);
  const fieldSize = layoutSize(field);
  const viewportWidth = Math.max(1, window.innerWidth);
  const viewportHeight = Math.max(1, window.innerHeight);

  const widthTravel = Math.max(
    Math.abs(viewportWidth - fieldSize.width),
    Math.abs(rootSize.width - fieldSize.width)
  );
  const heightTravel = Math.max(
    Math.abs(viewportHeight - fieldSize.height),
    Math.abs(rootSize.height - fieldSize.height)
  );

  return Math.max(viewportHeight, widthTravel, heightTravel);
}

export const fieldTakeover = {
  name: "field-takeover",
  category: "composition",
  selector: '[data-motion~="field-takeover"]',

  mount(element, { Flip, gsap }) {
    const field = selectTarget(element, "takeover-field", null);
    const content = selectTarget(element, "takeover-content", null);

    if (!field || !Flip) return;

    const stateClass = readString(
      element,
      "motion-state-class",
      DEFAULTS.stateClass
    );
    const minWidth = readNumber(
      element,
      "motion-min-width",
      DEFAULTS.minWidth
    );
    const scrollVh = Math.max(
      1,
      readNumber(element, "motion-scroll-vh", DEFAULTS.scrollVh)
    );
    const scrub = readNumber(element, "motion-scrub", DEFAULTS.scrub);
    const start = readString(element, "motion-start", DEFAULTS.start);
    const pin = readBoolean(element, "motion-pin", DEFAULTS.pin);
    const preserveSpace = readBoolean(
      element,
      "motion-preserve-space",
      DEFAULTS.preserveSpace
    );
    const reparent = readBoolean(
      element,
      "motion-reparent",
      DEFAULTS.reparent
    );
    const scale = readBoolean(element, "motion-scale", DEFAULTS.scale);
    const contentLock = readBoolean(
      element,
      "motion-content-lock",
      DEFAULTS.contentLock
    );

    const contentStart = clamp(
      readNumber(element, "motion-content-start", DEFAULTS.contentStart)
    );
    const contentEnd = clamp(
      readNumber(element, "motion-content-end", DEFAULTS.contentEnd),
      contentStart + 0.0001,
      1
    );
    const contentOpacityTo = clamp(
      readNumber(
        element,
        "motion-content-opacity-to",
        DEFAULTS.contentOpacityTo
      )
    );
    const contentY = readNumber(
      element,
      "motion-content-y",
      DEFAULTS.contentY
    );

    const originalRootStyle = element.getAttribute("style");
    const originalFieldStyle = field.getAttribute("style");
    const originalContentStyle = content?.getAttribute("style") ?? null;
    const fieldHadStateClass = field.classList.contains(stateClass);
    const originalParent = field.parentNode;
    const originalNextSibling = field.nextSibling;
    let placeholder = null;

    const restoreAuthoredState = () => {
      field.classList.toggle(stateClass, fieldHadStateClass);

      if (reparent && field.parentNode !== originalParent) {
        if (originalNextSibling?.parentNode === originalParent) {
          originalParent.insertBefore(field, originalNextSibling);
        } else {
          originalParent.appendChild(field);
        }
      }

      placeholder?.remove();
      placeholder = null;

      restoreInlineStyle(element, originalRootStyle);
      restoreInlineStyle(field, originalFieldStyle);
      if (content) restoreInlineStyle(content, originalContentStyle);
    };

    const mm = gsap.matchMedia();

    mm.add(
      {
        desktop: `(min-width: ${minWidth}px)`,
        reduceMotion: "(prefers-reduced-motion: reduce)"
      },
      ({ conditions }) => {
        restoreAuthoredState();

        if (!conditions.desktop || conditions.reduceMotion) return;

        if (window.getComputedStyle(element).position === "static") {
          gsap.set(element, { position: "relative" });
        }

        // State A is the authored field before takeover.
        field.classList.remove(stateClass);

        const startState = Flip.getState(field, {
          props: "borderRadius"
        });
        const contentRect = content?.getBoundingClientRect() ?? null;

        const contentOpacityFrom = content
          ? Number(gsap.getProperty(content, "opacity")) || 0
          : 1;
        const contentYFrom = content
          ? Number(gsap.getProperty(content, "yPercent")) || 0
          : 0;

        if (preserveSpace) {
          placeholder = field.cloneNode(false);
          placeholder.removeAttribute("id");
          placeholder.removeAttribute("data-motion");
          placeholder.removeAttribute("data-motion-target");
          placeholder.setAttribute("aria-hidden", "true");
          placeholder.style.visibility = "hidden";
          placeholder.style.pointerEvents = "none";
          originalParent.insertBefore(placeholder, field);
        }

        if (reparent) {
          element.appendChild(field);
        }

        // State B stays authored in Webflow. The state class should make the
        // field occupy the takeover geometry, normally absolute/inset: 0.
        field.classList.add(stateClass);

        if (content && contentLock && contentRect) {
          gsap.set(content, {
            position: "absolute",
            left: 0,
            top: 0,
            width: contentRect.width
          });
        }

        const flip = Flip.from(startState, {
          duration: 1,
          ease: "none",
          nested: true,
          paused: true,
          scale
        });
        flip.progress(0);

        const contentTween = content && !contentLock
          ? gsap.fromTo(
              content,
              {
                opacity: contentOpacityFrom,
                yPercent: contentYFrom
              },
              {
                duration: 1,
                ease: "none",
                opacity: contentOpacityTo,
                paused: true,
                yPercent: contentYFrom + contentY
              }
            )
          : null;
        contentTween?.progress(0);

        const legacy = {
          trigger: element,
          start,
          end: () => relativeSpan(window.innerHeight * (scrollVh / 100)),
          scrub,
          invalidateOnRefresh: true,
          ...(pin
            ? {
                anticipatePin: 1,
                pin: element,
                pinSpacing: true
              }
            : {})
        };

        const scrollTrigger = resolveScrollContract(
          element,
          legacy,
          () => ({
            start,
            end: () => relativeSpan(autoDistance(element, field)),
            ...(pin
              ? {
                  anticipatePin: 1,
                  pin: element,
                  pinSpacing: true
                }
              : {})
          })
        );

        const progressDriver = { value: 0 };
        const driver = gsap.to(progressDriver, {
          value: 1,
          duration: 1,
          ease: "none",
          scrollTrigger,
          onUpdate() {
            const progress = clamp(progressDriver.value);
            flip.progress(progress);

            if (content && contentLock && contentRect) {
              const fieldRect = field.getBoundingClientRect();
              gsap.set(content, {
                x: contentRect.left - fieldRect.left,
                y: contentRect.top - fieldRect.top
              });
            } else {
              contentTween?.progress(
                phaseProgress(progress, contentStart, contentEnd)
              );
            }
          }
        });

        return () => {
          driver.scrollTrigger?.kill();
          driver.kill();
          contentTween?.kill();
          flip.kill();
          restoreAuthoredState();
        };
      }
    );

    return () => mm.revert();
  }
};
