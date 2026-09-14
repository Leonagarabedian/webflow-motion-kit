import { readNumber, readString } from "../core/config.js";

export const statementCompression = {
  name: "statement-compression",
  category: "composition",
  selector: '[data-motion~="statement-compression"]',
  mount(element, { gsap, reducedMotion }) {
    if (reducedMotion() || window.innerWidth < readNumber(element, "motion-min-width", 992)) return;

    const heading = element.querySelector(".ns-svc-quote__text");
    const copy = element.querySelectorAll(".ns-svc-quote__person p");
    const body = copy[0];
    const capabilities = copy[1];
    const cta = element.querySelector(".ns-svc-link");
    if (!heading || !body || !capabilities || !cta) return;

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: element,
        start: readString(element, "motion-start", "top 88%"),
        end: readString(element, "motion-end", "bottom 42%"),
        scrub: readNumber(element, "motion-scrub", 0.85)
      }
    });

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
