// English Pocket optional Notion sync. No Notion API token is stored in this app.
(function(){
'use strict';
const KEY='english-pocket-sync-v1';
let config={endpoint:'',secret:'',queue:[]};
try {
 const old=JSON.parse(localStorage.getItem(KEY)||'null');
 if(old&&typeof old==='object'){
   config.endpoint=typeof old.endpoint==='string'?old.endpoint:'';
   config.secret=typeof old.secret==='string'?old.secret:'';
   config.queue=Array.isArray(old.queue)?old.queue:[];
 }
} catch(e){}
let syncing=false;
const byId=id=>document.getElementById(id);
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(config))}catch(e){console.warn('Sync localStorage unavailable',e)}};
function baseUrl(){
 try {
  const u=new URL(config.endpoint.trim().replace(/\/+$/,''));
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/') return '';
  return u.origin;
 } catch(e){return '';}
}
function ready(){return !!baseUrl() && config.secret.length>=16;}
function message(t){const el=byId('syncStatus');if(el)el.textContent=t;}
function status(){message((ready()?'接続設定済み':'未設定')+' / 未送信 '+config.queue.length+' 件');}
async function request(path,method='GET',body){
 if(!ready())throw Error('HTTPS URLと16文字以上の秘密キーを設定してください。');
 const r=await fetch(baseUrl()+path,{
   method,
   headers:{'Content-Type':'application/json','X-Sync-Key':config.secret},
   body:body?JSON.stringify(body):undefined,
   cache:'no-store'
 });
 const data=await r.json().catch(()=>({}));
 if(!r.ok||!data.ok)throw Error(r.status===401?'秘密キーが一致しません。':r.status===503?'Workerの設定が未完了です。':'接続できません (HTTP '+r.status+')');
 return data;
}
async function flush(){
 if(syncing||!ready()||!navigator.onLine)return;
 syncing=true;
 try{
  while(config.queue.length){
   await request('/sync','POST',config.queue[0]);
   config.queue.shift();
   persist();
   status();
  }
  message('Notionへの同期が完了しました（未送信 0 件）');
 }catch(e){message('未送信 '+config.queue.length+' 件。'+e.message);}
 finally{syncing=false;}
}
function finish(session,attempts,mode){
 if(!Array.isArray(session)||!Array.isArray(attempts)||session.length!==attempts.length||!session.length)return;
 const answers=session.map((q,i)=>({
   question:q[1],answer:String(attempts[i].answer),correct:Boolean(attempts[i].correct),correctAnswer:q[2]
 }));
 const id=typeof crypto.randomUUID==='function'?crypto.randomUUID():('s'+Date.now()+'-'+Math.random().toString(36).slice(2));
 config.queue.push({id,date:new Date().toLocaleDateString('sv-SE'),mode,answers});
 persist();
 status();
 void flush();
}
function init(){
 byId('syncEndpoint').value=config.endpoint;
 byId('syncSecret').value=config.secret;
 status();
 byId('syncSave').onclick=()=>{
  const endpoint=byId('syncEndpoint').value.trim().replace(/\/+$/,'');
  const secret=byId('syncSecret').value.trim();
  config.endpoint=endpoint;config.secret=secret;
  if(!ready()){message('HTTPSのWorker URLと16文字以上の秘密キーを入力してください。');return;}
  persist();status();void flush();
 };
 byId('syncTest').onclick=async()=>{
  message('接続確認中…');
  try{await request('/health');message('Workerへの接続と秘密キーを確認しました。');}
  catch(e){message(e.message);}
 };
 byId('syncNow').onclick=()=>{status();void flush();};
 window.addEventListener('online',()=>{void flush();});
 void flush();
}
window.englishPocketSync={finish,status};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();