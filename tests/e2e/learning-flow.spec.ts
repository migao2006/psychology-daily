import { expect, test } from "@playwright/test";
test("first visit, learning, research, persistence and backup flow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "今天，理解自己多一點。" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "主要導覽" })).toBeVisible();
  await page.getByRole("link", { name: "開始第一堂課 →" }).click();
  await expect(page.getByRole("heading", { name: "心理學是什麼", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "以科學方法研究行為與心智歷程" }).click();
  await page.getByRole("button", { name: "需要更有系統、更多元的資料" }).click();
  await page.getByRole("button", { name: "注意力如何受干擾" }).click();
  await page.getByRole("button", { name: "送出答案" }).click();
  await expect(page.getByText("答對了。")).toHaveCount(3);
  await page.getByLabel("你對這堂課的確定程度").selectOption("certain");
  await page.getByRole("button", { name: "完成課程並儲存進度" }).click();
  await expect(page.getByRole("heading", { name: "心理學如何進行科學研究" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "心理學如何進行科學研究" })).toBeVisible();

  await page.getByRole("link", { name: "研究", exact: true }).click();
  const originalTitle = page.locator(".research-card .original-title").first();
  await expect(originalTitle).toBeVisible();
  const originalTitleText = await originalTitle.textContent();
  expect(originalTitleText).toMatch(/[A-Za-z]{4}/);
  const searchTerm = originalTitleText!.match(/[A-Za-z]{4,}/)?.[0] ?? "";
  await page.getByRole("searchbox", { name: "搜尋本站研究庫" }).fill(searchTerm);
  await expect(page.getByText(originalTitleText!, { exact: true })).toBeVisible();
  await page.getByRole("searchbox", { name: "搜尋本站研究庫" }).clear();
  await page.getByRole("button", { name: "設定研究偏好" }).click();
  await page.getByRole("checkbox", { name: "神經科學" }).check();
  await page.getByRole("checkbox", { name: "系統性回顧" }).check();
  await page.getByRole("button", { name: "儲存偏好" }).click();
  await expect(page.getByLabel("推薦原因").first()).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /設定研究偏好/ }).click();
  await expect(
    page.getByRole("checkbox", { name: "神經科學" }),
  ).toBeChecked();
  await page.getByRole("button", { name: "取消" }).click();

  const selectedCard = page.locator("article[data-research-id]").first();
  const selectedOriginalTitleText = await selectedCard
    .locator(".original-title")
    .textContent();
  await selectedCard
    .getByRole("link", { name: /閱讀〈.*〉全文整理/ })
    .click();
  await expect(page.getByRole("heading", { name: "這篇研究在問什麼？" })).toBeVisible();
  await expect(page.locator('.page-heading .lede[lang="en"]')).toHaveText(
    selectedOriginalTitleText!,
  );
  const original = page.getByRole("link", { name: /查看原始論文/ });
  await expect(original).toHaveAttribute("href", /^https:\/\/doi\.org\//);
  await page.getByRole("button", { name: "標記為已閱讀" }).click();

  await page.getByRole("link", { name: "進度", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "匯出 JSON" }).focus();
  await page.keyboard.press("Enter");
  const download = await downloadPromise;
  const backupPath = await download.path();
  expect(backupPath).toBeTruthy();
  await page.getByRole("button", { name: "清除全部資料" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "我了解，繼續" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "永久清除本機資料" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("全部本機資料已清除。")).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(backupPath!);
  await expect(page.getByText("匯入完成，進度已恢復。")).toBeVisible();
  await expect(page.getByText("1", { exact: true }).first()).toBeVisible();

  await page.goto("/this-page-does-not-exist");
  await expect(page.getByRole("heading", { name: "這一頁找不到" })).toBeVisible();
});
