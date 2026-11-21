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

This milestone intentionally mounts all title cards so we have a simple
baseline. The next milestone should measure DOM size, load/render behavior,
and navigation latency, then introduce windowing if the measurements show it
is needed.
