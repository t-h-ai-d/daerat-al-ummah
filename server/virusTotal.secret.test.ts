import { describe, expect, it } from "vitest";

describe("VirusTotal private-scanning credential", () => {
  it("authenticates against the account endpoint without uploading a member file", async () => {
    const apiKey = process.env.VIRUSTOTAL_API_KEY;
    expect(apiKey).toMatch(/^[a-f0-9]{64}$/i);

    const response = await fetch("https://www.virustotal.com/api/v3/users/current", {
      headers: { "x-apikey": apiKey! },
    });
    expect(response.ok).toBe(true);
  }, 20_000);
});
