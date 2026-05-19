# Charleston Rentals

Rental tracker for Nicole & Daniel's Charleston move. Vite + React + Tailwind, localStorage persistence, Google Maps deeplinks.

## Deploy from iPhone (same flow as Programme)

1. **Create a new GitHub repo** named `charleston-rentals` (private). Skip the README/`.gitignore`/license — we have those.
2. **Upload these files.** Open the empty repo on github.com → "uploading an existing file" → drag in everything from the zip, preserving the `src/` folder structure.
3. **Import to Vercel.** vercel.com → "Add New… → Project" → pick the repo. Vercel auto-detects Vite and deploys. No environment variables needed.
4. **Done.** Open the Vercel URL on both phones. Add to Home Screen for app-like access.

## How sync works (no backend)

Data lives in each browser's localStorage, so your phone and Nicole's phone are separate at first. To merge:

- Tap **Sync** in the header → "Download JSON" or "Copy to clipboard"
- Send it to the other person (text, AirDrop, email)
- They open Sync → paste into the Import box → tap Import (replaces their data)

It's manual, but for a 4-day tour trip it works. If we want true sync later, add Vercel KV (~10 lines) and replace the localStorage calls with `fetch` to a tiny API route.

## Local dev

```
npm install
npm run dev
```

## Reseed from scratch

Open Safari DevTools (Mac connected) or paste in console:
```
localStorage.removeItem('charleston_rentals_v2')
```
Then reload — all 24 properties from Nicole's spreadsheet come back fresh.

## Data schema

Stored under one key `charleston_rentals_v2`. Single JSON blob: `{ properties: [...], version: 2 }`.

Each property:
```
{
  id, address, addressFull?, type, br, ba, sqft, rent,
  neighborhood, zip, status, contact, contactInfo,
  nextStep, notes, tourTime?, tourDate?,
  ratings: { nicole, daniel },
  verdict: 'yes' | 'maybe' | 'no' | null,
  tourNotes: { vibe, liked, bugged, dealbreakers }
}
```
