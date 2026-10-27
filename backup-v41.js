/* Sauvegarde complète locale : ne transmet rien à un service tiers. */
(()=>{'use strict';
const keys=['bouquets-caisse-v1','ma-gestion-commandes-v1','ma-gestion-atelier-v1','ma-gestion-preparations-v32','ma-gestion-cloud-state-v1'];
// Conserver également les clés de données historiques, sans exporter les jetons d'authentification.
const isDataKey=k=>k&&!/session|token|password|auth|secret|supabase/i.test(k)&&(/^(ma-gestion-|bouquets-)/.test(k));
const snapshot=()=>{const data={};for(let i=0;i<localStorage.length;i++){let k=localStorage.key(i);if(isDataKey(k))data[k]=localStorage.getItem(k)}return {format:'ma-gestion-backup',version:2,createdAt:new Date().toISOString(),data}};
const download=(obj,name)=>{let blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)};
const exportAll=()=>{try{let b=snapshot();if(!Object.keys(b.data).length)throw Error('Aucune donnée à exporter');download(b,'ma-gestion-sauvegarde-complete-'+new Date().toISOString().slice(0,10)+'.json');alert('Sauvegarde préparée. Vérifie qu’elle apparaît dans Téléchargements ou Fichiers avant toute restauration.')}catch(e){alert('Export impossible : '+e.message)}};
const picker=document.createElement('input');picker.type='file';picker.accept='.json,application/json';picker.style.display='none';document.body.append(picker);
picker.addEventListener('change',async()=>{let file=picker.files?.[0];picker.value='';if(!file)return;try{let v=JSON.parse(await file.text());if(v.format!=='ma-gestion-backup'||v.version!==2||!v.data||typeof v.data!=='object'||Array.isArray(v.data))throw Error('Ce fichier n’est pas une sauvegarde complète de Ma Gestion');let entries=Object.entries(v.data);if(!entries.length||entries.some(([k,value])=>!isDataKey(k)||typeof value!=='string'))throw Error('Contenu non reconnu');for(let [k,value] of entries){if(value.trim().startsWith('{')||value.trim().startsWith('['))JSON.parse(value)}if(!confirm('Restaurer '+entries.length+' ensembles de données du '+new Date(v.createdAt).toLocaleString('fr-FR')+' ? Cela remplacera les données locales actuelles.'))return;
// Copie de secours téléchargée AVANT toute écriture. La restauration exige une seconde confirmation.
exportAll();if(!confirm('As-tu bien conservé le fichier de sauvegarde de sécurité dans Fichiers ? Confirme pour restaurer.'))return;
const before=snapshot();try{for(let [k,value] of entries)localStorage.setItem(k,value)}catch(err){for(let [k,value] of Object.entries(before.data))localStorage.setItem(k,value);throw Error('Stockage insuffisant : les anciennes données ont été remises')}alert('Restauration locale terminée. L’application va se recharger.');location.reload();
}catch(e){alert('Restauration annulée : '+e.message)}});
window.maGestionBackup={exportAll,chooseRestore:()=>picker.click()};
})();
