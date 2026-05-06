import { expect, test, type Page } from "@playwright/test";

const target = "http://127.0.0.1:4545";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    localStorage.clear();
    const databases = await indexedDB.databases?.();
    await Promise.all(
      (databases ?? []).map(
        (db) =>
          db.name &&
          new Promise<void>((resolve) => {
            const request = indexedDB.deleteDatabase(db.name!);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
          }),
      ),
    );
  });
  await page.reload();
  await expect(page.getByText(/pong from Go/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Extract" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Scripts" })).toBeVisible();
});

test("sends a REST request and records history", async ({ page }) => {
  await sendGetUsers(page);
  await expect(page.getByTestId("response-status")).toContainText("200");
  await expect(page.getByTestId("response-body")).toContainText("Ada Lovelace");
  await expect(page.locator(".history-row").first()).toContainText("/users");
});

test("renders the timing waterfall", async ({ page }) => {
  await sendGetUsers(page);
  await page.getByRole("button", { name: "Timing" }).click();

  const waterfall = page.getByTestId("timing-waterfall");
  await expect(waterfall).toBeVisible();
  await expect(waterfall).toContainText("Timing waterfall");
  await expect(waterfall).toContainText("DNS");
  await expect(waterfall).toContainText("TCP");
  await expect(waterfall).toContainText("TLS");
  await expect(waterfall).toContainText("TTFB");
  await expect(waterfall).toContainText("Transfer");
  await expect(waterfall.locator(".waterfall-segment")).toHaveCount(5);
});

