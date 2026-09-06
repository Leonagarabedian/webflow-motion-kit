import { readNumber, readString } from "../core/config.js";

const STYLE_ID = "motion-kit-character-scatter-title-styles";
let sequence = 0;

function ensureStyles(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [data-mk-character-scatter-title-section] {
      position: relative !important;
      min-height: var(--mk-character-scatter-title-height, 200vh) !important;
      overflow: clip !important;
      isolation: isolate;
    }
    [data-mk-character-scatter-title-stage] {
      position: sticky;
      top: 0;
      width: 100%;
      height: 100svh;
      display: flex;
      align-items: center;
      overflow: clip;
    }
    [data-mk-character-scatter-title-field] {
      position: relative !important;
      z-index: 1;
      width: 100%;
    }
    [data-mk-character-scatter-title-title] {
      position: absolute !important;
      z-index: 2;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%);
      pointer-events: none;
      will-change: opacity;
    }
    [data-mk-character-scatter-title-char] {
      display: inline-block;
      will-change: transform, opacity;
    }
    @media (max-width: 767px) {
      [data-mk-character-scatter-title-section] {
        min-height: var(--mk-character-scatter-title-height-mobile, 180vh) !important;
      }
    }
  `;
  doc.head.appendChild(style);
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function between(random, min, max) {
  return min + (max - min) * random();
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function rangeProgress(progress, start, end) {
  if (end <= start) return progress >= end ? 1 : 0;
  return clamp01((progress - start) / (end - start));
}

function smooth(progress) {
  const p = clamp01(progress);
  return p * p * (3 - 2 * p);
}

function splitCharacters(element) {
  const originalHTML = element.innerHTML;
  const originalLabel = element.getAttribute("aria-label");
  const text = element.textContent.trim();
  const fragment = element.ownerDocument.createDocumentFragment();
  const characters = [];

  for (const character of Array.from(text)) {
    const span = element.ownerDocument.createElement("span");
    span.setAttribute("data-mk-character-scatter-title-char", "");
    span.setAttribute("aria-hidden", "true");
    span.textContent = character === " " ? "\u00a0" : character;
    fragment.appendChild(span);
    characters.push(span);
  }

  element.replaceChildren(fragment);
  element.setAttribute("aria-label", text);

  return {
    characters,
    restore() {
      element.innerHTML = originalHTML;
      if (originalLabel === null) element.removeAttribute("aria-label");
      else element.setAttribute("aria-label", originalLabel);
    }
  };
}

export const characterScatterTitle = {
  name: "character-scatter-title",
  category: "composition",
  selector: '[data-motion~="character-scatter-title"]',

  mount(section, { gsap, ScrollTrigger, reducedMotion }) {
    ensureStyles(section.ownerDocument);

    const fieldSelector = readString(section, "motion-field-selector", ".ns-chip-row");
    const chipSelector = readString(section, "motion-chip-selector", ".ns-chip");
    const titleSelector = readString(section, "motion-title-selector", ".ns-tags-title");
    const field = section.querySelector(fieldSelector);
    const title = section.querySelector(titleSelector);
    const chips = field ? [...field.querySelectorAll(chipSelector)] : [];
    if (!field || !title || !chips.length) return;

    const originalTitleNextSibling = title.nextSibling;
    const originalFieldNextSibling = field.nextSibling;
    const stage = section.ownerDocument.createElement("div");
    stage.setAttribute("data-mk-character-scatter-title-stage", "");
    section.insertBefore(stage, title);
    stage.append(title, field);

    section.setAttribute("data-mk-character-scatter-title-section", "");
    field.setAttribute("data-mk-character-scatter-title-field", "");
    title.setAttribute("data-mk-character-scatter-title-title", "");

    section.style.setProperty(
      "--mk-character-scatter-title-height",
      readString(section, "motion-section-height", "200vh")
    );
    section.style.setProperty(
      "--mk-character-scatter-title-height-mobile",
      readString(section, "motion-mobile-section-height", "180vh")
    );

    const chipSplits = chips.map(splitCharacters);
    const titleSplit = splitCharacters(title);
    const sourceCharacters = chipSplits.flatMap((split) => split.characters);
    const titleCharacters = titleSplit.characters;

    const seed = readNumber(section, "motion-seed", 2604);
    const random = seededRandom(seed);
    const scatterX = readNumber(section, "motion-scatter-x", 90);
    const scatterY = readNumber(section, "motion-scatter-y", 70);
    const rotation = readNumber(section, "motion-rotation", 6);

    const scatterStart = clamp01(readNumber(section, "motion-scatter-start", 0.05));
    const scatterEnd = clamp01(readNumber(section, "motion-scatter-end", 0.9));
    const fadeStart = clamp01(readNumber(section, "motion-scatter-fade-start", 0.52));
    const fadeEnd = clamp01(readNumber(section, "motion-scatter-fade-end", 0.96));
    const titleStart = clamp01(readNumber(section, "motion-title-start", 0.12));
    const titleEnd = clamp01(readNumber(section, "motion-title-end", 0.46));
    const titleStagger = Math.max(
      0,
      Math.min(titleEnd - titleStart - 0.01, readNumber(section, "motion-title-stagger", 0.14))
    );

    const destinations = sourceCharacters.map(() => ({
      x: between(random, -scatterX, scatterX),
      y: between(random, -scatterY, scatterY),
      rotation: between(random, -rotation, rotation),
      moveDelay: between(random, 0, 0.14),
      fadeDelay: between(random, 0, 0.08)
    }));

    const render = (progress) => {
      gsap.set(sourceCharacters, {
        x: (index) => {
          const destination = destinations[index];
          const move = smooth(rangeProgress(progress, scatterStart + destination.moveDelay, scatterEnd));
          return destination.x * move;
        },
        y: (index) => {
          const destination = destinations[index];
          const move = smooth(rangeProgress(progress, scatterStart + destination.moveDelay, scatterEnd));
          return destination.y * move;
        },
        rotation: (index) => {
          const destination = destinations[index];
          const move = smooth(rangeProgress(progress, scatterStart + destination.moveDelay, scatterEnd));
          return destination.rotation * move;
        },
        autoAlpha: (index) => {
          const destination = destinations[index];
          const start = Math.min(fadeEnd - 0.01, fadeStart + destination.fadeDelay);
          return 1 - smooth(rangeProgress(progress, start, fadeEnd));
        }
      });

      const count = Math.max(1, titleCharacters.length - 1);
      const revealDuration = Math.max(0.01, titleEnd - titleStart - titleStagger);

      gsap.set(titleCharacters, {
        autoAlpha: (index) => {
          const start = titleStart + titleStagger * (index / count);
          return smooth(rangeProgress(progress, start, start + revealDuration));
        },
        x: 0,
        y: 0,
        rotation: 0
      });
    };

    let trigger = null;

    if (reducedMotion()) {
      render(1);
    } else {
      render(0);
      trigger = ScrollTrigger.create({
        id: `mk-character-scatter-title-${++sequence}`,
        trigger: section,
        start: readString(section, "motion-start", "top top"),
        end: readString(section, "motion-end", "bottom bottom"),
        scrub: readNumber(section, "motion-scrub", 1),
        invalidateOnRefresh: true,
        markers: readString(section, "motion-markers", "false") === "true",
        onUpdate: (self) => render(self.progress)
      });
    }

    const onResize = () => ScrollTrigger.refresh?.();
    window.addEventListener("resize", onResize);
    section.ownerDocument.fonts?.ready?.then(() => ScrollTrigger.refresh?.());

    const restoreNode = (node, nextSibling) => {
      if (nextSibling && nextSibling.parentNode === section) section.insertBefore(node, nextSibling);
      else section.appendChild(node);
    };

    return () => {
      window.removeEventListener("resize", onResize);
      trigger?.kill?.();
      gsap.set([...sourceCharacters, ...titleCharacters], {
        clearProps: "transform,opacity,visibility"
      });
      chipSplits.forEach((split) => split.restore());
      titleSplit.restore();
      field.removeAttribute("data-mk-character-scatter-title-field");
      title.removeAttribute("data-mk-character-scatter-title-title");
      section.removeAttribute("data-mk-character-scatter-title-section");
      section.style.removeProperty("--mk-character-scatter-title-height");
      section.style.removeProperty("--mk-character-scatter-title-height-mobile");
      restoreNode(field, originalFieldNextSibling);
      restoreNode(title, originalTitleNextSibling);
      stage.remove();
    };
  }
};
