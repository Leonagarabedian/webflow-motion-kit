export function readString(element, name, fallback) {
  const value = element.getAttribute(`data-${name}`);
  return value == null || value === "" ? fallback : value;
}

export function readNumber(element, name, fallback) {
  const value = Number.parseFloat(element.getAttribute(`data-${name}`));
  return Number.isFinite(value) ? value : fallback;
}

export function readBoolean(element, name, fallback = false) {
  const value = element.getAttribute(`data-${name}`);
  if (value == null) return fallback;
  if (value === "" || value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return fallback;
}

export function selectTarget(root, role, fallback = root) {
  return root.querySelector(`[data-motion-target="${role}"]`) ?? fallback;
}

export function selectTargets(root, role) {
  return [...root.querySelectorAll(`[data-motion-target="${role}"]`)];
}

export function resolveTrigger(root) {
  const selector = readString(root, "motion-trigger", null);
  if (!selector) return root;
  return root.closest(selector) ?? document.querySelector(selector) ?? root;
}
