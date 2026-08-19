import { describe, expect, it } from "vitest";
import { relayStorageFailure, resolveObjectStorageConfig } from "./storage";

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

  it("returns a safe configuration-specific message without exposing secret values", () => {
    const result = relayStorageFailure(new Error("Object storage is not configured. Missing: S3_SECRET_ACCESS_KEY"));
    expect(result).toEqual({
      code: "storage_configuration",
      message: "خدمة رفع الملفات غير مُعَدّة على الخادم الآن. لن يُنشَر أيّ محتوى حتى يُستكمل إعداد التخزين.",
    });
    expect(result.message).not.toContain("S3_SECRET_ACCESS_KEY");
  });

});
