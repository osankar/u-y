# Utsav Yojana — Design System

*A reference for humans and AI coding agents building or extending this product.*

The canonical implementations live in `UX/mockups/`. When in doubt about a pattern, open those files first — this doc explains the *why*; the mockups show the *what*.

---

## 0. Audience and tone

The product is a directory of Indian event vendors for the **US-based Indian diaspora**. The audience is design-literate, upper-middle-class, second-generation-fluent in mainstream taste. They will read cultural decoration as condescending and stock-photo flourishes as low-effort.

The product voice is **specific, warm, and confident**. It names things directly — weddings, pujas, sangeets, mehndi — rather than gesturing at "celebrations" or "occasions." Copy avoids the corporate cadence of "Celebrate. Connect. Create memories." It also avoids ethnic framing: the product is not "exotic" or "festive" or "vibrant." It is simply the place where the Indian community in the US finds vendors who know what a sangeet is.

The benchmark question for every design decision: *would this look out of place in the same browser tabs as Allbirds, Notion, and Airbnb?* If yes, reconsider.

---

## 1. Visual posture

### What to do

- **Restrained palette.** Warm white background, charcoal text, generous whitespace, one accent color (marigold). One ramp, not a rainbow.
- **Photography does the cultural work.** Real vendor photos communicate the audience more effectively than any graphic chrome. When photos aren't available, use neutral coral-tinted CSS placeholders, not stock illustrations.
- **Classical typography.** A characterful serif for headings (Fraunces), a clean sans for body (Inter). Both well-supported on Google Fonts. The serif gives editorial weight; the sans keeps it modern.
- **Flat surfaces.** 0.5px borders, soft shadows on raised elements only (cards with sticky CTAs), generous border-radius (10–16px) on cards.
- **Sentence case everywhere.** Not Title Case, not ALL CAPS. Including button labels and section headers.

### What not to do

