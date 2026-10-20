# Growth Engine

An AI ad agency + local growth engine built for Kanpur businesses. One dashboard that writes Hinglish ad scripts, renders real 1080×1920 MP4s, captures WhatsApp leads, boosts Google reviews and bills the client.

Built with Next.js 16 (App Router), TypeScript, Tailwind v4, Prisma 6 and ffmpeg.

---

## What is actually live

| Piece | Status | Notes |
| --- | --- | --- |
| Hinglish ad copy | **Live** with `GEMINI_API_KEY` | Falls back to a deterministic playbook writer with no key — demos still work offline. |
| Video render | **Live** | Bundled `ffmpeg-static` cuts a real 12s, 1080×1920, 30fps MP4 + JPG poster: three photo scenes, Ken Burns camera moves, animated Hinglish captions, crossfades and a licensed music bed. Optional Modal GPU worker via `RENDER_DRIVER=modal`. |
| QR codes | **Live** | Generated server-side with `qrcode`; no external image service. Auto-detects your LAN IP so phones on the same Wi-Fi can scan. |
| WhatsApp funnel | **Live** | Real `wa.me` deep links with pre-filled Hinglish messages; leads stored in the DB. |
| CRM / leads / billing | **Live** | Prisma + SQLite locally, Postgres/Supabase in production. |
| Auth | **Live** | HMAC-signed `ge_session` cookie, 30 days, passcode from `.env`. |
| Meta / TikTok publish | **Sandbox** | "Publish" marks the ad live and writes an activity event, but does not spend. Set `META_ACCESS_TOKEN` to turn the sandbox flag off (a live Graph API push is the next integration, see below). |
| R2 storage | **Reserved** | The settings page reads the keys, but renders currently stay on local disk. Use a storage adapter before running on ephemeral serverless disk. |

---

## Quick start

Requirements: Node 20+, npm. Windows, macOS and Linux are supported (ffmpeg ships with the app).

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run setup             # prisma generate + db push + seed 9 Kanpur clients
npm run dev
```

Open <http://localhost:3000>. The default passcode is **`kanpur2026`**.

On a fresh database the seeded ads have no media yet. Go to **Settings → Pre-render reels** once: it renders a real MP4 + poster for every seeded ad in the background (~1 minute), so Studio's Recent work and the client libraries show playable reels instead of covers. `Reset demo data` re-seeds and re-renders automatically.

> Change `AGENCY_PASSCODE` and `NEXT_PUBLIC_AGENCY_NAME` before you show this to a client. The branding name appears in the sidebar, portal, funnel footer and printed standee.

### Useful scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3000 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:seed` | Re-seed demo data (wipes clients, leads, ads, events) |
| `npm run db:reset` | Force-reset the schema and re-seed |
| `npm run build` | Prisma generate + production build |

---

## The 3-minute demo

1. **Overview** — read the numbers out loud: MRR, WhatsApp leads, blended ROAS. The values are computed from won leads, not invented metric rows.
2. **Ad Studio** (`/studio`) — pick Sharma Dental → Generate. Four Hinglish concepts appear with a Hit Score, predicted CTR and ROAS. Hit **Render ad**; the progress bar runs while ffmpeg encodes, then a real MP4 plays in the panel.
3. **Publish** — click **Publish to Meta**. It returns a sandbox message, marks the ad `PUBLISHED`, and the video stays on screen. No money is spent.
4. **Review QR** (`/r/sharma-dental`) — open it on a phone, pick three tags, generate a review in the customer's voice, copy it to Google.
5. **Funnel** (`/f/sharma-dental`) — submit a test enquiry. It appears in **Leads** and in the owner portal within seconds.
6. **Demo kit** (`/demo`) — printable standee with a live QR, plus the exact script and objection handling.

Demo-safe details:

- No internet is required for the core flow (AI falls back, QR is local, ffmpeg is bundled).
- The demo kit prints your LAN origin (`http://192.168.x.x:3000`) so QR codes work on a phone on the same Wi-Fi.
- **Settings → Demo controls → Reset demo data** restores the seeded workspace. Never run it after adding a real client.

---

## Pages

| Route | Purpose |
| --- | --- |
| `/login` | Passcode entry |
| `/` | Agency overview: MRR, leads, CPL, ROAS, activity |
| `/clients` | All accounts, filters, add-client modal |
| `/clients/[slug]` | Overview, ads, leads, reviews, setup config |
| `/studio` | Generate → score → render → publish |
| `/leads` | Cross-client lead inbox with status updates |
| `/radar` | Competitor / creative-fatigue view |
| `/billing` | Retainers, margin, plans |
| `/settings` | Integration status, demo controls, go-live checklist |
| `/demo` | Printable QR standee + demo script |
| `/f/[slug]` | Public WhatsApp funnel (no login) |
| `/r/[slug]` | Public review booster (no login) |
| `/portal/[slug]` | Public owner portal (no login) |

The public routes are intentionally unauthenticated so they can be opened from a phone or embedded in an Instagram bio. They are marked `noindex`.

---

## Architecture

