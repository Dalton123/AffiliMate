# AffiliMate

Geo-targeted affiliate creative serving API. Returns the best affiliate link/banner based on visitor location, placement, category, and size.

---

## The Problem

Developers with global audiences lose affiliate revenue because:

- **Region-specific links** - Amazon US links don't earn commissions from UK visitors
- **Manual management** - Swapping affiliate links per region is tedious and error-prone
- **Geo-restrictions** - Some affiliate programs only pay for specific countries
- **Lost conversions** - Showing irrelevant regional offers hurts click-through rates

Most developers either ignore international traffic or maintain complex conditional logic that breaks when they add new regions.

---

## The Solution

AffiliMate is an API that automatically serves the right affiliate creative based on visitor location. One integration, all regions - add new regional offers through the dashboard without touching code.

---

## Why AffiliMate?

- **Automatic geo-targeting** - Detects visitor country from IP and serves matching offers
- **One integration, all regions** - Add UK, EU, or any regional offers without code changes
- **Smart fallbacks** - Never show empty ad slots with configurable fallback creatives or URLs
- **Priority & weight system** - Fine-grained control over which ads show and when
- **Works with any network** - Awin, ShareASale, CJ, Amazon Associates, or direct deals
- **Developer-friendly** - Simple REST API with debug mode for testing

---

## How Geo-Targeting Works

**Automatic Location Detection:**
1. `?country=XX` query param (explicit override for testing)
2. Vercel's `x-vercel-ip-country` header (automatic on Vercel)
3. Cloudflare's `cf-ipcountry` header (automatic behind Cloudflare)

**Smart Rule Hierarchy:**
- Create **region-specific rules** targeting `['US']`, `['GB']`, etc.
- Create **global fallback rules** with empty countries (matches any location)
- Higher priority rules always win - use priority 80 for regional, priority 10 for global

**Example Flow:**
```
US visitor → matches "Amazon US" rule (priority 80) → shows amazon.com link
UK visitor → matches "Amazon UK" rule (priority 80) → shows amazon.co.uk link
Unknown country → no regional match → matches "Generic" rule (priority 10) → shows default offer
No rules match → placement fallback kicks in → shows backup creative or URL
```

---

## Use Cases

- **Tech review sites** - Show Amazon affiliate links for the visitor's country
- **Travel blogs** - Display regional Booking.com or Expedia offers
- **SaaS tools pages** - Promote software deals relevant to the visitor's market
- **Finance blogs** - Country-specific credit card or banking offers
- **Any site with global traffic** - Stop leaving money on the table from international visitors

---

## Live Demo

**Production**: https://affilimate.vercel.app/

---

## Quick Start

### Prerequisites

- Docker Desktop (for local Supabase)
- Node.js 20+
- pnpm

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start local Supabase (first time takes ~2 mins)
supabase start

