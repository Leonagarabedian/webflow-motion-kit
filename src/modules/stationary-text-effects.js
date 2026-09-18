import { readBoolean, readNumber, readString, resolveTrigger } from "../core/config.js";
import { captureStyles, createSurface, splitText, svgFilter, metricReader } from "./stationary-text-surface.js";
import { createCounterSurface } from "./stationary-counter-raster.js";

const CHAR_COUNTER_RE = /[ABDOPQR0689abdegopq]/i;

function snapshot(element) { return captureStyles(element); }
function restore(_element, state) { state(); }
let alignmentId = 0;

function alignmentMode(element) {
  return element.getAttribute("data-motion-alignment") ||
    element.getAttribute("data-motion-align") ||
    "auto";
}

function timelineFor(element, services, name, { profile = "reveal" } = {}) {
  // Build the motion first. The planner reads the live timeline on each refresh.
  const tl = services.gsap.timeline({ defaults: { ease: readString(element, "motion-ease", "none") } });
  const mode = alignmentMode(element);
  const trigger = readString(element, "motion-alignment-trigger", null) || resolveTrigger(element);
  const scrubRaw = element.getAttribute("data-motion-scrub");
  const scrub = scrubRaw === "false" ? false : scrubRaw == null ? undefined : readNumber(element, "motion-scrub", 0.65);
  const once = readBoolean(element, "motion-once", false);
  // Attach after tween construction so initial planner measurements include all children.
  tl.attachScroll = () => {
    let config;
    if ((mode === "auto" || mode === "aligned") && services.scrollAlignment) {
      const alignment = services.scrollAlignment.build(element, {
        mode,
        id: readString(element, "motion-alignment-id", `${name}-${++alignmentId}`),
        trigger, profile, motionTimeline: tl,
        ...(scrub !== undefined && { scrub, overrides: { scrub } }),
        ...(mode === "aligned" && {
          anchor: readString(element, "motion-alignment-anchor", "top"),
          viewport: readNumber(element, "motion-alignment-viewport", 0.7),
          span: readString(element, "motion-alignment-span", "70vh")
        }),
        invalidateOnRefresh: true
      });
      if (!alignment.enabled) return;
      config = alignment.scrollTrigger;
    } else {
      config = { trigger: resolveTrigger(element), start: readString(element, "motion-start", "top 85%"), end: readString(element, "motion-end", "bottom 25%"), scrub: scrub ?? 0.65, invalidateOnRefresh: true };
    }
    if (config.scrub === false) config = { ...config, once, ...(!once && { toggleActions: "play none none reverse" }) };
    services.ScrollTrigger.create({ ...config, onRefreshInit: () => tl.onMeasure?.() }, tl);
  };
  return tl;
}

function splitChars(element) { return splitText(element, "chars"); }
function splitWords(element) { return splitText(element, "words"); }
function lockBoxes(targets) {
  targets.forEach(target => {
    const activeWeight = target.style.fontWeight;
    target.style.width = ""; target.style.fontWeight = "";
    const width = target.getBoundingClientRect().width;
    if (width > 0) target.style.width = `${width}px`;
    target.style.fontWeight = activeWeight;
  });
}

function currentColor(element) {
  return getComputedStyle(element).color || "currentColor";
}

function mountCounterEffect(element, services, name) {
  const state = snapshot(element);
  const explicit = [...element.querySelectorAll("[data-motion-counter]")];
  const split = explicit.length ? null : splitChars(element);
  const tl = timelineFor(element, services, name);
  const scale = Math.max(0.1, Math.min(1, readNumber(element, "motion-counter-scale", 1 - readNumber(element, "motion-amount", name === "counter-expansion" ? 0.18 : 0.12))));
  const stagger = readNumber(element, "motion-stagger", 0.025);
  let surfaces = [];
  if (explicit.length) {
    tl.fromTo(explicit, { scaleX: scale, scaleY: scale, skewX: readString(element, "motion-mode", "pressure") === "distort" ? 6 : 0, transformOrigin: "50% 50%" }, { scaleX: 1, scaleY: 1, skewX: 0, stagger });
  } else {
    const states = split.chars.map(char => ({ char, progress: { value: 0 }, surface: null }));
    const rebuild = () => {
      surfaces.forEach(surface => surface.remove());
      surfaces = [];
      states.forEach(item => {
        item.surface = createCounterSurface(item.char, { scale, distort: readString(element, "motion-mode", "pressure") === "distort" ? 0.35 : 0 });
        if (item.surface) { surfaces.push(item.surface); item.surface.render(item.progress.value); }
      });
    };
    rebuild(); tl.onMeasure = rebuild;
    states.forEach((item, index) => tl.to(item.progress, { value: 1, duration: 1, onUpdate: () => item.surface?.render(item.progress.value) }, index * stagger));
    if (!states.length) tl.to({ value: 0 }, { value: 1, duration: 1 });
  }

  tl.attachScroll();
  return () => { tl.scrollTrigger?.kill(); tl.kill(); surfaces.forEach(surface => surface.remove()); split?.revert(); restore(element, state); };
}
function mountInnerLetterSpace(element, services) { return mountCounterEffect(element, services, "inner-letter-space"); }

