// Precios de materias primas (FRED, Reserva Federal de St. Louis, con datos del FMI y de la EIA).
// Requiere una clave gratuita: https://fred.stlouisfed.org/docs/api/api_key.html  → secreto FRED_API_KEY
import { fetchJson, sleep } from "../lib.mjs";
import { COMMODITIES } from "../config.mjs";

export const meta = {
  file: "commodities.json",
  source: "FRED (Reserva Federal de St. Louis), con datos del FMI y la EIA",
  sourceUrl: "https://fred.stlouisfed.org/",
  refresh: "Brent diario; resto mensual",
  optional: true,
};

export async function run() {
  const key = process.env.FRED_API_KEY;
  if (!key) throw new Error("SKIP: falta FRED_API_KEY (opcional)");
  const items = [];
  for (const c of COMMODITIES) {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${c.id}&api_key=${key}&file_type=json&sort_order=desc&limit=40`;
    const j = await fetchJson(url);
    const obs = (j.observations || []).filter((o) => o.value !== ".").map((o) => ({ date: o.date, v: Number(o.value) })).reverse();
    if (obs.length < 2) continue;
    const last = obs[obs.length - 1];
    const prev = obs[obs.length - 2];
    items.push({ ...c, date: last.date, value: last.v, change: ((last.v - prev.v) / prev.v) * 100, history: obs.slice(-24).map((o) => o.v) });
    await sleep(600);
  }
  if (!items.length) throw new Error("FRED no devolvió series");
  return { items };
}
