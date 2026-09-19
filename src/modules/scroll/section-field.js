import {
  relativeSpan,
  resolveScrollContract,
  scrollMode
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
  progressEnd: 1,
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

function autoStage(field, source, progressStart, progressEnd) {
  const fieldRect = field.getBoundingClientRect();
  const sourceRect = source.getBoundingClientRect();
  const fieldWidth = Math.max(1, fieldRect.width);
  const fieldHeight = Math.max(1, fieldRect.height);

  return {
    name: "section-field",
    start: progressStart,
    end: progressEnd,
    duration: Math.max(0.0001, progressEnd - progressStart),
    target: field,
    scaleXFrom: clamp(sourceRect.width / fieldWidth, 0.01, 1),
    scaleXTo: 1,
    scaleYFrom: clamp(sourceRect.height / fieldHeight, 0.01, 1),
    scaleYTo: 1
  };
}

export const sectionField = {
  name: "section-field",
  category: "composition",
  selector: '[data-motion~="section-field"]',

  mount(element, { gsap, reducedMotion, scrollAlignment }) {
    const field = selectTarget(element, "section-field", null);
    const source = selectTarget(element, "section-field-source", null);

    if (!field || !source) return;

    const mode = scrollMode(element);
    const minWidth = readNumber(element, "motion-min-width", DEFAULTS.minWidth);
    const fieldMode = readString(element, "motion-field-mode", DEFAULTS.mode);
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
    const end = element.getAttribute("data-motion-end");
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
      const from = fieldMode === "compress" ? full : sourceClip;
      const to = fieldMode === "compress" ? sourceClip : full;
      const clip = clipPath(interpolateInsets(from, to, phase));

      field.style.clipPath = clip;
      field.style.webkitClipPath = clip;
    };

    measure();
    render(0);

    if (reducedMotion() || window.innerWidth < minWidth) {
      render(fieldMode === "compress" ? 1 : 0);
      return () => restoreInlineStyle(field, originalFieldStyle);
    }

    field.style.willChange = "clip-path";

    const driver = { value: 0 };
    let scrollTrigger;

    if ((mode === "auto" || mode === "aligned") && scrollAlignment) {
      const alignment = scrollAlignment.build(element, {
        mode,
        id: readString(element, "motion-alignment-id", "section-field"),
        trigger: readString(element, "motion-alignment-trigger", "self"),
        profile: "handoff",
        stages: [autoStage(field, source, progressStart, progressEnd)],
        ...(element.hasAttribute("data-motion-scrub") ? { scrub } : {}),
        ...(mode === "aligned"
          ? {
              anchor: readString(element, "motion-alignment-anchor", "top"),
              viewport: readNumber(element, "motion-alignment-viewport", 0.7),
              span: readString(element, "motion-alignment-span", "70vh")
            }
          : {}),
        pin: pin ? { enabled: true, target: element } : false,
        invalidateOnRefresh: true,
        onRefresh() {
          measure();
          render(driver.value);
        }
      });

      if (!alignment?.enabled) {
        restoreInlineStyle(field, originalFieldStyle);
        return;
      }

      scrollTrigger = alignment.scrollTrigger;
    } else {
      const legacy = {
        trigger: element,
        start,
        end: end || (() => relativeSpan(window.innerHeight * (scrollVh / 100))),
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

      scrollTrigger = resolveScrollContract(element, legacy, () => legacy);
    }

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