function mountTypographyGapSpace(element, services) {
  const state = snapshot(element);
  const read = metricReader(element, ["letterSpacing", "wordSpacing", "lineHeight", "fontSize"]);
  let metrics;
  const measure = () => {
    const style = read();
    metrics = { letter: parseFloat(style.letterSpacing) || 0, word: parseFloat(style.wordSpacing) || 0, line: parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2 };
  };
  measure();
  const tl = timelineFor(element, services, "typography-gap-space", { profile: "editorial" });
  tl.onMeasure = measure;
  tl.fromTo(element,
    { letterSpacing: () => `${readNumber(element, "motion-letter-from", metrics.letter + 6)}px`, wordSpacing: () => `${readNumber(element, "motion-word-from", metrics.word + 12)}px`, lineHeight: () => `${metrics.line * readNumber(element, "motion-line-factor", 1.12)}px` },
    { letterSpacing: () => `${metrics.letter}px`, wordSpacing: () => `${metrics.word}px`, lineHeight: () => `${metrics.line}px` }
  );
  tl.attachScroll();
  return () => { tl.scrollTrigger?.kill(); tl.kill(); restore(element, state); };
}

function mountSectionSpace(element, services) {
  const state = snapshot(element);
  const properties = ["paddingInlineStart", "paddingInlineEnd", "paddingTop", "paddingBottom", "columnGap", "rowGap"];
  const read = metricReader(element, properties);
  let metrics;
  const measure = () => { const style = read(); metrics = Object.fromEntries(properties.map(property => [property, parseFloat(style[property]) || 0])); };
  measure();
  const pressure = readNumber(element, "motion-space-pressure", 24);
  const tl = timelineFor(element, services, "section-space", { profile: "handoff" });
  tl.onMeasure = measure;
  const factor = { paddingTop: 0.6, paddingBottom: 0.6, rowGap: 0.65 };
  tl.fromTo(element,
    Object.fromEntries(properties.map(property => [property, () => metrics[property] + pressure * (factor[property] ?? 1)])),
    Object.fromEntries(properties.map(property => [property, () => metrics[property]]))
  );
  tl.attachScroll();
  return () => { tl.scrollTrigger?.kill(); tl.kill(); restore(element, state); };
}

function makeArchitectureOverlay(element, color) {
  const overlay = document.createElement("span");
  overlay.setAttribute("aria-hidden", "true");
  Object.assign(overlay.style, {
    position: "absolute", inset: "0", pointerEvents: "none", zIndex: "2"
  });
  const edges = ["top", "right", "bottom", "left"].map((edge) => {
    const bar = document.createElement("i");
    bar.dataset.motionArchitectureEdge = edge;
    Object.assign(bar.style, {
      position: "absolute", display: "block", background: color, transformOrigin: "center"
    });
    if (edge === "top" || edge === "bottom") {
      bar.style.left = "0"; bar.style.right = "0"; bar.style.height = "1px";
      bar.style[edge] = "0";
    } else {
      bar.style.top = "0"; bar.style.bottom = "0"; bar.style.width = "1px";
      bar.style[edge] = "0";
    }
    overlay.appendChild(bar);
    return bar;
  });
  element.appendChild(overlay);
  return { overlay, edges };
}

