# Cloudflare Research Notes — 2026-08-18

## Official sources consulted

| Topic | Finding | Source |
| --- | --- | --- |
| Express hosting | Cloudflare documents deployment of Express applications on Workers and pairs its tutorial with a D1 database example. | https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/ |
| Existing MySQL | Hyperdrive supports MySQL and works with existing MySQL drivers and ORM libraries from Workers. | https://developers.cloudflare.com/hyperdrive/ |
| MySQL driver detail | Cloudflare's MySQL example uses `mysql2`, creates a connection per request through Hyperdrive, and requires `disableEval: true` in Workers. | https://developers.cloudflare.com/hyperdrive/ |
| R2 uploads | Cloudflare R2 exposes an S3-compatible API and accepts AWS SDK for JavaScript v3 configuration. | https://developers.cloudflare.com/r2/api/s3/api/ |
| R2 SDK configuration | R2 access keys are required; AWS SDK v3 uses the account-specific `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` endpoint and `auto` region. | https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/ |
| Hyperdrive setup | Hyperdrive is created from an existing database connection string and attached to a Worker with a binding ID. Its read-query cache can be disabled when the application needs read-after-write consistency. | https://developers.cloudflare.com/hyperdrive/get-started/ |

## Implication for دائرة الأمة

The present Express + MySQL server can be adapted to a Cloudflare Worker, but it is not a Docker/Node-server deployment: it needs a Worker entry point and Workers-compatible database configuration. The lowest-risk migration path preserves MySQL through Hyperdrive with read-query caching disabled, and keeps uploads in R2. The current standard Node Docker deployment remains the quickest temporary route until the Worker conversion is implemented and tested.
