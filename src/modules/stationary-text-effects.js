import { readBoolean, readNumber, readString, resolveTrigger } from "../core/config.js";

const CHAR_COUNTER_RE = /[ABDOPQR0689abdegopq]/i;

function snapshot(element) {
  return {
    style: element.getAttribute("style"),
    html: element.innerHTML
  };
}

function restore(element, state) {
  if (state.style == null) element.removeAttribute("style");
  else element.setAttribute("style", state.style);
  if (element.innerHTML !== state.html) element.innerHTML = state.html;
}

function alignmentMode(element) {
  return element.getAttribute("data-motion-alignment") ||
    element.getAttribute("data-motion-align") ||
    "auto";
}

function buildTrigger(element, services, name, { scrub = true, profile = "reveal" } = {}) {
  const trigger = resolveTrigger(element);
  const mode = alignmentMode(element);
  const start = readString(element, "motion-start", "top 85%");
  const end = readString(element, "motion-end", "bottom 25%");
  const once = readBoolean(element, "motion-once", !scrub);
  const scrubValue = readNumber(element, "motion-scrub", scrub ? 0.65 : 0);

  if (mode === "auto" && services.scrollAlignment) {
    const aligned = services.scrollAlignment.build(element, {
      mode: "auto",
      id: readString(element, "motion-alignment-id", name),
      trigger,
      profile,
      stages: [{ name, start: 0, end: 1, duration: 1 }],
      scrub: scrub ? scrubValue : false,
      invalidateOnRefresh: true
    }).scrollTrigger;
    return {
      ...aligned,
      scrub: scrub ? scrubValue : false,
      once: scrub ? false : once,
      invalidateOnRefresh: true,
      ...(!scrub && !once ? { toggleActions: "play none none reverse" } : {})
    };
  }

  return {
    trigger,
    start,
    end,
    scrub: scrub ? scrubValue : false,
    once: scrub ? false : once,
    invalidateOnRefresh: true,
    ...(!scrub && !once ? { toggleActions: "play none none reverse" } : {})
  };
}

function timelineFor(element, services, name, options = {}) {
  return services.gsap.timeline({
    defaults: { ease: readString(element, "motion-ease", "power2.out") },
    scrollTrigger: buildTrigger(element, services, name, options)
  });
}

function splitChars(element, services) {
  return services.SplitText.create(element, { type: "chars", aria: "auto" });
}

function splitWords(element, services) {
  return services.SplitText.create(element, { type: "words", aria: "auto" });
}

function currentColor(element) {
  return getComputedStyle(element).color || "currentColor";
}

