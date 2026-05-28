/*
  DIGIYLYFE — Mémoire locale EXPLORE
  Module : EXPLORE / Je fais découvrir
  Rôle : garder brouillons, lieux, notes, alertes locales et session
  sans bloquer Supabase. Local robuste d'abord, Supabase ensuite.
*/
(function(){
  "use strict";

  const ROOT = "DIGIY_EXPLORE_MEMORY_V1";
  const MODULE = "EXPLORE";

  const LEGACY = {
    slug: ["digiy_explore_slug", "digiy_explore_last_slug", "EXPLORE_LAST_SLUG"],
    phone: ["digiy_explore_phone", "explore_tel", "explore_phone", "EXPLORE_PHONE"],
    places: ["digiy_explore_places", "digiy_explore_lieux_cache", "digiy_explore_places_cache"],
    notes: ["digiy_explore_notes", "digiy_explore_oreille_notes"],
    draft: ["digiy_explore_draft", "digiy_explore_place_draft"]
  };

  function safeStorage(kind){
    try{
      const s = kind === "session" ? window.sessionStorage : window.localStorage;
      const k = ROOT + "_TEST";
      s.setItem(k, "1");
      s.removeItem(k);
      return s;
    }catch(_){ return null; }
  }

  const local = safeStorage("local");
  const session = safeStorage("session");

  function readRaw(key){
    try{ return (session && session.getItem(key)) || (local && local.getItem(key)) || ""; }
    catch(_){ return ""; }
  }

  function writeRaw(key, value, opts){
    const target = opts && opts.session ? session : local;
    if(!target) return false;
    try{ target.setItem(key, String(value ?? "")); return true; }
    catch(_){ return false; }
  }

  function removeRaw(key){
    try{ if(local) local.removeItem(key); }catch(_){}
    try{ if(session) session.removeItem(key); }catch(_){}
  }

  function readJson(key, fallback){
    const raw = readRaw(key);
    if(!raw) return fallback;
    try{ return JSON.parse(raw) ?? fallback; }
    catch(_){ return fallback; }
  }

  function writeJson(key, value, opts){
    try{ return writeRaw(key, JSON.stringify(value), opts); }
    catch(_){ return false; }
  }

  function normSlug(value){
    return String(value || "").trim().toLowerCase()
      .replace(/\s+/g,"-")
      .replace(/[^a-z0-9-]/g,"")
      .replace(/-+/g,"-")
      .replace(/^-|-$/g,"");
  }

  function normPhone(value){
    const digits = String(value || "").replace(/[^\d]/g,"");
    if(!digits) return "";
    if(digits.startsWith("221") && digits.length === 12) return digits;
    if(digits.length === 9) return "221" + digits;
    return digits.slice(0,15);
  }

  function first(keys){
    for(const key of keys){
      const value = readRaw(key);
      if(String(value || "").trim()) return String(value).trim();
    }
    return "";
  }

  function sessionHint(){
    let bridge = {};
    try{
      if(window.DIGIY_MODULE_BRIDGE && typeof window.DIGIY_MODULE_BRIDGE.readSession === "function"){
        bridge = window.DIGIY_MODULE_BRIDGE.readSession() || {};
      }else if(window.DIGIY_MODULE_BRIDGE && typeof window.DIGIY_MODULE_BRIDGE.getSession === "function"){
        bridge = window.DIGIY_MODULE_BRIDGE.getSession() || {};
      }
    }catch(_){}

    const slug = normSlug(bridge.slug || bridge.workspace_slug || first(LEGACY.slug));
    const phone = normPhone(bridge.phone || bridge.tel || first(LEGACY.phone));

    return { module: MODULE, slug, phone };
  }

  function rememberSession(data){
    const input = data || {};
    const slug = normSlug(input.slug || input.workspace_slug || "");
    const phone = normPhone(input.phone || input.tel || "");

    if(slug){
      writeRaw("digiy_explore_slug", slug);
      writeRaw("digiy_explore_last_slug", slug);
    }

    if(phone){
      writeRaw("digiy_explore_phone", phone);
      writeRaw("explore_phone", phone);
      writeRaw("explore_tel", phone);
    }

    return sessionHint();
  }

  function loadDraft(){
    return readJson(ROOT + "_draft", null) || readJson("digiy_explore_draft", {});
  }

  function saveDraft(draft){
    const payload = { ...(draft || {}), updated_at: new Date().toISOString() };
    writeJson(ROOT + "_draft", payload);
    writeJson("digiy_explore_draft", payload);
    writeJson("digiy_explore_place_draft", payload);
    return payload;
  }

  function clearDraft(){
    removeRaw(ROOT + "_draft");
    removeRaw("digiy_explore_draft");
    removeRaw("digiy_explore_place_draft");
    return true;
  }

  function listPlaces(){
    const modern = readJson(ROOT + "_places", null);
    if(Array.isArray(modern)) return modern;

    for(const key of LEGACY.places){
      const rows = readJson(key, null);
      if(Array.isArray(rows)) return rows;
    }
    return [];
  }

  function savePlaces(items){
    const arr = Array.isArray(items) ? items : [];
    writeJson(ROOT + "_places", arr.slice(-500));
    writeJson("digiy_explore_places", arr.slice(-500));
    return arr;
  }

  function upsertPlace(place){
    const item = {
      id: place?.id || place?.place_id || ("explore_place_" + Date.now()),
      ...place,
      local_saved_at: new Date().toISOString()
    };
    const arr = listPlaces().filter(x => String(x?.id || x?.place_id) !== String(item.id));
    arr.unshift(item);
    savePlaces(arr);
    return item;
  }

  function notes(){
    const modern = readJson(ROOT + "_notes", null);
    if(Array.isArray(modern)) return modern;

    for(const key of LEGACY.notes){
      const rows = readJson(key, null);
      if(Array.isArray(rows)) return rows;
    }
    return [];
  }

  function addNote(text, meta){
    const note = {
      id: "explore_note_" + Date.now(),
      text: String(text || "").trim(),
      meta: meta || {},
      created_at: new Date().toISOString()
    };
    if(!note.text) return null;
    const arr = notes();
    arr.unshift(note);
    writeJson(ROOT + "_notes", arr.slice(0,200));
    writeJson("digiy_explore_notes", arr.slice(0,200));
    return note;
  }

  function clearLocal(){
    [
      ROOT + "_draft",
      ROOT + "_places",
      ROOT + "_notes",
      "digiy_explore_draft",
      "digiy_explore_place_draft"
    ].forEach(removeRaw);
    return true;
  }

  function injectExploreGoPaves(){
    try{
      var path = String(location.pathname || "").toLowerCase();
      if(path.indexOf("hub") === -1 && !/\/$/.test(path)) return;
      var grid = document.querySelector(".grid");
      if(!grid) return;

      if(!document.getElementById("doorDigiyGoExplore")){
        var go = document.createElement("a");
        go.id = "doorDigiyGoExplore";
        go.className = "tile voice";
        go.href = "./action.html";
        go.innerHTML = '<div class="tileTop"><div class="ico">🎙️</div><div class="tag">GO</div></div><div><b>DIGIY GO EXPLORE</b><span>Le pro parle. EXPLORE prépare le lieu.</span></div>';
        grid.insertBefore(go, grid.firstElementChild);
      }

      if(!document.getElementById("doorExplorePayTransition")){
        var pay = document.createElement("a");
        pay.id = "doorExplorePayTransition";
        pay.className = "tile pay";
        pay.href = "./pay-transition.html";
        pay.innerHTML = '<div class="tileTop"><div class="ico">💳</div><div class="tag">PAY</div></div><div><b>Boost vers PAY</b><span>Argent réel seulement. PAY valide.</span></div>';
        var payDoor = document.querySelector('a[href*="pro-pay"], a[href*="pay"], a[href*="PAY"]');
        if(payDoor && payDoor.parentNode) payDoor.parentNode.insertBefore(pay, payDoor);
        else grid.appendChild(pay);
      }
    }catch(e){
      console.warn("[DIGIY EXPLORE] pavés GO/PAY non injectés", e && e.message ? e.message : e);
    }
  }

  function bootExploreGoPaves(){
    injectExploreGoPaves();
    setTimeout(injectExploreGoPaves, 500);
  }

  window.DIGIY_EXPLORE_MEMORY = {
    version: "explore-memory-v1-20260528-go-pay",
    sessionHint,
    rememberSession,
    loadDraft,
    saveDraft,
    clearDraft,
    listPlaces,
    savePlaces,
    upsertPlace,
    notes,
    addNote,
    clearLocal,
    injectExploreGoPaves
  };

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", bootExploreGoPaves);
  }else{
    bootExploreGoPaves();
  }
})();