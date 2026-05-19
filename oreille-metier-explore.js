(() => {
  "use strict";

  const BUILD = "oreille-metier-explore-v1-20260519";
  const STORE_NOTES = "digiy_explore_oreille_notes";
  const STORE_LAST = "digiy_explore_oreille_last_note";

  const ROUTES = {
    hub: "./hub.html",
    accueil: "./cockpit.html",
    lieux: "./lieux.html",
    ajouter: "./submit.html",
    qr: "./qr.html",
    session: "./session.html",
    pin: "./pin.html",
    claw: "./claw.html",
    pay: "https://pro-pay.digiylyfe.com/admin.html"
  };

  const norm = (v) => String(v || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim();

  const money = (text) => {
    const m = norm(text).match(/\b(\d{3,9})\b/);
    return m ? Number(m[1]) : 0;
  };

  const channel = (text) => {
    const t = norm(text);
    if(t.includes("wave")) return "wave";
    if(t.includes("orange") || t.includes("om")) return "orange_money";
    if(t.includes("cash") || t.includes("espece") || t.includes("espèces")) return "cash";
    return "autre";
  };

  const kind = (text) => {
    const t = norm(text);
    if(/depense|payer|paye|affiche|transport|carburant|essence|achat/.test(t)) return "expense";
    if(/avance|acompte|reservation|réservation/.test(t)) return "advance";
    if(/visite|circuit|excursion|guide|client|lagune|balade/.test(t)) return "income";
    return "note";
  };

  const label = (text) => {
    const raw = String(text || "").trim().replace(/\s+/g, " ");
    return raw ? raw.slice(0, 120) : "Note EXPLORE";
  };

  function parse(text){
    const amount = money(text);
    const nature = kind(text);
    return {
      module: "EXPLORE",
      origin: "EXPLORE",
      type: nature,
      amount,
      channel: channel(text),
      label: label(text),
      note: "Oreille EXPLORE : " + label(text),
      created_at: new Date().toISOString()
    };
  }

  function getNotes(){
    try{ return JSON.parse(localStorage.getItem(STORE_NOTES) || "[]") || []; }catch(_){ return []; }
  }

  function saveNote(draft){
    const notes = getNotes();
    notes.unshift(draft);
    localStorage.setItem(STORE_NOTES, JSON.stringify(notes.slice(0, 30)));
    localStorage.setItem(STORE_LAST, JSON.stringify(draft));
  }

  function toPayUrl(draft){
    const url = new URL(ROUTES.pay);
    url.searchParams.set("origin", "EXPLORE");
    url.searchParams.set("type", draft.type || "note");
    if(draft.amount) url.searchParams.set("amount", String(draft.amount));
    if(draft.channel) url.searchParams.set("channel", draft.channel);
    url.searchParams.set("label", draft.label || "Note EXPLORE");
    url.searchParams.set("note", draft.note || "");
    return url.toString();
  }

  function speak(text){
    if(!("speechSynthesis" in window)) return false;
    try{
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "fr-FR";
      u.rate = 0.88;
      u.pitch = 1.03;
      window.speechSynthesis.speak(u);
      return true;
    }catch(_){ return false; }
  }

  function routeIntent(text){
    const t = norm(text);
    if(/\bhub\b|menu|navigation|portes/.test(t)) return ROUTES.hub;
    if(/session|nettoyage|fermer/.test(t)) return ROUTES.session;
    if(/pin|acces|accès|code/.test(t)) return ROUTES.pin;
    if(/qr|partager/.test(t)) return ROUTES.qr;
    if(/ajouter|nouveau lieu|publier|fiche/.test(t)) return ROUTES.ajouter;
    if(/lieux|mes lieux|liste/.test(t)) return ROUTES.lieux;
    if(/lecture|claw|message/.test(t)) return ROUTES.claw;
    if(/argent|pay|paiement|recette|depense|avance|acompte/.test(t)) return ROUTES.pay;
    return "";
  }

  function injectPanel(){
    if(document.getElementById("digiyExploreEarPanel")) return;

    const panel = document.createElement("section");
    panel.id = "digiyExploreEarPanel";
    panel.innerHTML = `
      <style>
        #digiyExploreEarPanel{
          margin:0 0 16px;
          border:2px solid rgba(212,175,55,.30);
          background:
            radial-gradient(680px 240px at 100% 0%, rgba(212,175,55,.16), transparent 64%),
            radial-gradient(520px 220px at 0% 100%, rgba(34,197,94,.10), transparent 62%),
            linear-gradient(180deg, rgba(255,255,255,.065), rgba(255,255,255,.025));
          border-radius:24px;
          box-shadow:0 18px 48px rgba(0,0,0,.26);
          overflow:hidden;
          color:#f8fafc;
          font-family:Outfit,system-ui,-apple-system,"Segoe UI",sans-serif;
        }
        #digiyExploreEarPanel .earInner{padding:18px;display:grid;gap:12px}
        #digiyExploreEarPanel .earKicker{color:#f3d46b;font-size:13px;font-weight:1000;letter-spacing:.08em;text-transform:uppercase}
        #digiyExploreEarPanel .earTitle{font-size:clamp(24px,4vw,34px);line-height:1.08;font-weight:1000;letter-spacing:-.035em}
        #digiyExploreEarPanel .earText{color:rgba(248,250,252,.82);font-size:17px;line-height:1.58;font-weight:900}
        #digiyExploreEarPanel textarea{width:100%;min-height:96px;border-radius:18px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.16);color:#f8fafc;padding:14px;font:inherit;font-weight:900;line-height:1.5}
        #digiyExploreEarPanel .earActions{display:flex;gap:9px;flex-wrap:wrap}
        #digiyExploreEarPanel button,#digiyExploreEarPanel a{min-height:52px;border-radius:17px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.07);color:#f8fafc;padding:0 14px;font-weight:1000;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
        #digiyExploreEarPanel .gold{background:linear-gradient(135deg,#d4af37,#f3d46b);color:#13200d;border:none}
        #digiyExploreEarPanel .blue{background:rgba(56,189,248,.14);color:#d9f4ff;border-color:rgba(56,189,248,.24)}
        #digiyExploreEarPanel .green{background:rgba(34,197,94,.16);color:#dffcea;border-color:rgba(34,197,94,.25)}
        #digiyExploreEarPanel .draft{display:none;border-radius:18px;padding:13px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.26);font-size:15px;font-weight:900;line-height:1.5;color:#d7ffe1}
        @media(max-width:640px){#digiyExploreEarPanel .earActions>*{width:100%}}
      </style>
      <div class="earInner">
        <div class="earKicker">🎧 Mes oreilles · EXPLORE</div>
        <div class="earTitle">Le pro parle ou clique. DIGIY range la note.</div>
        <div class="earText">Exemples : “Visite lagune 15000 wave”, “Guide payé 5000 cash”, “Ajoute un lieu”, “Ouvre QR”.</div>
        <textarea id="exploreEarInput" placeholder="Écris ou dicte une phrase terrain…"></textarea>
        <div class="earActions">
          <button class="gold" id="exploreEarPrepare" type="button">Préparer</button>
          <button class="green" id="exploreEarSave" type="button">Garder la note</button>
          <a class="blue" id="exploreEarPay" href="https://pro-pay.digiylyfe.com/admin.html">Envoyer vers PAY</a>
          <button id="exploreEarSpeak" type="button">Écouter</button>
        </div>
        <div class="draft" id="exploreEarDraft"></div>
      </div>
    `;

    const target =
      document.getElementById("digiyExploreVoicePanel") ||
      document.getElementById("quickExploreNote") ||
      document.querySelector(".hero") ||
      document.querySelector("main") ||
      document.querySelector(".wrap") ||
      document.body;

    target.parentNode ? target.parentNode.insertBefore(panel, target.nextSibling) : document.body.prepend(panel);

    const input = panel.querySelector("#exploreEarInput");
    const draftBox = panel.querySelector("#exploreEarDraft");
    const payLink = panel.querySelector("#exploreEarPay");

    function render(){
      const draft = parse(input.value);
      draftBox.style.display = "block";
      draftBox.innerHTML = `<strong>${draft.label}</strong><br>Type : ${draft.type} · Montant : ${draft.amount || "—"} · Canal : ${draft.channel}`;
      payLink.href = toPayUrl(draft);
      return draft;
    }

    panel.querySelector("#exploreEarPrepare").addEventListener("click", render);
    panel.querySelector("#exploreEarSave").addEventListener("click", () => {
      const draft = render();
      saveNote(draft);
      speak("Note EXPLORE gardée dans le logiciel.");
    });
    panel.querySelector("#exploreEarSpeak").addEventListener("click", () => {
      const txt = input.value.trim() || "Bienvenue dans EXPLORE. On regarde d’abord, on comprend vite, on clique ensuite.";
      speak(txt);
    });
    input.addEventListener("change", () => {
      const go = routeIntent(input.value);
      if(go && !go.startsWith("http")) payLink.href = go;
    });
  }

  function boot(){
    injectPanel();
    window.DIGIY_OREILLE_METIER_EXPLORE = { BUILD, parse, routeIntent, speak, saveNote, getNotes, toPayUrl };
    console.info("[DIGIY EXPLORE] oreille métier prête", BUILD);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
