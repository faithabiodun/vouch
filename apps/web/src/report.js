// The report card: fetch a report over the same public API an external agent
// uses, and stream it in cell-by-cell as if the API is responding live.

const API = window.VOUCH_API ?? "";
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const form = document.getElementById("lookup-form");
const input = document.getElementById("agent-input");
const btn = document.getElementById("run-btn");
const slot = document.getElementById("report-slot");

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fmtDur = (sec) => {
  if (!sec || sec <= 0) return "—";
  const h = sec / 3600;
  if (h < 1) return `${Math.round(sec / 60)}m`;
  return `${h % 1 === 0 ? h : h.toFixed(1)}h`;
};

function setBusy(busy) {
  if (btn) {
    btn.disabled = busy;
    btn.textContent = busy ? "…" : "Check";
  }
}

function renderState(title, detail) {
  slot.innerHTML = `<div class="state"><b>${esc(title)}</b>${
    detail ? esc(detail) : ""
  }</div>`;
}

function reportMarkup(d) {
  const r = d.record ?? {};
  const cells = [
    ["jobs done", r.jobs_completed ?? 0],
    ["abandoned", r.jobs_abandoned ?? 0],
    ["disputes", r.disputes_raised_against ?? 0],
    ["lost", r.disputes_lost ?? 0],
    ["median deliver", fmtDur(r.median_delivery_seconds)],
    ["median ticket", `$${(r.median_ticket_usd ?? 0).toFixed(2)}`],
    ["counterparties", r.counterparties_unique ?? 0],
    ["top share", `${Math.round((r.top_counterparty_share ?? 0) * 100)}%`],
  ];
  const meterCells = Array.from({ length: 20 }, () => `<i></i>`).join("");
  const flags = (d.flags ?? [])
    .map((f) => `<span class="flag">${esc(f)}</span>`)
    .join("");

  return `
    <div class="report" role="region" aria-label="Counterparty report">
      <div class="report__top">
        <div class="scorebox">
          <div class="num" id="r-score">0</div>
          <div class="of">/ 100</div>
        </div>
        <div>
          <div class="band" data-band="${esc(d.band)}">${esc(d.band)}</div>
          <div class="meter" id="r-meter" aria-hidden="true">${meterCells}</div>
          <div class="confline">
            <span>confidence <b>${esc(d.confidence)}</b></span>
            <span>sample <b>${esc(d.sample_size)}</b></span>
            ${d.stale ? '<span class="stale">· stale</span>' : ""}
          </div>
        </div>
      </div>
      ${flags ? `<div class="flags">${flags}</div>` : ""}
      <div class="grid">
        ${cells
          .map(
            (c) =>
              `<div class="cell"><div class="k">${esc(c[0])}</div><div class="v">${esc(
                c[1],
              )}</div></div>`,
          )
          .join("")}
      </div>
      <div class="summary"><span class="caret">▹</span> <span id="r-summary"></span></div>
    </div>`;
}

async function streamScore(score) {
  const numEl = document.getElementById("r-score");
  const meter = document.getElementById("r-meter");
  if (!numEl || !meter) return;
  const cells = Array.from(meter.children);
  const lit = Math.round((score / 100) * cells.length);
  const hot = score >= 80;

  if (reduce) {
    numEl.textContent = score;
    cells.slice(0, lit).forEach((c) => c.classList.add("on", ...(hot ? ["hot"] : [])));
    return;
  }

  // Count the number up while the meter fills cell by cell.
  const total = 520;
  const start = performance.now();
  const tick = (t) => {
    const p = Math.min(1, (t - start) / total);
    numEl.textContent = Math.round(score * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
    else numEl.textContent = score;
  };
  requestAnimationFrame(tick);

  for (let i = 0; i < lit; i++) {
    cells[i].classList.add("on");
    if (hot) cells[i].classList.add("hot");
    await sleep(26);
  }
}

async function typeSummary(text) {
  const el = document.getElementById("r-summary");
  if (!el) return;
  if (reduce) {
    el.textContent = text;
    return;
  }
  for (let i = 0; i < text.length; i++) {
    el.textContent = text.slice(0, i + 1);
    if (i % 2 === 0) await sleep(8);
  }
}

async function render(d) {
  slot.innerHTML = reportMarkup(d);
  await streamScore(d.score);
  await typeSummary(d.summary ?? "");
}

async function run(agentId) {
  const id = (agentId ?? "").trim();
  if (!id) {
    renderState("Enter an agent id", " to run a check.");
    return;
  }
  setBusy(true);
  renderState("Querying settlement history…", "");
  try {
    const res = await fetch(
      `${API}/check?agent_id=${encodeURIComponent(id)}&depth=standard`,
    );
    if (res.status === 402) {
      renderState(
        "402 · payment required",
        " this endpoint is priced at $0.004 via x402. The demo runs with the bypass on.",
      );
      return;
    }
    const body = await res.json();
    if (!res.ok) {
      const msg = body?.error?.message ?? "Unknown error";
      renderState(
        body?.error?.code === "AGENT_NOT_FOUND"
          ? "No settlement history on record"
          : "Could not complete the check",
        ` ${msg}`,
      );
      return;
    }
    await render(body);
  } catch {
    renderState(
      "API unreachable",
      " start the VOUCH API (npm run dev:api) or set window.VOUCH_API.",
    );
  } finally {
    setBusy(false);
  }
}

form?.addEventListener("submit", (e) => {
  e.preventDefault();
  run(input?.value);
});

// Auto-run the demo agent once the page has settled, so the card streams in as
// live B-roll for the demo video (§9 signature element).
const demo = window.VOUCH_DEMO_AGENT;
if (demo) {
  if (input) input.value = demo;
  setTimeout(() => run(demo), reduce ? 0 : 700);
}
