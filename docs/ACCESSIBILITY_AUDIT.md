# Plant Doctor — Accessibility Audit

**Date:** 2026-10-11 · **Target:** WCAG 2.2 AA (engineering standard)
**Method:** source inspection + computed contrast ratios + accessibility-tree review. Full manual
screen-reader passes across all four languages were **not** completed (see limitations).

## Color contrast (computed, sRGB)

| Pair | Ratio | Result |
|------|-------|--------|
| foreground `#0F172A` on background `#F0FDF4` | 17.05 | PASS AA |
| muted-fg `#475569` on card `#FFFFFF` | 7.58 | PASS AA |
| muted-fg `#475569` on muted `#F0F7F3` | 6.97 | PASS AA |
| on-primary `#FFFFFF` on primary `#15803D` | 5.02 | PASS AA |
| primary link `#15803D` on card `#FFFFFF` | 5.02 | PASS AA |
| warning `#92400e` on warning-bg `#fef3c7` | 6.37 | PASS AA |
| info `#1d4ed8` on info-bg `#dbeafe` | 5.49 | PASS AA |
| accent `#D97706` on card `#FFFFFF` | 3.19 | PASS large-text only — avoid for normal body text |

## Verified (PASS — VERIFIED)

- Semantic landmarks: `nav` (labelled), `main`, `header`, `footer`; headings start at `h1` per page.
- Visible focus: global `*:focus-visible` outline using the ring token.
- Status badges convey meaning with **icon + text**, not color alone (Evidence Status Gate).
- Live regions: connection banner and toasts use `role="status"` / `aria-live`.
- Form validation: Ask question field uses inline error with `role="alert"`, `aria-invalid`,
  `aria-describedby`, and focus moves to the field on failed submit.
- Language metadata: `document.documentElement.lang` is updated on language change (en/hi/te/ta),
  and the UI ships Noto fonts for Devanagari/Telugu/Tamil.
- Reduced motion: `@media (prefers-reduced-motion: reduce)` neutralizes animations.
- Touch targets: bottom nav and controls sized for mobile (≈44px).

## Issues / recommendations

| Severity | Issue | Action | Status |
|----------|-------|--------|--------|
| Low | `accent #D97706` on white is 3.19:1 | Use accent only for large/bold text, icons, or fills — not normal body copy | NOT VERIFIED (usage not exhaustively audited) |
| Low | Select dropdown arrow is a background image | Ensure native `<select>` keeps its accessible name (it does via `<label htmlFor>`) | PASS — VERIFIED |
| — | Screen-reader announcement quality across hi/te/ta | Manual NVDA/VoiceOver + TalkBack passes | NOT VERIFIED (not performed) |

## Limitations (reported honestly)

- No automated axe/Lighthouse run and no manual screen-reader testing were performed in this
  environment; contrast is computed and structure is inspected, but **full WCAG 2.2 AA conformance
  is not claimed** from this audit alone.
- Four-language screen-reader output and dynamic-content announcements need manual verification
  before claiming localized accessibility.
