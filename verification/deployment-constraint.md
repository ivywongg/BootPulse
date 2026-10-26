# BootPulse deployment constraint

The current app uses a writable local SQLite file for planning data, credentials, and sessions. Vercel Functions do not provide the permanent shared local filesystem it requires.[1] Vercel’s newer container services are also stateless; durable attached container storage has not shipped.[2]

Deploying this app unchanged there would risk failed writes, lost data, and invalid sessions. No database/provider substitution or deployment has been made.

To complete task 6.16 and Gate 6D safely, choose either a persistent Node/Linux host while keeping local SQLite, or explicitly approve a Vercel-compatible managed database and the necessary adapter changes. An existing compatible host avoids a database rewrite. Task 6.17’s external Stripe webhook step remains unnecessary under the approved simulated billing architecture.

## References

[1]: https://vercel.com/kb/guide/is-sqlite-supported-in-vercel "Is SQLite supported in Vercel?"
[2]: https://vercel.com/kb/guide/docker-compose-concepts-on-vercel "How Docker Compose concepts map to Vercel"
