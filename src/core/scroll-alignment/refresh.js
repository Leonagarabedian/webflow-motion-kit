export function createAlignmentRefreshController({ ScrollTrigger, logger = console } = {}) {
  const cleanups = new Set();
  let pendingRaf = 0;

  function refresh() {
    try {
      ScrollTrigger?.refresh?.();
    } catch (error) {
      logger.warn("[MotionKit] Alignment refresh failed", error);
    }
  }

  function requestRefresh() {
    cancelAnimationFrame(pendingRaf);
    pendingRaf = requestAnimationFrame(() => {
      pendingRaf = 0;
      refresh();
    });
  }

  function watch({ fonts = true, resize = true, orientation = true } = {}) {
    if (fonts && document.fonts?.ready) {
      let active = true;
      document.fonts.ready.then(() => active && requestRefresh());
      cleanups.add(() => { active = false; });
    }

    if (resize) {
      window.addEventListener("resize", requestRefresh, { passive: true });
      cleanups.add(() => window.removeEventListener("resize", requestRefresh));
    }
    if (orientation) {
      window.addEventListener("orientationchange", requestRefresh, { passive: true });
      cleanups.add(() => window.removeEventListener("orientationchange", requestRefresh));
    }

    return destroy;
  }

  function destroy() {
    cancelAnimationFrame(pendingRaf);
    pendingRaf = 0;
    for (const cleanup of [...cleanups]) {
      try { cleanup(); } catch {}
      cleanups.delete(cleanup);
    }
  }

  return { refresh, requestRefresh, watch, destroy };
}
