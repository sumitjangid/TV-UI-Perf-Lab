# Interview Guide

Use these prompts to practice explaining the project. Build your answer from
the evidence in the implementation, then add specific measurements as later
milestones introduce them.

## Milestone 1: Project foundation

### Why use synthetic data for a performance prototype?

Synthetic data gives us a repeatable workload and lets us focus on UI behavior
without API latency, changing responses, credentials, or third-party content.

### Why generate the catalog instead of hand-writing it?

A small generator can produce a large, consistent fixture quickly. Its size
and shape are easy to adjust, which makes it useful when comparing behavior at
different data volumes.

### Why use a local placeholder image?

It avoids external requests and makes the prototype easier to run reliably,
including offline. Realistic image payloads can be introduced later when
measuring image loading and memory.

### What does the first milestone prove, and what does it not prove?

It establishes the React + TypeScript app and a deterministic 10,000-title
catalog. It does not yet prove that browsing is fast, that rendering scales,
or that keyboard navigation works; those require later implementation and
measurement.

### Concise project summary

“I started with a React and TypeScript foundation and generated a repeatable
10,000-item catalog. That gives the later browsing and performance milestones
a controlled workload without coupling the prototype to an external API.”

### Issues and refactors

Validation found no build or lint errors. We kept the generated catalog and
placeholder poster synthetic and local so the test data is deterministic and
self-contained.

## Milestone 2: Focus-state model

### Why keep focus as row and column state instead of relying on DOM focus?

An explicit model makes navigation rules deterministic and testable without a
browser. The UI can render the focused item from state, and input handling can
dispatch actions without embedding boundary logic in event handlers.

### Why remember the last column for each row?

When a user moves vertically from a long row into a shorter one, the focus
must clamp to a valid item. Remembering the intended column lets the user
return to that position when they move back to the longer row, rather than
losing their place.

### How does the reducer handle the edges and empty rows?

Horizontal moves clamp to the current row's valid range. Vertical moves skip
empty rows, clamp the remembered column for the destination row, and do
nothing when there is no focusable item. These rules prevent focus from
referring to an item that does not exist.

### Why test the reducer without rendering the app?

The focus transition rules are independent of React rendering. Direct reducer
tests run quickly and cover edge cases precisely; a later milestone will test
that keyboard events and visible focus are wired to these actions correctly.

### Why choose Redux Toolkit for this state?

The focus position is shared by the key handler and multiple browsing rows,
so a single reducer provides one source of truth for navigation rules. Redux
Toolkit supplies explicit actions and immutable updates without hand-writing
reducer boilerplate. The UI now dispatches those actions through the Redux
store and renders the selected position from state.

### Issues and refactors

The focus reducer passed its tests without a corrective refactor. Edge,
empty-row, and column-memory cases were added before connecting the reducer to
the screen.

## Milestone 3: Browsing and remote controls

### Why fetch the catalog instead of importing it into the app bundle?

The generated catalog has 10,000 entries. Importing it as a JavaScript module
made the app chunk roughly 1 MB. Serving it as static JSON keeps application
code and test data separate and lets us observe the data request independently.

### How are remote keys separated from navigation rules?

The key hook maps browser key names to Redux actions. The focus reducer owns
clamping and row-memory behavior, while React renders the resulting focus.
That separation makes input mapping and state transitions easier to reason
about and test independently.

### Why is only one title card in the tab order?

Roving `tabIndex` keeps keyboard focus available without requiring a user to
Tab through 10,000 buttons. Arrow keys move the single tab stop according to
the same row/column model used for TV-remote navigation.

### What performance work remains?

This milestone initially mounted all title cards to create a naive baseline.
We later added windowing in Milestone 4; latency and memory still need formal
benchmarking.

### What issue did the build reveal, and how did you address it?

Importing the 10,000-item JSON into the app produced a 1,074.44 KB JavaScript
chunk and a chunk-size warning. We moved it to `public/catalog.json` and fetch
it separately. The app JavaScript became 246.76 KB; the catalog remains a
separate 828,513-byte uncompressed file. This separates code from data, but
does not eliminate the data transfer.

### Issues and refactors

The oversized JavaScript chunk was the main issue. Moving the catalog to a
static JSON asset reduced the app chunk and made the loading boundary explicit.

## Milestone 4: Windowing and memory

### Why use an end-exclusive range?

An exclusive `end` matches JavaScript's `slice(start, end)` convention. The
same range helper can be applied to rows and cards, including at the edges of
short or empty collections.

### How do you keep the layout stable when offscreen items are unmounted?

Spacer elements preserve the omitted rows' and cards' layout footprint.
Without them, slicing the arrays would make the remaining content shift.

### How do you verify the window is bounded?

At a middle position the normal mode should mount at most 6 shelves and 84
title cards. `?mode=naive` should mount all 40 shelves and 10,000 cards. Unit
tests cover range boundaries and sizes; browser inspection verifies the
rendered DOM counts.

### Issues and refactors

During manual validation, tiles in lower, unvisited rows appeared to disappear
as the active row moved horizontally. Those rows had been using the active
column to choose their window without having their own scroll position moved.
We changed their initial anchor to column zero; focused rows use current focus,
and previously visited rows use their remembered column. A regression test
now protects that behavior. A later check showed that three cards before the
focused card could leave a blank section on wide shelves. We moved most of the
same 14-card window to the left of focus and made card sizing border-box so
spacer widths align with actual card geometry. That first rebalancing left
only four cards mounted on initial load, so we settled on seven cards before
and six after focus. Spacers preserve omitted content's geometry so fewer
mounted nodes do not shift the layout.
