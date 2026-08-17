import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { clearLocalSession, getLocalSessionUser } from "../localAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const user = await getLocalSessionUser(opts.req);
  if (!user) clearLocalSession(opts.res, opts.req);

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
