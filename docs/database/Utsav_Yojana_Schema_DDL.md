# Utsav Yojana — Schema DDL

*Companion to `docs/product/Utsav_Yojana_Design.md`. PostgreSQL / Supabase Phase 1 schema.*

---

## 0. Resolved decisions

These were the open questions from §14 of the design doc. They drive defaults below.

| # | Question | Resolution | Schema impact |
|---|---|---|---|
| 1 | Geography | US-based Indian diaspora | `country` defaults to `'US'` |
| 2 | Default currency | USD | `currency CHAR(3) DEFAULT 'USD'` |
| 3 | Seed sourcing | Manual-only for Phase 1, revisit later | `is_claimed BOOLEAN DEFAULT true` (every Phase 1 record is claimed by definition; column kept for future scraping flexibility) |
| 4 | Categories | Seeded list + "Other" with free-text | `category_requests` table captures free-text submissions for admin review |
| 5 | Event types | 8 (Wedding, Birthday, Housewarming, Baby Shower, Engagement, Anniversary, Graduation, Puja/Ritual) | Seed inserts at bottom |
| 6 | Inquiry PII | Standard: redact in logs, 12-month retention | `COMMENT ON` markers on PII columns; retention enforced at app layer |
| 7 | Admin identity | Supabase Studio access only in Phase 1 | No admin table or admin auth flow |

---

## 1. Extensions and shared helpers

```sql
-- Required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- trigram search on vendor names
CREATE EXTENSION IF NOT EXISTS unaccent;  -- transliterated name matching

-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

`pg_trgm` and `unaccent` together handle the transliteration problem (Shashank/Sashank, Krishna/Krsna, etc.) that ASCII full-text search misses. Cheap to install up front, painful to retrofit.

---

## 2. Identity

`users` is sparse in Phase 1 — it exists only so foreign keys from `inquiries.user_id` and `user_event_plans.user_id` have a target. No auth flow writes to it yet. In Phase 2 we add a Supabase `auth.users → public.users` mapping.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    full_name TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'provider_owner', 'admin')),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON COLUMN users.email IS 'PII: 12mo retention, redact in logs';
COMMENT ON COLUMN users.full_name IS 'PII: 12mo retention, redact in logs';
COMMENT ON COLUMN users.phone IS 'PII: 12mo retention, redact in logs';
```

---

## 3. Provider directory

The five tables here are the relational shape we committed to in the design doc: providers, their categories (many-to-many), their locations (one-to-many), their media (one-to-many), and free-text category requests for the "Other" flow.

### 3.1 Categories

```sql
CREATE TABLE provider_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    parent_category_id UUID REFERENCES provider_categories(id),
    icon TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`parent_category_id` is optional and Phase 1 keeps the taxonomy flat. It's there so subcategories ("Mehndi Artist" under "Beauty") can be introduced later without a migration.

### 3.2 Providers

```sql
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID REFERENCES users(id),
    business_name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,

    -- Contact (never rendered on public profile; surfaced only via masked-reply inquiry)
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    website_url TEXT,
    instagram_url TEXT,

    -- Pricing (publicly displayed)
    price_range_low NUMERIC(12,2),
    price_range_high NUMERIC(12,2),
    price_unit TEXT
        CHECK (price_unit IN ('event', 'hour', 'person', 'package', 'day')),
    currency CHAR(3) NOT NULL DEFAULT 'USD',

    -- Lifecycle
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
    is_claimed BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    rejection_reason TEXT,

    -- Free-text category request from registration form ("Other" option)
    requested_category_text TEXT,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,

    CHECK (
        price_range_low IS NULL OR price_range_high IS NULL
        OR price_range_low <= price_range_high
    )
);

CREATE TRIGGER trg_providers_updated_at
    BEFORE UPDATE ON providers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON COLUMN providers.contact_email IS 'Vendor business contact - never exposed publicly; surfaced only via inquiry masked-reply';
