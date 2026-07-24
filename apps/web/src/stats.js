// Live traction counter from /stats — never cached (§13). Revenue Rocket is
// judged on this number, so it updates on an interval while the page is open.

const API = window.VOUCH_API ?? "";
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const elAgents = document.getElementById("stat-agents");
const elCalls = document.getElementById("stat-calls");

// Wire footer links to the live API.
const mcp = document.getElementById("mcp-link");
const health = document.getElementById("api-link");
if (mcp) mcp.href = `${API}/mcp/tools`;
if (health) health.href = `${API}/health`;

const agentOut = document.getElementById("agent-id-out");
if (agentOut && window.VOUCH_AGENT_ID) agentOut.textContent = window.VOUCH_AGENT_ID;

const fmt = (n) => Number(n).toLocaleString("en-US");

// Small count-up so the number reads as "live" rather than snapping.
function animateTo(el, target) {
  if (!el) return;
  const from = Number(String(el.dataset.v ?? "0").replace(/,/g, "")) || 0;
  el.dataset.v = String(target);
  if (reduce || from === target) {
    el.textContent = fmt(target);
    return;
  }
  const start = performance.now();
  const dur = 600;
  const step = (t) => {
    const p = Math.min(1, (t - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(Math.round(from + (target - from) * eased));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

async function poll() {
  try {
    const res = await fetch(`${API}/stats`, { cache: "no-store" });
    if (!res.ok) return;
    const s = await res.json();
    animateTo(elAgents, s.agents_indexed ?? 0);
    animateTo(elCalls, s.calls_served ?? 0);
  } catch {
    // Leave the last good value on screen; never show an error in the chip.
  }
}

poll();
setInterval(poll, 10_000);
