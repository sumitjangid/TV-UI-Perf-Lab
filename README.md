# TV UI Performance Lab

An original, keyboard-first TV browsing prototype for learning how to build and
measure responsive interfaces under constrained conditions. The catalog is
synthetic; it does not represent real titles or users.

## Getting started

```bash
npm ci
npm run generate:catalog
npm run dev
```

Open the local URL printed by Vite. The catalog generator creates 40
collections with 250 synthetic titles each and uses a local placeholder image,
so no external image service or API key is needed.

## Current milestone

Milestone 1 establishes the React + TypeScript app and deterministic catalog
generation. Keyboard navigation and browsing UI are the next milestone.

### What we built and why

- **React + TypeScript foundation:** React gives us a component-based UI, while
  TypeScript helps catch data-shape and interface mistakes during development.
- **Deterministic synthetic catalog:** The generator creates 40 collections
  with 250 titles each. A predictable 10,000-item dataset lets us test and
  compare UI performance without network variability, API credentials, or
  third-party content.
- **Local placeholder poster:** Keeping assets local avoids external requests
  and makes the prototype reproducible offline.

### Interview practice

Be ready to explain:

1. **Why use synthetic data for a performance prototype?** It gives us a
   repeatable workload and isolates UI behavior from API latency and changing
   responses.
2. **Why generate the catalog instead of hand-writing it?** A small script
   produces a large, consistent fixture quickly and makes its size easy to
   change for experiments.
3. **What does this milestone not prove yet?** It establishes the app and data
   foundation; it does not yet measure rendering performance or demonstrate
   keyboard navigation. Those come in later milestones.

For each milestone, we’ll build incrementally, explain the key decisions and
tradeoffs, verify the result, and finish with interview questions and a concise
way to present the work.

Useful checks:

```bash
npm run lint
npm run build
```
