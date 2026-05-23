# Utsav Yojana — Architectural Layer Setup

## Context

The repository has complete docs, mockups, and schema but no Next.js project yet. This plan scaffolds the project and wires every architectural layer — design tokens, Supabase clients, TypeScript types, layout shell, PostHog, Sentry, Resend, and the two Phase 1 API endpoints — so that feature development can begin on a correct foundation. Getting this right now prevents rework on every page that follows.

Working directory: `/home/user/u-y`  
Target branch: `claude/refine-local-plan-OaMoK`

---

## Dependency order

```
create-next-app          (generates package.json, tsconfig, tailwind.config.ts, globals.css,
  │                        app/layout.tsx, app/page.tsx — all edited in subsequent steps)
  │
  ├── npm install         (adds supabase, sentry, posthog-js, resend, clsx, tailwind-merge)
  │
  ├── globals.css         (font imports → CSS tokens → Tailwind directives)
  │       └── tailwind.config.ts  (extends theme with tokens from design-system.md)
  │
  ├── types/database.ts   (hand-written from schema.sql — 14 tables)
  │
  ├── lib/utils.ts        (cn helper — needs clsx + tailwind-merge)
  ├── lib/supabase/client.ts    (needs NEXT_PUBLIC_SUPABASE_* env vars + Database type)
  ├── lib/supabase/server.ts    (needs SUPABASE_SERVICE_ROLE_KEY + Database type)
  ├── lib/resend.ts             (needs RESEND_API_KEY + RESEND_FROM_EMAIL)
  │
  ├── Sentry config files  (sentry.client/server/edge.config.ts + instrumentation.ts)
  ├── components/providers/PostHogProvider.tsx + PostHogPageView.tsx
  ├── components/layout/Header.tsx + Footer.tsx
  │
  ├── app/layout.tsx       (edit — import providers, header, footer, Sentry)
  ├── app/page.tsx         (edit — placeholder proving tokens/fonts/icons load)
  │
  ├── app/api/vendors/register/route.ts   (needs supabaseAdmin + resend)
  └── app/api/inquiries/route.ts          (needs supabaseAdmin + resend)
```

---

## Step-by-step

### 1. Scaffold Next.js project

```bash
cd /home/user/u-y
npx create-next-app@14 . \
  --typescript \
  --eslint \
  --tailwind \
  --app \
  --no-import-alias \
  --use-npm
```

`create-next-app` will ask to overwrite existing files. Accept overwrite for everything except `CLAUDE.md` (symlink) — that must be preserved.

### 2. Install runtime dependencies

```bash
npm install @supabase/supabase-js @sentry/nextjs posthog-js posthog-node resend clsx tailwind-merge
npm install -D @types/node
```

### 3. Create directory structure

```bash
mkdir -p app/api/vendors/register \
         app/api/inquiries \
         components/layout \
         components/providers \
         lib/supabase \
         types
```

---

## Files to write / edit

### `tailwind.config.ts`

Extend the scaffold-generated config:

- **Colors**: map each CSS variable name to `'var(--<token>)'` (all 13 tokens from design-system.md §2)
- **fontFamily**: `display: ['Fraunces', 'Georgia', 'serif']`, `sans: ['Inter', 'system-ui', 'sans-serif']`
- **maxWidth**: `content: '820px'`, `container: '1200px'`
- **borderWidth DEFAULT**: `'0.5px'`
- content paths: `./app/**/*.{ts,tsx}`, `./components/**/*.{ts,tsx}`, `./lib/**/*.{ts,tsx}`

### `app/globals.css`

Replace scaffold content with (in this exact order):

