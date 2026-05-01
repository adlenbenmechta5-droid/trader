import { serve } from "bun";
import { execSync } from "child_process";

// Simple approach: proxy everything to next start, keeping it alive
const NEXT_PORT = 3099;

// Start next server as child process
const nextProc = Bun.spawn(["npx", "next", "start", "-p", String(NEXT_PORT), "-H", "0.0.0.0"], {
  cwd: "/home/z/my-project",
  stdout: "inherit",
  stderr: "inherit",
});

// Wait for next to be ready
await new Promise(r => setTimeout(r, 5000));

// Proxy server on port 3000
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
      return new Response(resp.body, {
        status: resp.status,
        headers: resp.headers,
      });
    } catch (e) {
      return new Response("Next.js starting... retry in a moment", { status: 502 });
    }
  },
});

console.log("Proxy server running on port 3000 -> next on port 3099");
