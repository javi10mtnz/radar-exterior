// Configuración común: países, sectores, tipos de alerta y reglas de clasificación.
// Para añadir un país, añade una entrada a COUNTRIES. El sitio genera su página automáticamente.

export const SITE = {
  name: "Radar Exterior",
  tagline: "Comercio exterior en tiempo real, en abierto",
  // Cambia esto por tu dominio cuando lo tengas (se usa en el sitemap y en las etiquetas para Google).
  url: process.env.SITE_URL || "https://example.github.io/radar-exterior",
};

// iso2, iso3 (TED usa ISO3), divisa, nombre, y palabras para detectar el país en titulares (en minúsculas).
export const COUNTRIES = [
  { iso2: "US", iso3: "USA", cur: "USD", name: "Estados Unidos", slug: "estados-unidos", kw: ["united states", "u.s.", "us ", "washington", "trump", "ofac", "estados unidos", "ee.uu", "eeuu", "american"] },
  { iso2: "CN", iso3: "CHN", cur: "CNY", name: "China", slug: "china", kw: ["china", "chinese", "beijing", "pekín", "chino"] },
  { iso2: "MX", iso3: "MEX", cur: "MXN", name: "México", slug: "mexico", kw: ["mexico", "méxico", "mexican", "mexicano"] },
  { iso2: "GB", iso3: "GBR", cur: "GBP", name: "Reino Unido", slug: "reino-unido", kw: ["united kingdom", "uk ", "britain", "british", "reino unido", "británico"] },
  { iso2: "MA", iso3: "MAR", cur: "MAD", name: "Marruecos", slug: "marruecos", kw: ["morocco", "moroccan", "marruecos", "tanger", "tánger"] },
  { iso2: "FR", iso3: "FRA", cur: "EUR", name: "Francia", slug: "francia", kw: ["france", "french", "francia", "francés"] },
  { iso2: "DE", iso3: "DEU", cur: "EUR", name: "Alemania", slug: "alemania", kw: ["germany", "german", "alemania", "alemán"] },
  { iso2: "IT", iso3: "ITA", cur: "EUR", name: "Italia", slug: "italia", kw: ["italy", "italian", "italia", "italiano"] },
  { iso2: "PT", iso3: "PRT", cur: "EUR", name: "Portugal", slug: "portugal", kw: ["portugal", "portuguese", "portugués"] },
  { iso2: "BR", iso3: "BRA", cur: "BRL", name: "Brasil", slug: "brasil", kw: ["brazil", "brazilian", "brasil", "brasileño"] },
  { iso2: "IN", iso3: "IND", cur: "INR", name: "India", slug: "india", kw: ["india", "indian", "indio"] },
  { iso2: "JP", iso3: "JPN", cur: "JPY", name: "Japón", slug: "japon", kw: ["japan", "japanese", "japón", "japonés"] },
  { iso2: "TR", iso3: "TUR", cur: "TRY", name: "Turquía", slug: "turquia", kw: ["turkey", "türkiye", "turkish", "turquía"] },
  { iso2: "AE", iso3: "ARE", cur: "AED", name: "Emiratos Árabes", slug: "emiratos", kw: ["emirates", "uae", "dubai", "emiratos", "dubái"] },
  { iso2: "CL", iso3: "CHL", cur: "CLP", name: "Chile", slug: "chile", kw: ["chile", "chilean", "chileno"] },
  { iso2: "CO", iso3: "COL", cur: "COP", name: "Colombia", slug: "colombia", kw: ["colombia", "colombian", "colombiano"] },
  { iso2: "AR", iso3: "ARG", cur: "ARS", name: "Argentina", slug: "argentina", kw: ["argentina", "argentine", "argentino"] },
  { iso2: "EG", iso3: "EGY", cur: "EGP", name: "Egipto", slug: "egipto", kw: ["egypt", "egyptian", "egipto", "suez"] },
  { iso2: "SA", iso3: "SAU", cur: "SAR", name: "Arabia Saudí", slug: "arabia-saudi", kw: ["saudi", "arabia saudí", "riyadh"] },
  { iso2: "KR", iso3: "KOR", cur: "KRW", name: "Corea del Sur", slug: "corea-del-sur", kw: ["south korea", "korean", "corea"] },
  { iso2: "CA", iso3: "CAN", cur: "CAD", name: "Canadá", slug: "canada", kw: ["canada", "canadian", "canadá"] },
  { iso2: "CH", iso3: "CHE", cur: "CHF", name: "Suiza", slug: "suiza", kw: ["switzerland", "swiss", "suiza"] },
  { iso2: "RU", iso3: "RUS", cur: "RUB", name: "Rusia", slug: "rusia", kw: ["russia", "russian", "kremlin", "rusia", "ruso"] },
  { iso2: "NL", iso3: "NLD", cur: "EUR", name: "Países Bajos", slug: "paises-bajos", kw: ["netherlands", "dutch", "rotterdam", "países bajos", "holanda"] },
  { iso2: "IR", iso3: "IRN", cur: "IRR", name: "Irán", slug: "iran", kw: ["iran", "iranian", "irán", "iraní"] },
  { iso2: "EU", iso3: null, cur: "EUR", name: "Unión Europea", slug: "union-europea", kw: ["european union", "eu ", "brussels", "european commission", "european", "unión europea", "europeo", "europea", "ue ", "bruselas", "comisión europea"] },
];

