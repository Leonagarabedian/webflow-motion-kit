import { readNumber, readString } from "../core/config.js";

const STYLE_ID = "motion-kit-brand-load-styles";

function ensureStyles(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [data-mk-brand-root] { perspective: var(--mk-brand-perspective, 400px); }
    [data-mk-brand-letter] {
      display: inline-grid;
      transform-origin: 50% 50%;
      transform-style: preserve-3d;
      will-change: transform;
    }
    [data-mk-brand-face] {
      grid-area: 1 / 1;
      display: block;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
    [data-mk-brand-face="front"] { transform: rotateY(0deg) translateZ(0.01em); }
    [data-mk-brand-face="back"] { transform: rotateY(180deg) translateZ(0.01em); }
  `;
  doc.head.appendChild(style);
}

function makeLetter(doc, character) {
  const wrapper = doc.createElement("span");
  const front = doc.createElement("span");
  const back = doc.createElement("span");
  wrapper.setAttribute("data-mk-brand-letter", character);
  front.setAttribute("data-mk-brand-face", "front");
  back.setAttribute("data-mk-brand-face", "back");
  back.setAttribute("aria-hidden", "true");
  front.textContent = character;
  back.textContent = character;
  wrapper.append(front, back);
  return wrapper;
}

function wrapSelectedLetters(element, selectedLetters) {
  const doc = element.ownerDocument;
  const walker = doc.createTreeWalker(element, doc.defaultView.NodeFilter.SHOW_TEXT);
  const textNodes = [];
  const wrapped = [];
  let node;
  while ((node = walker.nextNode())) if (node.nodeValue) textNodes.push(node);

  for (const textNode of textNodes) {
    const fragment = doc.createDocumentFragment();
    let changed = false;
    for (const character of Array.from(textNode.nodeValue)) {
      if (selectedLetters.has(character)) {
        const letter = makeLetter(doc, character);
        fragment.appendChild(letter);
        wrapped.push(letter);
        changed = true;
      } else {
        fragment.appendChild(doc.createTextNode(character));
      }
    }
    if (changed) textNode.replaceWith(fragment);
  }
  return wrapped;
}

export const brandLoad = {
  name: "brand-load",
  category: "primitive",
  selector: '[data-motion~="brand-load"]',
  mount(element, { gsap, reducedMotion }) {
    if (reducedMotion()) return;

    const originalHTML = element.innerHTML;
    const letters = new Set(Array.from(readString(element, "motion-letters", "BTA")));
    const wrapped = wrapSelectedLetters(element, letters);
    if (!wrapped.length) return;

    ensureStyles(element.ownerDocument);
    element.setAttribute("data-mk-brand-root", "");
    element.style.setProperty(
      "--mk-brand-perspective",
      `${readNumber(element, "motion-perspective", 400)}px`
    );

    const timeline = gsap.timeline({
      delay: readNumber(element, "motion-delay", 0.15)
    });
    timeline.fromTo(
      wrapped,
      { rotationY: readNumber(element, "motion-rotation-y", -360) },
      {
        rotationY: 0,
        duration: readNumber(element, "motion-duration", 1.6),
        ease: readString(element, "motion-ease", "power2.inOut"),
        stagger: readNumber(element, "motion-stagger", 0.16),
        clearProps: "transform"
      }
    );

    return () => {
      timeline.kill();
      element.innerHTML = originalHTML;
      element.removeAttribute("data-mk-brand-root");
      element.style.removeProperty("--mk-brand-perspective");
    };
  }
};
