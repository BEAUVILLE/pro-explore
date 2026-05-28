/* DIGIY GO EXPLORE — vocabulaire lieu / activité / visibilité FR WO AR */
(function(){"use strict";
var vocab={
  module:"EXPLORE",
  label:"Je fais découvrir",
  version:"explore-vocab-fr-wo-ar-20260528",
  languages:["fr","wo","ar"],
  doctrine:"EXPLORE prépare le lieu, l'activité, la zone et la visibilité en français, wolof ou arabe. Le pro valide. PAY garde seulement l'argent réel.",
  intents:{
    place:["lieu","endroit","spot","activité","activite","sortie","visite","balade","découverte","decouverte","barab","bërëb","doxantu","seeti","مكان","نشاط","زيارة","جولة"],
    visibility:["boost","visibilité","visibilite","mettre en avant","fiche","lien","partage","wone","yégle","partase","إبراز","ظهور","رابط","مشاركة"],
    zone:["zone","ville","quartier","plage","Saly","Mbour","Petite Côte","dëkk","goox","tefes","منطقة","مدينة","حي","شاطئ"],
    contact:["contact","WhatsApp","appel","guide","organisateur","watsap","woote","gide","اتصال","واتساب","مكالمة","دليل"]
  },
  fields:{
    place:["lieu","nom","endroit","barab","tur","bërëb","مكان","اسم"],
    activity:["activité","activite","expérience","experience","sortie","balade","doxantu","seeti","نشاط","جولة","زيارة"],
    zone:["zone","ville","quartier","dëkk","goox","منطقة","مدينة","حي"],
    description:["description","détail","detail","ambiance","leeral","وصف","تفاصيل"],
    price:["prix","tarif","boost","montant","njëg","fay","سعر","مبلغ"],
    payment:["cash","wave","orange money","carte","xaalis","kesh","كاش","وايف","بطاقة"]
  },
  examples:["lieu plage de Saly activité balade coucher de soleil zone Saly centre boost visibilité 10000 Wave","Barab tefes Saly, doxantu coucher de soleil, boost 10000 Wave","مكان شاطئ سالي، نشاط جولة، ظهور 10000 وايف"],
  payBridge:{allowed:true,phrasePrefix:"boost EXPLORE",onlyRealMoney:true},
  safety:["aucune activité publiée automatiquement","aucun prix imposé","aucun boost validé sans paiement réel"]
};
window.DIGIY_GO_VOCABS=window.DIGIY_GO_VOCABS||{};
window.DIGIY_GO_VOCABS.EXPLORE=vocab;
window.DIGIY_GO_EXPLORE_VOCAB=vocab;
})();