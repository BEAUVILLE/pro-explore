// explore-alerts.js — DIGIY EXPLORE / chef de passe
// Rôle : lire derrière, réduire le bruit, remonter seulement les actions utiles.
// Doctrine : le pro clique plus qu’il n’écrit. DIGIY transmet. L’écran respire.
// Sécurité : ne remet jamais phone, tel ou identifiant sensible dans l’URL visible.

(() => {
  "use strict";

  const CFG = {
    MODULE: "EXPLORE",
    VERSION: "explore-alerts-v1",
    MAX_ALERTS: 5,

    PATHS: {
      home: "./index.html",
      cockpit: "./cockpit.html",
      lieux: "./lieux.html",
      submit: "./submit.html",
      pin: "./pin.html",
      claw: "./claw.html",
      publicBase: "https://explore.digiylyfe.com/"
    },

    SENSITIVE_KEYS: [
      "phone",
      "tel",
      "owner_phone",
      "contact_phone",
      "owner_id",
      "business_code",
      "access_note",
      "keybox_code",
      "keybox_location",
      "module",
      "return",
      "from"
    ]
  };

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeSlug(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function cleanVisibleUrl() {
    try {
      const url = new URL(window.location.href);
      let changed = false;

      CFG.SENSITIVE_KEYS.forEach((key) => {
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

  function cleanInternalUrl(path, fallback = "./index.html") {
    const raw = String(path || fallback).trim() || fallback;

    try {
      const url = new URL(raw, window.location.href);

      CFG.SENSITIVE_KEYS.forEach((key) => {
        url.searchParams.delete(key);
      });

      if (url.origin !== window.location.origin) {
        return url.toString();
      }

      const file = url.pathname.split("/").pop() || "index.html";
      return `./${file}${url.search || ""}${url.hash || ""}`;
    } catch (_) {
      return fallback;
    }
  }

  function publicPlaceUrl(slug) {
    const s = normalizeSlug(slug);
    if (!s) return CFG.PATHS.publicBase;

    const url = new URL(CFG.PATHS.publicBase);
    url.searchParams.set("slug", s);
    return url.toString();
  }

  function placeValue(place, keys) {
    if (!place || typeof place !== "object") return "";

    for (const key of keys) {
      const value = place[key];
      if (value !== null && value !== undefined && String(value).trim() !== "") {
        return String(value).trim();
      }
    }

    return "";
  }

  function hasAny(place, keys) {
    return !!placeValue(place, keys);
  }

  function isPublished(place, ctx) {
    if (ctx?.is_published === true) return true;
    if (!place || typeof place !== "object") return false;

    return (
      place.is_published === true ||
      place.published === true ||
      String(place.status || "").toLowerCase() === "published"
    );
  }

  function makeAlert(input) {
    return {
      id: input.id || `explore-alert-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      level: input.level || "info",
      icon: input.icon || "🔔",
      title: input.title || "Alerte DIGIY",
      text: input.text || "Une action est recommandée.",
      primaryLabel: input.primaryLabel || "Ouvrir",
      primaryHref: cleanInternalUrl(input.primaryHref || CFG.PATHS.cockpit),
      secondaryLabel: input.secondaryLabel || "",
      secondaryHref: input.secondaryHref || "",
      reason: input.reason || "",
      priority: Number(input.priority || 50),
      external: input.external === true
    };
  }

  function computeStats(ctx = {}) {
    const total = Number(ctx.owner_places_count || ctx.total_places || 0);
    const published = Number(ctx.published_places_count || ctx.public_places_count || 0);

    return {
      total: Number.isFinite(total) ? total : 0,
      published: Number.isFinite(published) ? published : 0,
      draft: Math.max(0, (Number.isFinite(total) ? total : 0) - (Number.isFinite(published) ? published : 0)),
      hasPlace: !!ctx.place,
      hasSlug: !!normalizeSlug(ctx.slug || ctx.place?.slug || "")
    };
  }

  function normalizeContext(raw = {}) {
    const helper = window.DIGIY_CLAW_EXPLORE || null;
    const guard = window.DIGIY_GUARD || null;
    const place = raw.place && typeof raw.place === "object" ? raw.place : null;
    const slug = normalizeSlug(raw.slug || place?.slug || helper?.resolveSlug?.() || "");

    return {
      module: String(raw.module || CFG.MODULE).toUpperCase(),
      page: String(raw.page || location.pathname.split("/").pop() || "index.html").toLowerCase(),
      version: raw.version || CFG.VERSION,
      slug,
      phone_present: !!(raw.phone || guard?.state?.phone),
      access_ok: raw.access_ok === true || guard?.state?.access_ok === true,
      preview: raw.preview !== false,
      reason: raw.reason || guard?.state?.reason || "",
      place,
      owner_places_count: Number(raw.owner_places_count || 0),
      published_places_count: Number(raw.published_places_count || 0),
      business_name: raw.business_name || placeValue(place, ["public_name", "name", "title", "label"]),
      city: raw.city || placeValue(place, ["city"]),
      zone: raw.zone || placeValue(place, ["zone", "district", "quarter"]),
      activity: raw.activity || placeValue(place, ["category_label", "category_name", "category_code", "subcategory"]),
      is_published: isPublished(place, raw),
      helper_loaded: !!helper,
      links: {
        home: CFG.PATHS.home,
        cockpit: CFG.PATHS.cockpit,
        lieux: CFG.PATHS.lieux,
        submit: CFG.PATHS.submit,
        pin: CFG.PATHS.pin,
        claw: CFG.PATHS.claw,
        public: publicPlaceUrl(slug)
      }
    };
  }

  function buildAlerts(ctx = {}) {
    const data = normalizeContext(ctx);
    const stats = computeStats(data);
    const place = data.place || {};
    const alerts = [];

    if (!data.helper_loaded) {
      alerts.push(makeAlert({
        id: "helper-missing",
        level: "warning",
        icon: "🧩",
        title: "Lien entre fichiers à compléter",
        text: "Le chef de passe attend claw-tools-explore.js pour lire le contexte réel.",
        primaryLabel: "Accueil",
        primaryHref: CFG.PATHS.home,
        reason: "Ajoute ce SRC avant explore-alerts.js : ./claw-tools-explore.js?v=explore-claw",
        priority: 100
      }));
    }

    if (!data.access_ok) {
      alerts.push(makeAlert({
        id: "access-required",
        level: "warning",
        icon: "🔒",
        title: "Accès à confirmer",
        text: "Entre le code pour lire et modifier les lieux en sécurité.",
        primaryLabel: "Entrer le code",
        primaryHref: CFG.PATHS.pin,
        reason: "EXPLORE garde le téléphone et le contexte dans le coffre de session, pas dans l’adresse visible.",
        priority: 96
      }));
    }

    if (stats.total === 0) {
      alerts.push(makeAlert({
        id: "no-place",
        level: "action",
        icon: "➕",
        title: "Aucun lieu posé",
        text: "Ajoute le premier lieu pour ouvrir la vitrine du terrain.",
        primaryLabel: "Ajouter",
        primaryHref: CFG.PATHS.submit,
        reason: "Sans lieu, EXPLORE ne peut pas faire découvrir l’endroit au public.",
        priority: 92
      }));
    }

    if (stats.total > 0 && stats.published === 0) {
      alerts.push(makeAlert({
        id: "no-published-place",
        level: "hot",
        icon: "🌍",
        title: "Aucun lieu publié",
        text: "Des lieux existent, mais aucun ne semble visible côté public.",
        primaryLabel: "Voir mes lieux",
        primaryHref: CFG.PATHS.lieux,
        secondaryLabel: "Ajouter",
        secondaryHref: CFG.PATHS.submit,
        reason: "Une fiche en préparation garde la main au pro, mais le public ne la voit pas encore.",
        priority: 90
      }));
    }

    if (stats.hasPlace && !data.is_published) {
      alerts.push(makeAlert({
        id: "place-draft",
        level: "warning",
        icon: "📝",
        title: "Fiche en préparation",
        text: `${data.business_name || "Ce lieu"} n’est pas encore publié.`,
        primaryLabel: "Corriger",
        primaryHref: `${CFG.PATHS.submit}?edit=1`,
        secondaryLabel: "Mes lieux",
        secondaryHref: CFG.PATHS.lieux,
        reason: "Regarde le nom, la zone, la phrase courte et le contact avant publication.",
        priority: 88
      }));
    }

    if (stats.hasPlace && !hasAny(place, ["cover_url", "coverUrl", "image_url", "image", "photo_url", "main_photo_url"])) {
      alerts.push(makeAlert({
        id: "missing-cover",
        level: "info",
        icon: "🖼️",
        title: "Image à renforcer",
        text: "Une photo principale aide le client à sentir le lieu vite.",
        primaryLabel: "Ajouter photo",
        primaryHref: `${CFG.PATHS.submit}?edit=1#coverUrl`,
        reason: "EXPLORE appelle d’abord le regard. Une image claire donne envie sans long discours.",
        priority: 74
      }));
    }

    if (stats.hasPlace && (!data.city || !data.zone) && !hasAny(place, ["address_text", "address", "addressText"])) {
      alerts.push(makeAlert({
        id: "missing-zone",
        level: "info",
        icon: "📍",
        title: "Repère à préciser",
        text: "Ville, zone ou adresse donnent confiance au visiteur.",
        primaryLabel: "Préciser",
        primaryHref: `${CFG.PATHS.submit}?edit=1#city`,
        reason: "Le client doit comprendre vite où se trouve le lieu.",
        priority: 70
      }));
    }

    if (stats.hasPlace && !hasAny(place, ["short_description", "shortDescription", "description", "full_description", "fullDescription"])) {
      alerts.push(makeAlert({
        id: "missing-description",
        level: "info",
        icon: "✍️",
        title: "Phrase courte à poser",
        text: "Une phrase simple suffit pour expliquer pourquoi venir.",
        primaryLabel: "Écrire vite",
        primaryHref: `${CFG.PATHS.submit}?edit=1#shortDescription`,
        reason: "DIGIY doit aider à formuler sans demander au pro d’écrire un roman.",
        priority: 68
      }));
    }

    if (stats.published > 0) {
      alerts.push(makeAlert({
        id: "public-visible",
        level: "success",
        icon: "✅",
        title: `${stats.published} lieu(x) visible(s)`,
        text: "La vitrine existe. Vérifie la fiche publique ou continue à enrichir.",
        primaryLabel: "Voir public",
        primaryHref: data.links.public,
        secondaryLabel: "Mes lieux",
        secondaryHref: CFG.PATHS.lieux,
        external: true,
        reason: "Le terrain commence à sortir de l’ombre : le client peut voir et comprendre.",
        priority: 54
      }));
    }

    if (!alerts.length) {
      alerts.push(makeAlert({
        id: "nothing-urgent",
        level: "success",
        icon: "✅",
        title: "Rien d’urgent",
        text: "L’espace est propre. Tu peux voir, ajouter ou écouter DIGIY.",
        primaryLabel: "Actions",
        primaryHref: CFG.PATHS.home,
        secondaryLabel: "Ajouter",
        secondaryHref: CFG.PATHS.submit,
        reason: "Aucune action forte détectée pour l’instant.",
        priority: 30
      }));
    }

    return alerts
      .sort((a, b) => b.priority - a.priority)
      .slice(0, CFG.MAX_ALERTS);
  }

  async function readData() {
    cleanVisibleUrl();

    try {
      if (window.DIGIY_CLAW_EXPLORE && typeof window.DIGIY_CLAW_EXPLORE.loadContext === "function") {
        const ctx = await window.DIGIY_CLAW_EXPLORE.loadContext();
        const normalized = normalizeContext(ctx || {});
        return {
          ok: true,
          context: normalized,
          stats: computeStats(normalized),
          alerts: buildAlerts(normalized)
        };
      }

      const fallback = normalizeContext({});
      return {
        ok: false,
        code: "helper_missing",
        context: fallback,
        stats: computeStats(fallback),
        alerts: buildAlerts(fallback)
      };
    } catch (err) {
      const fallback = normalizeContext({
        reason: err?.message || "Lecture impossible."
      });

      return {
        ok: false,
        code: "read_error",
        error: err?.message || "Erreur de lecture EXPLORE.",
        context: fallback,
        stats: computeStats(fallback),
        alerts: [
          makeAlert({
            id: "read-error",
            level: "warning",
            icon: "⚠️",
            title: "Lecture interrompue",
            text: "Recharge la page ou repasse par le code.",
            primaryLabel: "Accès",
            primaryHref: CFG.PATHS.pin,
            reason: err?.message || "Le chef de passe n’a pas pu lire le contexte.",
            priority: 100
          })
        ]
      };
    }
  }

  function alertClass(level) {
    return {
      hot: "digiy-explore-alert-hot",
      action: "digiy-explore-alert-action",
      warning: "digiy-explore-alert-warning",
      success: "digiy-explore-alert-success",
      info: "digiy-explore-alert-info"
    }[level] || "digiy-explore-alert-info";
  }

  function renderAlert(alert) {
    const target = alert.external ? ' target="_blank" rel="noopener noreferrer"' : "";
    const primaryHref = alert.external ? alert.primaryHref : cleanInternalUrl(alert.primaryHref, CFG.PATHS.home);
    const secondaryExternal = /^https?:\/\//i.test(alert.secondaryHref || "");
    const secondaryTarget = secondaryExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
    const secondaryHref = secondaryExternal
      ? alert.secondaryHref
      : (alert.secondaryHref ? cleanInternalUrl(alert.secondaryHref, CFG.PATHS.home) : "");

    return `
      <article class="digiy-explore-alert ${alertClass(alert.level)}">
        <div class="digiy-explore-alert-main">
          <div class="digiy-explore-alert-icon">${esc(alert.icon)}</div>
          <div>
            <strong>${esc(alert.title)}</strong>
            <p>${esc(alert.text)}</p>
          </div>
        </div>

        <div class="digiy-explore-alert-actions">
          <a class="digiy-explore-alert-btn primary" href="${esc(primaryHref)}"${target}>${esc(alert.primaryLabel)}</a>
          ${
            secondaryHref
              ? `<a class="digiy-explore-alert-btn" href="${esc(secondaryHref)}"${secondaryTarget}>${esc(alert.secondaryLabel || "Voir")}</a>`
              : ""
          }
        </div>

        ${
          alert.reason
            ? `<details class="digiy-explore-alert-details">
                <summary>Pourquoi ?</summary>
                <div>${esc(alert.reason)}</div>
              </details>`
            : ""
        }
      </article>
    `;
  }

  function injectBaseStyle() {
    if (document.getElementById("digiyExploreAlertsStyle")) return;

    const style = document.createElement("style");
    style.id = "digiyExploreAlertsStyle";
    style.textContent = `
      .digiy-explore-alerts-wrap{
        display:grid;
        gap:10px;
      }

      .digiy-explore-alert{
        border:1px solid rgba(255,255,255,.13);
        border-radius:22px;
        background:rgba(255,255,255,.055);
        padding:13px;
        display:grid;
        gap:10px;
      }

      .digiy-explore-alert-main{
        display:flex;
        gap:10px;
        align-items:flex-start;
      }

      .digiy-explore-alert-icon{
        width:36px;
        height:36px;
        flex:0 0 auto;
        border-radius:14px;
        display:grid;
        place-items:center;
        background:rgba(255,255,255,.08);
        font-size:18px;
      }

      .digiy-explore-alert strong{
        display:block;
        color:#ecfff4;
        font-size:15px;
        line-height:1.15;
        font-weight:1000;
      }

      .digiy-explore-alert p{
        margin:4px 0 0;
        color:rgba(236,255,244,.72);
        font-size:13px;
        line-height:1.4;
        font-weight:750;
      }

      .digiy-explore-alert-actions{
        display:flex;
        gap:8px;
        flex-wrap:wrap;
      }

      .digiy-explore-alert-btn{
        min-height:42px;
        border-radius:15px;
        padding:10px 12px;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        text-decoration:none;
        background:rgba(255,255,255,.08);
        color:#ecfff4;
        font-weight:950;
        border:1px solid rgba(255,255,255,.12);
      }

      .digiy-explore-alert-btn.primary{
        background:linear-gradient(135deg,#d4af37,#f3d46b);
        color:#13200d;
        border-color:transparent;
      }

      .digiy-explore-alert-details{
        border:1px solid rgba(255,255,255,.10);
        border-radius:18px;
        background:rgba(255,255,255,.035);
        overflow:hidden;
      }

      .digiy-explore-alert-details summary{
        cursor:pointer;
        list-style:none;
        padding:11px 12px;
        font-weight:950;
        color:#fff4bd;
      }

      .digiy-explore-alert-details summary::-webkit-details-marker{
        display:none;
      }

      .digiy-explore-alert-details div{
        padding:0 12px 12px;
        color:rgba(236,255,244,.72);
        font-size:13px;
        line-height:1.45;
        font-weight:750;
      }

      .digiy-explore-alert-hot{
        border-color:rgba(212,175,55,.30);
        background:rgba(212,175,55,.09);
      }

      .digiy-explore-alert-action{
        border-color:rgba(34,197,94,.24);
        background:rgba(34,197,94,.08);
      }

      .digiy-explore-alert-warning{
        border-color:rgba(245,158,11,.24);
        background:rgba(245,158,11,.08);
      }

      .digiy-explore-alert-success{
        border-color:rgba(34,197,94,.24);
        background:rgba(34,197,94,.09);
      }

      .digiy-explore-alert-info{
        border-color:rgba(56,189,248,.22);
        background:rgba(56,189,248,.07);
      }
    `;

    document.head.appendChild(style);
  }

  function keepLinksClean(root = document) {
    try {
      root.querySelectorAll("a[href]").forEach((link) => {
        const href = link.getAttribute("href") || "";

        if (
          !href ||
          href.startsWith("#") ||
          href.startsWith("mailto:") ||
          href.startsWith("tel:") ||
          href.startsWith("https://wa.me/")
        ) {
          return;
        }

        const url = new URL(href, window.location.href);

        if (url.origin !== window.location.origin) {
          CFG.SENSITIVE_KEYS.forEach((key) => url.searchParams.delete(key));
          link.setAttribute("href", url.toString());
          return;
        }

        link.setAttribute("href", cleanInternalUrl(href, CFG.PATHS.home));
      });
    } catch (_) {}
  }

  async function render(target = "#exploreAlerts") {
    injectBaseStyle();

    const node =
      typeof target === "string"
        ? document.querySelector(target)
        : target;

    if (!node) {
      return {
        ok: false,
        error: "Zone d’alertes EXPLORE introuvable.",
        alerts: []
      };
    }

    node.innerHTML = `
      <div class="digiy-explore-alerts-wrap">
        <article class="digiy-explore-alert digiy-explore-alert-info">
          <div class="digiy-explore-alert-main">
            <div class="digiy-explore-alert-icon">🔎</div>
            <div>
              <strong>Lecture du terrain…</strong>
              <p>DIGIY prépare les actions utiles.</p>
            </div>
          </div>
        </article>
      </div>
    `;

    try {
      const data = await readData();
      const alerts = data.alerts || [];

      node.innerHTML = `
        <div class="digiy-explore-alerts-wrap">
          ${alerts.map(renderAlert).join("")}
        </div>
      `;

      keepLinksClean(node);
      return data;
    } catch (err) {
      console.error("[DIGIY_EXPLORE_ALERTS]", err);

      const fallback = makeAlert({
        id: "alerts-error",
        level: "warning",
        icon: "⚠️",
        title: "Alerte non chargée",
        text: "Recharge la page ou repasse par le code.",
        primaryLabel: "Code",
        primaryHref: CFG.PATHS.pin,
        reason: err?.message || "Le chef de passe n’a pas pu lire les données.",
        priority: 100
      });

      node.innerHTML = `
        <div class="digiy-explore-alerts-wrap">
          ${renderAlert(fallback)}
        </div>
      `;

      keepLinksClean(node);

      return {
        ok: false,
        error: err?.message || "Erreur alertes EXPLORE.",
        alerts: [fallback]
      };
    }
  }

  async function getAlerts() {
    const data = await readData();
    return data.alerts || [];
  }

  async function getSnapshot() {
    return await readData();
  }

  function installAutoRender() {
    const target =
      document.querySelector("[data-digiy-explore-alerts]") ||
      document.querySelector("#exploreAlerts");

    if (target) {
      render(target);
    }
  }

  const api = {
    CFG,
    VERSION: CFG.VERSION,
    cleanVisibleUrl,
    cleanInternalUrl,
    keepLinksClean,
    publicPlaceUrl,
    normalizeSlug,
    computeStats,
    buildAlerts,
    readData,
    getAlerts,
    getSnapshot,
    render,
    installAutoRender
  };

  cleanVisibleUrl();

  window.DIGIY_EXPLORE_ALERTS = api;
  window.EXPLORE_ALERTS = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installAutoRender);
  } else {
    installAutoRender();
  }

  console.info("[DIGIY_EXPLORE_ALERTS] chef de passe chargé.");
})();
