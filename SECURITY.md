# Security Policy

Fun Satire is a client-side canvas toy with no backend, no user accounts, and no persisted user data — the attack surface is small, but reports are still welcome.

## Reporting a Vulnerability

Please do not open a public GitHub issue for security reports. Instead, email abhisxn@gmail.com with:
- A description of the issue and its potential impact
- Steps to reproduce
- Affected version/commit

Expect an acknowledgment within a few days. There is no bug bounty program.

## Scope

In scope: the app code in `src/`, build/deploy config (`vite.config.ts`, `vercel.json`), and dependency vulnerabilities reachable at runtime.

Out of scope: the local dev toolchain, and issues requiring physical/local access to a developer's machine.
