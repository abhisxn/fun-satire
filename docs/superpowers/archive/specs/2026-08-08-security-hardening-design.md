# Security Hardening for Custom-Domain Launch — Design

## Context

Fun Satire is moving off a `*.vercel.app` URL onto a custom domain. That's a step up in exposure: a memorable, bookmarkable, shareable URL for satirical/political content is more likely to be scraped, embedded in an iframe on a hostile page, typo-squatted, or targeted by bot traffic than an anonymous `vercel.app` subdomain. The app itself is 100% static and client-side — no backend, no API routes, no forms, no user-submitted data, and (confirmed via grep across `src/`) the only `fetch()` call in the codebase is a same-origin request for `/creatures/eye.svg`. That keeps the attack surface small and the hardening cheap: this is almost entirely a headers + platform-config exercise, not a code change.

Goal: define the concrete headers, Vercel platform settings, and DNS/domain-layer protections to put in place before/at the custom-domain cutover, sized appropriately for a static site (not over-engineered for a backend that doesn't exist).

## Scope

In scope:
- `vercel.json` HTTP security headers
- `public/robots.txt`
- Vercel platform settings (Deployment Protection, Firewall/Attack Challenge Mode)
- Domain-registrar/DNS settings (CAA, HSTS preload consideration)

Out of scope (no backend exists, so not applicable): rate limiting application code, WAF rules for API abuse, auth/session hardening, input sanitization/CSRF, secrets management.

## Design

### 1. HTTP security headers (`vercel.json`)

Add a `headers` block applied to all routes (`"source": "/(.*)"`). Since everything is same-origin with no external fetches, the CSP can be tight:

- `Content-Security-Policy`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'`
  - `'unsafe-inline'` on `style-src` is needed because `index.html` has an inline `<style>` block. Deferred cleanup: move that CSS to a linked stylesheet to drop `'unsafe-inline'` entirely — out of scope for this pass, tracked as a follow-up.
  - `form-action 'none'` and no `script-src` exceptions since there are no forms and no third-party scripts.
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (belt-and-suspenders alongside `frame-ancestors 'none'`, for older browsers)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`: deny unused browser features this app never touches — `camera=(), microphone=(), geolocation=(), payment=(), usb=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` — meaningful now that this is a real domain users will return to (HSTS preload wasn't worth it on a throwaway `vercel.app` URL).

### 2. `robots.txt`

Currently missing (confirmed — `public/` has no `robots.txt`). Add one now, before the domain is publicly linked, so crawl/indexing behavior is a deliberate choice rather than default-open. Default to allowing all crawlers (`User-agent: *` / `Allow: /`) plus a `Sitemap:` line pointing at the canonical domain, since there's no reason yet to keep this out of search results — revisit if that changes.

### 3. Vercel platform settings (manual dashboard steps, not code)

- **Deployment Protection**: enable Vercel Authentication (or a password) on preview/branch deployments. Once the custom domain is live, preview deployments still resolve under `*.vercel.app` — without protection those become the easiest way to find in-progress/unreleased work under a discoverable pattern.
- **Attack Challenge Mode / Firewall**: confirm it's available and enabled for the project (Pro-tier feature) given the content is political satire, which has a higher-than-baseline chance of drawing hostile scraping or targeted traffic once it has a real domain.

### 4. Domain/DNS layer (registrar-side, manual)

- **CAA record** restricting cert issuance to Vercel's CA (e.g., Let's Encrypt) — prevents mis-issuance of certs for the domain by other CAs.
- Verify both apex and `www` resolve to the canonical URL with a single redirect direction (avoid duplicate-origin confusion, which also matters for the CSP/HSTS to apply consistently).
- DNSSEC if the registrar supports it — reduces spoofing/hijack risk for a domain that's now a public, bookmarked identity rather than a disposable subdomain.

## Non-goals (deferred)

- Moving `index.html`'s inline `<style>` to a linked stylesheet to drop CSP's `'unsafe-inline'` — real improvement, but separable from shipping the headers themselves.
- Any rate limiting, WAF rule authoring, or bot-scoring logic beyond flipping on Vercel's built-in Attack Challenge Mode — there's no backend to protect and no evidence yet of a need for custom rules.
- Deciding the final `robots.txt` indexing policy if the team later wants the site excluded from search — this spec defaults to allow-all; revisit if that's wrong.

## Verification

- `curl -sI https://<domain>` after deploy — confirm `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` are all present.
- Open the app in a browser and check devtools console for CSP violation errors (would surface if the inline `<style>` block trips the policy).
- `npm run build` and `npm test` still pass.
