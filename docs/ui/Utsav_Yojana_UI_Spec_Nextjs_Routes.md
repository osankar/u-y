# Utsav Yojana
## Component-Level UI Spec Mapped to Next.js Routes (MVP)

Version: 1.0  
Date: 2026-05-15  
Framework: Next.js App Router + TypeScript

## 1. Route Map
```text
app/
  (public)/
    page.tsx                                  -> Home
    vendors/
      page.tsx                                -> Vendor Search Results
      [slug]/
        page.tsx                              -> Vendor Profile
    templates/
      page.tsx                                -> Planning Templates List
      [eventType]/
        page.tsx                              -> Template Detail / Start Plan
    seo/
      [category]/
        [state]/
          [city]/
            page.tsx                          -> SEO Landing Page
    for-providers/
      page.tsx                                -> Provider Onboarding Intro
  (authenticated)/
    my-plan/
      page.tsx                                -> User Plans Dashboard
      [planId]/
        page.tsx                              -> Plan Detail
    inquiries/
      page.tsx                                -> User Inquiry List
    account/
      page.tsx                                -> User Account/Profile
  provider/
    dashboard/
      page.tsx                                -> Provider Lead Dashboard
    profile/
      page.tsx                                -> Provider Editable Profile
  admin/
    providers/
      pending/
        page.tsx                              -> Moderation Queue
      [providerId]/
        page.tsx                              -> Moderation Detail
```

## 2. Shared Layout and Shell
### 2.1 `app/layout.tsx`
Responsibilities:
- Global providers (auth, analytics, query client if used)
- Global CSS variables and typography
- Toaster/notification container

Components:
- `AppProviders`
- `GlobalToaster`

### 2.2 `components/layout/MainHeader.tsx`
Props:
- `isAuthenticated: boolean`
- `userRole?: 'user' | 'provider_owner' | 'admin'`

Behavior:
- Public links: Vendors, Templates, For Providers
- Authenticated links: My Plan, Inquiries, Account
- Role-based link visibility for Provider Dashboard and Admin

### 2.3 `components/layout/MainFooter.tsx`
Links:
- Terms, Privacy, Contact

## 3. Route Specs
## 3.1 Home
Route: `app/(public)/page.tsx`

Top-level composition:
- `MainHeader`
- `HeroDualCTA`
- `QuickSearchBar`
- `PopularCategoriesGrid`
- `HowItWorks`
- `TrustSignalsStrip`
- `MainFooter`

Components:
1. `HeroDualCTA`
- Props: `title`, `subtitle`, `primaryCta`, `secondaryCta`
- Actions:
  - Primary -> `/vendors`
  - Secondary -> `/templates`

2. `QuickSearchBar`
- Props:
  - `categories: CategoryOption[]`
  - `defaultCityState?: string`
- Emits:
  - `onSearch({ category, city, state, budgetMin, budgetMax })`
- Navigation target:
  - `/vendors?category=...&city=...&state=...&budgetMin=...&budgetMax=...`

3. `PopularCategoriesGrid`
- Props: `items: { name; slug; imageUrl }[]`
- Click target:
  - `/vendors?category={slug}`

4. `TrustSignalsStrip`
- Static MVP content:
  - Verified profiles
  - Transparent sponsored labels
  - Community-focused vendor discovery

Analytics events:
- `home_cta_clicked`
- `home_quick_search_submitted`
- `home_category_clicked`

## 3.2 Vendor Search Results
Route: `app/(public)/vendors/page.tsx`

Top-level composition:
- `MainHeader`
- `SearchAndFilterShell`
- `VendorResultsList`
- `PaginationControls` (or infinite scroll)

Components:
1. `SearchAndFilterShell`
- Props:
  - `initialFilters`
  - `categories`
- Children:
  - `FilterPanelDesktop`
  - `FilterBottomSheetMobile`
  - `ResultsToolbar`

2. `FilterPanelDesktop` / `FilterBottomSheetMobile`
- Controls:
  - category
  - city/state
  - budget min/max
  - verified-only toggle
- Emits:
  - `onFiltersChange(filters)`

3. `VendorCard`
- Props:
  - `vendor: VendorCardViewModel`
  - `isSaved: boolean`
  - `isCompared: boolean`
- Fields:
  - cover image
  - business name
  - category tags
  - city/state
  - starting price
  - badges (`Verified`, `Sponsored`)
