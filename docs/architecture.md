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
    generator --> data["public/catalog.json"]
  end

  subgraph browser["Browser runtime (Vite + React)"]
    html["index.html<br/>#root mount point"] --> entry["src/main.tsx<br/>Provider + createRoot"]
    entry --> store["src/store/index.ts<br/>Redux store"]
    store --> app["src/App.tsx<br/>catalog shelves and title cards"]
    app --> ranges["src/lib/virtualRange.ts<br/>row and item windows"]
    app --> keys["src/hooks/useRemoteKeys.ts<br/>key-to-action mapping"]
    keys --> store
    entry --> globalStyles["src/index.css<br/>global styles"]
    app --> appStyles["src/App.css<br/>app styles"]
  end

  subgraph focusModel["Focus-state transitions"]
    tests["tests/*.test.ts<br/>Node test runner"] --> reducer["src/store/focusSlice.ts<br/>Redux Toolkit reducer"]
    tests --> ranges
    store --> reducer
  end

  subgraph benchmark["Performance benchmark (separate Node process)"]
    benchCommand["npm run bench"] --> benchScript["scripts/benchmark.ts"]
    benchScript --> playwright["Playwright + Chromium"]
    playwright --> cdp["CDP<br/>CPU throttle + metrics"]
    playwright --> preview["Vite production preview"]
  end

  subgraph experiments["A/B experiments"]
    app --> bucketing["src/lib/bucketing.ts<br/>sticky variants"]
    app --> events["src/lib/events.ts<br/>exposure and selection"]
    events --> localStorage["Browser localStorage"]
  end

  subgraph quality["Testing and quality gates"]
    tests --> axe["Playwright + axe-core"]
    benchScript --> budget["scripts/check-budgets.ts"]
    budget --> ci["GitHub Actions"]
  end

  preview -->|"serves built app"| app
  data -->|"fetches static JSON"| app
```

The catalog-generation and browser-runtime flows are separate. The browser
fetches the generated static JSON; the data is not bundled into the app's
JavaScript.

- The **generator** creates a predictable data fixture in `public/`.
- The **React app** loads and validates the catalog, then renders shelves and
  title cards around the focused row and column. The `?mode=naive` query
  parameter disables windowing for comparison.
- The **key hook** translates keyboard events to Redux actions. The reducer
  owns navigation transitions, while the app renders the focused position.
- The **range helper** computes end-exclusive row and item windows. Tests cover
  both focus transitions and window boundaries.
- The **benchmark runner** builds and serves the production app, drives
  repeatable keyboard scenarios in Chromium, and collects runtime metrics.
- The **experiment modules** assign stable variants and record exposure/select
  events locally for the A/B framework.
- The **CI budget check** benchmarks the production app and fails on windowed
  4× regressions outside configured limits.

## Responsibilities of the current files

| File | Responsibility |
|---|---|
| `index.html` | Provides the document and the `#root` mount point. |
| `src/main.tsx` | Creates the store, wraps the app in `Provider`, imports global CSS, and mounts `App` inside `StrictMode`. |
| `src/App.tsx` | Loads and validates the catalog, renders windowed shelves and cards, and synchronizes visible focus and selection. |
| `src/index.css` | Sets global typography, page defaults, colors, and box sizing. |
| `src/App.css` | Styles the app shell, shelves, title cards, and focused state. |
| `scripts/generate-catalog.ts` | Generates 40 rows with 250 synthetic titles per row and writes the JSON fixture. |
| `public/catalog.json` | Stores the generated fixture as a static asset fetched by the browser. |
| `public/posters/poster-placeholder.svg` | Supplies a local image asset without an external request. |
| `src/store/focusSlice.ts` | Defines focus-state transitions and navigation actions. |
| `src/store/index.ts` | Configures the Redux store used by the React Provider. |
| `src/hooks/useRemoteKeys.ts` | Maps arrow, Enter, and Back/Escape key events to navigation behavior. |
| `src/lib/virtualRange.ts` | Calculates end-exclusive row and item windows around focus. |
| `tests/focusSlice.test.ts` | Tests focus movement rules using Node's built-in test runner. |
| `tests/virtualRange.test.ts` | Tests range boundaries, empty lists, and window sizes. |
| `scripts/benchmark.ts` | Compares windowed and naive production builds using Playwright and Chrome DevTools Protocol metrics. |
| `src/lib/bucketing.ts` | Assigns repeatable experiment variants and creates an anonymous visitor ID. |
| `src/lib/events.ts` | Stores experiment exposure and selection events locally. |
| `src/lib/analysis.ts` | Computes two-proportion z-test results and conversion lift. |
| `scripts/analyze-experiment.ts` | Prints clearly labeled synthetic experiment analysis. |
| `bench/budgets.json` | Sets performance limits for the windowed 4× CI scenario. |
| `scripts/check-budgets.ts` | Loads benchmark JSON and reports budget failures. |
| `playwright.config.ts` | Starts the production preview and runs e2e tests. |
| `tests/e2e/accessibility.spec.ts` | Checks axe violations and keyboard behavior. |
| `docs/demo-script.md` | Provides a short presentation and demo sequence. |
| `vite.config.ts` | Configures the Vite + React development and build toolchain. |
| `vercel.json` | Configures Vercel to build with Vite and serve the `dist` output. |

### Browser startup, step by step

1. The browser loads `index.html`, which contains the root DOM element.
2. Vite resolves the module entry at `src/main.tsx`.
3. `main.tsx` creates the Redux store, wraps the app in `Provider`, and calls
   `createRoot` to attach React to the root element.
4. `App` fetches `/catalog.json`, validates the response, and initializes row
   lengths in the focus reducer.
5. `App` renders only the current row/card windows, using spacers to preserve
   layout; `?mode=naive` renders the full catalog for comparison.
6. The key hook dispatches navigation actions and the selected card is brought
   into view.
7. The CSS files apply global defaults and component-level presentation.

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

The generator writes a complete JSON file into `public/`, and the browser
fetches it as a separate asset. The response shape is checked at the boundary
before the data is passed to the rendering logic.

## Build and quality boundary

- **Vite** serves the app during development and bundles the browser code for
  production.
- **TypeScript** checks the application and build configuration.
- **Oxlint** checks the source with the repository's configured rules.
- **Node's built-in test runner**, launched through `tsx`, tests the focus
  reducer without adding a separate test framework.
- **Playwright and Chrome DevTools Protocol** drive the production preview
  through repeatable CPU-throttled scenarios and collect performance metrics.
- **The generator** is a separate Node-side script. The generated catalog is
  served as static JSON, not embedded in the application JavaScript.

The current validation commands are `npm test`, `npm run lint`, and
`npm run build`. `npm run bench` separately measures a production preview;
its results are machine-dependent and are not a substitute for testing on a
target TV device.

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
4. **Rendering boundary:** the initial windowed implementation is in place.
   Compare it with naive mode, then use benchmark results to tune range sizes
   and image-loading behavior.
5. **Measurement boundary:** the benchmark runner is separate from product UI
   logic. Extend it only when a new measurement can be repeated and compared.

The current UI uses Redux Toolkit for shared focus state. Additional
application state should be added only when a later milestone needs it.

## Why these boundaries help

- **Independent reasoning:** the generator, UI, and measurement code solve
  different problems and can be changed without entangling every file.
- **Testability:** pure navigation and range calculations can be tested
  without rendering the entire application.
- **Performance diagnosis:** separating data work, state updates, and rendering
  makes it easier to find which layer causes slow interactions.
- **Incremental delivery:** each milestone can add one capability while
  keeping the app runnable and its current behavior understandable.
