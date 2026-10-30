# Growth Engine

An AI ad agency + local growth engine built for Kanpur businesses. One dashboard that writes Hinglish ad scripts, renders real 1080×1920 MP4s, captures WhatsApp leads, boosts Google reviews and bills the client.

Built with Next.js 16 (App Router), TypeScript, Tailwind v4, Prisma 6 and ffmpeg.

---

## What is actually live

| Piece | Status | Notes |
| --- | --- | --- |
| Hinglish ad copy | **Live** with `GEMINI_API_KEY` | Falls back to a deterministic playbook writer with no key — demos still work offline. |
| Video render | **Live** | Bundled `ffmpeg-static` cuts a real 12s, 1080×1920, 30fps MP4 + JPG poster: three photo scenes, Ken Burns camera moves, animated Hinglish captions, crossfades and a licensed music bed. Optional Modal GPU worker via `RENDER_DRIVER=modal`. |
| Trend reels | **Live** | Five full-bleed shots cut on a 95.7 BPM beat grid, virtual camera moves, kinetic Hinglish captions (pop / slide / brand plate / underline), teal-orange grade with bloom + grain + lens character, cut-synced sound design (whoosh, impact, pop, riser), music ducked under the voice and an animated WhatsApp CTA. Presenter mode is hybrid: **owner clip > HeyGen avatar > stock actor**. On the avatar path a circular talking-head PiP sits over the b-roll. The stock path is a narrator, not lip-sync; owner/avatar paths carry their own audio. |
| AI UGC ads | **Live** with `HIGGSFIELD_API_KEY_ID` + `HIGGSFIELD_API_KEY_SECRET` | Generates a five-beat ad (hook → problem → product → proof → CTA): two Soul stills, five image-to-video clips, an Edge TTS Hinglish voiceover and a clean, native-style edit. Without a key the button is disabled with the reason — it never fakes a generated actor. |
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

On a fresh database the seeded ads have no media yet. Go to **Settings → Pre-render reels** once: it renders a real MP4 + poster for every seeded ad in the background (~3–5 minutes for 19 reels; the Sharma Dental trend reel takes ~40 seconds), so Studio's Recent work and the client libraries show playable reels instead of covers. `Reset demo data` re-seeds and re-renders automatically.

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
3. **Trend reel** — open **Ads → Trend**. The seeded Sharma Dental reel opens with the presenter hook, `Rs 199` sticker, doctor proof and WhatsApp CTA. This is the Instagram-grade format: full-bleed footage, beat-synced cuts, female Hinglish VO, music/SFX and kinetic type.
4. **Publish** — click **Publish to Meta**. It returns a sandbox message, marks the ad `PUBLISHED`, and the video stays on screen. No money is spent.
5. **Review QR** (`/r/sharma-dental`) — open it on a phone, pick three tags, generate a review in the customer's voice, copy it to Google.
6. **Funnel** (`/f/sharma-dental`) — submit a test enquiry. It appears in **Leads** and in the owner portal within seconds.
7. **Demo kit** (`/demo`) — printable standee with a live QR, plus the exact script and objection handling.

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
    render/           ffmpeg graphs: cinematic, trend, HeyGen avatar + queue
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

### Trend reels + the hybrid presenter

Trend reels use a separate, more editorial pipeline in `src/lib/render/trend.ts`. The edit is deliberately "senior pro" rather than a slideshow:

