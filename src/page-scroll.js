let smoother = null;

export function initPageScroll({
  ScrollSmoother
}) {
  const content =
    document.querySelector(".page-wrapper");

  if (!content) return null;

  const reduceMotion =
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

  if (reduceMotion) return null;

  // Prevent duplicate ScrollSmoother instances.
  const existing =
    ScrollSmoother.get();

  if (existing) {
    smoother = existing;
    return smoother;
  }

  smoother = ScrollSmoother.create({
    content: ".page-wrapper",

    // GSAP default. Good starting point.
    smooth: 0.8,

    // Enables data-speed / data-lag later.
    effects: true,

    // Keep mobile/touch native.
    smoothTouch: 0
  });

  return smoother;
}

export function getPageScroll() {
  return smoother;
}

export function destroyPageScroll() {
  smoother?.kill();
  smoother = null;
}

export function scrollToTarget(
  target,
  {
    gsap,
    ScrollTrigger,
    duration = 0.8,
    position = "top top"
  }
) {
  /*
   * When ScrollSmoother exists, use its calculated
   * offset because it understands the smoothed page.
   */
  if (smoother) {
    const destination =
      smoother.offset(
        target,
        position
      );

    return gsap.to(
      smoother,
      {
        scrollTop: Math.min(
          ScrollTrigger.maxScroll(window),
          destination
        ),

        duration,
        ease: "power2.out"
      }
    );
  }

  /*
   * ScrollToPlugin fallback for pages/environments
   * where ScrollSmoother isn't running.
   */
  return gsap.to(
    window,
    {
      duration,

      scrollTo: {
        y: target,
        autoKill: true
      },

      ease: "power2.out"
    }
  );
}
