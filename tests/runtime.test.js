import { describe, expect, it, vi } from "vitest";
import { createRuntime } from "../src/core/runtime.js";

describe("motion runtime", () => {
  it("mounts once, supports scoped destroy, and can remount", () => {
    document.body.innerHTML = `
      <section id="one"><div data-motion="fake"></div></section>
      <section id="two"><div data-motion="fake"></div></section>
    `;
    const cleanup = vi.fn();
    const mount = vi.fn(() => cleanup);
    const refresh = vi.fn();
    const runtime = createRuntime({
      modules: [{ name: "fake", selector: '[data-motion~="fake"]', mount }],
      services: { logger: console, ScrollTrigger: { refresh } }
    });

    runtime.init(document).init(document);
    expect(mount).toHaveBeenCalledTimes(2);
    expect(runtime.mountedCount).toBe(2);

    runtime.destroy(document.querySelector("#one"));
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(runtime.mountedCount).toBe(1);

    runtime.init(document.querySelector("#one"));
    expect(mount).toHaveBeenCalledTimes(3);
    runtime.refresh();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
