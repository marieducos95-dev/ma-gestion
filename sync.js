/* Ma Gestion - synchronisation Supabase authentifiée, locale d'abord. */
(()=>{'use strict';
const URL='https://dimqxmdtfqdxwxvdrphr.supabase.co';
const APIKEY='sb_publishable_z4vhCFHhvwwuLkIqpQLZ0g_fnC_fUq0';
const SESSION_KEY='ma-gestion-cloud-session-v1';
const STATE_KEY='ma-gestion-cloud-state-v1';
const $c=id=>document.getElementById(id);
const status=$c('cloudStatus'),login=$c('cloudLogin'),out=$c('cloudSignOut');
let session=null, busy=false, pending=false, lastSaved='';
let state={deleted:{sales:[],expenses:[],orders:[]},baseline:null};
try{const v=JSON.parse(localStorage.getItem(STATE_KEY));if(v&&v.deleted)state=v;}catch{}
const PREP_KEY='ma-gestion-preparations-v32';
const ATELIER_KEY='ma-gestion-atelier-v1';
const getAtelier=()=>{try{return JSON.parse(localStorage.getItem(ATELIER_KEY)||'{}')}catch{return {}}};
const getPrep=()=>{try{return JSON.parse(localStorage.getItem(PREP_KEY)||'{}')}catch{return {}}};
const getLocal=()=>({sales:db.sales||[],expenses:db.expenses||[],orders:orders||[],historicClients:db.historicClients||[],preparations:getPrep(),atelier:getAtelier()});
const ids=xs=>new Set((xs||[]).map(x=>String(x.id)));
const key=x=>String(x.id);
const unique=(a,b,deleted)=>{const map=new Map();for(const x of a||[])if(x&&x.id&&!deleted.has(key(x)))map.set(key(x),x);for(const x of b||[])if(x&&x.id&&!deleted.has(key(x))&&!map.has(key(x)))map.set(key(x),x);return [...map.values()];};
function persistState(){try{localStorage.setItem(STATE_KEY,JSON.stringify(state));}catch{}}
function markDeletes(){const now=getLocal();if(state.baseline){for(const k of ['sales','expenses','orders']){const present=ids(now[k]);const gone=new Set(state.deleted[k]||[]);for(const x of state.baseline[k]||[])if(!present.has(key(x)))gone.add(key(x));state.deleted[k]=[...gone];}}state.baseline=now;persistState();}
function localWrite(v){db={...db,sales:v.sales,expenses:v.expenses,historicClients:v.historicClients||[]};orders=v.orders;localStorage.setItem('bouquets-caisse-v1',JSON.stringify(db));localStorage.setItem('bouquets-commandes-v1',JSON.stringify(orders));if(v.preparations)localStorage.setItem(PREP_KEY,JSON.stringify(v.preparations));if(v.atelier)localStorage.setItem(ATELIER_KEY,JSON.stringify(v.atelier));state.baseline=getLocal();persistState();render();}
function message(t){status.textContent=t;}
function showSession(){login.classList.toggle('hidden',!!session);out.classList.toggle('hidden',!session);if(!session)message('Non connectée : tes ventes restent sur cet iPhone, sans copie en ligne.');}
function saveSession(s){session=s;try{if(s)localStorage.setItem(SESSION_KEY,JSON.stringify(s));else localStorage.removeItem(SESSION_KEY);}catch{}showSession();}
async function request(path,opts={}){const headers={'apikey':APIKEY,'Content-Type':'application/json',...(opts.auth?{'Authorization':'Bearer '+session.access_token}:{})};const res=await fetch(URL+path,{...opts,headers:{...headers,...opts.headers}});let body=null;try{body=await res.json()}catch{}if(!res.ok)throw new Error(body?.msg||body?.error_description||body?.message||('Erreur réseau '+res.status));return body;}
async function refresh(){if(!session?.refresh_token)throw Error('Session expirée');const v=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:session.refresh_token})});saveSession(v);}
async function authRequest(path,opts){try{return await request(path,{...opts,auth:true});}catch(e){if(/401|JWT|expired|token/i.test(e.message)&&session?.refresh_token){await refresh();return request(path,{...opts,auth:true});}throw e;}}
function schedule(){pending=true;if(navigator.onLine)setTimeout(sync,350);}
// Capture chaque écriture locale, y compris les commandes et suppressions.
const originalSave=save;save=function(){originalSave();markDeletes();schedule();};
const originalPersist=persistOrders;persistOrders=function(){originalPersist();markDeletes();schedule();};
async function sync(){if(!session||busy||!navigator.onLine)return false;busy=true;pending=false;message('☁️ Synchronisation en cours…');try{
 const me=await authRequest('/auth/v1/user',{method:'GET'});if(!me?.id)throw Error('Connexion invalide');
 const rows=await authRequest('/rest/v1/ma_gestion_donnees?select=donnees&user_id=eq.'+encodeURIComponent(me.id),{method:'GET'});
 const cloud=(Array.isArray(rows)&&rows[0]?.donnees)||{};
 const del={};for(const k of ['sales','expenses','orders'])del[k]=new Set([...(state.deleted[k]||[]),...(cloud.deleted?.[k]||[])]);
 const local=getLocal();const merged={};for(const k of ['sales','expenses','orders'])merged[k]=unique(local[k],cloud[k],del[k]);
 merged.historicClients=unique(local.historicClients,cloud.historicClients,new Set());
 const lp=local.preparations||{},cp=cloud.preparations||{};
 const byId=(a,b)=>{const m=new Map();for(const x of b||[])if(x?.id)m.set(String(x.id),x);for(const x of a||[])if(x?.id)m.set(String(x.id),x);return [...m.values()]};
 merged.preparations={...cp,...lp,preps:byId(lp.preps,cp.preps),bouquetLosses:byId(lp.bouquetLosses,cp.bouquetLosses),draft:{...(cp.draft||{}),...(lp.draft||{})},expenseMeta:{...(cp.expenseMeta||{}),...(lp.expenseMeta||{})}};
 const la=local.atelier||{},ra=cloud.atelier||{};
 merged.atelier={...ra,...la,lots:byId(la.lots,ra.lots),losses:byId(la.losses,ra.losses),events:byId(la.events,ra.events),recipes:byId(la.recipes,ra.recipes)};
 merged.deleted=Object.fromEntries(['sales','expenses','orders'].map(k=>[k,[...del[k]]]));
 const changed=JSON.stringify(local)!==JSON.stringify({sales:merged.sales,expenses:merged.expenses,orders:merged.orders,historicClients:merged.historicClients,preparations:merged.preparations,atelier:merged.atelier});
 // Conserver les changements saisis pendant la requête avant de remplacer les données locales.
 if(changed)localWrite(merged);
 state.deleted=merged.deleted;state.baseline=getLocal();persistState();
 await authRequest('/rest/v1/ma_gestion_donnees?on_conflict=user_id',{method:'POST',headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:me.id,donnees:merged,updated_at:new Date().toISOString()})});
 lastSaved=new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});message('✅ Sauvegarde en ligne effectuée à '+lastSaved);return true;
 }catch(e){pending=true;message('⚠️ Copie en ligne non confirmée : '+e.message+'. Les ventes restent sur cet iPhone.');return false;}finally{busy=false;if(pending&&navigator.onLine)setTimeout(sync,10000);}}