# 3. Start the dev server
pnpm dev
```

### Local URLs

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| Supabase Studio | http://localhost:54323 |
| Email Testing (Mailpit) | http://localhost:54324 |

---

## Getting Started

### Step 1: Create an Offer

Go to **Offers** and create an offer for your affiliate program (e.g., Awin, ShareASale).

### Step 2: Import Creatives

Go to **Import** and paste Awin HTML snippets. The wizard will:
- Parse click URLs and image URLs
- Auto-detect image dimensions
- Preview before importing

### Step 3: Create a Placement

Go to **Placements** and create a placement for where ads appear (e.g., `sidebar`, `header-banner`).

### Step 4: Create Targeting Rules

Go to **Rules** and link creatives to placements with optional country/category targeting.

### Step 5: Generate an API Key

Go to **API Keys** and create a key. Save it securely - it's only shown once.

### Step 6: Test Your Setup

Go to **Test** to preview serve responses before integrating.

### Step 7: Integrate

Use the Serve API in your website/app (see Integration Examples below).

---

## Admin Dashboard

### 1. Placements

Define where ads will appear on your site. Each placement has:
- **Name** - Human-readable label
- **Slug** - URL identifier (e.g., `homepage-sidebar`)
- **Default Size** - Preferred dimensions (e.g., `300x250`)
- **Fallback** - What to show if no creative matches (another creative, a URL, or nothing)

### 2. Offers

Represent affiliate programs/advertisers:
- **Name** - Offer name
- **Network** - Awin, ShareASale, CJ, or Direct
- **Category** - For filtering (e.g., `travel`, `finance`)
- **Advertiser** - Company name and ID

### 3. Creatives

The actual banners/links to display:
- **Offer** - Which offer this creative belongs to
- **Click URL** - Affiliate tracking link
- **Image URL** - Banner image
- **Dimensions** - Width x Height
- **Format** - Banner, text, or native
- **Date Range** - Optional start/end dates

### 4. Targeting Rules

Control which creatives show where:
- **Placement** - Which placement this rule applies to
- **Creative** - Which creative to potentially show
- **Countries** - Limit to specific countries (empty = all)
- **Categories** - Limit to specific categories (empty = all)
- **Priority** - Higher priority rules are preferred (0-100)
- **Weight** - For random selection among equal-priority rules (1-100)

### 5. API Keys

Generate keys to authenticate API requests:
- Keys are shown **once** on creation - save them securely
- Keys can have expiration dates
- Revoke keys anytime by deleting them

### 6. Import Creatives

Bulk import from affiliate networks:
- Paste HTML snippets (supports multi-line Awin format)
- Auto-detects image dimensions from preview
- Preview all creatives before confirming
- Optionally auto-create targeting rules during import

### 7. Test Placement

Preview serve responses before integration:
- Select placement and enter API key
- Set country/category/size filters
- See which creative would be served
- View debug info (rules matched, selection reason)

---

## Serve API

### Endpoint

```
GET /api/v1/serve
```

### Authentication

Pass your API key via the `X-API-Key` header:

```bash
curl -H "X-API-Key: am_live_xxxxx" "https://affilimate.vercel.app/api/v1/serve?placement=sidebar"
```

### Query Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `placement` | Yes | Placement slug (e.g., `homepage-sidebar`) |
| `country` | No | 2-letter ISO country code override (e.g., `US`, `GB`) |
| `category` | No | Filter by category |
| `size` | No | Filter by size (e.g., `300x250`) |
| `format` | No | Filter by format (`banner`, `text`, `native`) |
| `debug` | No | Set to `true` for debug info |

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
  "geo": {
    "country": "GB",
    "source": "vercel-header"
  }
}
```

When no creative matches:

```json
{
  "creative": null,
  "fallback": true,
  "fallback_type": "none",
  "geo": {
    "country": "US",
    "source": "param"
  }
}
```

### Debug Mode

Add `?debug=true` for selection details:

```json
{
  "creative": { ... },
  "fallback": false,
  "geo": { ... },
  "debug": {
    "rules_matched": 3,
    "selection_reason": "Selected \"Summer Sale Banner\" (priority: 80, weight: 50/100)"
  }
}
```

### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `missing_parameter` | `placement` parameter is required |
| 401 | `missing_api_key` | No API key provided |
| 401 | `invalid_api_key` | API key not found or malformed |
| 401 | `api_key_expired` | API key has expired |
| 401 | `api_key_inactive` | API key has been revoked |
| 404 | `placement_not_found` | Placement slug doesn't exist |

### Geo Detection

Country is detected automatically from:
1. `?country=XX` query param (manual override)
2. `x-vercel-ip-country` header (Vercel deployment)
3. `cf-ipcountry` header (Cloudflare)

### Caching

Responses include cache headers:
```
Cache-Control: public, max-age=60, stale-while-revalidate=300
```

---

## Integration Examples

### JavaScript (Browser)