function parentBackground(element) {
  let node = element.parentElement;
  while (node) {
    const color = getComputedStyle(node).backgroundColor;
    if (color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent") return color;
    node = node.parentElement;
  }
  return "transparent";
}

function mountInnerLetterSpace(element, services) {
  const state = snapshot(element);
  const split = splitChars(element, services);
  const mode = readString(element, "motion-mode", "pressure");
  const amount = readNumber(element, "motion-amount", 0.12);
  const stagger = readNumber(element, "motion-stagger", 0.025);
  const tl = timelineFor(element, services, "inner-letter-space");
  element.style.transformOrigin = "50% 50%";

  const targets = [...element.querySelectorAll("[data-motion-counter]")];
  const active = targets.length ? targets : split.chars.filter((char) => CHAR_COUNTER_RE.test(char.textContent || ""));
  const fallback = active.length ? active : split.chars;

  if (mode === "distort") {
    tl.fromTo(fallback,
      { scaleX: 1 - amount, scaleY: 1 + amount * 0.7, skewX: amount * 18, transformOrigin: "50% 55%" },
      { scaleX: 1, scaleY: 1, skewX: 0, stagger }
    );
  } else {
    tl.fromTo(fallback,
      { scaleX: 1 - amount, scaleY: 1 + amount * 0.45, transformOrigin: "50% 55%" },
      { scaleX: 1, scaleY: 1, stagger }
    );
  }

  return () => { tl.kill(); split.revert(); restore(element, state); };
}

function mountTypographyGapSpace(element, services) {
  const state = snapshot(element);
  const style = getComputedStyle(element);
  const toLetter = style.letterSpacing === "normal" ? 0 : parseFloat(style.letterSpacing) || 0;
  const toWord = style.wordSpacing === "normal" ? 0 : parseFloat(style.wordSpacing) || 0;
  const toLine = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
  const fromLetter = readNumber(element, "motion-letter-from", toLetter + 6);
  const fromWord = readNumber(element, "motion-word-from", toWord + 12);
  const lineFactor = readNumber(element, "motion-line-factor", 1.12);
  const tl = timelineFor(element, services, "typography-gap-space");
  tl.fromTo(element,
    { letterSpacing: `${fromLetter}px`, wordSpacing: `${fromWord}px`, lineHeight: `${toLine * lineFactor}px` },
    { letterSpacing: `${toLetter}px`, wordSpacing: `${toWord}px`, lineHeight: `${toLine}px` }
  );
  return () => { tl.kill(); restore(element, state); };
}

function mountSectionSpace(element, services) {
  const state = snapshot(element);
  const style = getComputedStyle(element);
  const toInline = parseFloat(style.paddingInlineStart) || 0;
  const toBlock = parseFloat(style.paddingTop) || 0;
  const toColumn = parseFloat(style.columnGap) || 0;
  const toRow = parseFloat(style.rowGap) || 0;
  const pressure = readNumber(element, "motion-space-pressure", 24);
  const tl = timelineFor(element, services, "section-space", { profile: "handoff" });
  tl.fromTo(element,
    {
      paddingInlineStart: toInline + pressure,
      paddingInlineEnd: toInline + pressure,
      paddingTop: toBlock + pressure * 0.6,
      paddingBottom: toBlock + pressure * 0.6,
      columnGap: toColumn + pressure,
      rowGap: toRow + pressure * 0.65
    },
    {
      paddingInlineStart: toInline,
      paddingInlineEnd: toInline,
      paddingTop: toBlock,
      paddingBottom: toBlock,
      columnGap: toColumn,
      rowGap: toRow
    }
  );
  return () => { tl.kill(); restore(element, state); };
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
  return () => { tl.kill(); overlay.remove(); restore(element, state); };
}

function mountStrokeFill(element, services) {
  const state = snapshot(element);
  const color = readString(element, "motion-fill-color", currentColor(element));
  const stroke = readString(element, "motion-stroke-color", color);
  const width = readNumber(element, "motion-stroke-width", 1);
  const direction = readString(element, "motion-direction", "fill");
  const tl = timelineFor(element, services, "stroke-fill");
  const outlined = { color: "rgba(0,0,0,0)", WebkitTextStroke: `${width}px ${stroke}` };
  const filled = { color, WebkitTextStroke: `0px ${stroke}` };
  tl.fromTo(element, direction === "outline" ? filled : outlined, direction === "outline" ? outlined : filled);
  return () => { tl.kill(); restore(element, state); };
}

function mountWeightPressure(element, services) {
  const state = snapshot(element);
  const splitMode = readString(element, "motion-split", "chars");
  const split = splitMode === "none" ? null : splitChars(element, services);
  const targets = split ? split.chars : [element];
  const computed = parseFloat(getComputedStyle(element).fontWeight) || 400;
  const from = readNumber(element, "motion-weight-from", Math.max(100, computed - 180));
  const to = readNumber(element, "motion-weight-to", computed);
  const stagger = readNumber(element, "motion-stagger", 0.018);
  const tl = timelineFor(element, services, "weight-pressure");
  tl.fromTo(targets, { fontWeight: from }, { fontWeight: to, stagger });
  return () => { tl.kill(); split?.revert(); restore(element, state); };
}

function maskGradient(type, fromColor, toColor, texture) {
  if (texture) return texture;
  if (type === "vertical") return `linear-gradient(180deg, ${toColor} 0 50%, ${fromColor} 50% 100%)`;
  if (type === "radial") return `radial-gradient(circle at center, ${toColor} 0 50%, ${fromColor} 51% 100%)`;
  if (type === "custom") return `var(--motion-custom-mask, linear-gradient(90deg, ${toColor}, ${fromColor}))`;
  return `linear-gradient(90deg, ${toColor} 0 50%, ${fromColor} 50% 100%)`;
}

function mountGlyphMaskReveal(element, services) {
  const state = snapshot(element);
  const fromColor = readString(element, "motion-from-color", currentColor(element));
  const toColor = readString(element, "motion-to-color", readString(element, "motion-fill-color", fromColor));
  const mask = readString(element, "motion-mask", "horizontal");
  const texture = readString(element, "motion-texture", "");
  const tl = timelineFor(element, services, "glyph-mask-reveal");
  element.style.color = "transparent";
  element.style.WebkitBackgroundClip = "text";
  element.style.backgroundClip = "text";
  element.style.backgroundImage = maskGradient(mask, fromColor, toColor, texture);
  element.style.backgroundRepeat = "no-repeat";
  element.style.backgroundSize = mask === "vertical" ? "100% 200%" : "200% 100%";
  const fromPosition = mask === "vertical" ? "0% 100%" : "100% 0%";
  const toPosition = "0% 0%";
  tl.fromTo(element, { backgroundPosition: fromPosition }, { backgroundPosition: toPosition });
  return () => { tl.kill(); restore(element, state); };
}

function mountCounterExpansion(element, services) {
  const state = snapshot(element);
  const split = splitChars(element, services);
  const explicit = [...element.querySelectorAll("[data-motion-counter]")];
  const counters = explicit.length ? explicit : split.chars.filter((char) => CHAR_COUNTER_RE.test(char.textContent || ""));
  const amount = readNumber(element, "motion-counter-scale", 0.82);
  const stagger = readNumber(element, "motion-stagger", 0.025);
  const tl = timelineFor(element, services, "counter-expansion");
  const targets = counters.length ? counters : split.chars;
  tl.fromTo(targets,
    { scaleX: amount, scaleY: amount, transformOrigin: "50% 52%" },
    { scaleX: 1, scaleY: 1, stagger }
  );
  return () => { tl.kill(); split.revert(); restore(element, state); };
}

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
  if (getComputedStyle(element).position === "static") element.style.position = "relative";
  const count = Math.max(2, Math.round(readNumber(element, "motion-blocks", 5)));
  const color = readString(element, "motion-occlusion-color", parentBackground(element));
  const axis = readString(element, "motion-axis", "horizontal");
  const { holder, blocks } = makeOcclusionBlocks(element, count, color, axis);
  const tl = timelineFor(element, services, "occlusion-blocks");
  const property = axis === "vertical" ? "scaleY" : "scaleX";
  tl.fromTo(blocks, { [property]: 1 }, { [property]: 0, stagger: 0.05, ease: "power3.inOut" });
  return () => { tl.kill(); holder.remove(); restore(element, state); };
}

