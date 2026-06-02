import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll } from "vitest";
import { fakeBrowser } from "@webext-core/fake-browser";

// The extension talks to Chrome through the global `chrome.*` (and occasionally
// `browser.*`) namespace. Point both at the in-memory fake so storage, runtime
// messaging, and listeners work in tests without a real browser.
beforeAll(() => {
  // @ts-expect-error - fakeBrowser implements the subset of the API we use.
  globalThis.chrome = fakeBrowser;
  // @ts-expect-error - same object, mirrored under the polyfill name.
  globalThis.browser = fakeBrowser;

  // jsdom has no ResizeObserver; react-window's virtual list needs one to exist.
  // A no-op is fine — tests assert on reducer state, not on measured row layout.
  if (!("ResizeObserver" in globalThis)) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

// Each test starts from a clean DOM and a reset extension API so state doesn't
// leak between tests.
afterEach(() => {
  cleanup();
  fakeBrowser.reset();
});
