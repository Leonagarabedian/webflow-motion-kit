import "./styles.css";
import { gsap, plugins } from "./core/gsap.js";
import {
  destroyPageScroll,
  getPageScroll,
  initPageScroll
} from "./core/page-scroll.js";
import { createRuntime } from "./core/runtime.js";
import { createServices } from "./core/services.js";
import { motionTokens } from "./core/tokens.js";
import { modules } from "./modules/registry.js";

const services = createServices({ gsap, plugins });
const runtime = createRuntime({ modules, services });
let booted = false;

function boot() {
  initPageScroll({ ScrollSmoother: plugins.ScrollSmoother }, document);
  runtime.init(document);

  if (!booted) {
    booted = true;
    document.fonts?.ready.then(() => runtime.refresh());
  }
}

function destroy(root = document) {
  runtime.destroy(root);
  if (root === document) destroyPageScroll();
  return api;
}

function init(root = document) {
  if (root === document) {
    initPageScroll({ ScrollSmoother: plugins.ScrollSmoother }, document);
  }
  runtime.init(root);
  return api;
}

const api = {
  destroy,
  init,
  moduleInventory: modules.map(({ category, name }) => ({ category, name })),
  modules: modules.map(({ name }) => name),
  pluginInventory: Object.keys(plugins),
  plugins,
  refresh: runtime.refresh,
  scroll: {
    destroy: destroyPageScroll,
    get: getPageScroll,
    init: (root = document) =>
      initPageScroll({ ScrollSmoother: plugins.ScrollSmoother }, root)
  },
  tokens: motionTokens,
  version: "0.5.0"
};

window.WebflowMotionKit = api;

function scheduleBoot() {
  window.Webflow = window.Webflow || [];
  if (typeof window.Webflow.push === "function") {
    window.Webflow.push(boot);
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    queueMicrotask(boot);
  }
}

scheduleBoot();

window.addEventListener("motion:init", (event) =>
  api.init(event.detail?.root ?? document)
);
window.addEventListener("motion:destroy", (event) =>
  api.destroy(event.detail?.root ?? document)
);
window.addEventListener("motion:refresh", () => api.refresh());

export { api as WebflowMotionKit };
