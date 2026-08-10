// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { isTouchDevice } from "../../src/creatures/touchSupport";

describe("touchSupport/isTouchDevice", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "ontouchstart");
    Object.defineProperty(navigator, "maxTouchPoints", { value: 0, configurable: true });
  });

  it("returns true when the window exposes ontouchstart", () => {
    Object.defineProperty(window, "ontouchstart", { value: null, configurable: true });
    expect(isTouchDevice()).toBe(true);
  });

  it("returns true when navigator.maxTouchPoints is greater than 0", () => {
    Object.defineProperty(navigator, "maxTouchPoints", { value: 5, configurable: true });
    expect(isTouchDevice()).toBe(true);
  });

  it("returns false when neither touch signal is present", () => {
    expect(isTouchDevice()).toBe(false);
  });
});