function mountArchitectureSpace(element, services) {
  const state = snapshot(element);
  const color = readString(element, "motion-architecture-color", currentColor(element));
  if (getComputedStyle(element).position === "static") element.style.position = "relative";
  const { overlay, edges } = makeArchitectureOverlay(element, color);
  const nodes = [...element.querySelectorAll("[data-motion-space-node]")].filter((node) => !overlay.contains(node));
  const tl = timelineFor(element, services, "architecture-space", { profile: "handoff" });
  tl.fromTo(edges,
    { scaleX: (i) => i % 2 === 0 ? 0 : 1, scaleY: (i) => i % 2 ? 0 : 1, opacity: 0.25 },
    { scaleX: 1, scaleY: 1, opacity: 1, stagger: 0.05 }, 0
  );
  if (nodes.length) {
    tl.fromTo(nodes,
      { clipPath: "inset(8% 8% 8% 8%)" },
      { clipPath: "inset(0% 0% 0% 0%)", stagger: 0.04 }, 0
    );
  }
  tl.attachScroll();
  return () => { tl.scrollTrigger?.kill(); tl.kill(); overlay.remove(); restore(element, state); };
}

function mountStrokeFill(element, services) {
  const state = snapshot(element);
  const surface = createSurface(element);
  const colors = surface.nodes.map(node => currentColor(node));
  const width = readNumber(element, "motion-stroke-width", 1);
  const direction = readString(element, "motion-direction", "fill");
  const tl = timelineFor(element, services, "stroke-fill");
  tl.onMeasure = surface.update;
  surface.nodes.forEach((node, i) => {
    const color = readString(element, "motion-fill-color", colors[i]);
    const stroke = readString(element, "motion-stroke-color", color);
    const outlined = { color: "rgba(0,0,0,0)", WebkitTextStroke: `${width}px ${stroke}` };
    const filled = { color, WebkitTextStroke: `0px ${stroke}` };
    tl.fromTo(node, direction === "outline" ? filled : outlined, direction === "outline" ? outlined : filled, 0);
  });
  tl.attachScroll();
  return () => { tl.scrollTrigger?.kill(); tl.kill(); surface.remove(); restore(element, state); };
}

function mountWeightPressure(element, services) {
  const state = snapshot(element);
  const splitMode = readString(element, "motion-split", "chars");
  const split = splitMode === "none" ? null : splitChars(element, services);
  const targets = split ? split.chars : [element];
  if (split) lockBoxes(targets);
  const computed = parseFloat(getComputedStyle(element).fontWeight) || 400;
  const from = readNumber(element, "motion-weight-from", Math.max(100, computed - 180));
  const to = readNumber(element, "motion-weight-to", computed);
  const stagger = readNumber(element, "motion-stagger", 0.018);
  const tl = timelineFor(element, services, "weight-pressure", { profile: "editorial" });
  if (split) tl.onMeasure = () => lockBoxes(targets);
  tl.fromTo(targets, { fontWeight: from }, { fontWeight: to, stagger });
  tl.attachScroll();
  return () => { tl.scrollTrigger?.kill(); tl.kill(); split?.revert(); restore(element, state); };
}

function mountGlyphMaskReveal(element, services) {
  const state = snapshot(element);
  const base = createSurface(element, { hide: false });
  const reveal = createSurface(element);
  const from = element.getAttribute("data-motion-from-color");
  const to = readString(element, "motion-to-color", readString(element, "motion-fill-color", currentColor(base.layer)));
  if (from) base.nodes.forEach(node => { node.style.color = from; });
  const texture = readString(element, "motion-texture", "");
  reveal.nodes.forEach(node => {
    node.style.color = to;
    if (texture) Object.assign(node.style, { color: "transparent", backgroundImage: texture, backgroundClip: "text", WebkitBackgroundClip: "text", backgroundSize: "cover" });
  });
  const mask = readString(element, "motion-mask", "horizontal");
  const origin = readString(element, "motion-mask-origin", "50% 50%");
  const tl = timelineFor(element, services, "glyph-mask-reveal");
  tl.onMeasure = () => { base.update(); reveal.update(); };
  if (mask === "radial") {
    tl.fromTo(reveal.layer, { clipPath: `circle(0% at ${origin})` }, { clipPath: `circle(150% at ${origin})` });
  } else {
    if (mask === "custom") {
      reveal.layer.style.maskImage = readString(element, "motion-custom-mask", "var(--motion-custom-mask)");
      reveal.layer.style.maskSize = "100% 100%";
      reveal.layer.style.maskRepeat = "no-repeat";
    }
    tl.fromTo(reveal.layer, { clipPath: mask === "vertical" ? "inset(100% 0% 0% 0%)" : "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)" });
  }
  tl.attachScroll();
  return () => { tl.scrollTrigger?.kill(); tl.kill(); reveal.remove(); base.remove(); restore(element, state); };
}

