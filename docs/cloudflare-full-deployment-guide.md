# دائرة الأمة — Full Cloudflare Deployment Guide

## Read this first

**Cloudflare can host this platform, but the current repository is not a one-click Cloudflare deployment yet.** The source currently runs as a conventional Node/Express server with MySQL. Cloudflare Workers can run Express with the `nodejs_compat` compatibility flag, but it needs a Worker entry point rather than the existing Docker `app.listen()` deployment. Cloudflare does **not** provide managed MySQL; the present MySQL database must stay with a MySQL provider and connect through Cloudflare Hyperdrive. [1] [2]

> **Use this architecture:** Cloudflare Workers + static frontend assets + Hyperdrive + your MySQL database + Cloudflare R2. Do not choose Cloudflare Pages-only hosting, GitHub Pages, or a static Vite deployment. They cannot run the platform API, local registration, chat, moderation, or database queries.

| Part | Use | What it does |
| --- | --- | --- |
| Website and API | Cloudflare Workers | Runs the Express/tRPC application and serves the Vite frontend. |
| Database | A MySQL provider you control | Stores accounts, posts, chat, friendships, moderation, and notifications. |
| Database connection | Cloudflare Hyperdrive | Connects the Worker to your existing MySQL database with pooled connections. [2] |
| Uploads | Cloudflare R2 | Stores avatars, images, video, and files in a private bucket. [3] |
| Source of truth | Private GitHub repository | Keeps the deployable source independent of any individual web host. |
| Recovery | Encrypted MySQL exports + R2 object copies | Protects new community data if a provider account is lost or closed. |

## 1. What you need before starting

You need a Cloudflare account you keep, the private repository `t-h-ai-d/daerat-al-ummah`, and a new empty MySQL database from a provider you control. The MySQL database must accept Cloudflare Hyperdrive connections and should use TLS. Save its connection string privately; do not paste it into GitHub, screenshots, or public chat.

You also need Node.js 22 on your own computer, Git, and a Cloudflare login. Install Wrangler only after cloning the repository:

```bash
git clone https://github.com/t-h-ai-d/daerat-al-ummah.git
cd daerat-al-ummah
corepack enable
pnpm install --frozen-lockfile
npx wrangler login
```

The current source is **patch-free**. Do not add `patches/wouter@3.7.1.patch`, and do not deploy an old ZIP. Start from GitHub commit `78c9d3f` or newer.

## 2. Create the independent MySQL database

Create a **new empty MySQL database**; this guide does not copy any managed platform data. Record these values in a password manager:

| Value | Example | Keep secret? |
| --- | --- | --- |
| Host | `db.example.net` | No |
| Port | `3306` | No |
| Database | `daerat` | No |
| Username | `daerat_app` | Yes |
| Password | A generated unique value | Yes |
| Full connection string | `mysql://USER:PASSWORD@HOST:3306/daerat` | Yes |

If the password contains `@`, `:`, `/`, `?`, or `#`, URL-encode it inside the connection string. Keep a separate administrator account for backups and migrations; the running application should have only the permissions it needs.

Run the schema creation from your own machine **before** deploying the Worker. This sends the existing Drizzle schema to the new MySQL database:

```bash
export DATABASE_URL='mysql://USER:URL_ENCODED_PASSWORD@HOST:3306/daerat'
pnpm db:push
```

Do not run migrations from an open browser terminal or place `DATABASE_URL` in committed files.

## 3. Create the private R2 upload bucket

The platform must keep avatar and attachment data outside the application server. Create a private bucket:

```bash
npx wrangler r2 bucket create daerat-media
```

Do **not** enable public-bucket access. The Worker should read and write the bucket through an R2 binding. Cloudflare documents R2’s S3-compatible endpoint as `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` and its SDK region as `auto`; that is useful only for the existing Node fallback, not for the final Worker binding. [3]

## 4. Create Hyperdrive for MySQL

