# Utsav Yojana — Design Document

*Merged v1 design. Schema DDL follows in a companion document.*

---

## 0. Purpose of this document

Utsav Yojana is an Indian-community event-planning directory. This document defines the v1 design by reconciling two prior drafts:

- **Design A** — a comprehensive, long-horizon staff-level architecture proposal with full schema, phasing, monetization tables, and operational concerns.
- **Design B** — a lean "ship in two weeks" pragmatic proposal with a Next.js + Supabase stack, a minimal schema, and an explicit "do not build" list.

This document keeps Design B's pace and stack and adopts Design A's schema discipline on the small number of decisions that are expensive to reverse. The DDL is intentionally deferred to a separate document so this one stays about *what* and *why*, not *which column*.

---

## 1. Guiding philosophy

The product is unvalidated. We do not yet know whether users will plan events on the platform or whether vendors will register and keep profiles current. Calendar time to first real user is the scarcest resource. Therefore we ship the smallest credible product as fast as possible.

But comparable directories — The Knot, Zola, WeddingWire, Thumbtack — show that the schema decisions made in month one determine which migrations are forced in months 6–24. Some decisions are reversible with `ALTER TABLE` and a backfill. Others require coordinated data migrations across multiple tables and the product surface.

The guiding rule for this design is:

> **Ship Design B's stack and pace. Adopt Design A's schema discipline only on the decisions that are 1-way doors.**

We do not build promotion tables, subscription tables, or score tables before there are users. We do build the core entities with correct relational shape from day one, because retrofitting many-to-many relationships, separate location tables, and inquiry tracking is meaningfully more expensive than scaffolding them up front.

---

## 2. Phasing

| Phase | Goal | Build | Defer |
|---|---|---|---|
| **1 — Directory MVP** | Validate that users browse vendors and vendors register | Vendor directory, vendor registration form, manual admin approval, free planner template, inquiry form | Auth, dashboard, chat, payments, reviews, AI, mobile app |
| **2 — Marketplace Signals** | Measure lead value and vendor responsiveness | Saved vendors, compare vendors, vendor lead dashboard, response-time tracking, email notifications | Bidding, dynamic pricing, complex subscriptions |
| **3 — Monetization** | Convert proven value to revenue | Stripe subscriptions, featured listings, sponsored placement (labeled), premium planner, inquiry caps | Opaque paid ranking |
| **4 — Intelligent Planning** | Differentiate on planning quality | Budget-aware recommendations, vendor matching, event bundles, AI assistant, invitations | Premature ML on thin data |

Phase 1 is the only phase we are designing schema and product for in this document. Phases 2–4 inform what shape the phase-1 schema should take, but we do not build their tables yet.

---

## 3. Architecture

```
┌──────────────────────────────────────────────┐
│              User / Browser                  │
└─────────────────────┬────────────────────────┘
                      │
┌─────────────────────▼────────────────────────┐
│           Next.js 14 (App Router)            │
│   - Public pages (SSG/ISR, SEO-first)        │
│   - Vendor directory & profile pages         │
│   - Planner (client-side, optional save)     │
│   - Vendor registration form                 │
│   - Inquiry form & email handoff             │
│   - API routes for form POSTs                │
└─────────────────────┬────────────────────────┘
                      │
┌─────────────────────▼────────────────────────┐
│                 Supabase                     │
│   - Postgres (vendors, inquiries, planner)   │
│   - Storage (vendor photos)                  │
│   - Auth (deferred to Phase 2)               │
└──────────────────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────┐
│   Resend (email)    Vercel (host + CDN)      │
└──────────────────────────────────────────────┘
```

Two real moving parts. No queue, no search service, no caching layer, no separate API service. Each of those becomes a candidate only when its absence becomes a measured bottleneck.

---

## 4. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js 14 (App Router) | SSR/SSG in one framework. Vendor pages SSG with on-update revalidation — Google crawls real HTML. Dense agent training data. |
| Backend | Next.js API routes + server actions | One deploy unit. Stripe webhooks (later) and any third-party callbacks live as API routes, not server actions. |
| Database | Supabase Postgres | Managed Postgres with storage and auth in one product. Free tier for prototyping; $25/mo Pro once we have steady use. Native full-text search adequate for v1 scale. |
| Storage | Supabase Storage | Vendor photos served via Supabase, fronted by Vercel/Cloudflare CDN. Externalized from the DB. |
| Styling | Tailwind CSS | Excellent agent code generation, no naming debates, matches mockup. |
| Email | Resend | Inquiry notifications, vendor verification, admin alerts. Free tier sufficient for Phase 1. |
| Hosting | Vercel | Zero-config Next.js, preview URLs per branch, generous free tier. |
| Auth | *Deferred to Phase 2* | No user accounts in Phase 1. Inquiries are guest submissions. Vendors are reviewed manually. |
| Payments | *Deferred to Phase 3* | No revenue surface yet. |
| Analytics | PostHog | Funnel metrics from day one — search → vendor view → inquiry submit. |
| Error tracking | Sentry | Frontend and API route errors. Tablestakes. |

