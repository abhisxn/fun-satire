/**
 * Minimal Google Analytics 4 loader for the app.
 *
 * Replace the placeholder below with your real GA4 Measurement ID
 * (e.g. "G-XXXXXXXXXX"). When the placeholder is left in place, the
 * module silently no-ops, so local development and pre-ID deploys do
 * not fire tracking events.
 */
const GA_MEASUREMENT_ID = "G-F9Y64XRK3M";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function initAnalytics(measurementId: string = GA_MEASUREMENT_ID): void {
  if (typeof window === "undefined") return;
  if (!measurementId || measurementId === "G-XXXXXXXXXX") return;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function (...args: unknown[]) {
    window.dataLayer?.push(args);
  };

  // Load the gtag.js bootstrap from Google's CDN. CSP allows this via
  // script-src https://www.googletagmanager.com.
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.gtag("js", new Date());
  window.gtag("config", measurementId, { send_page_view: true });
}

export function trackEvent(action: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", action, params ?? {});
}
