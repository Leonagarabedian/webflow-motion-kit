import { readNumber, readString } from "../../core/config.js";
import { scrollMode } from "../../core/scroll-alignment/contract.js";
export const brandFieldActivate = {
  name: "brand-field-activate",
  category: "composition",
  selector: '[data-motion~="brand-field-activate"]',
  mount(element, { gsap, reducedMotion, scrollAlignment }) {
    const items = Array.from(element.querySelectorAll(".ns-svc-brand-item"));
    if (!items.length) return;

    const minWidth = Number(element.getAttribute("data-motion-min-width") || 992);
    if (reducedMotion() || window.innerWidth < minWidth) return;

    const rect = element.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const entries = items.map((item) => {
      const r = item.getBoundingClientRect();
      const x = r.left + r.width / 2 - cx;
      const y = r.top + r.height / 2 - cy;
      const len = Math.hypot(x, y) || 1;
      return {
        item,
        x: (x / len) * 10,
        y: (y / len) * 10,
        d: Math.hypot(x, y)
      };
    });

    const maxD = Math.max(...entries.map((entry) => entry.d), 1);
    const mode = scrollMode(element);

    const alignment = mode === "auto"
      ? scrollAlignment.build(element, {
          mode: "auto",
          id: "services-brand-field-activate",
          trigger: element,
          profile: "composition",
          stages: entries.flatMap(entry => {
            const n = entry.d / maxD;
            const enter = 0.05 + n * 0.2;
            const peak = 0.3 + n * 0.22;
            return [
              { name: "field-enter", start: enter, duration: 0.22, xFrom: entry.x, xTo: 0, yFrom: entry.y, yTo: 0, scaleFrom: 0.97, scaleTo: 1, opacityFrom: 0.18, opacityTo: 0.55, blurFrom: 4, blurTo: 0 },
              { name: "field-peak", start: peak, duration: 0.12, scaleFrom: 1, scaleTo: 1.025, opacityFrom: 0.55, opacityTo: 0.92 },
              { name: "field-settle", start: peak + 0.16, duration: 0.18, scaleFrom: 1.025, scaleTo: 1, opacityFrom: 0.92, opacityTo: 0.55 }
            ];
          }),
          scrub: element.hasAttribute("data-motion-scrub") ? readNumber(element, "motion-scrub", 0.75) : true,
          emphasis: 0.9,
          invalidateOnRefresh: true,
          breakpoints: {
            tablet: { enabled: false },
            mobileLandscape: { enabled: false },
            mobile: { enabled: false }
          }
        })
      : scrollAlignment.build(element, {
          mode: "legacy",
          legacy: {
            trigger: element,
            start: readString(element, "motion-start", "top 82%"),
            end: readString(element, "motion-end", "bottom 32%"),
            scrub: readNumber(element, "motion-scrub", 0.75)
          }
        });

    if (!alignment?.enabled) return;

    const tl = alignment.timeline();

    entries.forEach((entry) => {
      const n = entry.d / maxD;
      const enter = 0.05 + n * 0.2;
      const peak = 0.3 + n * 0.22;

      tl.fromTo(entry.item,
        { opacity: 0.18, filter: "blur(4px)", scale: 0.97, x: entry.x, y: entry.y },
        { opacity: 0.55, filter: "blur(0px)", scale: 1, x: 0, y: 0, duration: 0.22, ease: "none" },
        enter
      );

      tl.to(entry.item,
        { opacity: 0.92, scale: 1.025, duration: 0.12, ease: "none" },
        peak
      );

      tl.to(entry.item,
        { opacity: 0.55, scale: 1, duration: 0.18, ease: "none" },
        peak + 0.16
      );
    });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
      gsap.set(items, { clearProps: "opacity,filter,transform" });
    };
  }
};
