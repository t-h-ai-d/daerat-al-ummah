import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { chatRouter } from "./routers/chat";
import { localAuthRouter } from "./routers/localAuth";
import { socialRouter } from "./routers/social";

export const appRouter = router({
  system: systemRouter,
  auth: localAuthRouter,
  chat: chatRouter,
  social: socialRouter,
});

export type AppRouter = typeof appRouter;
