# AGENTS.md

## Purpose

This repository is the admin UI for Shyntr.

It owns:
- management UI flows
- feature-gated admin pages
- API integration with Shyntr management endpoints
- safe editing UX for tenant-scoped settings

It does NOT own:
- backend domain truth
- persistence
- auth portal runtime rendering
- protocol behavior

---

## Core Rules

- Treat Shyntr backend as the source of truth
- Do not invent backend fields or routes
- Do not change expected behavior just to satisfy UI assumptions
- All code-facing text must be in English
- Keep changes minimal and bounded
- Prefer explicit feature-gating for EE features

---

## Feature Flag Rules

EE UI must be hidden behind environment-based feature gates.

Expected pattern:
- use runtime environment values already used by this repository
- if the EE flag is disabled:
    - do not render nav items
    - do not register routes
    - do not make API calls

Do not implement “hidden but callable” UI flows.

---

## API Integration Rules

- Use only live backend contracts
- Align request and response shapes exactly
- Handle error states explicitly
- Do not silently swallow backend failures
- Do not hardcode tenant assumptions

---

## Branding Editor Rules

Dashboard edits branding draft only.

Expected behaviors:
- load current draft + published
- edit draft
- publish draft
- discard draft
- reset to default

Do not simulate publish locally.
Do not keep branding state as a UI-only source of truth.

---

## UI Rules

- Keep UI changes isolated to relevant pages/components
- Avoid broad visual refactors during feature work
- Maintain current navigation and layout conventions
- Prefer simple, explicit forms over clever abstractions

---

## Change Completeness Checklist

Before finalizing, verify:
- route registration
- sidebar/nav visibility
- feature flag gating
- API client
- page state handling
- submit / error / loading states
- tenant selection assumptions
- directly affected tests if present

---

## Testing Rules

Prefer deterministic UI and API integration behavior.

At minimum validate:
- EE flag off → branding UI absent
- EE flag on → branding UI visible
- draft load works
- publish/discard/reset calls the correct endpoints
- backend errors are shown, not masked

---

## Review Output Preference

When reviewing or implementing:
1. Current state
2. Problem / risk
3. Files to change
4. Full updated files
5. Targeted validation

Return full files unless explicitly asked for diffs.