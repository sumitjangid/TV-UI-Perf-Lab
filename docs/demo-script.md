# Two-Minute Demo Script

## 0:00-0:20: What this project is

"TV UI Performance Lab is a keyboard-first synthetic TV catalog. The goal is
to measure and explain the cost of rendering thousands of focusable cards."

Show the initial windowed view and point out the collection rows.

## 0:20-0:45: Keyboard navigation

Use arrow keys to move right, down, back, and to the edges. Demonstrate that
unvisited rows start at the first title and that visited rows restore their
own position.

Press Enter to open a selection and Escape to return.

## 0:45-1:10: Windowing and benchmark

Open `?mode=naive` beside or after the normal view. Explain that naive mode
mounts the full catalog while the default mode mounts only a focus window plus
buffers.

Run `npm run bench` if it is practical in the recording environment. Point out
the DOM-node, heap, long-task, and key-latency differences rather than
repeating every number.

## 1:10-1:35: A/B experiments

Open DevTools and show a fixed anonymous ID. Explain the standard/large tile
and preview-delay experiments, then show exposure and selection events.

Clearly state that the event data and analysis are synthetic and local; they
do not represent real users or production evidence.

## 1:35-2:00: Accessibility and CI

Show the skip link, visible focus ring, live title announcement, and
reduced-motion behavior. Then show the GitHub Actions workflow and budget
gate.

End with the limitation: desktop Chromium and CPU throttling are controlled
comparisons, not validation on real TV hardware.
