-- =============================================================================
-- Utsav Yojana — Phase 1 schema
-- Runs top-to-bottom on a fresh Supabase Postgres database.
-- Companion to docs/database/Utsav_Yojana_Schema_DDL.md and docs/product/Utsav_Yojana_Design.md.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions and shared helpers
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- Users (sparse in Phase 1; FK target for inquiries and plans)
-- -----------------------------------------------------------------------------
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

COMMENT ON COLUMN users.email     IS 'PII: 12mo retention, redact in logs';
COMMENT ON COLUMN users.full_name IS 'PII: 12mo retention, redact in logs';
COMMENT ON COLUMN users.phone     IS 'PII: 12mo retention, redact in logs';

-- -----------------------------------------------------------------------------
-- Provider categories
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Providers
-- -----------------------------------------------------------------------------
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID REFERENCES users(id),
    business_name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,

    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    website_url TEXT,
    instagram_url TEXT,

    price_range_low NUMERIC(12,2),
    price_range_high NUMERIC(12,2),
    price_unit TEXT
        CHECK (price_unit IN ('event', 'hour', 'person', 'package', 'day')),
    currency CHAR(3) NOT NULL DEFAULT 'USD',

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
    is_claimed BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    rejection_reason TEXT,

    requested_category_text TEXT,

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

COMMENT ON COLUMN providers.contact_email IS 'Vendor contact - never rendered publicly; only via inquiry masked-reply';
COMMENT ON COLUMN providers.contact_phone IS 'Vendor contact - never rendered publicly; only via inquiry masked-reply';
COMMENT ON COLUMN providers.is_claimed    IS 'true for Phase 1 (manual onboarding); false reserved for future scraped records';

-- -----------------------------------------------------------------------------
-- Provider many-to-many: categories, locations, media
-- -----------------------------------------------------------------------------
CREATE TABLE provider_category_map (
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES provider_categories(id),
    PRIMARY KEY (provider_id, category_id)
);

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

CREATE UNIQUE INDEX idx_provider_locations_one_primary
    ON provider_locations(provider_id) WHERE is_primary;

CREATE TABLE provider_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL
        CHECK (media_type IN ('image', 'video')),
    storage_path TEXT NOT NULL,
    alt_text TEXT,
    caption TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'pending_review', 'rejected', 'deleted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Category requests ("Other" registration flow)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Event types & templates
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- User event plans (planner)
-- -----------------------------------------------------------------------------
CREATE TABLE user_event_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    share_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
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

-- -----------------------------------------------------------------------------
-- Inquiries
-- -----------------------------------------------------------------------------
CREATE TABLE inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID REFERENCES users(id),
    guest_name TEXT,
    guest_email TEXT,
    guest_phone TEXT,

    provider_id UUID NOT NULL REFERENCES providers(id),
    event_plan_id UUID REFERENCES user_event_plans(id),

    event_type_id UUID REFERENCES event_types(id),
    event_date DATE,
    event_timezone TEXT,
    guest_count INT CHECK (guest_count IS NULL OR guest_count > 0),
    budget_min NUMERIC(12,2),
    budget_max NUMERIC(12,2),
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    city TEXT,
    state TEXT,

    message TEXT NOT NULL,
    reply_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),

    status TEXT NOT NULL DEFAULT 'sent'
        CHECK (status IN ('sent', 'delivered', 'viewed', 'responded', 'closed', 'spam')),
    vendor_first_viewed_at TIMESTAMPTZ,
    vendor_first_responded_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

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

COMMENT ON COLUMN inquiries.guest_name  IS 'PII: consumer-side, 12mo retention, redact in logs';
COMMENT ON COLUMN inquiries.guest_email IS 'PII: consumer-side, 12mo retention, redact in logs';
COMMENT ON COLUMN inquiries.guest_phone IS 'PII: consumer-side, 12mo retention, redact in logs';
COMMENT ON COLUMN inquiries.message     IS 'PII: consumer-side, 12mo retention; do not log';

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

COMMENT ON TABLE inquiry_messages IS 'Phase 1: only initial inquiry row. Phase 2: in-platform thread.';

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX idx_providers_status_deleted        ON providers(status, deleted_at);
CREATE INDEX idx_providers_price_range           ON providers(price_range_low, price_range_high);
CREATE INDEX idx_providers_business_name_trgm    ON providers USING gin (business_name gin_trgm_ops);

