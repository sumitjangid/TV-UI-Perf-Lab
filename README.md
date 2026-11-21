# TV UI Performance Lab

A keyboard-first TV browsing prototype for building and measuring responsive
interfaces under constrained conditions. The catalog is synthetic.

## Getting started

```bash
npm ci
npm run generate:catalog
npm run dev
```

Open the local URL printed by Vite. The catalog generator creates 40
collections with 250 synthetic titles each and uses a local placeholder image,
so no external image service or API key is needed.

## Status

Milestone 7: accessibility improvements and automated checks are implemented
locally and await manual validation.

## Guides

- [Learning guide](docs/learning-guide.md): what each milestone builds and why.
- [Interview guide](docs/interview-guide.md): practice questions and ways to
  explain the decisions.
- [Architecture guide](docs/architecture.md): how the app is structured today
  and how it is expected to grow.
- [Design system guide](docs/design-system.md): current visual styles and the
  principles for extending them.

## Checks

```bash
npm run generate:catalog
npm test
npm run lint
npm run build
npm run analyze:experiment
npm run test:e2e
```

## Validate A/B variants locally

1. Start the app with `npm run dev` and open the local URL.
2. Open browser DevTools, then **Application > Local Storage**.
3. Set a known anonymous ID and reload:

   ```js
   localStorage.setItem("tv-perf-lab-anon-id", "qa-visitor-a");
   location.reload();
   ```

4. Inspect the `<main>` element in **Elements**:
   - `tile-size-standard` or `tile-size-large`
   - `data-preview-delay="preview-400"` or `data-preview-delay="preview-1200"`
5. Wait for the focus preview, or move focus with the arrow keys.
6. Press Enter or click a tile to record a selection.
7. Inspect `tv-perf-lab-experiment-events` in Local Storage. Each entry
   identifies the visitor, experiment, variant, event type, and timestamp.

Use different `tv-perf-lab-anon-id` values to inspect different assignments.
The same ID remains assigned to the same variants after a reload. Clearing
both local-storage keys starts a clean local test.

## Benchmark

Install Chromium once with `npx playwright install chromium`, then run
`npm run bench` to compare windowed and naive rendering under CPU throttling.
On Linux, if Chromium reports missing shared libraries, install them with
`npx playwright install-deps chromium`.
