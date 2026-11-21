export type ExperimentVariant = "standard" | "large" | "preview-400" | "preview-1200";

function hash(value: string): number {
  let result = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 0x01000193);
  }
  return result >>> 0;
}

export function assignVariant<T extends string>(
  userId: string,
  experimentKey: string,
  variants: readonly T[],
): T {
  if (variants.length === 0) {
    throw new Error("An experiment must have at least one variant.");
  }
  return variants[hash(`${experimentKey}:${userId}`) % variants.length];
}

export function getOrCreateUserId(): string {
  try {
    const existing = localStorage.getItem("tv-perf-lab-anon-id");
    if (existing) {
      return existing;
    }
    const userId =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("tv-perf-lab-anon-id", userId);
    return userId;
  } catch {
    return "anonymous";
  }
}
