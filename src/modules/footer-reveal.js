import { readNumber, readString } from "../core/config.js";

export const footerReveal = {
  name: "footer-reveal",
  category: "composition",
  selector: '[data-motion~="footer-reveal"]',
  mount(element, { gsap, reducedMotion }) {
    if (reducedMotion()) return;

    const labels = Array.from(element.querySelectorAll('[data-motion-target="footer-label"]'));
    const columns = Array.from(element.querySelectorAll('[data-motion-target="footer-column"]'));
    const legal = element.querySelector('[data-motion-target="footer-legal"]');

    const start = readString(element, "motion-start", "top 88%");
    const columnDuration = readNumber(element, "motion-column-duration", 0.55);
    const legalDuration = readNumber(element, "motion-legal-duration", 0.45);
    const columnStagger = readNumber(element, "motion-column-stagger", 0.05);
    const itemStagger = readNumber(element, "motion-item-stagger", 0.035);
    const ease = readString(element, "motion-ease", "power3.out");

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: element,
        start,
        once: true
      }
    });

    if (labels.length) {
      timeline.fromTo(
        labels,
        { autoAlpha: 0, y: 6 },
        { autoAlpha: 1, y: 0, duration: columnDuration * 0.75, ease, stagger: 0.04 },
        0.14
      );
    }

    columns.forEach((column, columnIndex) => {
      const items = Array.from(column.querySelectorAll('[data-motion-target="footer-item"]'));
      if (!items.length) return;
      timeline.fromTo(
        items,
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: columnDuration, ease, stagger: itemStagger },
        0.22 + columnIndex * columnStagger
      );
    });

    if (legal) {
      timeline.fromTo(
        legal,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: legalDuration, ease: "power2.out" },
        0.58
      );
    }

    return () => timeline.kill();
  }
};
