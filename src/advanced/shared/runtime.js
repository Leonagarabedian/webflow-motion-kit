function matches(root, selector) {
  const elements = [];
  if (root instanceof Element && root.matches(selector)) elements.push(root);
  elements.push(...root.querySelectorAll(selector));
  return elements;
}

export function createAdvancedPackage({ mount, name, selector }) {
  const mounted = new WeakMap();
  const records = new Set();

  const api = {
    destroy(root = document) {
      for (const record of [...records]) {
        if (root !== document && root !== record.element && !root.contains(record.element)) {
          continue;
        }
        record.cleanup?.();
        mounted.delete(record.element);
        records.delete(record);
      }
      return api;
    },
    init(root = document) {
      for (const element of matches(root, selector)) {
        if (mounted.has(element)) continue;
        try {
          const cleanup = mount(element) || (() => {});
          const record = { cleanup, element };
          mounted.set(element, record);
          records.add(record);
        } catch (error) {
          console.error(`[MotionAdvanced] ${name} failed`, element, error);
        }
      }
      return api;
    },
    name,
    version: "0.4.2"
  };

  window.WebflowMotionAdvanced = window.WebflowMotionAdvanced || {};
  window.WebflowMotionAdvanced[name] = api;
  window.Webflow = window.Webflow || [];
  window.Webflow.push(() => api.init(document));
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => api.init(document), { once: true });
  } else {
    queueMicrotask(() => api.init(document));
  }
  return api;
}
