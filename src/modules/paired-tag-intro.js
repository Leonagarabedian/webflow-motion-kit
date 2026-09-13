import { readNumber, readString } from "../core/config.js";

export const pairedTagIntro = {
  name: "paired-tag-intro",
  category: "primitive",
  selector: '[data-motion~="paired-tag-intro"]',

  mount(element, { gsap, reducedMotion }) {
    if (reducedMotion()) return;

    const original = element.textContent.trim();
    const parts = original.split("+");
    if (parts.length !== 2) return;

    const leftText = parts[0].trim();
    const rightText = parts[1].trim();
    const index = Math.max(0, readNumber(element, "motion-pair-index", 0));
    const distance = readNumber(element, "motion-pair-distance", 22);
    const duration = readNumber(element, "motion-duration", 0.72);
    const rowStagger = readNumber(element, "motion-pair-row-stagger", 0.14);
    const delay = readNumber(element, "motion-delay", 0.22) + index * rowStagger;
    const blur = readNumber(element, "motion-blur", 5);
    const ease = readString(element, "motion-ease", "power3.out");

    element.setAttribute("aria-label", original);
    element.innerHTML = "";

    const left = document.createElement("span");
    const plus = document.createElement("span");
    const right = document.createElement("span");

    left.textContent = leftText;
    plus.textContent = " + ";
    right.textContent = rightText;

    left.setAttribute("aria-hidden", "true");
    plus.setAttribute("aria-hidden", "true");
    right.setAttribute("aria-hidden", "true");

    left.style.display = "inline-block";
    plus.style.display = "inline-block";
    right.style.display = "inline-block";

    element.append(left, plus, right);

    const timeline = gsap.timeline({ delay });

    timeline.fromTo(
      plus,
      { autoAlpha: 0, filter: `blur(${blur}px)`, scale: 0.82 },
      { autoAlpha: 1, filter: "blur(0px)", scale: 1, duration: duration * 0.55, ease },
      0
    );

    timeline.fromTo(
      left,
      { autoAlpha: 0, x: -distance, filter: `blur(${blur}px)` },
      { autoAlpha: 1, x: 0, filter: "blur(0px)", duration, ease },
      duration * 0.12
    );

    timeline.fromTo(
      right,
      { autoAlpha: 0, x: distance, filter: `blur(${blur}px)` },
      { autoAlpha: 1, x: 0, filter: "blur(0px)", duration, ease },
      duration * 0.12
    );

    return () => {
      timeline.kill();
      element.textContent = original;
      element.removeAttribute("aria-label");
    };
  }
};