function mountCounterExpansion(element, services) { return mountCounterEffect(element, services, "counter-expansion"); }

function makeOcclusionBlocks(element, count, color, axis) {
  const holder = document.createElement("span");
  holder.setAttribute("aria-hidden", "true");
  Object.assign(holder.style, { position: "absolute", inset: "0", pointerEvents: "none", zIndex: "3", overflow: "hidden" });
  const blocks = [];
  for (let i = 0; i < count; i += 1) {
    const block = document.createElement("i");
    Object.assign(block.style, { position: "absolute", display: "block", background: color });
    if (axis === "vertical") {
      block.style.top = "0"; block.style.bottom = "0";
      block.style.left = `${(i / count) * 100}%`; block.style.width = `${100 / count + 0.25}%`;
      block.style.transformOrigin = i % 2 ? "bottom" : "top";
    } else {
      block.style.left = "0"; block.style.right = "0";
      block.style.top = `${(i / count) * 100}%`; block.style.height = `${100 / count + 0.25}%`;
      block.style.transformOrigin = i % 2 ? "right" : "left";
    }
    holder.appendChild(block); blocks.push(block);
  }
  element.appendChild(holder);
  return { holder, blocks };
}

function mountOcclusionBlocks(element, services) {
  const state = snapshot(element);
  const count = Math.min(32, Math.max(2, Math.round(readNumber(element, "motion-blocks", 5))));
  const axis = readString(element, "motion-axis", "horizontal");
  const color = element.getAttribute("data-motion-occlusion-color");
  const tl = timelineFor(element, services, "occlusion-blocks");
  if (color) {
    if (getComputedStyle(element).position === "static") element.style.position = "relative";
    const { holder, blocks } = makeOcclusionBlocks(element, count, color, axis);
    tl.fromTo(blocks, { [axis === "vertical" ? "scaleY" : "scaleX"]: 1 }, { [axis === "vertical" ? "scaleY" : "scaleX"]: 0, stagger: 0.05 });
    tl.attachScroll();
    return () => { tl.scrollTrigger?.kill(); tl.kill(); holder.remove(); restore(element, state); };
  }
  // Real clipping reveals the surface behind the letters, including video/gradients.
  const surfaces = [];
  for (let i = 0; i < count; i++) {
    const surface = createSurface(element, { hide: i === count - 1 });
    const start = i / count * 100, end = 100 - (i + 1) / count * 100;
    const full = axis === "vertical" ? `inset(0% ${end}% 0% ${start}%)` : `inset(${start}% 0% ${end}% 0%)`;
    const hidden = axis === "vertical" ? `inset(100% ${end}% 0% ${start}%)` : `inset(${start}% 100% ${end}% 0%)`;
    surfaces.push(surface);
    tl.fromTo(surface.layer, { clipPath: hidden }, { clipPath: full }, i * 0.05);
  }
  tl.onMeasure = () => surfaces.forEach(surface => surface.update());
  tl.attachScroll();
  return () => { tl.scrollTrigger?.kill(); tl.kill(); surfaces.forEach(surface => surface.remove()); restore(element, state); };
}

function mountEmphasisTransfer(element, services) {
  const state = snapshot(element);
  const split = splitWords(element, services);
  const activeColor = readString(element, "motion-active-color", currentColor(element));
  const inactiveColor = readString(element, "motion-inactive-color", activeColor);
  const inactiveOpacity = readNumber(element, "motion-inactive-opacity", 0.34);
  const activeWeight = readNumber(element, "motion-active-weight", parseFloat(getComputedStyle(element).fontWeight) || 500);
  lockBoxes(split.words);
  const weights = split.words.map(word => getComputedStyle(word).fontWeight);
  const mode = readString(element, "motion-mode", "contrast");
  const tl = timelineFor(element, services, "emphasis-transfer", { profile: "editorial" });
  tl.onMeasure = () => lockBoxes(split.words);
  services.gsap.set(split.words, { color: inactiveColor, opacity: inactiveOpacity });
  split.words.forEach((word, index) => {
    const at = index / Math.max(1, split.words.length - 1);
    const vars = mode === "weight"
      ? { opacity: 1, color: activeColor, fontWeight: activeWeight }
      : { opacity: 1, color: activeColor, filter: "contrast(1.15)" };
    tl.to(word, { ...vars, duration: 0.22 }, at);
    if (index < split.words.length - 1) {
      tl.to(word, { opacity: inactiveOpacity, color: inactiveColor, filter: "none", ...(mode === "weight" && { fontWeight: weights[index] }), duration: 0.22 }, at + 0.28);
    }
  });
  tl.attachScroll();
  return () => { tl.scrollTrigger?.kill(); tl.kill(); split.revert(); restore(element, state); };
}

