// Precio de la electricidad en España (Red Eléctrica, REData). Gratis y sin clave.
import { fetchJson } from "../lib.mjs";

export const meta = {
  file: "electricity.json",
  source: "Red Eléctrica (REData)",
  sourceUrl: "https://www.ree.es/es/datos/apidatos",
  refresh: "Horaria (mercado spot publicado el día anterior)",
};

function madridDay(offsetDays) {
  const d = new Date(Date.now() + offsetDays * 864e5);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(d);
}

export async function run() {
  const start = madridDay(-7);
  const end = madridDay(1); // el precio de mañana se publica sobre las 13:00
  const url = `https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real?start_date=${start}T00:00&end_date=${end}T23:59&time_trunc=hour`;
  const j = await fetchJson(url);
  const spot = (j.included || []).find((x) => x.id === "600") || (j.included || []).find((x) => /spot/i.test(x.type || ""));
  if (!spot) throw new Error("REE: no aparece la serie spot");

  // La serie spot puede venir en tramos de 15 min: agregamos a media diaria y horaria.
  const vals = spot.attributes.values.map((v) => ({ t: v.datetime, v: v.value }));
  const byDay = {};
  for (const x of vals) (byDay[x.t.slice(0, 10)] ||= []).push(x.v);
  const days = Object.keys(byDay).sort().map((d) => ({ date: d, avg: byDay[d].reduce((a, b) => a + b, 0) / byDay[d].length, min: Math.min(...byDay[d]), max: Math.max(...byDay[d]) }));

  const today = madridDay(0);
  const todayRow = days.find((d) => d.date === today) || days[days.length - 1];
  const prevRow = days[days.indexOf(todayRow) - 1];
  const tomorrow = days.find((d) => d.date === madridDay(1)) || null;

  const hourly = {};
  for (const x of vals.filter((x) => x.t.startsWith(todayRow.date))) {
    const h = x.t.slice(11, 13);
    (hourly[h] ||= []).push(x.v);
  }
  return {
    unit: "€/MWh",
    today: todayRow,
    change1d: prevRow ? ((todayRow.avg - prevRow.avg) / prevRow.avg) * 100 : 0,
    tomorrow,
    days,
    hours: Object.keys(hourly).sort().map((h) => ({ h, v: hourly[h].reduce((a, b) => a + b, 0) / hourly[h].length })),
  };
}
