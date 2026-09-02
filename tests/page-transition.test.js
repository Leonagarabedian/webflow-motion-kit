import { describe, expect, it } from "vitest";
import { isTransitionLink } from "../src/modules/page-transition.js";

describe("page transition link filtering", () => {
  const current = "https://example.com/work?view=grid";

  it("accepts ordinary same-origin navigation", () => {
    const link = document.createElement("a");
    link.href = "https://example.com/about";
    expect(isTransitionLink(link, current)).toBe(true);
  });

  it("ignores external, hash, download, and opted-out links", () => {
    const external = document.createElement("a");
    external.href = "https://other.example/about";
    const hash = document.createElement("a");
    hash.href = `${current}#details`;
    const download = document.createElement("a");
    download.href = "https://example.com/file.pdf";
    download.setAttribute("download", "");
    const optedOut = document.createElement("a");
    optedOut.href = "https://example.com/contact";
    optedOut.setAttribute("data-motion-no-transition", "");

    expect([
      isTransitionLink(external, current),
      isTransitionLink(hash, current),
      isTransitionLink(download, current),
      isTransitionLink(optedOut, current)
    ]).toEqual([false, false, false, false]);
  });
});
