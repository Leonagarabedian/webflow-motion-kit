import { readNumber, readString } from "../core/config.js";

const DEFAULTS = Object.freeze({
  duration: 1.25,
  ease: "power1.inOut",
  headingDuration: 1,
  headingEase: "power2",
  headingStagger: 0.02,
  mediaShift: 15,
  headingShift: 150,
  tolerance: 10,
  wheelSpeed: -1,
  preventDefault: true
});

function readBoolean(element, attr, fallback) {
  const value = element.getAttribute(`data-${attr}`);
  if (value == null) return fallback;
  return !["false", "0", "no", "off"].includes(value.trim().toLowerCase());
}

export const observerSlideupSectionTransition = {
  name: "observer-slideup-section-transition",
  category: "component",
  selector: '[data-motion~="observer-slideup-section-transition"]',

  mount(element, { gsap, Observer, SplitText, reducedMotion }) {
    const sections = gsap.utils.toArray(
      element.querySelectorAll("[data-motion-observer-section]")
    );

    if (!Observer || sections.length < 2) return;

    const outerWrappers = sections.map((section) =>
      section.querySelector("[data-motion-observer-outer]")
    );
    const innerWrappers = sections.map((section) =>
      section.querySelector("[data-motion-observer-inner]")
    );
    const media = sections.map((section) =>
      section.querySelector("[data-motion-observer-bg]")
    );
    const headings = sections.map((section) =>
      section.querySelector("[data-motion-observer-heading]")
    );

    if (outerWrappers.some((node) => !node) || innerWrappers.some((node) => !node)) {
      console.warn(
        '[motion-kit] observer-slideup-section-transition requires one [data-motion-observer-outer] and [data-motion-observer-inner] inside every panel.'
      );
      return;
    }

    const duration = readNumber(
      element,
      "motion-observer-duration",
      DEFAULTS.duration
    );
    const ease = readString(
      element,
      "motion-observer-ease",
      DEFAULTS.ease
    );
    const mediaShift = readNumber(
      element,
      "motion-observer-media-shift",
      DEFAULTS.mediaShift
    );
    const headingShift = readNumber(
      element,
      "motion-observer-heading-shift",
      DEFAULTS.headingShift
    );
    const headingDuration = readNumber(
      element,
      "motion-observer-heading-duration",
      DEFAULTS.headingDuration
    );
    const headingEase = readString(
      element,
      "motion-observer-heading-ease",
      DEFAULTS.headingEase
    );
    const headingStagger = readNumber(
      element,
      "motion-observer-heading-stagger",
      DEFAULTS.headingStagger
    );
    const tolerance = readNumber(
      element,
      "motion-observer-tolerance",
      DEFAULTS.tolerance
    );
    const wheelSpeed = readNumber(
      element,
      "motion-observer-wheel-speed",
      DEFAULTS.wheelSpeed
    );
    const preventDefault = readBoolean(
      element,
      "motion-observer-prevent-default",
      DEFAULTS.preventDefault
    );
    const loop = readBoolean(element, "motion-observer-loop", true);

    const originalRootStyle = element.getAttribute("style");
    const originalSectionStyles = sections.map((section) =>
      section.getAttribute("style")
    );
    const originalOuterStyles = outerWrappers.map((node) =>
      node.getAttribute("style")
    );
    const originalInnerStyles = innerWrappers.map((node) =>
      node.getAttribute("style")
    );
    const originalMediaStyles = media.map((node) =>
      node?.getAttribute("style") ?? null
    );

    const splitHeadings = headings.map((heading) => {
      if (!heading || !SplitText || reducedMotion()) return null;
      return new SplitText(heading, {
        type: "chars,words,lines",
        linesClass: "clip-text"
      });
    });

    let currentIndex = -1;
    let animating = false;
    let timeline = null;

    const wrap = gsap.utils.wrap(0, sections.length);

    gsap.set(element, {
      position: getComputedStyle(element).position === "static" ? "relative" : undefined,
      overflow: "hidden"
    });

    gsap.set(sections, {
      position: "absolute",
      inset: 0,
      autoAlpha: 0
    });

    gsap.set(outerWrappers, { yPercent: 100 });
    gsap.set(innerWrappers, { yPercent: -100 });

    function normalizeIndex(index) {
      if (loop) return wrap(index);
      return Math.min(sections.length - 1, Math.max(0, index));
    }

    function gotoSection(index, direction) {
      index = normalizeIndex(index);
      if (index === currentIndex && currentIndex >= 0) return;

      animating = true;

      const fromTop = direction === -1;
      const dFactor = fromTop ? -1 : 1;

      timeline?.kill();

      const tl = gsap.timeline({
        defaults: { duration, ease },
        onComplete: () => {
          animating = false;
        }
      });

      timeline = tl;

      if (currentIndex >= 0) {
        gsap.set(sections[currentIndex], { zIndex: 0 });

        if (media[currentIndex]) {
          tl.to(
            media[currentIndex],
            { yPercent: -mediaShift * dFactor },
            0
          );
        }

        tl.set(sections[currentIndex], { autoAlpha: 0 });
      }

      gsap.set(sections[index], {
        autoAlpha: 1,
        zIndex: 1
      });

      tl.fromTo(
        [outerWrappers[index], innerWrappers[index]],
        {
          yPercent: (i) => (i ? -100 * dFactor : 100 * dFactor)
        },
        {
          yPercent: 0
        },
        0
      );

      if (media[index]) {
        tl.fromTo(
          media[index],
          { yPercent: mediaShift * dFactor },
          { yPercent: 0 },
          0
        );
      }

      const split = splitHeadings[index];
      if (split?.chars?.length) {
        tl.fromTo(
          split.chars,
          {
            autoAlpha: 0,
            yPercent: headingShift * dFactor
          },
          {
            autoAlpha: 1,
            yPercent: 0,
            duration: headingDuration,
            ease: headingEase,
            stagger: {
              each: headingStagger,
              from: "random"
            }
          },
          0.2
        );
      }

      currentIndex = index;
    }

    if (reducedMotion()) {
      gsap.set(sections, { autoAlpha: 0 });
      gsap.set(sections[0], { autoAlpha: 1, zIndex: 1 });
      gsap.set([outerWrappers[0], innerWrappers[0]], { yPercent: 0 });
      currentIndex = 0;
      return () => {
        sections.forEach((section, index) => {
          const style = originalSectionStyles[index];
          if (style == null) section.removeAttribute("style");
          else section.setAttribute("style", style);
        });
        outerWrappers.forEach((node, index) => {
          const style = originalOuterStyles[index];
          if (style == null) node.removeAttribute("style");
          else node.setAttribute("style", style);
        });
        innerWrappers.forEach((node, index) => {
          const style = originalInnerStyles[index];
          if (style == null) node.removeAttribute("style");
          else node.setAttribute("style", style);
        });
        if (originalRootStyle == null) element.removeAttribute("style");
        else element.setAttribute("style", originalRootStyle);
      };
    }

    const observer = Observer.create({
      target: element,
      type: "wheel,touch,pointer",
      wheelSpeed,
      onDown: () => {
        if (!animating && (loop || currentIndex > 0)) {
          gotoSection(currentIndex - 1, -1);
        }
      },
      onUp: () => {
        if (!animating && (loop || currentIndex < sections.length - 1)) {
          gotoSection(currentIndex + 1, 1);
        }
      },
      tolerance,
      preventDefault
    });

    gotoSection(0, 1);

    return () => {
      observer.kill();
      timeline?.kill();
      splitHeadings.forEach((split) => split?.revert());

      sections.forEach((section, index) => {
        const style = originalSectionStyles[index];
        if (style == null) section.removeAttribute("style");
        else section.setAttribute("style", style);
      });

      outerWrappers.forEach((node, index) => {
        const style = originalOuterStyles[index];
        if (style == null) node.removeAttribute("style");
        else node.setAttribute("style", style);
      });

      innerWrappers.forEach((node, index) => {
        const style = originalInnerStyles[index];
        if (style == null) node.removeAttribute("style");
        else node.setAttribute("style", style);
      });

      media.forEach((node, index) => {
        if (!node) return;
        const style = originalMediaStyles[index];
        if (style == null) node.removeAttribute("style");
        else node.setAttribute("style", style);
      });

      if (originalRootStyle == null) element.removeAttribute("style");
      else element.setAttribute("style", originalRootStyle);
    };
  }
};
