import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface FocusState {
  row: number;
  col: number;
  lastColByRow: Record<number, number>;
  rowLengths: number[];
}

const initialState: FocusState = {
  row: 0,
  col: 0,
  lastColByRow: {},
  rowLengths: [],
};

function clampIndex(index: number, length: number): number {
  return Math.max(0, Math.min(index, length - 1));
}

function findNextFocusableRow(
  rowLengths: number[],
  startRow: number,
  direction: -1 | 1,
): number {
  for (
    let row = startRow;
    row >= 0 && row < rowLengths.length;
    row += direction
  ) {
    if (rowLengths[row] > 0) {
      return row;
    }
  }

  return -1;
}

const focusSlice = createSlice({
  name: "focus",
  initialState,
  reducers: {
    setRowLengths(state, action: PayloadAction<number[]>) {
      const rowLengths = action.payload.map((length) =>
        Number.isFinite(length) ? Math.max(0, Math.floor(length)) : 0,
      );

      if (state.rowLengths[state.row] > 0) {
        state.lastColByRow[state.row] = state.col;
      }

      const lastColByRow: Record<number, number> = {};
      rowLengths.forEach((length, row) => {
        const lastCol = state.lastColByRow[row];
        if (length > 0 && lastCol !== undefined) {
          lastColByRow[row] = clampIndex(lastCol, length);
        }
      });

      state.rowLengths = rowLengths;
      state.lastColByRow = lastColByRow;

      const activeRow =
        rowLengths[state.row] > 0
          ? state.row
          : findNextFocusableRow(rowLengths, 0, 1);

      if (activeRow === -1) {
        state.row = 0;
        state.col = 0;
        state.lastColByRow = {};
        return;
      }

      state.row = activeRow;
      state.col = clampIndex(
        state.lastColByRow[activeRow] ?? 0,
        rowLengths[activeRow],
      );
      state.lastColByRow[activeRow] = state.col;
    },
    setFocusPosition(
      state,
      action: PayloadAction<{ row: number; col: number }>,
    ) {
      const { row, col } = action.payload;
      const rowLength = state.rowLengths[row];
      if (
        !Number.isInteger(row) ||
        !Number.isInteger(col) ||
        row < 0 ||
        rowLength === undefined ||
        rowLength === 0
      ) {
        return;
      }

      if (state.rowLengths[state.row] > 0) {
        state.lastColByRow[state.row] = state.col;
      }

      state.row = row;
      state.col = clampIndex(col, rowLength);
      state.lastColByRow[row] = state.col;
    },
    moveRight(state) {
      const rowLength = state.rowLengths[state.row] ?? 0;
      if (rowLength === 0) {
        return;
      }

      state.col = Math.min(state.col + 1, rowLength - 1);
      state.lastColByRow[state.row] = state.col;
    },
    moveLeft(state) {
      const rowLength = state.rowLengths[state.row] ?? 0;
      if (rowLength === 0) {
        return;
      }

      state.col = Math.max(state.col - 1, 0);
      state.lastColByRow[state.row] = state.col;
    },
    moveDown(state) {
      moveToAdjacentRow(state, 1);
    },
    moveUp(state) {
      moveToAdjacentRow(state, -1);
    },
  },
});

function moveToAdjacentRow(state: FocusState, direction: -1 | 1): void {
  if (state.rowLengths[state.row] > 0) {
    state.lastColByRow[state.row] = state.col;
  }

  const nextRow = findNextFocusableRow(
    state.rowLengths,
    state.row + direction,
    direction,
  );
  if (nextRow === -1) {
    return;
  }

  state.row = nextRow;
  state.col = clampIndex(
    state.lastColByRow[nextRow] ?? 0,
    state.rowLengths[nextRow],
  );
  state.lastColByRow[nextRow] = state.col;
}

export const {
  setFocusPosition,
  setRowLengths,
  moveRight,
  moveLeft,
  moveDown,
  moveUp,
} = focusSlice.actions;
export default focusSlice.reducer;
