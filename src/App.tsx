import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./App.css";
import { useRemoteKeys } from "./hooks/useRemoteKeys";
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
      setSelectedItem(item);
    }
  }, [catalog, focus.col, focus.row]);

  const clearSelection = useCallback(() => {
    setSelectedItem(null);
  }, []);

  useRemoteKeys(selectFocusedItem, clearSelection);

  useEffect(() => {
    if (catalog.length > 0) {
      document.getElementById(`title-${focus.row}-${focus.col}`)?.focus();
    }
  }, [catalog.length, focus.col, focus.row]);

  function selectItem(row: number, col: number, item: CatalogItem): void {
    dispatch(setFocusPosition({ row, col }));
    setSelectedItem(item);
  }

  const statusMessage = loadError
    ? `Unable to load catalog: ${loadError}`
    : selectedItem
      ? `Selected ${selectedItem.title}. Press Escape to return to browsing.`
      : isLoading
        ? "Loading catalog..."
        : "Browse the synthetic catalog.";

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">A keyboard-first browsing prototype</p>
        <h1>TV UI Performance Lab</h1>
        <p className="browse-instructions">
          Use the arrow keys to browse, Enter to select, and Escape to clear
          the selection.
        </p>
      </header>

      <p className="selection-status" role="status" aria-live="polite">
        {statusMessage}
      </p>

      {!isLoading && !loadError && (
        <section className="catalog" aria-label="Title collections">
          {catalog.map((row, rowIndex) => (
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
                {row.items.map((item, colIndex) => {
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
              </div>
            </section>
          ))}
        </section>
      )}
    </main>
  );
}

export default App;
