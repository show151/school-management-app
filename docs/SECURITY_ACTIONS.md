## Security actions performed

- Added `.gitignore` and `.env.example` to avoid committing secrets.
- Added `scripts/remove-env-history.sh` with guidance to remove `.env` from git history.
- Introduced `isAdmin` boolean on `User` model (Prisma schema updated).
- Added `scripts/create-admin.js` to bootstrap/update an admin user in DB.
- Unified JWT handling to `jose` for signing and verification.
- Hardened email templates by sanitizing user inputs before embedding in HTML.
- Added Redis-backed rate limiter (`src/lib/redis-rate-limit.ts`) and used it as fallback when `REDIS_URL` is set.
- Removed automatic `setInterval` in memory rate limiter to avoid serverless side-effects.

## Recommended next steps

1. Remove sensitive `.env` from git history using `scripts/remove-env-history.sh` (requires coordination).
2. Run `npx prisma migrate dev` to apply the schema change (adds `isAdmin` field).
3. Create an admin user:
   - Use `node scripts/create-admin.js --email admin@example.com --password secret` or set `ADMIN_EMAIL`/`ADMIN_PASSWORD` and run the script.
4. If you plan to run in distributed environment, set `REDIS_URL` and ensure Redis is available.
