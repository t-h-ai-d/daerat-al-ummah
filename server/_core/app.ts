import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerObjectStorageRoutes } from "../storage";
import { appRouter } from "../routers";
import { createContext } from "./context";

// A 50 MB binary file expands to roughly 67 MB when the member client sends it
// as base64 JSON. Keep the parser above that encoded size, while the social
// router still enforces the 50 MB decoded-file ceiling.
export const MAX_BASE64_UPLOAD_BODY = "70mb";

export function createApp() {
  const app = express();
  app.use(express.json({ limit: MAX_BASE64_UPLOAD_BODY }));
  app.use(express.urlencoded({ limit: MAX_BASE64_UPLOAD_BODY, extended: true }));
  registerObjectStorageRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );
  return app;
}
