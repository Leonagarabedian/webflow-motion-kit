import { readString } from "../core/config.js";

const STYLE_ID = "motion-kit-character-scatter-title-styles";
const GLITCH_PAIRS = [
  ["①", "⚀"],
  ["②", "⚁"],
  ["③", "⚂"],
  ["④", "⚃"],
  ["⑤", "⚄"],
  ["⑥", "⚅"]
];
const GLITCH_WINDOW = 22;
const UPDATE_EVERY = 8;
const FINAL_GLITCH_COUNT = 4;
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

function splitCharacters(element) {
  const originalHTML = element.innerHTML;
  const originalLabel = element.getAttribute("aria-label");
  const characters = [];

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const fragment = element.ownerDocument.createDocumentFragment();
      for (const character of node.textContent) {
        if (character === " " || character === "\u00a0" || character === "\n") {
          fragment.appendChild(element.ownerDocument.createTextNode(character));
        } else {
          const span = element.ownerDocument.createElement("span");
          span.setAttribute("data-mk-character-scatter-title-char", "");
          span.setAttribute("aria-hidden", "true");
          span.textContent = character;
          fragment.appendChild(span);
          characters.push({ span, original: character });
        }
      }
      node.parentNode.replaceChild(fragment, node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      [...node.childNodes].forEach(walk);
    }
  }

  [...element.childNodes].forEach(walk);
  element.setAttribute("aria-label", element.textContent.trim());

  return {
    characters,
    restore() {
      element.innerHTML = originalHTML;
      if (originalLabel === null) element.removeAttribute("aria-label");
      else element.setAttribute("aria-label", originalLabel);
    }
  };
}

function pairedGlitchCharacter(index) {
  const pair = GLITCH_PAIRS[index % GLITCH_PAIRS.length];
  return pair[Math.random() < 0.5 ? 0 : 1];
}

function updateSourceGlitch(characters, offset, intensity) {
  const length = characters.length;
  if (!length) return;
  const start = ((Math.floor(offset) % length) + length) % length;

  characters.forEach(({ span, original }, index) => {
    let distance = index - start;
    if (distance < 0) distance += length;

    if (distance < GLITCH_WINDOW) {
      const probability = intensity * Math.pow(1 - distance / GLITCH_WINDOW, 0.6);
      span.textContent = Math.random() < probability ? pairedGlitchCharacter(index) : original;
    } else {
      span.textContent = original;
    }
  });
}

function updateFinalReveal(characters, progress) {
  if (!characters.length) return;
  const cursor = progress * characters.length;

  characters.forEach(({ span, original }, index) => {
    if (index < cursor - FINAL_GLITCH_COUNT) {
      span.style.opacity = "1";
      span.textContent = original;
    } else if (index < cursor) {
      span.style.opacity = "1";
      span.textContent = pairedGlitchCharacter(index);
    } else {
      span.style.opacity = "0";
      span.textContent = original;
    }
  });
}

function resolveFinalReveal(characters, progress) {
  const cursor = progress * characters.length;
  characters.forEach(({ span, original }, index) => {
    span.style.opacity = index < cursor ? "1" : "0";
    span.textContent = original;
  });
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

    const sourceSplits = chips.map(splitCharacters);
    const sourceGroups = sourceSplits.map((split) => split.characters);
    const sourceCharacters = sourceGroups.flat();
    const titleSplit = splitCharacters(title);
    const titleCharacters = titleSplit.characters;

    titleCharacters.forEach(({ span }) => {
      span.style.opacity = "0";
    });

    if (reducedMotion()) {
      gsap.set(sourceCharacters.map(({ span }) => span), { opacity: 0 });
      titleCharacters.forEach(({ span, original }) => {
        span.style.opacity = "1";
        span.textContent = original;
      });
    }

    let fallTimeline = null;
    let velocityTrigger = null;
    let rafId = null;
    let running = false;
    let frame = 0;
    let velocity = 0;
    let velocityTarget = 0;
    let glitchOffset = 0;
    let lastProgress = -1;

    const resetSourceCharacters = () => {
      sourceCharacters.forEach(({ span, original }) => {
        span.textContent = original;
      });
    };

    const stopGlitch = () => {
      running = false;
      velocityTarget = 0;
      velocity = 0;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      resetSourceCharacters();
      titleCharacters.forEach(({ span, original }) => {
        span.style.opacity = "0";
        span.textContent = original;
      });
      lastProgress = -1;
    };

    const tick = () => {
      if (!running) return;

      frame += 1;
      velocity += (velocityTarget - velocity) * 0.14;
      velocityTarget *= 0.9;

      if (frame % UPDATE_EVERY === 0) {
        if (velocity > 0.01) {
          const longestGroup = Math.max(...sourceGroups.map((group) => group.length), 1);
          glitchOffset = (glitchOffset + 1 + velocity * 10) % longestGroup;
          sourceGroups.forEach((group) => updateSourceGlitch(group, glitchOffset, velocity));
        } else {
          resetSourceCharacters();
        }

        if (titleCharacters.length && fallTimeline) {
          const progress = fallTimeline.scrollTrigger?.progress ?? 0;
          if (Math.abs(progress - lastProgress) > 0.0002) {
            updateFinalReveal(titleCharacters, progress);
          } else {
            resolveFinalReveal(titleCharacters, progress);
          }
          lastProgress = progress;
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    const startGlitch = () => {
      if (running) return;
      running = true;
      frame = 0;
      rafId = requestAnimationFrame(tick);
    };

    if (!reducedMotion()) {
      velocityTrigger = ScrollTrigger.create({
        id: `mk-character-scatter-title-velocity-${++sequence}`,
        trigger: section,
        start: "top bottom",
        end: "bottom top",
        onEnter: startGlitch,
        onLeave: stopGlitch,
        onEnterBack: startGlitch,
        onLeaveBack: stopGlitch,
        onUpdate(self) {
          velocityTarget = Math.min(Math.abs(self.getVelocity()) / 3400, 0.45);
        }
      });

      fallTimeline = gsap.timeline({
        scrollTrigger: {
          id: `mk-character-scatter-title-fall-${sequence}`,
          trigger: section,
          start: readString(section, "motion-start", "top top"),
          end: readString(section, "motion-end", "center 30%"),
          scrub: 2,
          invalidateOnRefresh: true,
          markers: readString(section, "motion-markers", "false") === "true"
        }
      });

      sourceGroups.forEach((group, groupIndex) => {
        const basePosition = groupIndex * 0.06;
        group.forEach(({ span }) => {
          fallTimeline.to(
            span,
            {
              y: gsap.utils.random(40, 160),
              x: gsap.utils.random(-10, 10),
              rotation: gsap.utils.random(-20, 20),
              opacity: 0,
              ease: "power2.in",
              duration: gsap.utils.random(0.25, 0.7)
            },
            basePosition + gsap.utils.random(0, 0.6)
          );
        });
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
      stopGlitch();
      velocityTrigger?.kill?.();
      fallTimeline?.scrollTrigger?.kill?.();
      fallTimeline?.kill?.();

      gsap.set(sourceCharacters.map(({ span }) => span), {
        clearProps: "transform,opacity,visibility"
      });
      gsap.set(titleCharacters.map(({ span }) => span), {
        clearProps: "transform,opacity,visibility"
      });

      sourceSplits.forEach((split) => split.restore());
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
