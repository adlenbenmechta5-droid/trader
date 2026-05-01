import { serve } from "bun";
import { spawn } from "child_process";

const NEXT_PORT = 3099;

// 1. Start Next.js as child process
const nextProc = spawn("npx", ["next", "start", "-p", String(NEXT_PORT), "-H", "0.0.0.0"], {
  cwd: "/home/z/my-project",
  stdio: ["ignore", "inherit", "inherit"],
});

// 2. Start Cloudflare tunnel as child process
const cfProc = spawn("/tmp/cf", ["tunnel", "--url", `http://localhost:${NEXT_PORT}`], {
  stdio: ["ignore", "pipe", "pipe"],
});

let tunnelUrl = "";
cfProc.stdout.on("data", (chunk) => {
  const text = Buffer.from(chunk).toString();
  const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (match) {
    tunnelUrl = match[0];
    console.log("=== YOUR URL: " + tunnelUrl + " ===");
  }
});
cfProc.stderr.on("data", (chunk) => {
  const text = Buffer.from(chunk).toString();
  const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (match) {
    tunnelUrl = match[0];
    console.log("=== YOUR URL: " + tunnelUrl + " ===");
  }
});

// 3. Wait for Next.js to be ready
await new Promise(r => setTimeout(r, 6000));

// 4. HTTP proxy server
serve({
  port: 3000,
  hostname: "0.0.0.0",
  async fetch(req) {
    const url = new URL(req.url);
    const target = `http://127.0.0.1:${NEXT_PORT}${url.pathname}${url.search}`;
    try {
      const resp = await fetch(target, {
        method: req.method,
        headers: req.headers,
        body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
      });
      return new Response(resp.body, { status: resp.status, headers: resp.headers });
    } catch (e) {
      return new Response("Starting...", { status: 502 });
    }
  },
});

console.log("Server running on port 3000");
console.log("Next.js on port " + NEXT_PORT);

// Keep alive
setInterval(() => {
  if (nextProc.exitCode !== null) {
    console.log("Next.js died! Restarting...");
    // Restart next
    const newProc = spawn("npx", ["next", "start", "-p", String(NEXT_PORT), "-H", "0.0.0.0"], {
      cwd: "/home/z/my-project",
      stdio: ["ignore", "inherit", "inherit"],
    });
    Object.assign(nextProc, newProc);
  }
  if (cfProc.exitCode !== null) {
    console.log("Tunnel died! Restarting...");
    const newCf = spawn("/tmp/cf", ["tunnel", "--url", `http://localhost:${NEXT_PORT}`], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    Object.assign(cfProc, newCf);
  }
}, 10000);
