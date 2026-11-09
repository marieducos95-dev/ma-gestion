(()=>{'use strict';
const $=id=>document.getElementById(id), eur=n=>Number(n||0).toLocaleString('fr-FR',{style:'currency',currency:'EUR'}), iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
let mode='month', date=iso(new Date()), view='margin';
let root=null;
window.mgDashboardRefresh=()=>{if(document.getElementById('mg44'))render()};
const css=document.createElement('style');css.textContent=`#mg44 .modes{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}#mg44 .modes button{padding:11px 2px;font-size:12px}#mg44 .kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}#mg44 .kpi{background:#241c1b;color:#f8e9e2;border-radius:14px;padding:13px;min-width:0}#mg44 .kpi span{font-size:12px;display:block}#mg44 .kpi strong{font-size:23px;color:#ffa08d;display:block;overflow-wrap:anywhere;margin-top:8px}#mg44 .light{background:#fffaf6;color:#382e2b;border:1px solid #e9d8cf}#mg44 .light strong{color:#477b65}#mg44 .bar{height:10px;border-radius:10px;background:#f2e8e1;overflow:hidden}#mg44 .bar i{display:block;height:100%;background:#e58b7b}#mg44 .split{display:flex;justify-content:space-between;gap:8px;margin:9px 0}#mg44 .split strong{text-align:right}#mg44 .help{margin:10px 0}#mg44 .tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}#mg44 .tabs button{font-size:12px;padding:10px 3px}#mg44 .line{padding:9px 0;border-bottom:1px solid #eee4de}#mg44 h2{margin-top:8px}`;document.head.appendChild(css);
function span(){let d=new Date(date+'T12:00:00'),a,b;if(mode==='day'){a=b=date}else if(mode==='week'){d.setDate(d.getDate()-(d.getDay()+6)%7);a=iso(d);d.setDate(d.getDate()+6);b=iso(d)}else if(mode==='month'){a=iso(new Date(d.getFullYear(),d.getMonth(),1));b=iso(new Date(d.getFullYear(),d.getMonth()+1,0))}else{a=d.getFullYear()+'-01-01';b=d.getFullYear()+'-12-31'}return[a,b]}
const within=(x,a,b)=>typeof x==='string'&&x>=a&&x<=b;
function marketForDate(isoDate){
 const dow=new Date(isoDate+'T12:00:00').getDay();
 return ({0:'Agen',1:'',2:'Casteljaloux',3:'',4:'Eauze',5:'Vic-Fezensac',6:'Le Passage d’Agen'})[dow]||'';
}
function marketNames(){
 const base=['Casteljaloux','Eauze','Vic-Fezensac','Le Passage d’Agen','Agen'];
 const sales=(typeof db!=='undefined'&&Array.isArray(db.sales)?db.sales:[]);
 return [...new Set([...base,...sales.map(s=>s.market).filter(Boolean)])];
}
function data(a,b){
 let sales=(typeof db!=='undefined'&&Array.isArray(db.sales)?db.sales:[]).filter(s=>within(s.date,a,b));
 let ex=(typeof db!=='undefined'&&Array.isArray(db.expenses)?db.expenses:[]).filter(s=>within(s.date,a,b));
 let os=typeof orders!=='undefined'&&Array.isArray(orders)?orders:[];
 let pay=os.flatMap(o=>(o.payments||[]).map(p=>({...p,client:o.client||o.name||''}))).filter(p=>within(p.date,a,b));
 let simple=[];try{simple=JSON.parse(localStorage.getItem('ma-gestion-arrivages-simples-v1')||'[]')}catch{};if(!Array.isArray(simple))simple=[];
 const monthly=new Set(simple.filter(x=>x.mode==='month').map(x=>x.period));
 const relevant=simple.filter(x=>x.mode==='month'?x.period>=a.slice(0,7)&&x.period<=b.slice(0,7)&&mode!=='day'&&mode!=='week':within(x.period,a,b)&&!monthly.has(x.period.slice(0,7)));
 let flowers=relevant.reduce((sum,x)=>sum+Number(x.amount||0),0);
 let market=sales.reduce((total,s)=>total+Number(s.total||0),0);
 let ordersCA=pay.reduce((total,p)=>total+Number(p.amount||0),0);
 let other=ex.filter(x=>!/(fleurs|feuillages)/i.test(x.type||'')).reduce((s,x)=>s+Number(x.amount||0),0);
 let clients=sales.filter(x=>!x.historic).length+pay.length;
 let historic=typeof db!=='undefined'&&Array.isArray(db.historicClients)?db.historicClients:[];
 clients+=historic.filter(x=>within(x.date,a,b)).reduce((s,x)=>s+Number(x.count??x.clients??0),0);
 let items={};let bouquetCount=0;
 sales.forEach(s=>(s.items||[]).forEach(x=>{let p=typeof x==='number'?x:Number(x.price||x.amount||x.value||0);if(p>0){items[p]=(items[p]||0)+1;bouquetCount++}}));
 const marketStats={};
 sales.forEach(s=>{
   const m=s.market||'Marché non renseigné';
   if(!marketStats[m])marketStats[m]={ca:0,clients:0,bouquets:0};
   marketStats[m].ca+=Number(s.total||0);
   marketStats[m].clients+=s.historic?0:1;
   marketStats[m].bouquets+=(s.items||[]).length;
 });
 historic.filter(x=>within(x.date,a,b)).forEach(x=>{
   const m=x.market||'Marché non renseigné';
   if(!marketStats[m])marketStats[m]={ca:0,clients:0,bouquets:0};
   marketStats[m].clients+=Number(x.count??x.clients??0);
   marketStats[m].ca+=Number(x.total||x.amount||0);
 });
 Object.values(marketStats).forEach(x=>x.panier=x.clients?x.ca/x.clients:0);
 return{ca:market+ordersCA,market,ordersCA,clients,bouquetCount,items,flowers,other,duplicate:false,known:simple.length>0,sales,ex,pay,marketStats};
}
function label(a,b){let d=x=>new Date(x+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'});return a===b?d(a):d(a)+' – '+d(b)}
function render(){root=$('mg44');if(!root)return;const[a,b]=span(),v=data(a,b),margin=v.ca-v.flowers-v.other,rate=v.ca?100*margin/v.ca:0;let prev=new Date(a+'T12:00:00');if(mode==='day')prev.setDate(prev.getDate()-1);if(mode==='week')prev.setDate(prev.getDate()-7);if(mode==='month')prev.setMonth(prev.getMonth()-1);if(mode==='year')prev.setFullYear(prev.getFullYear()-1);let old=date;date=iso(prev);let[pa,pb]=span();date=old;let pv=data(pa,pb);let change=pv.ca?((v.ca-pv.ca)/pv.ca*100):null;
root.innerHTML=`<h2>🌸 Chiffres & Analyses</h2><div class="panel"><div class="modes">${[['day','Jour'],['week','Semaine'],['month','Mois'],['year','Année']].map(([k,t])=>`<button type="button" data-mode="${k}" class="${mode===k?'primary':''}">${t}</button>`).join('')}</div><div class="split"><button type="button" id="mgPrev">←</button><strong>${label(a,b)}</strong><button type="button" id="mgNext">→</button></div><label for="mgDate">Choisir une date</label><input type="date" id="mgDate" value="${date}"></div>
<div class="panel" id="mgMarketDay"></div>
<div class="kpis"><div class="kpi"><span>Chiffre d'affaires</span><strong>${eur(v.ca)}</strong></div><div class="kpi"><span>Clients / encaissements</span><strong>${v.clients}</strong></div><div class="kpi"><span>Panier moyen</span><strong>${v.clients?eur(v.ca/v.clients):'—'}</strong></div><div class="kpi"><span>Bouquets détaillés</span><strong>${v.bouquetCount}</strong></div><div class="kpi light"><span>Achats de fleurs</span><strong>${eur(v.flowers)}</strong></div><div class="kpi light"><span>Autres dépenses</span><strong>${eur(v.other)}</strong></div><div class="kpi light"><span>Solde provisoire</span><strong>${v.known?eur(margin):'—'}</strong></div><div class="kpi light"><span>Solde / CA</span><strong>${v.known&&v.ca?rate.toFixed(1).replace('.',',')+' %':'—'}</strong></div></div><p class="help">${v.known?'Solde de trésorerie indicatif : CA − achats de fleurs − charges saisies. Ce n’est pas la marge sur les bouquets vendus : le stock restant et les charges non enregistrées ne sont pas valorisés.':'Aucun achat de fleurs reconnu pour cette période : marge non calculable.'}${v.duplicate?' ⚠ Achats de fleurs aussi saisis dans Dépenses : vérifier les doublons.':''} Les anciens marchés sans détail ne permettent pas de connaître tous les bouquets vendus.</p><div class="panel"><h3>Répartition des recettes</h3><div class="split"><span>Marchés</span><strong>${eur(v.market)}</strong></div><div class="bar"><i style="width:${v.ca?100*v.market/v.ca:0}%"></i></div><div class="split"><span>Commandes encaissées</span><strong>${eur(v.ordersCA)}</strong></div><div class="bar"><i style="width:${v.ca?100*v.ordersCA/v.ca:0}%"></i></div></div><div class="panel" id="mgMarketCompare"><h3>📊 Comparatif par marché</h3><p class="help">Pour la période sélectionnée : chiffre d’affaires, clients, panier moyen et bouquets détaillés.</p><div id="mgMarketTable"></div></div><div class="panel"><h3>Analyse détaillée</h3><div class="tabs">${[['margin','Marges'],['sales','Ventes'],['compare','Comparer']].map(([k,t])=>`<button type="button" data-view="${k}" class="${view===k?'primary':''}">${t}</button>`).join('')}</div><div id="mgDetail"></div></div>`;
const expectedMarket=mode==='day'?marketForDate(date):'';
const daySales=v.sales.filter(s=>s.date===date);
const dayGroups={};
daySales.forEach(s=>{const m=s.market||'Marché non renseigné';if(!dayGroups[m])dayGroups[m]={count:0,ca:0};dayGroups[m].count++;dayGroups[m].ca+=Number(s.total||0)});
const names=marketNames();
const currentMarkets=Object.keys(dayGroups);
const current=currentMarkets.length===1?currentMarkets[0]:'';
$('mgMarketDay').innerHTML=mode==='day'?`
 <h3>📍 Marché de la journée</h3>
 <div class="split"><span>Marché attendu selon le jour</span><strong>${expectedMarket||'—'}</strong></div>
 <div class="split"><span>Marché actuellement enregistré</span><strong>${current|| (currentMarkets.length?'Plusieurs marchés':'Aucun marché')}</strong></div>
 ${currentMarkets.length?currentMarkets.map(m=>`<div class="line"><div class="split"><span>${m}</span><strong>${eur(dayGroups[m].ca)} · ${dayGroups[m].count} encaissement(s)</strong></div><label>Corriger ce marché</label><div class="split"><select data-day-market="${m.replace(/"/g,'&quot;')}">${names.map(n=>`<option ${n===m?'selected':''}>${n}</option>`).join('')}</select><button type="button" data-fix-day-market="${m.replace(/"/g,'&quot;')}">Modifier</button></div></div>`).join(''):'<p class="help">Aucune vente enregistrée pour cette date.</p>'}
 ${expectedMarket&&current&&expectedMarket!==current?`<p class="help">⚠ Le marché enregistré ne correspond pas au marché attendu pour ce jour. Pour le ${date}, le marché attendu est <strong>${expectedMarket}</strong>.</p>`:''}
`:'';
const marketRows=Object.entries(v.marketStats).sort((a,b)=>b[1].ca-a[1].ca);
$('mgMarketTable').innerHTML=marketRows.length?`<div class="line"><div class="split"><strong>Marché</strong><strong>CA · Clients · Panier · Bouquets</strong></div></div>`+marketRows.map(([m,x])=>`<div class="line"><div class="split"><span>${m}</span><strong>${eur(x.ca)} · ${x.clients} · ${x.clients?eur(x.panier):'—'} · ${x.bouquets}</strong></div><div class="bar"><i style="width:${v.market?v.market?Math.min(100,100*x.ca/v.market):0:0}%"></i></div></div>`).join(''):'<p class="help">Aucune vente de marché sur cette période.</p>';
let h='';if(view==='margin'){h='<p class="help">Marges théoriques par prix de vente : estimation au coefficient x3 (coût théorique = prix / 3), uniquement pour les bouquets détaillés en caisse. Les coûts réels des compositions ne sont pas connus pour chaque vente.</p>'+Object.entries(v.items).sort((a,b)=>Number(a[0])-Number(b[0])).map(([price,n])=>`<div class="split line"><span>Bouquet ${eur(price)} · ${n} vendu(s)</span><strong>≈ ${eur(Number(price)*2/3)} / unité</strong></div>`).join('');if(!Object.keys(v.items).length)h+='<p class="help">Aucune vente détaillée par bouquet pour cette période.</p>'}else if(view==='sales'){let max=Math.max(1,...Object.values(v.items));h=Object.entries(v.items).sort((a,b)=>Number(a[0])-Number(b[0])).map(([price,n])=>`<div class="line"><div class="split"><span>Bouquet ${eur(price)}</span><strong>${n}</strong></div><div class="bar"><i style="width:${100*n/max}%"></i></div></div>`).join('')||'<p class="help">Pas de détail de bouquets pour cette période.</p>'}else{h=`<div class="split"><span>Période précédente</span><strong>${eur(pv.ca)}</strong></div><div class="split"><span>Période actuelle</span><strong>${eur(v.ca)}</strong></div><div class="split"><span>Évolution</span><strong>${change===null?'—':(change>=0?'+':'')+change.toFixed(1).replace('.',',')+' %'}</strong></div>`} $('mgDetail').innerHTML=h;
root.querySelectorAll('[data-mode]').forEach(x=>x.onclick=()=>{mode=x.dataset.mode;render()});
root.querySelectorAll('[data-fix-day-market]').forEach(btn=>btn.onclick=()=>{
 const from=btn.dataset.fixDayMarket, sel=root.querySelector(`select[data-day-market="${CSS.escape(from)}"]`), to=sel?.value;
 if(!to||to===from)return;
 const affected=(typeof db!=='undefined'&&Array.isArray(db.sales)?db.sales:[]).filter(s=>s.date===date&&(s.market||'Marché non renseigné')===from);
 if(!affected.length)return alert('Aucune vente trouvée pour ce marché à cette date.');
 if(!confirm(`Corriger ${affected.length} vente(s) du ${date} de « ${from} » vers « ${to} » ?\\nLes montants et paiements restent inchangés.`))return;
 affected.forEach(s=>s.market=to);
 if(typeof db!=='undefined'&&Array.isArray(db.historicClients))db.historicClients.forEach(x=>{if(x.date===date&&x.market===from)x.market=to});
 if(typeof save==='function')save();
 render();
});
root.querySelectorAll('[data-view]').forEach(x=>x.onclick=()=>{view=x.dataset.view;render()});$('mgDate').onchange=e=>{if(e.target.value){date=e.target.value;render()}};function shift(n){let d=new Date(date+'T12:00:00');if(mode==='day')d.setDate(d.getDate()+n);if(mode==='week')d.setDate(d.getDate()+7*n);if(mode==='month')d.setMonth(d.getMonth()+n);if(mode==='year')d.setFullYear(d.getFullYear()+n);date=iso(d);render()}$('mgPrev').onclick=()=>shift(-1);$('mgNext').onclick=()=>shift(1);
}
const mount=$('mgV32');if(mount){new MutationObserver(()=>{if($('mg44'))render()}).observe(mount,{childList:true});} document.addEventListener('ma-gestion-atelier-changed',render);window.addEventListener('ma-gestion-arrivages-changed',render);document.addEventListener('ma-gestion-preparations-changed',render);window.addEventListener('storage',render);render();
})();