// ============================================================
// wallet.js — budget envelopes, a mock send/request flow,
// a live currency converter (frankfurter.app, no key needed),
// and price alerts checked against stocks.js's getQuote.
// ============================================================

(function () {
  const view = document.getElementById("view-wallet");
  if (!view) return;

  // ---------------- Budget ----------------
  const Budget = (function () {
    const listEl = document.getElementById("budgetList");
    const form = document.getElementById("addBudgetForm");
    const nameInput = document.getElementById("budgetName");
    const limitInput = document.getElementById("budgetLimit");

    function get() {
      try { return JSON.parse(localStorage.getItem("yakton_budget") || "[]"); }
      catch { return []; }
    }
    function set(list) { localStorage.setItem("yakton_budget", JSON.stringify(list)); }

    function render() {
      const list = get();
      if (!list.length) {
        listEl.innerHTML = '<p class="tx-empty">No categories yet — add one below.</p>';
        return;
      }
      listEl.innerHTML = list.map((b, i) => {
        const pct = b.limit ? Math.min(100, (b.spent / b.limit) * 100) : 0;
        const over = b.spent > b.limit;
        return `
          <div class="budget-item">
            <div class="budget-item-head">
              <span>${b.name}</span>
              <span class="mono">$${b.spent.toFixed(0)} / $${b.limit.toFixed(0)}</span>
            </div>
            <div class="budget-bar-track"><div class="budget-bar-fill${over ? " over" : ""}" style="width:${pct}%"></div></div>
            <div style="display:flex;gap:6px;margin-top:6px">
              <button class="btn btn-sm" data-act="spend" data-i="${i}" type="button">+ $10 spent</button>
              <button class="btn btn-sm" data-act="del" data-i="${i}" type="button">Remove</button>
            </div>
          </div>`;
      }).join("");

      listEl.querySelectorAll("[data-act='spend']").forEach((btn) => {
        btn.addEventListener("click", () => {
          const list = get();
          list[+btn.dataset.i].spent += 10;
          set(list);
          render();
        });
      });
      listEl.querySelectorAll("[data-act='del']").forEach((btn) => {
        btn.addEventListener("click", () => {
          const list = get();
          list.splice(+btn.dataset.i, 1);
          set(list);
          render();
        });
      });
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      const limit = Number(limitInput.value);
      if (!name || !limit) return;
      const list = get();
      list.push({ name, limit, spent: 0 });
      set(list);
      form.reset();
      render();
    });

    return { render };
  })();

  // ---------------- Send / request (mock) ----------------
  const SendRequest = (function () {
    const tabs = document.querySelectorAll(".send-tabs button");
    const contactRow = document.getElementById("contactRow");
    const amountEl = document.getElementById("sendAmount");
    const noteEl = document.getElementById("sendNote");
    const btn = document.getElementById("sendBtn");
    const historyEl = document.getElementById("txHistory");
    const CONTACTS = ["Alex", "Sam", "Priya", "Jordan", "Mom"];
    let mode = "send";
    let activeContact = CONTACTS[0];

    function get() {
      try { return JSON.parse(localStorage.getItem("yakton_tx") || "[]"); }
      catch { return []; }
    }
    function set(list) { localStorage.setItem("yakton_tx", JSON.stringify(list.slice(0, 20))); }

    function renderContacts() {
      contactRow.innerHTML = CONTACTS.map((c) =>
        `<button class="contact-chip${c === activeContact ? " active" : ""}" data-c="${c}" type="button">${c}</button>`
      ).join("");
      contactRow.querySelectorAll(".contact-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          activeContact = chip.dataset.c;
          renderContacts();
        });
      });
    }

    function renderHistory() {
      const list = get();
      if (!list.length) {
        historyEl.innerHTML = '<li class="tx-empty" style="list-style:none">No activity yet.</li>';
        return;
      }
      historyEl.innerHTML = list.map((t) => `
        <li>
          <span>${t.mode === "send" ? "→" : "←"} ${t.contact}${t.note ? " · " + t.note : ""}</span>
          <span class="tx-amt ${t.mode === "send" ? "out" : "in"} mono">${t.mode === "send" ? "-" : "+"}$${t.amount.toFixed(2)}</span>
        </li>`).join("");
    }

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.toggle("active", t === tab));
        mode = tab.dataset.mode;
        btn.textContent = mode === "send" ? "Send" : "Request";
      });
    });

    btn.addEventListener("click", () => {
      const amount = Number(amountEl.value);
      if (!amount || amount <= 0) return;
      const list = get();
      list.unshift({ mode, contact: activeContact, note: noteEl.value.trim(), amount });
      set(list);
      amountEl.value = "";
      noteEl.value = "";
      renderHistory();
    });

    return { init: () => { renderContacts(); renderHistory(); } };
  })();

  // ---------------- Currency converter ----------------
  const Converter = (function () {
    const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "MXN"];
    const amountEl = document.getElementById("convAmount");
    const fromEl = document.getElementById("convFrom");
    const toEl = document.getElementById("convTo");
    const swapBtn = document.getElementById("convSwap");
    const resultEl = document.getElementById("convResult");
    const rateEl = document.getElementById("convRate");

    fromEl.innerHTML = CURRENCIES.map((c) => `<option value="${c}">${c}</option>`).join("");
    toEl.innerHTML = CURRENCIES.map((c) => `<option value="${c}">${c}</option>`).join("");
    fromEl.value = "USD";
    toEl.value = "EUR";

    async function convert() {
      const amount = Number(amountEl.value) || 0;
      const from = fromEl.value, to = toEl.value;
      resultEl.textContent = "…";
      if (from === to) {
        resultEl.textContent = `${amount.toFixed(2)} ${to}`;
        rateEl.textContent = `1 ${from} = 1 ${to}`;
        return;
      }
      try {
        const res = await fetch(`https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`);
        const data = await res.json();
        const converted = data.rates[to];
        resultEl.textContent = `${converted.toFixed(2)} ${to}`;
        rateEl.textContent = `1 ${from} = ${(converted / (amount || 1)).toFixed(4)} ${to}`;
      } catch {
        resultEl.textContent = "Couldn't reach the rate service";
        rateEl.textContent = "";
      }
    }

    [amountEl, fromEl, toEl].forEach((el) => el.addEventListener("input", convert));
    swapBtn.addEventListener("click", () => {
      const f = fromEl.value;
      fromEl.value = toEl.value;
      toEl.value = f;
      convert();
    });

    return { init: convert };
  })();

  // ---------------- Price alerts ----------------
  const Alerts = (function () {
    const form = document.getElementById("alertForm");
    const symbolEl = document.getElementById("alertSymbol");
    const dirEl = document.getElementById("alertDir");
    const priceEl = document.getElementById("alertPrice");
    const listEl = document.getElementById("alertList");

    function get() {
      try { return JSON.parse(localStorage.getItem("yakton_alerts") || "[]"); }
      catch { return []; }
    }
    function set(list) { localStorage.setItem("yakton_alerts", JSON.stringify(list)); }

    async function render() {
      const list = get();
      if (!list.length) {
        listEl.innerHTML = '<li class="alert-empty" style="list-style:none">No alerts set.</li>';
        return;
      }
      listEl.innerHTML = "";
      for (const a of list) {
        let current = null;
        try { current = (await window.YaktonStocks.getQuote(a.symbol)).price; } catch {}
        const triggered = current != null && (a.dir === "above" ? current >= a.price : current <= a.price);
        if (triggered && !a.notified) {
          a.notified = true;
          set(list);
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`Yakton alert: ${a.symbol}`, { body: `${a.symbol} is ${a.dir} $${a.price}` });
          }
        }
        const li = document.createElement("li");
        li.className = triggered ? "triggered" : "";
        li.innerHTML = `
          <span>${a.symbol} ${a.dir} $${a.price.toFixed(2)}${current != null ? ` <span class="mono" style="color:var(--text-faint)">(now $${current.toFixed(2)})</span>` : ""}${triggered ? " ✓" : ""}</span>
          <button class="alert-remove" aria-label="Remove alert">×</button>`;
        li.querySelector(".alert-remove").addEventListener("click", () => {
          set(get().filter((x) => x !== a));
          render();
        });
        listEl.appendChild(li);
      }
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const symbol = symbolEl.value.trim().toUpperCase();
      const price = Number(priceEl.value);
      if (!symbol || !price) return;
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
      const list = get();
      list.push({ symbol, dir: dirEl.value, price, notified: false });
      set(list);
      form.reset();
      render();
    });

    return { render };
  })();

  function onShow() {
    Budget.render();
    Alerts.render();
  }

  document.addEventListener("DOMContentLoaded", () => {
    Budget.render();
    SendRequest.init();
    Converter.init();
    Alerts.render();
  });

  window.YaktonWallet = { onShow };
})();
