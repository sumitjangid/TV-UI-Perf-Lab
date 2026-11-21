export type ExperimentEventType = "exposure" | "select";

export interface ExperimentEvent {
  userId: string;
  experiment: string;
  variant: string;
  type: ExperimentEventType;
  timestamp: number;
}

const EVENTS_KEY = "tv-perf-lab-experiment-events";
let inMemoryEvents: ExperimentEvent[] = [];
const loggedExposures = new Set<string>();

export function logExperimentEvent(
  event: Omit<ExperimentEvent, "timestamp">,
): void {
  if (event.type === "exposure") {
    const exposureKey =
      `${event.userId}:${event.experiment}:${event.variant}`;
    if (loggedExposures.has(exposureKey)) {
      return;
    }
    loggedExposures.add(exposureKey);
  }
  const entry: ExperimentEvent = {
    ...event,
    timestamp: Date.now(),
  };
  inMemoryEvents = [...inMemoryEvents, entry];

  try {
    const stored = localStorage.getItem(EVENTS_KEY);
    const events: unknown = stored ? JSON.parse(stored) : [];
    const nextEvents = Array.isArray(events) ? [...events, entry] : [entry];
    localStorage.setItem(EVENTS_KEY, JSON.stringify(nextEvents));
  } catch {
    // Keep the event in memory when storage is unavailable.
  }
}

export function getExperimentEvents(): ExperimentEvent[] {
  try {
    const stored = localStorage.getItem(EVENTS_KEY);
    if (!stored) {
      return inMemoryEvents;
    }
    const events: unknown = JSON.parse(stored);
    return Array.isArray(events) ? (events as ExperimentEvent[]) : inMemoryEvents;
  } catch {
    return inMemoryEvents;
  }
}
