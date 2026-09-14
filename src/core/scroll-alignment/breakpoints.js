export const ALIGNMENT_BREAKPOINTS = {
  desktop: "(min-width: 992px)",
  tablet: "(min-width: 768px) and (max-width: 991px)",
  mobileLandscape: "(min-width: 480px) and (max-width: 767px)",
  mobile: "(max-width: 479px)"
};

export function getActiveBreakpoint(win = window) {
  if (win.matchMedia?.(ALIGNMENT_BREAKPOINTS.desktop).matches) return "desktop";
  if (win.matchMedia?.(ALIGNMENT_BREAKPOINTS.tablet).matches) return "tablet";
  if (win.matchMedia?.(ALIGNMENT_BREAKPOINTS.mobileLandscape).matches) return "mobileLandscape";
  return "mobile";
}

export function resolveBreakpointConfig(config = {}, win = window) {
  const breakpoint = getActiveBreakpoint(win);
  const overrides = config.breakpoints?.[breakpoint] ?? {};
  return {
    breakpoint,
    config: { ...config, ...overrides, breakpoints: config.breakpoints }
  };
}
