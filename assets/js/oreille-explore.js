/* DIGIYLYFE — OREILLE EXPLORE
   On regarde d’abord. On comprend vite. On clique ensuite.
   L’Oreille prépare, DIGIY formule, le pro valide, EXPLORE range.
   Rien n’est confirmé automatiquement.
*/
(function(){
  'use strict';
  var VERSION='oreille-explore-v1-20260524';
  var GUIDE='Bienvenue dans Oreille EXPLORE DIGIYLYFE. Ici, le professionnel peut parler ou cliquer pour préparer une fiche lieu, une note terrain, une description, un message WhatsApp, une consigne de visite, un repère Maps, un QR ou une annonce de visibilité. EXPLORE aide à préciser le nom du lieu, la zone, le type de lieu, le contact, les horaires, le prix indicatif, la description, les points forts et la prochaine action. Mais EXPLORE ne confirme jamais seul une disponibilité, un prix, une visite, une promesse client ou une publication. Le pro regarde, corrige, valide. L’Oreille prépare. DIGIY formule. EXPLORE range. Le terrain garde la main.';
  var TEMPLATES=[
    '📍 Nouveau lieu — nom · zone · type · contact · repère Maps.',
    '🪪 Fiche lieu — nom · description · points forts · photo · WhatsApp.',
    '🗺️ Repère terrain — quartier · accès · indication simple · point connu.',
    '📲 Message client — remercier · expliquer le lieu · demander les infos manquantes.',
    '🔳 QR / partage — lieu · lien · message court · appel à visiter.',
    '📣 Visibilité — offre · durée · zone · public visé · prochaine action.',
    '📝 Note terrain — ambiance · état · besoin · remarque utile.',
    '⚠️ Brouillon — garder la trace sans confirmer prix, visite ou promesse.'
  ];
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();}
  function core(){return window.DigiyOreilleMetier||null;}
  function norm(v){var c=core();return c&&c.normalizeText?c.normalizeText(v):String(v||'').replace(/\s+/g,' ').trim();}
  function low(v){return norm(v).toLowerCase();}
  function field(text,labels){var clean=norm(text);for(var i=0;i<labels.length;i++){var label=labels[i];var re=new RegExp('(?:^|[\\s;,.|—-])'+label+'\\s*[:\\-]?\\s*([^;|\\n]+?)(?=\\s+(?:lieu|nom|zone|quartier|type|contact|tel|tél|telephone|téléphone|whatsapp|maps|map|adresse|horaire|prix|tarif|description|photo|qr|lien|message|visibilité|visibilite|offre|durée|duree|note|statut)\\s*[:\\-]|$)','i');var m=clean.match(re);if(m&&m[1])return norm(m[1]);}return '';}
  function phone(text){var clean=norm(text);var e=clean.match(/(?:tel|tél|telephone|téléphone|phone|whatsapp|wa|contact)\s*[:\-]?\s*((?:\+?\d[\d\s().-]{6,}\d))/i);if(e&&e[1])return norm(e[1]);var any=clean.match(/(?:\+?\d[\d\s().-]{7,}\d)/);return any?norm(any[0]):'';}
  function placeName(text){var x=field(text,['lieu','nom','endroit','place']);if(x)return x;var m=norm(text).match(/\b(?:lieu|endroit|chez|à|a)\s+([A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9\s'.-]{1,55})/i);return m?norm(m[1]).replace(/\b(?:zone|quartier|contact|tel|description|maps|prix)\b.*$/i,'').trim():'';}
  function zone(text){return field(text,['zone','quartier','adresse','secteur','ville','village']);}
  function typeLieu(text){var x=field(text,['type','catégorie','categorie','genre']);if(x)return x;var t=low(text);var types=['restaurant','boutique','plage','activité','activite','villa','maison','hôtel','hotel','site','atelier','marché','marche','service','guide','excursion','lieu culturel'];for(var i=0;i<types.length;i++){if(t.indexOf(types[i])!==-1)return types[i];}return '';}
  function price(text){var x=field(text,['prix','tarif','montant']);if(x)return x;var m=norm(text).match(/\b(\d[\d\s.,]*)\s*(fcfa|f\s*cfa|xof|cfa|€|eur|euro|euros|f)\b/i);return m?norm(m[1]+' '+(m[2]||'')):'';}
  function intent(text){var t=low(text);if(/qr|partage|lien/.test(t))return 'QR / partage à préparer';if(/fiche|description|photo|présenter|presenter/.test(t))return 'fiche lieu à préparer';if(/maps|adresse|repère|repere|quartier|accès|acces/.test(t))return 'repère terrain';if(/visibilité|visibilite|boost|annonce|offre|promo/.test(t))return 'visibilité à préparer';if(/message|whatsapp|sms|répondre|repondre/.test(t))return 'message client';if(/note|ambiance|état|etat|remarque/.test(t))return 'note terrain';if(/lieu|endroit|découvrir|decouvrir/.test(t))return 'nouveau lieu';return 'brouillon EXPLORE';}
  function draft(text){var clean=norm(text);return{module:'EXPLORE',original:clean,intent:intent(clean),place_name:placeName(clean),zone:zone(clean),type:typeLieu(clean),phone:phone(clean),maps:field(clean,['maps','map','repère','repere','accès','acces']),hours:field(clean,['horaire','horaires','ouverture']),price:price(clean),description:field(clean,['description','ambiance','points forts','atout','atouts']),link:field(clean,['lien','url','qr'])};}
  function missing(d){var miss=[];if(!d.place_name)miss.push('nom du lieu');if(!d.zone&&/zone|quartier|adresse|maps|repère|repere/.test(low(d.original)))miss.push('zone/repère');if(!d.type&&/fiche|lieu|type|catégorie|categorie/.test(low(d.original)))miss.push('type de lieu');if(!d.phone&&/contact|whatsapp|client|appel/.test(low(d.original)))miss.push('contact');return miss;}
  function line(label,value){return value?'\n- '+label+' : '+value:'';}
  function formulate(text){var clean=norm(text);if(!clean)return 'EXPLORE · Note vide : préciser le lieu ou la demande avant validation.';var d=draft(clean),miss=missing(d);var out='EXPLORE · '+d.intent.toUpperCase()+'\nBrouillon préparé à partir de : '+clean+line('Lieu',d.place_name)+line('Zone',d.zone)+line('Type',d.type)+line('Contact',d.phone)+line('Repère / Maps',d.maps)+line('Horaires',d.hours)+line('Prix indicatif',d.price)+line('Description',d.description)+line('Lien / QR',d.link);if(miss.length)out+='\nÀ compléter avant validation : '+miss.join(', ')+'.';out+='\nÀ vérifier par le professionnel avant envoi ou rangement. Aucun prix, visite, disponibilité, publication ou promesse client n’est confirmé automatiquement.';return out;}
  function extra(text){return{explore_draft:draft(text),status:'draft',warning:'Brouillon EXPLORE : validation humaine obligatoire avant prix, visite, disponibilité, publication ou promesse client.'};}
  ready(function(){var c=core();var target=document.querySelector('#digiy-oreille-explore')||document.querySelector('#digiy-oreille-metier')||document.querySelector('[data-digiy-oreille]');if(!c||!target){console.warn('[DIGIY EXPLORE] Core ou cible Oreille manquant.');return;}var instance=c.mount({module:'EXPLORE',title:'Oreille EXPLORE',subtitle:'Lieu · fiche · repère · QR · message · visibilité · note terrain.',storagePrefix:'DIGIY_OREILLE_METIER',target:target,guideText:GUIDE,templates:TEMPLATES,formulate:formulate,buildSaveExtra:extra});window.DIGIY_OREILLE_EXPLORE={version:VERSION,instance:instance,buildDraft:draft,formulate:formulate,missingFields:missing};});
})();