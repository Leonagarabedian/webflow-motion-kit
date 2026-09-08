import { readNumber, readString } from "../core/config.js";

function restoreAttribute(element, name, value) {
  if (!element) return;
  if (value == null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}

export const scrollSync = {
  name: "scroll-sync",
  category: "component",
  selector: '[data-motion~="scroll-sync"]',

  mount(element, { gsap, ScrollTrigger, reducedMotion }) {
    const triggerSelector = readString(
      element,
      "motion-sync-trigger-selector",
      "[data-motion-sync-trigger]"
    );
    const navSelector = readString(
      element,
      "motion-sync-nav-selector",
      "[data-motion-sync-nav]"
    );
    const mediaSelector = readString(
      element,
      "motion-sync-media-selector",
      "[data-motion-sync-media]"
    );
    const sourceLinkSelector = readString(
      element,
      "motion-sync-source-link-selector",
      "[data-motion-sync-source-link]"
    );
    const targetLinkSelector = readString(
      element,
      "motion-sync-target-link-selector",
      "[data-motion-sync-target-link]"
    );

    const triggers = [...element.querySelectorAll(triggerSelector)];
    const navItems = [...element.querySelectorAll(navSelector)];
    const mediaItems = [...element.querySelectorAll(mediaSelector)];
    const targetLink = element.querySelector(targetLinkSelector);

    if (triggers.length < 2) return;

    const count = Math.min(
      triggers.length,
      navItems.length || triggers.length,
      mediaItems.length || triggers.length
    );
    if (count < 2) return;

    const minWidth = readNumber(element, "motion-min-width", 992);
    const activeClass = readString(element, "motion-active-class", "is-active");
    const duration = readNumber(element, "motion-duration", 0.45);
    const ease = readString(element, "motion-ease", "power3.out");
    const activation = Math.max(
      5,
      Math.min(95, readNumber(element, "motion-activation", 55))
    );
    const mediaY = readNumber(element, "motion-media-y", 3);
    const inactiveOpacity = Math.max(
      0,
      Math.min(1, readNumber(element, "motion-inactive-opacity", 0.32))
    );

    const originalNavClasses = navItems.map((item) => item.classList.contains(activeClass));
    const originalNavStyles = navItems.map((item) => item.getAttribute("style"));
    const originalMediaClasses = mediaItems.map((item) => item.classList.contains(activeClass));
    const originalMediaStyles = mediaItems.map((item) => item.getAttribute("style"));
    const originalHref = targetLink?.getAttribute("href") ?? null;
    const originalAriaCurrent = navItems.map((item) => item.getAttribute("aria-current"));

    let activeIndex = -1;
    let transitionTimeline = null;

    const syncLink = (index) => {
      if (!targetLink) return;
      const sourceLink = triggers[index]?.querySelector(sourceLinkSelector);
      const href = sourceLink?.getAttribute("href");
      if (href) targetLink.setAttribute("href", href);
      else targetLink.removeAttribute("href");
    };

    const apply = (index, animate = true) => {
      if (index < 0 || index >= count || index === activeIndex) return;
      const previous = activeIndex;
      activeIndex = index;

      navItems.forEach((item, itemIndex) => {
        const active = itemIndex === index;
        item.classList.toggle(activeClass, active);
        if (active) item.setAttribute("aria-current", "true");
        else item.removeAttribute("aria-current");
      });

      syncLink(index);

      if (reducedMotion() || !animate) {
        navItems.forEach((item, itemIndex) => {
          gsap.set(item, { opacity: itemIndex === index ? 1 : inactiveOpacity });
        });
        mediaItems.forEach((item, itemIndex) => {
          const active = itemIndex === index;
          item.classList.toggle(activeClass, active);
          gsap.set(item, {
            autoAlpha: active ? 1 : 0,
            yPercent: 0,
            zIndex: active ? 2 : 1
          });
        });
        return;
      }

      transitionTimeline?.kill();
      transitionTimeline = gsap.timeline({ defaults: { overwrite: true } });

      navItems.forEach((item, itemIndex) => {
        transitionTimeline.to(
          item,
          {
            duration: duration * 0.7,
            ease,
            opacity: itemIndex === index ? 1 : inactiveOpacity
          },
          0
        );
      });

      if (previous >= 0 && mediaItems[previous]) {
        mediaItems[previous].classList.remove(activeClass);
        transitionTimeline.to(
          mediaItems[previous],
          {
            autoAlpha: 0,
            duration,
            ease,
            yPercent: -mediaY,
            zIndex: 1
          },
          0
        );
      }

      if (mediaItems[index]) {
        mediaItems[index].classList.add(activeClass);
        transitionTimeline.fromTo(
          mediaItems[index],
          {
            autoAlpha: 0,
            yPercent: mediaY,
            zIndex: 2
          },
          {
            autoAlpha: 1,
            duration,
            ease,
            yPercent: 0,
            zIndex: 2
          },
          0.03
        );
      }
    };

    const mm = gsap.matchMedia();
    mm.add(
      {
        desktop: `(min-width: ${minWidth}px)`,
        reduceMotion: "(prefers-reduced-motion: reduce)"
      },
      ({ conditions }) => {
        if (!conditions.desktop) return;

        mediaItems.forEach((item, index) => {
          gsap.set(item, {
            autoAlpha: index === 0 ? 1 : 0,
            yPercent: 0,
            zIndex: index === 0 ? 2 : 1
          });
        });
        navItems.forEach((item, index) => {
          gsap.set(item, { opacity: index === 0 ? 1 : inactiveOpacity });
        });
        apply(0, false);

        const start = `top ${activation}%`;
        const end = `bottom ${activation}%`;
        const instances = triggers.slice(0, count).map((trigger, index) =>
          ScrollTrigger.create({
            trigger,
            start,
            end,
            onEnter: () => apply(index),
            onEnterBack: () => apply(index)
          })
        );

        return () => {
          instances.forEach((instance) => instance.kill());
          transitionTimeline?.kill();
        };
      }
    );

    return () => {
      mm.revert();
      transitionTimeline?.kill();
      navItems.forEach((item, index) => {
        item.classList.toggle(activeClass, originalNavClasses[index]);
        restoreAttribute(item, "style", originalNavStyles[index]);
        restoreAttribute(item, "aria-current", originalAriaCurrent[index]);
      });
      mediaItems.forEach((item, index) => {
        item.classList.toggle(activeClass, originalMediaClasses[index]);
        restoreAttribute(item, "style", originalMediaStyles[index]);
      });
      restoreAttribute(targetLink, "href", originalHref);
    };
  }
};
