import { describe, it, expect } from "vitest";
import { buildWhatsAppShareUrl, buildFacebookShareUrl, buildRedditShareUrl } from "../../src/hud/shareLinks";

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

  it("builds a Reddit share URL with url and title", () => {
    expect(buildRedditShareUrl(url, message)).toBe(
      "https://www.reddit.com/submit?url=https%3A%2F%2Fexample.com%2F&title=I%20just%20protested%20with%20the%20crowd.",
    );
  });
});