function mountSliceFragmentReveal(element, services) {
  const state = snapshot(element);
  const count = Math.min(32, Math.max(2, Math.round(readNumber(element, "motion-slices", 6))));
  const axis = readString(element, "motion-axis", "horizontal");
  const fragments = [];
  for (let i = 0; i < count; i++) {
    const surface = createSurface(element, { hide: i === count - 1 });
    const start = i / count * 100, end = 100 - (i + 1) / count * 100;
    surface.layer.style.clipPath = axis === "vertical" ? `inset(0% ${end}% 0% ${start}%)` : `inset(${start}% 0% ${end}% 0%)`;
    fragments.push(surface);
  }
  const tl = timelineFor(element, services, "slice-fragment-reveal");
  tl.onMeasure = () => fragments.forEach(surface => surface.update());
  tl.fromTo(fragments.map(surface => surface.layer), { opacity: 0 }, { opacity: 1, stagger: readNumber(element, "motion-stagger", 0.025) });
  tl.attachScroll();
  return () => { tl.scrollTrigger?.kill(); tl.kill(); fragments.forEach(surface => surface.remove()); restore(element, state); };
}

function mountNegativeSpaceCutout(element, services) {
  const state = snapshot(element);
  const surface = createSurface(element);
  const colors = surface.nodes.map(node => currentColor(node));
  // Transparent paint exposes the actual background. No solid-color approximation.
  const cutout = readString(element, "motion-cutout-color", "rgba(0,0,0,0)");
  const width = readNumber(element, "motion-stroke-width", 0.75);
  const tl = timelineFor(element, services, "negative-space-cutout");
  tl.onMeasure = surface.update;
  surface.nodes.forEach((node, i) => {
    const stroke = readString(element, "motion-stroke-color", colors[i]);
    tl.fromTo(node, { color: colors[i], WebkitTextStroke: `0px ${stroke}` }, { color: cutout, WebkitTextStroke: `${width}px ${stroke}` }, 0);
  });
  tl.attachScroll();
  return () => { tl.scrollTrigger?.kill(); tl.kill(); surface.remove(); restore(element, state); };
}

let plushTextureUrl;
function createPlushTextureUrl() {
  if (plushTextureUrl) return plushTextureUrl;
  let seed = 92821;
  const rand = () => ((seed = (seed * 48271) % 2147483647) / 2147483647);
  const fibers = [];
  const makeFiber = (stroke, opacity, count, minLen, maxLen, minWidth, maxWidth) => {
    for (let i = 0; i < count; i++) {
      const x = rand() * 256;
      const y = rand() * 256;
      const angle = (rand() * Math.PI * 2);
      const len = minLen + rand() * (maxLen - minLen);
      const width = minWidth + rand() * (maxWidth - minWidth);
      const bend = (rand() - 0.5) * 4;
      const dx = Math.cos(angle) * len;
      const dy = Math.sin(angle) * len;
      const cx = x + dx * 0.5 - Math.sin(angle) * bend;
      const cy = y + dy * 0.5 + Math.cos(angle) * bend;
      fibers.push(`<path d="M${x.toFixed(1)} ${y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${(x + dx).toFixed(1)} ${(y + dy).toFixed(1)}" fill="none" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="${width.toFixed(2)}" stroke-linecap="round"/>`);
    }
  };
  makeFiber("#7f7f7f", 0.26, 260, 4, 9, 0.65, 1.25);
  makeFiber("#f7f7f7", 0.34, 240, 3, 7, 0.55, 1.0);
  makeFiber("#a9a9a9", 0.2, 180, 6, 12, 0.45, 0.9);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" fill="#d8d8d8"/><g>${fibers.join("")}</g></svg>`;
  plushTextureUrl = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  return plushTextureUrl;
}

