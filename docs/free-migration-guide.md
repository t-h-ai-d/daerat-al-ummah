# Migrating دائرة الأمة to Free, User-Controlled Hosting

## The short answer

> **Yes.** Deleting a user account must never delete the website. To survive deletion of the owner’s Manus account as well, the application must be copied to infrastructure controlled by the owner before that account is closed.

The current application is a React, Express, tRPC, Drizzle, and MySQL/TiDB project. It currently depends on managed hosting, a managed database URL, managed S3 upload signing, and managed environment secrets. Those dependencies must be replaced; copying only the frontend files is not enough for accounts, posts, chat, uploads, or moderation to work.

## Recommended free-tier target: Cloudflare-owned infrastructure

| Current responsibility | User-controlled replacement | Migration work |
| --- | --- | --- |
| Managed website host | Cloudflare Pages | Build and deploy the React client from the owner’s GitHub repository. |
| Express/tRPC API | Cloudflare Workers | Convert the API entry point and affected Node-specific middleware to Worker-compatible handlers. |
| MySQL/TiDB database | Cloudflare D1 (SQLite) | Convert the Drizzle schema and SQL migrations from MySQL to SQLite/D1, then migrate data. |
| Managed object storage | Cloudflare R2 | Replace the managed presigned-upload helper with direct-to-R2 upload handling. |
| Managed secrets | Cloudflare Worker secrets | Generate a new `JWT_SECRET` and add storage/database bindings in the owner’s Cloudflare account. |
| Managed project ownership | Owner’s GitHub + Cloudflare accounts | The owner must retain control of both accounts and the domain. |

Cloudflare’s free tier currently includes 100,000 Worker requests per day, 10 ms CPU time per Worker invocation, and 5 GB total D1 storage. D1 allows 5 million rows read and 100,000 rows written per day. R2 includes 10 GB-month storage, 1 million write-type operations, and 10 million read-type operations per month. These limits suit an early community only when feed queries are indexed and uploads go directly to R2. [1] [2] [3]

## Why this is the recommended zero-cost path

It keeps the site, database, storage, DNS, and deployment under **your own accounts**. It does not require a paid always-on Node server, and it avoids storing uploads on an ephemeral server disk. It is a real migration, not merely a static export: accounts, chat, direct uploads, and moderation remain possible after the server and database layers are adapted.

The trade-off is code work. The existing Express + MySQL server is not a direct drop-in deployment to Cloudflare Workers + D1. I must adapt its request layer, database dialect, migrations, and upload module. This is the safe route if the goal is long-term independence at a very small scale.

## Fastest temporary free path: Render + Supabase

| Component | Free service | Important limitation |
| --- | --- | --- |
| Node/Express server | Render Free Web Service | Sleeps after 15 minutes of inactivity; the next request may take about a minute. |
| PostgreSQL database and basic file storage | Supabase Free | Projects pause after one week of inactivity; database capacity is 500 MB and file storage is 1 GB. |

This option requires less server rewrite than the Cloudflare route, but it is only suitable for a prototype. Render says its free services are not for production use, and its free Postgres database expires after 30 days, so the database must be hosted elsewhere. [4] [5]

## Safe migration order

1. **Create accounts you control.** Create a GitHub account, then create a Cloudflare account. Do not close the Manus account before the migration is tested.
2. **Export the code.** Push this project to a private repository owned by you. The code, tests, database schema, and migration guide will be in that repository.
3. **Create independent services.** Create a D1 database and R2 bucket in the Cloudflare account. Generate new secrets there; never reuse managed platform secrets.
4. **Adapt the server.** Move tRPC/Express routes to Worker-compatible server handlers, rewrite Drizzle schema/migrations for D1, and replace the current storage helper with R2 support.
5. **Migrate data.** Export only the platform data the owner is allowed to move, transform it to the new schema, import it to D1, and validate row counts. User media must be copied to R2 separately.
6. **Deploy a staging site.** Deploy to a temporary Cloudflare Pages URL. Test registration, local login, posting, uploading an avatar and attachment, friendship, chat, moderation, account deletion, and Arabic RTL routes.
7. **Move the domain.** Point the owner-controlled domain to the verified new site. Keep the old project active until the new site is tested end to end.
8. **Only then close the Manus account.** Once GitHub, Cloudflare, database, storage, and domain ownership are all under the owner’s control, the old project can be retired.

## What I need from you to perform the migration

| Requirement | Why it is necessary |
| --- | --- |
| A GitHub account or organization you control | It will own the exported source code and deployment history. |
| A Cloudflare account you control | It will own the Pages site, Worker API, D1 database, R2 bucket, and optional custom domain. |
| A decision: Cloudflare migration or prototype hosting | The Cloudflare route is the recommended independent path; the prototype path is faster but weaker. |
| A custom domain, if you have one | Optional, but it prevents the public URL from depending on a platform-generated subdomain. |

## Recommendation

Choose **Cloudflare Pages + Workers + D1 + R2**. It is the best free-tier ownership route for an early version of دائرة الأمة. Do not delete the Manus account until the new GitHub repository is deployed from the owner’s Cloudflare account and the site has been tested with a new local account.

## References

[1]: https://developers.cloudflare.com/workers/platform/pricing/ "Cloudflare Workers pricing"
[2]: https://developers.cloudflare.com/workers/platform/limits/ "Cloudflare Workers limits"
[3]: https://developers.cloudflare.com/d1/platform/pricing/ "Cloudflare D1 pricing"
[4]: https://render.com/docs/free "Render: Deploy for Free"
[5]: https://supabase.com/pricing "Supabase pricing"
