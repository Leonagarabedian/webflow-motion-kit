import { readNumber, readString } from "../core/config.js";

const DEFAULTS = Object.freeze({
  duration: 1.25,
  ease: "slow.inOut",
  headingDuration: 1,
  headingEase: "power2",
  headingStagger: 0.02,
  mediaShift: 15,
  touchThreshold: 10
});

export const stackedDivsSectionReveal = {
  name: "stacked-divs-section-reveal",
  category: "component",
  selector: '[data-motion~="stacked-divs-section-reveal"]',

  mount(element, { gsap, SplitText, reducedMotion }) {
    const sections = gsap.utils.toArray(
      element.querySelectorAll("[data-motion-stacked-section]")
    );

    if (sections.length < 2) return;

    const images = sections.map((section) =>
      section.querySelector("[data-motion-stacked-bg]")
    );
    const headings = sections.map((section) =>
      section.querySelector("[data-motion-stacked-heading]")
    );
    const outerWrappers = sections.map((section) =>
      section.querySelector("[data-motion-stacked-outer]")
    );
    const innerWrappers = sections.map((section) =>
      section.querySelector("[data-motion-stacked-inner]")
    );

    if (outerWrappers.some((node) => !node) || innerWrappers.some((node) => !node)) {
      console.warn(
        '[motion-kit] stacked-divs-section-reveal requires one [data-motion-stacked-outer] and [data-motion-stacked-inner] inside every panel.'
      );
      return;
    }

    const duration = readNumber(
      element,
      "motion-stacked-duration",
      DEFAULTS.duration
    );
    const ease = readString(
      element,
      "motion-stacked-ease",
      DEFAULTS.ease
    );
    const headingDuration = readNumber(
      element,
      "motion-stacked-heading-duration",
      DEFAULTS.headingDuration
    );
    const headingEase = readString(
      element,
      "motion-stacked-heading-ease",
      DEFAULTS.headingEase
    );
    const headingStagger = readNumber(
      element,
      "motion-stacked-heading-stagger",
      DEFAULTS.headingStagger
    );
    const mediaShift = readNumber(
      element,
      "motion-stacked-media-shift",
      DEFAULTS.mediaShift
    );
    const touchThreshold = readNumber(
      element,
      "motion-stacked-touch-threshold",
      DEFAULTS.touchThreshold
    );

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
    const originalImageStyles = images.map((node) =>
      node?.getAttribute("style") ?? null
    );

    const splitHeadings = headings.map((heading) => {
      if (!heading || !SplitText || reducedMotion()) return null;
      return new SplitText(heading, {
        type: "chars,words,lines",
        linesClass: "clip-text"
      });
    });

    const tlDefaults = { ease, duration };

    let listening = false;
    let direction = "down";
    let current;
    let next = 0;
    let activeTimeline = null;

    const touch = {
      startX: 0,
      startY: 0,
      dx: 0,
      dy: 0
    };

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

    const revealSectionHeading = () => {
      const split = splitHeadings[next];
      if (!split?.chars?.length) return null;

      return gsap.to(split.chars, {
        autoAlpha: 1,
        yPercent: 0,
        duration: headingDuration,
        ease: headingEase,
        stagger: {
          each: headingStagger,
          from: "random"
        }
      });
    };

    const slideIn = () => {
      if (current !== undefined) {
        gsap.set(sections[current], { zIndex: 0 });
      }

      gsap.set(sections[next], { autoAlpha: 1, zIndex: 1 });

      if (images[next]) {
        gsap.set(images[next], { yPercent: 0 });
      }

      const split = splitHeadings[next];
      if (split?.chars?.length) {
        gsap.set(split.chars, {
          autoAlpha: 0,
          yPercent: 100
        });
      }

      activeTimeline?.kill();

      const tl = gsap.timeline({
        paused: true,
        defaults: tlDefaults,
        onComplete: () => {
          listening = true;
          current = next;
        }
      });

      activeTimeline = tl;

      tl.to(
        [outerWrappers[next], innerWrappers[next]],
        { yPercent: 0 },
        0
      );

      if (images[next]) {
        tl.from(images[next], { yPercent: mediaShift }, 0);
      }

      const headingTween = revealSectionHeading();
      if (headingTween) tl.add(headingTween, 0);

      if (current !== undefined) {
        if (images[current]) {
          tl.add(
            gsap.to(images[current], {
              yPercent: -mediaShift,
              ...tlDefaults
            }),
            0
          );
        }

        const reset = gsap
          .timeline()
          .set(outerWrappers[current], { yPercent: 100 })
          .set(innerWrappers[current], { yPercent: -100 });

        if (images[current]) {
          reset.set(images[current], { yPercent: 0 });
        }

        reset.set(sections[current], { autoAlpha: 0 });
        tl.add(reset);
      }

      tl.play(0);
    };

    const slideOut = () => {
      gsap.set(sections[current], { zIndex: 1 });
      gsap.set(sections[next], { autoAlpha: 1, zIndex: 0 });

      const split = splitHeadings[next];
      if (split?.chars?.length) {
        gsap.set(split.chars, {
          autoAlpha: 0,
          yPercent: 100
        });
      }

      gsap.set(
        [outerWrappers[next], innerWrappers[next]],
        { yPercent: 0 }
      );

      if (images[next]) {
        gsap.set(images[next], { yPercent: 0 });
      }

      activeTimeline?.kill();

      const tl = gsap.timeline({
        defaults: tlDefaults,
        onComplete: () => {
          listening = true;
          current = next;
        }
      });

      activeTimeline = tl;

      tl.to(outerWrappers[current], { yPercent: 100 }, 0)
        .to(innerWrappers[current], { yPercent: -100 }, 0);

      if (images[current]) {
        tl.to(images[current], { yPercent: mediaShift }, 0);
      }

      if (images[next]) {
        tl.from(images[next], { yPercent: -mediaShift }, 0);
      }

      const headingTween = revealSectionHeading();
      if (headingTween) tl.add(headingTween, ">-1");

      if (images[current]) {
        tl.set(images[current], { yPercent: 0 });
      }
    };

    const handleDirection = () => {
      listening = false;

      if (direction === "down") {
        next = current + 1;
        if (next >= sections.length) next = 0;
        slideIn();
        return;
      }

      next = current - 1;
      if (next < 0) next = sections.length - 1;
      slideOut();
    };

    const handleWheel = (event) => {
      if (!listening) return;
      direction = event.deltaY > 0 ? "down" : "up";
      handleDirection();
    };

    const handleTouchStart = (event) => {
      if (!listening) return;
      const point = event.changedTouches?.[0];
      if (!point) return;
      touch.startX = point.pageX;
      touch.startY = point.pageY;
    };

    const handleTouchMove = (event) => {
      if (!listening) return;
      event.preventDefault();
    };

    const handleTouchEnd = (event) => {
      if (!listening) return;
      const point = event.changedTouches?.[0];
      if (!point) return;

      touch.dx = point.pageX - touch.startX;
      touch.dy = point.pageY - touch.startY;

      if (Math.abs(touch.dy) < touchThreshold) return;

      direction = touch.dy > 0 ? "up" : "down";
      handleDirection();
    };

    if (reducedMotion()) {
      gsap.set(sections, { autoAlpha: 0 });
      gsap.set(sections[0], { autoAlpha: 1, zIndex: 1 });
      gsap.set([outerWrappers[0], innerWrappers[0]], { yPercent: 0 });
      current = 0;

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

    element.addEventListener("wheel", handleWheel, { passive: true });
    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: false });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });

    slideIn();

    return () => {
      element.removeEventListener("wheel", handleWheel);
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);

      activeTimeline?.kill();
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

      images.forEach((node, index) => {
        if (!node) return;
        const style = originalImageStyles[index];
        if (style == null) node.removeAttribute("style");
        else node.setAttribute("style", style);
      });

      if (originalRootStyle == null) element.removeAttribute("style");
      else element.setAttribute("style", originalRootStyle);
    };
  }
};
