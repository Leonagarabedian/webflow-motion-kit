import { resolveMotionToken } from "./tokens.js";

function tokenGroupForNumber(name) {
  if (name.includes("duration") || name === "motion-follow") return "duration";
  if (name.includes("stagger")) return "stagger";
  if (
    name === "motion-y" ||
    name === "motion-max" ||
    name === "motion-stack-offset"
  ) {
    return "distance";
  }
  return null;
}

export function readString(element, name, fallback) {
  const value = element.getAttribute(`data-${name}`);
  if (value == null || value === "") return fallback;
  if (name.includes("ease")) return resolveMotionToken("easing", value, value);
  return value;
}

export function readNumber(element, name, fallback) {
  const raw = element.getAttribute(`data-${name}`);
  const value = Number.parseFloat(raw);
  if (Number.isFinite(value)) return value;

  const token = resolveMotionToken(tokenGroupForNumber(name), raw, null);
  return typeof token === "number" ? token : fallback;
}

export function readBoolean(element, name, fallback = false) {
  const value = element.getAttribute(`data-${name}`);
  if (value == null) return fallback;
  if (value === "" || value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return fallback;
}

export function readList(element, name, fallback = []) {
  const value = element.getAttribute(`data-${name}`);
  if (!value) return fallback;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
