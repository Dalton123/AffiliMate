# AffiliMate

Geo-targeted affiliate creative serving API. Returns the best affiliate link/banner based on visitor location, placement, category, and size.

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

---

## Serve API

### Endpoint

```
GET /api/v1/serve
```

### Authentication

Pass your API key via the `X-API-Key` header:

```bash
curl -H "X-API-Key: am_live_xxxxx" "https://your-app.com/api/v1/serve?placement=sidebar"
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

### Example Usage

```bash
# Basic request
curl -H "X-API-Key: am_live_xxxxx" \
  "http://localhost:3000/api/v1/serve?placement=sidebar"

# With country override
curl -H "X-API-Key: am_live_xxxxx" \
  "http://localhost:3000/api/v1/serve?placement=sidebar&country=GB"

# With filters and debug
curl -H "X-API-Key: am_live_xxxxx" \
  "http://localhost:3000/api/v1/serve?placement=sidebar&size=300x250&debug=true"
```

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

## Tech Stack

- **Framework**: Next.js 16 (App Router)
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
packages/
  types/                  # Shared TypeScript types
  db/                     # Supabase client
supabase/
  migrations/             # Database schema
  config.toml             # Local Supabase config
```
