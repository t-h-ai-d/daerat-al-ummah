import { describe, expect, it } from "vitest";
import { resolveObjectStorageConfig } from "./storage";

describe("user-owned object-storage configuration", () => {
  it("rejects uploads cleanly when required storage configuration is missing", () => {
    expect(() => resolveObjectStorageConfig({})).toThrow("Object storage is not configured");
  });

  it("normalizes Backblaze settings, derives its region, and uses its compatible path style", () => {
    expect(resolveObjectStorageConfig({
      S3_ENDPOINT: "s3.us-east-005.backblazeb2.com/",
      S3_REGION: "s3.us-east-005.backblazeb2.com",
      S3_BUCKET: "daerat-media",
      S3_ACCESS_KEY_ID: "key-id",
      S3_SECRET_ACCESS_KEY: "secret",
    })).toMatchObject({
      endpoint: "https://s3.us-east-005.backblazeb2.com",
      region: "us-east-005",
      forcePathStyle: true,
    });
  });

});
