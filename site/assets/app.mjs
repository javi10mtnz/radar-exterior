// Navegador: recarga los datos, aplica filtros, refresca cada pocos minutos y gestiona "Mi panel".
import * as R from "./render.mjs";
import { initAccount } from "./account.mjs";

const BASE = window.RADAR?.base || "";
const FILES = ["fx", "electricity", "chokepoints", "alerts", "tenders", "commodities"];
const REFRESH_MS = 5 * 60 * 1000;
const D = {};
let COUNTRIES = [];
const cName = (iso2) => COUNTRIES.find((c) => c.iso2 === iso2)?.name || iso2;

// ---------- preferencias ----------
const PREF_KEY = "radar-exterior:panel";
let prefs = { countries: [], sectors: [], types: [] };
let hasPrefs = false;
try {
  const p = JSON.parse(localStorage.getItem(PREF_KEY) || "null");
  if (p && Array.isArray(p.countries)) { prefs = p; hasPrefs = true; }
} catch {}
const storeLocal = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch {} };

// ---------- datos ----------
async function loadAll() {
  const t = Math.floor(Date.now() / 60000);
  await Promise.all([
    ...FILES.map(async (f) => {
      try {
        const r = await fetch(`${BASE}/data/${f}.json?t=${t}`, { cache: "no-store" });
        if (r.ok) D[f] = await r.json();
      } catch {}
    }),
    COUNTRIES.length ? null : fetch(`${BASE}/data/countries.json`).then((r) => r.json()).then((c) => (COUNTRIES = c)).catch(() => {}),
  ]);
}

// ---------- pintado ----------
const RENDER = {
  summary: () => R.summary(D),
  fx: (o) => R.fxTable(D.fx, o),
  commodities: (o) => R.commodities(D.commodities, o),
  chokepoints: (o) => R.chokepoints(D.chokepoints, o),
  electricity: () => R.electricity(D.electricity),
  alerts: (o) => R.alerts(D.alerts, o, { limit: o.limit, countryName: cName }),
  tenders: (o) => R.tenders(D.tenders, o, { limit: o.limit }),
};

function activeChips(section, group) {
  const box = section?.querySelector(`[data-filter="${group}"]`);
  return box ? [...box.querySelectorAll('[aria-pressed="true"]')].map((b) => b.dataset.k) : [];
}

function optionsFor(el) {
  const o = JSON.parse(el.dataset.o || "{}");
  const mine = el.dataset.mine;
  if (mine === "all") Object.assign(o, { countries: prefs.countries, sectors: prefs.sectors, types: prefs.types });
  if (mine === "sectors") o.sectors = prefs.sectors;
  if (mine === "fx") {
    const curs = [...new Set(COUNTRIES.filter((c) => prefs.countries.includes(c.iso2)).map((c) => c.cur))].filter((c) => c !== "EUR");
    if (curs.length) o.symbols = curs;
  }
  const section = el.closest(".panel");
  for (const g of ["types", "sectors"]) {
    const sel = activeChips(section, g);
    if (sel.length) o[g] = o[g]?.length ? o[g].filter((x) => sel.includes(x)) : sel;
  }
  return o;
}

function renderAll() {
  document.querySelectorAll("[data-r]").forEach((el) => {
    const fn = RENDER[el.dataset.r];
    if (fn && !el.closest("[hidden]")) el.innerHTML = fn(optionsFor(el));
  });
  relativeTimes();
}

function relativeTimes() {
  const now = Date.now();
  document.querySelectorAll(".stamp[data-time]").forEach((s) => {
    const m = Math.round((now - new Date(s.dataset.time)) / 60000);
    s.textContent = m < 1 ? "Actualizado ahora" : m < 60 ? `Actualizado hace ${m} min` : m < 48 * 60 ? `Actualizado hace ${Math.round(m / 60)} h` : `Actualizado hace ${Math.round(m / 1440)} días`;
  });
}

// ---------- filtros ----------
document.addEventListener("click", (e) => {
  const chip = e.target.closest("[data-filter] .chip");
  if (!chip) return;
  chip.setAttribute("aria-pressed", chip.getAttribute("aria-pressed") !== "true");
  const section = chip.closest(".panel");
  section.querySelectorAll("[data-r]").forEach((el) => (el.innerHTML = RENDER[el.dataset.r](optionsFor(el))));
  relativeTimes();
});

// ---------- Mi panel ----------
const setup = document.getElementById("setup");
let account = null;

function paintPrefs() {
  if (!setup) return;
  setup.querySelectorAll("[data-pref]").forEach((box) => {
    const sel = prefs[box.dataset.pref] || [];
    box.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-pressed", sel.includes(b.dataset.k)));
  });
  const n = prefs.countries.length + prefs.sectors.length + prefs.types.length;
  document.getElementById("pref-summary").textContent = n ? `${prefs.countries.length} mercados · ${prefs.sectors.length} sectores · ${prefs.types.length} tipos de alerta` : "Sin configurar";
  document.getElementById("mine").hidden = !hasPrefs;
}

if (setup) {
  setup.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-pref] .chip");
    if (!chip) return;
    chip.setAttribute("aria-pressed", chip.getAttribute("aria-pressed") !== "true");
    document.getElementById("save-msg").textContent = "";
  });
  document.getElementById("save").addEventListener("click", async () => {
    const read = (k) => [...setup.querySelectorAll(`[data-pref="${k}"] [aria-pressed="true"]`)].map((b) => b.dataset.k);
    prefs = { countries: read("countries"), sectors: read("sectors"), types: read("types") };
    hasPrefs = true;
    storeLocal();
    const msg = document.getElementById("save-msg");
    msg.classList.remove("err");
    msg.textContent = "Guardado en este navegador";
    if (account?.signedIn()) {
      try { await account.save(prefs); msg.textContent = "Guardado en tu cuenta"; }
      catch { msg.classList.add("err"); msg.textContent = "Guardado solo en este navegador. No se pudo guardar en tu cuenta."; }
    }
    paintPrefs();
    renderAll();
    document.getElementById("mine").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });
  paintPrefs();
  initAccount(window.RADAR_CONFIG || {}, document.getElementById("acct"), (remote) => {
    if (remote) { prefs = remote; hasPrefs = true; storeLocal(); paintPrefs(); renderAll(); }
  }).then((a) => (account = a));
}

// ---------- arranque ----------
await loadAll();
renderAll();
setInterval(async () => { await loadAll(); renderAll(); }, REFRESH_MS);
setInterval(relativeTimes, 30000);
