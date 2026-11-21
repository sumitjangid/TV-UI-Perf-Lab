# TV UI Perf Lab

A TV-remote-style browse UI built with React, Redux and TypeScript, designed to stay fast and light on memory-constrained devices. The point of the project is **measurement**: every optimization is backed by a before-and-after number, every behavior is covered by automated tests, and every product decision can be A/B tested.

> **Heads-up on accuracy.** Package versions, config options and API names change often. Every snippet here is a starting point, so check the current docs (links at the bottom) when something fails. The snippets have not been run for you.

> **Scope note.** Throttling a desktop browser only *imitates* a low-end TV. Say so in your README. If you can, test once on a real streaming stick or TV browser and report what you saw.

---

## 1. What you are building

A home-screen style browse experience:

- Rows of titles ("carousels") that you move through with **arrow keys, Enter and Back only**, like a TV remote.
- A large catalog (thousands of titles) that must stay smooth and keep memory flat.
- A built-in **A/B testing framework** with sticky assignment, event logging and a significance check.
- A **benchmark harness** that runs the app under CPU throttling and records latency, long tasks and JS heap.
- **Jest** unit tests, **Playwright** keyboard end-to-end tests and an **accessibility** check, all enforced in CI with a performance budget.

Use an **original name, layout and styling**. Do not copy any streaming service's logo, brand or UI design.

### Feature list (definition of done)

| Area | Done when |
|---|---|
| Navigation | Arrow keys move focus between tiles and rows; Enter selects; Back returns; vertical moves remember the column |
| Rendering | Only on-screen rows and tiles are mounted; memory stays flat as you scroll |
| Images | Images mount only for visible tiles and decode asynchronously |
| Benchmarks | One command produces a JSON report; a naive baseline and the optimized build are compared |
| A/B tests | Same user always gets the same variant; exposures and clicks are logged; a z-test script reports lift |
| Tests | Reducers, bucketing and range math covered by Jest; key flows covered by Playwright |
| Accessibility | Visible focus, labels, live announcements, reduced-motion support, no axe violations |
| CI | Lint, typecheck, unit, e2e and a performance-budget check all run on pull requests |

---

## 2. Tech stack

- **Vite + React + TypeScript**
- **Redux Toolkit** (state, focus model, experiment state)
- **Jest** + **React Testing Library** (unit and component tests)
- **Playwright** (keyboard end-to-end tests, performance benchmarks via the Chrome DevTools Protocol)
- **@axe-core/playwright** (accessibility checks)
- **ESLint + Prettier**
- **GitHub Actions** (CI) and **GitHub Pages or Vercel** (demo)

---

## 3. Codespaces setup

`.devcontainer/devcontainer.json`
```json
{
  "name": "tv-ui-perf-lab",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:20",
  "forwardPorts": [5173, 4173],
  "postCreateCommand": "npm ci && npx playwright install --with-deps chromium",
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "ms-playwright.playwright",
        "GitHub.copilot",
        "GitHub.copilot-chat"
      ]
    }
  }
}
```

Scaffold the project (the first time only, before `npm ci` will work):
```bash
npm create vite@latest tv-ui-perf-lab -- --template react-ts
cd tv-ui-perf-lab
npm install @reduxjs/toolkit react-redux
npm install -D jest ts-jest jest-environment-jsdom @types/jest \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  @playwright/test @axe-core/playwright
```

Open ports 5173 (dev server) and 4173 (preview of the production build). **Benchmark against the production build** (`npm run build && npm run preview`), never the dev server.

---

## 4. Repository layout

```
tv-ui-perf-lab/
├── .devcontainer/devcontainer.json
├── .github/workflows/ci.yml
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── store/
│   │   ├── index.ts
│   │   ├── focusSlice.ts        # row/column focus model
│   │   ├── catalogSlice.ts
│   │   └── experimentSlice.ts
│   ├── hooks/
│   │   └── useRemoteKeys.ts     # key handling
│   ├── components/
│   │   ├── Shelf.tsx            # one row
│   │   ├── Tile.tsx
│   │   └── Home.tsx
│   ├── lib/
│   │   ├── virtualRange.ts      # windowing math
│   │   ├── bucketing.ts         # sticky A/B assignment
│   │   ├── events.ts            # exposure/click logging
│   │   └── perfMarks.ts
├── public/
│   ├── catalog.json            # generated static data
│   └── posters/
│       └── poster-placeholder.svg
├── scripts/
│   ├── generate-catalog.ts
│   └── analyze-experiment.ts    # z-test on logged events
├── bench/
│   ├── run.ts                   # Playwright + CDP benchmark
│   ├── budgets.json             # CI thresholds
│   └── results/                 # saved reports
├── tests/
│   ├── unit/                    # Jest
│   └── e2e/                     # Playwright
├── jest.config.ts
├── playwright.config.ts
└── README.md
```

