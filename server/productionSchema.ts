import { createConnection, type ConnectionOptions } from "mysql2/promise";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseTlsDatabaseUrl } from "./db";

type CompatibilityColumn = { table: "users" | "posts" | "postAttachments"; name: string; definition: string };

export const independentSchemaCompatibilityColumns: CompatibilityColumn[] = [
  { table: "users", name: "passwordHash", definition: "varchar(255) NULL" },
  { table: "users", name: "loginMethod", definition: "varchar(64) NULL" },
  { table: "users", name: "username", definition: "varchar(32) NULL" },
  { table: "users", name: "avatarUrl", definition: "text NULL" },
  { table: "users", name: "bio", definition: "text NULL" },
  { table: "users", name: "country", definition: "varchar(96) NULL" },
  { table: "users", name: "madhhabPreference", definition: "varchar(48) NULL" },
  { table: "users", name: "accountStatus", definition: "enum('active','warned','banned') NOT NULL DEFAULT 'active'" },
  { table: "users", name: "profileVisibility", definition: "enum('public','friends') NOT NULL DEFAULT 'public'" },
  { table: "posts", name: "communityId", definition: "int NULL" },
  { table: "posts", name: "textStyle", definition: "enum('default','serif','emphasis') NOT NULL DEFAULT 'default'" },
  { table: "posts", name: "moderationStatus", definition: "enum('published','under_review','removed') NOT NULL DEFAULT 'published'" },
  { table: "postAttachments", name: "scanStatus", definition: "enum('pending','clean','blocked') NOT NULL DEFAULT 'clean'" },
];

export function missingIndependentSchemaCompatibilityColumns(existingColumns: Iterable<string>) {
  const available = new Set(existingColumns);
  return independentSchemaCompatibilityColumns.filter(column => !available.has(`${column.table}.${column.name}`));
}

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

export function independentSchemaBootstrapStatements(sql = readFileSync(join(process.cwd(), "docs", "independent-schema-bootstrap.sql"), "utf8")) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map(statement => statement.trim())
    .filter(Boolean);
}

async function ensureIndependentSchemaCompatibility(connection: Awaited<ReturnType<typeof createConnection>>) {
  const [rows] = await connection.query(
    "SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName FROM information_schema.columns WHERE table_schema = DATABASE() AND TABLE_NAME IN ('users', 'posts', 'postAttachments')",
  );
  const existingColumns = (rows as Array<{ tableName: string; columnName: string }>)
    .map(row => `${row.tableName}.${row.columnName}`);
  for (const column of missingIndependentSchemaCompatibilityColumns(existingColumns)) {
    await connection.execute(`ALTER TABLE \`${column.table}\` ADD COLUMN \`${column.name}\` ${column.definition}`);
  }
}

export function independentDatabaseTlsOptions(databaseUrl: string): ConnectionOptions {
  // TiDB Cloud rejects plaintext connections. The independent Render deployment
  // is TiDB-backed, so encryption is the safe default even if a legacy
  // DATABASE_SSL variable was not added to the existing Render service.
  return parseTlsDatabaseUrl(databaseUrl);
}

/**
 * An independent Render database can be brand new or pre-date Drizzle's
 * migration journal. The bootstrap uses CREATE TABLE IF NOT EXISTS only: it
 * creates missing tables but never drops, replaces, or mutates member rows.
 */
export async function ensureIndependentDatabaseSchema() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return;

  let connection: Awaited<ReturnType<typeof createConnection>> | null = null;
  try {
    connection = await createConnection(independentDatabaseTlsOptions(databaseUrl));
    for (const statement of independentSchemaBootstrapStatements()) {
      await connection.execute(statement);
    }
    await ensureIndependentSchemaCompatibility(connection);
    console.log("[Database] Independent platform schema is ready.");
  } catch (error) {
    console.warn("[Database] Could not ensure the independent platform schema:", error);
  } finally {
    await connection?.end();
  }
}
