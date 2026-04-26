import { spawn, spawnSync } from "node:child_process";
import net from "node:net";

const children = [];
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function start(name, command, args, options = {}) {
  console.log(`[e2e] starting ${name}: ${command} ${args.join(" ")}`);
  const child = spawn(command, args, {
    ...options,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  child.stdout?.on("data", (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr?.on("data", (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  child.on("exit", (code, signal) => {
    console.log(`[e2e] ${name} exited code=${code} signal=${signal}`);
  });
  children.push(child);
}

start("executor", "go", ["run", "./cmd/executor"], {
  cwd: "executor"
});
await waitForPort(50051);
start("target", "node", ["tests/e2e/mock-target.mjs"]);
await waitForPort(4545);
start("server", pnpm, ["--filter", "@invoke/server", "dev"], {
  env: { ...process.env, EXECUTOR_GRPC_ADDR: "127.0.0.1:50051", PORT: "4000" }
});
await waitForPort(4000);
start("ui", pnpm, ["--filter", "@invoke/ui", "dev"]);
await waitForPort(3000);
console.log("[e2e] all services are listening");

const shutdown = () => {
  for (const child of children) {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
  }
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

setInterval(() => {}, 1000);

function waitForPort(port, timeoutMs = 60_000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const socket = net.connect(port, "127.0.0.1");
      socket.once("connect", () => {
        socket.end();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for port ${port}`));
          return;
        }
        setTimeout(check, 250);
      });
    };
    check();
  });
}
