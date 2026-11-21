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
