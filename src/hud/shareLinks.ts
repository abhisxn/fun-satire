export function buildWhatsAppShareUrl(message: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`;
}

export function buildFacebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function buildInstagramDeepLink(): string {
  return "instagram://story-camera";
}

export function buildInstagramWebUrl(): string {
  return "https://instagram.com";
}

export function isMobileUserAgent(userAgent: string): boolean {
  return /Android|iPhone|iPad|iPod/i.test(userAgent);
}