function applyPlushTexture(surface) {
  const texture = createPlushTextureUrl();
  surface.nodes.forEach((node) => {
    Object.assign(node.style, {
      color: "transparent",
      WebkitTextFillColor: "transparent",
      backgroundImage: texture,
      backgroundRepeat: "repeat",
      backgroundSize: "128px 128px",
      backgroundClip: "text",
      WebkitBackgroundClip: "text"
    });
  });
}

function materialSurface(element, name, hide) {
  const surface = createSurface(element, { hide });
  const color = currentColor(surface.layer);
  const stroke = readString(element, "motion-stroke-color", color);
  const grain = Math.max(0, Math.min(1, readNumber(element, "motion-grain", 0.35)));
  let filter;

  if (name === "outline") {
    surface.nodes.forEach(node => Object.assign(node.style, { color: "transparent", WebkitTextStroke: `1px ${stroke}` }));
  } else if (name === "grain" || name === "matte") {
    filter = svgFilter(element, `<feTurbulence type="fractalNoise" baseFrequency="${name === 'grain' ? 0.8 : 0.35}" numOctaves="3" seed="7" result="noise"/><feColorMatrix in="noise" type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope="${grain}" intercept="${1-grain}"/><feFuncG type="linear" slope="${grain}" intercept="${1-grain}"/><feFuncB type="linear" slope="${grain}" intercept="${1-grain}"/></feComponentTransfer><feComposite in2="SourceAlpha" operator="in" result="texture"/><feBlend in="SourceGraphic" in2="texture" mode="multiply"/>`);
  } else if (name === "glass") {
    filter = svgFilter(element, '<feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="2" seed="7" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G"/>');
    surface.layer.style.opacity = "0.72";
    surface.layer.style.backdropFilter = "blur(3px)";
  } else if (name === "erosion") {
    filter = svgFilter(element, '<feTurbulence type="fractalNoise" baseFrequency="0.12" numOctaves="3" seed="7" result="noise"/><feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0"/><feComponentTransfer><feFuncA type="discrete" tableValues="0 0 1 1"/></feComponentTransfer><feComposite in="SourceGraphic" operator="in"/>');
  } else if (name === "furry") {
    filter = svgFilter(element, '<feTurbulence type="fractalNoise" baseFrequency="0.035 0.5" numOctaves="2" seed="11" result="fiberNoise"/><feColorMatrix in="fiberNoise" type="saturate" values="0" result="fiberMono"/><feGaussianBlur in="fiberMono" stdDeviation="0.18 1.1" result="fiberSoft"/><feDisplacementMap in="fiberSoft" in2="fiberMono" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="fiberShape"/><feComponentTransfer in="fiberShape" result="fiberTone"><feFuncR type="linear" slope="0.55" intercept="0.22"/><feFuncG type="linear" slope="0.55" intercept="0.22"/><feFuncB type="linear" slope="0.55" intercept="0.22"/></feComponentTransfer><feComposite in="fiberTone" in2="SourceAlpha" operator="in" result="clippedFibers"/><feBlend in="SourceGraphic" in2="clippedFibers" mode="soft-light"/>');
    surface.layer.style.filter = filter.url;
  } else if (name === "plush-bloom") {
    applyPlushTexture(surface);
    surface.layer.style.clipPath = "circle(0% at 50% 50%)";
  } else if (name === "rubber") {
    filter = svgFilter(element, '<feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="softAlpha"/><feSpecularLighting in="softAlpha" surfaceScale="4" specularConstant="0.55" specularExponent="24" lighting-color="#ffffff" result="spec"><feDistantLight azimuth="225" elevation="42"/></feSpecularLighting><feComposite in="spec" in2="SourceAlpha" operator="in" result="specClip"/><feBlend in="SourceGraphic" in2="specClip" mode="screen"/>');
    surface.layer.style.filter = filter.url;
  } else if (name === "marble") {
    filter = svgFilter(element, '<feTurbulence type="fractalNoise" baseFrequency="0.012 0.055" numOctaves="4" seed="19" result="veins"/><feColorMatrix in="veins" type="saturate" values="0" result="veinMono"/><feColorMatrix in="veinMono" type="matrix" values="1.7 0 0 0 -0.42  0 1.7 0 0 -0.42  0 0 1.7 0 -0.42  0 0 0 1 0" result="veinContrast"/><feDisplacementMap in="veinContrast" in2="veinMono" scale="5" xChannelSelector="R" yChannelSelector="G" result="veinFlow"/><feComposite in="veinFlow" in2="SourceAlpha" operator="in" result="veinClip"/><feBlend in="SourceGraphic" in2="veinClip" mode="multiply"/>');
    surface.layer.style.filter = filter.url;
  } else if (name === "rock") {
    filter = svgFilter(element, '<feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="5" seed="23" result="stoneNoise"/><feColorMatrix in="stoneNoise" type="saturate" values="0" result="stoneMono"/><feDiffuseLighting in="stoneMono" surfaceScale="3.2" diffuseConstant="1.15" lighting-color="#ffffff" result="stoneLight"><feDistantLight azimuth="210" elevation="38"/></feDiffuseLighting><feComposite in="stoneLight" in2="SourceAlpha" operator="in" result="litStone"/><feBlend in="SourceGraphic" in2="litStone" mode="multiply"/>');
    surface.layer.style.filter = filter.url;
  } else if (name === "crumpled-paper") {
    filter = svgFilter(element, '<feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="4" seed="31" result="foldNoise"/><feColorMatrix in="foldNoise" type="saturate" values="0" result="foldMono"/><feGaussianBlur in="foldMono" stdDeviation="0.7" result="foldSoft"/><feDiffuseLighting in="foldSoft" surfaceScale="5.5" diffuseConstant="0.72" lighting-color="#ffffff" result="foldLight"><feDistantLight azimuth="235" elevation="38"/></feDiffuseLighting><feComposite in="foldLight" in2="SourceAlpha" operator="in" result="foldClip"/><feBlend in="SourceGraphic" in2="foldClip" mode="soft-light" result="paperFolded"/><feTurbulence type="fractalNoise" baseFrequency="0.22 0.35" numOctaves="2" seed="37" result="fiberNoise"/><feColorMatrix in="fiberNoise" type="saturate" values="0" result="fiberMono"/><feComponentTransfer in="fiberMono" result="fiberLow"><feFuncR type="linear" slope="0.18" intercept="0.42"/><feFuncG type="linear" slope="0.18" intercept="0.42"/><feFuncB type="linear" slope="0.18" intercept="0.42"/></feComponentTransfer><feComposite in="fiberLow" in2="SourceAlpha" operator="in" result="fiberClip"/><feBlend in="paperFolded" in2="fiberClip" mode="soft-light"/>');
    surface.layer.style.filter = filter.url;
  }

  if (filter && !surface.layer.style.filter) surface.layer.style.filter = filter.url;
  return { ...surface, filter, remove() { surface.remove(); filter?.remove(); } };
}

