# Utsav Yojana — agent orientation

This file is the entry point for any AI coding agent (Claude Code, Cursor, etc.) working on this repository. Read it before touching code or docs.

`CLAUDE.md` is a symlink to this file — anything that reads either path gets the same content.

---

## 1. What this project is

Utsav Yojana is a directory of Indian event vendors for the **US-based Indian diaspora**. Users browse vendors by category and city, view profiles, and contact vendors directly through an inquiry form. Vendors register their businesses through a public form; an admin (currently the project owner) approves every listing manually before it goes public.

Phase 1 is unbuilt. The docs and mockups in this repo define what to build, the schema is ready to run on Supabase, and the design system is ready to translate into Tailwind components.

---

## 2. Stack (Phase 1)

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Backend | Next.js API routes + server actions |
| Database | Supabase Postgres |
| Storage | Supabase Storage (vendor photos) |
| Styling | Tailwind CSS |
| Email | Resend |
| Hosting | Vercel |
| Analytics | PostHog |
| Error tracking | Sentry |
| Auth | **Deferred to Phase 2** — no accounts in Phase 1 |
| Payments | **Deferred to Phase 3** — no monetization in Phase 1 |

Full rationale: `docs/product/Utsav_Yojana_Design.md` §4.

---

## 3. Repository layout

```
u-y/
├── AGENTS.md                              ← you are here
├── CLAUDE.md                              ← symlink to AGENTS.md
├── schema.sql                             ← runnable Supabase schema
│
├── docs/
│   ├── product/
│   │   └── Utsav_Yojana_Design.md        ← product phasing, architecture, decisions
│   ├── database/
│   │   └── Utsav_Yojana_Schema_DDL.md    ← annotated schema walkthrough
│   └── ui/
│       └── Utsav_Yojana_UI_Spec_Nextjs_Routes.md  ← Next.js route map (some Phase 2+)
│
└── UX/
    ├── design-system.md                   ← tokens, components, copy voice, anti-patterns
    └── mockups/
        ├── home.html                      ← landing page with search
        ├── browse.html                    ← search results / category page
        ├── vendor-profile.html            ← vendor detail + inquiry modal
        ├── vendor-registration.html       ← 5-step vendor onboarding
        └── planner.html                   ← client-side budget calculator
```

The mockups are **canonical** for visual and interaction patterns. When in doubt about how something should look or behave, open the closest mockup and match it.

---

## 4. Read first — workflow shortcuts

When asked to do X, read these in this order before writing anything:

