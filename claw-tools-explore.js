<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
  <title>PRO-EXPLORE — CLAW</title>
  <meta name="theme-color" content="#06130f"/>
  <meta name="description" content="CLAW by DIGIY — lecture légère du rail PRO-EXPLORE." />

  <script>
    window.DIGIY_SUPABASE_URL = "https://wesqmwjjtsefyjnluosj.supabase.co";
    window.DIGIY_SUPABASE_ANON_KEY = "sb_publishable_tGHItRgeWDmGjnd0CK1DVQ_BIep4Ug3";
    window.DIGIY_SUPABASE_ANON = window.DIGIY_SUPABASE_ANON_KEY;
    window.DIGIY_MODULE = "EXPLORE";
    window.DIGIY_LOGIN_URL = "./pin.html";
    document.documentElement.style.visibility = "hidden";
  </script>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="./guad.js?v=explore-claw-guard-1"></script>
  <script src="./claw-tools-explore.js?v=explore-claw-tools-1"></script>

  <style>
    :root{
      --bg:#06130f;
      --bg2:#0b1f18;
      --card:#0c241c;
      --card2:#102b22;
      --line:rgba(255,255,255,.08);
      --ink:#f8fafc;
      --muted:rgba(248,250,252,.72);
      --gold:#d4af37;
      --gold2:#f3d46b;
      --blue:#38bdf8;
      --blue2:#7dd3fc;
      --ok:#22c55e;
      --warn:#f59e0b;
      --bad:#ef4444;
      --radius:22px;
      --shadow:0 24px 60px rgba(0,0,0,.30);
      --focus:rgba(212,175,55,.32);
    }

    *{box-sizing:border-box}
    html,body{margin:0;padding:0}
    body{
      min-height:100vh;
      color:var(--ink);
      font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      background:
        radial-gradient(circle at top, rgba(56,189,248,.10), transparent 24%),
        radial-gradient(circle at right bottom, rgba(212,175,55,.08), transparent 24%),
        linear-gradient(180deg, #06130f 0%, #05100c 52%, #030b08 100%);
    }

    a{color:inherit;text-decoration:none}
    button,textarea{font:inherit}

    .wrap{
      width:min(100%, 1180px);
      margin:0 auto;
      padding:18px 14px 42px;
    }

    .topbar{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:14px;
      flex-wrap:wrap;
      margin-bottom:14px;
    }

    .brand{
      display:flex;
      gap:12px;
      align-items:center;
      min-width:0;
    }

    .logo{
      width:48px;
      height:48px;
      border-radius:16px;
      display:grid;
      place-items:center;
      background:linear-gradient(135deg, rgba(56,189,248,.20), rgba(212,175,55,.10));
      border:1px solid rgba(56,189,248,.20);
      box-shadow:0 10px 28px rgba(0,0,0,.18);
      font-size:24px;
      flex:0 0 auto;
    }

    .brandText{min-width:0}
    .kicker{
      color:var(--gold2);
      font-size:12px;
      font-weight:800;
      letter-spacing:.18em;
      text-transform:uppercase;
      margin-bottom:3px;
      white-space:nowrap;
    }

    .title{
      font-size:clamp(20px, 2.4vw, 32px);
      font-weight:1000;
      line-height:1.04;
      letter-spacing:-.03em;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .sub{
      margin-top:4px;
      color:var(--muted);
      font-size:13px;
      line-height:1.45;
    }

    .topActions{
      display:flex;
      gap:10px;
      flex-wrap:wrap;
      justify-content:flex-end;
    }

    .btn{
      min-height:44px;
      border:none;
      border-radius:14px;
      padding:0 14px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:8px;
      font-weight:900;
      cursor:pointer;
      transition:filter .18s ease, transform .04s ease, opacity .18s ease;
      white-space:nowrap;
    }

    .btn:active{transform:translateY(1px)}
    .btn[disabled]{opacity:.6;cursor:not-allowed}
    .btn.primary{
      background:linear-gradient(135deg, var(--gold), var(--gold2));
      color:#13200d;
      box-shadow:0 14px 30px rgba(212,175,55,.20);
    }
    .btn.info{
      background:rgba(56,189,248,.10);
      border:1px solid rgba(56,189,248,.24);
      color:#d8f2ff;
    }
    .btn.secondary{
      background:rgba(255,255,255,.05);
      border:1px solid rgba(255,255,255,.08);
      color:var(--ink);
    }
    .btn.ghost{
      background:transparent;
      border:1px solid var(--line);
      color:var(--ink);
    }

    .nav{
      display:flex;
      flex-wrap:wrap;
      gap:10px;
      margin-bottom:14px;
      padding:12px;
      border:1px solid var(--line);
      border-radius:18px;
      background:rgba(255,255,255,.03);
      box-shadow:0 14px 32px rgba(0,0,0,.18);
    }

    .nav a{
      min-height:42px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:0 14px;
      border-radius:999px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.04);
      color:#eef4f1;
      font-size:13px;
      font-weight:900;
    }

    .nav a.active{
      background:rgba(56,189,248,.10);
      border-color:rgba(56,189,248,.24);
      color:#d8f2ff;
    }

    .hero{
      display:grid;
      grid-template-columns:1.05fr .95fr;
      gap:16px;
      margin-bottom:16px;
    }

    .panel{
      background:
        linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));
      border:1px solid var(--line);
      border-radius:var(--radius);
      box-shadow:var(--shadow);
      overflow:hidden;
    }

    .heroMain{
      padding:22px;
      background:
        linear-gradient(180deg, rgba(56,189,248,.08), transparent 24%),
        linear-gradient(180deg, var(--card), var(--card2));
    }

    .heroSide{
      padding:20px;
      display:grid;
      gap:12px;
      background:
        linear-gradient(180deg, rgba(212,175,55,.04), transparent 22%),
        linear-gradient(180deg, #091a14, #0d241c);
    }

    .badge{
      display:inline-flex;
      align-items:center;
      gap:8px;
      padding:8px 12px;
      border-radius:999px;
      border:1px solid rgba(56,189,248,.22);
      background:rgba(56,189,248,.08);
      color:#d8f2ff;
      font-size:12px;
      font-weight:900;
      letter-spacing:.08em;
      text-transform:uppercase;
      margin-bottom:14px;
    }

    h1{
      margin:0 0 10px;
      font-size:clamp(26px,4vw,42px);
      line-height:1.02;
      letter-spacing:-.04em;
    }

    .heroLead{
      margin:0;
      color:var(--muted);
      font-size:16px;
      line-height:1.65;
      max-width:60ch;
    }

    .pills{
      display:flex;
      flex-wrap:wrap;
      gap:8px;
      margin-top:14px;
    }

    .pill{
      display:inline-flex;
      align-items:center;
      gap:6px;
      padding:8px 10px;
      border-radius:999px;
      border:1px solid rgba(255,255,255,.10);
      background:rgba(255,255,255,.04);
      color:var(--ink);
      font-size:12px;
      font-weight:900;
    }

    .miniStat{
      border:1px solid rgba(255,255,255,.08);
      border-radius:18px;
      padding:14px;
      background:rgba(255,255,255,.03);
    }

    .miniLabel{
      color:var(--muted);
      font-size:12px;
      font-weight:900;
      text-transform:uppercase;
      letter-spacing:.08em;
      margin-bottom:8px;
    }

    .miniValue{
      font-size:20px;
      font-weight:1000;
      line-height:1.15;
      letter-spacing:-.03em;
      word-break:break-word;
    }

    .miniHint{
      margin-top:6px;
      color:var(--muted);
      font-size:13px;
      line-height:1.45;
    }

    .status{
      margin-bottom:16px;
      border-radius:18px;
      padding:14px 16px;
      font-size:14px;
      line-height:1.5;
      font-weight:800;
      display:block;
      border:1px solid rgba(255,255,255,.10);
      background:rgba(255,255,255,.04);
    }

    .status.ok{
      color:#bbf7d0;
      border-color:rgba(34,197,94,.24);
      background:rgba(34,197,94,.08);
    }

    .status.bad{
      color:#fecaca;
      border-color:rgba(239,68,68,.24);
      background:rgba(239,68,68,.08);
    }

    .status.warn{
      color:#fde68a;
      border-color:rgba(245,158,11,.24);
      background:rgba(245,158,11,.08);
    }

    .status.info{
      color:#dbeafe;
      border-color:rgba(96,165,250,.18);
      background:rgba(59,130,246,.08);
    }

    .grid{
      display:grid;
      grid-template-columns:1.05fr .95fr;
      gap:16px;
    }

    .cardBody{padding:20px}

    .sectionTitle{
      margin:0 0 14px;
      font-size:20px;
      font-weight:1000;
      letter-spacing:-.02em;
    }

    .sectionSub{
      margin:-4px 0 14px;
      color:var(--muted);
      font-size:13px;
      line-height:1.5;
    }

    .box{
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.03);
      border-radius:18px;
      padding:14px;
      display:grid;
      gap:8px;
      margin-bottom:12px;
    }

    .box strong{
      font-size:14px;
    }

    .box span{
      color:var(--muted);
      font-size:13px;
      line-height:1.55;
      word-break:break-word;
    }

    .actions{
      display:flex;
      flex-wrap:wrap;
      gap:10px;
      margin:14px 0;
    }

    .textarea{
      width:100%;
      min-height:320px;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(0,0,0,.18);
      color:var(--ink);
      border-radius:18px;
      outline:none;
      padding:14px;
      resize:vertical;
      line-height:1.55;
      font-size:14px;
      box-shadow:none;
    }

    .textarea:focus{
      border-color:rgba(212,175,55,.42);
      box-shadow:0 0 0 5px var(--focus);
      background:rgba(255,255,255,.05);
    }

    .foot{
      margin-top:18px;
      color:var(--muted);
      font-size:12px;
      line-height:1.6;
      text-align:center;
    }

    @media (max-width: 980px){
      .hero, .grid{grid-template-columns:1fr}
    }

    @media (max-width: 640px){
      .wrap{padding:14px 12px 34px}
      .topbar{flex-direction:column}
      .topActions{width:100%;justify-content:flex-start}
      .heroMain,.heroSide,.cardBody{padding:18px}
      .actions,.topActions,.nav{width:100%}
      .actions > *, .topActions > *, .nav > *{flex:1 1 auto}
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="topbar">
      <div class="brand">
        <div class="logo">🦅</div>
        <div class="brandText">
          <div class="kicker">CLAW by DIGIY</div>
          <div class="title">PRO-EXPLORE • Lecture légère</div>
          <div class="sub" id="subline">CLAW lit le rail terrain, la fiche lieu et la prochaine action utile.</div>
        </div>
      </div>

      <div class="topActions">
        <a class="btn secondary" id="btnCockpitTop" href="./cockpit.html">Cockpit</a>
        <a class="btn secondary" id="btnLieuxTop" href="./lieux.html">Lieux</a>
        <a class="btn secondary" id="btnSubmitTop" href="./submit.html">Ajouter / éditer</a>
        <a class="btn ghost" id="btnAccessTop" href="./index.html">Vitrine</a>
      </div>
    </header>

    <nav class="nav" aria-label="Navigation PRO EXPLORE">
      <a id="navAccess" href="./index.html">Vitrine</a>
      <a id="navCockpit" href="./cockpit.html">Cockpit</a>
      <a id="navLieux" href="./lieux.html">Lieux</a>
      <a id="navSubmit" href="./submit.html">Ajouter / éditer</a>
      <a id="navPin" href="./pin.html">PIN</a>
      <a id="navClaw" class="active" href="./claw.html">CLAW</a>
    </nav>

    <div id="status" class="status info">Préparation de CLAW…</div>

    <section class="hero">
      <article class="panel heroMain">
        <div class="badge" id="modeBadge">Lecture légère</div>
        <h1 id="heroTitle">Voir le terrain sans bruit.</h1>
        <p class="heroLead" id="heroLead">
          CLAW relit le slug EXPLORE, l’état d’accès, le lieu chargé et te pousse l’action simple à faire maintenant.
        </p>

        <div class="pills" id="heroPills">
          <div class="pill">Module : EXPLORE</div>
        </div>

        <div class="actions">
          <button class="btn primary" id="btnCopyPrompt" type="button">Copier le prompt</button>
          <button class="btn info" id="btnRefresh" type="button">Recharger le contexte</button>
          <a class="btn secondary" id="btnOpenCockpit" href="./cockpit.html">Ouvrir le cockpit</a>
          <a class="btn secondary" id="btnOpenSubmit" href="./submit.html">Éditer le lieu</a>
          <a class="btn ghost" id="btnOpenPin" href="./pin.html">Entrer par PIN</a>
        </div>
      </article>

      <aside class="panel heroSide">
        <div class="miniStat">
          <div class="miniLabel">Slug actif</div>
          <div class="miniValue" id="heroSlug">—</div>
          <div class="miniHint">Identifiant terrain détecté par l’URL, le guard ou le stockage local.</div>
        </div>

        <div class="miniStat">
          <div class="miniLabel">Lieu lu</div>
          <div class="miniValue" id="heroPlace">—</div>
          <div class="miniHint">Nom public ou lecture la plus proche du lieu.</div>
        </div>

        <div class="miniStat">
          <div class="miniLabel">État d’accès</div>
          <div class="miniValue" id="heroAccess">—</div>
          <div class="miniHint" id="heroAccessHint">CLAW attend la lecture du guard.</div>
        </div>
      </aside>
    </section>

    <section class="grid">
      <article class="panel">
        <div class="cardBody">
          <h2 class="sectionTitle">Lecture CLAW</h2>
          <p class="sectionSub">Résumé direct du rail EXPLORE, sans démo inutile.</p>

          <div class="box">
            <strong id="briefTitle">Chargement</strong>
            <span id="briefText">CLAW attend le contexte réel du module.</span>
          </div>

          <div class="box">
            <strong>Pills utiles</strong>
            <span id="pillText">Les repères terrain vont apparaître ici.</span>
          </div>

          <div class="box">
            <strong>Navigation utile</strong>
            <span id="linksText">Cockpit, lieux, édition et pin seront recousus ici avec le bon slug.</span>
          </div>

          <div class="actions">
            <button class="btn secondary" data-kind="general" type="button">Prompt général</button>
            <button class="btn secondary" data-kind="territory_brief" type="button">Brief terrain</button>
            <button class="btn secondary" data-kind="place_read" type="button">Lecture fiche</button>
            <button class="btn secondary" data-kind="publish_check" type="button">Contrôle publication</button>
            <button class="btn secondary" data-kind="mobile_copy" type="button">Micro-copy mobile</button>
          </div>

          <textarea id="promptBox" class="textarea" spellcheck="false"></textarea>
        </div>
      </article>

      <aside class="panel">
        <div class="cardBody">
          <h2 class="sectionTitle">Repères terrain</h2>
          <p class="sectionSub">Ce que CLAW voit pour décider vite.</p>

          <div class="box">
            <strong>Ville</strong>
            <span id="boxCity">—</span>
          </div>

          <div class="box">
            <strong>Zone</strong>
            <span id="boxZone">—</span>
          </div>

          <div class="box">
            <strong>Catégorie</strong>
            <span id="boxActivity">—</span>
          </div>

          <div class="box">
            <strong>Nombre de lieux du pilote</strong>
            <span id="boxCount">—</span>
          </div>

          <div class="box">
            <strong>Publié</strong>
            <span id="boxPublished">—</span>
          </div>

          <div class="box">
            <strong>Action logique</strong>
            <span id="boxAction">—</span>
          </div>
        </div>
      </aside>
    </section>

    <div class="foot">
      PRO-EXPLORE • CLAW • lecture simple, navigation propre, zéro backend inventé
    </div>
  </div>

  <script>
    (() => {
      "use strict";

      const $ = (id) => document.getElementById(id);

      const els = {
        status: $("status"),
        modeBadge: $("modeBadge"),
        heroTitle: $("heroTitle"),
        heroLead: $("heroLead"),
        heroPills: $("heroPills"),
        heroSlug: $("heroSlug"),
        heroPlace: $("heroPlace"),
        heroAccess: $("heroAccess"),
        heroAccessHint: $("heroAccessHint"),
        briefTitle: $("briefTitle"),
        briefText: $("briefText"),
        pillText: $("pillText"),
        linksText: $("linksText"),
        promptBox: $("promptBox"),
        boxCity: $("boxCity"),
        boxZone: $("boxZone"),
        boxActivity: $("boxActivity"),
        boxCount: $("boxCount"),
        boxPublished: $("boxPublished"),
        boxAction: $("boxAction"),
        btnCopyPrompt: $("btnCopyPrompt"),
        btnRefresh: $("btnRefresh"),
        btnOpenCockpit: $("btnOpenCockpit"),
        btnOpenSubmit: $("btnOpenSubmit"),
        btnOpenPin: $("btnOpenPin"),
        navAccess: $("navAccess"),
        navCockpit: $("navCockpit"),
        navLieux: $("navLieux"),
        navSubmit: $("navSubmit"),
        navPin: $("navPin"),
        navClaw: $("navClaw"),
        btnCockpitTop: $("btnCockpitTop"),
        btnLieuxTop: $("btnLieuxTop"),
        btnSubmitTop: $("btnSubmitTop"),
        btnAccessTop: $("btnAccessTop")
      };

      let CURRENT_CTX = null;
      let CURRENT_KIND = "general";

      function setStatus(text, type = "info"){
        els.status.textContent = text || "";
        els.status.className = `status ${type}`;
      }

      function renderLinks(ctx){
        const links = ctx.links || {};

        els.navAccess.href = links.access || "./index.html";
        els.navCockpit.href = links.cockpit || "./cockpit.html";
        els.navLieux.href = links.lieux || "./lieux.html";
        els.navSubmit.href = links.submit || "./submit.html";
        els.navPin.href = links.pin || "./pin.html";
        els.navClaw.href = links.claw || "./claw.html";

        els.btnCockpitTop.href = links.cockpit || "./cockpit.html";
        els.btnLieuxTop.href = links.lieux || "./lieux.html";
        els.btnSubmitTop.href = links.submit || "./submit.html";
        els.btnAccessTop.href = links.access || "./index.html";

        els.btnOpenCockpit.href = links.cockpit || "./cockpit.html";
        els.btnOpenSubmit.href = links.submit || "./submit.html";
        els.btnOpenPin.href = links.pin || "./pin.html";
      }

      function buildActionText(ctx){
        if (!ctx.access_ok){
          return "Passe d’abord par le PIN ou vérifie l’abonnement EXPLORE.";
        }

        if (!ctx.slug){
          return "Il manque encore un slug propre pour travailler le rail.";
        }

        if (!ctx.business_name){
          return "Le slug est vivant, mais il faut enrichir ou vérifier la fiche lieu.";
        }

        if (!ctx.is_published){
          return "La fiche existe, mais le prochain cran logique est le contrôle avant publication.";
        }

        return "Le rail est vivant. Lis la fiche, affine la micro-copy, puis pilote depuis cockpit ou lieux.";
      }

      function renderPills(ctx){
        const pills = [
          `Module : ${ctx.module}`,
          ctx.slug ? `Slug : ${ctx.slug}` : "Slug : non détecté",
          ctx.phone ? `Téléphone : ${ctx.phone}` : "Téléphone : non détecté",
          ctx.city ? `Ville : ${ctx.city}` : "",
          ctx.zone ? `Zone : ${ctx.zone}` : "",
          ctx.activity ? `Catégorie : ${ctx.activity}` : "",
          ctx.is_published ? "Publié" : "Non publié"
        ].filter(Boolean);

        els.heroPills.innerHTML = pills.map(p => `<div class="pill">${p}</div>`).join("");
        els.pillText.textContent = pills.join(" • ");
      }

      function renderContext(ctx){
        CURRENT_CTX = ctx;

        renderLinks(ctx);
        renderPills(ctx);

        els.heroSlug.textContent = ctx.slug || "—";
        els.heroPlace.textContent = ctx.business_name || "Lieu non détecté";
        els.heroAccess.textContent = ctx.access_ok ? "Accès actif" : "Accès à vérifier";
        els.heroAccessHint.textContent = ctx.access_ok
          ? "Le guard voit un accès vivant pour EXPLORE."
          : "CLAW reste sobre : accès ou session à vérifier.";

        els.boxCity.textContent = ctx.city || "—";
        els.boxZone.textContent = ctx.zone || "—";
        els.boxActivity.textContent = ctx.activity || "—";
        els.boxCount.textContent = `${ctx.owner_places_count || 0} lieu(x), dont ${ctx.published_places_count || 0} publié(s)`;
        els.boxPublished.textContent = ctx.is_published ? "Oui" : "Non";
        els.boxAction.textContent = buildActionText(ctx);

        if (!ctx.access_ok){
          els.modeBadge.textContent = "Lecture prudente";
          els.heroTitle.textContent = "CLAW voit le rail, mais l’accès reste à confirmer.";
          els.heroLead.textContent = "Ici on ne force rien. On lit le slug, on garde la navigation propre, puis on pousse la prochaine action utile.";
          els.briefTitle.textContent = "Accès ou session à vérifier";
          els.briefText.textContent = "Le guard EXPLORE existe bien, mais CLAW ne prétend pas ouvrir un rail fermé. Passe par PIN si nécessaire.";
          setStatus("Lecture CLAW chargée en mode prudent.", "warn");
        } else if (!ctx.business_name){
          els.modeBadge.textContent = "Rail vivant";
          els.heroTitle.textContent = "CLAW voit un rail actif, mais peu de matière lieu.";
          els.heroLead.textContent = "Le slug existe et l’accès tient. Le prochain cran logique est de vérifier les lieux ou d’ajouter une fiche propre.";
          els.briefTitle.textContent = "Slug vivant, fiche faible";
          els.briefText.textContent = "Le guard est bon. Il faut maintenant enrichir la lecture terrain via lieux.html ou submit.html.";
          setStatus("Accès actif. Lecture lieu encore légère.", "ok");
        } else {
          els.modeBadge.textContent = "Lecture vivante";
          els.heroTitle.textContent = "CLAW lit le lieu et pousse la bonne action.";
          els.heroLead.textContent = "Nom, ville, zone, catégorie, publication : on a assez de matière pour diagnostiquer la fiche sans casser le moule.";
          els.briefTitle.textContent = "Lieu chargé";
          els.briefText.textContent = `${ctx.business_name}${ctx.city ? " à " + ctx.city : ""}${ctx.zone ? ", zone " + ctx.zone : ""}. ${ctx.is_published ? "La fiche est publiée." : "La fiche n’est pas encore publiée."}`;
          setStatus("Contexte CLAW chargé proprement.", "ok");
        }

        els.linksText.textContent = [
          ctx.links?.cockpit ? "Cockpit" : "",
          ctx.links?.lieux ? "Lieux" : "",
          ctx.links?.submit ? "Ajouter / éditer" : "",
          ctx.links?.pin ? "PIN" : ""
        ].filter(Boolean).join(" • ");

        refreshPrompt();
      }

      function refreshPrompt(){
        const ctx = CURRENT_CTX || {};
        const text = window.DIGIY_CLAW_EXPLORE.buildPrompt(CURRENT_KIND, ctx);
        els.promptBox.value = text;
      }

      async function boot(){
        try{
          if (window.DIGIY_GUARD?.ready && typeof window.DIGIY_GUARD.ready === "function"){
            await window.DIGIY_GUARD.ready();
          }

          const ctx = await window.DIGIY_CLAW_EXPLORE.loadContext();
          renderContext(ctx);
        } catch (err){
          console.error("[EXPLORE CLAW] boot error:", err);
          setStatus("Impossible de charger CLAW pour le moment.", "bad");
          els.briefTitle.textContent = "Chargement impossible";
          els.briefText.textContent = "Le rail CLAW n’a pas pu se préparer.";
          els.promptBox.value = "";
        } finally {
          document.documentElement.style.visibility = "";
        }
      }

      els.btnCopyPrompt.addEventListener("click", async () => {
        const ok = await window.DIGIY_CLAW_EXPLORE.copyPrompt(els.promptBox.value);
        setStatus(ok ? "Prompt copié." : "Copie impossible sur cet appareil.", ok ? "ok" : "warn");
      });

      els.btnRefresh.addEventListener("click", async () => {
        setStatus("Rechargement du contexte CLAW…", "info");
        await boot();
      });

      document.querySelectorAll("[data-kind]").forEach(btn => {
        btn.addEventListener("click", () => {
          CURRENT_KIND = btn.getAttribute("data-kind") || "general";
          refreshPrompt();
          setStatus("Prompt CLAW recalculé.", "info");
        });
      });

      boot();
    })();
  </script>
</body>
</html>
