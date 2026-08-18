# Free-tier hosting research for دائرة الأمة

Research date: 2026-08-18.

## Render

Official documentation: https://render.com/docs/free

- Free Node web services are available, but the service spins down after 15 minutes with no inbound traffic and can take about one minute to start again.
- The filesystem is ephemeral, so uploads cannot be stored on the service itself.
- A free Render Postgres database has a 1 GB limit but expires after 30 days; it is therefore unsuitable as the permanent database for this platform.
- Render explicitly states that free instances are not for production applications.

## Supabase

Official pricing: https://supabase.com/pricing

- The Free plan lists 500 MB database storage, 1 GB file storage, and 50,000 monthly active users.
- Free projects pause after one week of inactivity, with a limit of two active projects.
- This can be used for a small prototype, but it is not an always-on long-term guarantee.

## Cloudflare R2 and Workers/Pages

Official R2 pricing: https://developers.cloudflare.com/r2/pricing/

- R2’s free allowance includes 10 GB-month of Standard storage, 1 million Class A operations, 10 million Class B operations, and no Internet egress charge.
- Cloudflare offers Workers and Pages on its developer platform: https://www.cloudflare.com/plans/developer-platform/
- A Cloudflare-first migration would replace managed hosting, storage, and database services with a user-owned Cloudflare account, but it needs an application migration from Express/MySQL to Worker-compatible server code and a D1-compatible database layer.

### Cloudflare database and serverless limits

Official documentation: https://developers.cloudflare.com/d1/platform/pricing/, https://developers.cloudflare.com/d1/platform/limits/, https://developers.cloudflare.com/workers/platform/pricing/, and https://developers.cloudflare.com/workers/platform/limits/.

- On the Workers Free plan, D1 includes 5 million rows read per day, 100,000 rows written per day, and 5 GB total storage. A single Free D1 database is limited to 500 MB.
- Workers Free includes 100,000 requests per day and 10 ms CPU time per invocation. Static asset requests are free and unlimited.
- The free tier can suit an early community with efficient, indexed queries and direct-to-R2 uploads, but limits require monitoring. It is not a safe promise of permanent zero cost at large traffic levels.

## Initial recommendation

For a proof of concept with the least infrastructure ownership effort, use Render plus Supabase while accepting cold starts, project pauses, and free-tier limits. For the strongest free-tier ownership path, migrate the stack to Cloudflare Pages + Workers + D1 + R2, accepting the larger code migration.
