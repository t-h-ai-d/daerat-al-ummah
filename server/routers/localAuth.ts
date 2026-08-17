import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { clearLocalSession, hashPassword, setLocalSession, verifyPassword } from "../localAuth";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

const usernamePattern = /^\S+$/;
export const registerInput = z.object({
  name: z.string().trim().min(2, "اكتب اسماً من حرفين على الأقل.").max(80),
  username: z.string().trim().min(3, "اسم المستخدم يجب أن يحتوي على 3 أحرف على الأقل.").max(32).regex(usernamePattern, "اسم المستخدم لا يمكن أن يحتوي على مسافات."),
  email: z.string().trim().email("أدخل بريداً إلكترونياً صحيحاً.").max(320),
  password: z.string().min(10, "كلمة المرور يجب أن تحتوي على 10 أحرف على الأقل.").max(128),
});

export const loginInput = z.object({
  identifier: z.string().trim().min(3).max(320),
  password: z.string().min(1).max(128),
});

function toPublicUser(user: NonNullable<Awaited<ReturnType<typeof db.getUserById>>>) {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

export const localAuthRouter = router({
  me: publicProcedure.query(({ ctx }) => (ctx.user ? toPublicUser(ctx.user) : null)),
  register: publicProcedure.input(registerInput).mutation(async ({ ctx, input }) => {
    const email = input.email.toLowerCase();
    const username = input.username.trim();
    const existing = await db.findUserByEmailOrUsername(email, username);
    if (existing) throw new TRPCError({ code: "CONFLICT", message: "البريد الإلكتروني أو اسم المستخدم مستخدم بالفعل." });
    const user = await db.createLocalUser({
      name: input.name,
      username,
      email,
      passwordHash: hashPassword(input.password),
    });
    await setLocalSession(ctx.res, ctx.req, user.id);
    return toPublicUser(user);
  }),
  login: publicProcedure.input(loginInput).mutation(async ({ ctx, input }) => {
    const account = await db.findUserForLogin(input.identifier.trim().toLowerCase());
    if (!account?.passwordHash || !verifyPassword(input.password, account.passwordHash)) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "بيانات الدخول غير صحيحة." });
    }
    if (account.accountStatus === "banned") {
      throw new TRPCError({ code: "FORBIDDEN", message: "هذا الحساب موقوف. تواصل مع الإدارة إذا كان ذلك بالخطأ." });
    }
    await db.recordLocalSignIn(account.id);
    await setLocalSession(ctx.res, ctx.req, account.id);
    return toPublicUser(account);
  }),
  logout: publicProcedure.mutation(({ ctx }) => {
    clearLocalSession(ctx.res, ctx.req);
    return { success: true } as const;
  }),
  deleteOwnAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await db.deleteCurrentLocalUser(ctx.user.id);
    clearLocalSession(ctx.res, ctx.req);
    return result;
  }),
});
