import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const origin = "http://127.0.0.1:4173";

function startPreviewServer(): ChildProcess {
  const viteCli = fileURLToPath(
    new URL("../node_modules/vite/bin/vite.js", import.meta.url),
  );
  return spawn(
    process.execPath,
    [viteCli, "preview", "--host", "127.0.0.1", "--port", "4173", "--strictPort"],
    { stdio: "inherit" },
  );
}

async function waitForPreview(): Promise<void> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(origin);
      if (response.ok) {
        await response.body?.cancel();
        return;
      }
    } catch {
      // The preview server is starting.
    }
    await delay(250);
  }
  throw new Error("Vite preview did not start.");
}

async function main(): Promise<void> {
  const server = startPreviewServer();
  let browser;
  try {
    await waitForPreview();
    browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    await page.goto(origin, { waitUntil: "networkidle" });
    await page.locator(".title-card.is-focused").waitFor();
    await page.screenshot({
      path: "public/demo-desktop.png",
      fullPage: true,
    });

    await page.getByLabel("Filter catalog titles").fill("Title 004");
    await page.waitForTimeout(500);
    await page.screenshot({
      path: "public/demo-filtered.png",
      fullPage: true,
    });

    await page.goto(origin, { waitUntil: "networkidle" });
    await page.setViewportSize({ width: 1200, height: 630 });
    await page.locator(".title-card.is-focused").waitFor();
    await page.screenshot({
      path: "public/og-image.png",
    });
  } finally {
    await browser?.close();
    server.kill();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
