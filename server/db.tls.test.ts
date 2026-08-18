import { describe, expect, it } from "vitest";
import { ENV } from "./_core/env";
import { findUserByEmailOrUsername, parseTlsDatabaseUrl } from "./db";

describe("external MySQL TLS setting", () => {
  it("treats only the explicit true value as an instruction to require TLS", () => {
    const original = process.env.DATABASE_SSL;
    process.env.DATABASE_SSL = "true";
    expect(ENV.databaseSsl).toBe(true);
    process.env.DATABASE_SSL = "false";
    expect(ENV.databaseSsl).toBe(false);
    if (original === undefined) delete process.env.DATABASE_SSL;
    else process.env.DATABASE_SSL = original;
  });

  it("performs a read-only lookup through the configured database", async () => {
    await expect(
      findUserByEmailOrUsername("__database_probe__@example.invalid", "__database_probe__"),
    ).resolves.toBeUndefined();
  });

  it("parses a TLS MySQL service URI into secure Node connection settings", () => {
    expect(
      parseTlsDatabaseUrl("mysql://avnadmin:pass%40word@mysql.example.test:16262/defaultdb?ssl-mode=REQUIRED"),
    ).toEqual({
      host: "mysql.example.test",
      port: 16262,
      user: "avnadmin",
      password: "pass@word",
      database: "defaultdb",
      ssl: { rejectUnauthorized: true },
    });
  });
});