function mountEmphasisTransfer(element, services) {
  const state = snapshot(element);
  const split = splitWords(element, services);
  const activeColor = readString(element, "motion-active-color", currentColor(element));
  const inactiveColor = readString(element, "motion-inactive-color", activeColor);
  const inactiveOpacity = readNumber(element, "motion-inactive-opacity", 0.34);
  const activeWeight = readNumber(element, "motion-active-weight", parseFloat(getComputedStyle(element).fontWeight) || 500);
  const mode = readString(element, "motion-mode", "contrast");
  const tl = timelineFor(element, services, "emphasis-transfer");
  services.gsap.set(split.words, { color: inactiveColor, opacity: inactiveOpacity });
  split.words.forEach((word, index) => {
    const at = index / Math.max(1, split.words.length - 1);
    const vars = mode === "weight"
      ? { opacity: 1, color: activeColor, fontWeight: activeWeight }
      : { opacity: 1, color: activeColor, filter: "contrast(1.15)" };
    tl.to(word, { ...vars, duration: 0.22 }, at);
    if (index < split.words.length - 1) {
      tl.to(word, { opacity: inactiveOpacity, color: inactiveColor, filter: "none", duration: 0.22 }, at + 0.28);
    }
  });
  return () => { tl.kill(); split.revert(); restore(element, state); };
}

