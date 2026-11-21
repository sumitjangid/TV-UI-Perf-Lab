# Design System Guide

This document explains the visual language in the current prototype and the
rules to use as the TV browsing experience grows. It is intentionally separate
from the [Learning Guide](learning-guide.md) and
[Interview Guide](interview-guide.md).

## Current status

The project has a small set of consistent styles, not yet a formal,
token-driven design system. The values below are taken from the current CSS.
They are a useful baseline; extracting CSS custom properties should happen
when repeated components make the values genuinely shared.

## Design goals

The eventual interface is designed for a TV screen and a remote rather than a
mouse:

- **Readable at viewing distance:** use clear hierarchy, large type for key
  content, and enough contrast between text and surfaces.
- **Focus is a first-class state:** remote users need to know which item will
  respond to Enter before they activate it.
- **Simple spatial navigation:** visual layout should make left/right and
  up/down movement predictable.
- **Consistent components:** repeated cards, rows, labels, and controls should
  share sizing and state rules.
- **Responsive, not merely shrinkable:** spacing and typography should adapt
  without making controls hard to see or use.
- **Measured restraint:** avoid expensive animation and rendering effects
  unless they improve clarity and remain smooth on target devices.

## Current visual foundation

| Role | Current value or rule | Where it appears |
|---|---|---|
| Page background | `#101820` | Global page and app shell |
| Primary text | `#f5f7fa` | Main headings and inherited text |
| Muted text | `#9fb3c5`, `#c3d0db` | Eyebrow labels and supporting copy |
| Card text | `#d7e3ec` | Title cards |
| Card surface | `rgb(7 15 22 / 35%)` | Title cards |
| Poster background | `#243746` | Local placeholder image |
| Subtle border | `rgb(194 214 230 / 20%)` | Title cards |
| Typography | Inter, then system sans-serif fallbacks | Global font stack |
| Content width | `72rem` maximum | Header and catalog |
| Card size | `9rem` width; poster aspect ratio `2 / 3` | Title cards |
| Corners | `0.75rem` card, `0.4rem` poster | Browsing UI |

Colors and dimensions are currently written directly in `src/index.css` and
`src/App.css`; they are not yet CSS variables or a component library.

## Responsive sizing

The existing styles use CSS `clamp()` for key sizes. For example,
`padding: clamp(2rem, 6vw, 5rem)` means:

1. Never use less than `2rem`.
2. Prefer a fluid value based on `6vw` as the viewport changes.
3. Stop growing at `5rem`.

The same approach is used for heading sizes and panel spacing. This keeps the
layout fluid while protecting it from becoming too cramped on small screens or
too spread out on large screens. The page also sets a `320px` minimum width;
later layouts should be deliberately checked on narrow viewports rather than
assuming a TV-only aspect ratio.

## Design-token direction

When visual values begin to repeat, promote them to named tokens. A possible
CSS foundation—illustrative, not yet implemented—is:

```css
:root {
  --color-canvas: #101820;
  --color-text-primary: #f5f7fa;
  --color-text-muted: #9fb3c5;
  --color-text-secondary: #c3d0db;
  --color-surface-raised: #1f303e;
  --color-border-subtle: rgb(194 214 230 / 18%);

  --content-max-width: 72rem;
  --radius-panel: 1.25rem;
  --space-panel: clamp(1.5rem, 4vw, 3rem);
}
```

Tokens provide a single place to adjust the visual language and make themes or
experiments easier later. They should represent meaningful roles (such as
`--color-text-muted`) rather than arbitrary one-off values (`--gray-3`) when
possible. Do not extract every value prematurely; a token is useful when it
has a real shared meaning or expected reuse.

## Component rules for upcoming UI

### Title cards

- Cards currently use a fixed `9rem` width and posters use a `2 / 3` aspect
  ratio so shelves stay aligned.
- Use a local/fallback image path and meaningful alternative text when the
  poster conveys title information. The current placeholder poster is
  decorative, so its `alt` text is empty and the visible title labels the
  button.
- Keep the title readable when the poster is unavailable or image loading is
  delayed.
- Make the entire focus target large enough for clear TV use.

### Shelves / rows

- Use a clear heading-to-content relationship.
- Keep horizontal movement visually continuous and vertical movement between
  rows predictable.
- Avoid layout shifts when titles or images load.
- If only part of a long row is rendered, preserve the visual position and
  focus behavior of the full row.

### Focus and selection

The focused title card currently uses a bright outline and a small scale
increase. The selected title is announced in a live status message; selection
does not yet open a detail page.

- Focus must be visible without relying on color alone; combine contrast with
  an outline, scale, or other clear shape treatment.
- Focus must not be clipped by an overflow container.
- Focused, selected, disabled, and default states must be distinguishable.
- Arrow keys move focus; Enter activates the focused item. The focus model and
  screen presentation must stay in sync.
- Test focus visibility against both the page background and card surfaces.

## Accessibility and motion

- Maintain readable contrast for primary and secondary text.
- Preserve semantic headings and landmarks, as the current `main`, `header`,
  and labeled `section` do.
- Provide visible keyboard focus for every interactive element.
- Do not communicate status only through color.
- Add motion only when it clarifies a focus transition; respect
  `prefers-reduced-motion` when animation is introduced.
- Check the interface with keyboard-only interaction now, then add automated
  accessibility checks in the later accessibility milestone.

## Performance and visual quality

A polished transition is not worth making navigation feel delayed. Keep early
components simple, then measure input-to-visible-response time and rendering
cost as the catalog UI is introduced. If effects like large shadows, animated
transforms, or layered gradients become expensive on the target device, profile
them and simplify the costly treatment rather than removing all visual
hierarchy.

For each new component, define its purpose, dimensions, typography, and states
before adding decorative details. The current app deliberately renders the
whole catalog as a baseline; windowing belongs to a later performance
milestone.
