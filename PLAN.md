# AffiliMate - Implementation Plan

## Overview

Geo-targeted affiliate creative serving API. Returns the best affiliate link/banner based on location, placement, category, and size.

---

## CONTINUE FROM HERE (New Chat)

**Current state**: M3 Complete - All milestones finished
**Production URL**: https://affilimate.vercel.app/

**Completed features**:
- Test Placement page at `/test` to preview serve responses with debug info
- Snippet parser extracted to `/apps/web/src/lib/snippet-parser.ts`
- Import API endpoint at `/api/admin/creatives/import` with `creative_imports` table storage
- Import page with 3-step wizard: Configure -> Preview -> Complete
- Auto-detect image dimensions during import preview
- Integration examples in README (JavaScript, React, Node.js)
- "For AI Assistants" section in README

**To start a new chat, say**:
> "Continue building AffiliMate. M3 is complete. The app is live at https://affilimate.vercel.app/. See PLAN.md and README.md for details."

**Dev server commands**:
```bash
cd /Users/daltonwalsh/dev/personal/AffiliMate
supabase start      # Start local Supabase (if not running)
pnpm dev            # Start Next.js dev server
```

**Local URLs**:
- App: http://localhost:3000
- Supabase Studio: http://localhost:54323

---

## Status

| Milestone | Status | Notes |
|-----------|--------|-------|
| M0: Scaffolding | Complete | Monorepo, DB schema, Auth, Layout |
| M1: Admin CRUD | Complete | Placements, Offers, Creatives, Rules, API Keys |
| M2: Serve Endpoint | Complete | API key validation, geo detection, selection algorithm |
| M3: Import + Polish | Complete | Import wizard, Test page, integration docs |

---

## M0: Scaffolding (Days 1-3)

- [x] Initialize Turborepo + pnpm monorepo
- [ ] Create Supabase project + save credentials to `.env.local`
- [x] Create initial migration with all tables + RLS policies
- [x] Set up `/packages/types` with TypeScript interfaces
- [x] Set up `/packages/db` with Supabase client
- [x] Create Next.js 16 app structure
- [x] Set up Supabase Auth (login/logout)
- [x] Basic layout with sidebar nav
- [x] Placeholder serve endpoint `/api/v1/serve`

---

## M1: Admin CRUD (Days 4-9) - COMPLETE

### Phase 1: Setup shadcn/ui & TanStack Query
- [x] Initialize shadcn/ui with Tailwind 4 compatibility
- [x] Install components: button, input, select, textarea, badge, table, dialog, dropdown-menu, alert-dialog, sonner
- [x] Create `providers/query-provider.tsx` with TanStack Query
- [x] Add provider to root layout with Toaster

### Phase 2: Project Auto-Creation
- [x] Auto-create project on first dashboard visit (`/api/admin/projects`)
- [x] Store current project_id in React context (`providers/project-provider.tsx`)

### Phase 3: Placements CRUD
- [x] API Routes: `/api/admin/placements/route.ts` and `[id]/route.ts`
- [x] Hooks: `use-placements.ts` with usePlacements, useCreate, useUpdate, useDelete
- [x] Components: data-table.tsx, delete-dialog.tsx, placement-form.tsx, columns.tsx
- [x] Page with data table, create/edit modal, delete confirmation

### Phase 4: Offers CRUD
- [x] API Routes, Hooks, Components (same pattern)
- [x] Page with network filter (Awin, ShareASale, CJ, Direct)

### Phase 5: Creatives CRUD
- [x] API Routes, Hooks, Components (same pattern)
- [x] Page with image preview, offer/size filters, creative-preview.tsx

### Phase 6: Targeting Rules CRUD
- [x] API Routes, Hooks, Components (same pattern)
- [x] Page with country multi-select, priority input, placement filter

### Phase 7: API Keys Management
- [x] API Routes: GET list, POST create (returns full key ONCE), DELETE revoke
- [x] Key generation utility (`lib/api-key-utils.ts`)
- [x] Page with key-display.tsx (copy-once modal), show prefix only

---

## M2: Serve Endpoint (Days 10-13) - COMPLETE

