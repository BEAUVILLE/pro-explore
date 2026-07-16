/* guard.js — DIGIY EXPLORE / EXPLORE GUARD sécurisé
   Doctrine : PRO = coffre sécurisé.
   - Session locale fraîche 8h ouverte par pin.html.
   - Nettoie l’URL visible.
   - Ne réécrit jamais slug/phone dans l’adresse.
   - Accès central ABOS d’abord : digiy_has_module_access_from_abos(phone, "EXPLORE_BOOST")
   - Secours transition : ancien digiy_has_access si ABOS ne répond pas encore.
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
  const MODULE_CODE_LOWER = "explore";

  // Dans ABOS, l’accès validé est EXPLORE_BOOST.
  // On garde EXPLORE comme nom de module écran, mais on vérifie BOOST côté abonnement.
  const ACCESS_MODULE_CODE = "EXPLORE_BOOST";
  const ACCESS_MODULE_CODE_LOWER = "explore_boost";

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
    module: MODULE_CODE,
    access_module: ACCESS_MODULE_CODE
  };

  let bootPromise = null;

  const api = {
    state,
    ready,
    getSession,
    loginWithPin,
    logout,
    checkAccess,
    checkAccessFromAbos,
    checkAccessLegacy,
    buildPayUrl,
    goPay,
    getSlug: () => state.slug || "",
    getPhone: () => state.phone || "",
    getModule: () => MODULE_CODE,
    getAccessModule: () => ACCESS_MODULE_CODE
  };

  window.DIGIY_GUARD = api;

  function showPage() {
    try {
      document.documentElement.style.visibility = "";
    } catch (_) {}
  }

  function hidePage() {
    try {
      document.documentElement.style.visibility = "hidden";
    } catch (_) {}
  }

  function normPhone(v) {
    const digits = String(v || "").replace(/[^\d]/g, "");
    if (!digits) return "";
    if (digits.startsWith("221") && digits.length === 12) return digits;
    if (digits.length === 9) return "221" + digits;
    return digits;
  }

  function normPin(v) {
    return String(v || "").trim().replace(/\s+/g, "");
  }

  function normSlug(v) {
    return String(v || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "")
      .replace(/-+/g, "-")
      .replace(/^[-_]+|[-_]+$/g, "");
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function getQs() {
    return new URLSearchParams(window.location.search);
  }

  function safeJsonParse(raw) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function cleanVisibleUrl() {
    try {
      const url = new URL(window.location.href);
      let changed = false;

      SENSITIVE_QUERY_KEYS.forEach((key) => {
        if (url.searchParams.has(key)) {
          url.searchParams.delete(key);
          changed = true;
        }
      });

      if (changed) {
        history.replaceState({}, document.title, url.pathname + url.search + url.hash);
      }
    } catch (_) {}
  }

  function cleanReturnPath() {
    try {
      const url = new URL(window.location.href);
      SENSITIVE_QUERY_KEYS.forEach((key) => url.searchParams.delete(key));
      return url.pathname + url.search + url.hash;
    } catch (_) {
      return window.location.pathname || "/";
    }
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

  function boolFromRpcData(data) {
    const raw = Array.isArray(data) ? data[0] : data;

    if (raw === true) return true;
    if (raw === 1) return true;

    if (typeof raw === "string") {
      const txt = raw.trim().toLowerCase();

      if (txt === "true" || txt === "t" || txt === "1" || txt === "yes" || txt === "ok") {
        return true;
      }

      if (txt.startsWith("(")) {
        const first = txt.replace(/^\(/, "").split(",")[0];
        const token = String(first || "").trim().replace(/^"|"$/g, "").toLowerCase();
        if (token === "t" || token === "true" || token === "1") return true;
      }

      return false;
    }

    if (raw && typeof raw === "object") {
      if (raw.ok === true) return true;
      if (raw.access === true) return true;
      if (raw.access_ok === true) return true;
      if (raw.has_access === true) return true;
      if (raw.allowed === true) return true;
      if (raw.active === true) return true;
      if (raw.is_active === true) return true;
      if (raw.subscribed === true) return true;
      if (raw.valid === true) return true;

      const vals = Object.values(raw);
      if (vals.some((v) => v === true || v === 1 || v === "t" || v === "true")) {
        return true;
      }
    }

    return false;
  }

  function setState(patch) {
    Object.assign(state, patch || {});
    api.state = state;
    window.DIGIY_GUARD.state = state;
  }

  function readStoredSession() {
    const keys = [PIN_SESSION_KEY, SESSION_KEY, ACCESS_KEY];

    for (const key of keys) {
      try {
        const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
        if (!raw) continue;

        const parsed = safeJsonParse(raw);
        if (!parsed || !parsed.phone) continue;

        const ts = Number(parsed.ts || 0);
        if (!ts || Date.now() - ts > MAX_SESSION_MS) continue;

        return parsed;
      } catch (_) {}
    }

    return null;
  }

  function hasValidCachedAccess(phone) {
    const session = readStoredSession();
    if (!session) return false;
    if (normPhone(session.phone) !== normPhone(phone)) return false;
    if (session.access_ok !== true) return false;

    const ts = Number(session.ts || 0);
    if (!ts || Date.now() - ts > MAX_SESSION_MS) return false;

    return true;
  }

  function rememberIdentity({ slug, phone }) {
    const s = normSlug(slug);
    const p = normPhone(phone);

    if (!p && !s) return;

    try {
      const sessionObj = {
        module: MODULE_CODE,
        access_module: ACCESS_MODULE_CODE,
        slug: s || "",
        phone: p || "",
        access_ok: true,
        ts: Date.now(),
        at: nowIso()
      };

      if (s) {
        sessionStorage.setItem(`${MODULE_PREFIX}_slug`, s);
        sessionStorage.setItem(`${MODULE_PREFIX}_last_slug`, s);
        localStorage.setItem(`${MODULE_PREFIX}_last_slug`, s);
        localStorage.setItem("digiy_explore_slug", s);
        localStorage.setItem("digiy_last_slug", s);
        localStorage.setItem("DIGIY_SLUG", s);
        sessionStorage.setItem("digiy_explore_slug", s);
      }

      if (p) {
        sessionStorage.setItem(`${MODULE_PREFIX}_phone`, p);
        sessionStorage.setItem("digiy_explore_phone", p);
        window.DIGIY_EXPLORE_HUB_PHONE = p;

        // Nettoyage des anciennes traces locales téléphone direct.
        // La session JSON garde le contexte 8h, mais les clés téléphone brutes restent côté session.
        localStorage.removeItem(`${MODULE_PREFIX}_phone`);
        localStorage.removeItem("digiy_explore_phone");
        localStorage.removeItem("digiy_last_phone");
        localStorage.removeItem("DIGIY_PHONE");
      }

      const raw = JSON.stringify(sessionObj);
      localStorage.setItem(SESSION_KEY, raw);
      localStorage.setItem(ACCESS_KEY, raw);
      localStorage.setItem(PIN_SESSION_KEY, raw);
      sessionStorage.setItem(PIN_SESSION_KEY, raw);

      window.DIGIY_ACCESS = Object.assign({}, window.DIGIY_ACCESS || {}, sessionObj);
    } catch (_) {}
  }

  function clearIdentity() {
    try {
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
      delete window.DIGIY_EXPLORE_HUB_PHONE;
    } catch (_) {}
  }

  function readLegacyUrlIdentity() {
    const qs = getQs();

    return {
      slug: normSlug(qs.get("slug") || ""),
      phone: normPhone(qs.get("phone") || qs.get("tel") || "")
    };
  }

  function getSession() {
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
        sessionStorage.getItem("digiy_explore_phone") ||
        window.DIGIY_EXPLORE_HUB_PHONE ||
        legacy.phone ||
        ""
    );

    return {
      module: MODULE_CODE,
      access_module: ACCESS_MODULE_CODE,
      slug: sessionSlug,
      phone: sessionPhone
    };
  }

  function buildLoginUrl() {
    const u = new URL(LOGIN_URL, window.location.href);
    const route = String((window.location.pathname || "").split("/").pop() || "")
      .replace(".html", "")
      .trim();

    if (["cockpit", "lieux", "submit", "claw"].includes(route)) {
      u.searchParams.set("route", route);
    }

    return u.pathname + u.search;
  }

  function goLogin() {
    window.location.replace(buildLoginUrl());
  }

  function buildPayUrl() {
    const u = new URL(PAY_URL);
    u.searchParams.set("module", ACCESS_MODULE_CODE);
    u.searchParams.set("from", MODULE_CODE);
    u.searchParams.set("return", cleanReturnPath());
    return u.toString();
  }

  function goPay() {
    window.location.replace(buildPayUrl());
  }

  async function resolveSubBySlug(slug) {
    const s = normSlug(slug);
    if (!s) return null;

    const tries = [
      {
        select: "phone,slug,module",
        slug: `eq.${s}`,
        module: `eq.${MODULE_CODE}`,
        limit: "1"
      },
      {
        select: "phone,slug,module",
        slug: `eq.${s}`,
        module: `eq.${MODULE_CODE_LOWER}`,
        limit: "1"
      },
      {
        select: "phone,slug,module",
        slug: `eq.${s}`,
        module: `eq.${ACCESS_MODULE_CODE}`,
        limit: "1"
      },
      {
        select: "phone,slug,module",
        slug: `eq.${s}`,
        module: `eq.${ACCESS_MODULE_CODE_LOWER}`,
        limit: "1"
      },
      {
        select: "phone,slug,module",
        slug: `eq.${s}`,
        limit: "1"
      }
    ];

    for (const params of tries) {
      const res = await tableGet("digiy_subscriptions_public", params);

      if (!res.ok || !Array.isArray(res.data) || !res.data[0]) continue;

      return {
        slug: normSlug(res.data[0].slug),
        phone: normPhone(res.data[0].phone),
        module: String(res.data[0].module || "")
      };
    }

    return null;
  }

  async function resolveSubByPhone(phone) {
    const p = normPhone(phone);
    if (!p) return null;

    const tries = [
      {
        select: "phone,slug,module",
        phone: `eq.${p}`,
        module: `eq.${MODULE_CODE}`,
        limit: "1"
      },
      {
        select: "phone,slug,module",
        phone: `eq.${p}`,
        module: `eq.${MODULE_CODE_LOWER}`,
        limit: "1"
      },
      {
        select: "phone,slug,module",
        phone: `eq.${p}`,
        module: `eq.${ACCESS_MODULE_CODE}`,
        limit: "1"
      },
      {
        select: "phone,slug,module",
        phone: `eq.${p}`,
        module: `eq.${ACCESS_MODULE_CODE_LOWER}`,
        limit: "1"
      },
      {
        select: "phone,slug,module",
        phone: `eq.${p}`,
        limit: "1"
      }
    ];

    for (const params of tries) {
      const res = await tableGet("digiy_subscriptions_public", params);

      if (!res.ok || !Array.isArray(res.data) || !res.data[0]) continue;

      return {
        slug: normSlug(res.data[0].slug),
        phone: normPhone(res.data[0].phone),
        module: String(res.data[0].module || "")
      };
    }

    return null;
  }

  async function tryRpcBoolean(name, payloads) {
    for (const body of payloads) {
      const res = await rpc(name, body);
      if (!res.ok) continue;

      if (boolFromRpcData(res.data)) {
        return {
          ok: true,
          data: res.data,
          payload: body
        };
      }
    }

    return {
      ok: false,
      data: null,
      payload: null
    };
  }

  async function checkAccessFromAbos(phone) {
    const p = normPhone(phone);
    if (!p) return false;

    const payloads = [
      { p_phone: p, p_module: ACCESS_MODULE_CODE },
      { phone: p, module: ACCESS_MODULE_CODE },

      // Secours si une ligne ABOS a été nommée EXPLORE au lieu d’EXPLORE_BOOST.
      { p_phone: p, p_module: MODULE_CODE },
      { phone: p, module: MODULE_CODE },

      { p_phone: p, p_module: ACCESS_MODULE_CODE_LOWER },
      { phone: p, module: ACCESS_MODULE_CODE_LOWER },
      { p_phone: p, p_module: MODULE_CODE_LOWER },
      { phone: p, module: MODULE_CODE_LOWER }
    ];

    const res = await tryRpcBoolean("digiy_has_module_access_from_abos", payloads);
    return !!res.ok;
  }

  async function checkAccessLegacy(phone) {
    const p = normPhone(phone);
    if (!p) return false;

    const payloads = [
      { p_phone: p, p_module: MODULE_CODE },
      { phone: p, module: MODULE_CODE },
      { p_phone: p, p_module: MODULE_CODE_LOWER },
      { phone: p, module: MODULE_CODE_LOWER },

      // Secours transition si l’ancien rail a déjà rangé l’accès sous EXPLORE_BOOST.
      { p_phone: p, p_module: ACCESS_MODULE_CODE },
      { phone: p, module: ACCESS_MODULE_CODE },
      { p_phone: p, p_module: ACCESS_MODULE_CODE_LOWER },
      { phone: p, module: ACCESS_MODULE_CODE_LOWER }
    ];

    const res = await tryRpcBoolean("digiy_has_access", payloads);
    return !!res.ok;
  }

  async function checkAccess(phone) {
    const p = normPhone(phone);
    if (!p) return false;

    // 1. Vérité principale : ABOS central.
    const abosOk = await checkAccessFromAbos(p);
    if (abosOk) return true;

    // 2. Secours transition : ancien rail.
    const legacyOk = await checkAccessLegacy(p);
    if (legacyOk) return true;

    return false;
  }

  function parseVerifyPinPayload(data, fallbackPhone, fallbackSlug) {
    const raw = Array.isArray(data) ? data[0] : data;
    if (!raw) return null;

    if (typeof raw === "object" && !Array.isArray(raw)) {
      if (raw.ok === true || raw.access_ok === true || raw.valid === true) {
        return {
          ok: true,
          slug: normSlug(raw.slug || raw.subscription_slug || raw.owner_slug || fallbackSlug || ""),
          phone: normPhone(raw.phone || raw.p_phone || fallbackPhone || "")
        };
      }

      const vals = Object.values(raw);
      if (vals.length >= 3) {
        const okLike =
          vals[0] === true ||
          vals[0] === "t" ||
          vals[0] === "true" ||
          vals[0] === 1;

        if (okLike) {
          return {
            ok: true,
            slug: normSlug(fallbackSlug || ""),
            phone: normPhone(vals[2] || fallbackPhone || "")
          };
        }
      }
    }

    if (typeof raw === "string") {
      const txt = raw.trim();

      if (txt.startsWith("(") && txt.endsWith(")")) {
        const m = txt.match(/^\(([^,]+),([^,]+),([^,]+),?(.*)\)$/);

        if (m) {
          const okToken = String(m[1] || "").trim().replace(/^"|"$/g, "");
          const okLike =
            okToken === "t" ||
            okToken === "true" ||
            okToken === "1";

          if (okLike) {
            return {
              ok: true,
              slug: normSlug(fallbackSlug || ""),
              phone: normPhone(String(m[3] || "").trim().replace(/^"|"$/g, "") || fallbackPhone || "")
            };
          }
        }
      }
    }

    return null;
  }

  async function attemptPinLoginRPCs(slug, pin, phone) {
    const s = normSlug(slug);
    const p = normPin(pin);
    const ph = normPhone(phone);

    if (!ph || !p) return null;

    const tries = [
      { name: "digiy_verify_pin", body: { p_phone: ph, p_module: MODULE_CODE, p_pin: p } },
      { name: "digiy_verify_pin", body: { p_phone: ph, p_module: MODULE_CODE_LOWER, p_pin: p } },

      // Secours si PIN/abonnement a été rangé sous EXPLORE_BOOST.
      { name: "digiy_verify_pin", body: { p_phone: ph, p_module: ACCESS_MODULE_CODE, p_pin: p } },
      { name: "digiy_verify_pin", body: { p_phone: ph, p_module: ACCESS_MODULE_CODE_LOWER, p_pin: p } }
    ];

    for (const t of tries) {
      const res = await rpc(t.name, t.body);
      if (!res.ok) continue;

      const parsed = parseVerifyPinPayload(res.data, ph, s);
      if (!parsed?.ok) continue;

      return {
        ok: true,
        slug: normSlug(parsed.slug || s),
        phone: normPhone(parsed.phone || ph)
      };
    }

    return null;
  }

  async function loginWithPin(slug, pin) {
    const s = normSlug(slug);
    const p = normPin(pin);

    if (!s) return { ok: false, error: "Identifiant manquant." };
    if (!p) return { ok: false, error: "PIN manquant." };

    const sub = await resolveSubBySlug(s);
    const phone = normPhone(sub?.phone);

    if (!phone) return { ok: false, error: "Identifiant inconnu." };

    const auth = await attemptPinLoginRPCs(s, p, phone);
    if (!auth?.ok) return { ok: false, error: "PIN invalide." };

    const finalSlug = normSlug(auth.slug || s);
    const finalPhone = normPhone(auth.phone || phone);

    const hasAccess = await checkAccess(finalPhone);
    if (!hasAccess) {
      return {
        ok: false,
        error: "Ton accès EXPLORE n'est pas actif pour le moment."
      };
    }

    rememberIdentity({ slug: finalSlug, phone: finalPhone });
    cleanVisibleUrl();

    setState({
      preview: false,
      access_ok: true,
      reason: "pin_ok",
      slug: finalSlug,
      phone: finalPhone,
      module: MODULE_CODE,
      access_module: ACCESS_MODULE_CODE
    });

    showPage();

    return {
      ok: true,
      slug: finalSlug,
      phone: finalPhone,
      module: MODULE_CODE,
      access_module: ACCESS_MODULE_CODE
    };
  }

  function logout() {
    clearIdentity();

    setState({
      preview: false,
      access_ok: false,
      reason: "logged_out",
      slug: "",
      phone: "",
      module: MODULE_CODE,
      access_module: ACCESS_MODULE_CODE
    });

    showPage();
    goLogin();
  }

  async function boot() {
    hidePage();

    try {
      cleanVisibleUrl();

      let { slug, phone } = getSession();

      if (slug && !phone) {
        const sub = await resolveSubBySlug(slug);
        if (sub?.phone) phone = normPhone(sub.phone);
        if (sub?.slug) slug = normSlug(sub.slug);
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
          setState({
            preview: true,
            access_ok: false,
            reason: "preview_no_identity",
            slug: "",
            phone: "",
            module: MODULE_CODE,
            access_module: ACCESS_MODULE_CODE
          });

          showPage();
          return state;
        }

        showPage();
        goLogin();
        return null;
      }

      if (phone) {
        let ok = hasValidCachedAccess(phone);

        if (!ok) {
          ok = await checkAccess(phone);
        }

        if (ok) {
          rememberIdentity({ slug, phone });

          setState({
            preview: false,
            access_ok: true,
            reason: "access_ok",
            slug: normSlug(slug),
            phone: normPhone(phone),
            module: MODULE_CODE,
            access_module: ACCESS_MODULE_CODE
          });

          cleanVisibleUrl();
          showPage();
          return state;
        }

        if (ALLOW_PREVIEW_WITHOUT_IDENTITY) {
          setState({
            preview: true,
            access_ok: false,
            reason: "no_subscription",
            slug: normSlug(slug),
            phone: normPhone(phone),
            module: MODULE_CODE,
            access_module: ACCESS_MODULE_CODE
          });

          showPage();
          return state;
        }

        showPage();
        goLogin();
        return null;
      }

      if (ALLOW_PREVIEW_WITHOUT_IDENTITY) {
        setState({
          preview: true,
          access_ok: false,
          reason: "unknown_identity",
          slug: normSlug(slug),
          phone: "",
          module: MODULE_CODE,
          access_module: ACCESS_MODULE_CODE
        });

        showPage();
        return state;
      }

      showPage();
      goPay();
      return null;
    } catch (e) {
      console.error("DIGIY_GUARD boot error:", e);

      setState({
        preview: false,
        access_ok: false,
        reason: "guard_error",
        slug: "",
        phone: "",
        module: MODULE_CODE,
        access_module: ACCESS_MODULE_CODE
      });

      showPage();
      goLogin();
      return null;
    }
  }

  function ready() {
    if (!bootPromise) bootPromise = boot();
    return bootPromise;
  }

  cleanVisibleUrl();
  ready();
})();