COMMENT ON COLUMN providers.contact_phone IS 'Vendor business contact - never exposed publicly; surfaced only via inquiry masked-reply';
COMMENT ON COLUMN providers.is_claimed IS 'true for Phase 1 (all manual); false reserved for future scraped/seeded records';
```

### 3.3 Category mapping (many-to-many)

```sql
CREATE TABLE provider_category_map (
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES provider_categories(id),
    PRIMARY KEY (provider_id, category_id)
);
```

### 3.4 Locations

```sql
CREATE TABLE provider_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT,
    country CHAR(2) NOT NULL DEFAULT 'US',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    service_radius_miles INT
        CHECK (service_radius_miles IS NULL OR service_radius_miles > 0),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- At most one primary location per provider
CREATE UNIQUE INDEX idx_provider_locations_one_primary
    ON provider_locations(provider_id) WHERE is_primary;
```

### 3.5 Media

```sql
CREATE TABLE provider_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL
        CHECK (media_type IN ('image', 'video')),
    storage_path TEXT NOT NULL,    -- Supabase Storage object path
    alt_text TEXT,
    caption TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'pending_review', 'rejected', 'deleted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.6 Category requests (the "Other" flow)

When a vendor picks "Other" during registration and types a free-text category, that submission lands here. Admin reviews periodically and either maps it to an existing category, creates a new one, or rejects it.

```sql
CREATE TABLE category_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    requested_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'merged', 'created', 'rejected')),
    resolved_category_id UUID REFERENCES provider_categories(id),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);
```

---

## 4. Planning

`event_types` and `event_templates` are admin-curated; `event_template_items` is the line-item set per template. User-side plans live in `user_event_plans` (keyed by `share_token` so they work without accounts) and their items in `user_event_plan_items`.

```sql
CREATE TABLE event_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE event_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type_id UUID NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE event_template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES event_templates(id) ON DELETE CASCADE,
    category_id UUID REFERENCES provider_categories(id),
    item_name TEXT NOT NULL,
    default_budget_percent NUMERIC(5,2)
        CHECK (default_budget_percent IS NULL
            OR (default_budget_percent >= 0 AND default_budget_percent <= 100)),
    default_cost_min NUMERIC(12,2),
    default_cost_max NUMERIC(12,2),
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    sort_order INT NOT NULL DEFAULT 0,
    CHECK (
        default_cost_min IS NULL OR default_cost_max IS NULL
        OR default_cost_min <= default_cost_max
    )
);

CREATE TABLE user_event_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),                              -- nullable; Phase 2 attaches
    share_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),     -- public-share key
    event_type_id UUID REFERENCES event_types(id),
    name TEXT NOT NULL,
    event_date DATE,
    event_timezone TEXT,
    guest_count INT CHECK (guest_count IS NULL OR guest_count > 0),
    budget_min NUMERIC(12,2),
    budget_max NUMERIC(12,2),
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    city TEXT,
    state TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'archived', 'deleted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CHECK (
        budget_min IS NULL OR budget_max IS NULL
        OR budget_min <= budget_max
    )
);

CREATE TRIGGER trg_user_event_plans_updated_at
    BEFORE UPDATE ON user_event_plans
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE user_event_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_plan_id UUID NOT NULL REFERENCES user_event_plans(id) ON DELETE CASCADE,
    category_id UUID REFERENCES provider_categories(id),
    item_name TEXT NOT NULL,
    estimated_cost NUMERIC(12,2),
    actual_cost NUMERIC(12,2),
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    selected_provider_id UUID REFERENCES providers(id),
    status TEXT NOT NULL DEFAULT 'planned'
        CHECK (status IN ('planned', 'shortlisted', 'booked', 'skipped')),
    notes TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_user_event_plan_items_updated_at
    BEFORE UPDATE ON user_event_plan_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

## 5. Leads (inquiries)

The single most load-bearing Phase 1 table. Captures the consumer's request, holds the masked-reply token for the email handoff, and tracks vendor response time — the strongest signal we'll have for Phase 2 ranking.

```sql
CREATE TABLE inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Inquirer (Phase 1: always guest; Phase 2: optional user_id)
    user_id UUID REFERENCES users(id),
    guest_name TEXT,
    guest_email TEXT,
    guest_phone TEXT,

    -- Target vendor
    provider_id UUID NOT NULL REFERENCES providers(id),

    -- Optional link to a saved planner
    event_plan_id UUID REFERENCES user_event_plans(id),

    -- Event details
    event_type_id UUID REFERENCES event_types(id),
    event_date DATE,
    event_timezone TEXT,
    guest_count INT CHECK (guest_count IS NULL OR guest_count > 0),
    budget_min NUMERIC(12,2),
    budget_max NUMERIC(12,2),
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    city TEXT,
    state TEXT,

    -- Message body
    message TEXT NOT NULL,

    -- Masked reply alias (vendor email replies route through this token)
    reply_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),

    -- Lifecycle and response tracking
    status TEXT NOT NULL DEFAULT 'sent'
        CHECK (status IN ('sent', 'delivered', 'viewed', 'responded', 'closed', 'spam')),
    vendor_first_viewed_at TIMESTAMPTZ,
    vendor_first_responded_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Either an authenticated user OR guest contact required
    CHECK (
        user_id IS NOT NULL
        OR (guest_email IS NOT NULL AND guest_name IS NOT NULL)
    ),
    CHECK (
        budget_min IS NULL OR budget_max IS NULL
        OR budget_min <= budget_max
    )
);

