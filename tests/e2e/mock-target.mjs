import { createServer } from "node:http";

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1:4545");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Content-Type", "application/json");

  if (url.pathname === "/health") {
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (url.pathname === "/users") {
    res.end(JSON.stringify([{ id: 1, name: "Ada Lovelace" }]));
    return;
  }

  if (url.pathname === "/auth") {
    if (req.headers.authorization !== "Bearer xyz") {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: "missing token" }));
      return;
    }
    res.end(JSON.stringify({ ok: true, token: req.headers.authorization }));
    return;
  }

  if (url.pathname === "/echo") {
    let body = "";
    for await (const chunk of req) body += chunk;
    res.end(JSON.stringify({ method: req.method, url: url.toString(), body, headers: req.headers }));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: "not found" }));
});

server.listen(4545, "127.0.0.1", () => {
  console.log("mock target listening on http://127.0.0.1:4545");
});