---

## 5. Phases

### Phase 0: Catalog data (about 1 hour)

Generate a **synthetic** catalog so you control size and avoid API keys and licensing issues.

`scripts/generate-catalog.ts`
```ts
import { writeFileSync } from "node:fs";

const ROWS = 40;
const TITLES_PER_ROW = 250; // 10,000 titles total

const catalog = Array.from({ length: ROWS }, (_, r) => ({
  id: `row-${r}`,
  title: `Collection ${r + 1}`,
  items: Array.from({ length: TITLES_PER_ROW }, (_, c) => {
    const id = `t-${r}-${c}`;
    return {
      id,
      title: `Title ${r + 1}.${c + 1}`,
      poster: "/posters/poster-placeholder.svg",
    };
  }),
}));

writeFileSync("public/catalog.json", JSON.stringify(catalog));
console.log(`Wrote ${ROWS * TITLES_PER_ROW} titles`);
```

**Done when:** `public/catalog.json` exists and loads in the app.

### Phase 1: Redux focus model (about 3 hours)

Keep focus as plain state so it is easy to test: which row, which column, and the last column used in each row (so moving up and down feels natural).

`src/store/focusSlice.ts`
```ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface FocusState {
  row: number;
  col: number;
  lastColByRow: Record<number, number>;
  rowLengths: number[];
}

const initialState: FocusState = { row: 0, col: 0, lastColByRow: {}, rowLengths: [] };

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const focusSlice = createSlice({
  name: "focus",
  initialState,
  reducers: {
    setRowLengths(state, a: PayloadAction<number[]>) {
      state.rowLengths = a.payload;
    },
    moveRight(state) {
      const max = (state.rowLengths[state.row] ?? 1) - 1;
      state.col = clamp(state.col + 1, 0, max);
      state.lastColByRow[state.row] = state.col;
    },
    moveLeft(state) {
      state.col = clamp(state.col - 1, 0, state.rowLengths[state.row] - 1);
      state.lastColByRow[state.row] = state.col;
    },
    moveDown(state) {
      state.lastColByRow[state.row] = state.col;
      const next = clamp(state.row + 1, 0, state.rowLengths.length - 1);
      state.row = next;
      state.col = clamp(state.lastColByRow[next] ?? state.col, 0, state.rowLengths[next] - 1);
    },
    moveUp(state) {
      state.lastColByRow[state.row] = state.col;
      const next = clamp(state.row - 1, 0, state.rowLengths.length - 1);
      state.row = next;
      state.col = clamp(state.lastColByRow[next] ?? state.col, 0, state.rowLengths[next] - 1);
    },
  },
});

export const { setRowLengths, moveRight, moveLeft, moveDown, moveUp } = focusSlice.actions;
export default focusSlice.reducer;
```

**Done when:** `npm test` proves edge clamping, column memory, and safe handling
of empty rows and catalogs.

### Phase 2: Remote-style key handling and layout (about 4 hours)

`src/hooks/useRemoteKeys.ts`
```ts
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { moveDown, moveLeft, moveRight, moveUp } from "../store/focusSlice";

export function useRemoteKeys(onSelect: () => void, onBack: () => void) {
  const dispatch = useDispatch();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight": dispatch(moveRight()); break;
        case "ArrowLeft":  dispatch(moveLeft());  break;
        case "ArrowDown":  dispatch(moveDown());  break;
        case "ArrowUp":    dispatch(moveUp());    break;
        case "Enter":      onSelect(); break;
        case "Escape":
        case "Backspace":  onBack(); break;
        default: return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatch, onSelect, onBack]);
}
```

Layout rules:
- Use native horizontal scrolling for the first working version; focusing a card brings it into view without custom position calculations.
- Keep card widths and poster aspect ratios fixed so rows remain aligned as focus moves.
- Defer a transform-based "focus lock" until measurements show native scrolling is not smooth enough. Avoid adding animation before there is a measured need.

