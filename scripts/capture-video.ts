import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdir, rename } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const origin = "http://127.0.0.1:4173";
const temporaryDirectory = "public/video-recording";

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
  await mkdir(temporaryDirectory, { recursive: true });
  const server = startPreviewServer();
  let browser;

  try {
    await waitForPreview();
    browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: {
        dir: temporaryDirectory,
        size: { width: 1280, height: 720 },
      },
    });
    const page = await context.newPage();

    await page.goto(origin, { waitUntil: "networkidle" });
    await page.locator(".title-card.is-focused").waitFor();
    await page.waitForTimeout(800);

    for (const key of ["ArrowRight", "ArrowRight", "ArrowRight", "ArrowDown"]) {
      await page.keyboard.press(key);
      await page.waitForTimeout(350);
    }

    await page.keyboard.press("Enter");
    await page.waitForTimeout(700);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    await page.getByLabel("Filter catalog titles").fill("Title 004");
    await page.waitForTimeout(900);

    const video = page.video();
    await context.close();
    const temporaryPath = await video?.path();
    if (!temporaryPath) {
      throw new Error("Playwright did not create a demo recording.");
    }
    await rename(temporaryPath, "public/demo.webm");
  } finally {
    await browser?.close();
    server.kill();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
