import {
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
  axis: "both",
  minWidth: 992,
  mode: "expand",
  pin: false,
  progressEnd: 0.5,
  progressStart: 0,
  scrub: 1,
  scrollVh: 100,
  start: "top top"
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

function sourceInsets(field, source, axis) {
  const fieldRect = field.getBoundingClientRect();
  const sourceRect = source.getBoundingClientRect();
  const width = Math.max(1, fieldRect.width);
  const height = Math.max(1, fieldRect.height);

  let top = clamp(((sourceRect.top - fieldRect.top) / height) * 100, 0, 100);
  let right = clamp(((fieldRect.right - sourceRect.right) / width) * 100, 0, 100);
  let bottom = clamp(((fieldRect.bottom - sourceRect.bottom) / height) * 100, 0, 100);
  let left = clamp(((sourceRect.left - fieldRect.left) / width) * 100, 0, 100);

  if (axis === "x") {
    top = 0;
    bottom = 0;
  } else if (axis === "y") {
    left = 0;
    right = 0;
  }

  return [top, right, bottom, left];
}

function interpolateInsets(from, to, progress) {
  return from.map((value, index) =>
    value + (to[index] - value) * progress
  );
}

function clipPath(insets) {
  return `inset(${insets.map(value => `${value.toFixed(4)}%`).join(" ")})`;
}

export const sectionField = {
  name: "section-field",
  category: "composition",
  selector: '[data-motion~="section-field"]',

  mount(element, { gsap, reducedMotion }) {
    const field = selectTarget(element, "section-field", null);
    const source = selectTarget(element, "section-field-source", null);

    if (!field || !source) return;

    const minWidth = readNumber(element, "motion-min-width", DEFAULTS.minWidth);
    const mode = readString(element, "motion-field-mode", DEFAULTS.mode);
    const axis = readString(element, "motion-field-axis", DEFAULTS.axis);
    const progressStart = clamp(
      readNumber(element, "motion-field-progress-start", DEFAULTS.progressStart)
    );
    const progressEnd = clamp(
      readNumber(element, "motion-field-progress-end", DEFAULTS.progressEnd),
      progressStart + 0.0001,
      1
    );
    const start = readString(element, "motion-start", DEFAULTS.start);
    const scrollVh = Math.max(
      1,
      readNumber(element, "motion-scroll-vh", DEFAULTS.scrollVh)
    );
    const scrub = readNumber(element, "motion-scrub", DEFAULTS.scrub);
    const pin = readBoolean(element, "motion-pin", DEFAULTS.pin);

    const originalFieldStyle = field.getAttribute("style");
    let sourceClip = [0, 0, 0, 0];

    const measure = () => {
      sourceClip = sourceInsets(field, source, axis);
    };

    const render = (scrollProgress) => {
      const phase = phaseProgress(scrollProgress, progressStart, progressEnd);
      const full = [0, 0, 0, 0];
      const from = mode === "compress" ? full : sourceClip;
      const to = mode === "compress" ? sourceClip : full;
      const clip = clipPath(interpolateInsets(from, to, phase));

      field.style.clipPath = clip;
      field.style.webkitClipPath = clip;
    };

    measure();
    render(mode === "compress" ? 0 : 0);

    if (reducedMotion() || window.innerWidth < minWidth) {
      render(mode === "compress" ? 1 : 0);
      return () => restoreInlineStyle(field, originalFieldStyle);
    }

    field.style.willChange = "clip-path";

    const legacy = {
      trigger: element,
      start,
      end: () => relativeSpan(window.innerHeight * (scrollVh / 100)),
      scrub,
      invalidateOnRefresh: true,
      onRefreshInit() {
        measure();
      },
      onRefresh() {
        render(driver.value);
      },
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
        end: () => relativeSpan(window.innerHeight * (scrollVh / 100)),
        ...(pin
          ? {
              anticipatePin: 1,
              pin: element,
              pinSpacing: true
            }
          : {})
      })
    );

    const driver = { value: 0 };
    const tween = gsap.to(driver, {
      value: 1,
      duration: 1,
      ease: "none",
      scrollTrigger,
      onUpdate() {
        render(driver.value);
      }
    });

    render(0);

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      restoreInlineStyle(field, originalFieldStyle);
    };
  }
};
