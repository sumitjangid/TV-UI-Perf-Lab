export interface ZTestResult {
  p1: number;
  p2: number;
  lift: number;
  z: number;
}

export function zTest(
  conversions1: number,
  total1: number,
  conversions2: number,
  total2: number,
): ZTestResult {
  if (total1 <= 0 || total2 <= 0) {
    throw new Error("Each variant must have at least one observation.");
  }
  if (
    conversions1 < 0 ||
    conversions2 < 0 ||
    conversions1 > total1 ||
    conversions2 > total2
  ) {
    throw new Error("Conversions must be within the observation totals.");
  }

  const p1 = conversions1 / total1;
  const p2 = conversions2 / total2;
  const pooled = (conversions1 + conversions2) / (total1 + total2);
  const standardError = Math.sqrt(
    pooled * (1 - pooled) * (1 / total1 + 1 / total2),
  );
  if (standardError === 0) {
    return { p1, p2, lift: p2 - p1 === 0 ? 0 : Number.POSITIVE_INFINITY, z: 0 };
  }

  return {
    p1,
    p2,
    lift: p1 === 0 ? Number.POSITIVE_INFINITY : (p2 - p1) / p1,
    z: (p2 - p1) / standardError,
  };
}
