/* guard.js — DIGIY EXPLORE / EXPLORE GUARD v2
   Fix : lecture de "digiy_explore_session" (clé pin.html) + bypass checkAccess si session récente valide
*/
(() => {
  "use strict";

  const SUPABASE_URL = "https://wesqmwjjtsefyjnluosj.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_tGHItRgeWDmGjnd0CK1DVQ_BIep4Ug3";

  const MODULE_CODE = "EXPLORE";
  const LOGIN_URL = window.DIGIY_LOGIN_URL || "./pin.html";
  const PAY_URL = "https://commencer-a-payer.digiylyfe.com/";

  const ALLOW_PREVIEW_WITHOUT_IDENTITY = false;

  /* Clés guard */
  const SESSION_KEY  = `DIGIY_${MODULE_CODE}_SESSION`;   // "DIGIY_EXPLORE_SESSION"
  const ACCESS_KEY   = `DIGIY_${MODULE_CODE}_ACCESS`;    // "DIGIY_EXPLORE_ACCESS"
  /* ─── FIX : clé utilisée par pin.html ─── */
  const PIN_SESSION_KEY = "digiy_explore_session";
  const MAX_SESSION_MS  = 8 * 60 * 60 * 1000;           // 8 h

  const MODULE_PREFIX = "digiy_explore";

  const state = {
    preview:   false,
    access_ok: false,
    reason:    "booting",
    slug:      "",
    phone:     "",
    module:    MODULE_CODE
  };

  let bootPromise = null;

  const api = {
    state,
    ready,
    getSession,
    loginWithPin,
    logout,
    getSlug:   () => state.slug  || "",
    getPhone:  () => state.phone || "",
    getModule: () => MODULE_CODE
  };

  window.DIGIY_GUARD = api;

  /* ─── utils ─── */
  function showPage() { try { document.documentElement.style.visibility = ""; } catch (_) {} }
  function hidePage() { try { document.documentElement.style.visibility = "hidden"; } catch (_) {} }

  function normPhone(v) { return String(v || "").replace(/[^\d]/g, ""); }
  function normPin(v)   { return String(v || "").trim().replace(/\s+/g, ""); }
  function normSlug(v)  {
    return String(v || "")
      .trim().toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }
  function nowIso() { return new Date().toISOString(); }
  function getQs()  { return new URLSearchParams(window.location.search); }

  function safeJsonParse(raw) {
    try { return JSON.parse(raw); } catch (_) { return null; }
  }

  function jsonHeaders() {
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    };
  }

  function getHeaders() {
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: "application/json"
    };
  }

  async function rpc(name, body) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(body || {})
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  }

  async function tableGet(table, paramsObj) {
    const params = new URLSearchParams(paramsObj || {});
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`, {
      method: "GET",
      headers: getHeaders()
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  }

  function setState(patch) {
    Object.assign(state, patch || {});
    api.state = state;
    window.DIGIY_GUARD.state = state;
  }

  /* ─── FIX : readPinSession lit la clé de pin.html ─── */
  function readPinSession() {
    const keys = [SESSION_KEY, ACCESS_KEY, PIN_SESSION_KEY];
    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (!raw) continue;
        const parsed = safeJsonParse(raw);
        if (!parsed || !parsed.phone) continue;
        /* Vérifier fraîcheur */
        const ts = Number(parsed.ts || 0);
        if (ts && (Date.now() - ts) > MAX_SESSION_MS) continue;
        return parsed;
      } catch (_) {}
    }
    return null;
  }

  /* ─── FIX : si session récente avec access_ok:true → pas besoin de checkAccess ─── */
  function hasValidCachedAccess(phone) {
    const session = readPinSession();
    if (!session) return false;
    if (normPhone(session.phone) !== normPhone(phone)) return false;
    if (session.access_ok !== true) return false;
    const ts = Number(session.ts || 0);
    if (!ts || (Date.now() - ts) > MAX_SESSION_MS) return false;
    return true;
  }

  function rememberIdentity({ slug, phone }) {
    const s = normSlug(slug);
    const p = normPhone(phone);
    try {
      const sessionObj = {
        module:    MODULE_CODE,
        slug:      s || "",
        phone:     p || "",
        access_ok: true,
        ts:        Date.now(),
        at:        nowIso()
      };
      if (s) {
        sessionStorage.setItem(`${MODULE_PREFIX}_slug`, s);
        sessionStorage.setItem(`${MODULE_PREFIX}_last_slug`, s);
        localStorage.setItem(`${MODULE_PREFIX}_last_slug`, s);
      }
      if (p) {
        sessionStorage.setItem(`${MODULE_PREFIX}_phone`, p);
        localStorage.setItem(`${MODULE_PREFIX}_phone`, p);
      }
      const raw = JSON.stringify(sessionObj);
      localStorage.setItem(SESSION_KEY, raw);
      localStorage.setItem(ACCESS_KEY, raw);
      /* ─── FIX : écrire aussi dans la clé pin.html pour cohérence ─── */
      localStorage.setItem(PIN_SESSION_KEY, raw);
      sessionStorage.setItem(PIN_SESSION_KEY, raw);
      window.DIGIY_ACCESS = Object.assign({}, window.DIGIY_ACCESS || {}, sessionObj);
    } catch (_) {}
  }

  function clearIdentity() {
    try {
      sessionStorage.removeItem(`${MODULE_PREFIX}_slug`);
      sessionStorage.removeItem(`${MODULE_PREFIX}_last_slug`);
      sessionStorage.removeItem(`${MODULE_PREFIX}_phone`);
      sessionStorage.removeItem(PIN_SESSION_KEY);
      localStorage.removeItem(`${MODULE_PREFIX}_last_slug`);
      localStorage.removeItem(`${MODULE_PREFIX}_phone`);
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(PIN_SESSION_KEY);
      delete window.DIGIY_ACCESS;
    } catch (_) {}
  }

  function getSession() {
    const qs = getQs();
    const fromUrlSlug  = normSlug(qs.get("slug")   || "");
    const fromUrlPhone = normPhone(qs.get("phone")  || "");

    /* ─── FIX : lire les 3 clés ─── */
    const stored = readPinSession();

    const sessionSlug = normSlug(
      fromUrlSlug ||
      sessionStorage.getItem(`${MODULE_PREFIX}_slug`) ||
      sessionStorage.getItem(`${MODULE_PREFIX}_last_slug`) ||
      localStorage.getItem(`${MODULE_PREFIX}_last_slug`) ||
      stored?.slug ||
      window.DIGIY_ACCESS?.slug ||
      ""
    );

    const sessionPhone = normPhone(
      fromUrlPhone ||
      sessionStorage.getItem(`${MODULE_PREFIX}_phone`) ||
      localStorage.getItem(`${MODULE_PREFIX}_phone`) ||
      stored?.phone ||
      window.DIGIY_ACCESS?.phone ||
      ""
    );

    return { module: MODULE_CODE, slug: sessionSlug, phone: sessionPhone };
  }

  function enrichUrlIfMissingSlug(slug) {
    const s = normSlug(slug);
    if (!s) return;
    const qs = getQs();
    const current = normSlug(qs.get("slug") || "");
    if (current === s) return;
    const u = new URL(window.location.href);
    u.searchParams.set("slug", s);
    history.replaceState(null, "", u.toString());
  }

  function buildLoginUrl(slug) {
    const u = new URL(LOGIN_URL, window.location.href);
    const s = normSlug(slug);
    if (s) u.searchParams.set("slug", s);
    u.searchParams.set("next", window.location.pathname + window.location.search);
    return u.toString();
  }

  function goLogin(slug) { window.location.replace(buildLoginUrl(slug)); }

  function buildPayUrl({ slug, phone }) {
    const u = new URL(PAY_URL);
    const s = normSlug(slug);
    const p = normPhone(phone);
    u.searchParams.set("module", MODULE_CODE);
    if (s) u.searchParams.set("slug", s);
    if (p) u.searchParams.set("phone", p);
    u.searchParams.set("return", window.location.href);
    return u.toString();
  }

  function goPay({ slug, phone }) { window.location.replace(buildPayUrl({ slug, phone })); }

  async function resolveSubBySlug(slug) {
    const s = normSlug(slug);
    if (!s) return null;
    const res = await tableGet("digiy_subscriptions_public", {
      select: "phone,slug,module",
      slug:   `eq.${s}`,
      module: `eq.${MODULE_CODE}`,
      limit:  "1"
    });
    if (!res.ok || !Array.isArray(res.data) || !res.data[0]) return null;
    return {
      slug:   normSlug(res.data[0].slug),
      phone:  normPhone(res.data[0].phone),
      module: String(res.data[0].module || "")
    };
  }

  async function resolveSubByPhone(phone) {
    const p = normPhone(phone);
    if (!p) return null;
    const res = await tableGet("digiy_subscriptions_public", {
      select: "phone,slug,module",
      phone:  `eq.${p}`,
      module: `eq.${MODULE_CODE}`,
      limit:  "1"
    });
    if (!res.ok || !Array.isArray(res.data) || !res.data[0]) return null;
    return {
      slug:   normSlug(res.data[0].slug),
      phone:  normPhone(res.data[0].phone),
      module: String(res.data[0].module || "")
    };
  }

  async function checkAccess(phone) {
    const p = normPhone(phone);
    if (!p) return false;
    const tries = [
      { name: "digiy_has_access", body: { p_phone: p, p_module: MODULE_CODE } },
      { name: "digiy_has_access", body: { phone: p, module: MODULE_CODE } }
    ];
    for (const t of tries) {
      const res = await rpc(t.name, t.body);
      if (!res.ok) continue;
      if (res.data === true)          return true;
      if (res.data?.ok === true)      return true;
      if (res.data?.access === true)  return true;
    }
    return false;
  }

  async function attemptPinLoginRPCs(slug, pin, phone) {
    const s  = normSlug(slug);
    const p  = normPin(pin);
    const ph = normPhone(phone);
    if (!ph || !p) return null;
    const tries = [
      { name: "digiy_verify_pin", body: { p_phone: ph, p_module: MODULE_CODE, p_pin: p } },
      { name: "digiy_verify_pin", body: { p_phone: ph, p_module: MODULE_CODE.toLowerCase(), p_pin: p } }
    ];
    for (const t of tries) {
      const res = await rpc(t.name, t.body);
      if (!res.ok) continue;
      const d   = res.data;
      const row = Array.isArray(d) ? d[0] : d;
      if (row?.ok === true) {
        return { ok: true, slug: s, phone: normPhone(row.phone || ph) };
      }
    }
    return null;
  }

  async function loginWithPin(slug, pin) {
    const s = normSlug(slug);
    const p = normPin(pin);
    if (!s) return { ok: false, error: "Slug manquant." };
    if (!p) return { ok: false, error: "PIN manquant." };

    const sub   = await resolveSubBySlug(s);
    const phone = normPhone(sub?.phone);
    if (!phone) return { ok: false, error: "Slug inconnu." };

    const auth = await attemptPinLoginRPCs(s, p, phone);
    if (!auth?.ok) return { ok: false, error: "PIN invalide." };

    const hasAccess = await checkAccess(phone);
    if (!hasAccess) return { ok: false, error: "Abonnement inactif." };

    rememberIdentity({ slug: s, phone });
    enrichUrlIfMissingSlug(s);
    setState({ preview: false, access_ok: true, reason: "pin_ok", slug: s, phone });
    showPage();
    return { ok: true, slug: s, phone };
  }

  function logout() {
    clearIdentity();
    setState({ preview: false, access_ok: false, reason: "logged_out", slug: "", phone: "" });
    showPage();
    goLogin("");
  }

  async function boot() {
    hidePage();

    try {
      let { slug, phone } = getSession();

      if (slug && !phone) {
        const sub = await resolveSubBySlug(slug);
        if (sub?.phone) phone = normPhone(sub.phone);
        if (sub?.slug)  slug  = normSlug(sub.slug);
      }

      if (phone && !slug) {
        const sub = await resolveSubByPhone(phone);
        if (sub?.slug) slug = normSlug(sub.slug);
      }

      if (slug || phone) {
        rememberIdentity({ slug, phone });
      }

      if (!slug && !phone) {
        if (ALLOW_PREVIEW_WITHOUT_IDENTITY) {
          setState({ preview: true, access_ok: false, reason: "preview_no_identity", slug: "", phone: "" });
          showPage();
          return state;
        }
        showPage();
        goLogin("");
        return null;
      }

      if (phone) {
        /* ─── FIX : si session récente valide → bypass checkAccess ─── */
        let ok = hasValidCachedAccess(phone);

        if (!ok) {
          ok = await checkAccess(phone);
        }

        if (ok) {
          if (slug) enrichUrlIfMissingSlug(slug);
          /* Rafraîchir la session avec ts à jour */
          rememberIdentity({ slug, phone });
          setState({
            preview:   false,
            access_ok: true,
            reason:    "access_ok",
            slug:      normSlug(slug),
            phone:     normPhone(phone)
          });
          showPage();
          return state;
        }

        if (ALLOW_PREVIEW_WITHOUT_IDENTITY) {
          setState({ preview: true, access_ok: false, reason: "no_subscription", slug: normSlug(slug), phone: normPhone(phone) });
          showPage();
          return state;
        }

        showPage();
        goLogin(slug || "");
        return null;
      }

      if (ALLOW_PREVIEW_WITHOUT_IDENTITY) {
        setState({ preview: true, access_ok: false, reason: "unknown_identity", slug: normSlug(slug), phone: "" });
        showPage();
        return state;
      }

      showPage();
      goPay({ slug, phone: "" });
      return null;

    } catch (e) {
      console.error("DIGIY_GUARD boot error:", e);
      setState({ preview: false, access_ok: false, reason: "guard_error", slug: "", phone: "" });
      showPage();
      goLogin("");
      return null;
    }
  }

  function ready() {
    if (!bootPromise) bootPromise = boot();
    return bootPromise;
  }

  ready();
})();;