### Phase 1: API Key Validation
- [x] Create `lib/auth.ts` with `validateApiKey(key: string)` function
- [x] Hash incoming key and compare against `api_keys.key_hash`
- [x] Check `is_active` and `expires_at`
- [x] Update `last_used_at` on successful validation
- [x] Return project_id for subsequent queries

### Phase 2: Geo Detection
- [x] Geo detection already implemented in serve endpoint
- [x] Check sources in order: `?country=` param > `x-vercel-ip-country` header > `cf-ipcountry` header
- [x] Return `{ country: string | null, source: string }`

### Phase 3: Selection Algorithm
- [x] Create `lib/selection.ts` with `selectCreative(params)` function
- [x] Query `targeting_rules` matching: placement_id, country (or empty), category (or empty)
- [x] Filter by `is_active` rules with `is_active` creatives
- [x] Sort by priority DESC, then weighted random selection among equal priority
- [x] Return creative with click_url, image_url, dimensions, format

### Phase 4: Update Serve Endpoint
- [x] Update `/api/v1/serve/route.ts` to use real logic
- [x] Validate API key from `X-API-Key` header
- [x] Get placement by slug, detect geo, run selection
- [x] Handle fallbacks (placement.fallback_type: 'url', 'creative', 'none')
- [x] Add `Cache-Control: public, max-age=60` header
- [x] Add CORS headers for all origins

### Phase 5: Debug Mode & Testing
- [x] Add `?debug=true` param to include: rules_matched, selection_reason
- [x] Create "Test Placement" page in admin to preview serve responses
- [x] Test with curl

---

## M3: Import + Polish (Days 14-18)

- [x] HTML snippet parser (extract href, src, width, height from Awin snippets)
- [x] Import wizard UI (select offer -> paste snippets -> preview -> confirm)
- [x] `/api/admin/creatives/import` endpoint
- [x] Store raw HTML in `creative_imports`
- [x] Empty states, loading states, error toasts
- [x] Auto-detect image dimensions (client-side via naturalWidth/naturalHeight)
- [x] Integration examples (JavaScript, React, Node.js in README)

---

## Local Development Setup

### Prerequisites
- Docker Desktop running
- Node.js 20+
- pnpm

### Quick Start
```bash
# 1. Start local Supabase (first time takes ~2 mins to pull images)
supabase start

# 2. Start Next.js dev server
pnpm dev

# 3. Open app at http://localhost:3000
# 4. Open Supabase Studio at http://localhost:54323
```

### Useful Commands
```bash
supabase start      # Start local Supabase
supabase stop       # Stop local Supabase
supabase db reset   # Reset DB and rerun migrations
supabase status     # Show local service URLs and keys
```

### Local URLs
- **App**: http://localhost:3000
- **Supabase API**: http://127.0.0.1:54321
- **Supabase Studio**: http://127.0.0.1:54323
- **Inbucket (email testing)**: http://127.0.0.1:54324

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Monorepo**: pnpm + Turborepo
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password)
- **Hosting**: Vercel (Hobby tier)

---

## Key Files

### Database & Types
| File | Purpose |
|------|---------|
| `/supabase/migrations/20241216000000_initial_schema.sql` | Full DB schema with RLS |
| `/packages/types/src/database.ts` | DB entity types (Project, Placement, Offer, Creative, etc.) |
| `/packages/types/src/api.ts` | API request/response types |
| `/packages/db/src/server.ts` | Supabase server client (createClient, createAdminClient) |

### Providers & Layout
| File | Purpose |
|------|---------|
| `/apps/web/src/providers/query-provider.tsx` | TanStack Query setup |
| `/apps/web/src/providers/project-provider.tsx` | Project context (auto-creates project) |
| `/apps/web/src/app/layout.tsx` | Root layout with QueryProvider + Toaster |
| `/apps/web/src/app/(dashboard)/layout.tsx` | Dashboard layout with ProjectProvider + Sidebar |

