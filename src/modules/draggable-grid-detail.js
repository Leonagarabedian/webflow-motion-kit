// Adapted from Joffrey Spitzer / Codrops "Smooth, Draggable Product Grid".
// Original source: https://github.com/joffreysp/draggable-grid
// MIT License.

import {
  readBoolean,
  readNumber,
  readString,
  selectTarget,
  selectTargets
} from "../core/config.js";

const DEFAULTS = Object.freeze({
  duration: 1.2,
  ease: "power3.inOut",
  closeDelay: 0.3,
  shiftPercent: -50,
  textDelay: 0.4,
  titleDuration: 1.1,
  titleStagger: 0.025,
  textDuration: 1.1,
  textStagger: 0.05,
  closeTextDuration: 0.6,
  closeOnBackdrop: false
});

function restoreStyle(node, value) {
  if (!node) return;
  if (value == null) node.removeAttribute("style");
  else node.setAttribute("style", value);
}

function findDetail(root, key) {
  return [...root.querySelectorAll("[data-grid-detail]")]
    .find((node) => node.getAttribute("data-grid-detail") === key) || null;
}

function findMedia(item) {
  return (
    item.querySelector('[data-motion-target="detail-media"]') ||
    item.querySelector("img, picture, video")
  );
}

function splitDetail(view, SplitText) {
  if (!SplitText) {
    return {
      titleChars: [],
      textLines: [],
      revert() {}
    };
  }

  const title = view.querySelector('[data-motion-target="detail-title"]');
  const text = view.querySelector('[data-motion-target="detail-text"]');

  const titleSplit = title
    ? new SplitText(title, {
        type: "lines, chars",
        mask: "lines",
        charsClass: "mk-drag-detail-char"
      })
    : null;

  const textSplit = text
    ? new SplitText(text, {
        type: "lines",
        mask: "lines",
        linesClass: "mk-drag-detail-line"
      })
    : null;

  return {
    titleChars: titleSplit?.chars || [],
    textLines: textSplit?.lines || [],
    revert() {
      titleSplit?.revert?.();
      textSplit?.revert?.();
    }
  };
}

