<script>
(() => {
  "use strict";

  const FILE_VERSION = "claw-tools-explore-v2";
  const MODULE = "EXPLORE";
  const MODULE_PREFIX = "digiy_explore";

  const SUPABASE_URL = window.DIGIY_SUPABASE_URL || "https://wesqmwjjtsefyjnluosj.supabase.co";
  const SUPABASE_ANON_KEY = window.DIGIY_SUPABASE_ANON || window.DIGIY_SUPABASE_ANON_KEY || "sb_publishable_tGHItRgeWDmGjnd0CK1DVQ_BIep4Ug3";

  const PATHS = {
    /* FIX : vitrine publique → explore.digiylyfe.com */
    access: "https://explore.digiylyfe.com/",
    cockpit: "./cockpit.html",
    lieux: "./lieux.html",
    submit: "./submit.html",
    pin: "./pin.html",
    claw: "./claw.html"
  };

  const ACTIONS = {
    general: "general",
    territory_brief: "territory_brief",
    place_read: "place_read",
    publish_check: "publish_check",
    mobile_copy: "mobile_copy"
  };

  const api = {
    version: FILE_VERSION,
    module: MODULE,
    paths: PATHS,
    actions: ACTIONS,
    normalizeSlug,
    normalizePhone,
    withSlug,
    getPageName,
    resolveSlug,
    resolvePhone,
    loadContext,
    buildPrompt,
    copyPrompt,
    persistSlug,
    readStoredSession
  };

  window.DIGIY_CLAW_EXPLORE = api;

  function normalizeSlug(v){
    return String(v || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function normalizePhone(v){
    return String(v || "").replace(/[^\d]/g, "");
  }

  function safeJsonParse(raw){
    try{ return JSON.parse(raw); }catch(_){ return null; }
  }

  function storageGet(key){
    try{ const s = sessionStorage.getItem(key); if(s) return s; }catch(_){}
    try{ const l = localStorage.getItem(key); if(l) return l; }catch(_){}
    return "";
  }

  function persistSlug(slug){
    const s = normalizeSlug(slug);
    if(!s) return "";
    try{ sessionStorage.setItem(`${MODULE_PREFIX}_slug`, s); }catch(_){}
    try{ sessionStorage.setItem(`${MODULE_PREFIX}_last_slug`, s); }catch(_){}
    try{ localStorage.setItem(`${MODULE_PREFIX}_last_slug`, s); }catch(_){}
    try{ localStorage.setItem("digiy_last_slug", s); }catch(_){}
    try{ localStorage.setItem("DIGIY_SLUG", s); }catch(_){}
    return s;
  }

  function readStoredSession(){
    const keys = [
      `DIGIY_${MODULE}_SESSION`,
      `DIGIY_${MODULE}_ACCESS`,
      "digiy_explore_session"
    ];
    for(const key of keys){
      const parsed = safeJsonParse(storageGet(key));
      if(parsed && typeof parsed === "object") return parsed;
    }
    return null;
  }

  function getPageName(){
    const raw = location.pathname.split("/").pop() || "claw.html";
    return raw.toLowerCase();
  }

  function resolveSlug(){
    const qs = new URLSearchParams(location.search);
    const fromGuard = normalizeSlug(window.DIGIY_GUARD?.getSlug?.() || window.DIGIY_GUARD?.state?.slug || "");
    const fromSession = readStoredSession();
    return normalizeSlug(
      qs.get("slug") ||
      fromGuard ||
      storageGet(`${MODULE_PREFIX}_slug`) ||
      storageGet(`${MODULE_PREFIX}_last_slug`) ||
      storageGet("digiy_last_slug") ||
      storageGet("DIGIY_SLUG") ||
      fromSession?.slug ||
      ""
    );
  }

  function resolvePhone(){
    const qs = new URLSearchParams(location.search);
    const fromGuard = normalizePhone(window.DIGIY_GUARD?.getPhone?.() || window.DIGIY_GUARD?.state?.phone || "");
    const fromSession = readStoredSession();
    return normalizePhone(
      qs.get("phone") ||
      fromGuard ||
      storageGet(`${MODULE_PREFIX}_phone`) ||
      storageGet("digiy_last_phone") ||
      storageGet("DIGIY_PHONE") ||
      fromSession?.phone ||
      ""
    );
  }

  function withSlug(path, slug, extra = {}){
    const s = normalizeSlug(slug);
    const url = new URL(path, location.href);
    if(s) url.searchParams.set("slug", s);
    Object.entries(extra || {}).forEach(([k, v]) => {
      if(v !== null && v !== undefined && String(v).trim() !== ""){
        url.searchParams.set(k, String(v));
      }
    });
    return url.origin === location.origin
      ? `${url.pathname.split("/").pop()}${url.search}`
      : url.toString();
  }

  function buildLinks(slug){
    return {
      /* FIX : access → vitrine publique, pas modifiée par withSlug */
      access: PATHS.access,
      cockpit: withSlug(PATHS.cockpit, slug),
      lieux: withSlug(PATHS.lieux, slug),
      submit: withSlug(PATHS.submit, slug),
      pin: withSlug(PATHS.pin, slug),
      claw: withSlug(PATHS.claw, slug)
    };
  }

  async function createSupabase(){
    if(window.DIGIY_CLAW_EXPLORE_SB) return window.DIGIY_CLAW_EXPLORE_SB;
    if(!window.supabase?.createClient) throw new Error("Supabase JS non chargé.");
    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth:{
        persistSession:false,
        autoRefreshToken:false,
        detectSessionInUrl:false,
        storage:{ getItem:() => null, setItem:() => {}, removeItem:() => {} }
      }
    });
    window.DIGIY_CLAW_EXPLORE_SB = sb;
    return sb;
  }

  async function loadPlaceBySlug(slug){
    const s = normalizeSlug(slug);
    if(!s) return null;
    try{
      const sb = await createSupabase();
      const { data, error } = await sb.rpc("digiy_explore_public_place_by_slug", { p_slug: s });
      if(error) return null;
      if(data?.ok && data.place) return data.place;
      if(data && typeof data === "object" && data.slug) return data;
      return null;
    }catch(_){ return null; }
  }

  async function loadOwnerPlaces(phone){
    const p = normalizePhone(phone);
    if(!p) return [];
    try{
      const sb = await createSupabase();
      const { data, error } = await sb.rpc("digiy_explore_list_places_by_phone", { p_owner_phone: p });
      if(error) return [];
      return Array.isArray(data) ? data : [];
    }catch(_){ return []; }
  }

  function deduceActivity(place){
    if(!place) return "";
    return place.category_label || place.category_name || place.category_code || place.subcategory || "";
  }

  function deduceBusinessName(place){
    if(!place) return "";
    return place.public_name || place.name || place.title || place.label || "";
  }

  function deduceZone(place){
    if(!place) return "";
    return place.zone || place.district || place.quarter || "";
  }

  function deduceCity(place){
    if(!place) return "";
    return place.city || "";
  }

  function normalizePublished(place){
    if(!place) return false;
    return place.is_published === true || place.published === true || place.status === "published";
  }

  async function loadContext(){
    const slug = persistSlug(resolveSlug());
    const phone = resolvePhone();
    const page = getPageName();
    const accessOk = window.DIGIY_GUARD?.state?.access_ok === true;
    const reason = window.DIGIY_GUARD?.state?.reason || "";
    const preview = window.DIGIY_GUARD?.state?.preview !== false;

    let place = null;
    if(slug) place = await loadPlaceBySlug(slug);

    let ownerPlaces = [];
    if(phone) ownerPlaces = await loadOwnerPlaces(phone);

    const matchedOwnerPlace = ownerPlaces.find(item => normalizeSlug(item?.slug) === slug) || null;
    const sourcePlace = place || matchedOwnerPlace || null;
    const publishedCount = ownerPlaces.filter(normalizePublished).length;

    const ctx = {
      module: MODULE,
      version: FILE_VERSION,
      page,
      slug,
      phone,
      access_ok: accessOk,
      preview,
      reason,
      place: sourcePlace,
      owner_places_count: ownerPlaces.length,
      published_places_count: publishedCount,
      business_name: deduceBusinessName(sourcePlace),
      city: deduceCity(sourcePlace),
      zone: deduceZone(sourcePlace),
      activity: deduceActivity(sourcePlace),
      is_published: normalizePublished(sourcePlace),
      links: buildLinks(slug)
    };

    return ctx;
  }

  function buildPrompt(kind = ACTIONS.general, ctx){
    const data = ctx || {
      module: MODULE,
      page: getPageName(),
      slug: resolveSlug(),
      phone: resolvePhone(),
      business_name: "",
      city: "",
      zone: "",
      activity: "",
      owner_places_count: 0,
      published_places_count: 0,
      is_published: false
    };

    const lines = [];
    lines.push(`MODULE: ${data.module}`);
    lines.push(`PAGE: ${data.page}`);
    lines.push(`SLUG: ${data.slug || "non détecté"}`);
    lines.push(`PHONE: ${data.phone || "non détecté"}`);
    lines.push(`LIEU: ${data.business_name || "non détecté"}`);
    if(data.city) lines.push(`VILLE: ${data.city}`);
    if(data.zone) lines.push(`ZONE: ${data.zone}`);
    if(data.activity) lines.push(`CATÉGORIE: ${data.activity}`);
    lines.push(`ACCÈS: ${data.access_ok ? "actif" : "à vérifier"}`);
    lines.push(`MODE: ${data.preview ? "aperçu" : "vivant"}`);
    lines.push(`NB_LIEUX_OWNER: ${data.owner_places_count || 0}`);
    lines.push(`NB_LIEUX_PUBLIÉS: ${data.published_places_count || 0}`);
    lines.push(`PUBLIÉ: ${data.is_published ? "oui" : "non"}`);
    lines.push("");
    lines.push("MISSION CLAW:");

    if(kind === ACTIONS.territory_brief){
      lines.push("Donne-moi une lecture terrain rapide de ce rail EXPLORE.");
      lines.push("Je veux :");
      lines.push("1. ce que raconte ce lieu ou ce slug,");
      lines.push("2. ce qu'il manque pour une fiche plus forte,");
      lines.push("3. la prochaine action simple à faire,");
      lines.push("4. un résumé mobile en 3 lignes.");
    }else if(kind === ACTIONS.place_read){
      lines.push("Analyse cette fiche EXPLORE comme un lecteur terrain.");
      lines.push("Je veux :");
      lines.push("1. la force du lieu,");
      lines.push("2. le point faible de lecture,");
      lines.push("3. une meilleure description courte,");
      lines.push("4. une meilleure description longue.");
    }else if(kind === ACTIONS.publish_check){
      lines.push("Fais-moi un contrôle avant publication.");
      lines.push("Je veux :");
      lines.push("1. les champs essentiels qui semblent présents,");
      lines.push("2. les trous possibles,");
      lines.push("3. le risque pour la lecture publique,");
      lines.push("4. la décision : publier / attendre / corriger d'abord.");
    }else if(kind === ACTIONS.mobile_copy){
      lines.push("Prépare-moi une micro-copy mobile pour EXPLORE.");
      lines.push("Je veux :");
      lines.push("1. un titre public plus fort,");
      lines.push("2. une phrase courte pour la carte,");
      lines.push("3. un CTA simple,");
      lines.push("4. une version WhatsApp courte.");
    }else{
      lines.push("Donne-moi un brief général EXPLORE utile et terrain.");
      lines.push("Je veux :");
      lines.push("1. l'état de lecture du lieu,");
      lines.push("2. ce qui manque pour mieux voir le terrain,");
      lines.push("3. l'action métier la plus utile maintenant,");
      lines.push("4. une phrase simple à poser dans la fiche.");
    }

    lines.push("");
    lines.push("Réponds en français clair, direct, terrain, sans jargon inutile.");
    return lines.join("\n");
  }

  async function copyPrompt(text){
    const value = String(text || "").trim();
    if(!value) return false;
    try{
      await navigator.clipboard.writeText(value);
      return true;
    }catch(_){
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try{ ok = document.execCommand("copy"); }catch(_err){ ok = false; }
      ta.remove();
      return ok;
    }
  }
})();
</script>
