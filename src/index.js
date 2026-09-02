import { Flip, gsap, ScrollTrigger, SplitText } from "gsap/all";
import "./styles.css";
import { createRuntime } from "./core/runtime.js";
import { createServices } from "./core/services.js";
import { accordionMedia } from "./modules/accordion-media.js";
import { cursor } from "./modules/cursor.js";
import { flipRelocation } from "./modules/flip-relocation.js";
import { imageClip } from "./modules/image-clip.js";
import { lineReveal } from "./modules/line-reveal.js";
import { magnetic } from "./modules/magnetic.js";
import { parallax } from "./modules/parallax.js";
import { pinnedSteps } from "./modules/pinned-steps.js";

gsap.registerPlugin(ScrollTrigger, Flip, SplitText);

const modules = [
  lineReveal,
  imageClip,
  parallax,
  magnetic,
  cursor,
  flipRelocation,
  pinnedSteps,
  accordionMedia
];
const services = createServices({ gsap, ScrollTrigger, Flip, SplitText });
const runtime = createRuntime({ modules, services });

let booted = false;
function boot() {
  runtime.init(document);
  if (!booted) {
    booted = true;
    document.fonts?.ready.then(() => runtime.refresh());
  }
}

const api = {
  destroy: runtime.destroy,
  init: runtime.init,
  refresh: runtime.refresh,
  version: "0.1.0"
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