1. `@import url(...)` — Google Fonts: Fraunces (`opsz,wght 9..144,400;9..144,500`) + Inter (`wght@400;500`)
2. `@import url(https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.47.0/tabler-icons.min.css)` — Tabler Icons webfont (matches mockup CDN source)
3. `@tailwind base; @tailwind components; @tailwind utilities;`
4. `:root` block with all 13 CSS custom properties exactly as in `UX/design-system.md §2`:
   ```css
   --bg:#FAF7F2; --surface:#FFFFFF; --surface-alt:#F4EFE7;
   --text:#1A1A1A; --text-muted:#6B6B6B; --text-subtle:#9B9B9B;
   --accent:#C75D2C; --accent-hover:#A84A1F; --accent-soft:#FDF1EB;
   --accent-soft-strong:#F8DDC8; --accent-deep:#712B13;
   --border:#E8E4DD; --border-strong:#D5CFC4;
   ```
   Note: `--border-strong` is `#D5CFC4` per design-system.md — not `#D5CFC7`.
5. Base resets: `*, *::before, *::after { box-sizing: border-box; }`, `body { background: var(--bg); font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }`

### `types/database.ts`

Hand-written from `schema.sql`. Cover all 14 tables (`users`, `provider_categories`, `providers`, `provider_category_map`, `provider_locations`, `provider_media`, `category_requests`, `event_types`, `event_templates`, `event_template_items`, `user_event_plans`, `user_event_plan_items`, `inquiries`, `inquiry_messages`).

Each table gets:
```ts
interface Tables {
  table_name: {
    Row: { ... };
    Insert: { ... };   // optional/nullable fields become optional
    Update: Partial<Insert>;
    Relationships: []; // required by supabase-js v2 GenericTable
  }
}
```

Enum columns use union literals (e.g. `'pending' | 'approved' | 'rejected' | 'suspended'`). Export convenience aliases: `DbProvider`, `DbInquiry`, `DbProviderLocation`, `DbProviderCategory`, `DbEventType`, `DbInquiryMessage`.

Export top-level: `export interface Database { public: { Tables: { ... }; Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never> } }`

When a real Supabase project is provisioned, replace entirely with `npx supabase gen types typescript --project-id <ref>`.

### `lib/utils.ts`

```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### `lib/supabase/client.ts`

Browser client — fails at runtime (not build time) if env vars are absent:

```ts
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### `lib/supabase/server.ts`

Lazy factory — throws only on first call, not at import time (required for Next.js build without env vars):

```ts
export function getSupabaseAdmin(): SupabaseClient<Database> {
  // lazily creates client; throws if env vars absent
}
```

`getSupabaseAdmin()` bypasses RLS. The distinct function name makes accidental browser import a visible error — never call in client components.

### `lib/resend.ts`

Lazy Resend client + two non-throwing helpers:

- `sendInquiryNotification(...)` — emails vendor with `Reply-To: reply+{replyToken}@domain` (masked reply-to per design §11)
- `sendVendorRegistrationConfirmation(...)` — receipt confirmation

Both helpers `catch` email errors, `console.error` them, and return `{ ok: false }`. Email outage must never fail the DB write. Resend client is lazily initialized so build passes without `RESEND_API_KEY`.

### Sentry configuration (manual — no interactive wizard)

**`sentry.client.config.ts`**, **`sentry.server.config.ts`**, **`sentry.edge.config.ts`** — each calls `Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: 1.0 })`.

**`instrumentation.ts`** (Next.js 14 instrumentation hook):
```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('./sentry.server.config')
  if (process.env.NEXT_RUNTIME === 'edge') await import('./sentry.edge.config')
}
```

**`next.config.mjs`** — wrap with `withSentryConfig` + add `images.remotePatterns` for Supabase Storage (`*.supabase.co`).

### `components/providers/PostHogProvider.tsx`

`'use client'` — `useEffect` calls `posthog.init(...)` with `capture_pageview: false`, `person_profiles: 'identified_only'`. Wraps children with `PostHogProvider` from `posthog-js/react` (note: export is `PostHogProvider`, not `PHProvider`).

### `components/providers/PostHogPageView.tsx`

`'use client'` — fires `posthog.capture('$pageview')` on `usePathname` + `useSearchParams` change. Must be wrapped in `<Suspense>` at call site.

