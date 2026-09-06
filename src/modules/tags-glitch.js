import { readNumber, readString } from "../core/config.js";

const STYLE_ID = "motion-kit-tags-glitch-styles";
let sequence = 0;

function ensureStyles(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [data-mk-tags-glitch-section] { position: relative !important; min-height: var(--mk-tags-glitch-height, 200vh) !important; padding: 0 !important; overflow: clip !important; isolation: isolate; background: var(--mk-tags-glitch-background, #0a0a0a) !important; color: var(--mk-tags-glitch-color, #fff) !important; }
    [data-mk-tags-glitch-stage] { position: sticky; top: 0; width: 100%; height: 100svh; overflow: clip; }
    [data-mk-tags-glitch-field] { position: absolute !important; inset: 0 !important; z-index: 1; display: block !important; width: 100% !important; height: 100% !important; min-height: 0 !important; margin: 0 !important; }
    [data-mk-tags-glitch-cluster] { position: absolute !important; left: var(--mk-cluster-x) !important; top: var(--mk-cluster-y) !important; display: block !important; width: min(15rem, 28vw) !important; max-width: none !important; line-height: 1.05; transform: translate(-50%, -50%); }
    [data-mk-tags-glitch-chip] { position: static !important; display: inline !important; margin: 0 0.42em 0 0 !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; background: transparent !important; color: inherit !important; font-size: clamp(0.72rem, 1.1vw, 1.125rem) !important; line-height: 1 !important; white-space: normal !important; }
    [data-mk-tags-glitch-title] { position: absolute !important; z-index: 2; top: 50% !important; left: 50% !important; width: min(13rem, calc(100% - 2rem)) !important; margin: 0 !important; color: inherit !important; font-size: clamp(0.9rem, 1.1vw, 1.125rem) !important; line-height: 1.05 !important; text-align: left !important; transform: translate(-50%, -50%); pointer-events: none; will-change: transform; }
    [data-mk-tags-glitch-char] { display: inline-block; will-change: transform, opacity; }
    @media (max-width: 767px) {
      [data-mk-tags-glitch-section] { min-height: var(--mk-tags-glitch-height-mobile, 175vh) !important; }
      [data-mk-tags-glitch-cluster] { width: min(11rem, 42vw) !important; }
      [data-mk-tags-glitch-chip] { font-size: 0.7rem !important; }
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
    span.setAttribute("data-mk-tags-glitch-char", "");
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
    cluster.style.setProperty("--mk-cluster-x", `${(base[0] + between(random, -2.2, 2.2)).toFixed(3)}%`);
    cluster.style.setProperty("--mk-cluster-y", `${(base[1] + between(random, -1.8, 1.8)).toFixed(3)}%`);
  });
}

function createFallbackClusters(field, chips, count, doc) {
  const clusters = Array.from({ length: count }, () => {
    const cluster = doc.createElement("div");
    cluster.setAttribute("data-mk-tags-glitch-generated", "");
    field.appendChild(cluster);
    return cluster;
  });
  chips.forEach((chip, index) => {
    const clusterIndex = Math.min(count - 1, Math.floor((index * count) / chips.length));
    clusters[clusterIndex].appendChild(chip);
  });
  return clusters;
}

export const tagsGlitch = {
  name: "tags-glitch",
  category: "composition",
  selector: '[data-motion~="tags-glitch"]',
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
    stage.setAttribute("data-mk-tags-glitch-stage", "");
    section.insertBefore(stage, title);
    stage.append(title, field);

    section.setAttribute("data-mk-tags-glitch-section", "");
    field.setAttribute("data-mk-tags-glitch-field", "");
    title.setAttribute("data-mk-tags-glitch-title", "");
    chips.forEach((chip) => chip.setAttribute("data-mk-tags-glitch-chip", ""));

    let clusters = [...field.querySelectorAll(clusterSelector)];
    const usesExistingClusters = clusters.length > 0;
    if (!usesExistingClusters) {
      const count = Math.max(1, Math.min(chips.length, readNumber(section, "motion-cluster-count", 6)));
      clusters = createFallbackClusters(field, chips, count, section.ownerDocument);
    }
    clusters.forEach((cluster) => cluster.setAttribute("data-mk-tags-glitch-cluster", ""));

    section.style.setProperty("--mk-tags-glitch-height", readString(section, "motion-section-height", "200vh"));
    section.style.setProperty("--mk-tags-glitch-height-mobile", readString(section, "motion-mobile-section-height", "175vh"));
    section.style.setProperty("--mk-tags-glitch-background", readString(section, "motion-background-color", "#0a0a0a"));
    section.style.setProperty("--mk-tags-glitch-color", readString(section, "motion-text-color", "#ffffff"));

    const seed = readNumber(section, "motion-seed", 2604);
    layoutClusters(clusters, seed);

    const chipSplits = chips.map(splitCharacters);
    const titleSplit = splitCharacters(title);
    const chipCharacters = chipSplits.flatMap((split) => split.characters);
    const random = seededRandom(seed + 17);
    const scatterX = readNumber(section, "motion-scatter-x", 12);
    const scatterYMin = readNumber(section, "motion-scatter-y-min", 55);
    const scatterYMax = readNumber(section, "motion-scatter-y-max", 160);
    const rotation = readNumber(section, "motion-rotation", 20);
    const titleStartY = readNumber(section, "motion-title-start-y", 0);
    const titleEndY = readNumber(section, "motion-title-end-y", 0);
    const destinations = chipCharacters.map(() => ({
      x: between(random, -scatterX, scatterX),
      y: between(random, scatterYMin, scatterYMax),
      rotation: between(random, -rotation, rotation)
    }));

    gsap.set(title, { y: reducedMotion() ? 0 : titleStartY });
    gsap.set(titleSplit.characters, { autoAlpha: reducedMotion() ? 1 : 0, y: reducedMotion() ? 0 : 12 });
    gsap.set(chipCharacters, { x: 0, y: 0, rotation: 0, autoAlpha: reducedMotion() ? 0 : 1 });

    let timeline = null;
    if (!reducedMotion()) {
      const chipFadeEnd = readNumber(section, "motion-chip-fade-end", 0.68);
      const titleStart = readNumber(section, "motion-title-start", 0.2);
      const titleEnd = readNumber(section, "motion-title-end", 0.76);
      timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          id: `mk-tags-glitch-${++sequence}`,
          trigger: section,
          start: readString(section, "motion-start", "top top"),
          end: readString(section, "motion-end", "bottom bottom"),
          scrub: readNumber(section, "motion-scrub", 0.35),
          invalidateOnRefresh: true,
          markers: readString(section, "motion-markers", "false") === "true"
        }
      });
      timeline.to(chipCharacters, {
        x: (index) => destinations[index].x,
        y: (index) => destinations[index].y,
        rotation: (index) => destinations[index].rotation,
        autoAlpha: 0,
        duration: chipFadeEnd,
        stagger: { each: chipFadeEnd / Math.max(1, chipCharacters.length * 3.5), from: "random" }
      }, 0);
      timeline.to(title, {
        y: titleEndY,
        duration: Math.max(0.01, titleEnd - titleStart)
      }, titleStart);
      timeline.to(titleSplit.characters, {
        autoAlpha: 1,
        y: 0,
        duration: Math.max(0.01, titleEnd - titleStart),
        stagger: { each: Math.max(0.01, titleEnd - titleStart) / Math.max(1, titleSplit.characters.length * 2.4), from: "start" }
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
      gsap.set(title, { clearProps: "transform" });
      gsap.set([...chipCharacters, ...titleSplit.characters], { clearProps: "transform,opacity,visibility" });
      chipSplits.forEach((split) => split.restore());
      titleSplit.restore();
      chips.forEach((chip) => chip.removeAttribute("data-mk-tags-glitch-chip"));
      clusters.forEach((cluster) => {
        cluster.removeAttribute("data-mk-tags-glitch-cluster");
        cluster.style.removeProperty("--mk-cluster-x");
        cluster.style.removeProperty("--mk-cluster-y");
      });
      if (!usesExistingClusters) {
        chips.forEach((chip) => field.appendChild(chip));
        clusters.forEach((cluster) => cluster.remove());
      }
      field.removeAttribute("data-mk-tags-glitch-field");
      title.removeAttribute("data-mk-tags-glitch-title");
      section.removeAttribute("data-mk-tags-glitch-section");
      section.style.removeProperty("--mk-tags-glitch-height");
      section.style.removeProperty("--mk-tags-glitch-height-mobile");
      section.style.removeProperty("--mk-tags-glitch-background");
      section.style.removeProperty("--mk-tags-glitch-color");
      restoreNode(field, originalFieldNextSibling);
      restoreNode(title, originalTitleNextSibling);
      stage.remove();
    };
  }
};
