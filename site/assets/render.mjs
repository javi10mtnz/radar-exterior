// Funciones de pintado compartidas entre el generador (Node) y el navegador.
// Reciben datos ya cargados y devuelven HTML. No tocan el DOM.

export const TYPES = { arancel: "Aranceles", sancion: "Sanciones", logistica: "Logística", regulacion: "Regulación", divisa: "Divisas", geo: "Geopolítica" };

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const num = (v, d = 2) => (v == null || Number.isNaN(v) ? "–" : Number(v).toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d }));
export const pct = (v, d = 2) => (v == null ? "" : `${v >= 0 ? "+" : "−"}${num(Math.abs(v), d)} %`);
const dir = (v) => (v > 0.0001 ? "up" : v < -0.0001 ? "down" : "flat");
const arrow = (v) => (v > 0.0001 ? "▲" : v < -0.0001 ? "▼" : "■");

export function dateEs(iso, withTime = false) {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? iso + "T12:00:00Z" : iso);
  const o = { day: "2-digit", month: "short", timeZone: "Europe/Madrid" };
  if (withTime) Object.assign(o, { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleString("es-ES", o).replace(",", "").replace(".", "");
}

export function spark(values, { w = 120, h = 32, trend } = {}) {
  const v = (values || []).filter((x) => x != null && !Number.isNaN(x));
  if (v.length < 2) return "";
  const mn = Math.min(...v), mx = Math.max(...v), r = mx - mn || 1;
  const pts = v.map((x, i) => [2 + (i / (v.length - 1)) * (w - 4), h - 3 - ((x - mn) / r) * (h - 6)]);
  const line = pts.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  const t = trend ?? dir(v[v.length - 1] - v[0]);
  return `<svg class="spark ${t}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polygon points="2,${h} ${line} ${lx.toFixed(1)},${h}"/><polyline points="${line}"/><circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="2.4"/></svg>`;
}

const empty = (msg) => `<p class="empty">${esc(msg)}</p>`;
const stamp = (src) => (src?.updatedAt ? `<span class="stamp" data-time="${src.updatedAt}">Actualizado ${dateEs(src.updatedAt, true)}</span>` : "");

// ---------- filtros ----------
const EU_TENDER = ["EU", "FR", "DE", "IT", "PT", "NL"];
export function matchAlert(a, f = {}) {
  const c = f.countries || [], s = f.sectors || [], t = f.types || [];
  if (t.length && !t.includes(a.type)) return false;
  if (c.length && !a.countries.some((x) => c.includes(x))) return false;
  if (s.length && !a.sectors.some((x) => s.includes(x))) return false;
  return true;
}
export function matchTender(t, f = {}) {
  const s = f.sectors || [], c = f.countries || [];
  if (s.length && !t.sectors.some((x) => s.includes(x))) return false;
  // TED solo cubre Europa: si no has elegido ningún país europeo, se filtra solo por sector.
  const eu = c.filter((x) => EU_TENDER.includes(x));
  if (!eu.length || eu.includes("EU")) return true;
  return eu.includes(t.countryIso2);
}

// ---------- bloques ----------
export function summary(d) {
  const tiles = [];
  const usd = d.fx?.data?.pairs?.find((p) => p.symbol === "USD");
  if (usd) tiles.push(["EUR/USD", num(usd.value, 4), usd.change1d, `BCE · ${dateEs(d.fx.data.date)}`]);
  const el = d.electricity?.data;
  if (el?.today) tiles.push(["Luz España hoy", `${num(el.today.avg, 1)} €/MWh`, el.change1d, el.tomorrow ? `Mañana ${num(el.tomorrow.avg, 1)} €/MWh` : "Media diaria spot"]);
  const brent = d.commodities?.data?.items?.find((c) => c.id === "DCOILBRENTEU");
  if (brent) tiles.push(["Brent", `${num(brent.value, 2)} $`, brent.change, dateEs(brent.date)]);
  const al = d.alerts?.data?.items || [];
  const day = al.filter((a) => Date.now() - new Date(a.at) < 864e5);
  if (al.length) tiles.push(["Alertas 24 h", String(day.length), null, `${day.filter((a) => a.severity === "alta").length} de impacto alto`]);
  const cp = (d.chokepoints?.data?.points || []).filter((p) => p.featured && p.status !== "ok");
  if (d.chokepoints) tiles.push(["Pasos marítimos", cp.length ? `${cp.length} con caída` : "Normal", null, cp.map((p) => p.nameEs).slice(0, 2).join(", ") || "Tráfico en niveles habituales"]);
  const tn = d.tenders?.data?.items?.length;
  if (tn) tiles.push(["Licitaciones UE", String(tn), null, "abiertas, recién publicadas"]);
  if (!tiles.length) return "";
  return `<div class="summary">${tiles.map(([k, v, c, sub]) => `<div class="tile"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span>${c != null ? `<span class="chg ${dir(c)}">${arrow(c)} ${pct(c)}</span>` : ""}<span class="sub">${esc(sub)}</span></div>`).join("")}</div>`;
}

export function fxTable(fx, { symbols } = {}) {
  const pairs = (fx?.data?.pairs || []).filter((p) => !symbols || symbols.includes(p.symbol));
  if (!pairs.length) return empty("Sin datos de divisas por ahora.");
  return `<div class="tw"><table class="fx"><thead><tr><th>Par</th><th class="num">Cambio</th><th class="num">Día</th><th class="num">30 días</th><th class="sp">Tendencia</th></tr></thead><tbody>${pairs
    .map((p) => `<tr><td><b>${p.pair}</b></td><td class="num">${num(p.value, p.value > 100 ? 2 : 4)}</td><td class="num ${dir(p.change1d)}">${pct(p.change1d)}</td><td class="num ${dir(p.change30d)}">${pct(p.change30d, 1)}</td><td class="sp">${spark(p.history.slice(-30))}</td></tr>`)
    .join("")}</tbody></table></div><p class="note">1 euro en cada divisa. Si sube, el euro se aprecia: tus ventas en esa divisa valen menos euros. ${stamp(fx)}</p>`;
}

export function electricity(el) {
  const d = el?.data;
  if (!d?.today) return empty("Sin datos de electricidad por ahora.");
  const max = Math.max(...d.hours.map((h) => h.v), 1);
  const bars = d.hours.map((h) => `<i style="height:${Math.max(4, (h.v / max) * 100).toFixed(0)}%" title="${h.h}:00 · ${num(h.v, 1)} €/MWh"></i>`).join("");
  return `<div class="elec"><div class="elec-n"><span class="v">${num(d.today.avg, 1)}</span><span class="u">€/MWh media hoy</span><span class="chg ${dir(d.change1d)}">${arrow(d.change1d)} ${pct(d.change1d, 1)} vs ayer</span><span class="sub">Mín ${num(d.today.min, 1)} · Máx ${num(d.today.max, 1)}${d.tomorrow ? ` · Mañana ${num(d.tomorrow.avg, 1)}` : ""}</span></div><div class="bars" role="img" aria-label="Precio por hora hoy">${bars}</div></div><p class="note">Mercado mayorista spot peninsular. ${stamp(el)}</p>`;
}

export function commodities(c, { sectors } = {}) {
  if (!c) return empty("Las materias primas se activan al añadir la clave gratuita de FRED (ver README).");
  const items = (c.data?.items || []).filter((x) => !sectors?.length || x.sectors.some((s) => sectors.includes(s)));
  if (!items.length) return empty("Sin materias primas para esta selección.");
  return `<div class="cards">${items
    .map((x) => `<div class="card"><span class="nm">${esc(x.name)}</span><span class="row"><span class="v">${num(x.value, x.value > 100 ? 0 : 2)}</span><span class="chg ${dir(x.change)}">${arrow(x.change)} ${pct(x.change, 1)}</span></span><span class="u">${esc(x.unit)} · ${x.freq} · ${dateEs(x.date)}</span>${spark(x.history, { w: 200, h: 36 })}</div>`)
    .join("")}</div><p class="note">El cambio es frente al dato anterior (día o mes). ${stamp(c)}</p>`;
}

const ST = { ok: ["Normal", "p-ok"], warn: ["Caída", "p-warn"], crit: ["Caída fuerte", "p-crit"] };
export function chokepoints(cp, { all = false } = {}) {
  const pts = (cp?.data?.points || []).filter((p) => all || p.featured);
  if (!pts.length) return empty("Sin datos de tráfico marítimo por ahora.");
  return `<div class="tw"><table><thead><tr><th>Paso</th><th>Estado</th><th class="num">Buques/día</th><th class="num">vs 3 meses</th><th class="sp">12 semanas</th></tr></thead><tbody>${pts
    .map((p) => `<tr><td><b>${esc(p.nameEs)}</b></td><td><span class="pill ${ST[p.status][1]}">${ST[p.status][0]}</span></td><td class="num">${num(p.avg7, 1)}</td><td class="num ${dir(p.delta)}">${pct(p.delta, 0)}</td><td class="sp">${spark(p.weekly, { trend: p.status === "ok" ? "flat" : "down" })}</td></tr>`)
    .join("")}</tbody></table></div><p class="note">Media de los últimos 7 días con datos (${dateEs(pts[0].lastDate)}), comparada con los 3 meses anteriores. ${stamp(cp)}</p>`;
}

export function alerts(al, f = {}, { limit = 40, countryName = (c) => c } = {}) {
  const items = (al?.data?.items || []).filter((a) => matchAlert(a, f));
  if (!al) return empty("Sin alertas por ahora.");
  if (!items.length) return empty("No hay alertas para esta selección en los últimos 7 días.");
  return `<ol class="wire">${items
    .slice(0, limit)
    .map((a) => `<li class="al"><span class="sev sev-${a.severity}" title="Impacto ${a.severity}"></span><div><div class="meta"><time datetime="${a.at}">${dateEs(a.at, true)}</time><span class="tp">${TYPES[a.type] || a.type}</span>${a.countries.slice(0, 3).map((c) => `<span class="cc">${esc(countryName(c))}</span>`).join("")}${a.lang === "en" ? '<span class="lang">EN</span>' : ""}</div><a class="h" href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.title)}</a><span class="src">${esc(a.domain)}</span></div></li>`)
    .join("")}</ol><p class="note">Titulares detectados automáticamente en medios de todo el mundo. Abre la fuente original antes de tomar decisiones. ${stamp(al)}</p>`;
}

export function tenders(tn, f = {}, { limit = 15 } = {}) {
  if (!tn) return empty("Sin licitaciones por ahora.");
  const items = (tn.data?.items || []).filter((t) => matchTender(t, f));
  if (!items.length) return empty("No hay licitaciones abiertas para esta selección.");
  return `<ul class="tenders">${items
    .slice(0, limit)
    .map((t) => `<li><a href="${esc(t.url)}" target="_blank" rel="noopener">${esc(t.title)}</a><span class="d">${esc(t.countryName)}${t.buyer ? ` · ${esc(t.buyer)}` : ""}${t.value ? ` · ${num(t.value, 0)} ${esc(t.currency)}` : ""}</span><span class="when">${t.deadline ? `Cierra ${dateEs(t.deadline)}` : `Publicada ${dateEs(t.published)}`}</span></li>`)
    .join("")}</ul><p class="note">Anuncios de contratación pública en el Diario Oficial de la UE. ${stamp(tn)}</p>`;
}
