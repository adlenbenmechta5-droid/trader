import { createServer } from "http";
import { spawn } from "child_process";

const NEXT_PORT = 3099;
const PROXY_PORT = 3000;

// 1. Start Next.js
const nextProc = spawn("npx", ["next", "start", "-p", String(NEXT_PORT), "-H", "0.0.0.0"], {
  cwd: "/home/z/my-project",
  stdio: ["ignore", "pipe", "pipe"],
  detached: false,
});
nextProc.stdout.on("data", d => process.stdout.write(d));
nextProc.stderr.on("data", d => process.stderr.write(d));

// 2. Start Cloudflare tunnel
const cfProc = spawn("/tmp/cf", ["tunnel", "--url", `http://localhost:${NEXT_PORT}`], {
  stdio: ["ignore", "pipe", "pipe"],
  detached: false,
});
cfProc.stdout.on("data", (chunk) => {
  const text = Buffer.from(chunk).toString();
  const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (match) console.log("\n=== YOUR URL: " + match[0] + " ===\n");
});
cfProc.stderr.on("data", (chunk) => {
  const text = Buffer.from(chunk).toString();
  const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (match) console.log("\n=== YOUR URL: " + match[0] + " ===\n");
});

// 3. Wait for Next.js
await new Promise(r => setTimeout(r, 6000));

// 4. HTTP proxy
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PROXY_PORT}`);
  const target = `http://127.0.0.1:${NEXT_PORT}${url.pathname}${url.search}`;
  try {
    const resp = await fetch(target, {
      method: req.method,
      headers: Object.fromEntries(req.headers),
      body: req.method !== "GET" && req.method !== "HEAD" ? req : undefined,
    });
    res.writeHead(resp.status, Object.fromEntries(resp.headers));
    resp.body.pipeTo(new WritableStream({ write: (chunk) => res.write(chunk), close: () => res.end() }));
  } catch (e) {
    res.writeHead(502);
    res.end("Starting...");
  }
});

server.listen(PROXY_PORT, "0.0.0.0", () => {
  console.log("Proxy running on port " + PROXY_PORT);
});

// 5. Keep alive monitoring
setInterval(() => {
  if (nextProc.exitCode !== null) {
    console.log("Next.js died, restarting...");
  }
}, 10000);

// Keep process alive
process.on("SIGTERM", () => { process.exit(0); });
