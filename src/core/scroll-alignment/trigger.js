export function resolveAlignmentTrigger(root, target) {
  if (!target || target === "self") return root;
  if (target instanceof Element) return target;
  if (typeof target === "function") return target(root) || root;
  const selector = String(target);
  return root.querySelector(selector) || root.closest(selector) || document.querySelector(selector) || root;
}

export function buildLegacyTriggerConfig(config = {}) {
  return {
    trigger: config.trigger,
    start: config.start,
    end: config.end,
    scrub: config.scrub,
    pin: config.pin,
    pinSpacing: config.pinSpacing,
    anticipatePin: config.anticipatePin,
    invalidateOnRefresh: config.invalidateOnRefresh,
    id: config.id,
    markers: config.markers
  };
}
