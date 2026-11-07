// Genera el sitio estático en /dist a partir de /data (o de test/fixtures con --fixtures).
import { readFile, writeFile, mkdir, cp, rm, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { SITE, COUNTRIES, SECTORS, TYPES as TYPE_NAMES, FX_SYMBOLS } from "./config.mjs";
import * as R from "../site/assets/render.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const FIXTURES = process.argv.includes("--fixtures");
const DATA = join(ROOT, FIXTURES ? "test/fixtures" : "data");
const DIST = join(ROOT, "dist");
const FILES = { fx: "fx.json", electricity: "electricity.json", chokepoints: "chokepoints.json", alerts: "alerts.json", tenders: "tenders.json", commodities: "commodities.json", status: "status.json" };

const load = async (f) => {
  try { return JSON.parse(await readFile(join(DATA, f), "utf8")); } catch { return null; }
};
const D = Object.fromEntries(await Promise.all(Object.entries(FILES).map(async ([k, f]) => [k, await load(f)])));
const cName = (iso2) => COUNTRIES.find((c) => c.iso2 === iso2)?.name || iso2;
const built = new Date().toISOString();

// ---------- plantilla ----------
const NAV = [["/", "Panel"], ["/paises/", "Países"], ["/sectores/", "Sectores"], ["/fuentes/", "Fuentes"], ["/mi-panel/", "Mi panel", "cta"]];
const base = new URL(SITE.url).pathname.replace(/\/$/, ""); // permite publicar en una subcarpeta (GitHub Pages)
const href = (p) => base + p;
const opts = (o) => `data-o='${JSON.stringify(o).replace(/'/g, "&#39;")}'`;

function page({ path, title, description, body, current }) {
  const full = path === "/" ? `${SITE.name} · ${SITE.tagline}` : `${title} · ${SITE.name}`;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${R.esc(full)}</title>
<meta name="description" content="${R.esc(description)}">
<link rel="canonical" href="${SITE.url}${path}">
<meta property="og:title" content="${R.esc(full)}">
<meta property="og:description" content="${R.esc(description)}">
<meta property="og:type" content="website">
<meta name="theme-color" content="#13233A">
<link rel="icon" href="${href("/assets/icon.svg")}" type="image/svg+xml">
<link rel="stylesheet" href="${href("/assets/fonts.css")}">
<link rel="stylesheet" href="${href("/assets/style.css")}">
<script>window.RADAR={base:${JSON.stringify(base)}};</script>
<script src="${href("/assets/config.js")}"></script>
<script type="module" src="${href("/assets/app.mjs")}"></script>
</head>
<body>
<header class="top"><div class="wrap bar">
<a class="logo" href="${href("/")}">Radar <span>Exterior</span></a>
<nav class="main" aria-label="Principal">${NAV.map(([p, l, cls]) => `<a href="${href(p)}"${cls ? ` class="${cls}"` : ""}${current === p ? ' aria-current="page"' : ""}>${l}</a>`).join("")}</nav>
</div></header>
<main class="wrap">${body}</main>
<footer><div class="wrap">
<p><b>${SITE.name}</b> reúne datos públicos y gratuitos: Banco Central Europeo, Red Eléctrica, IMF PortWatch, GDELT, TED (Oficina de Publicaciones de la UE) y FRED. Cada bloque indica su fuente y su hora de actualización.</p>
<p>La información es orientativa y puede contener errores de clasificación automática. Consulta la fuente original antes de tomar decisiones comerciales. <a href="${href("/fuentes/")}">Ver fuentes y estado</a>.</p>
<p>Generado ${R.dateEs(built, true)} (hora de Madrid).</p>
</div></footer>
</body>
</html>`;
}

const panel = (title, sub, inner, extra = "") => `<section class="panel"${extra}><div class="ph"><h2>${title}</h2>${sub ? `<span class="sub">${sub}</span>` : ""}</div>${inner}</section>`;
// Un bloque que el navegador vuelve a pintar con datos frescos: data-r = función, data-o = opciones
const block = (r, o, html) => `<div class="pb" data-r="${r}" ${opts(o)}>${html}</div>`;
const chipsFor = (group, map) => `<div class="filters" data-filter="${group}" role="group" aria-label="Filtrar">${Object.entries(map).map(([k, v]) => `<button class="chip" type="button" data-k="${k}" aria-pressed="false">${R.esc(v)}</button>`).join("")}</div>`;

// ---------- páginas ----------
function home() {
  const sectorChips = Object.fromEntries(SECTORS.map((s) => [s.id, s.name]));
  const body = `
<div class="hero"><div><h1>Comercio exterior, hoy</h1><p>Divisas, energía, tráfico marítimo, alertas y licitaciones para empresas que venden fuera. Gratis y sin registro.</p></div><span class="live" data-live><i></i>Datos en vivo</span></div>
<div data-r="summary" ${opts({})}>${R.summary(D)}</div>
<div class="desk">
  <div class="col">
    ${panel("Divisas", "1 € = …", block("fx", {}, R.fxTable(D.fx)))}
    ${panel("Materias primas", "", block("commodities", {}, R.commodities(D.commodities)))}
    ${panel("Pasos marítimos clave", "Tráfico de buques", block("chokepoints", {}, R.chokepoints(D.chokepoints)))}
    ${panel("Electricidad en España", "", block("electricity", {}, R.electricity(D.electricity)))}
  </div>
  ${panel("Alertas", "Últimos 7 días", chipsFor("types", TYPE_NAMES) + chipsFor("sectors", sectorChips) + block("alerts", { limit: 60 }, R.alerts(D.alerts, {}, { limit: 60, countryName: cName })))}
</div>
<div class="lower">${panel("Licitaciones abiertas en Europa", "TED", block("tenders", { limit: 12 }, R.tenders(D.tenders, {}, { limit: 12 })))}</div>`;
  return page({ path: "/", title: "Panel", description: "Panel gratuito de comercio exterior en tiempo real: divisas del BCE, electricidad, tráfico en Suez y Panamá, alertas de aranceles y sanciones, y licitaciones públicas en Europa.", body, current: "/" });
}

function countryPage(c) {
  const f = { countries: [c.iso2] };
  const fxSyms = c.cur && c.cur !== "EUR" && FX_SYMBOLS.includes(c.cur) ? [c.cur] : null;
  const isEu = c.iso2 === "EU" || ["FR", "DE", "IT", "PT", "NL"].includes(c.iso2);
  const body = `
<div class="hero"><div><h1>Exportar a ${R.esc(c.name)}</h1><p>Lo que está pasando hoy en ${R.esc(c.name)} y afecta a quien vende allí: divisa, alertas de aranceles, sanciones, logística y regulación${isEu ? ", y licitaciones públicas abiertas" : ""}.</p></div><span class="live" data-live><i></i>Datos en vivo</span></div>
<div class="desk">
  <div class="col">
    ${fxSyms ? panel(`Divisa: ${c.cur}`, "", block("fx", { symbols: fxSyms }, R.fxTable(D.fx, { symbols: fxSyms }))) : ""}
    ${isEu ? panel("Licitaciones abiertas", "TED", block("tenders", { ...f, limit: 15 }, R.tenders(D.tenders, f, { limit: 15 }))) : ""}
    ${panel("Recursos oficiales", "", `<div class="pb"><ul class="tenders">
      <li><a href="https://trade.ec.europa.eu/access-to-markets/es/home" target="_blank" rel="noopener">Access2Markets (Comisión Europea)</a><span class="d">Aranceles, requisitos y reglas de origen por producto y país de destino.</span></li>
      <li><a href="https://www.icex.es/" target="_blank" rel="noopener">ICEX España Exportación e Inversiones</a><span class="d">Estudios de mercado, ferias y apoyo de las Oficinas Económicas y Comerciales.</span></li>
    </ul></div>`)}
  </div>
  ${panel(`Alertas sobre ${R.esc(c.name)}`, "Últimos 7 días", chipsFor("types", TYPE_NAMES) + block("alerts", { ...f, limit: 50 }, R.alerts(D.alerts, f, { limit: 50, countryName: cName })))}
</div>`;
  return page({ path: `/pais/${c.slug}/`, title: `Exportar a ${c.name} hoy`, description: `Información en tiempo real para exportar a ${c.name}: tipo de cambio, alertas de aranceles, sanciones, logística y regulación${isEu ? ", y licitaciones públicas" : ""}.`, body, current: "/paises/" });
}

function sectorPage(s) {
  const f = { sectors: [s.id] };
  const body = `
<div class="hero"><div><h1>${R.esc(s.name)}</h1><p>Mercados, alertas y oportunidades del sector ${R.esc(s.name.toLowerCase())} para empresas que exportan.</p></div><span class="live" data-live><i></i>Datos en vivo</span></div>
<div class="desk">
  <div class="col">
    ${panel("Materias primas", "", block("commodities", { sectors: [s.id] }, R.commodities(D.commodities, { sectors: [s.id] })))}
    ${s.id === "transporte" ? panel("Pasos marítimos", "Todos los seguidos por PortWatch", block("chokepoints", { all: true }, R.chokepoints(D.chokepoints, { all: true }))) : ""}
    ${s.id === "energia" ? panel("Electricidad en España", "", block("electricity", {}, R.electricity(D.electricity))) : ""}
    ${panel("Licitaciones abiertas en Europa", "TED", block("tenders", { ...f, limit: 20 }, R.tenders(D.tenders, f, { limit: 20 })))}
  </div>
  ${panel("Alertas del sector", "Últimos 7 días", chipsFor("types", TYPE_NAMES) + block("alerts", { ...f, limit: 50 }, R.alerts(D.alerts, f, { limit: 50, countryName: cName })))}
</div>`;
  return page({ path: `/sector/${s.slug}/`, title: `${s.name}: mercados y alertas`, description: `Precios, alertas de comercio exterior y licitaciones públicas del sector ${s.name.toLowerCase()}, actualizados cada día.`, body, current: "/sectores/" });
}

function directory(kind) {
  const isC = kind === "paises";
  const list = isC
    ? COUNTRIES.map((c) => [`/pais/${c.slug}/`, c.name, `${(D.alerts?.data?.items || []).filter((a) => a.countries.includes(c.iso2)).length} alertas esta semana`])
    : SECTORS.map((s) => [`/sector/${s.slug}/`, s.name, `${(D.alerts?.data?.items || []).filter((a) => a.sectors.includes(s.id)).length} alertas esta semana`]);
  const body = `<div class="hero"><div><h1>${isC ? "Países" : "Sectores"}</h1><p>${isC ? "Elige un mercado de destino para ver su información en tiempo real." : "Elige un sector para ver sus precios, alertas y licitaciones."}</p></div></div>
<div class="dir">${list.map(([p, n, s]) => `<a href="${href(p)}">${R.esc(n)}<small>${s}</small></a>`).join("")}</div>`;
  return page({ path: `/${kind}/`, title: isC ? "Países" : "Sectores", description: isC ? "Información de comercio exterior por país de destino." : "Información de comercio exterior por sector.", body, current: `/${kind}/` });
}

function myPanel() {
  const chips = (k, items) => `<div class="chips" data-pref="${k}">${items.map(([id, n]) => `<button class="chip" type="button" data-k="${id}" aria-pressed="false">${R.esc(n)}</button>`).join("")}</div>`;
  const body = `
<div class="hero"><div><h1>Mi panel</h1><p>Elige tus mercados, sectores y tipos de alerta. El panel te mostrará solo lo que te afecta.</p></div><span class="live" data-live><i></i>Datos en vivo</span></div>
<section class="panel" id="setup"><div class="ph"><h2>Configuración</h2><span class="sub" id="pref-summary"></span></div><div class="pb setup">
  <div class="acct" id="acct">Tu panel se guarda en este navegador.</div>
  <div><h3>Mercados</h3>${chips("countries", COUNTRIES.map((c) => [c.iso2, c.name]))}</div>
  <div><h3>Sectores</h3>${chips("sectors", SECTORS.map((s) => [s.id, s.name]))}</div>
  <div><h3>Tipos de alerta</h3>${chips("types", Object.entries(TYPE_NAMES))}</div>
  <div class="chips"><button class="btn primary" id="save" type="button">Guardar y ver mi panel</button><span class="msg" id="save-msg" role="status"></span></div>
</div></section>
<div id="mine" hidden>
  <div data-r="summary" ${opts({})}></div>
  <div class="desk">
    <div class="col">
      ${panel("Mis divisas", "", `<div class="pb" data-r="fx" data-mine="fx" ${opts({})}></div>`)}
      ${panel("Mis materias primas", "", `<div class="pb" data-r="commodities" data-mine="sectors" ${opts({})}></div>`)}
      ${panel("Mis licitaciones", "TED", `<div class="pb" data-r="tenders" data-mine="all" ${opts({ limit: 15 })}></div>`)}
    </div>
    ${panel("Mis alertas", "Últimos 7 días", `<div class="pb" data-r="alerts" data-mine="all" ${opts({ limit: 80 })}></div>`)}
  </div>
</div>`;
  return page({ path: "/mi-panel/", title: "Mi panel", description: "Configura tu panel de comercio exterior con tus mercados y sectores.", body, current: "/mi-panel/" });
}

function sourcesPage() {
  const rows = Object.entries(FILES).filter(([k]) => k !== "status").map(([k]) => {
    const d = D[k], st = D.status?.[k];
    const state = !d ? (st?.skipped ? ["Desactivada", "p-warn"] : ["Sin datos", "p-crit"]) : st && !st.ok ? ["Último dato bueno", "p-warn"] : ["Correcta", "p-ok"];
    return `<tr><td>${R.esc(d?.source || k)}</td><td>${d?.sourceUrl ? `<a href="${d.sourceUrl}" target="_blank" rel="noopener">Web</a>` : ""}</td><td>${R.esc(d?.refresh || "")}</td><td><span class="pill ${state[1]}">${state[0]}</span></td><td class="num">${d?.updatedAt ? R.dateEs(d.updatedAt, true) : "–"}</td></tr>`;
  }).join("");
  const body = `<div class="hero"><div><h1>Fuentes y estado</h1><p>Todos los datos vienen de fuentes públicas y gratuitas. Se recogen automáticamente y se publican con su hora de actualización.</p></div></div>
${panel("Fuentes", "", `<div class="pb tw"><table class="sources"><thead><tr><th>Fuente</th><th>Enlace</th><th>Frecuencia</th><th>Estado</th><th class="num">Última actualización</th></tr></thead><tbody>${rows}</tbody></table>
<p class="note">Las alertas se clasifican por país, sector y tipo con reglas automáticas sobre el titular. Pueden aparecer noticias mal clasificadas: abre siempre la fuente original.</p></div>`)}`;
  return page({ path: "/fuentes/", title: "Fuentes y estado", description: "Fuentes de datos de Radar Exterior y su estado de actualización.", body, current: "/fuentes/" });
}

function notFound() {
  return page({ path: "/404.html", title: "Página no encontrada", description: "", body: `<div class="hero"><div><h1>Página no encontrada</h1><p>Vuelve al <a href="${href("/")}">panel</a>.</p></div></div>`, current: "" });
}

// ---------- escritura ----------
async function out(path, html) {
  const file = join(DIST, path.endsWith(".html") ? path : path + "index.html");
  await mkdir(join(file, ".."), { recursive: true });
  await writeFile(file, html);
}

await rm(DIST, { recursive: true, force: true });
await mkdir(join(DIST, "assets/fonts"), { recursive: true });
await cp(join(ROOT, "site/assets"), join(DIST, "assets"), { recursive: true });
if (!existsSync(join(DIST, "assets/config.js"))) await writeFile(join(DIST, "assets/config.js"), "window.RADAR_CONFIG={};\n");

// Tipografías alojadas en el propio sitio (sin llamadas a Google: mejor para el RGPD).
const FONTS = [["archivo-narrow", "Archivo Narrow", [700]], ["ibm-plex-sans", "IBM Plex Sans", [400, 500, 600, 700]], ["ibm-plex-mono", "IBM Plex Mono", [400, 500]]];
let fontCss = "";
for (const [pkg, fam, weights] of FONTS) {
  for (const w of weights) {
    const f = `${pkg}-latin-${w}-normal.woff2`;
    const src = join(ROOT, "node_modules/@fontsource", pkg, "files", f);
    if (!existsSync(src)) continue;
    await cp(src, join(DIST, "assets/fonts", f));
    fontCss += `@font-face{font-family:"${fam}";font-style:normal;font-weight:${w};font-display:swap;src:url(fonts/${f}) format("woff2")}\n`;
  }
}
await writeFile(join(DIST, "assets/fonts.css"), fontCss);

// Datos para el navegador
await mkdir(join(DIST, "data"), { recursive: true });
for (const f of Object.values(FILES)) if (existsSync(join(DATA, f))) await cp(join(DATA, f), join(DIST, "data", f));

const paths = ["/", "/paises/", "/sectores/", "/mi-panel/", "/fuentes/"];
await out("/", home());
await out("/paises/", directory("paises"));
await out("/sectores/", directory("sectores"));
await out("/mi-panel/", myPanel());
await out("/fuentes/", sourcesPage());
await out("/404.html", notFound());
for (const c of COUNTRIES) { await out(`/pais/${c.slug}/`, countryPage(c)); paths.push(`/pais/${c.slug}/`); }
for (const s of SECTORS) { await out(`/sector/${s.slug}/`, sectorPage(s)); paths.push(`/sector/${s.slug}/`); }

const today = built.slice(0, 10);
await writeFile(join(DIST, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((p) => `<url><loc>${SITE.url}${p}</loc><lastmod>${today}</lastmod><changefreq>hourly</changefreq></url>`).join("\n")}\n</urlset>\n`);
await writeFile(join(DIST, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`);
await writeFile(join(DIST, ".nojekyll"), "");
// Para hostings Apache (Hostinger): página 404 propia y datos siempre frescos.
await writeFile(join(DIST, ".htaccess"), `ErrorDocument 404 ${base}/404.html\n<FilesMatch "\\.json$">\n  Header set Cache-Control "no-cache"\n</FilesMatch>\n`);
// Para el navegador: nombres de países
await writeFile(join(DIST, "data/countries.json"), JSON.stringify(COUNTRIES.map(({ iso2, name, cur, slug }) => ({ iso2, name, cur, slug }))));

console.log(`Sitio generado en dist/ (${paths.length} páginas${FIXTURES ? ", datos de prueba" : ""})`);
