import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./localAuth";
import { loginInput, registerInput } from "./routers/localAuth";

describe("local account safeguards", () => {
  it("hashes passwords and verifies only the original password", () => {
    const stored = hashPassword("a-strong-password");
    expect(verifyPassword("a-strong-password", stored)).toBe(true);
    expect(verifyPassword("wrong-password", stored)).toBe(false);
  });

  it("requires valid registration details", () => {
    expect(registerInput.safeParse({ name: "أحمد", username: "ahmad_1", email: "ahmad@example.com", password: "long-enough-password" }).success).toBe(true);
    expect(registerInput.safeParse({ name: "أ", username: "!", email: "bad", password: "short" }).success).toBe(false);
  });

  it("accepts a username or email login identifier", () => {
    expect(loginInput.safeParse({ identifier: "member_name", password: "x" }).success).toBe(true);
    expect(loginInput.safeParse({ identifier: "member@example.com", password: "x" }).success).toBe(true);
  });
});
