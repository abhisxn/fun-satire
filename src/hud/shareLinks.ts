export function buildWhatsAppShareUrl(message: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`;
}

export function buildFacebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function buildRedditShareUrl(url: string, title: string): string {
  return `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
}
