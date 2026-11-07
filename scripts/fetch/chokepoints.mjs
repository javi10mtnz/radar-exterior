// Tránsito diario de buques por los pasos marítimos clave (IMF PortWatch, FMI + Univ. de Oxford).
// Datos abiertos, calculados a partir de señales AIS. Suelen ir con unos días de retraso.
import { fetchJson, sleep } from "../lib.mjs";

const LAYER = "https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query";

export const meta = {
  file: "chokepoints.json",
  source: "IMF PortWatch (FMI y Universidad de Oxford)",
  sourceUrl: "https://portwatch.imf.org/",
  refresh: "Diaria, con varios días de retraso",
};

// Nombres en español para los pasos más relevantes. Los demás se muestran con su nombre original.
// Se busca por palabra clave para no depender del nombre exacto que use PortWatch.
const ES = [
  ["suez", "Canal de Suez"],
  ["panama", "Canal de Panamá"],
  ["mandeb", "Bab el-Mandeb (Mar Rojo)"],
  ["hormuz", "Estrecho de Ormuz"],
  ["gibraltar", "Estrecho de Gibraltar"],
  ["malacca", "Estrecho de Malaca"],
  ["good hope", "Cabo de Buena Esperanza"],
  ["bosporus", "Estrecho del Bósforo"],
  ["dover", "Paso de Calais"],
  ["taiwan", "Estrecho de Taiwán"],
];
const esName = (n) => (ES.find(([k]) => n.toLowerCase().includes(k)) || [])[1];

export async function run() {
  // Últimos ~120 días, paginando (el servicio limita registros por petición).
  const since = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10);
  const rows = [];
  for (let offset = 0; offset < 20000; offset += 2000) {
    const params = new URLSearchParams({
      where: `date >= DATE '${since}'`,
      outFields: "date,portid,portname,n_total,n_container,n_tanker,n_cargo,capacity",
      orderByFields: "date ASC",
      resultOffset: String(offset),
      resultRecordCount: "2000",
      f: "json",
    });
    const j = await fetchJson(`${LAYER}?${params}`);
    if (j.error) throw new Error(`PortWatch: ${j.error.message}`);
    rows.push(...(j.features || []).map((f) => f.attributes));
    if (!j.exceededTransferLimit) break;
    await sleep(1500);
  }
  if (!rows.length) throw new Error("PortWatch no devolvió datos");

  const by = {};
  for (const r of rows) {
    const name = r.portname || r.portid;
    (by[name] ||= []).push({ date: new Date(r.date).toISOString().slice(0, 10), total: r.n_total ?? 0, container: r.n_container ?? 0, tanker: r.n_tanker ?? 0 });
  }

  const points = Object.entries(by).map(([name, series]) => {
    series.sort((a, b) => a.date.localeCompare(b.date));
    const last7 = series.slice(-7);
    const base = series.slice(-97, -7); // ~3 meses previos como referencia
    const avg = (a, k) => (a.length ? a.reduce((s, x) => s + x[k], 0) / a.length : 0);
    const now = avg(last7, "total");
    const ref = avg(base, "total");
    const delta = ref ? ((now - ref) / ref) * 100 : 0;
    const status = delta <= -30 ? "crit" : delta <= -12 ? "warn" : "ok";
    return {
      name,
      nameEs: esName(name) || name,
      featured: Boolean(esName(name)),
      lastDate: series[series.length - 1].date,
      avg7: Math.round(now * 10) / 10,
      avgRef: Math.round(ref * 10) / 10,
      delta,
      status,
      containerAvg7: Math.round(avg(last7, "container") * 10) / 10,
      // Serie semanal para el gráfico
      weekly: series.slice(-84).reduce((acc, x, i) => {
        const w = Math.floor(i / 7);
        acc[w] = (acc[w] || 0) + x.total / 7;
        return acc;
      }, []).map((v) => Math.round(v * 10) / 10),
    };
  });
  points.sort((a, b) => (b.featured - a.featured) || a.delta - b.delta);
  return { points };
}
