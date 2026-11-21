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

Milestone 2: the Redux Toolkit focus-state model is implemented and tested.
Keyboard controls and the browsing UI are next.

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
npm test
npm run lint
npm run build
```