- Actions:
  - `View Profile` -> `/vendors/{slug}`
  - `Save`
  - `Compare`
  - `Send Inquiry` (opens modal or routes to profile inquiry section)

4. `VendorResultsList`
- Props:
  - `items: VendorCardViewModel[]`
  - `loading`
  - `error`
- States:
  - skeleton
  - empty
  - error with retry

Analytics:
- `vendors_filters_changed`
- `vendors_result_clicked`
- `vendors_save_clicked`
- `vendors_compare_clicked`
- `vendors_inquiry_clicked`

## 3.3 Vendor Profile
Route: `app/(public)/vendors/[slug]/page.tsx`

Top-level composition:
- `MainHeader`
- `VendorProfileHero`
- `VendorProfileSections`
- `StickyInquiryBarMobile`

Components:
1. `VendorProfileHero`
- Props:
  - `vendor: VendorProfileViewModel`
- Includes:
  - media carousel
  - name, badges
  - location, service radius
  - pricing summary
  - primary CTA `Send Inquiry`
  - secondary CTAs `Save`, `Compare`

2. `VendorProfileSections`
- Subcomponents:
  - `AboutSection`
  - `ServicesSection`
  - `PricingSection`
  - `ReviewsSection`
  - `FaqSection`
  - `SimilarVendorsSection`

3. `InquiryDrawer` or `InquiryModal`
- Props:
  - `providerId`
  - `prefill?: { planId, eventType, guestCount, budget }`
- Submit action:
  - POST `/api/inquiries`

Analytics:
- `vendor_profile_viewed`
- `vendor_gallery_interacted`
- `vendor_inquiry_started`
- `vendor_inquiry_submitted`

## 3.4 Templates List
Route: `app/(public)/templates/page.tsx`

Composition:
- `MainHeader`
- `EventTypeTabs`
- `TemplateCardsGrid`

Components:
1. `EventTypeTabs`
- Props:
  - `eventTypes: EventType[]`
  - `activeType`
- On change:
  - route update with search param or route segment

2. `TemplateCard`
- Props:
  - `template: TemplateSummary`
- Action:
  - `Use Template` -> `/templates/{eventType}?templateId={id}`

Analytics:
- `template_list_viewed`
- `template_selected`

## 3.5 Template Detail / Start Plan
Route: `app/(public)/templates/[eventType]/page.tsx`

Composition:
- `MainHeader`
- `TemplateOverview`
- `BudgetAllocationTable`
- `StartPlanCTA`

Components:
1. `BudgetAllocationTable`
- Props:
  - `items: TemplateItem[]`
- Editable fields:
  - estimated cost
  - include/exclude item

2. `StartPlanCTA`
- Action:
  - If unauthenticated: auth gate then continue
  - Create plan -> redirect `/my-plan/{planId}`

Analytics:
- `template_detail_viewed`
- `template_item_updated`
- `plan_created_from_template`

## 3.6 My Plan Dashboard
Route: `app/(authenticated)/my-plan/page.tsx`

Composition:
- `AuthGuard`
- `MainHeader`
- `PlanSummaryCards`
- `PlanListTable`

Components:
1. `PlanSummaryCards`
- Metrics:
  - active plans
  - total estimated spend
  - inquiries sent

2. `PlanListTable`
- Columns:
  - plan name, event date, budget, status, actions
- Action:
  - view -> `/my-plan/{planId}`

Analytics:
- `my_plan_dashboard_viewed`
- `my_plan_opened`

## 3.7 Plan Detail
Route: `app/(authenticated)/my-plan/[planId]/page.tsx`

Composition:
- `AuthGuard`
- `MainHeader`
- `PlanHeader`
- `BudgetProgressBar`
- `PlanItemsChecklist`
- `ShortlistedVendorsPanel`
- `InquiryTrackerPanel`

Components:
1. `PlanItemsChecklist`
- Props:
  - `items: PlanItemViewModel[]`
- Actions:
  - mark status
  - attach selected provider
  - launch inquiry prefilled by plan item

2. `InquiryTrackerPanel`
- Displays inquiry statuses by provider

Analytics:
- `plan_detail_viewed`
- `plan_item_status_changed`
- `inquiry_started_from_plan`

## 3.8 User Inquiries
Route: `app/(authenticated)/inquiries/page.tsx`

Composition:
- `AuthGuard`
- `MainHeader`
- `InquiryList`
- `InquiryThreadPreview`