---

## 5. Schema strategy — the heart of the merge

### 5.1 Build now (the 1-way doors)

These shape decisions are cheap today and expensive to retrofit. Every one of them was wrong in Design B and right in Design A:

- **`providers` with a `status` enum** (`pending`, `approved`, `rejected`, `suspended`) — not a single `is_verified` boolean. The boolean conflates four real states and you will end up adding `is_suspended`, `is_rejected`, and friends within weeks.
- **`provider_locations` as a 1-to-many table.** Photographers, caterers, decorators, DJs serve multiple cities and travel. A single `city, state, zip` on the vendor row is wrong on day one.
- **`provider_categories` + `provider_category_map`** — many-to-many. A wedding venue is also a banquet hall and a reception space. A `category_id → categories` foreign key forces a migration the first time a vendor asks for two categories.
- **`provider_media` as its own table.** Not a `text[]` column. Photos need ordering, captions, alt text, moderation status, and upload state. The array column becomes a separate table within two months.
- **`inquiries` and `inquiry_messages` from day one.** This is the single most important schema decision. It captures lead data, response rates (the strongest future ranking signal), and prevents vendor email/phone from being scraped off public profiles. Without it, the directory has no defensible position — vendors take leads off-platform on day one.
- **Soft-delete columns (`deleted_at`)** on `providers`, `users`, and any other table holding user-supplied content. The first DPDP/GDPR/CCPA deletion request will be a hard problem otherwise.
- **`currency CHAR(3)` on every price column.** Even if v1 launches in one country, retrofitting currency when vendors expand or international users arrive is painful.
- **`country` column declared explicitly, default set per the resolved launch geography.** Design A's `DEFAULT 'US'` was a smell only because it papered over an unresolved question. Once §14 resolves the launch market (US-based Indian diaspora — see Schema DDL §0), a `'US'` default is the correct, deliberate choice. The column is `CHAR(2) NOT NULL` so the assumption is visible and changeable when we expand.

### 5.2 Defer (additional rows, not new shape)

These are easy to add later because they're new tables, not changes to existing relationships:

- Vendor subscriptions and Stripe customer mapping.
- Promotions, featured placements, spend tracking.
- Reviews and review moderation.
- Provider scores and ranking weights.
- SEO landing-page records (use Next.js dynamic routes against the vendor table for v1).
- Audit log (Supabase row history is sufficient for the manual-admin phase).
- Recommendation events / ranking telemetry.

### 5.3 Planner data — Phase 1 is a stripped-down PDF calculator

The planner in Phase 1 is a **client-side budget calculator only**. No persistence. No share tokens. No accounts. The user picks an event type, loads the default template, edits the line items in their browser, and exports a PDF. That's the whole experience.

The user_event_plans and user_event_plan_items tables exist in the schema but are inert in Phase 1 — no write path touches them. They're forward-compatible scaffolding for the Phase 2 saved-plans feature when accounts ship.

We lose the cost data this would have captured in Phase 1, which is a real cost — that dataset is the moat for Phase 4 recommendations. We accept it because:
- Validation matters more than data collection right now.
- The directory and inquiry flow are the actual product. The planner is a side tool that helps users *visit* the directory with a budget in mind.
- Aggregate pricing signal will eventually come from `inquiries.budget_min/max` and from observed `provider.price_range_*`, not just planner data.

The `event_types`, `event_templates`, and `event_template_items` tables are still active in Phase 1 — they feed the client-side template that the planner loads.

---

## 6. Data model overview (no DDL)

The Phase 1 entity set, grouped by domain:

**Identity**
- `users` — exists in the schema but unused in Phase 1. Inquiries and planners reference it via nullable foreign keys so Phase 2 attachment is a no-op.

