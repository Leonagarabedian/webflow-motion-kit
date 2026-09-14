export function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

export function crossingLinePosition(activation = 50, win = window) {
  const percent = Math.max(0, Math.min(100, Number(activation) || 0));
  return win.innerHeight * (percent / 100);
}

export function createCrossingLineTriggers({
  ScrollTrigger,
  triggers,
  activation = 50,
  onEnter,
  onEnterBack,
  onUpdate
}) {
  const line = `${Math.max(0, Math.min(100, Number(activation) || 0))}%`;
  return triggers.map((trigger, index) =>
    ScrollTrigger.create({
      trigger,
      start: `top ${line}`,
      end: `bottom ${line}`,
      onEnter: () => onEnter?.(index, trigger),
      onEnterBack: () => onEnterBack?.(index, trigger),
      onUpdate: (self) => onUpdate?.(index, trigger, self)
    })
  );
}

export function findNearestCrossingIndex(triggers, activation = 50, win = window) {
  const activationY = crossingLinePosition(activation, win);
  let bestIndex = 0;
  let bestDistance = Infinity;

  triggers.forEach((trigger, index) => {
    const rect = trigger.getBoundingClientRect();
    const inside = rect.top <= activationY && rect.bottom >= activationY;
    const distance = inside
      ? 0
      : Math.min(Math.abs(rect.top - activationY), Math.abs(rect.bottom - activationY));
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

export function crossingLineProgress(trigger, activation = 50, win = window) {
  if (!trigger) return 0;
  const rect = trigger.getBoundingClientRect();
  const activationY = crossingLinePosition(activation, win);
  return clamp01((activationY - rect.top) / Math.max(1, rect.height));
}

export function syncedProgress(progress, start = 0, end = 1) {
  const safeStart = clamp01(start);
  const safeEnd = Math.max(safeStart + 0.0001, clamp01(end));
  return clamp01((progress - safeStart) / (safeEnd - safeStart));
}

export function measuredTravelDistance({
  element,
  container,
  axis = "y",
  bottomOffset = 0,
  direction = 1,
  explicitDistance = null,
  getStyles = (node) => getComputedStyle(node)
}) {
  const configured = Number.parseFloat(explicitDistance);
  if (Number.isFinite(configured)) return configured * direction;

  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  if (axis === "x") {
    return Math.max(0, containerRect.right - elementRect.right - bottomOffset) * direction;
  }

  const paddingBottom = parseFloat(getStyles(container).paddingBottom) || 0;
  return Math.max(
    0,
    containerRect.bottom - paddingBottom - bottomOffset - elementRect.bottom
  ) * direction;
}
