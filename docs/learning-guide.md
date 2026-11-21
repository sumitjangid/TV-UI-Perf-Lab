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

## Milestone 2: Focus-state model

### What we built

- A Redux Toolkit reducer in `src/store/focusSlice.ts` that stores the focused
  row, focused column, row lengths, and the last column used in each row.
- Named actions for setting row lengths and moving in four directions.
- Tests that exercise the reducer with Node's built-in test runner.

The reducer is not connected to the React screen yet. That is deliberate: this
milestone isolates navigation rules from key events and rendering. The
keyboard hook and browsing components are the next milestone.

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
provider. The next phase will connect it to the UI; if that integration does
not benefit from centralized state, we should reconsider the choice rather
than keeping infrastructure without a use.

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
