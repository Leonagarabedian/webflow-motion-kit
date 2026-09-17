import { scrollMode } from "../../core/scroll-alignment/contract.js";
import { readNumber, readString } from "../../core/config.js";

const STATEMENT_STAGES = [
  {
    name: "heading-compression",
    start: 0,
    end: 0.44,
    duration: 0.44,
    yFrom: 16,
    yTo: 0,
    scaleXFrom: 1.14,
    scaleXTo: 1,
    scaleYFrom: 1.05,
    scaleYTo: 1
  },
  {
    name: "body-reveal",
    start: 0.18,
    end: 0.56,
    duration: 0.38,
    yFrom: 72,
    yTo: 0,
    opacityFrom: 0.18,
    opacityTo: 1,
    blurFrom: 8,
    blurTo: 0
  },
  {
    name: "capabilities-reveal",
    start: 0.42,
    end: 0.74,
    duration: 0.32,
    yFrom: 28,
    yTo: 0,
    opacityFrom: 0.26,
    opacityTo: 1,
    letterSpacingFrom: 0.09,
    letterSpacingTo: 0
  },
  {
    name: "cta-reveal",
    start: 0.7,
    end: 0.92,
    duration: 0.22,
    yFrom: 24,
    yTo: 0,
    opacityFrom: 0,
    opacityTo: 1
  }
];

export const statementCompression = {
  name: "statement-compression",
  category: "composition",
  selector: '[data-motion~="statement-compression"]',
  mount(element, { gsap, reducedMotion, scrollAlignment }) {
    const mode = scrollMode(element);
    const minimumWidth = readNumber(element, "motion-min-width", 992);

    if (reducedMotion()) return;
    if (mode !== "auto" && window.innerWidth < minimumWidth) return;

    const heading = element.querySelector(".ns-svc-quote__text");
    const copy = element.querySelectorAll(".ns-svc-quote__person p");
    const body = copy[0];
    const capabilities = copy[1];
    const cta = element.querySelector(".ns-svc-link");
    if (!heading || !body || !capabilities || !cta) return;

    let alignment;

    if (mode === "auto") {
      alignment = scrollAlignment.build(element, {
        mode: "auto",
        id: "services-statement-compression",
        trigger: readString(element, "motion-alignment-trigger", ".ns-svc-quote__text"),
        profile: "composition",
        stages: STATEMENT_STAGES,
        scrub: element.hasAttribute("data-motion-scrub") ? readNumber(element, "motion-scrub", 0.85) : true,
        emphasis: 1,
        invalidateOnRefresh: true
      });
    } else if (mode === "aligned") {
      alignment = scrollAlignment.build(element, {
        mode: "aligned",
        id: "services-statement-compression",
        trigger: readString(element, "motion-alignment-trigger", ".ns-svc-quote__text"),
        anchor: readString(element, "motion-alignment-anchor", "top"),
        viewport: readNumber(element, "motion-alignment-viewport", 0.72),
        span: readString(element, "motion-alignment-span", "70vh"),
        scrub: readNumber(element, "motion-scrub", 0.85),
        invalidateOnRefresh: true,
        breakpoints: {
          tablet: { enabled: false },
          mobileLandscape: { enabled: false },
          mobile: { enabled: false }
        }
      });
    } else {
      alignment = scrollAlignment.build(element, {
        mode: "legacy",
        legacy: {
          trigger: element,
          start: readString(element, "motion-start", "top 88%"),
          end: readString(element, "motion-end", "bottom 42%"),
          scrub: readNumber(element, "motion-scrub", 0.85)
        }
      });
    }

    if (!alignment?.enabled) return;

    const tl = alignment.timeline({ defaults: { ease: "none" } });

    tl.fromTo(heading,
      { scaleX: 1.14, scaleY: 1.05, y: 16, transformOrigin: "center center" },
      { scaleX: 1, scaleY: 1, y: 0, duration: 0.44 }, 0);
    tl.fromTo(body,
      { autoAlpha: 0.18, filter: "blur(8px)", y: 72 },
      { autoAlpha: 1, filter: "blur(0px)", y: 0, duration: 0.38 }, 0.18);
    tl.fromTo(capabilities,
      { autoAlpha: 0.26, letterSpacing: "0.09em", y: 28 },
      { autoAlpha: 1, letterSpacing: "0em", y: 0, duration: 0.32 }, 0.42);
    tl.fromTo(cta,
      { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, duration: 0.22 }, 0.7);

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
      gsap.set([heading, body, capabilities, cta], { clearProps: "transform,opacity,visibility,filter,letterSpacing" });
    };
  }
};
