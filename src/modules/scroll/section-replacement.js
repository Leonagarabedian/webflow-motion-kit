import { resolveScrollContract, viewportScroll } from "../../core/scroll-alignment/contract.js";
import { readNumber, readString } from "../../core/config.js";

const DEFAULTS = Object.freeze({
  start: "top bottom",
  end: "top top",
  scrub: 1,
  ease: "none",
  zIndex: 7,
  top: 0,
  minWidth: 0,
  target: '[data-motion-target="replacement"]'
});

function restoreStyle(element, style) {
  if (!element) return;
  if (style == null) element.removeAttribute("style");
  else element.setAttribute("style", style);
}

function resolveElement(root, selector, fallback = null) {
  if (!selector) return fallback;
  try {
    return root.querySelector(selector) || document.querySelector(selector) || fallback;
  } catch (error) {
    console.warn("[motion-kit] Invalid section-replacement selector:", selector, error);
    return fallback;
  }
}

function isTransparent(color) {
  if (!color || color === "transparent") return true;
  return /rgba?\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(color);
}

function readSurface(element) {
  let node = element;
  while (node && node !== document.documentElement) {
    const computed = window.getComputedStyle(node);
    const color = computed.backgroundColor;
    const image = computed.backgroundImage;
    if (!isTransparent(color) || (image && image !== "none")) {
      return {
        backgroundColor: color,
        backgroundImage: image,
        backgroundPosition: computed.backgroundPosition,
        backgroundSize: computed.backgroundSize,
        backgroundRepeat: computed.backgroundRepeat
      };
    }
    node = node.parentElement;
  }

  const body = window.getComputedStyle(document.body);
  return {
    backgroundColor: body.backgroundColor,
    backgroundImage: body.backgroundImage,
    backgroundPosition: body.backgroundPosition,
    backgroundSize: body.backgroundSize,
    backgroundRepeat: body.backgroundRepeat
  };
}

function sanitizeClone(root) {
  const nodes = [root, ...root.querySelectorAll("*")];
  nodes.forEach((node) => {
    node.removeAttribute("id");
    node.removeAttribute("data-motion");
  });
}

function createOverlay(root, incomingVisual, zIndex, top) {
  const overlay = document.createElement("div");
  const clone = incomingVisual.cloneNode(true);
  const surface = readSurface(root);

  sanitizeClone(clone);
  overlay.setAttribute("aria-hidden", "true");
  overlay.dataset.motionSectionReplacementOverlay = "";

  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: String(zIndex),
    overflow: "hidden",
    pointerEvents: "none",
    visibility: "hidden",
    clipPath: "inset(100% 0% 0% 0%)",
    WebkitClipPath: "inset(100% 0% 0% 0%)",
    backgroundColor: surface.backgroundColor,
    backgroundImage: surface.backgroundImage,
    backgroundPosition: surface.backgroundPosition,
    backgroundSize: surface.backgroundSize,
    backgroundRepeat: surface.backgroundRepeat,
    willChange: "clip-path"
  });

  Object.assign(clone.style, {
    position: "absolute",
    top: `${top}px`,
    margin: "0"
  });

  overlay.appendChild(clone);
  document.body.appendChild(overlay);

  return { overlay, clone };
}

function autoScroll(root) {
  return viewportScroll(root, 1, () => Math.max(1, window.innerHeight));
}

export const sectionReplacement = {
  name: "section-replacement",
  category: "primitive",
  selector: '[data-motion~="section-replacement"]',

  mount(root, { gsap, reducedMotion }) {
    if (reducedMotion()) return;

    const minWidth = Math.max(
      0,
      readNumber(root, "motion-replacement-min-width", DEFAULTS.minWidth)
    );
    if (window.innerWidth < minWidth) return;

    const fromSelector = readString(root, "motion-replacement-from", "");
    const targetSelector = readString(
      root,
      "motion-replacement-target",
      DEFAULTS.target
    );

    const outgoing = resolveElement(root, fromSelector, root.previousElementSibling);
    const incomingVisual = resolveElement(root, targetSelector, root);

    if (!outgoing || !incomingVisual) return;

    const zIndex = readNumber(
      root,
      "motion-replacement-z-index",
      DEFAULTS.zIndex
    );
    const top = readNumber(root, "motion-replacement-top", DEFAULTS.top);
    const scrub = readNumber(
      root,
      "motion-replacement-scrub",
      DEFAULTS.scrub
    );
    const ease = readString(
      root,
      "motion-replacement-ease",
      DEFAULTS.ease
    );

    const originalIncomingStyle = incomingVisual.getAttribute("style");
    const originalOutgoingStyle = outgoing.getAttribute("style");
    const { overlay, clone } = createOverlay(
      root,
      incomingVisual,
      zIndex,
      top
    );

    const syncGeometry = () => {
      const rect = incomingVisual.getBoundingClientRect();
      Object.assign(clone.style, {
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`
      });
    };

    const activate = () => {
      syncGeometry();
      incomingVisual.style.visibility = "hidden";
      overlay.style.visibility = "visible";
    };

    const deactivate = () => {
      overlay.style.visibility = "hidden";
      incomingVisual.style.visibility = "";
    };

    syncGeometry();

    const legacyScroll = {
      trigger: root,
      start: readString(
        root,
        "motion-replacement-start",
        DEFAULTS.start
      ),
      end: readString(
        root,
        "motion-replacement-end",
        DEFAULTS.end
      ),
      scrub,
      invalidateOnRefresh: true
    };

    const scrollTrigger = {
      ...resolveScrollContract(root, legacyScroll, () => autoScroll(root)),
      pin: outgoing,
      pinSpacing: false,
      pinReparent: true,
      anticipatePin: 1,
      onEnter: activate,
      onEnterBack: activate,
      onLeave: deactivate,
      onLeaveBack: deactivate,
      onRefresh: syncGeometry
    };

    const tween = gsap.fromTo(
      overlay,
      {
        clipPath: "inset(100% 0% 0% 0%)",
        WebkitClipPath: "inset(100% 0% 0% 0%)"
      },
      {
        clipPath: "inset(0% 0% 0% 0%)",
        WebkitClipPath: "inset(0% 0% 0% 0%)",
        ease,
        immediateRender: false,
        scrollTrigger
      }
    );

    return () => {
      tween.scrollTrigger?.kill(true);
      tween.kill();
      overlay.remove();
      restoreStyle(incomingVisual, originalIncomingStyle);
      restoreStyle(outgoing, originalOutgoingStyle);
    };
  }
};
