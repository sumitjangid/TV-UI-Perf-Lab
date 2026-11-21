import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./App.css";
import { useRemoteKeys } from "./hooks/useRemoteKeys";
import { assignVariant, getOrCreateUserId } from "./lib/bucketing";
import { logExperimentEvent } from "./lib/events";
import { rowFocusColumn, windowRange } from "./lib/virtualRange";
import type { AppDispatch, RootState } from "./store";
import {
  setFocusPosition,
  setRowLengths,
} from "./store/focusSlice";

interface CatalogItem {
  id: string;
  title: string;
  poster: string;
}

interface CatalogRow {
  id: string;
  title: string;
  items: CatalogItem[];
}

const ROWS_BEFORE = 2;
const ROWS_AFTER = 3;
const ITEMS_BEFORE = 7;
const ITEMS_AFTER = 6;
const TILE_GAP_REM = 1;
const SHELF_HEIGHT_REM = 20;
const SHELF_GAP_REM = 2;
const SHELF_STEP_REM = SHELF_HEIGHT_REM + SHELF_GAP_REM;
const isNaiveMode =
  new URLSearchParams(window.location.search).get("mode") === "naive";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCatalogItem(value: unknown): value is CatalogItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.poster === "string"
  );
}

function isCatalog(value: unknown): value is CatalogRow[] {
  return (
    Array.isArray(value) &&
    value.every(
      (row) =>
        isRecord(row) &&
        typeof row.id === "string" &&
        typeof row.title === "string" &&
        Array.isArray(row.items) &&
        row.items.every(isCatalogItem),
    )
  );
}

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const focus = useSelector((state: RootState) => state.focus);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [preview, setPreview] = useState<{
    row: number;
    col: number;
    title: string;
  } | null>(null);
  const userId = getOrCreateUserId();
  const tileVariant = assignVariant(
    userId,
    "tile-size",
    ["standard", "large"] as const,
  );
  const previewVariant = assignVariant(
    userId,
    "preview-delay",
    ["preview-400", "preview-1200"] as const,
  );
  const tileWidthRem = tileVariant === "large" ? 10.5 : 9;
  const tileStepRem = tileWidthRem + TILE_GAP_REM;
  const previewDelayMs =
    previewVariant === "preview-400" ? 400 : 1200;

  useEffect(() => {
    logExperimentEvent({
      userId,
      experiment: "tile-size",
      variant: tileVariant,
      type: "exposure",
    });
    logExperimentEvent({
      userId,
      experiment: "preview-delay",
      variant: previewVariant,
      type: "exposure",
    });
  }, [previewVariant, tileVariant, userId]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalog(): Promise<void> {
      try {
        const response = await fetch(
          `${import.meta.env.BASE_URL}catalog.json`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error(`Catalog request failed (${response.status}).`);
        }

        const data: unknown = await response.json();
        if (!isCatalog(data)) {
          throw new Error("Catalog data has an unexpected format.");
        }

        setCatalog(data);
        dispatch(setRowLengths(data.map((row) => row.items.length)));
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(
            error instanceof Error ? error.message : String(error),
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadCatalog();
    return () => controller.abort();
  }, [dispatch]);

  const selectFocusedItem = useCallback(() => {
    const item = catalog[focus.row]?.items[focus.col];
    if (item) {
      logExperimentEvent({
        userId,
        experiment: "tile-size",
        variant: tileVariant,
        type: "select",
      });
      logExperimentEvent({
        userId,
        experiment: "preview-delay",
        variant: previewVariant,
        type: "select",
      });
      setSelectedItem(item);
    }
  }, [catalog, focus.col, focus.row, previewVariant, tileVariant, userId]);

  const clearSelection = useCallback(() => {
    setSelectedItem(null);
  }, []);

  useRemoteKeys(selectFocusedItem, clearSelection);

  useEffect(() => {
    if (catalog.length > 0) {
      document.getElementById(`title-${focus.row}-${focus.col}`)?.focus();
    }
  }, [catalog.length, focus.col, focus.row]);

  useEffect(() => {
    const item = catalog[focus.row]?.items[focus.col];
    if (!item) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setPreview({ row: focus.row, col: focus.col, title: item.title });
    }, previewDelayMs);
    return () => window.clearTimeout(timeout);
  }, [catalog, focus.col, focus.row, previewDelayMs]);

  const previewTitle =
    preview?.row === focus.row && preview.col === focus.col
      ? preview.title
      : null;

  function selectItem(row: number, col: number, item: CatalogItem): void {
    dispatch(setFocusPosition({ row, col }));
    logExperimentEvent({
      userId,
      experiment: "tile-size",
      variant: tileVariant,
      type: "select",
    });
    logExperimentEvent({
      userId,
      experiment: "preview-delay",
      variant: previewVariant,
      type: "select",
    });
    setSelectedItem(item);
  }

  const statusMessage = loadError
    ? `Unable to load catalog: ${loadError}`
    : selectedItem
      ? `Selected ${selectedItem.title}. Press Escape to return to browsing.`
      : isLoading
        ? "Loading catalog..."
        : "Browse the synthetic catalog.";

  const rowRange = isNaiveMode
    ? { start: 0, end: catalog.length }
    : windowRange(focus.row, catalog.length, ROWS_BEFORE, ROWS_AFTER);

  return (
    <main
      className={`app-shell tile-size-${tileVariant}`}
      data-preview-delay={previewVariant}
    >
      <header className="app-header">
        <p className="eyebrow">A keyboard-first browsing prototype</p>
        <h1>TV UI Performance Lab</h1>
        <p className="browse-instructions">
          Use the arrow keys to browse, Enter to select, and Escape to clear
          the selection.
        </p>
        <p className="render-mode">
          {isNaiveMode
            ? "Naive baseline: all title cards are mounted."
            : "Windowed rendering: visible titles plus a small buffer."}
        </p>
        {previewTitle && (
          <p className="title-preview" aria-live="polite">
            Preview: {previewTitle}
          </p>
        )}
      </header>

      <p className="selection-status" role="status" aria-live="polite">
        {statusMessage}
      </p>

      {!isLoading && !loadError && (
        <section className="catalog" aria-label="Title collections">
          {rowRange.start > 0 && (
            <div
              aria-hidden="true"
              className="shelf-spacer"
              style={{
                height: `${rowRange.start * SHELF_STEP_REM - SHELF_GAP_REM}rem`,
              }}
            />
          )}
          {catalog.slice(rowRange.start, rowRange.end).map((row, rowOffset) => {
            const rowIndex = rowRange.start + rowOffset;
            const rowFocus = rowFocusColumn(
              rowIndex,
              focus.row,
              focus.col,
              focus.lastColByRow,
            );
            const itemRange = isNaiveMode
              ? { start: 0, end: row.items.length }
              : windowRange(
                  rowFocus,
                  row.items.length,
                  ITEMS_BEFORE,
                  ITEMS_AFTER,
                );

            return (
              <section
                className="shelf"
                aria-labelledby={`shelf-${row.id}`}
                key={row.id}
              >
                <h2 id={`shelf-${row.id}`}>{row.title}</h2>
                <div
                  className="shelf-track"
                  aria-label={`${row.title} titles`}
                  role="group"
                >
                  {itemRange.start > 0 && (
                    <div
                      aria-hidden="true"
                      className="tile-spacer"
                      style={{
                        width: `${itemRange.start * tileStepRem - TILE_GAP_REM}rem`,
                      }}
                    />
                  )}
                  {row.items
                    .slice(itemRange.start, itemRange.end)
                    .map((item, itemOffset) => {
                      const colIndex = itemRange.start + itemOffset;
                      const isFocused =
                        focus.row === rowIndex && focus.col === colIndex;

                      return (
                        <button
                          className={`title-card${isFocused ? " is-focused" : ""}`}
                          id={`title-${rowIndex}-${colIndex}`}
                          key={item.id}
                          onClick={() => selectItem(rowIndex, colIndex, item)}
                          tabIndex={isFocused ? 0 : -1}
                          type="button"
                        >
                          <img
                            alt=""
                            className="title-poster"
                            decoding="async"
                            height="450"
                            loading="lazy"
                            src={item.poster}
                            width="300"
                          />
                          <span>{item.title}</span>
                        </button>
                      );
                    })}
                  {itemRange.end < row.items.length && (
                    <div
                      aria-hidden="true"
                      className="tile-spacer"
                      style={{
                        width: `${(row.items.length - itemRange.end) * tileStepRem - TILE_GAP_REM}rem`,
                      }}
                    />
                  )}
                </div>
              </section>
            );
          })}
          {rowRange.end < catalog.length && (
            <div
              aria-hidden="true"
              className="shelf-spacer"
              style={{
                height: `${(catalog.length - rowRange.end) * SHELF_STEP_REM - SHELF_GAP_REM}rem`,
              }}
            />
          )}
        </section>
      )}
    </main>
  );
}

export default App;