- **No saffron-red-gold color schemes.** This palette signals "low-effort cultural cosplay" to the audience. The accent is marigold (#C75D2C), a more grounded terracotta-leaning warm tone.
- **No mandala backgrounds, peacock motifs, paisley patterns, or ornate borders.** These are graphic shortcuts that telegraph the designer doesn't trust the audience to know what's Indian.
- **No "decorative ethnic" display fonts.** No Bombay Bold, no Mehndi Script, no Devanagari pastiche. The Devanagari subtitle ("उत्सव योजना") in Fraunces under the wordmark is the only direct script reference.
- **No gradients, mesh backgrounds, neon glows, drop shadows on text, or animated backgrounds.** Flat and quiet.
- **No stock cultural imagery.** No bride-with-mandala overlay, no chai-tea-and-marigold hero photos, no "blessed by the gods" framing.
- **No emoji** anywhere in the UI.

---

## 2. Design tokens

### Color

All defined as CSS variables in `:root` and used throughout the mockups.

```css
:root {
  /* Surfaces */
  --bg: #FAF7F2;                    /* warm white page bg */
  --surface: #FFFFFF;               /* card / modal bg */
  --surface-alt: #F4EFE7;           /* subtle alt surface */

  /* Text */
  --text: #1A1A1A;                  /* primary text */
  --text-muted: #6B6B6B;            /* secondary text */
  --text-subtle: #9B9B9B;           /* hints, labels, captions */

  /* Accent (marigold / terracotta) */
  --accent: #C75D2C;                /* primary action */
  --accent-hover: #A84A1F;          /* hover state */
  --accent-soft: #FDF1EB;           /* tinted backgrounds */
  --accent-soft-strong: #F8DDC8;    /* tinted borders */
  --accent-deep: #712B13;           /* text on accent-soft fills */

  /* Borders */
  --border: #E8E4DD;                /* default 0.5px */
  --border-strong: #D5CFC4;         /* hover, dividers */
}
```

**Rules:**
- Text on `--accent-soft` (the marigold-tinted blocks) uses `--accent-deep`, never `--text`. The contrast inside colored fills always pulls from the same color family.
- Never hardcode hex values in components. Reference the tokens.
- The accent is for primary actions, brand moments, and one colored block per page max. Don't decorate with it.

### Typography

```css
/* Loaded via Google Fonts */
font-family: 'Fraunces', serif;                                /* display */
font-family: 'Inter', system-ui, -apple-system, sans-serif;    /* body */
```

**Display (Fraunces):** Hero headlines, page titles, vendor names, prices, section headers.
**Body (Inter):** Everything else.

**Two weights only: 400 regular, 500 medium.** Never 600 or 700 — they read as heavy and out-of-place. The medium weight provides enough emphasis.

**Size scale (desktop):**
- Hero h1: 38px / 500 / letter-spacing -0.02em / line-height 1.08
- Section h2: 24px / 500 / -0.015em
- Vendor name (profile h1): 40px / 500 / -0.02em
- Card title: 14.5–16px / 500
- Price (Fraunces): 17–30px depending on context
- Body: 15–16px / 400 / line-height 1.55
- Meta / captions: 12–13px / 400
- Label (uppercase): 10–11px / 500 / letter-spacing 0.06em / uppercase

**Mobile (≤640px):** drop hero h1 to 28px, section h2 to 20px. Body and small text stay similar.

### Spacing

The design uses two spacing rhythms:
- **Vertical:** rem-based (1rem, 1.5rem, 2rem) for section gaps and major rhythm
- **Component-internal:** pixel-based (8, 12, 16, 24px) for padding and gaps inside cards

Typical paddings:
- Card: 14px (mobile) → 16–22px (desktop)
- Section vertical: 32–40px between sections (28px on mobile)
- Hero padding: 40px top / 28px bottom (desktop), 28/24 on mobile

### Borders and radii

- Default border: `0.5px solid var(--border)`. The 0.5px is deliberate — it renders as a single pixel on most retina displays and looks lighter than 1px.
- Hover border: `var(--border-strong)`.
- Border-radius: 10px (small cards), 12px (standard cards), 14px (pitch blocks), 16px (search bar / modal), 999px (pills and buttons).
- No rounded corners on single-sided borders.

### Shadows

Used sparingly, only on elevation-meaningful elements:
- Search bar: `box-shadow: 0 2px 4px rgba(26,26,26,0.03), 0 12px 32px rgba(26,26,26,0.05);`
- Sticky CTA card (vendor profile): `box-shadow: 0 1px 2px rgba(26,26,26,0.04), 0 4px 16px rgba(26,26,26,0.06);`
- Modal: `box-shadow: 0 24px 64px rgba(26,26,26,0.25);`

Never apply shadows to text, icons, or decorative elements.

---

## 3. Layout

### Container widths

Two nested max-widths, deliberately chosen:

- **Outer container: 1200px** — used for header and footer rows. Padding `0 24px` desktop, `0 16px` mobile.
- **Content column: 820px** — used for hero, search bar, and all section content (category grid, city grid, pitch blocks). This is the "search bar width" everything aligns to.

The hierarchy: header and footer span the page; the content reads as a single ~820px column. Cards never spill past the search bar's right edge.

```css
.container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
.section-head,
.cat-grid,
.city-grid,
.planner-pitch,
.vendor-pitch { max-width: 820px; }
```

### Breakpoints

Three breakpoints, in increasing tightness:

- **≤900px (tablet):** containers narrow to 18px padding, category grid drops from 4 to 3 columns.
- **≤640px (phone):** the main mobile breakpoint. Categories drop to 2 cols, cities to 2 cols, search form becomes a 2×2 grid with full-width search button, hero h1 drops to 28px, primary nav links collapse to just the "List your business" pill.
- **≤380px (small phones):** hide secondary metadata on cards, shrink hero further so nothing overflows on iPhone SE-class screens.

### Grid patterns

Always use CSS Grid for card layouts. The pattern:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(N, 1fr);
  gap: 8px;
}
```

Gap is 8–12px, never wider — tight gaps make the column feel like a structured grid, not loose tiles.

---

## 4. Component patterns

### Card

```html
<a href="..." class="card">
  <div class="card-ic"><i class="ti ti-camera"></i></div>
  <div class="card-name">Photographer</div>
  <div class="card-meta">Wedding · event</div>
