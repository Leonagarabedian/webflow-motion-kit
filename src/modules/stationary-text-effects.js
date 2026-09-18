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


function plushOptions(element) {
  return {
    base: readString(element, "motion-plush-base", "#e98aae"),
    highlight: readString(element, "motion-plush-highlight", "#f6b3c9"),
    shadow: readString(element, "motion-plush-shadow", "#c96b92"),
    crease: readString(element, "motion-plush-crease", "#8f4e70"),
    density: Math.max(0.65, Math.min(1.8, readNumber(element, "motion-plush-density", 1.15))),
    fuzz: Math.max(0.6, Math.min(1.8, readNumber(element, "motion-plush-fuzz", 1.05))),
    puff: Math.max(0.6, Math.min(1.8, readNumber(element, "motion-plush-puff", 1.08)))
  };
}

function seededRandom(seedValue) {
  let seed = Math.max(1, Math.abs(seedValue | 0)) % 2147483647;
  return () => ((seed = (seed * 48271) % 2147483647) / 2147483647);
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function splitPlushGlyphs(layer) {
  const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT);
  const texts = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.parentElement.closest('[data-motion-filter],script,style')) texts.push(node);
  }
  const glyphs = [];
  for (const text of texts) {
    const fragment = document.createDocumentFragment();
    const parts = typeof Intl.Segmenter === "function"
      ? [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text.data)].map(item => item.segment)
      : Array.from(text.data);
    for (const value of parts) {
      if (/^\s+$/.test(value)) {
        fragment.append(document.createTextNode(value));
        continue;
      }
      const span = document.createElement("span");
      span.textContent = value;
      span.setAttribute("data-plush-glyph", "");
      span.style.display = "inline";
      span.style.position = "relative";
      fragment.append(span);
      glyphs.push(span);
    }
    text.replaceWith(fragment);
  }
  return glyphs;
}

