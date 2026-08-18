import { describe, expect, it } from "vitest";
import { ENV } from "./_core/env";

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
});
