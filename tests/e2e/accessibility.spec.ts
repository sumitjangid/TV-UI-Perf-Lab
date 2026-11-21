import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("home has no detectable accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("keyboard navigation keeps focus visible", async ({ page }) => {
  await page.goto("/");
  const focused = page.locator(".title-card.is-focused");
  await expect(focused).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".title-card.is-focused")).not.toBe(focused);
  await expect(page.locator(".title-card.is-focused")).toBeVisible();

  await page.keyboard.press("ArrowDown");
  await expect(page.locator(".title-card.is-focused")).toBeVisible();

  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("Selected ");

  await page.keyboard.press("Escape");
  await expect(page.getByRole("status")).toContainText("Browse the synthetic catalog.");
});
