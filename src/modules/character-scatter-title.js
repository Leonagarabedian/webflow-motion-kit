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
      min-height: var(--mk-character-scatter-title-height, 170vh) !important;
      overflow: clip !important;
      isolation: isolate;
    }
    [data-mk-character-scatter-title-stage] {
      position: sticky;
      top: 0;
      width: 100%;
      height: 100svh;
      overflow: clip;
    }
    [data-mk-character-scatter-title-field] {
      position: absolute !important;
      inset: 0 !important;
      z-index: 1;
    }
    [data-mk-character-scatter-title-cluster] {
      position: absolute !important;
      left: var(--mk-scatter-cluster-x) !important;
      top: var(--mk-scatter-cluster-y) !important;
      transform: translate(-50%, -50%);
    }
    [data-mk-character-scatter-title-title] {
      position: absolute !important;
      z-index: 2;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%);
      pointer-events: none;
      will-change: transform;
    }
    [data-mk-character-scatter-title-char] {
      display: inline-block;
      will-change: transform, opacity;
    }
    @media (max-width: 767px) {
      [data-mk-character-scatter-title-section] {
        min-height: var(--mk-character-scatter-title-height-mobile, 165vh) !important;
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

function splitCharacters(element) {
  const originalHTML = element.innerHTML;
  const originalLabel = element.getAttribute("aria-label");
  const label = element.textContent.trim();
  const fragment = element.ownerDocument.createDocumentFragment();
  const characters = [];

  for (const character of Array.from(label)) {
    const span = element.ownerDocument.createElement("span");
    span.setAttribute("data-mk-character-scatter-title-char", "");
    span.setAttribute("aria-hidden", "true");
    span.textContent = character === " " ? "\u00a0" : character;
    fragment.appendChild(span);
    characters.push(span);
  }

  element.replaceChildren(fragment);
  element.setAttribute("aria-label", label);

  return {
    characters,
    restore() {
      element.innerHTML = originalHTML;
      if (originalLabel === null) element.removeAttribute("aria-label");
      else element.setAttribute("aria-label", originalLabel);
    }
  };
}

function layoutClusters(clusters, seed) {
  const mobile = window.innerWidth <= 767;
  const random = seededRandom(seed + (mobile ? 91 : 0));
  const positions = mobile
    ? [[25, 15], [73, 24], [27, 41], [72, 54], [27, 72], [72, 82]]
    : [[17, 23], [50, 16], [82, 27], [22, 70], [52, 61], [81, 76]];

  clusters.forEach((cluster, index) => {
    const base = positions[index % positions.length];
    cluster.style.setProperty("--mk-scatter-cluster-x", `${(base[0] + between(random, -2.2, 2.2)).toFixed(3)}%`);
    cluster.style.setProperty("--mk-scatter-cluster-y", `${(base[1] + between(random, -1.8, 1.8)).toFixed(3)}%`);
  });
}

function createFallbackClusters(field, chips, count, doc) {
  const clusters = Array.from({ length: count }, () => {
    const cluster = doc.createElement("div");
    cluster.setAttribute("data-mk-character-scatter-title-generated", "");
    field.appendChild(cluster);
    return cluster;
  });

  chips.forEach((chip, index) => {
    const clusterIndex = Math.min(count - 1, Math.floor((index * count) / chips.length));
    clusters[clusterIndex].appendChild(chip);
  });

  return clusters;
}

function containedStagger(windowDuration, count, characterDurationRatio) {
  const duration = Math.max(0.01, windowDuration * characterDurationRatio);
  const remaining = Math.max(0, windowDuration - duration);
  const each = count > 1 ? remaining / (count - 1) : 0;
  return { duration, each };
}

export const characterScatterTitle = {
  name: "character-scatter-title",
  category: "composition",
  selector: '[data-motion~="character-scatter-title"]',
  mount(section, { gsap, ScrollTrigger, reducedMotion }) {
    ensureStyles(section.ownerDocument);

    const fieldSelector = readString(section, "motion-field-selector", ".ns-chip-row");
    const chipSelector = readString(section, "motion-chip-selector", ".ns-chip");
    const clusterSelector = readString(section, "motion-cluster-selector", ".ns-tag-cluster");
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

    let clusters = [...field.querySelectorAll(clusterSelector)];
    const usesExistingClusters = clusters.length > 0;
    if (!usesExistingClusters) {
      const count = Math.max(1, Math.min(chips.length, readNumber(section, "motion-cluster-count", 6)));
      clusters = createFallbackClusters(field, chips, count, section.ownerDocument);
    }
    clusters.forEach((cluster) => cluster.setAttribute("data-mk-character-scatter-title-cluster", ""));

    section.style.setProperty("--mk-character-scatter-title-height", readString(section, "motion-section-height", "170vh"));
    section.style.setProperty("--mk-character-scatter-title-height-mobile", readString(section, "motion-mobile-section-height", "165vh"));

    const seed = readNumber(section, "motion-seed", 2604);
    layoutClusters(clusters, seed);

    const chipSplits = chips.map(splitCharacters);
    const titleSplit = splitCharacters(title);
    const chipCharacters = chipSplits.flatMap((split) => split.characters);

    const random = seededRandom(seed + 41);
    const scatterX = readNumber(section, "motion-scatter-x", 18);
    const scatterYMin = readNumber(section, "motion-scatter-y-min", 35);
    const scatterYMax = readNumber(section, "motion-scatter-y-max", 120);
    const rotation = readNumber(section, "motion-rotation", 18);
    const titleRevealY = readNumber(section, "motion-title-reveal-y", 6);

    const scatterMoveEnd = Math.min(1, Math.max(0.01, readNumber(section, "motion-scatter-move-end", 0.95)));
    const scatterFadeStart = Math.min(0.98, Math.max(0, readNumber(section, "motion-scatter-fade-start", 0.28)));
    const scatterFadeEnd = Math.min(1, Math.max(scatterFadeStart + 0.01, readNumber(section, "motion-scatter-fade-end", 0.94)));
    const titleStart = Math.min(0.98, Math.max(0, readNumber(section, "motion-title-start", 0.12)));
    const titleEnd = Math.min(1, Math.max(titleStart + 0.01, readNumber(section, "motion-title-end", 0.48)));

    const destinations = chipCharacters.map(() => ({
      x: between(random, -scatterX, scatterX),
      y: between(random, scatterYMin, scatterYMax),
      rotation: between(random, -rotation, rotation)
    }));

    gsap.set(titleSplit.characters, {
      autoAlpha: reducedMotion() ? 1 : 0,
      y: reducedMotion() ? 0 : titleRevealY
    });
    gsap.set(chipCharacters, {
      x: 0,
      y: 0,
      rotation: 0,
      autoAlpha: reducedMotion() ? 0 : 1
    });

    let timeline = null;
    if (!reducedMotion()) {
      const titleWindow = titleEnd - titleStart;
      const reveal = containedStagger(titleWindow, titleSplit.characters.length, 0.56);

      timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          id: `mk-character-scatter-title-${++sequence}`,
          trigger: section,
          start: readString(section, "motion-start", "top 100%"),
          end: readString(section, "motion-end", "bottom bottom"),
          scrub: readNumber(section, "motion-scrub", 0.15),
          invalidateOnRefresh: true,
          markers: readString(section, "motion-markers", "false") === "true"
        }
      });

      timeline.to({}, { duration: 1 }, 0);

      timeline.to(chipCharacters, {
        x: (index) => destinations[index].x,
        y: (index) => destinations[index].y,
        rotation: (index) => destinations[index].rotation,
        duration: scatterMoveEnd,
        stagger: {
          each: scatterMoveEnd / Math.max(1, chipCharacters.length * 4.5),
          from: "random"
        }
      }, 0);

      timeline.to(chipCharacters, {
        autoAlpha: 0,
        duration: scatterFadeEnd - scatterFadeStart,
        stagger: {
          each: (scatterFadeEnd - scatterFadeStart) / Math.max(1, chipCharacters.length * 6),
          from: "random"
        }
      }, scatterFadeStart);

      timeline.to(titleSplit.characters, {
        autoAlpha: 1,
        y: 0,
        duration: reveal.duration,
        stagger: { each: reveal.each, from: "start" }
      }, titleStart);
    }

    let resizeTimer = 0;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        layoutClusters(clusters, seed);
        ScrollTrigger.refresh();
      }, 150);
    };

    window.addEventListener("resize", onResize);
    section.ownerDocument.fonts?.ready?.then(() => ScrollTrigger.refresh());

    const restoreNode = (node, nextSibling) => {
      if (nextSibling && nextSibling.parentNode === section) section.insertBefore(node, nextSibling);
      else section.appendChild(node);
    };

    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
      timeline?.scrollTrigger?.kill();
      timeline?.kill();
      gsap.set([...chipCharacters, ...titleSplit.characters], { clearProps: "transform,opacity,visibility" });
      chipSplits.forEach((split) => split.restore());
      titleSplit.restore();
      clusters.forEach((cluster) => {
        cluster.removeAttribute("data-mk-character-scatter-title-cluster");
        cluster.style.removeProperty("--mk-scatter-cluster-x");
        cluster.style.removeProperty("--mk-scatter-cluster-y");
      });
      if (!usesExistingClusters) {
        chips.forEach((chip) => field.appendChild(chip));
        clusters.forEach((cluster) => cluster.remove());
      }
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