### Admin API Routes
| File | Purpose |
|------|---------|
| `/apps/web/src/app/api/admin/projects/route.ts` | GET/auto-create user's project |
| `/apps/web/src/app/api/admin/placements/route.ts` | GET list, POST create |
| `/apps/web/src/app/api/admin/placements/[id]/route.ts` | GET, PUT, DELETE |
| `/apps/web/src/app/api/admin/offers/...` | Same pattern |
| `/apps/web/src/app/api/admin/creatives/...` | Same pattern |
| `/apps/web/src/app/api/admin/rules/...` | Same pattern |
| `/apps/web/src/app/api/admin/api-keys/...` | GET, POST, DELETE (no PUT) |

### React Query Hooks
| File | Purpose |
|------|---------|
| `/apps/web/src/hooks/use-placements.ts` | usePlacements, useCreate, useUpdate, useDelete |
| `/apps/web/src/hooks/use-offers.ts` | Same pattern |
| `/apps/web/src/hooks/use-creatives.ts` | Same pattern |
| `/apps/web/src/hooks/use-rules.ts` | Same pattern |
| `/apps/web/src/hooks/use-api-keys.ts` | useApiKeys, useCreate, useDelete |

### Reusable Components
| File | Purpose |
|------|---------|
| `/apps/web/src/components/data-table.tsx` | Generic TanStack Table wrapper |
| `/apps/web/src/components/delete-dialog.tsx` | Reusable delete confirmation |
| `/apps/web/src/components/ui/*.tsx` | shadcn/ui components |

### Utilities
| File | Purpose |
|------|---------|
| `/apps/web/src/lib/api-key-utils.ts` | generateApiKey(), hashApiKey() |
| `/apps/web/src/lib/utils.ts` | cn() helper for classnames |

### Serve Endpoint (M2)
| File | Purpose |
|------|---------|
| `/apps/web/src/app/api/v1/serve/route.ts` | Public serve API (placeholder, needs M2) |
| `/apps/web/src/lib/auth.ts` | API key validation (TODO) |
| `/apps/web/src/lib/geo.ts` | Geo detection (TODO) |
| `/apps/web/src/lib/selection.ts` | Creative selection algorithm (TODO) |

---

## API Quick Reference

### Serve Endpoint
```
GET /api/v1/serve?placement={slug}&country={CC}&category={cat}&size={WxH}
Header: X-API-Key: am_live_xxxxx
```

### Response
```json
{
  "creative": {
    "click_url": "https://www.awin1.com/cread.php?...",
    "image_url": "https://www.awin1.com/cshow.php?...",
    "alt_text": "Shop now",
    "width": 300,
    "height": 250,
    "format": "banner"
  },
  "fallback": false,
  "geo": { "country": "GB", "source": "vercel-header" }
}
```

---

## Architecture Notes

### API Route Pattern
All admin routes follow this pattern:
```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

const { data: project } = await supabase
  .from('projects').select('id').eq('owner_id', user.id).single();
// Then query using project.id
```

### React Query Hook Pattern
```typescript
export function useXxx() {
  return useQuery({ queryKey: ['xxx'], queryFn: fetchXxx });
}
export function useCreateXxx() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createXxx,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['xxx'] }),
  });
}
```

### Page Component Pattern
All CRUD pages use:
- `useProject()` for project context
- Entity hooks for data fetching/mutations
- `useState` for modal state (formOpen, deleteOpen, selectedItem)
- `DataTable` + `getColumns()` for table rendering
- Entity-specific form component for create/edit
- `DeleteDialog` for delete confirmation
- `toast` from sonner for success/error messages

### Database (via Supabase RLS)
- All tables have `project_id` column
- RLS policies restrict access to owner's projects only
- API keys store `key_hash` (SHA256), never plaintext

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2024-12-16 | Single app (not separate admin) | Faster to build for 2-4 week timeline |
| 2024-12-16 | Next.js 16 | Latest version |
| 2024-12-16 | Supabase over Neon | Already familiar, RLS built-in |
| 2024-12-16 | No click tracking in MVP | Simplicity, Awin handles tracking |
| 2024-12-16 | shadcn/ui + Tailwind 4 | Modern component library with CSS-first config |
| 2024-12-16 | TanStack Query for data | Automatic caching, refetching, mutations |
| 2024-12-16 | Project auto-creation | Simplifies UX, user always has a project |
