import { resolveOffset } from "./geometry.js";

export function resolveSpan(span, context = {}) {
  if (typeof span === "function") return Math.max(0, Number(span(context)) || 0);
  if (typeof span === "number") return Math.max(0, span);
  if (!span) return 0;

  const raw = String(span).trim();
  if (raw.startsWith("+=")) return resolveSpan(raw.slice(2), context);
  if (raw === "element") return Math.max(0, context.element?.height || 0);
  if (raw.startsWith("element*")) {
    const factor = Number.parseFloat(raw.slice("element*".length));
    return Math.max(0, (context.element?.height || 0) * (Number.isFinite(factor) ? factor : 1));
  }
  return Math.max(0, resolveOffset(raw, context));
}

export function computeAlignedEnd({ start, span, context }) {
  return start + resolveSpan(span, context);
}