function mountMaterialShift(element, services) {
  const state = snapshot(element);
  const fromName = readString(element, "motion-from", "outline");
  const toName = readString(element, "motion-to", "fill");
  const from = materialSurface(element, fromName, false);
  const to = materialSurface(element, toName, true);
  const fromOpacity = parseFloat(from.layer.style.opacity) || 1;
  const toOpacity = parseFloat(to.layer.style.opacity) || 1;
  const tl = timelineFor(element, services, "material-shift");
  tl.onMeasure = () => { from.update(); to.update(); };
  tl.fromTo(from.layer, { opacity: fromOpacity }, { opacity: 0 }, 0);
  tl.fromTo(to.layer, { opacity: 0 }, { opacity: toOpacity }, 0);

  // Plush bloom is a center-out material reveal, not a generic crossfade.
  if (toName === "plush-bloom") {
    tl.fromTo(to.layer,
      { clipPath: "circle(0% at 50% 50%)" },
      { clipPath: "circle(150% at 50% 50%)", ease: "power1.inOut" },
      0
    );
  }
  if (fromName === "plush-bloom") {
    tl.fromTo(from.layer,
      { clipPath: "circle(150% at 50% 50%)" },
      { clipPath: "circle(0% at 50% 50%)", ease: "power1.inOut" },
      0
    );
  }
  // Animate the noise threshold itself when entering/leaving erosion.
  for (const surface of [from, to]) {
    const threshold = surface.filter?.svg.querySelector('feFuncA');
    if (!threshold) continue;
    threshold.setAttribute('type', 'linear');
    threshold.setAttribute('slope', '12');
    const entering = surface === to;
    tl.fromTo(threshold, { attr: { intercept: entering ? 1 : -6 } }, { attr: { intercept: entering ? -6 : 1 } }, 0);
  }
  tl.attachScroll();
  return () => { tl.scrollTrigger?.kill(); tl.kill(); from.remove(); to.remove(); restore(element, state); };
}

