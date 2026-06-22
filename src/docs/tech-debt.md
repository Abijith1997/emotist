# Technical Debt & BACKLOG

This section documents outstanding refactoring items, architectural gaps, and feature backlogs prioritized to maintain codebase health.

---

## 🚦 Testing Matrix & Coverage Gaps

Our testing metrics reveal significant gaps, particularly on frontend client applications:

| Package / Application | Unit Tests | Integration Tests | End-to-End (E2E) | Status / Action |
| :--- | :--- | :--- | :--- | :--- |
| **Backend API (`apps/api`)** | ~127 (Jest) | 12 spec tests | None | Solid; integration tests need CI hook. |
| **Shared Components (`packages/react-components`)** | ~36 (Vitest) | None | Playwright Component | Moderate coverage. |
| **Therapist Web (`apps/therapist`)** | 4 (Vitest) | None | 4 Playwright E2E | Minimal; requires scheduling flows E2E. |
| **Client Web (`apps/client`)** | **None** | None | Playwright (no tests) | Critical gap; need booking flow validation. |
| **Client Mobile (`apps/client-app`)** | **None** | None | None | Critical gap; needs Jest preset config setup. |

---

## 📱 Therapist Portal Responsive Gaps

- **Issue**: The therapist web application is currently designed **desktop-first**. 
- **Details**: Navigation shells use fixed sidebar widths (`pl-60` or `pl-24`) without responsive breakpoints. Although the calendar components adapt at 600px, the dashboard panel overflows on mobile and tablet screens.
- **Backlog**: Refactor `dashboard-layout.tsx` and `drawer.tsx` to support a sliding drawer navigation layout triggered by a hamburger header button.

---

## 🔐 Auth Migration: Moving to Backend-Owned Session Controls

Currently, frontends authenticate **directly with Supabase** in the browser. The API server only validates the incoming bearer JWT.

```
[Browser Client] ──► Supabase Auth (Sign-in) ──► JWT token ──► [NestJS API] (Validate Strategy)
```

### Limitations of Current Model
- Frontends bundle the bulky Supabase SDK and expose access tokens directly in client environments.
- Unable to enforce centralized rate limits, request verification logs, or organization-level logic during login.
- Divergent session workflows across therapist web, client web, and client-app mobile codebases.

### Proposed Architecture
We will migrate auth flows server-side:

```
[Browser Client] ──► [NestJS API /auth/login] ──► API proxies to Supabase Admin ──► HttpOnly Cookie
```

1. NestJS exposes endpoints: `/v1/auth/login`, `/v1/auth/refresh`, and `/v1/auth/logout`.
2. Backend validates credentials via Supabase Admin / GoTrue SDK and returns an encrypted, secure `HttpOnly` cookie session to frontends.
3. Frontends authenticate as simple web requests without needing local Supabase client credentials.

---

## 📋 Prioritized Technical Debt Backlog

### P0 (Fix Immediately)
- [ ] Add `.env.example` configurations across all workspaces.
- [ ] Fix `client-app` workspace integration in the main `package.json` Lerna array.
- [ ] Restore lint checkers and tests execution in the Dagger CI pipeline.
- [ ] Resolve version mismatch in `class-validator` package in client web workspaces.

### P1 (Product & UX Polish)
- [ ] Refactor therapist web interface to be mobile-first.
- [ ] Execute phased migration to Backend-owned session authentication.
- [ ] Support drag-and-drop rescheduling in the Mobiscroll calendar component.
- [ ] Implement a standardized interceptor for HTTP 401 Session Expired triggers.

### P2 (Refactoring & Architecture)
- [ ] Rename typo `kernal` folder to `kernel` across NestJS directory modules.
- [ ] Consolidate out-of-office models duplicated in `therapist` and `appointment` contexts.
- [ ] Extract duplicate Tailwind variables into a single shared Tailwind preset.

### P3 (Features Integration)
- [ ] Complete chat messaging send REST endpoints integration.
- [ ] Finalize "Refer Therapist to Specialist" form wizard.
- [ ] Integrate React Error Boundary screens to intercept UI crash events.
