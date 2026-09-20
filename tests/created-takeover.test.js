/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { mountCreatedTakeover } from '../src/modules/scroll/created-takeover.js';

function fixture() {
  document.body.innerHTML = '<section><div data-motion-target="takeover-frame"><div data-motion-target="takeover-field" style="color:red">Panel</div><div data-motion-target="takeover-boundary"><img></div></div></section>';
  const root = document.querySelector('section');
  const frame = root.querySelector('[data-motion-target="takeover-frame"]');
  const panel = root.querySelector('[data-motion-target="takeover-field"]');
  const portrait = root.querySelector('[data-motion-target="takeover-boundary"]');
  let width = 1000;
  Object.defineProperty(frame, 'clientWidth', { get: () => width });
  Object.defineProperty(frame, 'clientHeight', { get: () => 600 });
  frame.getBoundingClientRect = () => ({ left: 20, top: 200, width, height: 600 });
  panel.getBoundingClientRect = () => ({ left: 20, top: 200, width: width / 2, height: 500 });
  portrait.getBoundingClientRect = () => ({ left: 20 + width / 2, top: 200, width: width / 2, height: 600 });
  let mediaCleanup, driver, vars;
  const tween = { kill: vi.fn(), scrollTrigger: { kill: vi.fn() } };
  const gsap = {
    matchMedia: () => ({ add: (_query, callback) => { mediaCleanup = callback(); }, revert: () => mediaCleanup?.() }),
    set: vi.fn(),
    to: vi.fn((target, options) => { driver = target; vars = options; return tween; })
  };
  const stop = mountCreatedTakeover(root, { gsap, ScrollTrigger: { refresh: vi.fn() } });
  return { root, frame, panel, portrait, gsap, tween, stop, resize: value => { width = value; }, get driver() { return driver; }, get vars() { return vars; } };
}

describe('Created takeover', () => {
  it('leaves markup untouched when required targets are missing', () => {
    document.body.innerHTML = '<section></section>';
    const gsap = { matchMedia: vi.fn() };
    const cleanup = mountCreatedTakeover(document.querySelector('section'), { gsap });
    expect(gsap.matchMedia).not.toHaveBeenCalled();
    cleanup();
  });

  it('keeps both elements inside one frame and aligns their movement', () => {
    const c = fixture();
    for (const p of [0, 0.5, 1]) {
      c.driver.value = p;
      c.vars.onUpdate();
      const calls = c.gsap.set.mock.calls;
      const panel = calls.filter(([el]) => el === c.panel).at(-1)[1];
      const portrait = calls.filter(([el]) => el === c.portrait).at(-1)[1];
      expect(panel.width).toBe(500 + 500 * p);
      expect(portrait.x).toBe(500 * p);
      expect(panel.height).toBeLessThanOrEqual(600);
      expect(c.panel.parentElement).toBe(c.frame);
      expect(c.portrait.parentElement).toBe(c.frame);
    }
    expect(c.vars.scrollTrigger.pin).toBeUndefined();
    c.stop();
  });

  it('remeasures on refresh and restores authored styles on cleanup', () => {
    const c = fixture();
    c.resize(1200);
    c.vars.scrollTrigger.onRefreshInit();
    c.driver.value = 0.5;
    c.vars.onUpdate();
    expect(c.gsap.set).toHaveBeenCalledWith(c.panel, expect.objectContaining({ width: 900 }));
    expect(c.gsap.set).toHaveBeenCalledWith(c.portrait, { x: 300 });
    c.driver.value = 0;
    c.vars.onUpdate();
    expect(c.gsap.set).toHaveBeenCalledWith(c.panel, expect.objectContaining({ width: 600 }));
    c.stop();
    expect(c.panel.getAttribute('style')).toBe('color:red');
    expect(c.root.querySelector('[data-created-placeholder]')).toBeNull();
    expect(c.tween.kill).toHaveBeenCalled();
    expect(c.tween.scrollTrigger.kill).toHaveBeenCalled();
  });
});
