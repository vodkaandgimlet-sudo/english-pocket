/* English Pocket writing: Japanese-to-English tasks and free composition. */
(function(){
'use strict';
const prompts=window.ENGLISH_POCKET_WRITING_PROMPTS||[];
const key='english-pocket-writing-v1';
const $=id=>document.getElementById(id);
let records=[];
try{const v=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(v))records=v;}catch(e){}
let current=null,category='友達',mode='guided',busy=false;
const save=()=>{try{localStorage.setItem(key,JSON.stringify(records.slice(-150)))}catch(e){}};
const add=(parent,tag,text,klass)=>{const e=document.createElement(tag);if(klass)e.className=klass;e.textContent=text;parent.append(e);return e};
const safeUrl=()=>{
  try{const obj=JSON.parse(localStorage.getItem('english-pocket-sync-v1')||'{}');
   const url=new URL(String(obj.endpoint||'').replace(/\/+$/,''));
   if(url.protocol!=='https:'||url.pathname!=='/'||url.search||url.hash||!obj.secret||obj.secret.length<16)return null;
   return {origin:url.origin,secret:obj.secret};
  }catch(e){return null;}
};
function renderStats(){
 const el=$('writingStats');if(!el)return;
 const checked=records.filter(x=>x.review);
 el.textContent='記録 '+records.length+'件 / AI添削 '+checked.length+'件';
}
function next(){
 const list=prompts.filter(x=>x.area===category);
 if(!list.length)return;
 const attempted=new Set(records.filter(x=>x.mode==='guided').slice(-60).map(x=>x.promptId));
 const pool=list.filter(x=>!attempted.has(x.id));
 current=(pool.length?pool:list)[Math.floor(Math.random()*(pool.length?pool:list).length)];
 $('writingJapanese').textContent=current.ja;
 $('writingGrammar').textContent='学習ポイント：'+current.grammar;
 $('writingInput').value='';
 $('writingFeedback').replaceChildren();
 $('writingFeedback').classList.add('hide');
 $('writingExample').classList.add('hide');
 $('writingStatus').textContent='';
}
function setMode(v){
 mode=v;
 $('writingGuided').classList.toggle('hide',v!=='guided');
 $('writingFreeHint').classList.toggle('hide',v!=='free');
 $('writingCategory').classList.toggle('hide',v!=='guided');
 $('writingNext').classList.toggle('hide',v!=='guided');
 $('writingTabGuided').classList.toggle('active',v==='guided');
 $('writingTabFree').classList.toggle('active',v==='free');
 $('writingInput').placeholder=v==='guided'?'ここに英語の答えを入力':'友達に伝えたいことや仕事の話など、自由に英文を書いてください';
 $('writingFeedback').replaceChildren();$('writingFeedback').classList.add('hide');
 $('writingExample').classList.add('hide');$('writingStatus').textContent='';
}
function feedback(data){
 const box=$('writingFeedback');box.replaceChildren();
 add(box,'h3','添削結果');
 const score=add(box,'p','文法：'+(data.grammarAssessment||'確認済み')+' / 自然さ：'+(data.naturalnessAssessment||'確認済み'),'writing-eval');
 const corrected=add(box,'div','おすすめの英文','writing-subtitle');
 add(box,'p',data.corrected||'','writing-corrected');
 add(box,'div','日本語の意味','writing-subtitle');
 add(box,'p',data.translation||'','writing-ja');
 add(box,'div','文法のポイント','writing-subtitle');
 add(box,'p',data.grammarExplanation||'','writing-explain');
 add(box,'div','自然な言い回し','writing-subtitle');
 add(box,'p',data.naturalnessExplanation||'','writing-explain');
 if(data.alternative){add(box,'div','別の言い方','writing-subtitle');add(box,'p',data.alternative,'writing-explain');}
 if(data.encouragement)add(box,'p',data.encouragement,'writing-ja');
 box.classList.remove('hide');
}
async function check(){
 if(busy)return;
 const answer=$('writingInput').value.trim();
 if(!answer){$('writingStatus').textContent='英文を入力してください。';return;}
 if(answer.length>500){$('writingStatus').textContent='500文字以内で入力してください。';return;}
 const prefs=safeUrl();
 const record={date:new Date().toLocaleDateString('sv-SE'),mode,promptId:mode==='guided'?current.id:null,ja:mode==='guided'?current.ja:null,answer,review:null};
 busy=true;$('writingSubmit').disabled=true;
 $('writingStatus').textContent='添削しています…';
 try{
   if(!prefs)throw new Error('先に「記録」からNotion同期のWorker URLと同期キーを設定してください。');
   const response=await fetch(prefs.origin+'/correct',{method:'POST',headers:{'Content-Type':'application/json','X-Sync-Key':prefs.secret},body:JSON.stringify({mode,answer,ja:record.ja,reference:mode==='guided'?current.example:null,context:mode==='guided'?current.goal:null}),cache:'no-store'});
   const body=await response.json().catch(()=>({}));
   if(!response.ok||!body.ok){
     if(response.status===503&&body.error==='ai_not_configured')throw new Error('Cloudflare側にOPENAI_API_KEYがまだ設定されていません。');
     if(response.status===401)throw new Error('同期キーを確認してください。');
     if(response.status===429)throw new Error('しばらく時間をおいて再試行してください。');
     throw new Error('添削に失敗しました（'+response.status+'）。');
   }
   record.review=body.feedback;feedback(body.feedback);
   $('writingStatus').textContent='AI添削が完了しました。';
 }catch(e){
   $('writingStatus').textContent=e.message;
   $('writingExample').classList.toggle('hide',mode!=='guided');
   if(mode==='guided')$('writingExampleText').textContent='参考例：'+current.example+'（正解は一通りではありません）';
 }finally{
   records.push(record);save();renderStats();busy=false;$('writingSubmit').disabled=false;
 }
}
$('writingOpen').onclick=()=>{show('writing');renderStats();};
$('writingTabGuided').onclick=()=>setMode('guided');
$('writingTabFree').onclick=()=>setMode('free');
$('writingCategory').onchange=e=>{category=e.target.value;next()};
$('writingNext').onclick=next;
$('writingSubmit').onclick=check;
$('writingExampleToggle').onclick=()=>{if(mode!=='guided')return;$('writingExampleText').textContent='参考例：'+current.example+'（別の自然な英文も正解です）';$('writingExample').classList.toggle('hide')};
$('writingCopy').onclick=()=>{const txt=records.filter(x=>x.review).slice(-30).map(x=>x.answer+'\n→ '+x.review.corrected).join('\n\n');navigator.clipboard?.writeText(txt)};
document.querySelectorAll('[data-nav="writing"]').forEach(b=>b.addEventListener('click',renderStats));
next();setMode('guided');renderStats();
})();