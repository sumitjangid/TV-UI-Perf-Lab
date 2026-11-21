# Learning Guide

This guide explains what each milestone builds, why the design choices matter,
and what to observe while implementing it. Interview preparation lives
separately in the [Interview Guide](interview-guide.md). For system-level
context, see the [Architecture Guide](architecture.md) and
[Design System Guide](design-system.md).

## Milestone 1: Project foundation

### What we built

- A React + TypeScript application shell.
- A catalog generator that creates 40 collections with 250 synthetic titles
  each (10,000 titles total).
- A local placeholder poster asset.

### Why we built it this way

- **React** gives the browsing UI a component model that can be extended as
  features are added.
- **TypeScript** lets the compiler catch mismatches between the catalog data
  and the UI as those parts evolve.
- **Generated synthetic data** provides a predictable workload at a useful
  scale. It avoids API credentials, licensing concerns, network variability,
  and reliance on third-party title data.
- **A local placeholder asset** makes the prototype reproducible without
  external image requests.

### What this milestone does not demonstrate

The app foundation and data are in place, but the project has not yet
implemented keyboard navigation or measured rendering performance. Those
features will be built and verified in later milestones.

### Verify

```bash
npm run generate:catalog
npm run lint
npm run build
```

### Issues and refactors

No build or lint errors were found. The generator writes its file path relative
to the script, and the fixture uses a local placeholder image so generation
does not depend on a network service.

## Milestone 2: Focus-state model

### What we built

- A Redux Toolkit reducer in `src/store/focusSlice.ts` that stores the focused
  row, focused column, row lengths, and the last column used in each row.
- Named actions for setting row lengths and moving in four directions.
- Tests that exercise the reducer with Node's built-in test runner.

This milestone isolates navigation rules from key events and rendering. The
next milestone connects the reducer to the React screen.

### Why the focus model is separate

An arrow key describes an **input event**; the focus reducer describes the
resulting **navigation state**. Keeping those separate means a future key
handler only needs to map `ArrowLeft` to `moveLeft()`, while the reducer owns
the rules for what `moveLeft` means. The same rules can be tested without
mounting React or simulating a browser.

The state uses row and column indexes instead of DOM elements. That makes
focus deterministic and serializable, and gives later rendering and
virtualization code a stable description of the selected item.

### Why Redux Toolkit

The focus position is shared navigation state, not just a detail of one card.
Redux Toolkit's `createSlice` gives that state named actions and one place for
the transition rules. It uses Immer internally, so reducer updates can stay
readable while still producing immutable state. The resulting data remains
plain and serializable: indexes, row lengths, and remembered columns.

At this milestone, the reducer is not yet attached to a Redux store or React
provider. The following milestone connects it to the UI; if that integration
does not benefit from centralized state, we should reconsider the choice
rather than keeping infrastructure without a use.

### Navigation rules

1. **Horizontal movement clamps:** moving left from column zero or right from
   the last item leaves focus at that row's edge.
2. **Vertical movement preserves intent:** each row remembers its own last
   column. Moving to a longer row can restore the column previously used
   there; if the target row is shorter, focus clamps to its last item.
3. **Empty rows are skipped:** vertical navigation moves to the next row that
   contains at least one item.
4. **No available items is safe:** an empty catalog keeps a neutral row-zero,
   column-zero state, and movement actions do nothing.
5. **Changing row lengths stays valid:** remembered positions are clamped to
   the new row sizes.

### Verify

```bash
npm test
npm run lint
npm run build
```

### Issues and refactors

The reducer passed its focused tests and build checks without a corrective
refactor. We kept it independent of the UI so the next milestone could connect
it to keyboard events and rendering without changing the navigation rules.

## Milestone 3: Browsing and remote controls

### What we built

- The catalog generator now writes `public/catalog.json`. The app fetches and
  validates that file instead of bundling all 10,000 records into JavaScript.
- A Redux store and Provider connect the existing focus reducer to the screen.
- A remote-key hook maps arrow keys to movement actions, Enter to selecting
  the focused title, and Escape/Backspace to clearing the selection.
- The screen renders 40 shelves with 250 title cards each. Exactly one card
  participates in the tab order, and the focused card has a visible outline.
- Poster images use native lazy loading. All title-card elements are still
  rendered; windowing is intentionally left for a later milestone.

