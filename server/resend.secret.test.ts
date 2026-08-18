import { describe, expect, it } from "vitest";

describe("Resend report-delivery credential", () => {
  it("accepts the configured server-only API key without sending mail", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey).toMatch(/^re_/);

    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(response.ok).toBe(true);
  }, 20_000);
});
