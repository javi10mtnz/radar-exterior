// Cuentas de usuario opcionales con Supabase (plan gratuito).
// Si config.js no tiene supabaseUrl y supabaseAnonKey, el panel se guarda solo en el navegador.
const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";

function loadScript(src) {
  return new Promise((ok, ko) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = ok;
    s.onerror = ko;
    document.head.appendChild(s);
  });
}

export async function initAccount(cfg, box, onRemotePrefs) {
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !box) return null;
  try {
    await loadScript(SUPABASE_JS);
  } catch {
    box.textContent = "No se pudo cargar el inicio de sesión. Tu panel se guarda en este navegador.";
    return null;
  }
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  let user = null;

  const paint = () => {
    if (user) {
      box.innerHTML = `<span>Has iniciado sesión como <b></b>. Tu panel se guarda en tu cuenta.</span><button class="btn" type="button" id="logout">Cerrar sesión</button>`;
      box.querySelector("b").textContent = user.email;
      box.querySelector("#logout").onclick = async () => { await sb.auth.signOut(); };
    } else {
      box.innerHTML = `<label for="email">Crea una cuenta gratis para ver tu panel en cualquier dispositivo:</label><input id="email" type="email" autocomplete="email" placeholder="tu@empresa.com"><button class="btn primary" type="button" id="login">Enviarme el enlace</button><span class="msg" id="login-msg" role="status"></span>`;
      box.querySelector("#login").onclick = async () => {
        const email = box.querySelector("#email").value.trim();
        const msg = box.querySelector("#login-msg");
        msg.classList.remove("err");
        if (!/^\S+@\S+\.\S+$/.test(email)) { msg.classList.add("err"); msg.textContent = "Escribe un email válido."; return; }
        const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href.split("#")[0] } });
        if (error) { msg.classList.add("err"); msg.textContent = "No se pudo enviar el enlace. Inténtalo de nuevo en un minuto."; }
        else msg.textContent = "Te hemos enviado un enlace. Ábrelo desde este dispositivo para entrar.";
      };
    }
  };

  async function pull() {
    if (!user) return;
    const { data, error } = await sb.from("panels").select("countries,sectors,types").eq("user_id", user.id).maybeSingle();
    if (!error && data) onRemotePrefs({ countries: data.countries || [], sectors: data.sectors || [], types: data.types || [] });
  }

  const { data: { session } } = await sb.auth.getSession();
  user = session?.user || null;
  paint();
  await pull();
  sb.auth.onAuthStateChange((_e, s) => {
    const changed = (s?.user?.id || null) !== (user?.id || null);
    user = s?.user || null;
    if (changed) { paint(); pull(); }
  });

  return {
    signedIn: () => Boolean(user),
    async save(p) {
      const { error } = await sb.from("panels").upsert({ user_id: user.id, countries: p.countries, sectors: p.sectors, types: p.types, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
  };
}