**Done when:** you can move through the whole screen with the keyboard, with one clearly visible focused tile.

### Phase 3: Windowing and memory (about 1 day)

Render only what is on screen, plus a small buffer.

`src/lib/virtualRange.ts`
```ts
export interface Range { start: number; end: number } // end is exclusive

export function windowRange(focused: number, total: number, before: number, after: number): Range {
  const start = Math.max(0, focused - before);
  const end = Math.min(total, focused + after + 1);
  return { start, end };
}
```

Use it twice:
- **Rows:** render rows `focusedRow - 2` to `focusedRow + 3`; the rest are not mounted.
- **Tiles:** inside each rendered row, render roughly `focusedCol - 3` to `focusedCol + 10`.

Image rules:
- Mount `<img>` only for tiles in the window; unmount when they leave.
- Use `decoding="async"` and explicit `width` and `height` so layout never shifts.
- Optional: prefetch the next two tiles to the right.

Add a **`?mode=naive`** query flag that renders everything with no windowing. This is your baseline for the before-and-after comparison.

**Done when:** scrolling through 10,000 titles keeps the number of mounted DOM nodes roughly constant (check with `document.querySelectorAll('*').length`).

### Phase 4: Benchmark harness (about 1 day)

`bench/run.ts` uses Playwright and the Chrome DevTools Protocol to throttle the CPU and read metrics.

```ts
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

async function runScenario(mode: "naive" | "optimized", cpuRate: number) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpuRate });
  await cdp.send("Performance.enable");

  const t0 = Date.now();
  await page.goto(`http://localhost:4173/?mode=${mode}`);
  await page.waitForSelector("[data-testid='focused-tile']");
  const loadMs = Date.now() - t0;

  // Record long tasks in the page
  await page.evaluate(() => {
    (window as any).__longTasks = 0;
    new PerformanceObserver((list) => {
      (window as any).__longTasks += list.getEntries().length;
    }).observe({ entryTypes: ["longtask"] });
  });

  // Navigate: 100 right, 20 down, 100 left
  const keyLatencies: number[] = [];
  const press = async (key: string) => {
    const t = await page.evaluate(async (k) => {
      const start = performance.now();
      window.dispatchEvent(new KeyboardEvent("keydown", { key: k }));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return performance.now() - start;
    }, key);
    keyLatencies.push(t);
  };
  for (let i = 0; i < 100; i++) await press("ArrowRight");
  for (let i = 0; i < 20; i++) await press("ArrowDown");
  for (let i = 0; i < 100; i++) await press("ArrowLeft");

  const { metrics } = await cdp.send("Performance.getMetrics");
  const heap = metrics.find((m) => m.name === "JSHeapUsedSize")?.value ?? 0;
  const nodes = await page.evaluate(() => document.querySelectorAll("*").length);
  const longTasks = await page.evaluate(() => (window as any).__longTasks);

  keyLatencies.sort((a, b) => a - b);
  const pct = (p: number) => keyLatencies[Math.floor(p * (keyLatencies.length - 1))];

  await browser.close();
  return {
    mode, cpuRate, loadMs,
    keyLatencyP50: pct(0.5), keyLatencyP95: pct(0.95),
    longTasks, jsHeapMB: +(heap / 1024 / 1024).toFixed(1), domNodes: nodes,
  };
}

