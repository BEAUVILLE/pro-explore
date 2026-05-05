/* guard.js — DIGIY EXPLORE / EXPLORE GUARD sécurisé
   Doctrine : PRO = coffre sécurisé.
   - Accepte les anciens liens ?slug= / ?phone= en secours.
   - Nettoie l’URL visible.
   - Ne réécrit jamais slug/phone dans l’adresse.
   - Travaille par session locale 8h ouverte par pin.html.
*/
(() => {
  "use strict";

  const SUPABASE_URL =
    window.DIGIY_SUPABASE_URL ||
    "https://wesqmwjjtsefyjnluosj.supabase.co";

  const SUPABASE_ANON_KEY =
    window.DIGIY_SUPABASE_ANON ||
    window.DIGIY_SUPABASE_ANON_KEY ||
    "sb_publishable_tGHItRgeWDmGjnd0CK1DVQ_BIep4Ug3";

  const MODULE_CODE = "EXPLORE";
  const LOGIN_URL = window.DIGIY_LOGIN_URL || "./pin.html";
  const PAY_URL = "https://commencer-a-payer.digiylyfe.com/";

  const ALLOW_PREVIEW_WITHOUT_IDENTITY = false;

  const SESSION_KEY = `DIGIY_${MODULE_CODE}_SESSION`;
  const ACCESS_KEY = `DIGIY_${MODULE_CODE}_ACCESS`;
  const PIN_SESSION_KEY = "digiy_explore_session";
  const MAX_SESSION_MS = 8 * 60 * 60 * 1000;

  const MODULE_PREFIX = "digiy_explore";

  const SENSITIVE_QUERY_KEYS = [
    "slug",
    "phone",
    "tel",
    "owner_phone",
    "owner_id",
    "business_code",
    "access_note",
    "keybox_code",
    "keybox_location"
  ];

  const state = {
    preview: false,
    access_ok: false,
    reason: "booting",
    slug: "",
    phone: "",
    module: MODULE_CODE
  };

  let bootPromise = null;

  const api = {
    state,
    ready,
    getSession,
    loginWithPin,
    logout,
    getSlug: () => state.slug || "",
    getPhone: () => state.phone || "",
    getModule: () => MODULE_CODE
  };

  window.DIGIY_GUARD = api;

  function showPage(){
    try{ document.documentElement.style.visibility = ""; }catch(_){}
  }

  function hidePage(){
    try{ document.documentElement.style.visibility = "hidden"; }catch(_){}
  }

  function normPhone(v){
    return String(v || "").replace(/[^\d]/g, "");
  }

  function normPin(v){
    return String(v || "").trim().replace(/\s+/g, "");
  }

  function normSlug(v){
    return String(v || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function nowIso(){
    return new Date().toISOString();
  }

  function getQs(){
    return new URLSearchParams(window.location.search);
  }

  function safeJsonParse(raw){
    try{ return JSON.parse(raw); }catch(_){ return null; }
  }

  function cleanVisibleUrl(){
    try{
      const url = new URL(window.location.href);
      let changed = false;

      SENSITIVE_QUERY_KEYS.forEach((key) => {
        if(url.searchParams.has(key)){
          url.searchParams.delete(key);
          changed = true;
        }
      });

      if(changed){
        history.replaceState({}, document.title, url.pathname + url.search + url.hash);
      }
    }catch(_){}
  }

  function cleanReturnPath(){
    try{
      const url = new URL(window.location.href);
      SENSITIVE_QUERY_KEYS.forEach((key) => url.searchParams.delete(key));
      return url.pathname + url.search + url.hash;
    }catch(_){
      return window.location.pathname || "/";
    }
  }

  function jsonHeaders(){
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    };
  }

  function getHeaders(){
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: "application/json"
    };
  }

  async function rpc(name, body){
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(body || {})
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  }

  async function tableGet(table, paramsObj){
    const params = new URLSearchParams(paramsObj || {});
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`, {
      method: "GET",
      headers: getHeaders()
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  }

  function setState(patch){
    Object.assign(state, patch || {});
    api.state = state;
    window.DIGIY_GUARD.state = state;
  }

  function readStoredSession(){
    const keys = [PIN_SESSION_KEY, SESSION_KEY, ACCESS_KEY];

    for(const key of keys){
      try{
        const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
        if(!raw) continue;

        const parsed = safeJsonParse(raw);
        if(!parsed || !parsed.phone) continue;

        const ts = Number(parsed.ts || 0);
        if(!ts || (Date.now() - ts) > MAX_SESSION_MS) continue;

        return parsed;
      }catch(_){}
    }

    return null;
  }

  function hasValidCachedAccess(phone){
    const session = readStoredSession();
    if(!session) return false;
    if(normPhone(session.phone) !== normPhone(phone)) return false;
    if(session.access_ok !== true) return false;

    const ts = Number(session.ts || 0);
    if(!ts || (Date.now() - ts) > MAX_SESSION_MS) return false;

    return true;
  }

  function rememberIdentity({ slug, phone }){
    const s = normSlug(slug);
    const p = normPhone(phone);

    if(!p && !s) return;

    try{
      const sessionObj = {
        module: MODULE_CODE,
        slug: s || "",
        phone: p || "",
        access_ok: true,
        ts: Date.now(),
        at: nowIso()
      };

      if(s){
        sessionStorage.setItem(`${MODULE_PREFIX}_slug`, s);
        sessionStorage.setItem(`${MODULE_PREFIX}_last_slug`, s);
        localStorage.setItem(`${MODULE_PREFIX}_last_slug`, s);
        localStorage.setItem("digiy_explore_slug", s);
        localStorage.setItem("digiy_last_slug", s);
        localStorage.setItem("DIGIY_SLUG", s);
        sessionStorage.setItem("digiy_explore_slug", s);
      }

      if(p){
        sessionStorage.setItem(`${MODULE_PREFIX}_phone`, p);
        localStorage.setItem(`${MODULE_PREFIX}_phone`, p);
        localStorage.setItem("digiy_explore_phone", p);
        localStorage.setItem("digiy_last_phone", p);
        localStorage.setItem("DIGIY_PHONE", p);
        sessionStorage.setItem("digiy_explore_phone", p);
      }

      const raw = JSON.stringify(sessionObj);
      localStorage.setItem(SESSION_KEY, raw);
      localStorage.setItem(ACCESS_KEY, raw);
      localStorage.setItem(PIN_SESSION_KEY, raw);
      sessionStorage.setItem(PIN_SESSION_KEY, raw);

      window.DIGIY_ACCESS = Object.assign({}, window.DIGIY_ACCESS || {}, sessionObj);
    }catch(_){}
  }

  function clearIdentity(){
    try{
      [
        `${MODULE_PREFIX}_slug`,
        `${MODULE_PREFIX}_last_slug`,
        `${MODULE_PREFIX}_phone`,
        "digiy_explore_slug",
        "digiy_explore_phone",
        "digiy_last_slug",
        "digiy_last_phone",
        "DIGIY_SLUG",
        "DIGIY_PHONE",
        SESSION_KEY,
        ACCESS_KEY,
        PIN_SESSION_KEY
      ].forEach((key) => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      });

      delete window.DIGIY_ACCESS;
    }catch(_){}
  }

  function readLegacyUrlIdentity(){
    const qs = getQs();
    return {
      slug: normSlug(qs.get("slug") || ""),
      phone: normPhone(qs.get("phone") || qs.get("tel") || "")
    };
  }

  function getSession(){
    const legacy = readLegacyUrlIdentity();
    const stored = readStoredSession();

    const sessionSlug = normSlug(
      stored?.slug ||
      window.DIGIY_ACCESS?.slug ||
      sessionStorage.getItem(`${MODULE_PREFIX}_slug`) ||
      sessionStorage.getItem(`${MODULE_PREFIX}_last_slug`) ||
      localStorage.getItem(`${MODULE_PREFIX}_last_slug`) ||
      localStorage.getItem("digiy_explore_slug") ||
      legacy.slug ||
      ""
    );

    const sessionPhone = normPhone(
      stored?.phone ||
      window.DIGIY_ACCESS?.phone ||
      sessionStorage.getItem(`${MODULE_PREFIX}_phone`) ||
      localStorage.getItem(`${MODULE_PREFIX}_phone`) ||
      localStorage.getItem("digiy_explore_phone") ||
      legacy.phone ||
      ""
    );

    return {
      module: MODULE_CODE,
      slug: sessionSlug,
      phone: sessionPhone
    };
  }

  function buildLoginUrl(){
    const u = new URL(LOGIN_URL, window.location.href);
    const route = String((window.location.pathname || "").split("/").pop() || "")
      .replace(".html", "")
      .trim();

    if(["cockpit", "lieux", "submit", "claw"].includes(route)){
      u.searchParams.set("route", route);
    }

    return u.pathname + u.search;
  }

  function goLogin(){
    window.location.replace(buildLoginUrl());
  }

  function buildPayUrl(){
    const u = new URL(PAY_URL);
    u.searchParams.set("module", MODULE_CODE);
    u.searchParams.set("return", cleanReturnPath());
    return u.toString();
  }

  function goPay(){
    window.location.replace(buildPayUrl());
  }

  async function resolveSubBySlug(slug){
    const s = normSlug(slug);
    if(!s) return null;

    const res = await tableGet("digiy_subscriptions_public", {
      select: "phone,slug,module",
      slug: `eq.${s}`,
      module: `eq.${MODULE_CODE}`,
      limit: "1"
    });

    if(!res.ok || !Array.isArray(res.data) || !res.data[0]) return null;

    return {
      slug: normSlug(res.data[0].slug),
      phone: normPhone(res.data[0].phone),
      module: String(res.data[0].module || "")
    };
  }

  async function resolveSubByPhone(phone){
    const p = normPhone(phone);
    if(!p) return null;

    const res = await tableGet("digiy_subscriptions_public", {
      select: "phone,slug,module",
      phone: `eq.${p}`,
      module: `eq.${MODULE_CODE}`,
      limit: "1"
    });

    if(!res.ok || !Array.isArray(res.data) || !res.data[0]) return null;

    return {
      slug: normSlug(res.data[0].slug),
      phone: normPhone(res.data[0].phone),
      module: String(res.data[0].module || "")
    };
  }

  async function checkAccess(phone){
    const p = normPhone(phone);
    if(!p) return false;

    const tries = [
      { name: "digiy_has_access", body: { p_phone: p, p_module: MODULE_CODE } },
      { name: "digiy_has_access", body: { phone: p, module: MODULE_CODE } }
    ];

    for(const t of tries){
      const res = await rpc(t.name, t.body);
      if(!res.ok) continue;
      if(res.data === true) return true;
      if(res.data?.ok === true) return true;
      if(res.data?.access === true) return true;
    }

    return false;
  }

  async function attemptPinLoginRPCs(slug, pin, phone){
    const s = normSlug(slug);
    const p = normPin(pin);
    const ph = normPhone(phone);

    if(!ph || !p) return null;

    const tries = [
      { name: "digiy_verify_pin", body: { p_phone: ph, p_module: MODULE_CODE, p_pin: p } },
      { name: "digiy_verify_pin", body: { p_phone: ph, p_module: MODULE_CODE.toLowerCase(), p_pin: p } }
    ];

    for(const t of tries){
      const res = await rpc(t.name, t.body);
      if(!res.ok) continue;

      const d = res.data;
      const row = Array.isArray(d) ? d[0] : d;

      if(row?.ok === true || row?.access_ok === true){
        return {
          ok: true,
          slug: normSlug(row.slug || row.subscription_slug || s),
          phone: normPhone(row.phone || ph)
        };
      }
    }

    return null;
  }

  async function loginWithPin(slug, pin){
    const s = normSlug(slug);
    const p = normPin(pin);

    if(!s) return { ok: false, error: "Identifiant manquant." };
    if(!p) return { ok: false, error: "PIN manquant." };

    const sub = await resolveSubBySlug(s);
    const phone = normPhone(sub?.phone);

    if(!phone) return { ok: false, error: "Identifiant inconnu." };

    const auth = await attemptPinLoginRPCs(s, p, phone);
    if(!auth?.ok) return { ok: false, error: "PIN invalide." };

    const hasAccess = await checkAccess(phone);
    if(!hasAccess) return { ok: false, error: "Ton accès n'est pas actif pour le moment." };

    rememberIdentity({ slug: auth.slug || s, phone });
    cleanVisibleUrl();

    setState({
      preview: false,
      access_ok: true,
      reason: "pin_ok",
      slug: auth.slug || s,
      phone
    });

    showPage();
    return { ok: true, slug: auth.slug || s, phone };
  }

  function logout(){
    clearIdentity();

    setState({
      preview: false,
      access_ok: false,
      reason: "logged_out",
      slug: "",
      phone: ""
    });

    showPage();
    goLogin();
  }

  async function boot(){
    hidePage();

    try{
      cleanVisibleUrl();

      let { slug, phone } = getSession();

      if(slug && !phone){
        const sub = await resolveSubBySlug(slug);
        if(sub?.phone) phone = normPhone(sub.phone);
        if(sub?.slug) slug = normSlug(sub.slug);
      }

      if(phone && !slug){
        const sub = await resolveSubByPhone(phone);
        if(sub?.slug) slug = normSlug(sub.slug);
      }

      if(slug || phone){
        rememberIdentity({ slug, phone });
      }

      if(!slug && !phone){
        if(ALLOW_PREVIEW_WITHOUT_IDENTITY){
          setState({
            preview: true,
            access_ok: false,
            reason: "preview_no_identity",
            slug: "",
            phone: ""
          });
          showPage();
          return state;
        }

        showPage();
        goLogin();
        return null;
      }

      if(phone){
        let ok = hasValidCachedAccess(phone);

        if(!ok){
          ok = await checkAccess(phone);
        }

        if(ok){
          rememberIdentity({ slug, phone });

          setState({
            preview: false,
            access_ok: true,
            reason: "access_ok",
            slug: normSlug(slug),
            phone: normPhone(phone)
          });

          cleanVisibleUrl();
          showPage();
          return state;
        }

        if(ALLOW_PREVIEW_WITHOUT_IDENTITY){
          setState({
            preview: true,
            access_ok: false,
            reason: "no_subscription",
            slug: normSlug(slug),
            phone: normPhone(phone)
          });
          showPage();
          return state;
        }

        showPage();
        goLogin();
        return null;
      }

      if(ALLOW_PREVIEW_WITHOUT_IDENTITY){
        setState({
          preview: true,
          access_ok: false,
          reason: "unknown_identity",
          slug: normSlug(slug),
          phone: ""
        });
        showPage();
        return state;
      }

      showPage();
      goPay();
      return null;
    }catch(e){
      console.error("DIGIY_GUARD boot error:", e);
      setState({
        preview: false,
        access_ok: false,
        reason: "guard_error",
        slug: "",
        phone: ""
      });
      showPage();
      goLogin();
      return null;
    }
  }

  function ready(){
    if(!bootPromise) bootPromise = boot();
    return bootPromise;
  }

  ready();
})();