Components:
1. `InquiryList`
- Columns:
  - provider, event date, budget, status, last update

2. `InquiryThreadPreview`
- Shows thread if messaging enabled for phase; read-only in MVP optional

Analytics:
- `user_inquiries_viewed`

## 3.9 Provider Onboarding
Route: `app/(public)/for-providers/page.tsx`

Composition:
- `MainHeader`
- `ProviderOnboardingIntro`
- `ProviderOnboardingStepper`

Stepper steps:
1. Account
2. Business details
3. Services/categories
4. Locations
5. Media
6. Submit for approval

Components:
1. `ProviderOnboardingStepper`
- Props:
  - `draftProviderId?`
  - `initialStep`
- Persist drafts between steps

2. `ProfileCompletenessMeter`
- Shows readiness and required missing fields

Analytics:
- `provider_onboarding_started`
- `provider_onboarding_step_completed`
- `provider_onboarding_submitted`

## 3.10 Provider Dashboard
Route: `app/provider/dashboard/page.tsx`

Composition:
- `ProviderGuard`
- `ProviderDashboardSummary`
- `ProviderInquiryTable`

Components:
1. `ProviderDashboardSummary`
- Metrics:
  - inquiries last 30 days
  - response rate
  - avg response time

2. `ProviderInquiryTable`
- Actions:
  - mark viewed/responded/closed

Analytics:
- `provider_dashboard_viewed`
- `provider_inquiry_status_updated`

## 3.11 Provider Profile Editor
Route: `app/provider/profile/page.tsx`

Composition:
- `ProviderGuard`
- `ProviderProfileEditor`

Subforms:
- business info
- categories/services
- locations
- media

Analytics:
- `provider_profile_updated`

## 3.12 Admin Moderation Queue
Route: `app/admin/providers/pending/page.tsx`

Composition:
- `AdminGuard`
- `ModerationQueueTable`

Components:
1. `ModerationQueueTable`
- Columns:
  - provider name, submitted at, completeness, risk flags
- Action:
  - open detail `/admin/providers/{providerId}`

Analytics:
- `admin_moderation_queue_viewed`

## 3.13 Admin Moderation Detail
Route: `app/admin/providers/[providerId]/page.tsx`

Composition:
- `AdminGuard`
- `ProviderReviewPanel`
- `ModerationActionBar`

Actions:
- approve
- reject (with reason)
- request changes
- suspend

All actions write `audit_log`.

Analytics:
- `admin_provider_approved`
- `admin_provider_rejected`
- `admin_provider_change_requested`

## 4. API Contracts (UI-facing)
Use typed view models between server and client.

## 4.1 Core View Models
```ts
type VendorCardViewModel = {
  id: string;
  slug: string;
  businessName: string;
  categories: string[];
  city: string;
  state: string;
  startingPrice?: number;
  currencyCode: 'USD';
  isVerified: boolean;
  isSponsored: boolean;
  coverImageUrl?: string;
  responseRate?: number;
};

type VendorProfileViewModel = VendorCardViewModel & {
  description?: string;
  serviceRadiusMiles?: number;
  gallery: { url: string; alt?: string }[];
  services: { name: string; description?: string; startingPrice?: number }[];
  reviews: { rating: number; text?: string; createdAt: string }[];
};
```

## 4.2 Error Contract
```ts
type ApiError = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
};
```

## 5. Guards and Access Control in UI
Required wrappers/components:
- `AuthGuard` for authenticated routes
- `ProviderGuard` for provider-owner routes
- `AdminGuard` for admin-only routes

Behavior:
- Unauthenticated -> redirect to sign-in with return URL.
- Unauthorized -> show 403 page and report event.

## 6. Accessibility and Responsive Requirements
- Minimum tap target: 44x44px.
- Full keyboard navigation support.
- WCAG AA color contrast.
- Form errors linked to fields with `aria-describedby`.
- Mobile-first filter and inquiry interactions via bottom sheets.

## 7. Suggested Component Folder Structure
```text
components/
  layout/
  search/
  vendor/
  planner/
  inquiry/
  provider/
  admin/
  analytics/
  guards/
```

## 8. MVP Build Order (UI)
1. Home + vendor results + vendor profile + inquiry modal
2. Templates list/detail + plan creation
3. My Plan dashboard/detail
4. Provider onboarding + provider dashboard
5. Admin moderation views

