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

Each row remembers the column the user last used in it. An unvisited row
starts at column zero instead of carrying the column from another row. When
the user moves back to a visited row, their position is restored. Vertical
movement into a shorter row clamps to a valid item.

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

## Milestone 5: Performance benchmark

### Why benchmark a production preview instead of the development server?

Development tooling, source transforms, and hot-reload support add work that
users do not get in a production build. Serving the built app makes the
comparison more representative and keeps the mode differences easier to
interpret.

### Which measurements does the harness collect?

It records time until the focused card appears, scripted key-to-two-frame
latency p50/p95, long-task count, JavaScript heap, and DOM-node count. These
metrics complement each other: DOM size describes rendered work, while key
latency and long tasks show some of its runtime impact.

### Why repeat scenarios and report medians?

Browser timings vary with background activity and machine load. Three runs
and a median reduce the influence of a single unusually fast or slow run.
Comparisons are still meaningful only when the machine and browser setup are
kept consistent.

### What are the benchmark's limitations?

The key sequence is scripted, not physical remote input. The two-frame timing
is browser-side and is not end-to-end TV response time. CPU throttling is an
approximation, and heap/latency values depend on the machine. The harness
supports comparative investigation; it does not establish a universal
performance threshold. In one Codespace run, the windowed page had 214 DOM
nodes versus 30,138 in naive mode; present that as a result from that
environment, not a portable guarantee.

### Issues and refactors

The plan's example referred to an `optimized` route and a test-only selector.
We aligned it with the existing default windowed route and focused-card
selector, added a final-focus assertion, and kept benchmark output in the
terminal rather than creating dated result files or a new results directory.
The first Chromium launch also exposed missing Linux shared libraries, so the
setup notes distinguish downloading the browser from installing its system
dependencies. The original 132-key sequence also made each benchmark run
take several minutes, so it was reduced to a shorter deterministic route
across columns and rows while retaining three repetitions per scenario.