- **Pacing** — five shots whose durations are chosen so every crossfade lands on a 95.7 BPM beat (cuts at 2.51 / 5.02 / 7.52 / 10.03s). Transition order is mixed (`smoothleft`, `zoomin`, `hblur`, `circleopen`) with white impact flashes on the hook→problem and offer→proof cuts.
- **Camera** — each shot gets a virtual move (`push-in`, `pull-out`, `pan-left`, `pan-right`, `handheld`) by upscaling the cropped frame and animating the crop window, so nothing sits still.
- **Kinetic captions** — word groups pop / slide in over the voice, with brand plates behind price and CTA words, animated underlines and per-word type sizes. Captions are Hinglish and token-filled (`{{price}}`, `{{doctor}}`, `{{offer}}`, …).
- **Grade** — teal-orange `colorbalance` + S-curve `curves`, `eq`, `unsharp`, subtle `rgbashift` lens character, then a global screen-blend bloom, film grain and vignette.
- **Sound design** — a whoosh leads every cut, an impact lands on the beat, pops accent key words, a riser lifts the last shot into the CTA, and the music is side-chain ducked under the voice before `loudnorm` (−14 LUFS) and a limiter.
- **End card** — animated WhatsApp CTA with a pulsing brand button, offer, phone, area and doctor/proof line.

- **Manifest** — `public/assets/trend/<name>/manifest.json` defines the shots, trim points, focus-X crops, per-shot `move`, per-caption timing/style, transition order, `edit` grade/sfx block, music and presenter timing. The seeded Sharma Dental reel uses `dental/manifest.json` (`version: 2`); older v1 manifests still render (legacy `texts`, `flashAt`).
- **Footage** — `public/assets/trend/dental/stock/*.mp4`, licensed Mixkit clips. Replace with the client's own clinic/patient/doctor footage in the same slots.
- **Voice** — `dental/vo.mp3` (female Hinglish, Edge TTS) mixed at +22%. No runtime Python/TTS dependency is needed for the demo.
- **Music/SFX** — `public/assets/trend/music/hiphop-02.mp3` (Mixkit) plus `whoosh`, `impact`, `pop` and a synthesized `riser`. Cuts land on the beat grid and the mix is loudness-normalised to −14 LUFS with a limiter.

Presenter resolution is `TREND_PRESENTER=auto` (the default):

1. **Owner clip** — drop a vertical, 15–30s recording at `public/assets/presenters/<client-slug>/owner.mp4`. The renderer uses the owner's own audio and cuts the hook/CTA from that clip. This is the most realistic and the only path that is guaranteed authentic.
2. **HeyGen avatar** — set `HEYGEN_API_KEY`, `HEYGEN_AVATAR_ID` and `HEYGEN_VOICE_ID` (optional `HEYGEN_VOICE_SPEED`). The renderer generates a 1080×1920 lip-synced avatar from the same Hinglish script, uses its audio, cuts the hook/CTA from it, and drops a circular brand-ringed talking-head PiP over the b-roll so the host stays present while the footage runs.
3. **Stock actor + narrator** — the offline fallback. Real footage and a real Hinglish voice, but the presenter's lips are not synced. The UI labels it **stock narrator** so the demo never overclaims.

Set `presenter.pip` in the manifest to `"avatar"` (default, avatar only), `"all"` (avatar + owner) or `"none"` to control the b-roll PiP.

