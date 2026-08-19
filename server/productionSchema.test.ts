import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { browserPushSubscriptionTableSql, independentDatabaseTlsOptions, independentSchemaBootstrapStatements, missingIndependentSchemaCompatibilityColumns } from "./productionSchema";

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

  it("bootstraps every core independent-platform table using idempotent creation statements", () => {
    const statements = independentSchemaBootstrapStatements(`
      CREATE TABLE IF NOT EXISTS \`users\` (\`id\` int PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS \`posts\` (\`id\` int PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS \`browserPushSubscriptions\` (\`id\` int PRIMARY KEY);
    `);
    expect(statements).toHaveLength(3);
    expect(statements).toEqual(expect.arrayContaining([
      expect.stringContaining("CREATE TABLE IF NOT EXISTS `users`"),
      expect.stringContaining("CREATE TABLE IF NOT EXISTS `posts`"),
      expect.stringContaining("CREATE TABLE IF NOT EXISTS `browserPushSubscriptions`"),
    ]));
  });

  it("includes owner-managed community resources in the independent bootstrap", () => {
    const bootstrap = readFileSync(resolve(process.cwd(), "docs/independent-schema-bootstrap.sql"), "utf8");
    expect(bootstrap).toContain("CREATE TABLE IF NOT EXISTS `communityResources`");
    expect(bootstrap).toContain("community_resources_community_created_idx");
    expect(bootstrap).toContain("REFERENCES `communities` (`id`)");
  });

  it("includes private saved collections in the independent bootstrap", () => {
    const bootstrap = readFileSync(resolve(process.cwd(), "docs/independent-schema-bootstrap.sql"), "utf8");
    expect(bootstrap).toContain("CREATE TABLE IF NOT EXISTS `savedCollections`");
    expect(bootstrap).toContain("CREATE TABLE IF NOT EXISTS `savedCollectionItems`");
    expect(bootstrap).toContain("saved_collection_item_unique");
    expect(bootstrap).toContain("REFERENCES `posts` (`id`)");
  });

  it("adds only legacy account, post, and attachment-security columns that are absent", () => {
    const missing = missingIndependentSchemaCompatibilityColumns([
      "users.id",
      "users.openId",
      "users.email",
      "posts.id",
      "posts.authorId",
      "posts.content",
      "postAttachments.id",
      "postAttachments.storageKey",
    ]);
    expect(missing.map(column => `${column.table}.${column.name}`)).toEqual(expect.arrayContaining([
      "users.passwordHash",
      "users.username",
      "users.profileVisibility",
      "posts.communityId",
      "posts.moderationStatus",
      "postAttachments.scanStatus",
    ]));
    expect(missing.map(column => `${column.table}.${column.name}`)).not.toContain("users.email");
  });
});