```javascript
async function getAffiliateAd(placement) {
  const res = await fetch(
    `https://affilimate.vercel.app/api/v1/serve?placement=${placement}`,
    { headers: { 'X-API-Key': 'am_live_xxxxx' } }
  );
  const data = await res.json();

  if (data.creative) {
    return `<a href="${data.creative.click_url}" target="_blank" rel="sponsored">
      <img src="${data.creative.image_url}"
           width="${data.creative.width}"
           height="${data.creative.height}"
           alt="${data.creative.alt_text || ''}" />
    </a>`;
  }
  return null;
}

// Usage
const adHtml = await getAffiliateAd('sidebar');
if (adHtml) {
  document.getElementById('ad-container').innerHTML = adHtml;
}
```

### React Component

```jsx
import { useState, useEffect } from 'react';

function AffiliateAd({ placement }) {
  const [creative, setCreative] = useState(null);

  useEffect(() => {
    fetch(`https://affilimate.vercel.app/api/v1/serve?placement=${placement}`, {
      headers: { 'X-API-Key': process.env.NEXT_PUBLIC_AFFILIMATE_KEY }
    })
      .then(res => res.json())
      .then(data => setCreative(data.creative));
  }, [placement]);

  if (!creative) return null;

  return (
    <a href={creative.click_url} target="_blank" rel="sponsored noopener">
      <img
        src={creative.image_url}
        width={creative.width}
        height={creative.height}
        alt={creative.alt_text || ''}
      />
    </a>
  );
}

// Usage
<AffiliateAd placement="sidebar" />
```

### Server-Side (Node.js)

```javascript
async function getCreative(placement, country) {
  const url = new URL('https://affilimate.vercel.app/api/v1/serve');
  url.searchParams.set('placement', placement);
  if (country) url.searchParams.set('country', country);

  const res = await fetch(url, {
    headers: { 'X-API-Key': process.env.AFFILIMATE_API_KEY }
  });

  return res.json();
}

// Usage in API route or server component
const { creative, geo } = await getCreative('sidebar', 'GB');
```

---

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **UI**: shadcn/ui + Tailwind CSS 4
- **Data Fetching**: TanStack Query
- **Monorepo**: pnpm + Turborepo

---

## Project Structure

```
apps/
  web/                    # Next.js application
    src/
      app/
        api/v1/serve/     # Public serve API
        api/admin/        # Admin CRUD APIs
        (dashboard)/      # Admin dashboard pages
      lib/
        auth.ts           # API key validation
        selection.ts      # Creative selection algorithm
        snippet-parser.ts # Awin HTML parser
packages/
  types/                  # Shared TypeScript types
  db/                     # Supabase client
supabase/
  migrations/             # Database schema
  config.toml             # Local Supabase config
```

---

## For AI Assistants

Quick reference for understanding this codebase:

### Key Files

| File | Purpose |
|------|---------|
| `/apps/web/src/app/api/v1/serve/route.ts` | Public serve API endpoint |
| `/apps/web/src/lib/selection.ts` | Creative selection algorithm |
| `/apps/web/src/lib/auth.ts` | API key validation |
| `/apps/web/src/lib/snippet-parser.ts` | Awin HTML snippet parser |
| `/packages/types/src/database.ts` | Database entity types |
| `/packages/types/src/api.ts` | API request/response types |
| `/supabase/migrations/*.sql` | Database schema |

### Architecture

- **Next.js 15 App Router** with API routes
- **Supabase** for PostgreSQL database + Auth
- **Row Level Security (RLS)** - all tables filtered by project_id
- **TanStack Query** for data fetching in React components

### Patterns

- Admin API routes at `/api/admin/*` use Supabase session auth
- Public serve API uses API key auth (`X-API-Key` header)
- React hooks in `/hooks/use-*.ts` wrap TanStack Query
- All CRUD follows same pattern: `route.ts`, `[id]/route.ts`, hook, form component

### Database Schema

Main tables: `projects`, `placements`, `offers`, `creatives`, `targeting_rules`, `api_keys`, `creative_imports`

All tables have `project_id` column with RLS policies restricting access to the owner's projects.