**Choosing in the app.** Every trend reel has a **Presenter** picker on its card in **Ads → Trend** (and the client's Ads tab). It lists all three paths plus **auto**; paths that aren't usable yet are disabled with the reason (`no clip`, `needs key`), and picking one saves `presenterMode` on the ad and re-renders the reel (~40s). **Settings → Trend presenter options** shows live status for each path.

The trend ad is seeded as `format: "TREND"` on Sharma Dental, so it appears under **Ads → Trend** and in the client's Ads tab. A missing manifest, failed avatar call or missing clip automatically falls back to the cinematic renderer, so the demo never ends with a broken ad.

### AI UGC ads (Higgsfield)

This is the "AI ad" genre from the reference workflow — a real-looking person speaking to camera, quick jump cuts, native captions and a CTA — built from generated footage instead of stock clips. Code: `src/lib/render/higgsfield.ts` (API client) and `src/lib/render/ugc.ts` (pipeline).

**The five beats.** `buildBeats()` writes a grounded Hinglish script in the order the reference uses:

| Beat | Job | Example |
| --- | --- | --- |
| Hook | Stop the scroll in the first second | "Swaroop Nagar walo, ek minute ruko." |
| Problem | Name the pain | "Sensitivity, bleeding, ya lagatar dard?" |
| Product | The offer, with the price | "Rs 199 mein full checkup, X-ray free." |
| Proof | Only facts the client supplied | Doctor name + `client.proof` |
| CTA | One action | "WhatsApp karo, slot book karo." |

**Pipeline.**

1. **Stills** — Higgsfield Soul, 9:16 / 1080p: one consistent actor (same face for every beat) plus one clinic/product interior.
2. **Clips** — image-to-video from those stills, five 5s generations, one per beat. The still fixes identity; the prompt only describes the motion.
3. **Voice** — Edge TTS (`msedge-tts`, free, no key) reads the script; the pipeline probes the real audio length.
4. **Edit** — writes a `manifest.json` next to the clips and hands it to the trend renderer with a clean grade: no grain, vignette, chroma shift, SFX or riser, brand captions in the lower third and a low music bed under the voice.

**Models.** The defaults are the confirmed public endpoints: `/higgsfield-ai/soul/standard` and `/kling-video/v2.5-turbo/pro/image-to-video`. Seedance / Nano Banana are exposed per account in the [Higgsfield console](https://console.higgsfield.ai); paste the path it shows into `HIGGSFIELD_VIDEO_MODEL` / `HIGGSFIELD_IMAGE_MODEL` — no code change.

**Cost + caching.** One ad = 2 images + 5 videos. Generations are cached under `public/assets/trend/ugc/<adId>/` (`meta.json` + clips), so re-renders and presenter/grade changes are free. The UI asks for confirmation before spending and shows live progress. A failure is surfaced as an error — it never silently downgrades to a stock reel.

**Honest limitation.** Kling animates the actor's mouth but does not lip-sync to the Hindi voiceover, so the voice reads as a narrator over the actor's performance. For true lip-sync use the HeyGen avatar path or point `HIGGSFIELD_VIDEO_MODEL` at a Seedance/audio-capable model when it appears in your console.

**In the app.** Open a client → **Ads** → **AI UGC ad**. Without keys the button is disabled (`needs Higgsfield key`). The result lands in the library under **Ads → AI UGC** with `ai ugc` / `5 beats` badges.

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
TREND_PRESENTER="auto"            # auto | owner | avatar | stock
HEYGEN_API_KEY=""                 # optional lip-synced avatar
HEYGEN_AVATAR_ID=""
HEYGEN_VOICE_ID=""
HIGGSFIELD_API_KEY_ID=""           # optional AI UGC ads (5-beat Higgsfield pipeline)
HIGGSFIELD_API_KEY_SECRET=""
HIGGSFIELD_IMAGE_MODEL="/higgsfield-ai/soul/standard"
HIGGSFIELD_VIDEO_MODEL="/kling-video/v2.5-turbo/pro/image-to-video"
UGC_VOICE="hi-IN-SwaraNeural"      # Edge TTS voice, free
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
- The stock trend presenter is a **narrator**, not lip-synced. For a true talking character, add an owner clip or HeyGen credentials; the pipeline is already wired for both. HeyGen generation takes 1–3 minutes and needs outbound network access.
- Stock actors in the demo are stand-ins for the client's team, not real staff or testimonials. Never present them as either; swap in client-owned footage for a paid campaign.
- `npx prisma db push` is used instead of migrations for the demo. Add `prisma migrate` before a real multi-developer project.

---

## Credits

Demo data is fictional but modelled on real Kanpur business categories, areas and price points. Font rendering for ffmpeg uses Arial on Windows and DejaVu Sans on Linux/macOS; the renderer falls back to ffmpeg's default font if neither exists.

Demo reel photos are from [Pexels](https://www.pexels.com/license/) (free to use, no attribution required). Demo music is by [Kevin MacLeod](https://incompetech.com) and licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Trend footage, the “Hip Hop 02” track and SFX are from [Mixkit](https://mixkit.co/) under its free license. Track list and source links are in `public/assets/CREDITS.md`. Replace all stock with client-owned assets before publishing paid campaigns.
