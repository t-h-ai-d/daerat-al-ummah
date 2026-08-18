import { describe, expect, it } from "vitest";
import { browserPushSubscriptionTableSql } from "./productionSchema";

describe("independent production schema guard", () => {
  it("creates only the additive browser subscription table when it is absent", () => {
    const query = browserPushSubscriptionTableSql();
    expect(query).toContain("CREATE TABLE IF NOT EXISTS `browserPushSubscriptions`");
    expect(query).toContain("push_subscription_endpoint_unique");
    expect(query).toContain("REFERENCES `users` (`id`)");
    expect(query).not.toContain("comments");
  });
});