function selectedGlyph(char, index, mode, custom, every) {
  const value = char.textContent || "";
  if (custom) return custom.includes(value);
  if (mode === "vowels") return /[aeiou]/i.test(value);
  if (mode === "counters") return CHAR_COUNTER_RE.test(value);
  if (mode === "odd") return index % 2 === 1;
  if (mode === "even") return index % 2 === 0;
  return index % Math.max(1, every) === 0;
}

function mountSelectiveGlyphActivation(element, services) {
  const state = snapshot(element);
  const split = splitChars(element, services);
  const mode = readString(element, "motion-select", "every");
  const custom = readString(element, "motion-glyphs", "");
  const every = Math.max(1, Math.round(readNumber(element, "motion-every", 2)));
  const activeColor = readString(element, "motion-active-color", currentColor(element));
  const inactiveOpacity = readNumber(element, "motion-inactive-opacity", 0.42);
  const activeWeight = readNumber(element, "motion-active-weight", parseFloat(getComputedStyle(element).fontWeight) || 500);
  lockBoxes(split.chars);
  const active = split.chars.filter((char, index) => selectedGlyph(char, index, mode, custom, every));
  const inactive = split.chars.filter((char) => !active.includes(char));
  const tl = timelineFor(element, services, "selective-glyph-activation", { profile: "editorial" });
  tl.onMeasure = () => lockBoxes(split.chars);
  services.gsap.set(inactive, { opacity: inactiveOpacity });
  tl.fromTo(active,
    { opacity: inactiveOpacity, color: currentColor(element), fontWeight: 300 },
    { opacity: 1, color: activeColor, fontWeight: activeWeight, stagger: readNumber(element, "motion-stagger", 0.035) }
  );
  tl.to(inactive, { opacity: 1, duration: 0.28 }, ">-0.12");
  tl.attachScroll();
  return () => { tl.scrollTrigger?.kill(); tl.kill(); split.revert(); restore(element, state); };
}

const mounts = {
  "inner-letter-space": mountInnerLetterSpace,
  "typography-gap-space": mountTypographyGapSpace,
  "section-space": mountSectionSpace,
  "architecture-space": mountArchitectureSpace,
  "stroke-fill": mountStrokeFill,
  "weight-pressure": mountWeightPressure,
  "glyph-mask-reveal": mountGlyphMaskReveal,
  "counter-expansion": mountCounterExpansion,
  "occlusion-blocks": mountOcclusionBlocks,
  "emphasis-transfer": mountEmphasisTransfer,
  "slice-fragment-reveal": mountSliceFragmentReveal,
  "negative-space-cutout": mountNegativeSpaceCutout,
  "material-shift": mountMaterialShift,
  "selective-glyph-activation": mountSelectiveGlyphActivation
};

export function createStationaryTextModule(name) {
  const mountEffect = mounts[name];
  if (!mountEffect) throw new Error(`Unknown stationary text effect: ${name}`);
  return {
    name,
    category: "typography",
    selector: `[data-motion~="${name}"]`,
    mount(element, services) {
      if (services.reducedMotion()) return;
      const restoreStyles = captureStyles(element);
      const structure = [element, ...element.querySelectorAll('*')].map(node => [node, [...node.childNodes]]);
      const aria = element.getAttribute('aria-label');
      let context;
      try {
        let cleanup;
        context = services.gsap.context(() => {}, element);
        context.add(() => { cleanup = mountEffect(element, services); });
        return () => { context.revert(); cleanup?.(); restoreStyles(); };
      } catch (error) {
        context?.revert();
        [...structure].reverse().forEach(([node, children]) => node.replaceChildren(...children));
        if (aria == null) element.removeAttribute('aria-label'); else element.setAttribute('aria-label', aria);
        restoreStyles();
        throw error;
      }
    }
  };
}
