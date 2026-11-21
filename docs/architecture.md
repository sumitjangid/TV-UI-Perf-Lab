# Architecture Guide

This guide describes the architecture that exists in the repository now,
separates it from the longer-term plan, and explains why the boundaries matter.
The [project plan](../TV_UI_Perf_Lab.md) is a roadmap, not a description of
features already implemented.

## Current architecture

### Rendered diagram

![Current architecture diagram](architecture.svg)

### Mermaid source

```mermaid
flowchart TB
  subgraph catalog["Catalog preparation (separate Node process)"]
    command["npm run generate:catalog"] --> generator["scripts/generate-catalog.ts"]
    generator --> data["src/data/catalog.json"]
  end

  subgraph browser["Browser runtime (Vite + React)"]
    html["index.html<br/>#root mount point"] --> entry["src/main.tsx<br/>createRoot + StrictMode"]
    entry --> app["src/App.tsx<br/>current welcome screen"]
    entry --> globalStyles["src/index.css<br/>global styles"]
    app --> appStyles["src/App.css<br/>app styles"]
  end

  data -. "not imported yet; planned connection" .-> app
```

The two paths are intentionally distinct:

- The **generator** creates a predictable data fixture on disk.
- The **browser app** currently renders a project welcome screen. It does not
  yet import or display `catalog.json`; connecting the data to the browsing UI
  belongs to a later milestone.

## Responsibilities of the current files

| File | Responsibility |
|---|---|
| `index.html` | Provides the document and the `#root` mount point. |
| `src/main.tsx` | Imports global CSS, creates the React root, and mounts `App` inside `StrictMode`. |
| `src/App.tsx` | Defines the current top-level welcome screen and its semantic page structure. |
| `src/index.css` | Sets global typography, page defaults, colors, and box sizing. |
| `src/App.css` | Styles the app shell, header, welcome panel, and status badges. |
| `scripts/generate-catalog.ts` | Generates 40 rows with 250 synthetic titles per row and writes the JSON fixture. |
| `src/data/catalog.json` | Stores the generated fixture for later application use. |
| `public/posters/poster-placeholder.svg` | Supplies a local image asset without an external request. |
| `vite.config.ts` | Configures the Vite + React development and build toolchain. |

### Browser startup, step by step

1. The browser loads `index.html`, which contains the root DOM element.
2. Vite resolves the module entry at `src/main.tsx`.
3. `main.tsx` imports global styles and calls `createRoot` to attach React to
   the root element.
4. React renders `App`, which currently returns a header and a welcome panel.
5. The CSS files apply global defaults and component-level presentation.

`StrictMode` is a development aid that helps reveal certain unsafe patterns. It
does not add an application state layer or a production UI feature.

## Catalog data flow

Run `npm run generate:catalog` to execute the TypeScript generator through
`tsx`. The generator derives the output path from its own file location rather
than assuming the command was started from a particular working directory.
It creates stable IDs (`row-<row index>` and `t-<row index>-<item index>`),
human-readable synthetic titles, and a local placeholder image path.

Keeping generation separate from browser rendering has useful properties:

- **Repeatability:** the same constants produce the same shape and IDs on each
  run.
- **Control:** the number of rows and items can be adjusted to create
  comparable workloads.
- **Isolation:** data preparation does not need a live service, credentials,
  or network access.
- **Honest scope:** a large fixture is not itself a performance result. The UI
  must consume it and be measured before we can draw conclusions about
  rendering.

At this milestone, the generator writes a complete JSON file and the browser
does not import it. A later data-loading change should define and validate the
catalog shape at the point where it enters the UI, then pass the data to
components rather than having unrelated components read a global file.

## Build and quality boundary

- **Vite** serves the app during development and bundles the browser code for
  production.
- **TypeScript** checks the application and build configuration.
- **Oxlint** checks the source with the repository's configured rules.
- **The generator** is a separate Node-side script and is not part of the
  browser bundle.

The current validation commands are `npm run lint` and `npm run build`.
Building successfully confirms the current TypeScript and bundling pipeline;
it does not measure runtime scrolling performance.

## How the architecture should grow

The roadmap describes a TV browsing interface with keyboard navigation,
focus state, large lists, and performance measurement. A sensible direction
is to preserve clear boundaries as those features arrive:

1. **Data boundary:** model catalog rows and items with explicit TypeScript
   types. Keep generated or fetched data separate from presentation.
2. **Presentation components:** compose the screen from focused pieces such as
   a page, a shelf/row, and a title card. Give each component the data and
   state it needs through props.
3. **Interaction boundary:** keep remote-key interpretation out of visual
   components. Translate key events into named navigation actions, then
   update one explicit focus model.
4. **Rendering boundary:** make a straightforward implementation first.
   Introduce windowing or image-loading optimizations only when the benchmark
   shows a measurable bottleneck.
5. **Measurement boundary:** keep performance instrumentation and benchmark
   output separate from product UI logic so results can be repeated and
   compared.

The broader roadmap proposes Redux Toolkit for focus and experiment state, but
Redux Toolkit is not currently a dependency and there is no store in the
runtime. We should make that decision when the focus model is implemented,
based on the state-sharing and testability needs at that point—not describe it
as an existing architectural fact.

## Why these boundaries help

- **Independent reasoning:** the generator, UI, and measurement code solve
  different problems and can be changed without entangling every file.
- **Testability:** pure navigation and range calculations can be tested
  without rendering the entire application.
- **Performance diagnosis:** separating data work, state updates, and rendering
  makes it easier to find which layer causes slow interactions.
- **Incremental delivery:** each milestone can add one capability while
  keeping the app runnable and its current behavior understandable.