Hyperdrive connects Workers to an existing MySQL database. It does not create a database for you. The Worker gets its connection information from the Hyperdrive binding, while Cloudflare pools the underlying MySQL connections. [2]

Create the configuration with read caching disabled. A social platform needs fresh reads after new posts, likes, comments, friendship changes, and moderation actions:

```bash
npx wrangler hyperdrive create daerat-mysql \
  --connection-string='mysql://USER:URL_ENCODED_PASSWORD@HOST:3306/daerat' \
  --caching-disabled
```

Copy the returned Hyperdrive ID. The command checks the MySQL credentials before it creates the configuration. [4]

## 5. Convert the current Node server into a Worker

This is the required code change. A Dockerfile is **not** used by Workers. Create a Cloudflare Worker configuration at the project root:

```jsonc
// wrangler.jsonc
{
  "name": "daerat-al-ummah",
  "main": "server/worker.ts",
  "compatibility_date": "2026-08-18",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./dist/public",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application"
  },
  "hyperdrive": [
    {
      "binding": "HYPERDRIVE",
      "id": "PASTE_YOUR_HYPERDRIVE_ID_HERE"
    }
  ],
  "r2_buckets": [
    {
      "binding": "MEDIA",
      "bucket_name": "daerat-media"
    }
  ]
}
```

Cloudflare’s Express guide uses `nodejs_compat`, starts Express on a local port, and exports `httpServerHandler` from `cloudflare:node`. [1] Refactor `server/_core/index.ts` so the Express application is created by an exported `createApp()` function. Then add this Worker entry point:

```ts
// server/worker.ts
import { httpServerHandler } from "cloudflare:node";
import { createApp } from "./_core/index";

const app = createApp();
app.listen(3000);

export default httpServerHandler({ port: 3000 });
```

Do **not** call `process.env` for deployed Worker secrets or bindings. Pass the Worker environment into the app/database setup, or use Cloudflare’s Worker environment access pattern. The Cloudflare guide exposes bindings through the Worker environment. [1]

### Required database change

In the Worker version of `server/db.ts`, create the `mysql2` connection from the Hyperdrive binding instead of `DATABASE_URL`:

```ts
import { createConnection } from "mysql2/promise";

const connection = await createConnection({
  host: env.HYPERDRIVE.host,
  port: Number(env.HYPERDRIVE.port),
  user: env.HYPERDRIVE.user,
  password: env.HYPERDRIVE.password,
  database: env.HYPERDRIVE.database,
  disableEval: true,
});
```

Cloudflare’s MySQL example requires `disableEval: true` for `mysql2` in the Workers runtime. [2] Keep the existing normal-Node `DATABASE_URL` code path for local development and any temporary non-Cloudflare deployment.

### Required upload change

For the Worker version, replace the AWS S3 client in `server/storage.ts` with the native R2 binding:

```ts
await env.MEDIA.put(objectKey, fileBytes, {
  httpMetadata: { contentType: mimeType }
});

const object = await env.MEDIA.get(objectKey);
if (object === null) return new Response("Not found", { status: 404 });
return new Response(object.body, { headers: object.httpMetadata });
```

This keeps the bucket private and avoids putting R2 access keys in the Worker. The existing S3-compatible adapter remains suitable for a standard Node host.

## 6. Configure secrets

Set only the secret that the Worker must retain itself:

```bash
printf '%s' "$(openssl rand -hex 32)" | npx wrangler secret put JWT_SECRET
```

Use **one** new secret and keep it permanently. Changing `JWT_SECRET` signs every member out, which is safe but disruptive. Do not set managed-platform keys, old OAuth keys, `BUILT_IN_FORGE_API_KEY`, `BUILT_IN_FORGE_API_URL`, or `OWNER_OPEN_ID`.

