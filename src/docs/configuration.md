# Configuration & Database Guidelines

This page details the environment variable setups, client config parameters, and database schemas utilized in the Emotist monorepo.

---

## 🗄️ Database Naming Conventions

To guarantee consistency, security, and developer clarity across systems, our database schema enforces a strict ID naming policy:

- **Primary Keys (`id`)**: Always use standard `UUID` data types.
- **Public Keys (`public_id`)**: Exposed on the API. Generated from the backend code using `nanoid`.
- **Entity Prefixes**: Every `public_id` must begin with a lowercase identifying prefix to represent the context:

| Entity Type | public_id Prefix | Example |
| :--- | :--- | :--- |
| **Therapist** | `th_` | `th_k9f8d7s6a5e4w3q` |
| **Client** | `cl_` | `cl_m9n8b7v6c5x4z3l` |
| **Appointment** | `apt_` | `apt_j2h3g4f5d6s7a8q` |

> [!IMPORTANT]
> The database Primary Key `id` (UUID) should remain internal to database tables and internal API joins. Only expose `public_id` on public network responses or query payloads.

---

## ⚙️ Environment Configuration

### Backend API (`apps/api`)
Copy `.env.example` to `.env.local` in `apps/api/` and update values:

```bash
cd apps/api
cp .env.example .env.local
```

Key environment configurations:
- **`DATABASE_URL`**: DB connections string (defaults to local Supabase Postgres `postgresql://postgres:postgres@localhost:54322/postgres`).
- **`JWT_SECRET`**: Cryptographic secret key used to validate clients authentication tokens.
- **`REDIS_HOST` / `REDIS_PORT`**: Connects NestJS tasks queue worker (BullMQ) to Redis cache.

---

## 📱 Frontend Portals Configuration

Frontend applications read key endpoints and credentials dynamically at runtime.

### Therapist Web Config (`apps/therapist`)
Create a runtime configuration file:

```bash
cd apps/therapist
cp example-config.json public/config.json
```

Update `public/config.json` parameters. Values can be fetched via `npm run db:status`:

```json
{
  "baseUrl": "http://localhost:5173",
  "apiBaseUrl": "http://localhost:3000/v1",
  "supabaseUrl": "http://127.0.0.1:54321",
  "supabaseAnonKey": "<ANON_KEY_FROM_DB_STATUS>",
  "supabasePublicBucket": "assets",
  "supabasePrivateBucket": "private-assets",
  "termsAndConditionsUrl": "https://emotist.com/termsandconditions",
  "googleMapsApiKey": "<GOOGLE_MAPS_API_KEY>",
  "googleClientId": "<GOOGLE_CLIENT_ID>"
}
```

### Client Web Config (`apps/client`)
Align with the same pattern. Copy `example-config.json` to `public/config.json`.

> [!CAUTION]
> Always verify that your `.env.local` and `public/config.json` are added to your `.gitignore` configuration. Never commit private credentials, Stripe secret keys, or service role tokens to version control.