export const draggableGridDetail = {
  name: "draggable-grid-detail",
  category: "component",
  selector: '[data-motion~="draggable-grid-detail"]',

  mount(root, { gsap, Flip, SplitText, reducedMotion, logger }) {
    if (!Flip) {
      logger?.warn?.("[MotionKit] draggable-grid-detail requires GSAP Flip.");
      return;
    }

    const panel = selectTarget(root, "detail-panel", null);
    const thumb = panel ? selectTarget(panel, "detail-thumb", null) : null;
    const shell = selectTarget(root, "detail-grid-shell", null);
    const closeTargets = selectTargets(root, "detail-close");
    const items = [...root.querySelectorAll("[data-grid-item]")];
    const details = [...root.querySelectorAll("[data-grid-detail]")];

    if (!panel || !thumb || !shell || !items.length || !details.length) {
      logger?.warn?.(
        "[MotionKit] draggable-grid-detail requires detail-grid-shell, detail-panel, detail-thumb, data-grid-item, and data-grid-detail."
      );
      return;
    }

    const duration = Math.max(
      0,
      readNumber(root, "motion-detail-duration", DEFAULTS.duration)
    );
    const ease = readString(root, "motion-detail-ease", DEFAULTS.ease);
    const closeDelay = Math.max(
      0,
      readNumber(root, "motion-detail-close-delay", DEFAULTS.closeDelay)
    );
    const shiftPercent = readNumber(
      root,
      "motion-detail-shift-percent",
      DEFAULTS.shiftPercent
    );
    const textDelay = Math.max(
      0,
      readNumber(root, "motion-detail-text-delay", DEFAULTS.textDelay)
    );
    const titleDuration = Math.max(
      0,
      readNumber(root, "motion-detail-title-duration", DEFAULTS.titleDuration)
    );
    const titleStagger = Math.max(
      0,
      readNumber(root, "motion-detail-title-stagger", DEFAULTS.titleStagger)
    );
    const textDuration = Math.max(
      0,
      readNumber(root, "motion-detail-text-duration", DEFAULTS.textDuration)
    );
    const textStagger = Math.max(
      0,
      readNumber(root, "motion-detail-text-stagger", DEFAULTS.textStagger)
    );
    const closeTextDuration = Math.max(
      0,
      readNumber(
        root,
        "motion-detail-close-text-duration",
        DEFAULTS.closeTextDuration
      )
    );
    const closeOnBackdrop = readBoolean(
      root,
      "motion-detail-close-on-backdrop",
      DEFAULTS.closeOnBackdrop
    );

    const panelStyle = panel.getAttribute("style");
    const thumbStyle = thumb.getAttribute("style");
    const shellStyle = shell.getAttribute("style");
    const detailStyles = new Map(
      details.map((detail) => [detail, detail.getAttribute("style")])
    );
    const mediaStyles = new Map();
    const itemAria = new Map();
    const detailAria = new Map(
      details.map((detail) => [detail, detail.getAttribute("aria-hidden")])
    );
    const panelAria = panel.getAttribute("aria-hidden");
    const hadOpenClass = root.classList.contains("is-detail-open");

    const splitMap = new Map(
      details.map((detail) => [detail, splitDetail(detail, SplitText)])
    );

    let active = null;
    let open = false;
    let transitioning = false;
    let panelTween = null;
    let shellTween = null;
    let flipTween = null;
    let textTimeline = null;

    gsap.set(panel, {
      xPercent: 100,
      pointerEvents: "none"
    });
    panel.setAttribute("aria-hidden", "true");

    details.forEach((detail) => {
      gsap.set(detail, {
        autoAlpha: 0,
        pointerEvents: "none"
      });
      detail.setAttribute("aria-hidden", "true");

      const split = splitMap.get(detail);
      if (split?.titleChars?.length) {
        gsap.set(split.titleChars, { yPercent: 100 });
      }
      if (split?.textLines?.length) {
        gsap.set(split.textLines, { yPercent: 100 });
      }
    });

    function revealDetail(detail) {
      const split = splitMap.get(detail);

      textTimeline?.kill?.();
      textTimeline = gsap.timeline({ delay: textDelay });

      if (split?.titleChars?.length) {
        textTimeline.to(
          split.titleChars,
          {
            yPercent: 0,
            duration: titleDuration,
            ease,
            stagger: titleStagger
          },
          0
        );
      }

      if (split?.textLines?.length) {
        textTimeline.to(
          split.textLines,
          {
            yPercent: 0,
            duration: textDuration,
            ease,
            stagger: textStagger
          },
          0
        );
      }
    }

    function hideDetailText(detail) {
      const split = splitMap.get(detail);

      textTimeline?.kill?.();
      textTimeline = gsap.timeline();

      if (split?.titleChars?.length) {
        textTimeline.to(
          split.titleChars,
          {
            yPercent: 100,
            duration: closeTextDuration,
            ease,
            stagger: {
              amount: titleStagger,
              from: "end"
            }
          },
          0
        );
      }

      if (split?.textLines?.length) {
        textTimeline.to(
          split.textLines,
          {
            yPercent: 100,
            duration: closeTextDuration,
            ease,
            stagger: textStagger
          },
          0
        );
      }
    }

    function show(item) {
      if (open || transitioning || root.classList.contains("is-dragging")) return;

      const key = item.getAttribute("data-grid-item");
      if (!key) return;

      const detail = findDetail(root, key);
      const media = findMedia(item);

      if (!detail || !media) return;

      const homeParent = media.parentElement;
      const homeNextSibling = media.nextSibling;
      if (!homeParent) return;

      mediaStyles.set(media, media.getAttribute("style"));
      itemAria.set(item, item.getAttribute("aria-expanded"));

      transitioning = true;
      open = true;
      root.classList.add("is-detail-open");
      item.setAttribute("aria-expanded", "true");

      details.forEach((node) => {
        const isActive = node === detail;
        gsap.set(node, {
          autoAlpha: isActive ? 1 : 0,
          pointerEvents: isActive ? "auto" : "none"
        });
        node.setAttribute("aria-hidden", String(!isActive));
      });

      panel.setAttribute("aria-hidden", "false");
      gsap.set(panel, { pointerEvents: "auto" });
      gsap.set(shell, { pointerEvents: "none" });

      const state = Flip.getState(media);
      thumb.appendChild(media);

      flipTween?.kill?.();
      flipTween = Flip.from(state, {
        absolute: true,
        scale: true,
        duration: reducedMotion() ? 0 : duration,
        ease
      });

      shellTween?.kill?.();
      shellTween = gsap.to(shell, {
        xPercent: reducedMotion() ? 0 : shiftPercent,
        duration: reducedMotion() ? 0 : duration,
        ease,
        overwrite: true
      });

      panelTween?.kill?.();
      panelTween = gsap.to(panel, {
        xPercent: 0,
        duration: reducedMotion() ? 0 : duration,
        ease,
        overwrite: true,
        onComplete: () => {
          transitioning = false;
        }
      });

      if (!reducedMotion()) revealDetail(detail);

      active = {
        item,
        detail,
        media,
        homeParent,
        homeNextSibling
      };
    }

    function finishClose(detail) {
      gsap.set(detail, {
        autoAlpha: 0,
        pointerEvents: "none"
      });
      detail.setAttribute("aria-hidden", "true");
      panel.setAttribute("aria-hidden", "true");
      gsap.set(panel, { pointerEvents: "none" });
      gsap.set(shell, { pointerEvents: "" });
      root.classList.remove("is-detail-open");
      transitioning = false;
      open = false;
      active = null;
    }

    function close() {
      if (!open || transitioning || !active) return;

      transitioning = true;

      const { item, detail, media, homeParent, homeNextSibling } = active;
      hideDetailText(detail);

      const state = Flip.getState(media);

      if (homeNextSibling?.parentNode === homeParent) {
        homeParent.insertBefore(media, homeNextSibling);
      } else {
        homeParent.appendChild(media);
      }

      flipTween?.kill?.();
      flipTween = Flip.from(state, {
        absolute: true,
        scale: true,
        duration: reducedMotion() ? 0 : duration,
        delay: reducedMotion() ? 0 : closeDelay,
        ease
      });

      shellTween?.kill?.();
      shellTween = gsap.to(shell, {
        xPercent: 0,
        duration: reducedMotion() ? 0 : duration,
        delay: reducedMotion() ? 0 : closeDelay,
        ease,
        overwrite: true
      });

      panelTween?.kill?.();
      panelTween = gsap.to(panel, {
        xPercent: 100,
        duration: reducedMotion() ? 0 : duration,
        delay: reducedMotion() ? 0 : closeDelay,
        ease,
        overwrite: true,
        onComplete: () => finishClose(detail)
      });

      const originalExpanded = itemAria.get(item);
      if (originalExpanded == null) item.removeAttribute("aria-expanded");
      else item.setAttribute("aria-expanded", originalExpanded);
    }

    const itemListeners = items.map((item) => {
      const listener = () => show(item);
      item.addEventListener("click", listener);
      return listener;
    });

    const closeListeners = closeTargets.map((target) => {
      const listener = (event) => {
        event.preventDefault();
        event.stopPropagation();
        close();
      };
      target.addEventListener("click", listener);
      return listener;
    });

    function onKeyDown(event) {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        close();
      }
    }

    function onWheelCapture(event) {
      if (!open) return;
      event.stopImmediatePropagation();
      if (!panel.contains(event.target)) {
        event.preventDefault();
      }
    }

    function onBackdrop(event) {
      if (
        closeOnBackdrop &&
        open &&
        event.target === panel
      ) {
        close();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    root.addEventListener("wheel", onWheelCapture, {
      passive: false,
      capture: true
    });
    panel.addEventListener("click", onBackdrop);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      root.removeEventListener("wheel", onWheelCapture, { capture: true });
      panel.removeEventListener("click", onBackdrop);

      items.forEach((item, index) => {
        item.removeEventListener("click", itemListeners[index]);
        const originalExpanded = itemAria.get(item);
        if (originalExpanded == null) item.removeAttribute("aria-expanded");
        else item.setAttribute("aria-expanded", originalExpanded);
      });

      closeTargets.forEach((target, index) => {
        target.removeEventListener("click", closeListeners[index]);
      });

      if (active?.media && active.homeParent) {
        const { media, homeParent, homeNextSibling } = active;
        if (homeNextSibling?.parentNode === homeParent) {
          homeParent.insertBefore(media, homeNextSibling);
        } else {
          homeParent.appendChild(media);
        }
      }

      panelTween?.kill?.();
      shellTween?.kill?.();
      flipTween?.kill?.();
      textTimeline?.kill?.();

      splitMap.forEach((split) => split.revert());

      mediaStyles.forEach((style, media) => restoreStyle(media, style));
      detailStyles.forEach((style, detail) => {
        restoreStyle(detail, style);
        const originalAria = detailAria.get(detail);
        if (originalAria == null) detail.removeAttribute("aria-hidden");
        else detail.setAttribute("aria-hidden", originalAria);
      });

      restoreStyle(panel, panelStyle);
      restoreStyle(thumb, thumbStyle);
      restoreStyle(shell, shellStyle);

      if (panelAria == null) panel.removeAttribute("aria-hidden");
      else panel.setAttribute("aria-hidden", panelAria);

      root.classList.toggle("is-detail-open", hadOpenClass);
    };
  }
};
