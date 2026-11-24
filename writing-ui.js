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
 if(data.originalEnglish){add(box,'div','添削対象：あなたが送信した原文','writing-subtitle');add(box,'p',data.originalEnglish,'writing-original');}
 add(box,'p','文法：'+(data.grammarAssessment||'確認中')+' / 自然さ：'+(data.naturalnessAssessment||'確認中'),'writing-eval');
 const part=(num,title,value,klass='writing-explain')=>{
  add(box,'h4',num+' '+title,'writing-step-title');
  add(box,'p',value||'説明が得られませんでした。',klass);
 };
 part('①','あなたの英文はどう伝わる？',data.originalMeaning);
 if(data.meaningDifference&& !/^(意味のずれは(確認できません|ありません))/.test(data.meaningDifference)){
  add(box,'p','意味について：'+data.meaningDifference,'writing-meaning-difference');
 }
 add(box,'h4','② どこを、なぜ直す？','writing-step-title');
 if(Array.isArray(data.issues)){
   if(!data.issues.length)add(box,'p','原文に一致する具体的な修正箇所を特定できませんでした。③・④は参考案として確認してください。誤りがないと断定しているわけではありません。','writing-explain');
   data.issues.forEach((issue,i)=>{
    const item=add(box,'div','','writing-issue');
    add(item,'div',(i+1)+'. '+(issue.kind==='grammar'?'文法・表記':'表現の改善'),'writing-issue-kind');
    add(item,'div',issue.quote+' → '+issue.fix,'writing-issue-change');
    add(item,'p',issue.reason,'writing-explain');
   });
 }else add(box,'p','古い添削エンジンからの応答です。Cloudflare Workerを最新版に更新してください。','writing-meaning-difference');
 part('③','まず文法を直すと',data.minimalCorrection||data.corrected,'writing-corrected');
 part('④','会話でより自然に言うと',data.corrected,'writing-corrected');
 if(data.translation)add(box,'p','日本語訳：'+data.translation,'writing-ja');
 if(data.naturalnessExplanation)add(box,'p',data.naturalnessExplanation,'writing-explain');
 if(data.alternative)add(box,'p','別の表現：'+data.alternative,'writing-ja');
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
     if(response.status===503&&body.error==='ai_not_configured')throw new Error('Cloudflare WorkerにWorkers AIの「AI」バインディングを追加してください。');
     if(response.status===401)throw new Error('同期キーを確認してください。');
     if(response.status===429)throw new Error('AIの利用上限に達した可能性があります。翌日以降にお試しください。');
     if(body.error==='ai_invalid_output')throw new Error('添削結果を読み取れませんでした。もう一度お試しください。');
     throw new Error('添削に失敗しました（'+response.status+'）。');
   }
   if(body.correctionVersion!=='3.1'||!Array.isArray(body.feedback?.issues)||body.feedback?.originalEnglish!==answer)throw new Error('Cloudflare Workerが旧バージョン、または添削対象が一致しません。最新のworker.jsをDeployしてください。');
   record.review=body.feedback;feedback(body.feedback);
   $('writingStatus').textContent='AI添削が完了しました（添削エンジン 3.1）';
 }catch(e){
   $('writingStatus').textContent=e.message;
   $('writingExample').classList.toggle('hide',mode!=='guided');
   if(mode==='guided')$('writingExampleText').textContent='参考例：'+current.example+'（正解は一通りではありません）';
 }finally{
   if(record.review){records.push(record);save();renderStats();}busy=false;$('writingSubmit').disabled=false;
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