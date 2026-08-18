import { describe, expect, it } from "vitest";
import { resolveObjectStorageConfig } from "./storage";

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
});
