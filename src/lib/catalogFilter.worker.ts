import { filterCatalog, type FilterCatalogRow } from "./catalogFilter";

self.addEventListener(
  "message",
  (event: MessageEvent<{ catalog: FilterCatalogRow[]; query: string }>) => {
    self.postMessage(filterCatalog(event.data.catalog, event.data.query));
  },
);
