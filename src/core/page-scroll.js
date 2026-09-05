let smoother = null;

export function initPageScroll({ ScrollSmoother }) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return null;
  }

  smoother = ScrollSmoother.get();

  if (smoother) {
    return smoother;
  }

  smoother = ScrollSmoother.create({
    content: ".page-wrapper",
    smooth: 0.8,
    effects: true,
    smoothTouch: 0
  });

  return smoother;
}

export function getPageScroll() {
  return smoother;
}
