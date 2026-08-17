import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { parse } from "cookie";
import type { User } from "../drizzle/schema";
import { getUserById } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";

export const LOCAL_SESSION_COOKIE = "ummah_local_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function sessionSecret() {
  if (!ENV.cookieSecret) throw new Error("Session secret is not configured.");
  return new TextEncoder().encode(ENV.cookieSecret);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}.${derived}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, expected] = storedHash.split(".");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64).toString("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function createLocalSessionToken(userId: number) {
  return new SignJWT({ userId, type: "local" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(sessionSecret());
}

export async function setLocalSession(res: Response, req: Request, userId: number) {
  const token = await createLocalSessionToken(userId);
  res.cookie(LOCAL_SESSION_COOKIE, token, {
    ...getSessionCookieOptions(req),
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

export function clearLocalSession(res: Response, req: Request) {
  res.clearCookie(LOCAL_SESSION_COOKIE, getSessionCookieOptions(req));
}

export async function getLocalSessionUser(req: Request): Promise<User | null> {
  try {
    const token = parse(req.headers.cookie ?? "")[LOCAL_SESSION_COOKIE];
    if (!token) return null;
    const { payload } = await jwtVerify(token, sessionSecret());
    if (payload.type !== "local" || typeof payload.userId !== "number") return null;
    const user = await getUserById(payload.userId);
    return user?.accountStatus === "banned" ? null : user ?? null;
  } catch {
    return null;
  }
}
