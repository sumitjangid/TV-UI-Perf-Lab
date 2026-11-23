import assert from "node:assert/strict";
import test from "node:test";
import { filterCatalog } from "../src/lib/catalogFilter.ts";

test("catalog filter searches titles and preserves matching rows", () => {
  const catalog = [
    {
      id: "row-a",
      title: "Row A",
      items: [
        { id: "1", title: "Galaxy Quest", poster: "/poster.svg" },
        { id: "2", title: "Ocean Story", poster: "/poster.svg" },
      ],
    },
  ];

  assert.equal(filterCatalog(catalog, "galaxy").length, 1);
  assert.equal(filterCatalog(catalog, "galaxy")[0].items[0].id, "1");
  assert.equal(filterCatalog(catalog, "missing").length, 0);
  assert.equal(filterCatalog(catalog, "").length, 1);
});
