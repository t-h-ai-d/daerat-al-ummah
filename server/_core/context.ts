import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getLocalSessionUser } from "../localAuth";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  user = await getLocalSessionUser(opts.req);
  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
