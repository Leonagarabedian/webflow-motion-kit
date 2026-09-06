let smoother = null;

function findConfigRoot(root = document) {
  if (root instanceof Element && root.matches('[data-motion-scroll="smooth"]')) {
    return root;
  }
  return root.querySelector?.('[data-motion-scroll="smooth"]') ?? null;
}

function readNumber(element, attribute, fallback) {
  const value = Number.parseFloat(element?.getAttribute(attribute));
  return Number.isFinite(value) ? value : fallback;
}

function readBoolean(element, attribute, fallback) {
  const value = element?.getAttribute(attribute);
  if (value == null) return fallback;
  if (value === "" || value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return fallback;
}

export function initPageScroll({ ScrollSmoother }, root = document) {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return null;

  const configRoot = findConfigRoot(root);
  if (!configRoot) return null;

  smoother = ScrollSmoother.get() ?? smoother;
  if (smoother) return smoother;

  const contentSelector =
    configRoot.getAttribute("data-motion-scroll-content") || ".page-wrapper";
  const content = document.querySelector(contentSelector);

  if (!content) {
    console.warn(
      `[MotionKit] Smooth scroll requested but content selector was not found: ${contentSelector}`
    );
    return null;
  }

  smoother = ScrollSmoother.create({
    content,
    effects: readBoolean(configRoot, "data-motion-scroll-effects", true),
    smooth: readNumber(configRoot, "data-motion-scroll-smooth", 0.8),
    smoothTouch: readNumber(configRoot, "data-motion-scroll-touch", 0)
  });

  return smoother;
}

export function getPageScroll() {
  return ScrollSmootherSafeGet();
}

function ScrollSmootherSafeGet() {
  return smoother ?? null;
}

export function destroyPageScroll() {
  smoother?.kill?.();
  smoother = null;
}
