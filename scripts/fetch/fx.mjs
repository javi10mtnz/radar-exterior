// Tipos de cambio de referencia del BCE (vía Frankfurter, gratis y sin clave).
// El BCE publica una vez al día laborable, hacia las 16:00 CET.
import { fetchJson, isoDay } from "../lib.mjs";
import { FX_SYMBOLS } from "../config.mjs";

export const meta = {
  file: "fx.json",
  source: "Banco Central Europeo (vía frankfurter.dev)",
  sourceUrl: "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.es.html",
  refresh: "Diaria (días laborables, ~16:00 CET)",
};

export async function run() {
  const start = new Date(Date.now() - 45 * 864e5);
  const url = `https://api.frankfurter.dev/v1/${isoDay(start)}..?base=EUR&symbols=${FX_SYMBOLS.join(",")}`;
  const ts = await fetchJson(url);
  const dates = Object.keys(ts.rates || {}).sort();
  if (!dates.length) throw new Error("Frankfurter no devolvió fechas");
  const last = dates[dates.length - 1];
  const prev = dates[dates.length - 2];
  const first30 = dates.find((d) => d >= isoDay(new Date(Date.now() - 30 * 864e5))) || dates[0];

  const pairs = FX_SYMBOLS.filter((s) => ts.rates[last]?.[s] != null).map((s) => {
    const v = ts.rates[last][s];
    const p = prev ? ts.rates[prev][s] : v;
    const m = ts.rates[first30][s];
    return {
      symbol: s,
      pair: `EUR/${s}`,
      value: v,
      change1d: p ? ((v - p) / p) * 100 : 0,
      change30d: m ? ((v - m) / m) * 100 : 0,
      history: dates.map((d) => ts.rates[d][s]),
    };
  });
  return { date: last, dates, pairs };
}