CREATE TRIGGER trg_inquiries_updated_at
    BEFORE UPDATE ON inquiries
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON COLUMN inquiries.guest_name IS 'PII: consumer-side, 12mo retention, redact in logs';
COMMENT ON COLUMN inquiries.guest_email IS 'PII: consumer-side, 12mo retention, redact in logs';
COMMENT ON COLUMN inquiries.guest_phone IS 'PII: consumer-side, 12mo retention, redact in logs';
COMMENT ON COLUMN inquiries.message IS 'PII: consumer-side, 12mo retention; do not include in error logs';
```

### 5.1 Inquiry messages (thread)

Phase 1 writes only the initial inquiry row here. Vendor replies go via email through the masked-reply alias. Phase 2 promotes this to an in-platform thread.

```sql
CREATE TABLE inquiry_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
    sender_role TEXT NOT NULL
        CHECK (sender_role IN ('user', 'guest', 'vendor', 'system')),
    sender_user_id UUID REFERENCES users(id),
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ
);

COMMENT ON TABLE inquiry_messages IS 'Phase 1: only initial inquiry row; vendor replies go via email. Phase 2: in-platform thread.';
```

---

## 6. Indexes

```sql
-- Provider directory queries (public-facing)
CREATE INDEX idx_providers_status_deleted
    ON providers(status, deleted_at);
CREATE INDEX idx_providers_price_range
    ON providers(price_range_low, price_range_high);
CREATE INDEX idx_providers_business_name_trgm
    ON providers USING gin (business_name gin_trgm_ops);

-- Category filtering
CREATE INDEX idx_provider_category_map_category
    ON provider_category_map(category_id, provider_id);

-- Location queries
CREATE INDEX idx_provider_locations_city_state
    ON provider_locations(city, state);
CREATE INDEX idx_provider_locations_provider
    ON provider_locations(provider_id);
CREATE INDEX idx_provider_locations_geo
    ON provider_locations(latitude, longitude)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Media (active items sorted for display)
CREATE INDEX idx_provider_media_provider_sort
    ON provider_media(provider_id, sort_order)
    WHERE status = 'active';

-- Inquiry dashboard
CREATE INDEX idx_inquiries_provider_status_created
    ON inquiries(provider_id, status, created_at DESC);

-- Inquiry thread
CREATE INDEX idx_inquiry_messages_inquiry_created
    ON inquiry_messages(inquiry_id, created_at);

-- Planner lookups
CREATE INDEX idx_user_event_plans_user_status
    ON user_event_plans(user_id, status, created_at DESC)
    WHERE user_id IS NOT NULL;
CREATE INDEX idx_user_event_plan_items_plan_sort
    ON user_event_plan_items(event_plan_id, sort_order);

-- Admin review queue
CREATE INDEX idx_category_requests_status_created
    ON category_requests(status, created_at DESC);
