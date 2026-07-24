# Design notes

## Reference — LICTOR

**https://frontend-production-afdba.up.railway.app/** — an autonomous trading
desk, client-rendered (fetching the HTML returns an empty shell).

> ⚠️ **Not yet studied in a real browser.** §9 requires loading it live, taking
> screenshots, and recording its type scale, grid, panel construction, data
> density, and live-number behaviour here before finalising CSS. This build
> implements the *described* pattern language (dense monospace data panels, a
> segmented live meter, orchestrated load, live-updating numerals) but a
> side-by-side pass against the real reference is an open task — do it before the
> demo and refine `styles/` to match its density and motion more precisely.

## What this build implements

Three rules from §9:

1. **Match UI/UX** — monospace-everywhere data density, panelled report card,
   sticky top bar with live chips, a "desk"-like grid texture, live-updating
   `/stats` counter.
2. **Execute more advanced** — orchestrated page-load reveal, cell-by-cell meter
   fill, count-up score, typed summary, written empty/error states, full
   keyboard focus, responsive to 360px.
3. **Grey and black only** — no hue anywhere. Risk is signalled through **value,
   weight, and fill**: a HIGH_RISK read is a nearly-empty meter and heavier band
   type, never a red pill.

## System

- **Palette** — eight greys in [`styles/tokens.css`](../apps/web/styles/tokens.css),
  the single source of truth. Nothing hardcodes a hex outside it.
- **Type** — Archivo (display/body), JetBrains Mono (all data, labels, numerals).
  No third family. Every number is monospace.
- **Motion** — one `--ease`/`--dur` system; `prefers-reduced-motion` zeroes every
  duration and the page stays complete and readable.
- **Signature element** — the hero report card streams in on load as if the API is
  responding, and doubles as demo B-roll.
- **No framework** — vanilla HTML/CSS/JS so nothing can break during judging.

## Frontend/backend contract

The page talks to the backend over the **same public HTTP API an external agent
uses** (§4) — `GET /check`, `/check/basic`, `/stats`. No private routes. If the
landing page can render a report, so can any customer. Set `window.VOUCH_API` to
point at the deployed API; it defaults to `http://localhost:8080` on localhost.

## Open design tasks

- [ ] Load LICTOR in a browser, screenshot, record its metrics here, refine to match.
- [ ] Tune meter fill timing and summary typing against the recorded reference.
- [ ] Verify 360px and reduced-motion in a real browser before the demo.
