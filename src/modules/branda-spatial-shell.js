const STYLE_ID = "motion-kit-branda-spatial-shell-styles";
const SELECTOR = "[data-branda-spatial-shell]";

function ensureStyles(doc) {
  if (doc.getElementById(STYLE_ID)) return;

  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    ${SELECTOR} {
      position: relative;
      min-height: var(--branda-spatial-height, 320svh);
    }

    @media screen and (max-width: 767px) {
      ${SELECTOR} {
        min-height: var(--branda-spatial-height-mobile, var(--branda-spatial-height, 320svh));
      }
    }
  `;
  doc.head.appendChild(style);
}

export const brandaSpatialShell = {
  name: "branda-spatial-shell",
  category: "composition",
  selector: SELECTOR,
  mount(root) {
    ensureStyles(root.ownerDocument);
  }
};