```

Notable choices:

- `gin_trgm_ops` on `business_name` for fuzzy name search (handles transliterations).
- Partial index on geo coordinates only where present — most Phase 1 rows won't have them.
- Partial index on `is_primary` enforces "one primary location per provider."
- Partial index on `user_id IS NOT NULL` skips the Phase-1 majority of plans that have no owner.

---

## 7. Row-level security

Supabase exposes Postgres tables directly to the browser via the anon key unless RLS is enabled. The Phase 1 stance: enable RLS everywhere, allow anon reads only on public-by-design data, route every write through Next.js API routes using the service role key.

```sql
ALTER TABLE users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_category_map   ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_locations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_media          ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_types             ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_templates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_template_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_event_plans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_event_plan_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries               ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_messages        ENABLE ROW LEVEL SECURITY;

-- Public read: approved, non-deleted providers
CREATE POLICY public_read_approved_providers ON providers
    FOR SELECT TO anon
    USING (status = 'approved' AND deleted_at IS NULL);

CREATE POLICY public_read_provider_categories ON provider_categories
    FOR SELECT TO anon
    USING (is_active);

CREATE POLICY public_read_provider_category_map ON provider_category_map
    FOR SELECT TO anon
    USING (EXISTS (
        SELECT 1 FROM providers p
        WHERE p.id = provider_id
          AND p.status = 'approved'
          AND p.deleted_at IS NULL
    ));

CREATE POLICY public_read_provider_locations ON provider_locations
    FOR SELECT TO anon
    USING (EXISTS (
        SELECT 1 FROM providers p
        WHERE p.id = provider_id
          AND p.status = 'approved'
          AND p.deleted_at IS NULL
    ));

CREATE POLICY public_read_provider_media ON provider_media
    FOR SELECT TO anon
    USING (
        status = 'active'
        AND EXISTS (
            SELECT 1 FROM providers p
            WHERE p.id = provider_id
              AND p.status = 'approved'
              AND p.deleted_at IS NULL
        )
    );

CREATE POLICY public_read_event_types ON event_types
    FOR SELECT TO anon USING (is_active);
CREATE POLICY public_read_event_templates ON event_templates
    FOR SELECT TO anon USING (true);
CREATE POLICY public_read_event_template_items ON event_template_items
    FOR SELECT TO anon USING (true);

-- NOT exposed to anon: users, category_requests, inquiries, inquiry_messages,
-- user_event_plans, user_event_plan_items. All access goes through API routes
-- using the service role key, which bypasses RLS.
```

The planner reads (`user_event_plans` by share token) intentionally route through the API rather than direct anon SELECT, so we can rate-limit and validate the token server-side.

---

## 8. Seed data

### 8.1 Event types

```sql
INSERT INTO event_types (name, slug, display_order) VALUES
    ('Wedding',       'wedding',       1),
    ('Engagement',    'engagement',    2),
    ('Anniversary',   'anniversary',   3),
    ('Baby Shower',   'baby-shower',   4),
    ('Housewarming',  'housewarming',  5),
    ('Birthday',      'birthday',      6),
    ('Graduation',    'graduation',    7),
    ('Puja / Ritual', 'puja-ritual',   8);
```

### 8.2 Provider categories

Eighteen Phase-1 categories. The "Other" flow handles long-tail submissions, which admin can promote into this list periodically.

```sql
INSERT INTO provider_categories (name, slug, display_order) VALUES
    ('Venue',                      'venue',                     1),
    ('Caterer',                    'caterer',                   2),
    ('Photographer',               'photographer',              3),
    ('Videographer',               'videographer',              4),
    ('Decorator',                  'decorator',                 5),
    ('Florist',                    'florist',                   6),
    ('DJ / Music',                 'dj-music',                  7),
    ('Mehndi Artist',              'mehndi-artist',             8),
    ('Makeup Artist',              'makeup-artist',             9),
    ('Pandit / Priest',            'pandit-priest',            10),
    ('Bartender',                  'bartender',                11),
    ('Sweets / Mithai',            'sweets-mithai',            12),
    ('Clothing & Sarees',          'clothing-sarees',          13),
    ('Jewelry',                    'jewelry',                  14),
    ('Transportation',             'transportation',           15),
    ('Invitations & Stationery',   'invitations-stationery',   16),
    ('Event Planner',              'event-planner',            17),
    ('Dhol / Live Music',          'dhol-live-music',          18);