function mountSliceFragmentReveal(element, services) {
  const state = snapshot(element);
  const color = currentColor(element);
  const count = Math.max(2, Math.round(readNumber(element, "motion-slices", 6)));
  const offset = readNumber(element, "motion-fragment-offset", 12);
  const axis = readString(element, "motion-axis", "horizontal");
  if (getComputedStyle(element).position === "static") element.style.position = "relative";
  const holder = document.createElement("span");
  holder.setAttribute("aria-hidden", "true");
  Object.assign(holder.style, { position: "absolute", inset: "0", pointerEvents: "none", color, zIndex: "1" });
  const fragments = [];
  for (let i = 0; i < count; i += 1) {
    const frag = document.createElement("span");
    frag.textContent = element.textContent;
    Object.assign(frag.style, { position: "absolute", inset: "0", color, whiteSpace: "pre-wrap" });
    if (axis === "vertical") {
      const left = (i / count) * 100;
      const right = 100 - ((i + 1) / count) * 100;
      frag.style.clipPath = `inset(0 ${right}% 0 ${left}%)`;
    } else {
      const top = (i / count) * 100;
      const bottom = 100 - ((i + 1) / count) * 100;
      frag.style.clipPath = `inset(${top}% 0 ${bottom}% 0)`;
    }
    holder.appendChild(frag); fragments.push(frag);
  }
  element.appendChild(holder);
  element.style.color = "transparent";
  const tl = timelineFor(element, services, "slice-fragment-reveal");
  tl.fromTo(fragments,
    { x: (i) => (i % 2 ? offset : -offset), opacity: 0.45 },
    { x: 0, opacity: 1, stagger: 0.025, ease: "power3.out" }
  );
  return () => { tl.kill(); holder.remove(); restore(element, state); };
}

function mountNegativeSpaceCutout(element, services) {
  const state = snapshot(element);
  const source = currentColor(element);
  const cutout = readString(element, "motion-cutout-color", parentBackground(element));
  const stroke = readString(element, "motion-stroke-color", source);
  const width = readNumber(element, "motion-stroke-width", 0.75);
  const tl = timelineFor(element, services, "negative-space-cutout");
  tl.fromTo(element,
    { color: source, WebkitTextStroke: `0px ${stroke}` },
    { color: cutout, WebkitTextStroke: `${width}px ${stroke}` }
  );
  return () => { tl.kill(); restore(element, state); };
}

function materialPreset(name, element) {
  const color = currentColor(element);
  const stroke = readString(element, "motion-stroke-color", color);
  const grain = readNumber(element, "motion-grain", 0.35);
  if (name === "outline") return { color: "rgba(0,0,0,0)", WebkitTextStroke: `1px ${stroke}`, filter: "none", opacity: 1 };
  if (name === "glass") return { color, WebkitTextStroke: `0px ${stroke}`, filter: "blur(0.35px) saturate(0.75)", opacity: 0.72 };
  if (name === "grain") return { color, WebkitTextStroke: `0px ${stroke}`, filter: `contrast(${1 + grain}) brightness(${1 - grain * 0.12})`, opacity: 0.96 };
  if (name === "erosion") return { color, WebkitTextStroke: `0px ${stroke}`, filter: "blur(0.7px) contrast(1.55)", opacity: 0.52 };
  if (name === "matte") return { color, WebkitTextStroke: `0px ${stroke}`, filter: "saturate(0.72) contrast(0.92)", opacity: 0.92 };
  return { color, WebkitTextStroke: `0px ${stroke}`, filter: "none", opacity: 1 };
}

function mountMaterialShift(element, services) {
  const state = snapshot(element);
  const from = readString(element, "motion-from", "outline");
  const to = readString(element, "motion-to", "fill");
  const tl = timelineFor(element, services, "material-shift");
  tl.fromTo(element, materialPreset(from, element), materialPreset(to, element));
  return () => { tl.kill(); restore(element, state); };
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
  const active = split.chars.filter((char, index) => selectedGlyph(char, index, mode, custom, every));
  const inactive = split.chars.filter((char) => !active.includes(char));
  const tl = timelineFor(element, services, "selective-glyph-activation");
  services.gsap.set(inactive, { opacity: inactiveOpacity });
  tl.fromTo(active,
    { opacity: inactiveOpacity, color: currentColor(element), fontWeight: 300 },
    { opacity: 1, color: activeColor, fontWeight: activeWeight, stagger: readNumber(element, "motion-stagger", 0.035) }
  );
  tl.to(inactive, { opacity: 1, duration: 0.28 }, ">-0.12");
  return () => { tl.kill(); split.revert(); restore(element, state); };
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
      element.style.willChange = "color, filter, transform, letter-spacing, word-spacing";
      const cleanup = mountEffect(element, services);
      return () => {
        cleanup?.();
        element.style.willChange = "";
      };
    }
  };
}
