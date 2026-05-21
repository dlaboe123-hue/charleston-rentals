# Charleston Rentals

Rental tracker for Nicole & Daniel's Charleston move. Vite + React + Tailwind + Upstash Redis backend, Google Maps deeplinks.

## Architecture

- **Frontend**: Vite SPA, optimistic UI updates, localStorage as offline cache.
- **Backend**: One Vercel serverless function (`/api/data`) backed by Upstash Redis (free tier).
- **Sync model**: Both phones read from and write to the same Redis key. Refetch on window focus + manual Refresh button. Last-write-wins on conflicts.

## One-time setup

### 1. Add Upstash Redis to your Vercel project

1. Vercel dashboard → your project → **Storage** tab
2. Under **Marketplace Database Providers**, find **Redis** (Upstash) → **Create**
3. Region: pick **iad1** (US East — closest to Charleston/Detroit)
4. Plan: **Free** (10K commands/day, more than enough)
5. Click **Continue** → name it `charleston-rentals-db` → **Create**
6. After provisioning, **Connect Project** → pick this repo → **Connect**
7. Vercel auto-injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` env vars

### 2. Redeploy

Vercel → Deployments → latest deployment → **`···` menu → Redeploy** (so it picks up the new env vars and the new `api/` function).

### 3. Open the URL

First load auto-seeds the 24 properties from Nicole's spreadsheet into Redis. Both phones now see the same data.

## How sync works

- **Open the app**: pulls latest from server (small "Syncing…" indicator in header)
- **Rate / edit / add**: UI updates instantly (optimistic), then writes to server after 400ms debounce
- **Switch back to the tab**: auto-refetches latest in case Nicole edited from her phone
- **Manual refresh**: Tap the Refresh button or the green dot under the title

Status indicator under the title:
- 🟢 **Synced** — all good
- 🟡 **Syncing…** — write in flight
- 🔴 **Offline** — network or server failure (still works locally, cached copy)

## Tour days

The tour weekend is **Saturday 5/23** and **Sunday 5/24, 2026**. The **Tour Day** tab has a Sat/Sun toggle (each showing a stop count); the header, stats, and "Route … Stops" button all reflect the selected day. Assign a property to a day in its **Details → Edit → Tour day** dropdown (writes the `tourDate` field, `2026-05-23` or `2026-05-24`). Properties with a tour time but no day are treated as Saturday.

## Photos (Google Street View)

Each tile and the detail modal show a Google Street View image of the building, looked up from its address. To enable:

1. In Google Cloud Console, create an API key and enable the **Street View Static API** (tile/modal photos) and the **Maps Embed API** (the interactive route map in Tour Day + the location map in each property's detail). For local dev, leave the key unrestricted or add `http://localhost:*` to the allowed HTTP referrers.
2. Restrict the key by **HTTP referrer** to your Vercel domain (the key ships in client-side JS, so referrer restriction is what protects it).
3. Set the env var **`VITE_GOOGLE_MAPS_API_KEY`**:
   - **Vercel**: Project → Settings → Environment Variables → add `VITE_GOOGLE_MAPS_API_KEY`, then redeploy.
   - **Local**: add `VITE_GOOGLE_MAPS_API_KEY=...` to `.env.local`.

Without the key (or where Google has no imagery / a unit isn't street-facing), the tile shows a clean house-icon placeholder. Street View shows the building exterior — not the specific unit interior.

## Local dev

```bash
npm install
npm run dev          # frontend only at localhost:5173
vercel dev           # frontend + api routes at localhost:3000 (recommended)
```

For `vercel dev` you'll need `vercel link` once to connect to your project, and `vercel env pull .env.local` to grab the Upstash credentials locally.

## Reset / reseed

Delete the Redis key to start fresh:

1. Vercel → Storage → your Upstash database → **Open in Upstash Console**
2. Data Browser → find key `charleston_rentals_v2` → Delete
3. Reload the app — it'll reseed from the 24 properties in `api/data.js`

## Data schema

Single Redis key `charleston_rentals_v2` → JSON blob:
```json
{
  "version": 2,
  "properties": [
    {
      "id": "p1",
      "address": "...", "addressFull": "?",
      "type": "...", "br": N, "ba": N, "sqft": N, "rent": N,
      "neighborhood": "...", "zip": "...",
      "status": "...",
      "contact": "...", "contactInfo": "...",
      "nextStep": "...", "notes": "...",
      "tourTime": "11:15 AM", "tourDate": "2026-05-23",
      "ratings": { "nicole": 0-5, "daniel": 0-5 },
      "verdict": "yes" | "maybe" | "no" | null,
      "tourNotes": { "vibe": "...", "liked": "...", "bugged": "...", "dealbreakers": "..." }
    }
  ]
}
```

## Known limitations

- **Conflict resolution is last-write-wins.** If you and Nicole edit different properties within the same 400ms window, the later POST overwrites the earlier one. In practice this is extremely unlikely for two people on a tour weekend. If it bites us, the fix is per-property keys in Redis.
- **API is open** (no auth). The endpoint is unguessable but not private. Don't post the Vercel URL publicly. If we want to harden, add a shared password in a header check — but it'd live in client-side JS so it's security through obscurity anyway.