```
src/
  app/
    (app)/            authenticated dashboard (layout guard)
    api/              auth, generate, render, jobs, publish, leads, reviews, demo
    f/[slug]/         WhatsApp funnel
    r/[slug]/         review booster
    portal/[slug]/    owner portal
  components/         studio, charts, UI primitives, client actions
  lib/
    ai.ts             Gemini + deterministic Hinglish playbook + hook scoring
    data.ts           all dashboard queries and aggregations
    render/           ffmpeg graph + single-process render queue
    auth.ts           HMAC cookie session
prisma/
  schema.prisma       9 models
  dev.db              local SQLite (git-ignored)
scripts/seed.mjs      Kanpur demo workspace
public/renders/       generated MP4 + JPG files
```

### Data rules that keep the demo credible

- **Revenue is CRM truth.** Dashboard and billing revenue = sum of `WON` lead values, not platform-reported revenue. ROAS = that revenue / ad spend. In the seed: ~₹1.0L spend, ~₹7.1L booked, ~7.1x blended ROAS.
- **Daily charts use local day keys.** `toISOString()` would push IST leads into the previous day and hide today's activity.
- **Social proof is grounded.** Each client has a `proof` field (e.g. "42 NEET selections last year") that the copywriter is allowed to use. The model is explicitly told never to invent patient/customer counts; without a proof value the fallback says "Seedha owner se baat".
- **Price hooks never duplicate the price.** If the offer title already contains `₹199`, the price-led hook uses the title as-is.

### Reel assets

Each reel is built from three pieces, all local so a demo works without internet:

- **Photos** — `public/assets/reels/<client-slug>/01.jpg`, `02.jpg` … The renderer uses the first two (Ken Burns zoom + pan). Drop real client photos in that folder; `_default` is used when a client has none.
- **Music** — `public/assets/music/{bright,elegant,driving,playful}.mp3`. The track is picked from the client's niche and mixed under the reel with fade-in/out.
- **Copy** — the ad's three scenes (Hook / Offer / CTA) from Studio.

The bundled demo photos are Pexels stock and the music is Kevin MacLeod (CC BY 4.0). See `public/assets/CREDITS.md`. Swap both for client-owned footage and licensed music before a commercial campaign.

---

## Environment variables

Everything is optional except the database and passcode. See `.env.example` for the annotated list.

```ini
DATABASE_URL="file:./dev.db"
AGENCY_PASSCODE="kanpur2026"
NEXT_PUBLIC_AGENCY_NAME="Growth Engine"
NEXT_PUBLIC_APP_URL=""            # blank = auto-detect LAN IP for QR codes
GEMINI_API_KEY=""                 # blank = offline playbook writer
GEMINI_MODEL="gemini-2.5-flash"
RENDER_DRIVER="local"             # local | modal
MODAL_RENDER_URL=""
META_ACCESS_TOKEN=""              # blank = sandbox publish
META_AD_ACCOUNT_ID=""
TIKTOK_ACCESS_TOKEN=""
R2_*                              # reserved, see below
```

---

## Deploying

### Option A — demo laptop (recommended for sales)

Run `npm run dev` (or `npm run build && npm start`) on the laptop you carry. Everything works offline, renders are instant, and the QR standee points at your LAN IP. This is the lowest-risk setup for client meetings.

### Option B — Vercel + Supabase (dashboard in the cloud)

1. Create a Supabase project and copy the **pooled** Postgres connection string.
2. In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
3. Set `DATABASE_URL` in Vercel to the Supabase string.
4. Run `npx prisma db push` once against the production database, then `npm run db:seed` if you want demo data.
5. Deploy. `npm run build` already runs `prisma generate`.

Serverless caveats:

- `public/renders` is ephemeral on Vercel, and ffmpeg encoding can exceed function limits. For a production deploy, move rendering to the Modal worker (`RENDER_DRIVER=modal`, `MODAL_RENDER_URL`) and upload the output to R2/S3. The adapter is the one piece still to wire; the UI and queue are ready for it.
- SQLite is local-dev only. Never deploy `dev.db`.

### Cloudflare

Next.js 16 on Cloudflare Workers needs the OpenNext adapter plus a Prisma driver adapter for Postgres. That wiring is not included yet; Vercel is the path of least resistance for the first deploy.

---

## Known limits / next integrations

- Meta publishing is simulated. The publish route already isolates the sandbox branch; swapping in the Graph API `adcreatives` + `ads` calls is a contained change.
- R2 upload is not implemented; renders are served from local disk.
- Razorpay AutoPay is represented in the UI only — no payment API calls are made.
- The render queue is an in-process FIFO. For multi-instance production, replace it with BullMQ/Upstash (the interface is `enqueueRender(jobId)`).
- `npx prisma db push` is used instead of migrations for the demo. Add `prisma migrate` before a real multi-developer project.

---

## Credits

Demo data is fictional but modelled on real Kanpur business categories, areas and price points. Font rendering for ffmpeg uses Arial on Windows and DejaVu Sans on Linux/macOS; the renderer falls back to ffmpeg's default font if neither exists.

Demo reel photos are from [Pexels](https://www.pexels.com/license/) (free to use, no attribution required). Demo music is by [Kevin MacLeod](https://incompetech.com) and licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); track list and source links are in `public/assets/CREDITS.md`. Replace both with client-owned assets before publishing paid campaigns.
