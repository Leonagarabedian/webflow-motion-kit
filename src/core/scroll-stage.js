function readNumber(element, name, fallback) {
  const value = Number.parseFloat(
    element.getAttribute(`data-scroll-${name}`)
  );

  return Number.isFinite(value) ? value : fallback;
}

function readString(element, name, fallback) {
  const value = element.getAttribute(`data-scroll-${name}`);
  return value == null || value === "" ? fallback : value;
}

function readBoolean(element, name, fallback = false) {
  const value = element.getAttribute(`data-scroll-${name}`);

  if (value == null) return fallback;
  if (value === "" || value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;

  return fallback;
}

function phaseProgress(progress, start, end, clamp) {
  const span = Math.max(end - start, 0.0001);
  return clamp(0, 1, (progress - start) / span);
}

function resolveNextSection(element) {
  const selector = readString(element, "next", null);

  if (selector) {
    return (
      element.ownerDocument.querySelector(selector) ||
      element.nextElementSibling
    );
  }

  return element.nextElementSibling;
}

export function createScrollStage(
  element,
  { gsap, ScrollTrigger }
) {
  const active = readBoolean(element, "active", true);

  if (!active) {
    return {
      apply() {},
      destroy() {}
    };
  }

  const releaseMode = readString(
    element,
    "release",
    "normal"
  );

  const releaseStart = readNumber(
    element,
    "release-start",
    0.75
  );

  const releaseEnd = readNumber(
    element,
    "release-end",
    1
  );

  /*
   * The scroll runway can be defined specifically for
   * the scroll-stage.
   *
   * If it isn't, fall back to the composition's existing
   * data-motion-scroll-vh value.
   */
  const motionScrollVh = Number.parseFloat(
    element.getAttribute("data-motion-scroll-vh")
  );

  const scrollVh = readNumber(
    element,
    "vh",
    Number.isFinite(motionScrollVh)
      ? motionScrollVh
      : 200
  );

  /*
   * How far the outgoing pinned visual moves during
   * the release.
   *
   * -100 = one full visual height upward.
   */
  const exitY = readNumber(
    element,
    "exit-y",
    -100
  );

  /*
   * A handoff normally needs about one viewport of
   * overlap so the next section can enter while the
   * current section releases.
   */
  const releaseVh =
    scrollVh * Math.max(releaseEnd - releaseStart, 0);

  const overlapVh = readNumber(
    element,
    "overlap-vh",
    Math.min(releaseVh, 100)
  );

  const enterZ = readNumber(
    element,
    "enter-z",
    2
  );

  const releaseTarget =
    element.querySelector("[data-scroll-release-target]");

  const nextSection = resolveNextSection(element);

  const clamp = gsap.utils.clamp;
  const interpolate = gsap.utils.interpolate;

  /*
   * Preserve only the inline properties this primitive
   * owns. Do not wipe the rest of Webflow's styling.
   */
  const originalNextStyles = nextSection
    ? {
        marginTop: nextSection.style.marginTop,
        position: nextSection.style.position,
        zIndex: nextSection.style.zIndex
      }
    : null;

  const originalReleaseStyles = releaseTarget
    ? {
        transform: releaseTarget.style.transform,
        willChange: releaseTarget.style.willChange
      }
    : null;

  function applyLayout() {
    if (!nextSection) return;

    if (
      releaseMode !== "handoff" &&
      releaseMode !== "overlap"
    ) {
      return;
    }

    const overlapPx =
      window.innerHeight * (overlapVh / 100);

    nextSection.style.marginTop = `${-overlapPx}px`;
    nextSection.style.position = "relative";
    nextSection.style.zIndex = String(enterZ);
  }

  applyLayout();

  /*
   * Recalculate viewport-based overlap whenever
   * ScrollTrigger refreshes after resize/font/layout changes.
   */
  ScrollTrigger.addEventListener(
    "refreshInit",
    applyLayout
  );

  if (releaseTarget) {
    releaseTarget.style.willChange = "transform";
  }

  function apply(progress) {
    if (releaseMode === "normal") return;

    const releaseProgress = phaseProgress(
      progress,
      releaseStart,
      releaseEnd,
      clamp
    );

    /*
     * OVERLAP:
     * next section enters, current section remains still.
     *
     * HANDOFF:
     * next section enters while current pinned visual
     * travels out.
     */
    if (
      releaseMode === "handoff" &&
      releaseTarget
    ) {
      gsap.set(releaseTarget, {
        yPercent: interpolate(
          0,
          exitY,
          releaseProgress
        )
      });
    }
  }

  function destroy() {
    ScrollTrigger.removeEventListener(
      "refreshInit",
      applyLayout
    );

    if (releaseTarget) {
      gsap.set(releaseTarget, {
        clearProps: "transform"
      });

      releaseTarget.style.transform =
        originalReleaseStyles?.transform || "";

      releaseTarget.style.willChange =
        originalReleaseStyles?.willChange || "";
    }

    if (nextSection && originalNextStyles) {
      nextSection.style.marginTop =
        originalNextStyles.marginTop;

      nextSection.style.position =
        originalNextStyles.position;

      nextSection.style.zIndex =
        originalNextStyles.zIndex;
    }
  }

  return {
    apply,
    destroy
  };
}
