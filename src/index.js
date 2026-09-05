import {
  DrawSVGPlugin,
  Flip,
  gsap,
  MorphSVGPlugin,
  ScrambleTextPlugin,
  ScrollSmoother,
  ScrollToPlugin,
  ScrollTrigger,
  SplitText
} from "gsap/all";

import "./styles.css";
import { createRuntime } from "./core/runtime.js";
import { createServices } from "./core/services.js";
import { motionTokens } from "./core/tokens.js";
import { modules } from "./modules/registry.js";

gsap.registerPlugin(
  ScrollTrigger,
  ScrollSmoother,
  ScrollToPlugin,
  Flip,
  SplitText,
  ScrambleTextPlugin,
  DrawSVGPlugin,
  MorphSVGPlugin
);

const services = createServices({
  DrawSVGPlugin,
  gsap,
  ScrollTrigger,
  Flip,
  MorphSVGPlugin,
  ScrambleTextPlugin,
  SplitText
});
const runtime = createRuntime({ modules, services });

let booted = false;
let smoother = null;

function boot() {
  if (
    !smoother &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    smoother = ScrollSmoother.create({
      content: ".page-wrapper",
      smooth: 0.8,
      effects: true,
      smoothTouch: 0
    });
  }

  runtime.init(document);

  if (!booted) {
    booted = true;
    document.fonts?.ready.then(() => runtime.refresh());
  }
}


const api = {
  destroy: runtime.destroy,
  init: runtime.init,
  moduleInventory: modules.map(({ category, name }) => ({ category, name })),
  modules: modules.map(({ name }) => name),
  refresh: runtime.refresh,
  tokens: motionTokens,
  version: "0.4.2"
};

window.WebflowMotionKit = api;
window.Webflow = window.Webflow || [];
window.Webflow.push(boot);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  queueMicrotask(boot);
}

window.addEventListener("motion:init", (event) =>
  api.init(event.detail?.root ?? document)
);
window.addEventListener("motion:destroy", (event) =>
  api.destroy(event.detail?.root ?? document)
);
window.addEventListener("motion:refresh", () => api.refresh());

export { api as WebflowMotionKit };
