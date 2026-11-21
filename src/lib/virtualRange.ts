export interface Range {
  start: number;
  /** The end index is exclusive. */
  end: number;
}

export function rowFocusColumn(
  rowIndex: number,
  focusedRow: number,
  focusedColumn: number,
  lastColByRow: Record<number, number>,
): number {
  if (rowIndex === focusedRow) {
    return focusedColumn;
  }

  return lastColByRow[rowIndex] ?? 0;
}

export function windowRange(
  focused: number,
  total: number,
  before: number,
  after: number,
): Range {
  if (total <= 0) {
    return { start: 0, end: 0 };
  }

  const focusIndex = Math.min(Math.max(focused, 0), total - 1);
  const start = Math.max(0, focusIndex - before);
  const end = Math.min(total, focusIndex + after + 1);
  return { start, end };
}
