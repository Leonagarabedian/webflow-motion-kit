/** DOM helpers scoped to the stationary typography family. */
const typeProperties = ['font-family','font-size','font-style','font-weight','font-variation-settings','font-feature-settings','font-kerning','font-stretch','line-height','letter-spacing','word-spacing','text-transform','text-align','white-space','direction','writing-mode','text-indent'];
const boxProperties = ['display','box-sizing','padding-top','padding-right','padding-bottom','padding-left','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-style','border-right-style','border-bottom-style','border-left-style','vertical-align','margin-top','margin-right','margin-bottom','margin-left'];
export function captureStyles(element) {
  const records = [element, ...element.querySelectorAll('*')].map(node => [node, node.getAttribute('style')]);
  return () => records.forEach(([node, style]) => {
    if (style == null) node.removeAttribute('style');
    else node.setAttribute('style', style);
  });
}

// Keep authored spans, links, breaks and their event listeners in place.
export function splitText(element, unit = 'chars') {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const texts = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.parentElement.closest('[aria-hidden="true"],script,style,[data-motion-surface]')) texts.push(node);
  }
  const chars = [], words = [], records = [];
  const aria = element.getAttribute('aria-label');
  const labelRoot = aria == null && !element.querySelector('a,button');
  if (labelRoot) element.setAttribute('aria-label', element.textContent);
  for (const text of texts) {
    const fragment = document.createDocumentFragment(), replacements = [];
    for (const part of text.data.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        const space = document.createTextNode(part); fragment.append(space); replacements.push(space); continue;
      }
      const word = document.createElement('span');
      if (labelRoot || aria != null) word.setAttribute('aria-hidden', 'true');
      word.style.display = 'inline-block';
      if (unit === 'words') word.textContent = part;
      else {
        const glyphs = typeof Intl.Segmenter === 'function'
          ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(part)].map(item => item.segment)
          : Array.from(part);
        for (const value of glyphs) {
          const char = document.createElement('span'); char.textContent = value;
          char.style.display = 'inline-block'; word.append(char); chars.push(char);
        }
      }
      words.push(word); fragment.append(word); replacements.push(word);
    }
    text.replaceWith(fragment); records.push({ text, replacements });
  }
  return { chars, words, revert() {
    for (const { text, replacements } of records) {
      const first = replacements.find(node => node.parentNode);
      if (first) { first.before(text); replacements.forEach(node => node.remove()); }
    }
    if (aria == null) element.removeAttribute('aria-label'); else element.setAttribute('aria-label', aria);
  } };
}

export function createSurface(element, { hide = true } = {}) {
  const computed = getComputedStyle(element);
  const layer = element.cloneNode(true);
  layer.querySelectorAll('[data-motion-surface],svg[data-motion-filter]').forEach(node => node.remove());
  const originals = [element, ...element.querySelectorAll('*')].filter(node => !node.closest('[data-motion-surface],svg[data-motion-filter]'));
  const clones = [layer, ...layer.querySelectorAll('*')];
  clones.forEach((node, i) => {
    for (const attr of [...node.attributes]) {
      if (attr.name === 'id' || attr.name.startsWith('data-motion') || ['aria-label','for','name'].includes(attr.name)) node.removeAttribute(attr.name);
    }
    const style = getComputedStyle(originals[i]);
    for (const property of ['color', ...typeProperties, ...boxProperties]) {
      node.style.setProperty(property, style.getPropertyValue(property));
    }
  });
  layer.setAttribute('data-motion-surface', ''); layer.setAttribute('aria-hidden', 'true'); layer.inert = true;
  if (computed.position === 'static' || !computed.position) element.style.position = 'relative';
  Object.assign(layer.style, { position:'absolute', inset:'0', width:'100%', height:'100%', boxSizing:'border-box', margin:'0', pointerEvents:'none', visibility:'visible', background:'none', borderColor:'transparent' });
  element.append(layer);
  // Preserve the source DOM and its metrics. Only its paint is hidden.
  if (hide) originals.forEach(node => { node.style.color = 'transparent'; node.style.webkitTextStrokeColor = 'transparent'; node.style.textShadow = 'none'; });
  return { layer, nodes:[layer, ...layer.querySelectorAll('*')], update() {
    clones.forEach((node, i) => {
      const style = getComputedStyle(originals[i]);
      for (const property of [...typeProperties, ...boxProperties]) node.style.setProperty(property, style.getPropertyValue(property));
    });
    layer.style.margin = '0'; layer.style.boxSizing = 'border-box';
  }, remove:() => layer.remove() };
}

export function svgFilter(element, body) {
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');
  svg.setAttribute('data-motion-filter','');svg.setAttribute('aria-hidden','true');svg.setAttribute('width','0');svg.setAttribute('height','0');
  Object.assign(svg.style,{position:'absolute',pointerEvents:'none'});
  const id=`motion-type-filter-${++filterId}`;
  svg.innerHTML=`<defs><filter id="${id}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">${body}</filter></defs>`;
  element.append(svg);
  return { url:`url("#${id}")`, svg, remove:()=>svg.remove() };
}
let filterId=0;

// Read the authored responsive style without letting the animated inline value feed back.
export function metricReader(element, properties) {
  const original = element.getAttribute('style');
  return () => {
    const active = element.getAttribute('style');
    if (original == null) element.removeAttribute('style'); else element.setAttribute('style', original);
    const style = getComputedStyle(element);
    const values = Object.fromEntries(properties.map(property => [property, style[property]]));
    if (active == null) element.removeAttribute('style'); else element.setAttribute('style', active);
    return values;
  };
}
