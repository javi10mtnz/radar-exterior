// Licitaciones públicas abiertas en Europa (TED, Diario Oficial de la UE). API gratuita y sin clave.
import { fetchJson, sleep } from "../lib.mjs";
import { SECTORS, COUNTRIES } from "../config.mjs";

export const meta = {
  file: "tenders.json",
  source: "TED – Tenders Electronic Daily (Oficina de Publicaciones de la UE)",
  sourceUrl: "https://ted.europa.eu/",
  refresh: "Diaria (TED publica de lunes a viernes)",
};

const API = "https://api.ted.europa.eu/v3/notices/search";
const FULL_FIELDS = [
  "publication-number",
  "notice-title",
  "buyer-name",
  "buyer-country",
  "classification-cpv",
  "publication-date",
  "deadline-receipt-tender-date-lot",
  "estimated-value-proc",
  "estimated-value-cur-proc",
];
const MIN_FIELDS = ["publication-number", "notice-title", "buyer-country", "classification-cpv", "publication-date"];

const ISO3 = Object.fromEntries(COUNTRIES.filter((c) => c.iso3).map((c) => [c.iso3, c]));
const ISO3_NAMES = { ESP: "España", NLD: "Países Bajos", BEL: "Bélgica", AUT: "Austria", POL: "Polonia", SWE: "Suecia", DNK: "Dinamarca", FIN: "Finlandia", IRL: "Irlanda", GRC: "Grecia", CZE: "Chequia", ROU: "Rumanía", HUN: "Hungría", BGR: "Bulgaria", HRV: "Croacia", SVK: "Eslovaquia", SVN: "Eslovenia", LTU: "Lituania", LVA: "Letonia", EST: "Estonia", LUX: "Luxemburgo", MLT: "Malta", CYP: "Chipre", NOR: "Noruega", ISL: "Islandia", LIE: "Liechtenstein" };

// Los campos de TED llegan como texto, lista o diccionario por idioma. Esto los aplana.
function pick(v, langs = ["spa", "eng", "fra", "deu"]) {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return pick(v[0], langs);
  for (const l of langs) if (v[l] != null) return pick(v[l], langs);
  const first = Object.values(v)[0];
  return pick(first, langs);
}
const list = (v) => (v == null ? [] : Array.isArray(v) ? v.map((x) => pick(x)) : [pick(v)]);
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");

async function search(body) {
  try {
    return await fetchJson(API, { method: "POST", body, retries: 1 });
  } catch (e) {
    // Si algún campo opcional no existe, TED responde 400: reintentamos con los campos mínimos.
    if (/HTTP 400/.test(e.message) && body.fields !== MIN_FIELDS) return search({ ...body, fields: MIN_FIELDS });
    throw e;
  }
}

export async function run() {
  const since = new Date(Date.now() - 3 * 864e5);
  const raw = [];
  let token;
  for (let page = 0; page < 4; page++) {
    const body = {
      query: `publication-date>=${ymd(since)}`,
      fields: FULL_FIELDS,
      limit: 250,
      scope: "ACTIVE",
      paginationMode: "ITERATION",
      ...(token ? { iterationNextToken: token } : {}),
    };
    const j = await search(body);
    raw.push(...(j.notices || []));
    token = j.iterationNextToken;
    if (!token || !(j.notices || []).length) break;
    await sleep(1500);
  }
  if (!raw.length) throw new Error("TED no devolvió anuncios");

  const now = Date.now();
  const items = raw
    .map((n) => {
      const cpv = list(n["classification-cpv"]);
      const sectors = SECTORS.filter((s) => cpv.some((c) => s.cpv.some((p) => c.startsWith(p)))).map((s) => s.id);
      const country = list(n["buyer-country"])[0] || "";
      const deadlineRaw = list(n["deadline-receipt-tender-date-lot"]).sort()[0] || "";
      const deadline = deadlineRaw ? deadlineRaw.slice(0, 10) : "";
      const value = Number(pick(n["estimated-value-proc"])) || null;
      const pub = n["publication-number"];
      return {
        id: pub,
        title: pick(n["notice-title"]).replace(/\s+/g, " ").trim(),
        buyer: pick(n["buyer-name"]),
        country,
        countryName: ISO3[country]?.name || ISO3_NAMES[country] || country,
        countryIso2: ISO3[country]?.iso2 || null,
        cpv: cpv.slice(0, 3),
        sectors,
        published: pick(n["publication-date"]).slice(0, 10),
        deadline,
        value,
        currency: pick(n["estimated-value-cur-proc"]) || "EUR",
        url: `https://ted.europa.eu/es/notice/-/detail/${pub}`,
      };
    })
    .filter((t) => t.title && t.sectors.length && (!t.deadline || new Date(t.deadline).getTime() > now));

  // Por sector, priorizamos las de mayor importe y luego las que cierran antes.
  const bySector = {};
  for (const s of SECTORS) {
    bySector[s.id] = items
      .filter((t) => t.sectors.includes(s.id))
      .sort((a, b) => (b.value || 0) - (a.value || 0) || (a.deadline || "9").localeCompare(b.deadline || "9"))
      .slice(0, 25);
  }
  const keep = new Map();
  Object.values(bySector).flat().forEach((t) => keep.set(t.id, t));
  return { scanned: raw.length, items: [...keep.values()] };
}
