# دائرة الأمة — Node + MySQL Deployment

Use this guide when deploying the GitHub source to a Node-based host with its managed MySQL option.

## 1. Select the runtime

Choose **node-base** and enable **MySQL**. Do not use a static runtime because the site needs the Express API for registration, posts, chat, moderation, and database access.

## 2. Build and start commands

| Setting | Value |
| --- | --- |
| Install / build | `corepack enable && pnpm install --frozen-lockfile && pnpm build` |
| Start | `pnpm start` |
| Node version | 22 |

## 3. Required environment variables

Set these in the host's secret or environment-variable screen. Do not commit them to GitHub.

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `mysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}` |
| `JWT_SECRET` | Generate a new random secret with at least 32 characters in the host's secret manager |

The application automatically reads the host-provided `PORT`; do not hard-code one.

If the database password contains characters such as `@`, `:`, `/`, or `#`, URL-encode that password before putting it in `DATABASE_URL`.

### Leave these variables unset

| Variable | External-host setting | Effect |
| --- | --- | --- |
| `VITE_APP_ID` | Omit | Not used by the active email/username/password sign-in flow. |
| `VITE_OAUTH_PORTAL_URL` | Omit | Not used by the active email/username/password sign-in flow. |
| `OAUTH_SERVER_URL` | Omit | The legacy managed OAuth callback is disabled in the production server. |
| `OWNER_OPEN_ID` | Omit | Not required for local-account members. |
| `BUILT_IN_FORGE_API_URL` | Omit | The old managed upload backend is intentionally unavailable. |
| `BUILT_IN_FORGE_API_KEY` | Omit | The old managed upload backend is intentionally unavailable. |

Do **not** copy any managed-platform secret to the new host. Until an S3-compatible bucket is connected, avatar and post attachment uploads will show a storage-configuration error; local accounts and all MySQL-backed platform data continue to work.

## 4. First database setup

After the first successful build, run the host's one-off command or a terminal command:

```bash
pnpm db:push
```

This creates the platform tables in the new MySQL database. New local-account registrations, posts, comments, friendships, chats, and moderation records will then be stored in this new database.

## 5. Important storage note

The existing avatar and attachment uploader still uses managed object storage. The Node/MySQL deployment makes new database data independent, but direct image, video, and file uploads require a separate S3-compatible bucket before the migration is complete. Keep the current deployment live until that storage replacement is configured and tested.

## 6. Backups

Run this from a machine you control, using the new MySQL host values. It creates a compressed, transaction-consistent export without placing the password in the command arguments.

```bash
mkdir -p "$HOME/daerat-backups"
MYSQL_PWD="$DB_PASSWORD" mysqldump \
  --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" \
  --single-transaction --quick --routines --events --triggers \
  "$DB_NAME" | gzip > "$HOME/daerat-backups/daerat-al-ummah-$(date -u +%F).sql.gz"
```

Test a restore into an empty replacement database before relying on a backup:

```bash
gunzip -c "$HOME/daerat-backups/daerat-al-ummah-YYYY-MM-DD.sql.gz" | \
  MYSQL_PWD="$DB_PASSWORD" mysql \
    --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" "$DB_NAME"
```

Make one export daily, for example at 03:00 UTC from a separate computer or a reliable scheduled runner you control:

```cron
0 3 * * * /absolute/path/to/daerat-mysql-backup.sh
```

Copy each encrypted backup to a second location outside the application host, such as an encrypted drive you control and a separate storage provider. Keep the GitHub repository or source ZIP separately as well. A host account can always be deleted by its owner; independent source code plus off-host database exports are what prevent the data from being lost with that account.