**Vendor directory**
- `providers` — the vendor record. Has `status`, `slug`, `business_name`, contact fields, pricing range, `currency`, audit columns, `deleted_at` (geography lives on `provider_locations.country`, not the provider row).
- `provider_categories` — taxonomy.
- `provider_category_map` — many-to-many between providers and categories.
- `provider_locations` — 1-to-many; cities/regions a vendor serves, with optional `service_radius_miles` and lat/long for future geo work.
- `provider_media` — 1-to-many; photos with ordering, captions, moderation status.
- `category_requests` — free-text "Other" submissions from the registration form, with admin-resolution status.

**Planning**
- `event_types` — wedding, birthday, housewarming, baby shower, etc.
- `event_templates` — default line-item sets per event type.
- `event_template_items` — the line items themselves with budget percentages and cost ranges.
- `user_event_plans` — *inert in Phase 1.* Reserved for the Phase 2 saved-plans feature.
- `user_event_plan_items` — *inert in Phase 1.* Reserved for Phase 2.

**Leads**
- `inquiries` — submitted from the public form. Guest-friendly: `guest_name`, `guest_email`, `guest_phone` are all valid; `user_id` is nullable.
- `inquiry_messages` — the conversation thread, for Phase 2 when vendors can respond inside the platform. In Phase 1 this table exists but only the initial message row is written; vendor replies go via email.

That is the entire Phase 1 footprint. Fourteen tables. Everything else from Design A is deferred to its appropriate phase.

---

## 7. Vendor lifecycle

```
Vendor fills public form
  → INSERT providers (status='pending')
  → INSERT provider_locations, provider_category_map, provider_media
  → Resend email to admin
Admin reviews in Supabase Studio (no custom admin UI in Phase 1)
  → UPDATE providers SET status='approved' | 'rejected'
  → On approve: revalidate SSG for vendor profile and category pages
Vendor profile is now public
```

Suspension and re-approval are the same UPDATE on `status`. No new tables required when these flows formalize in Phase 2.

We will manually onboard the first 50–100 vendors. This both validates the product and gates quality — every vendor in the Phase 1 directory is one we have personally reviewed.

---

## 8. Inquiry / lead flow

```
User views vendor profile (vendor contact info NOT exposed)
  → "Request a quote" button
  → User fills inquiry form (event date, guest count, budget, message)
  → INSERT inquiries
  → Resend email to vendor with masked reply-to address
  → Resend confirmation to user
```

Three deliberate design choices:

1. **Vendor email and phone are not rendered on the public profile.** This is the only structural defense against PII scraping and against vendors taking leads off-platform. Design B exposed both publicly and would have lost this fight on day one.
2. **Reply-to address is masked** (a routing alias managed by Resend or a small Next.js route). This lets us see every reply and measure response time — the strongest ranking signal we can capture in Phase 1.
3. **Inquiries are guest-friendly.** No account required to submit. The form captures `guest_name`, `guest_email`, optional `guest_phone`. We do not gate the highest-conversion action behind signup.

---

## 9. Planner design

The planner is a single client-side React component backed by `event_template_items` for defaults. No database persistence in Phase 1.

User flow:
- Select event type → template loads with default line items, budget percentages, and cost ranges.
- User enters total budget → percentages drive default per-item allocations.
- User adjusts amounts and notes per line item.
- "Export to PDF" generates a printable budget summary.
- That's it. No save, no share link, no account.

The "shortlisted / booked / skipped" status states are deferred to Phase 2 along with persistence. Phase 1's planner is intentionally a one-session tool that bridges users into the directory with a budget in mind — not a long-lived planning workspace.

---

## 10. SEO strategy

For a directory, organic search is the moat. Design B underweighted this; Design A had `seo_pages` but didn't go deep. The Phase 1 approach:

- **Vendor profile pages**: SSG, revalidated on `providers.updated_at` change. Slug-based URLs. `LocalBusiness` JSON-LD with rating placeholder (until reviews ship in Phase 2).
- **Category pages**: `/{category-slug}` SSG, regenerated on category or vendor list change.
- **City + category pages**: `/{city-slug}/{category-slug}` dynamic-rendered with ISR, content driven by `provider_locations` joined with `provider_categories`. This is the programmatic SEO surface and the primary growth lever.
- **Sitemap**: segmented (root, vendors, city+category) and auto-regenerated nightly.
- **Structured data**: `LocalBusiness` per vendor, `BreadcrumbList` on every page, `Event` schema on event-type pages.
- **OG images**: per-vendor auto-generated cover with vendor name and primary city.