### `components/layout/Header.tsx`

Sticky, `backdrop-blur`, 0.5px bottom border. Max-width 1200px inner container. Logo: "Utsav Yojana" in Fraunces + "उत्सव योजना" subtitle in Inter. Nav: "Find vendors", "Planner", "List your business" (outlined pill).

### `components/layout/Footer.tsx`

Static. Logo left + Devanagari subtitle. Links: "For providers", "About", "Privacy", "Terms". Copyright line. 0.5px top border.

### `app/layout.tsx`

Imports globals.css, PostHogProvider, PostHogPageView (in Suspense), Header, Footer. Sets `metadata` with title template and `metadataBase` from `NEXT_PUBLIC_APP_URL`.

### `app/page.tsx`

Minimal placeholder — Fraunces headline, Inter paragraph, one Tabler icon, one card using CSS vars. Delete when real home page is built.

### `app/api/vendors/register/route.ts`

`POST` handler:
1. Validate required: `business_name`, `slug`, `contact_email`, `city`, `state`
2. Insert `providers` row (`status: 'pending'`) via `getSupabaseAdmin()`
3. Insert primary `provider_locations` row
4. Insert `provider_category_map` rows if `category_ids` provided
5. `sendVendorRegistrationConfirmation(...)` — non-blocking (no await)
6. Return `201 { provider_id }`

### `app/api/inquiries/route.ts`

`POST` handler:
1. Validate required: `provider_id`, `guest_name`, `guest_email`, `message`
2. Fetch provider via `getSupabaseAdmin()` — needs `contact_email` (never anon-readable)
3. Return `404` if not found or `status !== 'approved'` (uniform response prevents probing)
4. Insert `inquiries` row (`status: 'sent'`)
5. `sendInquiryNotification(...)` — non-blocking
6. Return `201 { inquiry_id }`

### `.env.local.example`

Documents all 10 env vars with source comments (Supabase, Resend, Sentry, PostHog, App URL).

---

## Implementation notes

- `create-next-app` refuses non-empty directories — scaffold into a temp dir and copy files over, preserving `AGENTS.md`/`CLAUDE.md` symlink
- All service clients (Supabase admin, Resend) must be lazily initialized — module-level throws break Next.js's build-time page data collection
- supabase-js v2 `GenericTable` requires a `Relationships: []` field on every table type — omitting it causes all queries to infer `never`
- posthog-js/react exports `PostHogProvider`, not `PHProvider`

---

## Verification

| Check | How |
|---|---|
| TypeScript compiles | `npx tsc --noEmit` → zero errors |
| Build succeeds | `npm run build` → no errors or ESLint failures |
| Design tokens render | `npm run dev` → body bg `#FAF7F2`, Fraunces headline loads, Tabler icon renders |
| CSS var resolves | DevTools: `getComputedStyle(document.documentElement).getPropertyValue('--accent')` → `#C75D2C` |
| Supabase anon query | Temp line in `page.tsx`: `supabase.from('event_types').select('name')` → 8 rows logged |
| Supabase admin query | Temp `app/api/test/route.ts`: `getSupabaseAdmin().from('provider_categories').select('name')` → 18 rows |
| Resend email | Temp `app/api/test-email/route.ts`: send to `lepakshisankar@gmail.com` → email arrives |
| PostHog pageview | DevTools Network → `batch` POST fires on load with `$pageview` event |
| Sentry error capture | Throw in any route → appears in Sentry Issues within ~60s |
| Inquiry API | `curl -X POST /api/inquiries` with real approved provider UUID → `201`, row in Supabase Studio, vendor email sent |

Delete all temp test routes after verification.

---

## Files NOT to change without raising first

- `schema.sql` — single source of truth for `types/database.ts`
- `UX/design-system.md` — single source of truth for token values (check here before writing any hex)
- `AGENTS.md` / `CLAUDE.md` — project orientation doc; symlink must survive scaffold
- `.env.local.example` — add every new env var here the moment it's introduced
