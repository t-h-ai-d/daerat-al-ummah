import { httpServerHandler } from "cloudflare:node";
import { createApp } from "./_core/app";
import { configureCloudflareRuntime, type CloudflareWorkerEnv } from "./_core/runtime";

const app = createApp();
app.listen(3000);
const nodeHandler = httpServerHandler({ port: 3000 });

export default {
  async fetch(request: Request, env: CloudflareWorkerEnv, ctx: unknown): Promise<Response> {
    configureCloudflareRuntime(env);
    const pathname = new URL(request.url).pathname;
    if (!pathname.startsWith("/api/") && !pathname.startsWith("/uploads/")) {
      if (!env.ASSETS) return new Response("Static assets are not configured", { status: 503 });
      return env.ASSETS.fetch(request);
    }
    return nodeHandler.fetch(request, env, ctx);
  },
};
