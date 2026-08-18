import { describe, expect, it, vi } from "vitest";
import { configureCloudflareRuntime } from "./_core/runtime";
import { resolveObjectStorageConfig, storagePut } from "./storage";

describe("user-owned object-storage configuration", () => {
  it("accepts the required S3-compatible settings and defaults the R2 region", () => {
    expect(
      resolveObjectStorageConfig({
        S3_ENDPOINT: "https://account.r2.cloudflarestorage.com/",
        S3_BUCKET: "daerat-media",
        S3_ACCESS_KEY_ID: "key-id",
        S3_SECRET_ACCESS_KEY: "secret",
      }),
    ).toMatchObject({
      endpoint: "https://account.r2.cloudflarestorage.com",
      region: "auto",
      bucket: "daerat-media",
      forcePathStyle: false,
    });
  });

  it("rejects uploads cleanly when required storage configuration is missing", () => {
    expect(() => resolveObjectStorageConfig({})).toThrow("Object storage is not configured");
  });

  it("stores uploads through the private R2 binding when running as a Worker", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    configureCloudflareRuntime({
      MEDIA: {
        put,
        get: vi.fn(),
      },
    });

    const stored = await storagePut("avatars/member.png", Buffer.from("image"), "image/png");

    expect(stored.key).toMatch(/^avatars\/member_[a-f0-9]{8}\.png$/);
    expect(stored.url).toBe(`/uploads/${stored.key}`);
    expect(put).toHaveBeenCalledWith(stored.key, expect.any(Buffer), {
      httpMetadata: { contentType: "image/png" },
    });
  });
});
