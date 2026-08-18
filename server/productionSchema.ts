import { createConnection } from "mysql2/promise";
import { parseTlsDatabaseUrl } from "./db";

export function browserPushSubscriptionTableSql() {
  return `CREATE TABLE IF NOT EXISTS \`browserPushSubscriptions\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int NOT NULL,
    \`endpointHash\` varchar(64) NOT NULL,
    \`endpoint\` text NOT NULL,
    \`p256dh\` varchar(255) NOT NULL,
    \`auth\` varchar(255) NOT NULL,
    \`userAgent\` varchar(512),
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`push_subscription_endpoint_unique\` (\`endpointHash\`),
    KEY \`push_subscription_user_idx\` (\`userId\`, \`createdAt\`),
    CONSTRAINT \`browserPushSubscriptions_userId_users_id_fk\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
  )`;
}

/**
 * Independent Render databases may pre-date Drizzle's migration journal. Never
 * run a full schema push at boot: it retries every historic CREATE TABLE.
 * This one additive guard supports the newly introduced opt-in push feature
 * without touching existing member data or tables.
 */
export async function ensureIndependentBrowserPushSchema() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return;

  const parsedOptions = parseTlsDatabaseUrl(databaseUrl);
  const connection = await createConnection({
    ...parsedOptions,
    ssl: process.env.DATABASE_SSL === "true" ? parsedOptions.ssl : undefined,
  });
  try {
    await connection.execute(browserPushSubscriptionTableSql());
    console.log("[Database] Browser push subscription table is ready.");
  } catch (error) {
    // Push is optional. A missing/locked database must not take the social
    // network offline; members can still use every existing feature.
    console.warn("[Database] Could not ensure the optional browser-push table:", error);
  } finally {
    await connection.end();
  }
}
