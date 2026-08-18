# Free MySQL decision for دائرة الأمة

## Selected service: Aiven for MySQL Free Tier

The existing Aiven MySQL service is the simplest compatible free database choice for the current Render deployment. Aiven documents an always-free MySQL tier with no trial expiry, no credit card requirement, 1 GB storage, 1 GB RAM, automated backups, and standard MySQL compatibility. It is appropriate for the platform’s initial accounts, posts, conversations, comments, likes, notifications, reports, and other relational records.

The service is intentionally limited to small workloads and can power off after inactivity. It is therefore not a guarantee that any external provider will be free forever or that it will fit high traffic. The platform’s recovery protection remains the private GitHub source plus regular database exports under the owner’s control.

## Why not switch now

The live error is not evidence that Aiven is unsuitable. Render has already received the required variables, and a connector fix was published for its TLS URI. Replacing Aiven before Render deploys that fix would create another database, another credential set, and another possible configuration mistake without addressing the existing problem.

## Sources

1. [Aiven — Free managed MySQL database](https://aiven.io/free-mysql-database)
2. [Aiven — Free Tier](https://aiven.io/free-tier)
3. [TiDB Cloud — MySQL compatibility](https://docs.pingcap.com/tidbcloud/mysql-compatibility/)
4. [PlanetScale — Pricing](https://planetscale.com/pricing)
