// ============================================================
// portfolio.js — localStorage-backed positions, live gain/loss,
// and an allocation donut chart. Reuses stocks.js's getQuote.
// ============================================================

(function () {
  const form = document.getElementById("addPositionForm");
  if (!form) return; // portfolio markup not present on this page

  const els = {
    symbol: document.getElementById("posSymbol"),
    shares: document.getElementById("posShares"),
    cost: document.getElementById("posCost"),
    body: document.getElementById("positionsBody"),
    empty: document.getElementById("positionsEmpty"),
    netWorth: document.getElementById("pfNetWorth"),
    dayChange: document.getElementById("pfDayChange"),
    gain: document.getElementById("pfGain"),
    gainPct: document.getElementById("pfGainPct"),
    count: document.getElementById("pfCount"),
    donut: document.getElementById("donutChart"),
    legend: document.getElementById("donutLegend"),
  };

  const PALETTE = ["#5b8cff", "#6be3ae", "#f4c95d", "#ff6b7a", "#b78cff", "#4fd4e8", "#ff9f5b", "#8fa9f5"];

  function getPositions() {
    try { return JSON.parse(localStorage.getItem("yakton_positions") || "[]"); }
    catch { return []; }
  }
  function setPositions(list) {
    localStorage.setItem("yakton_positions", JSON.stringify(list));
  }
  function fmt(n) {
    return n == null || isNaN(n) ? "—" : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtMoney(n) {
    const sign = n < 0 ? "-" : "";
    return `${sign}$${fmt(Math.abs(n))}`;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const symbol = els.symbol.value.trim().toUpperCase();
    const shares = Number(els.shares.value);
    const cost = Number(els.cost.value);
    if (!symbol || !shares || cost < 0) return;
    const list = getPositions();
    const existing = list.find((p) => p.symbol === symbol);
    if (existing) {
      // weighted-average the cost basis with the new lot
      const totalShares = existing.shares + shares;
      existing.cost = (existing.cost * existing.shares + cost * shares) / totalShares;
      existing.shares = totalShares;
    } else {
      list.push({ symbol, shares, cost });
    }
    setPositions(list);
    form.reset();
    renderPositions();
  });

  function removePosition(symbol) {
    setPositions(getPositions().filter((p) => p.symbol !== symbol));
    renderPositions();
  }

  async function renderPositions() {
    const list = getPositions();
    els.count.textContent = list.length;

    if (!list.length) {
      els.body.innerHTML = "";
      els.empty.style.display = "block";
      els.netWorth.textContent = "$0.00";
      els.dayChange.textContent = "—";
      els.gain.textContent = "$0.00";
      els.gainPct.textContent = "—";
      drawDonut([]);
      return;
    }
    els.empty.style.display = "none";

    const quotes = await Promise.all(
      list.map((p) => window.YaktonStocks.getQuote(p.symbol).catch(() => null))
    );

    let totalValue = 0, totalCost = 0, totalDayChange = 0;
    const rows = list.map((p, i) => {
      const q = quotes[i];
      const price = q ? q.price : p.cost;
      const value = price * p.shares;
      const costBasis = p.cost * p.shares;
      const gainAbs = value - costBasis;
      const gainPct = costBasis ? (gainAbs / costBasis) * 100 : 0;
      totalValue += value;
      totalCost += costBasis;
      if (q) totalDayChange += q.change * p.shares;
      return { ...p, price, value, gainAbs, gainPct };
    });

    els.body.innerHTML = rows.map((r) => `
      <tr>
        <td class="pos-sym">${r.symbol}</td>
        <td class="mono">${r.shares}</td>
        <td class="mono">$${fmt(r.cost)}</td>
        <td class="mono">$${fmt(r.price)}</td>
        <td class="mono">${fmtMoney(r.value)}</td>
        <td class="mono ${r.gainAbs >= 0 ? "up" : "down"}" style="color:${r.gainAbs >= 0 ? "var(--gain)" : "var(--loss)"}">
          ${fmtMoney(r.gainAbs)} (${r.gainAbs >= 0 ? "+" : ""}${r.gainPct.toFixed(2)}%)
        </td>
        <td><button class="pos-remove" data-sym="${r.symbol}" aria-label="Remove ${r.symbol}">×</button></td>
      </tr>
    `).join("");
    els.body.querySelectorAll(".pos-remove").forEach((btn) => {
      btn.addEventListener("click", () => removePosition(btn.dataset.sym));
    });

    const totalGain = totalValue - totalCost;
    const totalGainPct = totalCost ? (totalGain / totalCost) * 100 : 0;
    els.netWorth.textContent = fmtMoney(totalValue);
    els.gain.textContent = fmtMoney(totalGain);
    els.gain.style.color = totalGain >= 0 ? "var(--gain)" : "var(--loss)";
    els.gainPct.textContent = `${totalGain >= 0 ? "+" : ""}${totalGainPct.toFixed(2)}% all-time`;
    els.gainPct.className = "tile-sub " + (totalGain >= 0 ? "up" : "down");
    els.dayChange.textContent = `${totalDayChange >= 0 ? "+" : ""}${fmtMoney(totalDayChange)} today`;
    els.dayChange.className = "tile-sub " + (totalDayChange >= 0 ? "up" : "down");

    drawDonut(rows.map((r) => ({ label: r.symbol, value: r.value })));
  }

  function drawDonut(slices) {
    const canvas = els.donut;
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, rOuter = Math.min(w, h) / 2 - 4, rInner = rOuter * 0.6;

    if (!slices.length) {
      ctx.beginPath();
      ctx.arc(cx, cy, (rOuter + rInner) / 2, 0, Math.PI * 2);
      ctx.lineWidth = rOuter - rInner;
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.stroke();
      els.legend.innerHTML = '<div class="legend-item">Add a position to see allocation.</div>';
      return;
    }

    const total = slices.reduce((s, x) => s + x.value, 0) || 1;
    let angle = -Math.PI / 2;
    els.legend.innerHTML = "";
    slices.forEach((s, i) => {
      const frac = s.value / total;
      const color = PALETTE[i % PALETTE.length];
      ctx.beginPath();
      ctx.arc(cx, cy, (rOuter + rInner) / 2, angle, angle + frac * Math.PI * 2);
      ctx.lineWidth = rOuter - rInner;
      ctx.strokeStyle = color;
      ctx.stroke();
      angle += frac * Math.PI * 2;

      const pct = (frac * 100).toFixed(1);
      els.legend.innerHTML += `
        <div class="legend-item">
          <span class="legend-swatch" style="background:${color}"></span>
          ${s.label}
          <b>${pct}%</b>
        </div>`;
    });
  }

  function onShow() { renderPositions(); }

  function boot() {
    if (window.YaktonStocks) renderPositions();
    else window.addEventListener("yakton-stocks-ready", renderPositions, { once: true });
  }
  document.addEventListener("DOMContentLoaded", boot);

  window.YaktonPortfolio = { onShow, getPositions };
})();