window.maGestionActualiser=async()=>{if(!session){message('Connecte-toi pour actualiser depuis la sauvegarde en ligne.');return false;}if(!navigator.onLine){message('Hors connexion : les données restent sur cet iPhone.');return false;}if(busy){message('☁️ Synchronisation déjà en cours…');return false;}return await sync();};
async function sign(kind){const email=$c('cloudEmail').value.trim(),password=$c('cloudPassword').value;if(!email||password.length<8){message('Saisis ton e-mail et un mot de passe d’au moins 8 caractères.');return;}message('Connexion en cours…');try{if(kind==='signup'){const r=await request('/auth/v1/signup',{method:'POST',body:JSON.stringify({email,password})});if(!r.access_token){message('📩 Compte créé : ouvre ton e-mail de confirmation, puis reviens ici pour te connecter.');return;}saveSession(r);}else{const r=await request('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});if(!r.access_token)throw Error('Connexion impossible');saveSession(r);}$c('cloudPassword').value='';await sync();}catch(e){message('Connexion impossible : '+e.message);}}
$c('cloudSignIn').onclick=()=>sign('signin');$c('cloudSignUp').onclick=()=>sign('signup');out.onclick=()=>{if(!confirm('Déconnecter la sauvegarde en ligne sur cet iPhone ?'))return;saveSession(null);};
window.addEventListener('ma-gestion-atelier-changed',()=>{markDeletes();schedule()});
window.addEventListener('ma-gestion-preparations-changed',()=>{markDeletes();schedule()});
window.addEventListener('online',sync);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});setInterval(()=>{if(session)sync();},60000);
markDeletes();try{const s=JSON.parse(localStorage.getItem(SESSION_KEY));if(s?.access_token){session=s;showSession();sync();}else showSession();}catch{showSession();}
})();
