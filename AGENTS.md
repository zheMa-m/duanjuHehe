# AGENTS.md

> Solo full-stack scaffold — Nuxt 4 + Supabase + Vercel. One developer owns the entire lifecycle.

## Project

Single-developer full-stack monorepo: marketing site (SSR), H5 campaign pages (SWR), admin dashboard (SPA), and REST APIs — all in one Nuxt 4 codebase deployed on Vercel with Supabase PostgreSQL. Supports i18n (Chinese/English) for client and H5 platforms.

## Commands

- Install: `npm install`
- Dev server (Mock DB): `npm run dev`
- Dev with Supabase: `npm run dev:all`
- Type check: `npm run check` (vue-tsc)
- API safety scan: `npm run test:api-safety`
- Build: `npm run build`
- Generate DB types: `npm run gen:types`

## Project Structure

```
app/
  components/
    admin/       # Admin-only components (local imports, no auto-import)
    client/      # Public site components
    h5/          # H5 marketing page components (login modal, user bar, review section)
    shared/      # Cross-context shared components (social share, language switcher)
  composables/   # Vue composables — auto-imported (useAuth, usePayment, useAdSlot, useLocaleDetect)
  pages/
    (admin)/     # Admin dashboard (SPA, ssr: false)
    (client)/    # Public site + whitepaper (ISR 3600s)
    (h5)/        # Campaign landing pages (SWR 600s)
  plugins/       # Nuxt plugins (supabase-auth.client.ts)
  utils/         # Client-side utilities (supabase-client.ts)
locales/         # i18n translation files (zh.json, en.json)
server/
  api/
    admin/       # Admin-only endpoints — 03.admin.ts middleware enforces assertAdmin
    v1/          # Public/user endpoints — auth via Bearer header or Cookie
  middleware/     # Numbered chain: 00.apm → 01.subdomain → 02.auth → 03.admin → 04.auth-guard
  utils/         # Server utilities: db.ts, auth.ts, payments.ts, ads.ts, ip.ts, logger.ts, response.ts
supabase/migrations/  # Versioned SQL migrations (0001_core → 0005_payment_optional)
docs/            # Core architecture documentation (9 files, incl. Supabase, Vercel, GitHub & Cloudflare guides)
design/            # Platform design system specs (DESIGN-CLIENT.md, DESIGN-ADMIN.md, DESIGN-H5.md)
scripts/         # CLI generators and test probes
```

## Rendering Strategy

| Route | Strategy | Rationale |
|-------|----------|-----------|
| `/` `/tasks` | ISR 3600s | SEO-friendly, incremental regeneration |
| `/h5/**` | SWR 600s | Campaign pages update fast from admin |
| `/admin/**` | SPA (ssr: false) | No SSR leak, pure client |
| `/api/**` | no-store | Real-time, zero cache |

## Code Style

- **Composition API** with `<script setup lang="ts">` — no Options API
- **Zod** for all API input validation — never trust client body
- **sendSuccess()** for all success responses, **throwError()** for all errors (renamed from sendError to avoid h3 conflict)
- Error messages in English on server; translate at frontend display layer via `t()`
- User-facing text in client/H5 must use i18n `t()` — never hardcode Chinese strings
- Use `<NuxtImg>` instead of native `<img>` for all images
- Preload above-fold images with `fetchpriority="high"` and `loading="eager"`

## Security Boundaries

**NEVER expose to frontend (no `NUXT_PUBLIC_` prefix):**
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`

**Authentication:**
- Frontend Supabase client uses anon key only (`NUXT_PUBLIC_SUPABASE_ANON_KEY`)
- Server middleware reads token: Bearer header > Cookie (`sb-access-token`) > device-id (anonymous)
- Payment/order endpoints reject anonymous users (04.auth-guard returns 403)
- OAuth `client_secret` lives in Supabase Dashboard, never in code

**API auth declarations** (read by `test:api-safety` scanner):
- `// @api-auth: admin` — admin-only
- `// @api-auth: user` — authenticated user required
- `// @api-auth: public` — no auth needed

## Database

- All tables **must** have RLS enabled and forced (`ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`)
- SQL migrations in `supabase/migrations/`, numbered sequentially (0001, 0002, ...)
- List queries capped at `pageSize <= 100`
- Stats APIs must use Materialized Views or pre-aggregated tables — no in-memory aggregation on >1000 rows
- Money fields use `NUMERIC` type — never floating point

## Audit

- Every admin write/delete/status-change must call `logAuditEvent()` before response
- `activity_logs` table is append-only — never delete

## i18n (Internationalization)

Client site and H5 pages support Chinese/English via `@nuxtjs/i18n`. Admin dashboard is Chinese-only.

- **Module config** in `nuxt.config.ts` — strategy `prefix_except_default`, default locale `zh`
- **Translation files**: `locales/zh.json`, `locales/en.json`
- **Language detection**: URL path > Cookie (`i18n_locale`) > browser language > timezone > fallback `zh`
- **Composable**: `useLocaleDetect()` wraps detection logic and toggle
- **UI component**: `<LanguageSwitcher />` in shared components

**When adding new pages/components:**
1. Extract all user-facing text to `locales/*.json` with namespaced keys (e.g. `tasks.title`)
2. Use `const { t } = useI18n()` in `<script setup>` then `t('key')` in template
3. Use `() => t('key')` for `useSeoMeta` title/description (reactive)
4. Admin pages (`(admin)/`) — keep hardcoded Chinese, no i18n needed

## Platform Rules

- Database: Supabase PG only — never Vercel Postgres
- API routes: `/server/api/` only — never Supabase Edge Functions
- Rate limiting: Vercel KV — never simulate with DB tables
- Static assets: `public/` dir; user uploads: Supabase Storage — never Vercel Blob
- Stripe SDK: lazy-loaded only when `MOCK_DB=false`; Mock mode returns fake data

## Testing

- API safety scan: `npm run test:api-safety` — validates `@api-auth` declarations match actual middleware behavior
- Any endpoint returning 200 without proper auth is a FAIL (blocks merge)

## OpenAPI Documentation

Nitro’s built-in OpenAPI 3.1.0 support is enabled. Every route handler has a `defineRouteMeta` block with full JSON Schema metadata.

**Dev endpoints (auto-generated):**
- `/_openapi.json` — Raw OpenAPI 3.1.0 spec
- `/_scalar` — Scalar interactive API reference (purple theme)
- `/_swagger` — Swagger UI

**Tag groups:** Auth, Products, Tasks, Payments, Orders, Ads, Campaigns, Feedback, User, Admin Tasks, Admin Orders, Admin Campaigns, Admin Ad Slots, Admin APM, Admin Audit, Admin Revenue, Admin Profile

**When adding new endpoints:**
1. Add `defineRouteMeta({ openAPI: { tags, summary, description, parameters, requestBody, responses } } as any)` above `export default`
2. Use `as any` cast to avoid Nitro’s strict OpenAPI type constraints
3. Keep `@api-auth` comment for the safety scanner

## Do Not Modify

- `.env` — contains secrets, never commit real values
- `node_modules/` — managed by npm
- `supabase/migrations/` existing files — create new numbered files instead
- `server/middleware/` numbering — order matters (00→01→02→03→04)
- Mock DB adapter (`server/utils/db.ts`) chain API — fragile, extend carefully

## Mock DB Development

Set `MOCK_DB=true` for offline development. The in-memory adapter (`server/utils/db.ts`) supports:
- Chain queries: `.eq().order().single()`
- Aggregation: `{ count: 'exact', head: true }`
- Auth simulation: `signUp / signInWithPassword / signInWithOAuth / signOut`