No `seo_pages` table in Phase 1 — Next.js routing against the vendor table is sufficient. The table is added in Phase 2 when curated editorial pages start.

---

## 11. Trust & safety

The marketplace risks worth designing against in Phase 1:

- **Vendor impersonation**: manual admin approval gates the entire directory in Phase 1. Verification badges and document checks come in Phase 2.
- **Off-platform lead leakage**: vendor contact info hidden behind inquiry form; masked reply-to addresses; first-message PII scanning deferred to Phase 2 but the data is captured from day one in `inquiry_messages.body`.
- **Inquiry spam**: rate-limit by IP + email on the inquiry form. CAPTCHA only if abuse is observed.
- **PII in storage**: vendor email, phone, and inquiry submitter data are PII. We do not log them to Sentry breadcrumbs or to Vercel logs. The Supabase row is the only authoritative copy.

---

## 12. Operations

Phase 1 is deliberately a manual operation:

- **Admin tool**: Supabase Studio. No custom admin UI is built.
- **Vendor approval**: email arrives → review in Studio → flip `status`.
- **Moderation**: admin review of any flagged inquiry or media; reactive, not queue-based.
- **Backups**: Supabase daily backups; weekly manual export for safety until Phase 2.
- **Observability**: Vercel logs for API routes, Sentry for errors, PostHog for product funnels. No custom dashboards.
- **Background jobs**: none in Phase 1. Email sending is synchronous via Resend inside API routes. When this becomes a latency problem we add Inngest or Trigger.dev.

This is honest about what Phase 1 is: a directory operated by one person with database GUI access.

---

## 13. What we are explicitly NOT building yet

| Feature | Why not now |
|---|---|
| User accounts and auth | Adds login UX, password reset, session storage. Not required for browsing or inquiry. |
| Vendor dashboard | Supabase Studio is enough at <100 vendors. |
| Real-time chat | Requires WebSocket infra, abuse handling, retention policy. Inquiry email handoff is sufficient. |
| Payments and subscriptions | No proven revenue surface. Stripe is a Phase 3 problem. |
| Featured / sponsored listings | Belongs in Phase 3 with monetization. |
| AI recommendations | Requires pricing density and behavior data we don't have yet. |
| Reviews | Requires user accounts and a moderation flow. Phase 2. |
| Map view / geosearch | City filter is sufficient at v1 scale. PostGIS in Phase 2 if needed. |
| Mobile app | The site is responsive. Native app is a Phase 4+ question. |
| Custom search engine (Algolia / Meilisearch) | Postgres full-text search is adequate until it isn't. |

---

## 14. Open questions — must resolve before DDL

These are decisions the design assumes but does not pick. The DDL cannot be written without them.

1. **Geography.** Is the launch market US-based Indian diaspora or India proper? This drives payment provider (Stripe vs. Razorpay), vendor KYC requirements (EIN vs. PAN/GSTIN), default currency, tax handling, language/script support, and DPDP Act 2023 compliance. The two markets are not the same product.
2. **Default currency.** Once (1) is answered, what is the default value for the `currency` column? USD or INR.
3. **Seed data origin.** Where do the first 50–100 vendors come from? Manual outreach is honest but slow. Scraping public directories carries real legal exposure (hiQ v. LinkedIn, Google/Yelp ToS). A "claim your listing" model needs a clear data source. This is a one-paragraph decision but the entire Phase 1 timeline depends on it.
4. **Categories taxonomy.** The initial list of categories is content, not schema, but it gates the registration form. Twenty categories is probably right; we need the actual list.
5. **Event types.** Same as categories — what does v1 ship with? Wedding, birthday, housewarming, baby shower, engagement, anniversary, graduation are likely. Confirm.
6. **PII handling commitment.** What is our published policy on storing vendor contact data, inquiry data, and planner data? This determines the privacy policy and the data retention defaults.
7. **Admin identity.** In Phase 1 there is no admin auth — admin is whoever has Supabase Studio access. Confirm this is acceptable until Phase 2.

---

## 15. Companion document

`docs/database/Utsav_Yojana_Schema_DDL.md` and `schema.sql` (repo root) — the PostgreSQL schema, indexes, RLS policies, triggers, and seed data for everything described in §5 and §6. Written. Resolved values for §14 questions 1–7 are captured in Schema DDL §0; refer to that table when those answers affect future decisions.
