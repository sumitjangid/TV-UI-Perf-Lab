import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROWS = 40;
const TITLES_PER_ROW = 250;
const outputPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../public/catalog.json",
);

const catalog = Array.from({ length: ROWS }, (_, rowIndex) => ({
  id: `row-${rowIndex}`,
  title: `Collection ${rowIndex + 1}`,
  items: Array.from({ length: TITLES_PER_ROW }, (_, itemIndex) => {
    const id = `t-${rowIndex}-${itemIndex}`;
    return {
      id,
      title: `Title ${rowIndex + 1}.${itemIndex + 1}`,
      poster: "/posters/poster-placeholder.svg",
    };
  }),
}));

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(catalog)}\n`);
console.log(`Wrote ${ROWS * TITLES_PER_ROW} titles to ${outputPath}`);
