import express from "express";
import type { ErrorRequestHandler } from "express";
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
  // Register binary upload/download routes before body parsers so octet-stream PUT
  // requests can never be mistaken for a JSON/page request by the hosting fallback.
  registerObjectStorageRoutes(app);
  app.use(express.json({ limit: MAX_BASE64_UPLOAD_BODY }));
  app.use(express.urlencoded({ limit: MAX_BASE64_UPLOAD_BODY, extended: true }));
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );
  const uploadErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
    if (error?.type === "entity.too.large") {
      res.status(413).json({ message: "الملف كبير لهذا المسار. لم يُنشَر أيّ محتوى؛ أعد المحاولة." });
      return;
    }
    if (error?.type === "request.aborted") {
      res.status(400).json({ message: "انقطع الرفع قبل اكتماله. لم يُنشَر أيّ محتوى؛ أعد المحاولة." });
      return;
    }
    next(error);
  };
  app.use(uploadErrorHandler);
  return app;
}
