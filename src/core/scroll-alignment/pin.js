export function normalizePinConfig(pin) {
  if (!pin) return { enabled: false };
  if (pin === true) return { enabled: true, target: true, spacing: true, anticipate: 0 };
  if (typeof pin === "string" || pin instanceof Element) {
    return { enabled: true, target: pin, spacing: true, anticipate: 0 };
  }
  return {
    enabled: pin.enabled !== false,
    target: pin.target ?? true,
    spacing: pin.spacing ?? true,
    anticipate: Number(pin.anticipate ?? 0)
  };
}

export function resolvePinTarget(root, pinConfig) {
  if (!pinConfig?.enabled) return false;
  const target = pinConfig.target;
  if (target === true) return true;
  if (target instanceof Element) return target;
  if (typeof target === "string") {
    return root.querySelector(target) || root.closest(target) || document.querySelector(target) || true;
  }
  return true;
}

export function warnOnNestedPin({ trigger, pin, ScrollTrigger, logger = console }) {
  if (!pin || !ScrollTrigger?.getAll) return;
  const existing = ScrollTrigger.getAll().find((instance) => {
    const pinned = instance.pin;
    return pinned && pinned !== pin && (pinned.contains?.(trigger) || trigger.contains?.(pinned));
  });
  if (existing) {
    logger.warn("[MotionKit] Nested pin relationship detected", { trigger, pin, existing });
  }
}
