# Security Hardening for Custom-Domain Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add HTTP security headers and a `robots.txt` ahead of the custom-domain cutover, and document the manual Vercel/DNS steps that go with it.

**Architecture:** This is almost entirely config, not code — one `headers` block added to `vercel.json` (applied Vercel-side, no app code touches it) plus a new static `public/robots.txt`. There are no unit-testable code paths here (no functions, no logic), so verification is via `curl` against headers and a build/test pass, not vitest. The manual Vercel dashboard and DNS/registrar steps from the spec are called out as a checklist task rather than a code task, since they can't be done from this repo.

**Tech Stack:** Vercel platform config (`vercel.json`), static file (`public/robots.txt`). No new dependencies.

---

## Spec reference

Implements `docs/superpowers/specs/2026-08-08-security-hardening-design.md`. Decisions resolved during planning:

- `style-src 'unsafe-inline'` stays in the CSP for now — `index.html`'s inline `<style>` block is not being refactored in this pass (spec's deferred non-goal).
- `robots.txt` defaults to allow-all (`User-agent: *` / `Allow: /`) since there's no current reason to keep this out of search results.
- Sitemap URL and canonical domain are placeholders (`https://example.com/`) until the actual custom domain is finalized — Task 1's Step 3 flags where to swap it in.

---

### Task 1: Add security headers to `vercel.json`

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Read the current file**

Current contents of `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

- [ ] **Step 2: Replace with headers-augmented config**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        }
      ]
    }
  ]
}
```

- [ ] **Step 3: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('vercel.json', 'utf8')); console.log('valid')"`
Expected: `valid`

- [ ] **Step 4: Commit**

```bash
git add vercel.json
git commit -m "chore: add security headers to vercel.json for custom-domain launch"
```

---

### Task 2: Add `robots.txt`

**Files:**
- Create: `public/robots.txt`

- [ ] **Step 1: Write the file**

```
User-agent: *
Allow: /

Sitemap: https://example.com/sitemap.xml
```

Note: replace `https://example.com/sitemap.xml` with the real custom domain once it's finalized (and remove the `Sitemap:` line entirely if no sitemap is ever added — it's optional).

- [ ] **Step 2: Verify it's served at the expected path after build**

Run: `npm run build && ls dist/robots.txt`
Expected: `dist/robots.txt` exists (Vite copies everything under `public/` into `dist/` unchanged).

- [ ] **Step 3: Commit**

```bash
git add public/robots.txt
git commit -m "chore: add robots.txt ahead of custom-domain launch"
```

---

### Task 3: Verify headers and no regressions

**Files:** none (verification only)

- [ ] **Step 1: Full build and test pass**

Run: `npm run build && npm test`
Expected: Both succeed with no errors.

- [ ] **Step 2: Local header check**

Run: `npm run preview` in one terminal, then in another: `curl -sI http://localhost:4173/`
Expected: Note that Vite's local preview server does not apply Vercel's `headers` config (that's platform-side, applied only on actual Vercel deploys) — this step confirms the site still serves correctly, not that headers are present. Headers are verified post-deploy in Step 3.

- [ ] **Step 3: Post-deploy header check**

After deploying to Vercel (preview or the custom domain), run:

```bash
curl -sI https://<deployed-url>/
```

Expected: Response includes `content-security-policy`, `strict-transport-security`, `x-frame-options`, `x-content-type-options`, `referrer-policy`, and `permissions-policy` headers matching Task 1's values.

- [ ] **Step 4: Browser console check for CSP violations**

Open the deployed URL in a browser, open devtools console, and interact with the app (drag creatures, open HUD panels, trigger effects). Confirm no `Content-Security-Policy` violation errors appear. If any do (e.g. from a dynamically-injected style or script this plan didn't account for), note the exact violated directive and resource — that's a signal the CSP in Task 1 needs a scoped exception, not that the whole policy should be loosened.

No commit for this task — it's verification only.

---

### Task 4: Manual Vercel + DNS checklist (not code — do outside this repo)

**Files:** none

- [ ] **Step 1: Vercel Deployment Protection**

In the Vercel dashboard, under the project's Settings → Deployment Protection, enable Vercel Authentication (or a password) for preview/branch deployments, so `*.vercel.app` preview URLs don't leak unreleased work once the custom domain is the public-facing one.

- [ ] **Step 2: Vercel Firewall / Attack Challenge Mode**

Check Settings → Firewall for Attack Challenge Mode availability (requires Pro tier or above). If available, enable it given the political-satire content is more likely to draw hostile/bot traffic once it has a memorable domain.

- [ ] **Step 3: CAA record**

At the domain registrar/DNS provider, add a CAA record restricting certificate issuance to the CA Vercel uses (typically Let's Encrypt: `0 issue "letsencrypt.org"`).

- [ ] **Step 4: Apex/www canonicalization**

Confirm both the apex domain and `www` subdomain resolve to the same canonical URL with a single, consistent redirect direction (check via `curl -sI` on both and confirm one redirects to the other, not each redirecting to itself).

- [ ] **Step 5: DNSSEC**

If the registrar supports DNSSEC, enable it.

No commit for this task — these are dashboard/registrar actions outside the repo.
