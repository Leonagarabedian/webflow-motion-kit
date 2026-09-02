export function string(element, name, fallback) {
  const value = element.getAttribute(`data-${name}`);
  return value == null || value === "" ? fallback : value;
}

export function number(element, name, fallback) {
  const value = Number.parseFloat(element.getAttribute(`data-${name}`));
  return Number.isFinite(value) ? value : fallback;
}

export function boolean(element, name, fallback = false) {
  const value = element.getAttribute(`data-${name}`);
  if (value == null) return fallback;
  if (value === "" || value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return fallback;
}

export function target(element, role) {
  return element.querySelector(`[data-advanced-target="${role}"]`);
}

export function targets(element, role) {
  return [...element.querySelectorAll(`[data-advanced-target="${role}"]`)];
}

export function reducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function restoreStyle(element, value) {
  if (!element) return;
  if (value == null) element.removeAttribute("style");
  else element.setAttribute("style", value);
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
