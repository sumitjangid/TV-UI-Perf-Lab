export interface FilterCatalogItem {
  id: string;
  title: string;
  poster: string;
}

export interface FilterCatalogRow {
  id: string;
  title: string;
  items: FilterCatalogItem[];
}

export function filterCatalog(
  catalog: FilterCatalogRow[],
  query: string,
): FilterCatalogRow[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) {
    return catalog;
  }

  return catalog
    .map((row) => ({
      ...row,
      items: row.items.filter((item) =>
        item.title.toLocaleLowerCase().includes(normalizedQuery),
      ),
    }))
    .filter((row) => row.items.length > 0);
}