(async () => {
  const results = [];
  for (const mode of ["naive", "optimized"] as const) {
    for (const rate of [1, 4, 6]) results.push(await runScenario(mode, rate));
  }
  writeFileSync(`bench/results/${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(results, null, 2));
  console.table(results);
})();
```

Notes:
- Run each scenario several times and report the **median**; single runs are noisy.
- Run on the same machine type each time, and record the Codespace machine size in your README.
- `Emulation.setCPUThrottlingRate` and `Performance.getMetrics` are Chrome DevTools Protocol calls; confirm names in the CDP docs if they change.

**Done when:** `npm run bench` prints a table comparing naive and optimized at 1x, 4x and 6x CPU slowdown.

### Phase 5: A/B testing framework (about 1 day)

**Sticky assignment**: the same visitor always gets the same variant, with no server needed.

`src/lib/bucketing.ts`
```ts
// FNV-1a 32-bit hash
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function assignVariant(userId: string, experimentKey: string, variants: string[]): string {
  const bucket = hash(`${experimentKey}:${userId}`) % variants.length;
  return variants[bucket];
}

export function getOrCreateUserId(): string {
  try {
    let id = localStorage.getItem("anon-id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("anon-id", id);
    }
    return id;
  } catch {
    return "anonymous"; // storage blocked: fall back to one stable bucket
  }
}
```

Experiments to implement (pick two):
1. **Tile size:** `standard` vs `large` (hypothesis: larger tiles raise select rate).
2. **Preview delay:** show a title preview after 400 ms vs 1200 ms of focus.

Event logging (`src/lib/events.ts`): log `exposure` (when a variant is shown) and `select` (Enter on a tile) with `userId`, `experiment`, `variant` and a timestamp. Store events in memory and `localStorage`; optionally POST them to a tiny endpoint.

Analysis (`scripts/analyze-experiment.ts`): compute the select rate per variant and a two-proportion z-test.
```ts
export function zTest(c1: number, n1: number, c2: number, n2: number) {
  const p1 = c1 / n1, p2 = c2 / n2;
  const p = (c1 + c2) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  const z = (p2 - p1) / se;
  return { p1, p2, lift: (p2 - p1) / p1, z };
}
```
Treat |z| > 1.96 as significant at roughly the 95% level, and say so with the sample size.

**Important:** this project has no real customers. Generate **synthetic** traffic with a script and **label the results as a simulation** in the README. Never present synthetic lift as real-world results.

**Done when:** the same user ID always yields the same variant, and the analysis script prints per-variant rates and a z-score from the logged events.

### Phase 6: Tests (about 1 day)

`jest.config.ts`
```ts
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/tests/unit/**/*.test.ts?(x)"],
  setupFilesAfterEach: undefined,
};
export default config;
```
> If Jest complains about options or ESM, check the current ts-jest and Jest docs. Vite projects often need small config tweaks (for example, `import.meta` handling).

Unit tests to write:
- `focusSlice`: clamps at edges, remembers column per row, handles rows of different lengths.
- `windowRange`: edges, small lists, large lists.
- `assignVariant`: deterministic, roughly even split across many IDs.

```ts
import { windowRange } from "../../src/lib/virtualRange";

test("window is clamped at the start", () => {
  expect(windowRange(0, 100, 3, 10)).toEqual({ start: 0, end: 11 });
});
test("window is clamped at the end", () => {
  expect(windowRange(99, 100, 3, 10)).toEqual({ start: 96, end: 100 });
});
```

Playwright end-to-end (`tests/e2e/navigation.spec.ts`):
```ts
import { test, expect } from "@playwright/test";

test("arrow keys move focus and Enter selects", async ({ page }) => {
  await page.goto("/");
  const focused = page.getByTestId("focused-tile");
  const first = await focused.textContent();
  await page.keyboard.press("ArrowRight");
  await expect(focused).not.toHaveText(first!);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("detail-panel")).toBeVisible();
});

test("focus moves only through keyboard, never gets lost", async ({ page }) => {
  await page.goto("/");
  for (let i = 0; i < 30; i++) await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("focused-tile")).toBeVisible();
});
```

Also test: Back closes the detail panel, and vertical moves remember the column.

**Done when:** `npm test` and `npx playwright test` both pass locally.

### Phase 7: Accessibility (about 3 hours)

- A visible focus ring that meets contrast guidelines (do not rely on color alone; use an outline and a scale change).
- Rows as lists with `aria-label` (for example "Collection 3"); tiles with accessible names.
- An `aria-live="polite"` region that announces the focused title.
- Respect `prefers-reduced-motion`: disable slide animations.
- Automated check:
```ts
import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

test("home has no detectable a11y violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```
Automated tools catch only part of the problems. Also try the app with a screen reader and note what you learned.

### Phase 8: CI and performance budget (about 3 hours)

`bench/budgets.json` (set limits from your **measured** optimized results, with a margin)
```json
{
  "optimized_cpu4x": { "keyLatencyP95": 50, "jsHeapMB": 60, "domNodes": 3000 }
}
```
The numbers above are placeholders; replace them with limits based on your own measurements.

`.github/workflows/ci.yml`
```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm test
      - run: npm run build
      - run: npm run preview &
      - run: npx wait-on http://localhost:4173
      - run: npx playwright test
      - run: npm run bench:check   # compares the latest bench run with bench/budgets.json
```
`bench:check` is a small script you write: it runs the optimized scenario and exits non-zero if any value exceeds its budget. CI machines are slower and noisier than your Codespace, so give budgets headroom and compare relative regressions where you can.

**Done when:** a pull request that makes performance noticeably worse turns CI red.

### Phase 9: Deploy and polish (about 3 hours)

- Deploy the production build to GitHub Pages or Vercel and add the live link to the README.
- Record a 2-minute demo: keyboard navigation, the naive vs optimized comparison, the A/B analysis and a green CI run.
- Write the README (checklist below).

---

## 6. README checklist

- One-paragraph description and a GIF of keyboard navigation
- Architecture diagram: store, key handler, windowing, event logging
- **Results table**: naive vs optimized at 1x, 4x and 6x CPU slowdown (load time, key latency p50 and p95, long tasks, JS heap, DOM nodes), with the machine specs and the number of runs
- A/B framework explanation and the simulated-data disclaimer
- Test strategy: what Jest covers, what Playwright covers, how the performance gate works
- Accessibility notes, including what automated tools cannot catch
- Limitations: desktop throttling is not real TV hardware; images are placeholders; data is synthetic
- "What I would do next": real-device testing, a Web Worker for data prep, low-memory image formats, real telemetry
- Credits and licenses for any libraries and placeholder services used

---

## 7. Schedule

| When | Target |
|---|---|
| Weekend 1 | Phases 0 to 2: catalog, Redux focus model, keyboard navigation |
| Weekend 2 | Phases 3 and 4: windowing, memory work, benchmark table |
| Weekend 3 | Phases 5 and 6: A/B framework and tests |
| Weekend 4 | Phases 7 to 9: accessibility, CI budget, deploy, README, demo video |

If time is short, stop after Phase 4. Navigation, windowing and a measured benchmark table are the core of the project.

---

## 8. Stretch ideas

- Test the production build on a real streaming stick or TV browser and compare it with your throttled desktop numbers.
- Add a Web Worker that prepares row data off the main thread.
- Compare image strategies (placeholder blur, smaller poster sizes, AVIF/WebP) by memory and decode time.
- Add a "performance overlay" (press a key to show FPS and heap) for the demo.
- Add Storybook for `Tile` and `Shelf`.

---

## 9. Prompts to paste into Copilot Chat or Claude Code

**Scaffold and focus model:** "Create a Vite React TypeScript app with Redux Toolkit. Implement a `focusSlice` with `row`, `col`, `lastColByRow` and `rowLengths`, plus moveUp/Down/Left/Right reducers that clamp at edges and remember the last column for each row. Write Jest tests for edge cases."

**Windowing:** "Add row and tile windowing to the Home screen. Render only rows from focusedRow-2 to focusedRow+3 and tiles from focusedCol-3 to focusedCol+10. Use transform-based movement and a fixed tile size. Add a `?mode=naive` flag that renders everything for benchmarking."

**Benchmark:** "Write `bench/run.ts` using Playwright and a CDP session. Throttle CPU at 1x, 4x and 6x, load the built app in naive and optimized modes, send 220 key presses, and record load time, key latency p50 and p95, long tasks, JSHeapUsedSize and DOM node count. Save JSON and print a table."

**A/B framework:** "Implement sticky variant assignment with an FNV-1a hash of experimentKey and userId, an events logger for exposure and select, and `scripts/analyze-experiment.ts` that computes select rate per variant and a two-proportion z-test."

**Review:** "Review this project for keyboard accessibility problems, memory leaks (listeners and timers not cleaned up), and anything that causes layout thrash during navigation. List issues by severity."

---

## 10. Useful docs (verify current names and versions)

- React: react.dev
- Redux Toolkit: redux-toolkit.js.org
- Jest: jestjs.io
- Testing Library: testing-library.com
- Playwright: playwright.dev
- Chrome DevTools Protocol (Emulation, Performance domains): chromedevtools.github.io/devtools-protocol
- axe-core for Playwright: github.com/dequelabs/axe-core-npm
- Web performance (long tasks, Core Web Vitals): web.dev
- WAI-ARIA Authoring Practices: w3.org/WAI/ARIA/apg