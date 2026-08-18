import { describe, expect, it } from "vitest";
import { validateModerationProvider } from "./aiModeration";

describe("independent AI moderation provider", () => {
  it("accepts the configured server-only OpenAI credential", async () => {
    await expect(validateModerationProvider()).resolves.toBe(true);
  }, 20_000);
});