</a>
```

```css
.card {
  background: var(--surface);
  border: 0.5px solid var(--border);
  border-radius: 12px;
  padding: 14px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, transform 0.15s;
  display: block;
}
.card:hover {
  border-color: var(--border-strong);
  transform: translateY(-1px);
}
```

**Rules:**
- Whole card is clickable. Never put multiple clickable elements inside.
- Hover: border darkens, slight upward translate (1–2px). No background change.
- Icons in cards use `--accent` for color, 17–20px font-size.
- Card title in Fraunces. Card meta in Inter at 11.5–12px, `--text-subtle`.

### Primary button (pill)

```css
.btn-primary {
  background: var(--accent);
  color: white;
  border: none;
  padding: 11px 20px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.btn-primary:hover { background: var(--accent-hover); }
```

### Secondary button (outlined pill)

```css
.btn-secondary {
  border: 1px solid var(--text);
  background: transparent;
  color: var(--text);
  padding: 9px 18px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 500;
}
.btn-secondary:hover {
  background: var(--text);
  color: var(--bg);
}
```

### CTA button on vendor profile (rectangular, full-width)

Different from the pill — used for the sticky "Request a quote" on profile cards:

```css
.cta-btn {
  background: var(--accent);
  color: white;
  border: none;
  padding: 14px 18px;
  border-radius: 10px;
  width: 100%;
  font-size: 15px;
  font-weight: 500;
}
```

### Chip — multi-select toggle

Used in the registration form for category and language selection. Click toggles the chip on/off. Multiple chips can be active simultaneously. **No chevron** — the chip itself is the action. When selected, a leading checkmark appears.

```css
.chip {
  border: 0.5px solid var(--border-strong);
  background: var(--surface);
  color: var(--text);
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.chip:hover { border-color: var(--text); }
.chip.selected {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}
.chip.selected::before { content: '✓'; font-size: 11px; }
```

Use inside `.chip-grid { display: flex; flex-wrap: wrap; gap: 8px; }`.

### Filter trigger — chip-shaped dropdown opener

Visually similar to a chip but behaves differently: clicking opens a dropdown panel (or modal on mobile) to set the filter value. **The trailing `ti-chevron-down` icon is mandatory** — that's the only thing distinguishing a filter trigger from a multi-select chip. Without it, the click behavior becomes ambiguous to both users and coding agents.

```css
.filter-chip {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--surface);
  border: 0.5px solid var(--border-strong);
  border-radius: 999px;
  padding: 7px 12px 7px 14px;
  font-size: 12.5px; font-weight: 500;
  font-family: inherit;
  color: var(--text);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.filter-chip:hover { border-color: var(--text-subtle); }
.filter-chip i { font-size: 14px; color: var(--text-subtle); }
.filter-chip .val { color: var(--text-muted); font-weight: 400; margin-left: 2px; }
.filter-chip.active {
  background: var(--accent-soft);
  border-color: var(--accent-soft-strong);
  color: var(--accent-deep);
}
.filter-chip.active .val { color: var(--accent); font-weight: 500; }
```

Markup:

```html
<button class="filter-chip active">
  Category <span class="val">Photographer</span>
  <i class="ti ti-chevron-down"></i>
</button>
```

**Rule of thumb:** if the click *sets* a value, it's a chip. If the click *opens* something that sets a value, it's a filter trigger. Different patterns, different markup, never mixed.

### Form input

```css
.input {
  width: 100%;
  border: 0.5px solid var(--border-strong);
  border-radius: 7px;
  padding: 11px 13px;
  font-size: 14px;
  background: var(--bg);
  color: var(--text);
}
.input:focus {
  outline: none;
  border-color: var(--accent);
  background: var(--surface);
}
```

Labels above inputs, 13px / 500. Optional fields marked with a smaller `(optional)` in `--text-subtle`.

### Pitch block (colored)

Used for primary CTAs in body (e.g., planner pitch):

```css
.pitch {
  background: var(--accent-soft);
  border: 0.5px solid var(--accent-soft-strong);
  border-radius: 14px;
  padding: 22px 26px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
}
.pitch h3 { color: var(--accent-deep); font-family: 'Fraunces', serif; }
.pitch p  { color: var(--accent-deep); opacity: 0.85; }
```

**One colored pitch block per page max.** Two starts to feel decorative.

### Pitch block (dashed, secondary)

Used for tertiary CTAs (e.g., vendor invitation):

```css
.pitch-dashed {
  border: 0.5px dashed var(--border-strong);
  border-radius: 14px;
  padding: 18px 26px;
  background: transparent;
}
```

### Trust row

Used below the hero search to communicate product properties — what's true about using the platform, not claims about vendor quality. Two short items per line, each with a Tabler icon.

```html
<div class="trust-row">
  <span><i class="ti ti-mail"></i>Contact directly</span>
  <span><i class="ti ti-lock"></i>No account required</span>
</div>
```

Icons in `--accent`, text in `--text-subtle`, 12.5px. Wraps to 2 lines on mobile.

### Icons

Use **Tabler Icons** (outline only) via the webfont:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.47.0/tabler-icons.min.css">
<i class="ti ti-camera"></i>
```

Never use `-filled` variants — they aren't loaded and render blank. Inherit color from parent; size with `font-size`.

---

## 5. Copy voice

### Headlines

Name things directly. The first words on the page should tell the audience what the product is and who it's for.

**Do:** "Vendors who actually know your wedding, your puja, your baby shower."
**Don't:** "Celebrate. Connect. Create memories."

The first version names three event types from the actual product taxonomy (wedding, puja, baby shower). The second could be on any culture-agnostic site.

### Microcopy

Three patterns to keep:

- **Make product properties visible.** "No account required," "Free to use," "Most vendors reply within 48 hours" — these preempt user questions instead of forcing them to discover answers. Stick to facts about how the platform works, not claims about vendor quality. We do not vouch for vendors; we list them.
- **Honest about scale.** Don't fake counts. If there are 12 vendors in Houston, don't say "12+ verified pros." Say "12 vendors in Houston" or hide the count entirely.
- **Plain English over jargon.** "Request a quote" beats "Submit RFP." "List your business" beats "Become a partner."

### Form copy

- Required fields: just the label. No asterisks, no "(required)."
- Optional fields: small `(optional)` after the label in `--text-subtle`.
- Placeholders: example values ("Bay Area, NJ, Houston…"), not instructions ("Enter your city").
- Submit buttons: state the action ("Send request," "List your business"), never "Submit."

### What not to write

- No "celebrate / connect / journey / unforgettable" abstract verbs.
- No "we are passionate about" or "we believe."
- No "trusted by thousands" claims that aren't true.
- No "vibrant" or "festive" — these are stereotype tells.

---

## 6. Interaction principles

These are product principles that constrain every screen.

- **No login walls in Phase 1.** Browse, plan, inquire, register — all anonymous. Auth is Phase 2.
- **Mobile-first.** 80%+ of traffic will be mobile. Every screen designed at 375px first, scaled up.
- **Email is the engagement channel.** Inquiry replies, registration confirmations, vendor approvals — all email. No push notifications.
- **Anti-circumvention by structural omission.** Vendor email, phone, and website are never rendered on the public profile. They surface only through the inquiry form's masked reply-to mechanism. This is the structural defense against vendors taking leads off-platform — it isn't optional.
- **No vendor-quality claims, badges, or verification marks.** The platform is a directory, not a curator. Do not add "Vetted," "Verified," "Approved," "Recommended," or similar trust stamps to vendor cards or profiles. Users make their own judgment from the vendor's own content (photos, description, pricing). When the product later introduces actual verification (background checks, insurance verification, etc.), badges become honest — until then they're a claim we can't back.

---

## 7. Phase 1 scope reminders

The schema and design docs treat these as the hard boundaries.

### In Phase 1
- Home page with category × city × optional budget search.
- Search results page (city + category landing pages too).
- Vendor profile with photo gallery and inquiry CTA.
- Inquiry form (modal) and success screen.
- Planner: client-side budget calculator with PDF export. No database persistence.
- Vendor registration form (linked from footer initially) and success screen.
- Static pages: About, Privacy, Terms.

### Out of Phase 1 (do not build)
- User accounts or login. Anywhere.
- Reviews, ratings, star displays.
- Saved vendors, comparison shortlists.
- Vendor dashboard / portal.
- In-platform chat, messaging threads, real-time anything.
- Payments, subscriptions, Stripe integration.
- Featured / sponsored listings.
- AI-based recommendations.
- Map view, geosearch.
- Mobile native app.
- Custom search engine (Algolia, Meilisearch).

Anything in the "out" list that gets shipped is a violation of the design contract. If a feature feels essential and is in the "out" list, raise it before building.

---

## 8. Anti-patterns reference

Specific things to refuse if asked to add them in Phase 1:

| Request | Why not |
|---|---|
| "Add a 5-star rating to vendor cards" | Reviews are Phase 2. Showing 0-star or N/A ratings is louder than the absence. |
| "Show vendor phone number on the profile" | Anti-circumvention defense. Contact only via inquiry. |
| "Add a 'Featured Vendor' badge" | Implies monetization (Phase 3) and we don't have inventory to feature. |
| "Add a 'Vetted' or 'Verified' badge to vendor cards" | We are a directory, not a curator. We do not vouch for vendors. See §6. |
| "Sign up to save vendors" | No accounts in Phase 1. |
| "Use a saffron-red gradient on the hero" | Cultural cosplay signal. See §1. |
| "Add a peacock or mandala motif" | Same as above. |
| "Animate the page transitions" | Out of scope; flat aesthetic. |
| "Add a chatbot for instant vendor responses" | Real-time chat is Phase 2. Inquiry handoff via email is sufficient. |

---

## 9. Reference files

When building a new screen, open these first:

- `UX/mockups/home.html` — canonical reference for header, hero, search, card grids, pitch blocks, footer.
- `UX/mockups/vendor-profile.html` — canonical reference for vendor profile layout, gallery placeholders, sticky CTA, inquiry modal.
- `UX/mockups/vendor-registration.html` — canonical reference for multi-step forms, chip multi-select, photo upload zone, step progress indicator, privacy notes, agreement block, success states.
- `UX/mockups/browse.html` — canonical reference for search results: filter triggers, sort dropdown, vendor card grid, pagination, empty state.
- `UX/mockups/planner.html` — canonical reference for tool-style screens: setup card, sticky summary bar, editable item list with live calculation, toast notifications, "add custom item" affordance.

Companion documents under `docs/`:

- `docs/product/Utsav_Yojana_Design.md` — product phasing, architecture, schema strategy.
- `docs/ui/Utsav_Yojana_UI_Spec_Nextjs_Routes.md` — component-level UI spec mapped to Next.js routes.
- `docs/database/Utsav_Yojana_Schema_DDL.md` — annotated PostgreSQL schema.
- `schema.sql` (repo root) — runnable schema for Supabase.

---

## 10. When extending this system

If a new screen needs a component that doesn't exist here:

1. Look at the closest existing pattern in the mockups.
2. Stay within the existing tokens (colors, type, spacing) — do not introduce new colors or fonts.
3. Match the existing radii, border weights, and shadow vocabulary.
4. Keep flat. If a design temptation involves a gradient, glow, or decorative flourish, that's a smell.
5. Write copy in the voice from §5 — specific, warm, plain.
6. When in doubt, ask: *would Allbirds put this on their page?* If no, reconsider.