export const SECTORS = [
  { id: "alim", name: "Alimentación y agro", slug: "alimentacion",
    kw: ["food", "agri", "farm", "wheat", "olive", "wine", "fruit", "meat", "pork", "beef", "dairy", "fish", "sugar", "grain", "cereal", "fertili", "alimenta", "agrí", "agro", "trigo", "aceite", "vino", "fruta", "carne", "porcino", "lácteo", "pesca", "azúcar", "cereal"],
    cpv: ["03", "15"] },
  { id: "energia", name: "Energía", slug: "energia",
    kw: ["crude", "oil price", "oil prices", "oil export", "oil output", "oil tanker", "barrel", "brent", "gas", "lng", "energy", "electricity", "power", "solar", "wind", "hydrogen", "opec", "petróleo", "crudo", "energía", "electricidad", "renovable", "hidrógeno", "opep"],
    cpv: ["09", "31", "65"] },
  { id: "transporte", name: "Transporte y logística", slug: "transporte",
    kw: ["shipping", "freight", "port", "container", "vessel", "logistic", "suez", "panama", "red sea", "strike", "truck", "rail", "air cargo", "transporte", "flete", "puerto", "contenedor", "naviera", "logística", "huelga", "mar rojo"],
    cpv: ["34", "60", "63"] },
  { id: "industria", name: "Industria y metales", slug: "industria",
    kw: ["steel", "aluminium", "aluminum", "copper", "metal", "manufactur", "machinery", "automotive", "car ", "chemical", "acero", "aluminio", "cobre", "metal", "industria", "maquinaria", "automoción", "química"],
    cpv: ["14", "24", "42", "43", "44"] },
  { id: "tech", name: "Tecnología", slug: "tecnologia",
    kw: ["chip", "semiconductor", "tech", "software", "battery", "lithium", "rare earth", "gallium", "electronics", "data", "ai ", "tecnolog", "batería", "litio", "tierras raras", "electrónica"],
    cpv: ["30", "32", "48", "72"] },
];

export const TYPES = {
  arancel: "Aranceles",
  sancion: "Sanciones",
  logistica: "Logística",
  regulacion: "Regulación",
  divisa: "Divisas",
  geo: "Geopolítica",
};

// Una consulta GDELT por tipo de alerta. GDELT permite OR entre paréntesis.
// Ver https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
export const ALERT_QUERIES = {
  arancel: '(tariff OR tariffs OR "anti-dumping" OR "import duty" OR aranceles OR arancel)',
  sancion: '(sanctions OR "export controls" OR "entity list" OR sanciones OR embargo)',
  logistica: '("port strike" OR "shipping disruption" OR "freight rates" OR "container shipping" OR "red sea shipping" OR "huelga portuaria" OR fletes)',
  regulacion: '("trade agreement" OR "free trade" OR "customs rules" OR "import ban" OR "export ban" OR "acuerdo comercial" OR "prohibición de importación")',
  divisa: '("currency plunges" OR "currency slumps" OR devaluation OR "exchange rate" OR devaluación OR "tipo de cambio")',
  geo: '("trade war" OR "trade tensions" OR "supply chain disruption" OR "trade restrictions" OR blockade OR "guerra comercial" OR "tensiones comerciales")',
};

// Una alerta solo se publica si el titular habla de comercio, aduanas, logística, sanciones o divisas.
export const TRADE_KW = ["tariff", "arancel", "export", "import", "trade", "comerci", "sanction", "sancion", "embargo", "customs", "aduan", "duty", "duties", "dumping", "shipping", "freight", "flete", "port ", "ports", "puerto", "cargo", "carga", "supply chain", "suministro", "currency", "divisa", "exchange rate", "tipo de cambio", "devalu", "peso", "lira", "yuan", "rupee", "dólar", "dollar", "wto", "omc", "free trade", "libre comercio", "quota", "cuota", "ban ", "prohib", "veto"];

// Palabras que suben la importancia de una alerta.
export const HIGH_IMPACT = ["new tariff", "raises tariff", "tariff hike", "eleva los aranceles", "sube los aranceles", "record low", "mínimo histórico", "new sanctions", "nuevas sanciones", "ban", "prohib", "embargo", "sanction", "sancion", "strike", "huelga", "closure", "cierre", "100%", "50%", "25%", "suspend", "suspende", "blockade", "bloqueo", "retaliat", "represalia"];

// Divisas que mostramos (base EUR, fuente BCE vía Frankfurter).
export const FX_SYMBOLS = ["USD", "GBP", "CNY", "JPY", "CHF", "MXN", "BRL", "INR", "TRY", "KRW", "CAD", "ZAR", "SEK", "PLN"];

// Series de FRED (requieren clave gratuita FRED_API_KEY). Mensuales salvo el Brent diario.
export const COMMODITIES = [
  { id: "DCOILBRENTEU", name: "Brent", unit: "$/barril", sectors: ["energia", "transporte"], freq: "diaria" },
  { id: "PNGASEUUSDM", name: "Gas natural Europa", unit: "$/MMBtu", sectors: ["energia", "industria"], freq: "mensual" },
  { id: "PWHEAMTUSDM", name: "Trigo", unit: "$/t", sectors: ["alim"], freq: "mensual" },
  { id: "PMAIZMTUSDM", name: "Maíz", unit: "$/t", sectors: ["alim"], freq: "mensual" },
  { id: "POLVOILUSDM", name: "Aceite de oliva", unit: "$/t", sectors: ["alim"], freq: "mensual" },
  { id: "PSUGAISAUSDM", name: "Azúcar", unit: "¢/libra", sectors: ["alim"], freq: "mensual" },
  { id: "PCOPPUSDM", name: "Cobre", unit: "$/t", sectors: ["industria", "tech"], freq: "mensual" },
  { id: "PALUMUSDM", name: "Aluminio", unit: "$/t", sectors: ["industria"], freq: "mensual" },
];

export const COUNTRY_BY_ISO2 = Object.fromEntries(COUNTRIES.map((c) => [c.iso2, c]));
export const SECTOR_BY_ID = Object.fromEntries(SECTORS.map((s) => [s.id, s]));
