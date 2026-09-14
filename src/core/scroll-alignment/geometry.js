export function measureElement(element, win = window) {
  const rect = element.getBoundingClientRect();
  const scrollY = win.scrollY || win.pageYOffset || 0;
  return {
    rect,
    top: rect.top + scrollY,
    bottom: rect.bottom + scrollY,
    left: rect.left,
    right: rect.right,
    width: rect.width,
    height: rect.height,
    centerY: rect.top + scrollY + rect.height / 2
  };
}

export function getViewportMetrics(win = window) {
  return {
    width: win.innerWidth,
    height: win.innerHeight,
    scrollY: win.scrollY || win.pageYOffset || 0
  };
}

export function resolveOffset(value, context = {}) {
  if (typeof value === "function") return Number(value(context)) || 0;
  if (typeof value === "number") return value;
  if (!value) return 0;
  const raw = String(value).trim();
  if (raw.endsWith("vh")) return (parseFloat(raw) / 100) * context.viewportHeight;
  if (raw.endsWith("vw")) return (parseFloat(raw) / 100) * context.viewportWidth;
  if (raw.endsWith("px")) return parseFloat(raw) || 0;
  return Number.parseFloat(raw) || 0;
}

export function getDocumentYForEdge(measurement, edge = "top") {
  if (edge === "bottom") return measurement.bottom;
  if (edge === "center") return measurement.centerY;
  return measurement.top;
}

export function resolveViewportLine(viewport, viewportLine = 0.7) {
  const normalized = viewportLine > 1 ? viewportLine / 100 : viewportLine;
  return viewport.height * normalized;
}

export function computeAlignedStart({
  trigger,
  anchor = "top",
  viewport = 0.7,
  offset = 0,
  headerOffset = 0,
  win = window
}) {
  const element = measureElement(trigger, win);
  const viewportMetrics = getViewportMetrics(win);
  const context = {
    element,
    viewportHeight: viewportMetrics.height,
    viewportWidth: viewportMetrics.width,
    scrollY: viewportMetrics.scrollY
  };
  const anchorY = getDocumentYForEdge(element, anchor);
  const viewportY = resolveViewportLine(viewportMetrics, viewport);
  const extra = resolveOffset(offset, context) + resolveOffset(headerOffset, context);
  return anchorY - viewportY - extra;
}
