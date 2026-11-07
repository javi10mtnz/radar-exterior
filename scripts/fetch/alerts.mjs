// Alertas de comercio exterior a partir de noticias de todo el mundo (GDELT DOC 2.0). Gratis y sin clave.
// GDELT se actualiza cada 15 minutos. Pide no lanzar más de una consulta cada 5 segundos.
import { fetchJson, sleep, detectCountries, detectSectors, severity, titleKey, readJson } from "../lib.mjs";
import { ALERT_QUERIES } from "../config.mjs";

export const meta = {
  file: "alerts.json",
  source: "GDELT Project (noticias de todo el mundo)",
  sourceUrl: "https://www.gdeltproject.org/",
  refresh: "Cada 15–30 minutos",
};

const LANGS = ["english", "spanish"];
const KEEP_DAYS = 7;
const MAX_ALERTS = 400;

function parseSeen(s) {
  // 20261106T153000Z -> ISO
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(s || "");
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : new Date().toISOString();
}

export async function run({ dataDir }) {
  const previous = (await readJson(`${dataDir}/alerts.json`, null))?.data?.items || [];
  const fresh = [];
  let ok = 0;
  const errors = [];

  for (const [type, q] of Object.entries(ALERT_QUERIES)) {
    for (const lang of LANGS) {
      const params = new URLSearchParams({
        query: `${q} sourcelang:${lang}`,
        mode: "artlist",
        format: "json",
        maxrecords: "75",
        timespan: "24h",
        sort: "datedesc",
      });
      try {
        const j = await fetchJson(`https://api.gdeltproject.org/api/v2/doc/doc?${params}`, { retries: 1 });
        ok++;
        for (const a of j.articles || []) {
          const title = (a.title || "").replace(/\s+/g, " ").trim();
          if (title.length < 25) continue;
          const countries = detectCountries(title);
          const sectors = detectSectors(title);
          fresh.push({
            id: titleKey(title),
            type,
            title,
            url: a.url,
            domain: a.domain,
            lang: lang === "spanish" ? "es" : "en",
            sourceCountry: a.sourcecountry || "",
            at: parseSeen(a.seendate),
            countries,
            sectors,
            severity: severity(title, countries.length),
          });
        }
      } catch (e) {
        errors.push(`${type}/${lang}: ${e.message}`);
      }
      await sleep(5500);
    }
  }
  if (!ok) throw new Error(`GDELT no respondió: ${errors.slice(0, 3).join(" | ")}`);

  // Unimos con el histórico, quitamos duplicados y lo que tenga más de KEEP_DAYS días.
  const cutoff = Date.now() - KEEP_DAYS * 864e5;
  const seen = new Set();
  const items = [...fresh, ...previous]
    .filter((a) => new Date(a.at).getTime() >= cutoff)
    .sort((a, b) => b.at.localeCompare(a.at))
    .filter((a) => {
      const k = a.id || a.url;
      if (seen.has(k) || seen.has(a.url)) return false;
      seen.add(k);
      seen.add(a.url);
      return true;
    })
    // Solo nos quedamos con noticias que podemos ubicar en al menos un país o sector.
    .filter((a) => a.countries.length || a.sectors.length)
    .slice(0, MAX_ALERTS);

  return { items, partialErrors: errors };
}