| Item | Where it belongs |
| --- | --- |
| `JWT_SECRET` | Cloudflare Worker secret |
| Hyperdrive connection | Hyperdrive binding, not a Worker secret |
| R2 bucket | R2 binding, not a Worker secret |
| MySQL admin connection string | Your password manager and local migration/backup machine only |
| `DATABASE_URL` | Local migration and backup shell only; not the deployed Worker |
| `S3_*` values | Only for the standard Node deployment, not a native R2-bound Worker |

## 7. Build, test, and deploy

Add these scripts to `package.json` during the Worker conversion:

```json
{
  "scripts": {
    "cf:typegen": "wrangler types",
    "cf:dev": "pnpm build && wrangler dev",
    "cf:deploy": "pnpm build && wrangler deploy"
  }
}
```

Run the checks first:

```bash
pnpm check
pnpm test
pnpm build
npx wrangler types
pnpm cf:dev
```

When the local Worker starts, test registration, login, post creation, messages, avatar upload, an attachment download, reporting, and account deletion. Then deploy:

```bash
pnpm cf:deploy
```

Cloudflare returns a `workers.dev` URL after deployment. Its official Express walkthrough deploys with Wrangler and then tests the public Worker URL. [1]

## 8. Add your domain

In the Cloudflare dashboard, open **Workers & Pages → your Worker → Settings → Domains & Routes**. Add a custom domain that is already in the same Cloudflare account. Keep HTTPS enabled. Update any permitted origin or cookie domain in the app only if the current code restricts it.

Before telling users to join, open the custom domain in an incognito window and complete this acceptance checklist:

| Test | Expected result |
| --- | --- |
| Public home | Arabic RTL interface loads without a white/blank screen. |
| Local registration | Unique email and username account is created. |
| Login/sign-out | Session persists, then is cleared after sign-out. |
| New post | Text post appears in the finite chronological feed. |
| Avatar + file | Upload and later download work through the private R2 bucket. |
| Friends-only post | Hidden from non-friends. |
| Chat + @mention | Only members can access messages; mention notification is created. |
| Report/moderation | Member report appears for the admin. |
| Refresh and mobile | Routes still load because static-asset SPA fallback is configured. |

## 9. Backups and recovery

Cloudflare hosting cannot protect you if the only Cloudflare account is deleted. The actual protection is **two independent copies** of source and data. Keep the private GitHub repository, a source ZIP on your own device, encrypted MySQL exports, and R2 object copies outside Cloudflare.

Back up MySQL daily from a computer you control:

```bash
mkdir -p "$HOME/daerat-backups"
MYSQL_PWD="$DB_PASSWORD" mysqldump \
  --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" \
  --single-transaction --quick --routines --events --triggers \
  "$DB_NAME" | gzip > "$HOME/daerat-backups/daerat-$(date -u +%F).sql.gz"
```

Test a restore into an empty database every month:

```bash
gunzip -c "$HOME/daerat-backups/daerat-YYYY-MM-DD.sql.gz" | \
  MYSQL_PWD="$DB_PASSWORD" mysql \
    --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" "$DB_NAME"
```

Copy R2 objects to a second bucket or a local encrypted drive. Keep the MySQL export and file backup together by date; posts in MySQL point to object keys in R2.

## 10. The honest final answer

If you want **the current source online today**, use the corrected Node Docker deployment with MySQL and R2 because it is already ready and tested. If you want **Cloudflare Workers**, first complete the Worker conversion in sections 5–7. Do not point Cloudflare Pages at the current repository and expect it to run the backend: that produces the blank/static preview problem you already saw.

The Cloudflare setup is independent of Manus once the MySQL database, R2 bucket, Worker source, secrets, backups, and domain are all under accounts you control.

## References

[1]: https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/ "Cloudflare: Deploy an Express.js application on Workers"
[2]: https://developers.cloudflare.com/hyperdrive/ "Cloudflare Hyperdrive overview and MySQL example"
[3]: https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/ "Cloudflare R2: AWS SDK for JavaScript v3"
[4]: https://developers.cloudflare.com/hyperdrive/get-started/ "Cloudflare Hyperdrive getting started"
