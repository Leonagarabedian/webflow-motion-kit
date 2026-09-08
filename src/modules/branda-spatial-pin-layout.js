const STYLE_ID = "motion-kit-branda-spatial-pin-layout-styles";
const PIN_SELECTOR = "[data-branda-spatial-pin]";
const STAGE_SELECTOR = '[data-motion~="branda-spatial-works"]';

function ensureStyles(doc) {
  if (doc.getElementById(STYLE_ID)) return;

  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    ${PIN_SELECTOR} {
      height: 100svh;
      min-height: 100svh;
      box-sizing: border-box;
      padding-top: clamp(2rem, 5svh, 4rem);
      padding-bottom: clamp(2rem, 4svh, 3rem);
      overflow: hidden;
    }

    ${PIN_SELECTOR} > .work-title {
      flex: 0 0 auto;
      margin-bottom: clamp(1rem, 2.5svh, 2rem);
    }

    ${PIN_SELECTOR} ${STAGE_SELECTOR} {
      flex: 1 1 auto;
      height: auto;
      min-height: 0;
    }

    @media screen and (max-width: 767px) {
      ${PIN_SELECTOR} {
        padding-top: clamp(1.5rem, 4svh, 2.5rem);
        padding-bottom: clamp(1.5rem, 3svh, 2rem);
      }

      ${PIN_SELECTOR} > .work-title {
        margin-bottom: clamp(0.75rem, 2svh, 1.25rem);
      }
    }
  `;
  doc.head.appendChild(style);
}

export const brandaSpatialPinLayout = {
  name: "branda-spatial-pin-layout",
  category: "composition",
  selector: PIN_SELECTOR,
  mount(root) {
    ensureStyles(root.ownerDocument);
  }
};
