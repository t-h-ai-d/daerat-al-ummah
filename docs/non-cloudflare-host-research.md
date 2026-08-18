# Non-Cloudflare Hosting Research

**Research date:** 2026-08-18  
**Scope:** An independent non-Cloudflare deployment for دائرة الأمة, which needs a Node/Express service, a MySQL-compatible database, and durable user-upload storage.

## Render

Render offers a free Node-compatible web service, and its documented Node/Express setup accepts repository build and start commands. The free service can host the existing Docker/Node path rather than the Cloudflare Worker path. However, it idles after 15 minutes with an approximately one-minute wake-up, loses local files on restart or redeploy, and is explicitly documented as unsuitable for production. It has free PostgreSQL—not MySQL—and the free Postgres database expires after 30 days, so it cannot independently satisfy this project's MySQL and durable-upload requirements. [1] [2]

| Requirement | Render free web service | Decision |
| --- | --- | --- |
| Node/Express runtime | Supported | Compatible |
| MySQL database | Not supplied | Requires an external MySQL provider |
| Persistent uploads | No local persistence | Requires external object storage |
| Always-on service | No, idles after 15 minutes | Not suitable for a reliable public social platform |
| Production suitability | Render advises against it | Not recommended as the final host |

> Render states that free instances have important limitations and should not be used for production applications. [1]

## Interim conclusion

Render can be used as a temporary Node host, but it does not meet the user's stated goal of a durable, account-independent platform by itself. The more realistic non-Cloudflare architecture is a user-owned VM or a paid/always-on Node service with independently backed-up MySQL and S3-compatible object storage. The next research step is to verify a current MySQL-compatible free-tier option, if one still exists without a time-limited database.

## Aiven for MySQL

Aiven offers an always-free managed MySQL service with 1 GB storage, 1 GB RAM, and one CPU, without a time limit or credit-card requirement. It includes automated backups and standard MySQL compatibility, so the application can retain its existing `mysql2` and Drizzle stack. Aiven also states that its small free plan can be powered off after inactivity and is not intended for high-traffic production use. [3] [4]

| Requirement | Aiven free MySQL | Decision |
| --- | --- | --- |
| Existing MySQL code | Standard MySQL service | Compatible |
| Time limit | No expiration | Suitable for an MVP |
| Automatic backup | Included | Useful but still export independently |
| Capacity | 1 GB RAM / 1 GB storage | Small community only |
| High availability | Not included | Upgrade before substantial public traffic |

## Backblaze B2

Backblaze B2 provides an S3-compatible API that works with existing S3 tools and supports pre-signed upload and download URLs. The application’s S3 configuration can use it without a Cloudflare dependency. The first 10 GB of stored data is free; its transaction-pricing page lists `PutObject` and `GetObject` as free API operations, but egress over the free allowance can cost money. [5] [6]

| Requirement | Backblaze B2 | Decision |
| --- | --- | --- |
| Current S3 upload adapter | S3-compatible API | Compatible |
| Free storage | First 10 GB | Suitable for a small start |
| Private uploads | Private bucket + pre-signed URLs | Required |
| Independent from Manus and Cloudflare | Yes | Suitable |

## Recommended non-Cloudflare MVP stack

Use **Render Free Web Service** for the Node/Express runtime, **Aiven Free MySQL** for the database, and **Backblaze B2** for private media. This stack is independent from Manus and Cloudflare, but it remains a small-scale MVP stack: Render sleeps after 15 idle minutes, Aiven can power down an inactive free database, and all provider accounts must remain under the owner’s control. Keep GitHub source and daily `mysqldump` exports outside all three providers.

## References

[3]: https://aiven.io/free-mysql-database "Aiven — Free managed MySQL database"
[4]: https://aiven.io/free-tier "Aiven — Free Tier"
[5]: https://www.backblaze.com/docs/cloud-storage-s3-compatible-api "Backblaze — S3-Compatible API"
[6]: https://www.backblaze.com/cloud-storage/transaction-pricing "Backblaze — Transaction Pricing"

## References

[1]: https://render.com/docs/free "Render — Deploy for Free"
[2]: https://render.com/docs/deploy-node-express-app "Render — Deploy a Node Express App"