| Asked to… | Read first |
|---|---|
| Build any new page or component | `UX/design-system.md` → relevant mockup in `UX/mockups/` |
| Add or change a database table or column | `docs/database/Utsav_Yojana_Schema_DDL.md` → `schema.sql` |
| Make a product/scope decision | `docs/product/Utsav_Yojana_Design.md` §2 (phasing) and §13 (what we don't build) |
| Wire up a Next.js route | `docs/ui/Utsav_Yojana_UI_Spec_Nextjs_Routes.md` — but cross-check against Phase 1 scope (§7 below) |
| Add copy anywhere | `UX/design-system.md` §5 (copy voice) |
| Push back on a request | `UX/design-system.md` §8 (anti-patterns table) |

Never start coding from memory or assumption about how this product works. The docs are short — read them.

---

## 5. Resolved decisions (do not re-litigate)

These were settled deliberately. If you're tempted to change them, raise it with the user first rather than just doing it.

| Decision | Resolution | Source |
|---|---|---|
| Launch geography | US-based Indian diaspora (not India) | Schema DDL §0 |
| Default currency | USD | Schema DDL §0 |
| Seed data sourcing | Manual only for Phase 1 (revisit after first 50–100 vendors) | Schema DDL §0 |
| Inquiry PII handling | Standard — redact in logs, 12-month retention | Schema DDL §0 |
| Planner persistence | None in Phase 1 — client-side calculator with PDF export only | Design §5.3, §9 |
| Vendor quality claims | None — no "vetted," "verified," "approved" badges or copy anywhere | Design system §6, §8 |
| Accent color | Marigold `#C75D2C` (not saffron, not brick — tested both) | `UX/design-system.md` §2 |
| Typography | Fraunces (display) + Inter (body); two weights only (400, 500) | `UX/design-system.md` §2 |
| Admin tool | Supabase Studio — no custom admin UI in Phase 1 | Design §12 |
| Vendor contact exposure | Never rendered publicly; only via masked-reply inquiry | Design §11; Schema DDL §3.2 (COMMENTs) |

---

## 6. Phase 1 scope — what to build

The five user-facing screens, with canonical mockups:

1. **Home** (`UX/mockups/home.html`) — hero + search (category × city × optional budget), category and city discovery grids, planner pitch, vendor pitch.
2. **Browse / search results** (`UX/mockups/browse.html`) — filter triggers, sort, vendor card grid, empty state.
3. **Vendor profile** (`UX/mockups/vendor-profile.html`) — photo gallery, about, what's included, service area, sticky CTA card, inquiry modal.
4. **Vendor registration** (`UX/mockups/vendor-registration.html`) — 5-step form with progress indicator, chip multi-select, upload zone, success state. Linked from footer only at first.
5. **Planner** (`UX/mockups/planner.html`) — client-side budget calculator with event-type chips, sticky summary, editable line items, PDF export.

Plus the inquiry success — handled inline as a state-swap in the vendor-profile modal.

---

## 7. What NOT to build in Phase 1

The `docs/ui/Utsav_Yojana_UI_Spec_Nextjs_Routes.md` file lists routes under `(authenticated)/` and `provider/` — **those are Phase 2+ and should not be built in Phase 1**. The route spec is forward-looking; Phase 1 scope is the authoritative limit.

Specifically, do not build:

- User accounts, login, signup, password reset — auth is deferred.
- My Plan dashboard, saved plans, plan share URLs — planner is PDF-export only.
- User inquiry list / dashboard — guest inquiries only; vendor reply by email.
- Provider dashboard, vendor lead view — admin reviews in Supabase Studio.
- Reviews, ratings, star displays anywhere.
- "Vetted," "Verified," "Approved" badges on anything.
- Saved vendors, comparison shortlists.
- In-platform chat or real-time messaging.
- Stripe, payments, subscriptions, featured listings.
- AI-based recommendations or scoring.
- Map view, geosearch.
- Native mobile app.
- Custom search engines (Algolia, Meilisearch) — Postgres FTS only.

Full anti-pattern table with reasons: `UX/design-system.md` §8.

---

## 8. Schema invariants

When working with the database, these are load-bearing constraints from the design — don't violate without raising first:

- **All vendor records have `status` ∈ {pending, approved, rejected, suspended}.** Never collapse this to a boolean.
- **Vendors can have multiple categories** (`provider_category_map`), multiple locations (`provider_locations`), multiple photos (`provider_media`). One-to-one shortcuts are off the table.
- **Inquiries are guest-friendly** — `user_id` is nullable, `guest_email` + `guest_name` are the required pair when user is absent.
- **Soft delete via `deleted_at`** on `providers`, `users`, `user_event_plans`. Hard delete is reserved for compliance flows.
- **Currency column on every price** — even though we default to USD in Phase 1.
- **RLS is enabled on every table.** All Phase 1 writes go through Next.js API routes using the `service_role` key (which bypasses RLS). Anon SELECT is allowed only on public-by-design data (approved providers and their related tables, event templates).
- **Vendor `contact_email`/`contact_phone` columns exist but are never SELECTed from public/anon contexts.** They surface only through the inquiry masked-reply mechanism on the server.

---

## 9. Copy voice (one-line rules)

Pulled from `UX/design-system.md` §5. Apply to every string you write.

- Name event types directly (sangeet, puja, baby shower) — don't abstract to "celebrations" or "occasions."
- Sentence case, never Title Case or ALL CAPS. Includes button labels.
- "Request a quote" beats "Submit RFP." "List your business" beats "Become a partner."
- Optional fields marked `(optional)` after the label, never with asterisks.
- Banned words: *vibrant, festive, passionate about, celebrate connect, journey, vetted, verified, approved.*

---

## 10. When docs conflict

This happens. Apply in this order:

1. **AGENTS.md (this file)** — for what's in Phase 1 and what's deferred.
2. **`UX/design-system.md`** — for visual and interaction patterns.
3. **`UX/mockups/*.html`** — for any visual ambiguity not resolved by the design system doc.
4. **`docs/product/Utsav_Yojana_Design.md`** — for product/architecture decisions.
5. **`docs/database/Utsav_Yojana_Schema_DDL.md`** and **`schema.sql`** — for schema decisions.
6. **`docs/ui/Utsav_Yojana_UI_Spec_Nextjs_Routes.md`** — for route structure, **filtered through §6 and §7 above** (the route spec is more ambitious than Phase 1).

If you find a real conflict that this hierarchy doesn't resolve, flag it to the user rather than picking one silently.

---

## 11. Things that aren't here yet

If you're asked to work on any of these, they don't exist in this repo:

- No Next.js project scaffolded yet — `app/`, `package.json`, `tsconfig.json` are not present.
- No Supabase project keys committed — that's on the operator to set up.
- No tests, no CI configuration.
- No deployment configuration for Vercel.

When the implementation starts, add the relevant getting-started instructions to this file under a new "Local development" section.
