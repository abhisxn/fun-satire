// tests/unit/shareLinks.test.ts
import { describe, it, expect } from "vitest";
import {
  buildWhatsAppShareUrl,
  buildFacebookShareUrl,
  buildInstagramDeepLink,
  buildInstagramWebUrl,
  isMobileUserAgent,
} from "../../src/hud/shareLinks";

describe("hud/shareLinks", () => {
  const message = "I just protested with the crowd.";
  const url = "https://example.com/";

  it("builds a WhatsApp share URL with message and url combined", () => {
    expect(buildWhatsAppShareUrl(message, url)).toBe(
      "https://wa.me/?text=I%20just%20protested%20with%20the%20crowd.%20https%3A%2F%2Fexample.com%2F",
    );
  });

  it("builds a Facebook share URL", () => {
    expect(buildFacebookShareUrl(url)).toBe(
      "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fexample.com%2F",
    );
  });

  it("builds the Instagram app deep link", () => {
    expect(buildInstagramDeepLink()).toBe("instagram://story-camera");
  });

  it("builds the Instagram web fallback URL", () => {
    expect(buildInstagramWebUrl()).toBe("https://instagram.com");
  });

  describe("isMobileUserAgent", () => {
    it("returns true for an iPhone user agent", () => {
      expect(isMobileUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(true);
    });

    it("returns true for an Android user agent", () => {
      expect(isMobileUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8)")).toBe(true);
    });

    it("returns false for a desktop user agent", () => {
      expect(isMobileUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe(false);
    });
  });
});