```

### 8.3 Default templates (one empty per event type, wedding pre-populated)

```sql
-- One default template per event type
INSERT INTO event_templates (event_type_id, name, is_default)
SELECT id, 'Default ' || name || ' Plan', true
FROM event_types;

-- Wedding template line items (rough US-diaspora norms; admin can tune)
DO $$
DECLARE
    wt UUID;
BEGIN
    SELECT et.id INTO wt
    FROM event_templates et
    JOIN event_types t ON t.id = et.event_type_id
    WHERE t.slug = 'wedding' AND et.is_default;

    INSERT INTO event_template_items
        (template_id, category_id, item_name, default_budget_percent,
         default_cost_min, default_cost_max, sort_order)
    SELECT wt, c.id, item_name, pct, cmin, cmax, ord
    FROM (VALUES
        ('venue',                  'Venue',                30.00, 5000, 25000,  1),
        ('caterer',                'Catering',             25.00, 4000, 20000,  2),
        ('photographer',           'Photography',           8.00, 1500,  7000,  3),
        ('videographer',           'Videography',           5.00, 1000,  5000,  4),
        ('decorator',              'Decor & Mandap',       10.00, 1500, 10000,  5),
        ('pandit-priest',          'Pandit',                1.50,  200,  1500,  6),
        ('dj-music',               'DJ / Music',            5.00,  800,  5000,  7),
        ('mehndi-artist',          'Mehndi Artist',         2.00,  300,  2000,  8),
        ('makeup-artist',          'Bridal Makeup',         3.00,  500,  3000,  9),
        ('sweets-mithai',          'Sweets / Mithai',       2.00,  300,  1500, 10),
        ('invitations-stationery', 'Invitations',           1.50,  200,  1500, 11),
        ('transportation',         'Transportation',        2.00,  300,  2500, 12)
    ) AS items(slug, item_name, pct, cmin, cmax, ord)
    JOIN provider_categories c ON c.slug = items.slug;
END $$;
```

Total seeded percentages: ~95%, leaving headroom for misc line items the user adds. Numbers are starting estimates, not gospel — Phase 2 will recalibrate from observed plan data.

---

## 9. How to apply

1. Create a new Supabase project. Note the `service_role` key (Settings → API). This key bypasses RLS and is what Next.js API routes use.
2. Open the SQL editor in Supabase Studio.
3. Paste the full contents of `schema.sql` (repo root) and run it. It's intended to run top-to-bottom on a fresh database.
4. Verify in the Table Editor that all 14 tables exist with their columns and constraints.
5. Confirm the seed rows: `SELECT count(*) FROM event_types;` should return 8, and `SELECT count(*) FROM provider_categories;` should return 18.
6. From your Next.js app, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as server-only env vars. Never expose the service role key to the browser. The anon key is fine to expose for the public read paths.

---

## 10. Phase 2 migration notes

A short list of what will change when Phase 2 starts, so you don't accidentally fight the schema:

- **Auth.** Wire Supabase `auth.users` into `public.users`. Backfill `inquiries.user_id` and `user_event_plans.user_id` where the email matches the new auth account. No table changes required.
- **Vendor dashboard.** New `provider_team_members` table mapping `auth.users` to `providers`. RLS policy on inquiries for the vendor side: vendor can SELECT inquiries WHERE provider_id IN (their providers).
- **Reviews.** New `provider_reviews` table with `(provider_id, user_id)` unique constraint, multi-dimensional rating columns (quality, communication, value), tied to a closed inquiry to gate fake reviews.
- **In-platform vendor replies.** Vendor responses start landing in `inquiry_messages` directly (instead of via email). `inquiries.status` advances on first vendor message.
- **Subscriptions and Stripe.** New `subscription_plans`, `vendor_subscriptions`, `stripe_webhook_events` tables. `vendor_subscriptions.stripe_subscription_id` should be `UNIQUE` from day one to dedupe webhook replays.

Every Phase 2 change above is additive. Nothing in the Phase 1 schema needs to be renamed, dropped, or backfilled.
