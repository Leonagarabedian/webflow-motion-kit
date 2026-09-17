/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";

import {
  auditScrollAlignment,
  migrationAuditPolicy
} from "../src/core/scroll-alignment/migration-audit.js";

describe("motion migration strategy policy", () => {
  it("classifies the production specialized modules with explicit strategies", () => {
    expect(migrationAuditPolicy.specializedReady).toMatchObject({
      "scroll-synced-gallery": "crossing-line",
      "element-blur-reveal": "synced-progress",
      "scroll-travel": "measured-travel",
      "liquid-fill": "dynamic-span",
      "synced-fade": "synced-progress",
      "element-layout-return": "synced-progress",
      "depth-emerge": "synced-progress"
    });
  });

  it("classifies the current custom spatial compositions instead of treating them as generic auto", () => {
    expect(migrationAuditPolicy.customReady).toMatchObject({
      "hero-heart-transition": "custom-pinned-span",
      "branda-spatial-works": "custom-spatial-span",
      "character-scatter-title": "velocity-timeline"
    });
  });

  it("reports no unclassified entries for the current Home motion stack", () => {
    document.body.innerHTML = `
      <div data-motion="hero-heart-transition"></div>
      <div data-motion="scroll-travel liquid-fill"></div>
      <div data-motion="works-services-transition"></div>
      <div data-motion="character-converge synced-fade"></div>
      <div data-motion="branda-spatial-works"></div>
      <div data-motion="depth-emerge element-layout-return"></div>
      <div data-motion="hover-highlight-box element-blur-reveal"></div>
      <div data-motion="text-reveal" data-motion-alignment="auto"></div>
      <div data-motion="grid-video-reveal"></div>
      <div data-motion="character-scatter-title"></div>
      <div data-motion="line-reveal" data-motion-alignment="auto"></div>
    `;

    const report = auditScrollAlignment(document);
    expect(report.unclassified).toEqual([]);
    expect(report.entries.find((entry) => entry.name === "scroll-synced-gallery")).toBeUndefined();
    expect(report.entries.find((entry) => entry.name === "branda-spatial-works")?.strategy).toBe("custom-spatial-span");
    expect(report.entries.find((entry) => entry.name === "liquid-fill")?.strategy).toBe("dynamic-span");
  });

  it("keeps velocity and pointer interactions outside viewport alignment", () => {
    document.body.innerHTML = `
      <div data-motion="pinned-media-return"></div>
      <div data-motion="grid-video-reveal"></div>
      <div data-motion="accordion-media"></div>
    `;
    const report = auditScrollAlignment(document);
    expect(report.entries.every((entry) => entry.status === "non-scroll")).toBe(true);
  });
});

it("distinguishes manual scroll, native sticky layout, and optional viewport loading", () => {
  document.body.innerHTML = `
    <div data-motion="theme-switch services-center-shift footer-reveal"></div>
    <div data-motion="media-room tags-glitch flip-relocation stacked-cards"></div>
    <div data-motion="looping-labels stacked-image-hover brand-load"></div>
    <div data-motion="brand-load" data-motion-on-view="true"></div>
    <div data-motion="brand-load" data-motion-on-view="1"></div>
    <div data-motion="brand-load" data-motion-on-view></div>
  `;
  const report = auditScrollAlignment(document);
  expect(report.unclassified).toEqual([]);
  expect(report.manualScroll).toHaveLength(6);
  expect(report.entries.find(entry => entry.name === "stacked-cards").strategy).toBe("native-sticky-layout");
  expect(report.entries.filter(entry => entry.name === "brand-load").map(entry => entry.status)).toEqual(["non-scroll", "manual-scroll", "manual-scroll", "manual-scroll"]);
});
