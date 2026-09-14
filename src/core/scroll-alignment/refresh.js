export function createAlignmentRefreshController({ ScrollTrigger, logger = console } = {}) {
  const cleanups = new Set();

  function refresh() {
    try {
      ScrollTrigger?.refresh?.();
    } catch (error) {
      logger.warn("[MotionKit] Alignment refresh failed", error);
    }
  }

  function watch({ fonts = true, resize = true, orientation = true } = {}) {
    if (fonts && document.fonts?.ready) {
      let active = true;
      document.fonts.ready.then(() => active && refresh());
      cleanups.add(() => { active = false; });
    }

    let resizeRaf = 0;
    const requestRefresh = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(refresh);
    };

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
    cancelAnimationFrame(0);
    for (const cleanup of [...cleanups]) {
      try { cleanup(); } catch {}
      cleanups.delete(cleanup);
    }
  }

  return { refresh, watch, destroy };
}