### Why we did it this way

- **Serve data separately from app code:** importing the JSON had produced an
  approximately 1 MB JavaScript chunk. A static JSON request keeps the catalog
  out of the app bundle and makes the data-loading boundary explicit.
- **Validate the fetched shape:** TypeScript types do not validate network
  responses at runtime. The app checks the row and item fields before using
  the data and displays a visible error if loading or validation fails.
- **Keep key handling in a hook:** one event listener translates remote-style
  key events into reducer actions. The reducer remains responsible for
  navigation rules; the UI is responsible for displaying focus.
- **Use a single tab stop:** roving `tabIndex` makes the title cards usable
  with keyboard focus without adding thousands of sequential Tab stops.
- **Defer windowing:** rendering the full catalog gives us a clear, naive
  baseline. The next performance milestone can measure and reduce the DOM
  rather than mixing optimization into the first working interaction.

### Issue found and refactor

The first production build bundled the imported catalog into the JavaScript
chunk and warned that the chunk exceeded 500 KB. The entry chunk was
1,074.44 KB (139.06 KB gzip). We moved the generated catalog to
`public/catalog.json` and fetch it as JSON instead. The app JavaScript is now
246.76 KB (78.54 KB gzip), and the catalog is a separate 828,513-byte asset.
This reduces the JavaScript chunk and separates parsing/loading responsibilities;
it does not by itself reduce the catalog's uncompressed size.

### Validate

Automated checks:

```bash
npm run generate:catalog
npm test
npm run lint
npm run build
```

Manual browser check:

1. Run `npm run dev` and open the local Vite URL.
2. Wait for the shelves to load and confirm the first title is visibly
   focused.
3. Use Left/Right and Up/Down; focus should stay in bounds, skip empty rows,
   and remember each row's last column.
4. Press Enter; a live status message should name the selected title.
5. Press Escape; the selection message should clear. Clicking a different
   title should update focus and selection.
6. Confirm the browser requests `/catalog.json` separately from the app's
   JavaScript bundle.

## Milestone 4: Windowing and memory

### What we built

- `windowRange` returns an end-exclusive range around the focused index.
- Normal mode renders up to 6 shelves (2 before and 3 after focus) and up to
   14 cards per shelf (7 before and 6 after the row's remembered column).
- Spacer elements preserve each row and card's position while off-window
   elements are unmounted.
- `?mode=naive` renders every shelf and card as a comparison baseline.
- Range tests check boundaries, empty and short lists, and the fixed maximum
   window sizes, including how an unvisited row chooses its initial column.

### Why we did it this way

The catalog still loads as data, but the browser no longer needs 10,000 title
cards in the DOM at once. A small buffer around focus keeps nearby navigation
ready while bounding mounted elements. Spacers retain the full layout size, so
removing offscreen elements does not collapse the scroll position. The naive
mode lets us compare the optimized DOM with the original full-render approach.

### Issues and refactors

During manual validation, the tiles in lower, unvisited rows appeared to
disappear after horizontal movement. Their render window was following the
active row's column, but their horizontal scroll position had not moved, so
their real cards sat beyond the visible area. We changed unvisited rows to
anchor at column zero, while visited rows use their remembered column and the
active row uses the current focus. A regression test covers this rule.

The other important refinement was adding layout spacers: simply slicing the
arrays would have shifted the remaining cards and shelves as the window moved.
Manual validation also showed that three cards before focus were not enough to
fill the visible left side of a shelf while moving right. We shifted the same
14-card budget to 10 before and 3 after focus, and made card sizing
border-box so the spacer step matches the rendered card width plus gap. That
left only four cards mounted at the initial column, so we rebalanced the
window to 7 before and 6 after focus. This still renders at most 14 cards and
provides seven cards on the initial view.

### Validate

Run `npm test`, `npm run lint`, and `npm run build`. In the browser, compare
the default mode with `?mode=naive`. At a middle row and column, the windowed
view should mount at most 6 shelves and 84 title cards; the naive view should
mount all 40 shelves and 10,000 cards. Navigate to the edges to confirm the
focused card remains mounted and visible, and that lower rows continue to show
their own tiles while the active row scrolls. While moving right, confirm the
cards preceding focus fill the visible left side instead of exposing a blank
spacer.
