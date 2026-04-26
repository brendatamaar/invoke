import { expect, test, type Page } from "@playwright/test";

const target = "http://127.0.0.1:4545";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    localStorage.clear();
    const databases = await indexedDB.databases?.();
    await Promise.all((databases ?? []).map((db) => db.name && new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(db.name!);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    })));
  });
  await page.reload();
  await expect(page.getByText(/pong from Go/i)).toBeVisible();
});

test("sends a REST request and records history", async ({ page }) => {
  await sendGetUsers(page);
  await expect(page.getByTestId("response-status")).toContainText("200");
  await expect(page.getByTestId("response-body")).toContainText("Ada Lovelace");
  await expect(page.locator(".history-row").first()).toContainText("/users");
});

test("saves and reloads a request", async ({ page }) => {
  await page.getByTestId("url-input").fill(`${target}/users`);
  await page.getByTestId("save-request").click();
  await page.getByTestId("save-name").fill("List users");
  await page.getByTestId("confirm-save").click();
  await expect(page.locator(".request-row", { hasText: "List users" })).toBeVisible();

  await page.getByTestId("new-request").click();
  await expect(page.getByTestId("url-input")).toHaveValue("");
  await page.locator(".request-row", { hasText: "List users" }).click();
  await expect(page.getByTestId("url-input")).toHaveValue(`${target}/users`);
});

test("resolves environment variables before sending", async ({ page }) => {
  await page.getByTestId("new-env").click();
  await page.getByTestId("env-name").fill("Local API");
  await page.getByTestId("add-env-var").click();
  await page.getByTestId("env-var-key").fill("base_url");
  await page.getByTestId("env-var-value").fill(target);
  await page.getByTestId("save-env").click();

  await page.getByTestId("url-input").fill("{{base_url}}/users");
  await page.getByTestId("send-request").click();
  await expect(page.getByTestId("response-status")).toContainText("200");
  await expect(page.getByTestId("response-body")).toContainText("Ada Lovelace");
});

test("applies bearer auth", async ({ page }) => {
  await page.getByTestId("url-input").fill(`${target}/auth`);
  await page.getByRole("button", { name: "Auth" }).click();
  await page.getByTestId("auth-type").selectOption("bearer");
  await page.getByTestId("bearer-token").fill("xyz");
  await page.getByTestId("send-request").click();

  await expect(page.getByTestId("response-status")).toContainText("200");
  await expect(page.getByTestId("response-body")).toContainText("Bearer xyz");
});

test("parses pasted cURL commands", async ({ page }) => {
  await page.getByTestId("url-input").fill(`curl -H "Authorization: Bearer xyz" ${target}/auth`);
  await page.getByTestId("url-input").blur();
  await expect(page.getByTestId("url-input")).toHaveValue(`${target}/auth`);
  await page.getByRole("button", { name: "Auth" }).click();
  await expect(page.getByTestId("auth-type")).toHaveValue("bearer");
  await expect(page.getByTestId("bearer-token")).toHaveValue("xyz");
});

async function sendGetUsers(page: Page) {
  await page.getByTestId("method-select").selectOption("GET");
  await page.getByTestId("url-input").fill(`${target}/users`);
  await page.getByTestId("send-request").click();
}
