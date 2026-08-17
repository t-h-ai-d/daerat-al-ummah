import { z } from "zod";
import * as db from "../db";
import { adminProcedure, router } from "../_core/trpc";

export const moderationRouter = router({
  openReports: adminProcedure.query(() => db.listOpenReports()),
  applyAction: adminProcedure
    .input(z.object({ reportId: z.number().int().positive(), targetUserId: z.number().int().positive(), action: z.enum(["warning", "ban", "remove_post", "dismiss_report"]), note: z.string().trim().max(1200).optional() }))
    .mutation(({ ctx, input }) => db.applyModerationAction(ctx.user.id, input)),
});