function glyphMask(glyph) {
  const rect = glyph.getBoundingClientRect();
  const style = getComputedStyle(glyph);
  const scale = Math.max(2, Math.min(3, window.devicePixelRatio || 2));
  const width = Math.max(24, Math.ceil(rect.width * scale));
  const height = Math.max(24, Math.ceil(rect.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const fontSize = parseFloat(style.fontSize) * scale;
  const font = `${style.fontStyle || "normal"} ${style.fontWeight || 400} ${fontSize}px ${style.fontFamily}`;
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  const value = glyph.textContent || "";
  ctx.fillText(value, width / 2, height / 2 + fontSize * 0.015);
  const image = ctx.getImageData(0, 0, width, height);
  const alpha = new Uint8Array(width * height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = image.data[i * 4 + 3];
  return { width, height, scale, alpha, style, value };
}

function contourData(mask) {
  const { width, height, alpha } = mask;
  const edge = [];
  const inside = [];
  const stride = 2;
  const isInside = (x, y) => x >= 0 && y >= 0 && x < width && y < height && alpha[y * width + x] > 48;
  for (let y = 1; y < height - 1; y += stride) {
    for (let x = 1; x < width - 1; x += stride) {
      if (!isInside(x, y)) continue;
      inside.push([x, y]);
      if (!isInside(x - 2, y) || !isInside(x + 2, y) || !isInside(x, y - 2) || !isInside(x, y + 2)) edge.push([x, y]);
    }
  }
  return { edge, inside };
}

function nearestContourDirection(x, y, edge) {
  if (!edge.length) return Math.PI / 2;
  let nearest = edge[0];
  let best = Infinity;
  const step = Math.max(1, Math.floor(edge.length / 260));
  for (let i = 0; i < edge.length; i += step) {
    const p = edge[i];
    const dx = p[0] - x;
    const dy = p[1] - y;
    const d = dx * dx + dy * dy;
    if (d < best) { best = d; nearest = p; }
  }
  const normal = Math.atan2(nearest[1] - y, nearest[0] - x);
  return normal + Math.PI / 2;
}

function renderPlushGlyph(glyph, index, options) {
  const mask = glyphMask(glyph);
  if (!mask) return null;
  const { width, height, scale, alpha, value } = mask;
  const { edge, inside } = contourData(mask);
  if (!inside.length) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const rand = seededRandom(hashString(`${value}:${index}:${width}:${height}`));

  // Padded body: bright, softly convex face with darker lower/perimeter tone.
  const body = ctx.createRadialGradient(width * 0.42, height * 0.30, Math.min(width, height) * 0.05, width * 0.52, height * 0.55, Math.max(width, height) * 0.78);
  body.addColorStop(0, options.highlight);
  body.addColorStop(0.46, options.base);
  body.addColorStop(0.78, options.shadow);
  body.addColorStop(1, options.crease);
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, width, height);

  // Dense teddy-pile tufts. Each tuft follows the tangent of its nearest glyph contour.
  const tuftCount = Math.max(180, Math.round(inside.length * 0.55 * options.density));
  const layers = [
    { color: options.crease, alpha: 0.20, length: [3.8, 7.0], width: [0.8, 1.45] },
    { color: options.shadow, alpha: 0.38, length: [3.2, 6.2], width: [0.72, 1.25] },
    { color: options.base, alpha: 0.48, length: [2.8, 5.5], width: [0.62, 1.08] },
    { color: options.highlight, alpha: 0.54, length: [2.2, 4.6], width: [0.48, 0.90] }
  ];

  for (let i = 0; i < tuftCount; i++) {
    const p = inside[Math.floor(rand() * inside.length)];
    const localAlpha = alpha[p[1] * width + p[0]];
    if (localAlpha < 90) continue;
    const layer = layers[Math.min(layers.length - 1, Math.floor(rand() * layers.length))];
    const tangent = nearestContourDirection(p[0], p[1], edge);
    const angle = tangent + (rand() - 0.5) * 0.52;
    const len = (layer.length[0] + rand() * (layer.length[1] - layer.length[0])) * scale * 0.58;
    const lw = (layer.width[0] + rand() * (layer.width[1] - layer.width[0])) * scale * 0.52;
    const bend = (rand() - 0.5) * len * 0.42;
    const x2 = p[0] + Math.cos(angle) * len;
    const y2 = p[1] + Math.sin(angle) * len;
    const cx = p[0] + (x2 - p[0]) * 0.5 - Math.sin(angle) * bend;
    const cy = p[1] + (y2 - p[1]) * 0.5 + Math.cos(angle) * bend;

    ctx.globalAlpha = layer.alpha;
    ctx.strokeStyle = layer.color;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Small clustered pile breaks up individual strands into a dense plush surface.
  const clusterCount = Math.max(90, Math.round(inside.length * 0.12 * options.density));
  for (let i = 0; i < clusterCount; i++) {
    const p = inside[Math.floor(rand() * inside.length)];
    const tangent = nearestContourDirection(p[0], p[1], edge);
    const radius = (0.65 + rand() * 1.4) * scale * 0.45;
    ctx.globalAlpha = 0.08 + rand() * 0.12;
    ctx.fillStyle = rand() > 0.56 ? options.highlight : options.shadow;
    ctx.beginPath();
    ctx.ellipse(
      p[0], p[1],
      radius * 1.65, radius,
      tangent,
      0, Math.PI * 2
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Clip the generated material to the exact glyph raster.
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext("2d");
  if (!maskCtx) return null;
  const image = maskCtx.createImageData(width, height);
  for (let i = 0; i < alpha.length; i++) {
    const a = alpha[i];
    image.data[i * 4] = 255;
    image.data[i * 4 + 1] = 255;
    image.data[i * 4 + 2] = 255;
    image.data[i * 4 + 3] = a;
  }
  maskCtx.putImageData(image, 0, 0);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(maskCanvas, 0, 0);
  ctx.globalCompositeOperation = "source-over";

  return canvas.toDataURL("image/png");
}

function applyPlushTexture(surface, element) {
  const options = plushOptions(element);
  const glyphs = splitPlushGlyphs(surface.layer);
  const render = () => {
    glyphs.forEach((glyph, index) => {
      const texture = renderPlushGlyph(glyph, index, options);
      if (!texture) return;
      Object.assign(glyph.style, {
        color: "transparent",
        WebkitTextFillColor: "transparent",
        backgroundImage: `url("${texture}")`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 100%",
        backgroundPosition: "center",
        backgroundClip: "text",
        WebkitBackgroundClip: "text"
      });
    });
  };
  render();

  const edgeFilter = svgFilter(element, `<feMorphology in="SourceAlpha" operator="dilate" radius="${1.05 * options.fuzz}" result="dilated"/><feTurbulence type="fractalNoise" baseFrequency="0.055 0.24" numOctaves="2" seed="71" result="edgeNoise"/><feDisplacementMap in="dilated" in2="edgeNoise" scale="${1.7 * options.fuzz}" xChannelSelector="R" yChannelSelector="G" result="fuzzyAlpha"/><feGaussianBlur in="fuzzyAlpha" stdDeviation="${0.16 * options.fuzz}" result="softFuzz"/><feFlood flood-color="${options.base}" result="fuzzColor"/><feComposite in="fuzzColor" in2="softFuzz" operator="in" result="fuzz"/><feMerge><feMergeNode in="fuzz"/><feMergeNode in="SourceGraphic"/></feMerge>`);
  surface.layer.style.filter = edgeFilter.url;
  return { filter: edgeFilter, update: render };
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
    const plush = applyPlushTexture(surface, element);
    filter = plush.filter;
    surface.plushUpdate = plush.update;
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
  const baseUpdate = surface.update;
  return {
    ...surface,
    filter,
    update() {
      baseUpdate();
      surface.plushUpdate?.();
    },
    remove() { surface.remove(); filter?.remove(); }
  };
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
