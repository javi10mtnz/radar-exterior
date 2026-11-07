// Prueba los recolectores sin conexión: sustituye fetch por respuestas con el mismo formato que las APIs reales
// y guarda el resultado en test/fixtures (datos de PRUEBA, inventados, solo para desarrollo).
// Uso: node test/mock-run.mjs
import { writeJson } from "../scripts/lib.mjs";
import * as fx from "../scripts/fetch/fx.mjs";
import * as chokepoints from "../scripts/fetch/chokepoints.mjs";
import * as electricity from "../scripts/fetch/electricity.mjs";
import * as alerts from "../scripts/fetch/alerts.mjs";
import * as tenders from "../scripts/fetch/tenders.mjs";
import * as commodities from "../scripts/fetch/commodities.mjs";

const OUT = new URL("./fixtures", import.meta.url).pathname;
const day = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function frankfurter() {
  const base = { USD: 1.1165, GBP: 0.83415, CNY: 7.4485, JPY: 171.2, CHF: 0.931, MXN: 20.8828, BRL: 6.31, INR: 97.4, TRY: 47.9, KRW: 1598, CAD: 1.561, ZAR: 20.1, SEK: 11.02, PLN: 4.27 };
  const rates = {};
  for (let i = 44; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    if ([0, 6].includes(d.getUTCDay())) continue;
    rates[d.toISOString().slice(0, 10)] = Object.fromEntries(Object.entries(base).map(([k, v]) => [k, +(v * (1 + (rnd() - 0.5) * 0.02 + (44 - i) * 0.0002)).toFixed(4)]));
  }
  return { amount: 1, base: "EUR", start_date: Object.keys(rates)[0], end_date: day(0), rates };
}
function portwatch() {
  const names = { chokepoint1: "Suez Canal", chokepoint2: "Panama Canal", chokepoint3: "Bab el-Mandeb Strait", chokepoint4: "Strait of Hormuz", chokepoint5: "Gibraltar Strait", chokepoint6: "Malacca Strait", chokepoint7: "Cape of Good Hope", chokepoint8: "Korea Strait" };
  const lvl = { chokepoint1: 43, chokepoint2: 32, chokepoint3: 30, chokepoint4: 120, chokepoint5: 280, chokepoint6: 230, chokepoint7: 75, chokepoint8: 190 };
  const features = [];
  for (let i = 125; i >= 4; i--) for (const [id, n] of Object.entries(names)) {
    const drop = id === "chokepoint3" && i < 10 ? 0.6 : id === "chokepoint4" && i < 10 ? 0.84 : 1;
    const t = Math.round(lvl[id] * drop * (0.9 + rnd() * 0.2));
    features.push({ attributes: { date: Date.parse(day(i) + "T00:00:00Z"), portid: id, portname: n, n_total: t, n_container: Math.round(t * 0.3), n_tanker: Math.round(t * 0.4), n_cargo: Math.round(t * 0.6), capacity: t * 30000 } });
  }
  return { features, exceededTransferLimit: false };
}
function ree() {
  const vals = [];
  for (let d = 7; d >= -1; d--) for (let h = 0; h < 24; h++) {
    const date = day(d);
    const v = 60 + 50 * Math.sin(((h - 6) / 24) * Math.PI * 2) * -1 + rnd() * 20 + (d < 0 ? 10 : 0);
    vals.push({ value: +Math.max(5, v).toFixed(2), percentage: 1, datetime: `${date}T${String(h).padStart(2, "0")}:00:00.000+01:00` });
  }
  return { data: { type: "Precios mercado peninsular en tiempo real", id: "mer13", attributes: {} }, included: [{ type: "PVPC", id: "1001", attributes: { values: vals } }, { type: "Precio mercado spot", id: "600", attributes: { values: vals } }] };
}
const HEADLINES = {
  arancel: ["US weighs new tariffs on European olive oil and table olives", "México eleva los aranceles a importaciones de acero de países sin tratado", "China extends anti-dumping duties on EU pork for five more years", "India considers cutting import duty on European wine"],
  sancion: ["EU adopts new sanctions package against Russia targeting shipping", "OFAC adds 18 tankers to sanctions list over Iran oil trade", "China expands export controls on gallium and germanium"],
  logistica: ["Port strike at Tanger Med delays refrigerated cargo", "Red Sea shipping disruption keeps container freight rates high", "Huelga portuaria en Rotterdam amenaza los envíos de contenedores"],
  regulacion: ["EU and Mercosur trade agreement clears key vote", "UK extends border checks on EU meat and dairy imports", "Chile y la Unión Europea amplían el acuerdo comercial a productos agrícolas"],
  divisa: ["Turkish lira slumps to record low against euro", "Mexican peso exchange rate jumps after central bank decision"],
  geo: ["Trade war fears rise as US and China trade threats over chips", "Supply chain for lithium batteries tightens in Germany"],
};
function gdelt(url) {
  const q = new URL(url).searchParams.get("query");
  const [type] = Object.entries(alerts.meta ? {} : {}).length ? [] : Object.entries(HEADLINES).find(([t]) => q.includes({ arancel: "tariff", sancion: "sanctions", logistica: "port strike", regulacion: "trade agreement", divisa: "devaluation", geo: "trade war" }[t])) || [];
  if (q.includes("spanish")) return { articles: [] };
  return { articles: (HEADLINES[type] || []).map((title, i) => ({ url: `https://example.com/${type}/${i}`, title, seendate: new Date(Date.now() - (i * 5 + 1) * 3600e3).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z", domain: "example.com", language: "English", sourcecountry: "Spain" })) };
}
function ted() {
  const mk = (n, title, country, cpv, value, dl) => ({ "publication-number": `${n}-2026`, "notice-title": { eng: title, spa: title }, "buyer-name": { spa: ["Organismo de prueba"] }, "buyer-country": [country], "classification-cpv": [cpv], "publication-date": `${day(1)}+01:00`, "deadline-receipt-tender-date-lot": [`${day(-dl)}+01:00`], "estimated-value-proc": value, "estimated-value-cur-proc": "EUR" });
  return { notices: [mk(700001, "Suministro de aceite de oliva para comedores escolares", "ESP", "15411100", 420000, 20), mk(700002, "Fourniture de viande et charcuterie", "FRA", "15100000", 1200000, 25), mk(700003, "Lieferung von Elektrofahrzeugen", "DEU", "34144900", 3500000, 30), mk(700004, "Servizi di trasporto merci su strada", "ITA", "60161000", 900000, 15), mk(700005, "Paneles fotovoltaicos para edificios públicos", "PRT", "09331200", 650000, 18), mk(700006, "Laboratory equipment", "NLD", "38000000", 80000, 10)], totalNoticeCount: 6 };
}
function fred(url) {
  const id = new URL(url).searchParams.get("series_id");
  const base = { DCOILBRENTEU: 64, PNGASEUUSDM: 11.2, PWHEAMTUSDM: 228, PMAIZMTUSDM: 205, POLVOILUSDM: 6205, PSUGAISAUSDM: 16.8, PCOPPUSDM: 10420, PALUMUSDM: 2680 }[id];
  return { observations: Array.from({ length: 40 }, (_, i) => ({ date: id === "DCOILBRENTEU" ? day(i) : `2026-${String(Math.max(1, 9 - Math.floor(i))).padStart(2, "0")}-01`, value: String(+(base * (1 + (rnd() - 0.5) * 0.08)).toFixed(2)) })) };
}

globalThis.fetch = async (url, init) => {
  const u = String(url);
  const body = u.includes("frankfurter") ? frankfurter() : u.includes("arcgis") ? portwatch() : u.includes("ree.es") ? ree() : u.includes("gdelt") ? gdelt(u) : u.includes("ted.europa") ? ted() : u.includes("stlouisfed") ? fred(u) : null;
  if (!body) return new Response("not mocked", { status: 404 });
  return new Response(JSON.stringify(body), { status: 200 });
};
// Sin esperas en las pruebas
globalThis.setTimeout = ((orig) => (fn, ms, ...a) => orig(fn, Math.min(ms, 1), ...a))(globalThis.setTimeout);
process.env.FRED_API_KEY ||= "prueba";

for (const [name, mod] of Object.entries({ fx, chokepoints, electricity, alerts, tenders, commodities })) {
  const data = await mod.run({ dataDir: OUT + "/none" });
  await writeJson(`${OUT}/${mod.meta.file}`, { updatedAt: new Date(Date.now() - 12 * 60000).toISOString(), ...mod.meta, data, _prueba: "Datos inventados para desarrollo" });
  const n = data.pairs?.length ?? data.points?.length ?? data.items?.length ?? data.days?.length;
  console.log(`✔ ${name}: ${n} elementos`);
}
await writeJson(`${OUT}/status.json`, {});