CREATE INDEX idx_provider_category_map_category  ON provider_category_map(category_id, provider_id);

CREATE INDEX idx_provider_locations_city_state   ON provider_locations(city, state);
CREATE INDEX idx_provider_locations_provider     ON provider_locations(provider_id);
CREATE INDEX idx_provider_locations_geo          ON provider_locations(latitude, longitude)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX idx_provider_media_provider_sort    ON provider_media(provider_id, sort_order)
    WHERE status = 'active';

CREATE INDEX idx_inquiries_provider_status_created ON inquiries(provider_id, status, created_at DESC);
CREATE INDEX idx_inquiry_messages_inquiry_created  ON inquiry_messages(inquiry_id, created_at);

CREATE INDEX idx_user_event_plans_user_status    ON user_event_plans(user_id, status, created_at DESC)
    WHERE user_id IS NOT NULL;
CREATE INDEX idx_user_event_plan_items_plan_sort ON user_event_plan_items(event_plan_id, sort_order);

CREATE INDEX idx_category_requests_status_created ON category_requests(status, created_at DESC);

-- -----------------------------------------------------------------------------
-- Row-level security
-- -----------------------------------------------------------------------------
ALTER TABLE users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_category_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_locations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_media        ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_types           ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_template_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_event_plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_event_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries             ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_messages      ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_read_approved_providers ON providers
    FOR SELECT TO anon
    USING (status = 'approved' AND deleted_at IS NULL);

CREATE POLICY public_read_provider_categories ON provider_categories
    FOR SELECT TO anon USING (is_active);

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

CREATE POLICY public_read_event_types         ON event_types         FOR SELECT TO anon USING (is_active);
CREATE POLICY public_read_event_templates     ON event_templates     FOR SELECT TO anon USING (true);
CREATE POLICY public_read_event_template_items ON event_template_items FOR SELECT TO anon USING (true);

-- All other tables: no anon access. Service role (Next.js API routes) bypasses RLS.

-- -----------------------------------------------------------------------------
-- Seed: event types
-- -----------------------------------------------------------------------------
INSERT INTO event_types (name, slug, display_order) VALUES
    ('Wedding',       'wedding',       1),
    ('Engagement',    'engagement',    2),
    ('Anniversary',   'anniversary',   3),
    ('Baby Shower',   'baby-shower',   4),
    ('Housewarming',  'housewarming',  5),
    ('Birthday',      'birthday',      6),
    ('Graduation',    'graduation',    7),
    ('Puja / Ritual', 'puja-ritual',   8);

-- -----------------------------------------------------------------------------
-- Seed: provider categories
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Seed: default templates per event type, wedding pre-populated
-- -----------------------------------------------------------------------------
INSERT INTO event_templates (event_type_id, name, is_default)
SELECT id, 'Default ' || name || ' Plan', true
FROM event_types;

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
        ('venue',                  'Venue',                30.00, 5000.00, 25000.00,  1),
        ('caterer',                'Catering',             25.00, 4000.00, 20000.00,  2),
        ('photographer',           'Photography',           8.00, 1500.00,  7000.00,  3),
        ('videographer',           'Videography',           5.00, 1000.00,  5000.00,  4),
        ('decorator',              'Decor & Mandap',       10.00, 1500.00, 10000.00,  5),
        ('pandit-priest',          'Pandit',                1.50,  200.00,  1500.00,  6),
        ('dj-music',               'DJ / Music',            5.00,  800.00,  5000.00,  7),
        ('mehndi-artist',          'Mehndi Artist',         2.00,  300.00,  2000.00,  8),
        ('makeup-artist',          'Bridal Makeup',         3.00,  500.00,  3000.00,  9),
        ('sweets-mithai',          'Sweets / Mithai',       2.00,  300.00,  1500.00, 10),
        ('invitations-stationery', 'Invitations',           1.50,  200.00,  1500.00, 11),
        ('transportation',         'Transportation',        2.00,  300.00,  2500.00, 12)
    ) AS items(slug, item_name, pct, cmin, cmax, ord)
    JOIN provider_categories c ON c.slug = items.slug;
END $$;

-- =============================================================================
-- End of Phase 1 schema.
-- =============================================================================
