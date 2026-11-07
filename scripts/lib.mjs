import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { COUNTRIES, SECTORS, HIGH_IMPACT } from "./config.mjs";

const UA = "RadarExterior/0.1 (+https://github.com/; datos abiertos de comercio exterior)";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchJson(url, { method = "GET", body, headers = {}, timeout = 30000, retries = 2 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, {
        method,
        headers: { "User-Agent": UA, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}), ...headers },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`Respuesta no JSON: ${text.slice(0, 200)}`);
      }
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await sleep(3000 * (attempt + 1));
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr;
}

export async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

export async function writeJson(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 1));
}

// ---------- clasificación de texto ----------
const LETTER = "a-z0-9áéíóúñüç";
function kwRegex(kw) {
  const strict = kw.endsWith(" ");
  const k = kw.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Palabras cortas o marcadas con espacio final: palabra completa. Resto: prefijo (raíz).
  return new RegExp(`(^|[^${LETTER}])${k}${strict || k.length <= 3 ? `(?![${LETTER}])` : ""}`, "i");
}
const countryRx = COUNTRIES.map((c) => ({ iso2: c.iso2, rx: c.kw.map(kwRegex) }));
const sectorRx = SECTORS.map((s) => ({ id: s.id, rx: s.kw.map(kwRegex) }));
const highRx = HIGH_IMPACT.map(kwRegex);

export function detectCountries(text) {
  return countryRx.filter((c) => c.rx.some((r) => r.test(text))).map((c) => c.iso2);
}
export function detectSectors(text) {
  return sectorRx.filter((s) => s.rx.some((r) => r.test(text))).map((s) => s.id);
}
export function severity(text, nCountries) {
  const hits = highRx.filter((r) => r.test(text)).length;
  if (hits >= 2 || (hits >= 1 && nCountries >= 2)) return "alta";
  if (hits === 1 || nCountries >= 2) return "media";
  return "baja";
}

// Normaliza un titular para detectar duplicados.
export function titleKey(t) {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 8)
    .sort()
    .join(" ");
}

export const isoDay = (d) => d.toISOString().slice(0, 10);
