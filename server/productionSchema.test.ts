import { describe, expect, it } from "vitest";
import { browserPushSubscriptionTableSql, independentDatabaseTlsOptions } from "./productionSchema";

describe("independent production schema guard", () => {
  it("creates only the additive browser subscription table when it is absent", () => {
    const query = browserPushSubscriptionTableSql();
    expect(query).toContain("CREATE TABLE IF NOT EXISTS `browserPushSubscriptions`");
    expect(query).toContain("push_subscription_endpoint_unique");
    expect(query).toContain("REFERENCES `users` (`id`)");
    expect(query).not.toContain("comments");
  });

  it("always uses encrypted transport for the independent TiDB deployment", () => {
    const options = independentDatabaseTlsOptions(
      "mysql://member:secret@host.tidbcloud.com:4000/ummah?ssl-mode=REQUIRED",
    );
    expect(options.ssl).toEqual({ rejectUnauthorized: false });
  });
});
