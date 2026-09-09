import { readNumber, readString } from "../core/config.js";

const DEFAULTS = Object.freeze({
  introSelector: ".services-intro",
  listSelector: ".services-list",
  cardSelector: ".services-row",
  start: "top 88%",
  end: "top 28%",
  scrub: 1,
  introXPercent: 50,
  introY: 18,
  blur: 18,
  cardsY: 28,
  cardStagger: 0.07
});

export const servicesCenterShift = {
  name: "services-center-shift",
  category: "composition",
  selector: '[data-motion~="services-center-shift"]',

  mount(root, { gsap, ScrollTrigger, reducedMotion }) {
    const intro = root.querySelector(readString(root, "motion-intro-selector", DEFAULTS.introSelector));
    const list = root.querySelector(readString(root, "motion-list-selector", DEFAULTS.listSelector));
    const cards = Array.from(
      root.querySelectorAll(readString(root, "motion-card-selector", DEFAULTS.cardSelector))
    );

    if (!intro || !list || !cards.length) return;

    if (reducedMotion()) {
      gsap.set([intro, list, ...cards], { clearProps: "transform,filter,opacity,visibility" });
      return;
    }

    const initialIntroStyle = intro.getAttribute("style");
    const initialListStyle = list.getAttribute("style");
    const initialCardStyles = cards.map((card) => card.getAttribute("style"));

    const introXPercent = readNumber(root, "motion-intro-x-percent", DEFAULTS.introXPercent);
    const introY = readNumber(root, "motion-intro-y", DEFAULTS.introY);
    const blur = Math.max(0, readNumber(root, "motion-card-blur", DEFAULTS.blur));
    const cardsY = readNumber(root, "motion-card-y", DEFAULTS.cardsY);
    const cardStagger = Math.max(0, readNumber(root, "motion-card-stagger", DEFAULTS.cardStagger));
    const start = readString(root, "motion-start", DEFAULTS.start);
    const end = readString(root, "motion-end", DEFAULTS.end);
    const scrub = readNumber(root, "motion-scrub", DEFAULTS.scrub);

    gsap.set(intro, {
      xPercent: introXPercent,
      y: introY,
      autoAlpha: 0,
      willChange: "transform, opacity"
    });

    gsap.set(list, {
      willChange: "transform, opacity, filter"
    });

    gsap.set(cards, {
      y: cardsY,
      autoAlpha: 0,
      filter: `blur(${blur}px)`,
      willChange: "transform, opacity, filter"
    });

    const timeline = gsap.timeline({
      scrollTrigger: {
        id: "mk-services-center-shift",
        trigger: root,
        start,
        end,
        scrub,
        invalidateOnRefresh: true
      }
    });

    timeline
      .to(intro, {
        xPercent: 0,
        y: 0,
        autoAlpha: 1,
        ease: "none",
        duration: 0.58
      }, 0)
      .to(cards, {
        y: 0,
        autoAlpha: 1,
        filter: "blur(0px)",
        ease: "none",
        stagger: cardStagger,
        duration: 0.42
      }, 0.3);

    return () => {
      timeline.scrollTrigger?.kill();
      timeline.kill();

      if (initialIntroStyle == null) intro.removeAttribute("style");
      else intro.setAttribute("style", initialIntroStyle);

      if (initialListStyle == null) list.removeAttribute("style");
      else list.setAttribute("style", initialListStyle);

      cards.forEach((card, index) => {
        const style = initialCardStyles[index];
        if (style == null) card.removeAttribute("style");
        else card.setAttribute("style", style);
      });
    };
  }
};