test("saves and reloads a request", async ({ page }) => {
  await page.getByTestId("url-input").fill(`${target}/users`);
  await page.getByTestId("save-request").click();
  await page.getByTestId("save-name").fill("List users");
  await page.getByTestId("confirm-save").click();
  await expect(
    page.locator(".request-row", { hasText: "List users" }),
  ).toBeVisible();

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

test("resolves folder variables from nested requests", async ({ page }) => {
  await page
    .getByTestId("collection-row")
    .filter({ hasText: "Scratch" })
    .click({ button: "right" });
  page.once("dialog", (dialog) => dialog.accept("api"));
  await page.getByTestId("context-new-folder").click();
  const apiFolder = page.getByTestId("folder-row").filter({ hasText: "api" });
  await expect(apiFolder).toBeVisible();

  await apiFolder.click({ button: "right" });
  await page.getByTestId("context-edit-vars").click();
  await page.getByTestId("scope-var-add").click();
  await page.getByTestId("scope-var-key").fill("base_url");
  await page.getByTestId("scope-var-value").fill(target);
  await page.getByTestId("scope-save-vars").click();

  await apiFolder.click({ button: "right" });
  page.once("dialog", (dialog) => dialog.accept("v1"));
  await page.getByTestId("context-new-folder").click();
  const v1Folder = page.getByTestId("folder-row").filter({ hasText: "v1" });
  await expect(v1Folder).toBeVisible();

  await v1Folder.click({ button: "right" });
  await page.getByTestId("context-new-request").click();
  await page.getByTestId("url-input").fill("{{base_url}}/users");
  await page.getByTestId("send-request").click();

  await expect(page.getByTestId("response-status")).toContainText("200");
  await expect(page.getByTestId("response-body")).toContainText("Ada Lovelace");
});

test("sends and saves a GraphQL request", async ({ page }) => {
  await page.getByTestId("protocol-select").selectOption("graphql");
  await page.getByTestId("graphql-url-input").fill(`${target}/graphql`);
  await page.getByTestId("graphql-query-input").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("query { ok }");
  await page.getByRole("button", { name: "Variables" }).click();
  await page.getByTestId("graphql-variables-input").fill('{ "code": "ID" }');
  await page.getByTestId("send-request").click();

  await expect(page.getByTestId("response-status")).toContainText("200");
  await expect(page.getByTestId("response-body")).toContainText("query { ok }");
  await expect(page.getByTestId("response-body")).toContainText('"code": "ID"');

  await page.getByTestId("save-request").click();
  await page.getByTestId("save-name").fill("GraphQL ok");
  await page.getByTestId("confirm-save").click();
  await expect(
    page.locator(".request-row", { hasText: "GraphQL ok" }),
  ).toBeVisible();

  await page.getByTestId("new-request").click();
  await page.locator(".request-row", { hasText: "GraphQL ok" }).click();
  await expect(page.getByTestId("protocol-select")).toHaveValue("graphql");
  await expect(page.getByTestId("graphql-url-input")).toHaveValue(
    `${target}/graphql`,
  );
});

test("exports request code snippets", async ({ page }) => {
  await page.getByTestId("method-select").selectOption("POST");
  await page.getByTestId("url-input").fill(`${target}/echo`);
  await page.getByRole("button", { name: "Body" }).first().click();
  await page.getByTestId("body-mode").selectOption("json");
  await page.locator("textarea").fill('{ "email": "test@example.com" }');
  await page.getByTestId("send-request").click();
  await expect(page.getByTestId("response-status")).toContainText("200");

  await page.getByRole("button", { name: "Code" }).click();
  await expect(page.getByTestId("code-snippet")).toContainText("curl");
  await expect(page.getByTestId("code-snippet")).toContainText("--data-raw");

  await page.getByTestId("code-target").selectOption("python-requests");
  await expect(page.getByTestId("code-snippet")).toContainText(
    "response = requests.post(",
  );
  await page.getByTestId("code-target").selectOption("fetch");
  await expect(page.getByTestId("code-snippet")).toContainText("await fetch(");
  await page.getByTestId("code-target").selectOption("node-axios");
  await expect(page.getByTestId("code-snippet")).toContainText("import axios");
});

test("filters history by URL and body text", async ({ page }) => {
  await sendGetUsers(page);
  await expect(page.getByTestId("response-status")).toContainText("200");

  await page.getByTestId("method-select").selectOption("POST");
  await page.getByTestId("url-input").fill(`${target}/echo`);
  await page.getByRole("button", { name: "Body" }).first().click();
  await page.getByTestId("body-mode").selectOption("json");
  await page.locator("textarea").fill('{ "email": "test@example.com" }');
  await page.getByTestId("send-request").click();
  await expect(page.getByTestId("response-status")).toContainText("200");

  await page.getByTestId("history-search").fill("users");
  await expect(page.locator(".history-row")).toHaveCount(1);
  await expect(page.locator(".history-row").first()).toContainText("/users");

  await page.getByTestId("history-search").fill("test@example.com");
  await expect(page.locator(".history-row")).toHaveCount(1);
  await expect(page.locator(".history-row").first()).toContainText("/echo");
});

test("opens command palette and shortcut help", async ({ page }) => {
  await page
    .getByTestId("collection-row")
    .filter({ hasText: "Scratch" })
    .click({ button: "right" });
  page.once("dialog", (dialog) => dialog.accept("references"));
  await page.getByTestId("context-new-folder").click();
  await expect(
    page.getByTestId("folder-row").filter({ hasText: "references" }),
  ).toBeVisible();

  await page.getByTestId("url-input").fill(`${target}/users`);
  await page.getByTestId("save-request").click();
  await page.getByTestId("save-name").fill("Reference users");
  await page.getByTestId("confirm-save").click();
  await expect(
    page.locator(".request-row", { hasText: "Reference users" }),
  ).toBeVisible();

  await page.getByTestId("new-request").click();
  await page.keyboard.press("Control+K");
  await expect(page.getByTestId("command-palette")).toBeVisible();
  await page.getByTestId("command-input").fill("ref");
  const requestResult = page
    .getByTestId("command-result")
    .filter({ hasText: "Reference users" });
  await expect(requestResult).toBeVisible();
  await expect(
    page.getByTestId("command-result").filter({ hasText: "references" }),
  ).toBeVisible();
  await requestResult.click();
  await expect(page.getByTestId("url-input")).toHaveValue(`${target}/users`);

  await page.keyboard.press("Control+K");
  await page.getByTestId("command-input").fill("theme");
  await page
    .getByTestId("command-result")
    .filter({ hasText: "Toggle theme" })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.keyboard.press("Control+/");
  await expect(page.getByTestId("shortcut-help")).toBeVisible();
  await expect(page.getByTestId("shortcut-help")).toContainText(
    "Command palette",
  );
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
  await page
    .getByTestId("url-input")
    .fill(`curl -H "Authorization: Bearer xyz" ${target}/auth`);
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
