# Radar Exterior

Panel público y gratuito de comercio exterior: divisas, electricidad, tráfico marítimo, alertas y licitaciones, con páginas por país y por sector y un panel personal para cada usuario.

Todo funciona con fuentes y servicios gratuitos. El único gasto es el dominio propio, si lo quieres (unos 10–15 € al año).

## Qué hace

Cada 30 minutos, GitHub ejecuta los recolectores, guarda los datos en `data/`, genera el sitio en `dist/` y lo publica en GitHub Pages. Si una fuente falla, se mantiene su último dato bueno.

| Bloque | Fuente | Clave | Frecuencia real |
|---|---|---|---|
| Divisas | Banco Central Europeo (vía frankfurter.dev) | No | Diaria, ~16:00 |
| Electricidad España | Red Eléctrica (REData) | No | Horaria |
| Pasos marítimos | IMF PortWatch (FMI y Oxford) | No | Diaria, con días de retraso |
| Alertas | GDELT (noticias de todo el mundo) | No | Cada 15–30 min |
| Licitaciones | TED, Diario Oficial de la UE | No | Diaria |
| Materias primas | FRED (Reserva Federal de St. Louis) | Sí, gratuita | Brent diario, resto mensual |

## Publicarlo en tu hosting de Hostinger (recomendado si ya lo tienes)

GitHub descarga los datos y genera la web cada 30 minutos, y la sube a tu Hostinger por FTP. Solo se suben los archivos que cambian.

1. **GitHub:** crea un repositorio público `radar-exterior` y sube el contenido de esta carpeta (ver paso 1 de la sección siguiente). En Settings → Actions → General → Workflow permissions, marca **Read and write permissions**.
2. **Hostinger:** en hPanel → Archivos → **Cuentas FTP**, apunta el servidor (IP o `ftp.tudominio.com`), el usuario y la contraseña. Si no recuerdas la contraseña, cámbiala ahí.
3. **Comprueba la carpeta:** conéctate con el Administrador de archivos y mira qué ve tu usuario FTP. Si al entrar ves la carpeta `public_html`, no hagas nada. Si ya estás dentro de `public_html`, crea en GitHub la variable `FTP_DIR` con el valor `./`. Si quieres la web en un subdominio o subcarpeta, pon esa ruta terminada en `/`.
4. **Secretos en GitHub:** Settings → Secrets and variables → Actions → New repository secret. Crea `FTP_SERVER`, `FTP_USERNAME` y `FTP_PASSWORD`.
5. **Variable con tu dominio:** en la pestaña Variables de la misma pantalla, crea `SITE_URL` con tu dirección completa, por ejemplo `https://tudominio.com`.
6. Actions → "Actualizar y publicar" → **Run workflow**. La primera subida tarda unos minutos.

Ojo: la subida sincroniza la carpeta de destino. **No la apuntes a una carpeta donde tengas otra web**, como un WordPress. En ese caso usa un subdominio (por ejemplo `radar.tudominio.com`, creado en hPanel → Dominios → Subdominios) y pon su carpeta en `FTP_DIR`.

Cuando haya FTP configurado, GitHub Pages deja de usarse.

## Publicarlo en GitHub Pages (alternativa sin hosting)

### 1. Sube el proyecto a GitHub
1. Crea una cuenta en github.com si no la tienes.
2. Crea un repositorio nuevo **público** llamado `radar-exterior` (los públicos tienen minutos de Actions ilimitados).
3. Pulsa "uploading an existing file" y arrastra todo el contenido de esta carpeta (incluida la carpeta oculta `.github`). Si tu ordenador no muestra `.github`, usa GitHub Desktop o, en Mac, pulsa Cmd+Mayús+. para ver archivos ocultos.

### 2. Activa GitHub Pages
Settings → Pages → en "Source" elige **GitHub Actions**.

### 3. Lanza la primera actualización
Pestaña Actions → "Actualizar y publicar" → **Run workflow**. Tarda 2–3 minutos. La web quedará en `https://TU-USUARIO.github.io/radar-exterior/`. Desde ahí se actualiza sola cada 30 minutos.

Si el primer intento falla en el paso "Guardar datos", ve a Settings → Actions → General → Workflow permissions y marca **Read and write permissions**.

### 4. (Opcional) Materias primas
1. Pide una clave gratuita en https://fred.stlouisfed.org/docs/api/api_key.html
2. En GitHub: Settings → Secrets and variables → Actions → New repository secret. Nombre `FRED_API_KEY`, valor tu clave.

### 5. (Opcional) Cuentas de usuario
Sin esto, cada persona guarda su panel en su navegador. Con esto, puede crear cuenta con su email y verlo en cualquier dispositivo.
1. Crea un proyecto gratuito en https://supabase.com
2. SQL Editor → pega el contenido de `supabase/schema.sql` → Run.
3. Authentication → URL Configuration → en "Site URL" pon la dirección de tu web.
4. Project Settings → API: copia la "Project URL" y la "anon public key" en `site/assets/config.js` y súbelo a GitHub. Esa clave es pública por diseño; la seguridad la dan las reglas de `schema.sql`.

El email de acceso de Supabase gratuito tiene un límite bajo de envíos por hora. Para muchos usuarios, configura un proveedor de email propio (Authentication → SMTP, por ejemplo con Resend o Brevo en su plan gratuito).

### 6. (Opcional) Dominio propio
Compra el dominio, añádelo en Settings → Pages → Custom domain, y crea la variable `SITE_URL` (Settings → Secrets and variables → Actions → Variables) con la dirección completa, por ejemplo `https://radarexterior.com`.

## Trabajar en local

```bash
npm install
npm run demo     # genera el sitio con datos de prueba inventados (test/fixtures)
npm run update   # descarga datos reales y genera el sitio
npm run serve    # abre http://localhost:4321
```

Para ver el sitio en local, genera con `SITE_URL=http://localhost:4321 npm run demo`.

`node test/mock-run.mjs` prueba los recolectores sin conexión con respuestas simuladas.

## Estructura

```
scripts/config.mjs        países, sectores, tipos de alerta y palabras clave (aquí se añade un país)
scripts/fetch/*.mjs       un recolector por fuente
scripts/fetch-all.mjs     ejecuta todos y guarda data/*.json
scripts/build.mjs         genera las páginas en dist/
site/assets/render.mjs    pintado compartido entre servidor y navegador
site/assets/app.mjs       filtros, refresco automático y Mi panel
site/assets/account.mjs   cuentas con Supabase (opcional)
.github/workflows/        automatización cada 30 minutos
```

## Límites que conviene conocer

- **"Tiempo real" depende de la fuente.** Las alertas y la electricidad son casi en directo. Las divisas del BCE son diarias, los datos de PortWatch llegan con días de retraso y casi todas las materias primas gratuitas son mensuales. Cada bloque muestra su hora real de actualización.
- **Las alertas se clasifican con palabras clave** sobre el titular. Habrá errores. El siguiente salto de calidad es clasificarlas y resumirlas en español con IA, lo que tiene un coste pequeño por uso.
- **Muchos titulares están en inglés.** Se marcan con "EN".
- **Licencias.** Antes de lanzar comercialmente, revisa las condiciones de cada fuente. Las de BCE, UE, Banco Mundial, REE y GDELT permiten reutilización citando la fuente. FRED permite usar sus datos, pero algunas series tienen derechos de terceros.
- **GitHub pausa las tareas programadas** de repositorios sin actividad durante 60 días. Como el robot guarda datos en cada ejecución, esto no debería ocurrir.
