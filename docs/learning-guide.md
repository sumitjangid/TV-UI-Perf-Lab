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
