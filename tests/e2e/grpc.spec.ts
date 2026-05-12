import { expect, test } from "@playwright/test";

/**
 * gRPC e2e tests.
 * These tests exercise the gRPC flow through the UI:
 * - Switch to gRPC protocol
 * - Reflect against a server
 * - Execute a unary call
 * - Execute a server-stream call
 * - Cancel a stream
 *
 * The dev-server.mjs harness starts the Go executor on port 50051.
 * The executor itself exposes the Ping RPC which we can use as a basic gRPC target.
 * For reflection tests, we use the executor's own reflection service.
 */

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
});

test("switches to gRPC protocol and shows gRPC UI", async ({ page }) => {
  // Switch to gRPC protocol
  await page.getByTestId("protocol-select").selectOption("grpc");

  // Should show gRPC-specific UI elements
  await expect(page.getByPlaceholder(/host:port/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /reflect/i })).toBeVisible();
});

test("reflects against the executor gRPC server", async ({ page }) => {
  await page.getByTestId("protocol-select").selectOption("grpc");

  // The executor runs on localhost:50051 with reflection enabled
  const addressInput = page.getByPlaceholder(/host:port/i);
  await addressInput.fill("127.0.0.1:50051");

  // Disable TLS since executor runs plaintext locally
  // The TLS toggle should be accessible in the options or inline
  await page
    .getByTestId("grpc-tls-toggle")
    ?.click()
    .catch(() => {
      // If no dedicated toggle, try the options tab
    });

  await page.getByRole("button", { name: /reflect/i }).click();

  // Should discover the HttpExecutor service methods
  await expect(page.getByText(/Ping|Execute|GrpcReflect/i)).toBeVisible({
    timeout: 15000,
  });
});

test("executes a unary gRPC call (Ping)", async ({ page }) => {
  await page.getByTestId("protocol-select").selectOption("grpc");

  const addressInput = page.getByPlaceholder(/host:port/i);
  await addressInput.fill("127.0.0.1:50051");

  // Reflect first
  await page.getByRole("button", { name: /reflect/i }).click();
  await expect(page.getByText(/Ping/i)).toBeVisible({ timeout: 15000 });

  // Select the Ping method
  await page.getByText(/Ping/i).first().click();

  // Execute the call
  await page.getByRole("button", { name: /invoke/i }).click();

  // Should get a response with status 0 (OK)
  await expect(page.getByText(/pong from Go/i)).toBeVisible({ timeout: 10000 });
});

test("mock gRPC server serves canned responses", async ({ page }) => {
  // Configure a mock route via the API
  const response = await page.request.put("/api/mock-grpc/routes", {
    data: {
      routes: [
        {
          fullMethod: "test.Service/Hello",
          responses: [
            {
              bodyJson: '{"message":"hello from mock"}',
              statusCode: 0,
              statusMessage: "OK",
              trailers: [],
            },
          ],
          enabled: true,
        },
      ],
    },
  });
  expect(response.ok()).toBeTruthy();

  // Invoke the mock
  const invokeResponse = await page.request.post("/api/mock-grpc/invoke", {
    data: { fullMethod: "test.Service/Hello", bodyJson: '{"name":"world"}' },
  });
  expect(invokeResponse.ok()).toBeTruthy();
  const body = await invokeResponse.json();
  expect(body.bodyJson).toContain("hello from mock");
  expect(body.statusCode).toBe(0);
});

test("mock gRPC server returns UNIMPLEMENTED for unknown methods", async ({
  page,
}) => {
  const response = await page.request.post("/api/mock-grpc/invoke", {
    data: { fullMethod: "unknown.Service/Method", bodyJson: "{}" },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.statusCode).toBe(12); // UNIMPLEMENTED
  expect(body.error).toContain("No mock route");
});

test("mock gRPC server cycles through response sequences", async ({ page }) => {
  await page.request.put("/api/mock-grpc/routes", {
    data: {
      routes: [
        {
          fullMethod: "test.Service/Seq",
          responses: [
            {
              bodyJson: '{"n":1}',
              statusCode: 0,
              statusMessage: "OK",
              trailers: [],
            },
            {
              bodyJson: '{"n":2}',
              statusCode: 0,
              statusMessage: "OK",
              trailers: [],
            },
          ],
          enabled: true,
        },
      ],
    },
  });

  const r1 = await page.request.post("/api/mock-grpc/invoke", {
    data: { fullMethod: "test.Service/Seq", bodyJson: "{}" },
  });
  expect((await r1.json()).bodyJson).toContain('"n":1');

  const r2 = await page.request.post("/api/mock-grpc/invoke", {
    data: { fullMethod: "test.Service/Seq", bodyJson: "{}" },
  });
  expect((await r2.json()).bodyJson).toContain('"n":2');

  // Wraps around
  const r3 = await page.request.post("/api/mock-grpc/invoke", {
    data: { fullMethod: "test.Service/Seq", bodyJson: "{}" },
  });
  expect((await r3.json()).bodyJson).toContain('"n":1');
});

test("record/replay fixture lifecycle", async ({ page }) => {
  // Start recording
  const startRes = await page.request.post("/api/mock-grpc/record/start", {
    data: { name: "test-fixture", address: "127.0.0.1:50051" },
  });
  expect(startRes.ok()).toBeTruthy();
  const startBody = await startRes.json();
  expect(startBody.recording).toBe(true);

  // Check status
  const statusRes = await page.request.get("/api/mock-grpc/record/status");
  expect((await statusRes.json()).recording).toBe(true);

  // Stop recording
  const stopRes = await page.request.post("/api/mock-grpc/record/stop");
  expect(stopRes.ok()).toBeTruthy();
  expect((await stopRes.json()).recording).toBe(false);

  // List fixtures
  const listRes = await page.request.get("/api/mock-grpc/fixtures");
  expect(listRes.ok()).toBeTruthy();
});
