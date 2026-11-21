import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import focusReducer, {
  moveDown,
  moveLeft,
  moveRight,
  moveUp,
  setFocusPosition,
  setRowLengths,
  type FocusState,
} from "../src/store/focusSlice";

function createFocus(rowLengths: number[]): FocusState {
  return focusReducer(undefined, setRowLengths(rowLengths));
}

describe("focus reducer", () => {
  it("clamps horizontal and vertical movement at row boundaries", () => {
    let state = createFocus([2, 3]);

    state = focusReducer(state, moveLeft());
    equal(state.col, 0);

    state = focusReducer(state, moveRight());
    state = focusReducer(state, moveRight());
    equal(state.col, 1);

    state = focusReducer(state, moveDown());
    state = focusReducer(state, moveRight());
    state = focusReducer(state, moveRight());
    equal(state.row, 1);
    equal(state.col, 2);

    state = focusReducer(state, moveDown());
    equal(state.row, 1);

    state = focusReducer(state, moveUp());
    state = focusReducer(state, moveUp());
    equal(state.row, 0);
    equal(state.col, 1);
  });

  it("remembers the last focused column in each row", () => {
    let state = createFocus([5, 4]);

    state = focusReducer(state, moveRight());
    state = focusReducer(state, moveRight());
    state = focusReducer(state, moveDown());
    equal(state.col, 2);

    state = focusReducer(state, moveRight());
    state = focusReducer(state, moveUp());
    equal(state.col, 2);

    state = focusReducer(state, moveDown());
    equal(state.col, 3);
  });

  it("clamps a remembered column when moving into a shorter row", () => {
    let state = createFocus([5, 2, 4]);
    for (let step = 0; step < 4; step += 1) {
      state = focusReducer(state, moveRight());
    }

    state = focusReducer(state, moveDown());
    equal(state.row, 1);
    equal(state.col, 1);

    state = focusReducer(state, moveUp());
    equal(state.row, 0);
    equal(state.col, 4);
  });

  it("skips empty rows during vertical movement", () => {
    let state = createFocus([0, 2, 0, 4]);
    equal(state.row, 1);

    state = focusReducer(state, moveDown());
    equal(state.row, 3);

    state = focusReducer(state, moveUp());
    equal(state.row, 1);
  });

  it("keeps an empty catalog in a safe, inert focus state", () => {
    for (const rowLengths of [[], [0, 0]]) {
      let state = createFocus(rowLengths);
      state = focusReducer(state, moveLeft());
      state = focusReducer(state, moveRight());
      state = focusReducer(state, moveUp());
      state = focusReducer(state, moveDown());

      deepEqual(state, {
        row: 0,
        col: 0,
        lastColByRow: {},
        rowLengths,
      });
    }
  });

  it("clamps remembered positions if row lengths change", () => {
    let state = createFocus([4, 3]);
    for (let step = 0; step < 3; step += 1) {
      state = focusReducer(state, moveRight());
    }
    state = focusReducer(state, moveDown());
    state = focusReducer(state, setRowLengths([2, 3]));
    equal(state.col, 2);

    state = focusReducer(state, moveUp());
    equal(state.col, 1);
  });

  it("updates focus for a clicked item and preserves the previous row column", () => {
    let state = createFocus([4, 3]);
    state = focusReducer(state, moveRight());
    state = focusReducer(state, moveRight());

    state = focusReducer(state, setFocusPosition({ row: 1, col: 8 }));
    equal(state.row, 1);
    equal(state.col, 2);

    state = focusReducer(state, moveUp());
    equal(state.row, 0);
    equal(state.col, 2);
  });
});
