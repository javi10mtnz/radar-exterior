// Descarga todas las fuentes y guarda un JSON por fuente en /data.
// Si una fuente falla, se conserva el último dato bueno y se anota en data/status.json.
// Uso: node scripts/fetch-all.mjs            (todas)
//      node scripts/fetch-all.mjs fx alerts  (solo algunas)
import { readJson, writeJson } from "./lib.mjs";
import * as fx from "./fetch/fx.mjs";
import * as chokepoints from "./fetch/chokepoints.mjs";
import * as electricity from "./fetch/electricity.mjs";
import * as alerts from "./fetch/alerts.mjs";
import * as tenders from "./fetch/tenders.mjs";
import * as commodities from "./fetch/commodities.mjs";

const DATA = new URL("../data", import.meta.url).pathname;
const SOURCES = { fx, chokepoints, electricity, alerts, tenders, commodities };

const only = process.argv.slice(2);
const status = (await readJson(`${DATA}/status.json`, {})) || {};

for (const [name, mod] of Object.entries(SOURCES)) {
  if (only.length && !only.includes(name)) continue;
  const t0 = Date.now();
  try {
    const data = await mod.run({ dataDir: DATA });
    const updatedAt = new Date().toISOString();
    await writeJson(`${DATA}/${mod.meta.file}`, { updatedAt, ...mod.meta, data });
    status[name] = { ok: true, updatedAt, ms: Date.now() - t0, ...(data.partialErrors?.length ? { warnings: data.partialErrors.length } : {}) };
    console.log(`✔ ${name} (${Date.now() - t0} ms)`);
  } catch (e) {
    const skipped = /^SKIP:/.test(e.message);
    status[name] = { ...(status[name] || {}), ok: false, skipped, error: e.message.slice(0, 300), failedAt: new Date().toISOString() };
    console.log(`${skipped ? "–" : "✖"} ${name}: ${e.message}`);
  }
}
await writeJson(`${DATA}/status.json`, status);

// Falla el proceso solo si no hay ninguna fuente con datos, para que GitHub avise.
const anyOk = Object.values(status).some((s) => s.ok || s.updatedAt);
if (!anyOk) process.exit(1);
