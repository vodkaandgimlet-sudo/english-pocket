/* English Pocket writing: Japanese-to-English tasks and free composition. */
(function(){
'use strict';
const prompts=window.ENGLISH_POCKET_WRITING_PROMPTS||[];
const key='english-pocket-writing-v1';
const $=id=>document.getElementById(id);
let records=[];
try{const v=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(v))records=v;}catch(e){}
let current=null,category='友達',mode='guided',busy=false;
const DRAFT_KEY='english-pocket-writing-drafts-v1';
let drafts={guided:'',free:''};
try{
 const stored=JSON.parse(localStorage.getItem(DRAFT_KEY)||'{}');
 if(stored&&typeof stored==='object'){
  for(const name of ['guided','free']){
   if(typeof stored[name]==='string')drafts[name]=stored[name].slice(0,500);
  }
 }
}catch(e){}
function saveDraft(){
 drafts[mode]=$('writingInput').value;
 try{localStorage.setItem(DRAFT_KEY,JSON.stringify(drafts));}catch(e){}
}
const save=()=>{try{localStorage.setItem(key,JSON.stringify(records.slice(-150)))}catch(e){}};
const QUEUE_KEY='english-pocket-writing-notion-queue-v1';
let pending=[];
try{const saved=JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]');if(Array.isArray(saved))pending=saved;}catch(e){}
let sending=false;
function storePending(){try{localStorage.setItem(QUEUE_KEY,JSON.stringify(pending.slice(-200)))}catch(e){}}
function showWritingSync(text=''){
 const e=$('writingSyncStatus');if(e)e.textContent=text||(pending.length?'Notion未送信 '+pending.length+'件':'英作文のNotion同期：待機中');
}
function topicsFromReview(review){
 const tags=new Set();
 for(const issue of review.issues||[]){
  const t=(issue.quote||'')+' '+(issue.fix||'')+' '+(issue.reason||'');
  if(/weren't|wasn't|isn't|aren't|\bbe動詞\b|一般動詞/i.test(t))tags.add('be動詞・一般動詞');
  if(/didn't|doesn't|don't|否定|疑問/i.test(t))tags.add('疑問文・否定文');
  if(/現在完了|have been|has been/i.test(t))tags.add('現在完了');
  if(/過去形|未来形|時制|進行形/i.test(t))tags.add('時制');
  if(/前置詞|\b(in|on|at|for|to|with)\b/i.test(t))tags.add('前置詞');
  if(/語順|主語|目的語/i.test(t))tags.add('語順');
  if(issue.kind==='wording'||/単語|語彙|表現|大文字/i.test(t))tags.add('語彙・表現');
 }
 if(!tags.size)tags.add('その他');
 return [...tags].slice(0,8);
}
function enqueueWriting(record){
 if(!record.review||record.syncQueued)return;
 const review=record.review;
 const id=record.syncId||(typeof crypto.randomUUID==='function'?crypto.randomUUID():'w'+Date.now()+Math.random().toString(36).slice(2));
 record.syncId=id;
 record.syncQueued=true;
 const reviewText=(review.issues||[]).map(x=>(x.kind==='wording'?'表現':'文法')+'：'+x.quote+' → '+x.fix+'／'+x.reason).join('\n');
 pending.push({id,date:record.date,mode:record.mode,answer:record.answer,intent:record.mode==='guided'?(record.ja||''):(record.intent||''),reviewText:reviewText.slice(0,1800),minimalCorrection:review.minimalCorrection||review.corrected,corrected:review.corrected,translation:review.translation,topics:topicsFromReview(review),engine:'3.4'});
 storePending();showWritingSync('英作文をNotion送信待ちに追加しました（'+pending.length+'件）');
 void flushWriting();
}
async function flushWriting(){
 if(sending||!pending.length||!navigator.onLine)return;
 const settings=safeUrl();if(!settings){showWritingSync('Notion未送信 '+pending.length+'件：記録画面で同期設定を確認してください');return;}
 sending=true;
 try{
  while(pending.length){
   const response=await fetch(settings.origin+'/writing-sync',{method:'POST',headers:{'Content-Type':'application/json','X-Sync-Key':settings.secret},body:JSON.stringify(pending[0]),cache:'no-store'});
   const data=await response.json().catch(()=>({}));
   if(!response.ok||!data.ok){
    if(data.error==='writing_not_configured')throw new Error('Cloudflareに英作文DBのIDを設定してください');
    throw new Error('送信待ち（HTTP '+response.status+'）');
   }
   pending.shift();storePending();
   showWritingSync('英作文のNotion同期が完了しました');
  }
 }catch(e){showWritingSync('Notion未送信 '+pending.length+'件：'+e.message);}
 finally{sending=false;}
}

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
 drafts.guided='';
 saveDraft();
 $('writingFeedback').replaceChildren();
 $('writingFeedback').classList.add('hide');
 $('writingExample').classList.add('hide');
 $('writingStatus').textContent='';
 $('writingClarification').classList.add('hide');
}
function setMode(v){
 if(busy)return;
 saveDraft();
 mode=v;
 $('writingInput').value=drafts[v]||'';
 $('writingClarification').classList.add('hide');
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
function feedback(data,intent=''){
 const box=$('writingFeedback');box.replaceChildren();
 add(box,'h3','添削結果');
 if(intent){add(box,'div','確認した意図','writing-subtitle');add(box,'p',intent,'writing-intent-confirmed');}
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
function showInitialGrammar(data){
 const box=$('writingFeedback');box.replaceChildren();
 add(box,'h3','文法の確認（意味の確定前）');
 add(box,'div','添削対象：あなたが送信した原文','writing-subtitle');
 add(box,'p',data.originalEnglish||'','writing-original');
 const mistakes=Array.isArray(data.issues)?data.issues.filter(issue=>issue.kind==='grammar'):[];
 if(!mistakes.length)add(box,'p','原文に一致する明確な文法ミスはまだ特定できませんでした。','writing-explain');
 mistakes.forEach((issue,i)=>{
  const item=add(box,'div','','writing-issue');
  add(item,'div',(i+1)+'. 文法・表記','writing-issue-kind');
  add(item,'div',issue.quote+' → '+issue.fix,'writing-issue-change');
  add(item,'p',issue.reason,'writing-explain');
 });
 add(box,'p','意味を確認した後に、意図に合わせた修正文と自然な言い方を表示します。','writing-ja');
 box.classList.remove('hide');
}
function showPartialReview(data,intent,record){
 const box=$('writingFeedback');box.replaceChildren();
 add(box,'h3','文法の確認結果');
 add(box,'div','添削した元の英文','writing-subtitle');
 add(box,'p',data.originalEnglish||record.answer,'writing-original');
 if(intent){add(box,'div','確認した意図','writing-subtitle');add(box,'p',intent,'writing-intent-confirmed');}
 add(box,'p','文法の指摘は確認できましたが、意図に合う修正文を検証できませんでした。不確かな修正文は表示していません。','writing-meaning-difference');
 const items=Array.isArray(data.issues)?data.issues:[];
 items.forEach((issue,i)=>{
  const item=add(box,'div','','writing-issue');
  add(item,'div',(i+1)+'. 文法・表記','writing-issue-kind');
  add(item,'div',issue.quote+' → '+issue.fix,'writing-issue-change');
  add(item,'p',issue.reason,'writing-explain');
 });
 if(Array.isArray(data.reviewProblems)&&data.reviewProblems.length){
  add(box,'div','修正文を保留した理由','writing-subtitle');
  data.reviewProblems.forEach(x=>add(box,'p','・'+x,'writing-ja'));
 }
 const retry=add(box,'button','同じ意図で修正文を再生成','btn wide');
 retry.type='button';
 retry.onclick=()=>{void check(intent,record);};
 box.classList.remove('hide');
 box.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function clarificationPanel(question,options,onChoose){
 const el=$('writingClarification');
 el.replaceChildren();
 add(el,'h3','伝えたい意味を確認させてください');
 add(el,'p',question||'どちらの意味で書きましたか？','writing-explain');
 options.forEach((option,i)=>{
  const button=add(el,'button',String.fromCharCode(65+i)+'. '+option,'writing-intent-option');
  button.type='button';button.onclick=()=>onChoose(option);
 });
 const custom=add(el,'textarea','','writing-intent-custom');
 custom.placeholder='どちらでもない場合、言いたかったことを日本語で入力';
 custom.maxLength=300;custom.rows=2;
 const choose=add(el,'button','この意味で添削する','btn wide');
 choose.type='button';choose.onclick=()=>{
  if(custom.value.trim())onChoose(custom.value.trim());
  else $('writingStatus').textContent='伝えたかった意味を入力してください。';
 };
 el.classList.remove('hide');
 el.scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function check(intent='',original=null){
 if(busy)return;
 const answer=original?.answer||$('writingInput').value.trim();
 if(!answer){$('writingStatus').textContent='英文を入力してください。';return;}
 if(answer.length>500){$('writingStatus').textContent='500文字以内で入力してください。';return;}
 const prefs=safeUrl();
 const record=original||{date:new Date().toLocaleDateString('sv-SE'),mode,promptId:mode==='guided'?current.id:null,ja:mode==='guided'?current.ja:null,answer,review:null};
 busy=true;$('writingSubmit').disabled=true;
 $('writingClarification').classList.add('hide');
 $('writingStatus').textContent=intent?'選んだ意味に合わせて添削中…':'添削しています…';
 try{
   if(!prefs)throw new Error('先に「記録」からNotion同期のWorker URLと同期キーを設定してください。');
   const response=await fetch(prefs.origin+'/correct',{method:'POST',headers:{'Content-Type':'application/json','X-Sync-Key':prefs.secret},body:JSON.stringify({mode:record.mode,answer,ja:record.ja,reference:record.mode==='guided'?(prompts.find(x=>x.id===record.promptId)?.example||''):null,intent:intent||null}),cache:'no-store'});
   const body=await response.json().catch(()=>({}));
   if(!response.ok||!body.ok){
     if(response.status===422&&body.error==='revision_inconsistent')throw new Error('確認した意図と修正文が一致しないため、添削を確定しませんでした。再試行してください。');
     if(response.status===503&&body.error==='ai_not_configured')throw new Error('Cloudflare WorkerにWorkers AIの「AI」バインディングを追加してください。');
     if(response.status===401)throw new Error('同期キーを確認してください。');
     if(response.status===429)throw new Error('AIの利用上限に達した可能性があります。翌日以降にお試しください。');
     if(body.error==='ai_invalid_output')throw new Error('添削結果を読み取れませんでした。もう一度お試しください。');
     throw new Error('添削に失敗しました（'+response.status+'）。');
   }
   if(body.correctionVersion!=='3.4')throw new Error('Cloudflare Workerが旧バージョンです。最新のworker.jsをDeployしてください。');
   if(body.partial===true){
     if(body.originalEnglish!==answer||!Array.isArray(body.issues))throw new Error('添削対象の原文が一致しません。');
     showPartialReview(body,intent,record);
     $('writingStatus').textContent='文法の確認はできましたが、修正文は未確定です。必要に応じて再生成してください。';
     return;
   }
   if(!Array.isArray(body.feedback?.issues)||body.feedback?.originalEnglish!==answer)throw new Error('添削対象の原文が一致しません。');
   if(body.clarification && !intent && Array.isArray(body.clarification.options)){
     showInitialGrammar(body.feedback);
     clarificationPanel(body.clarification.question,body.clarification.options,selected=>{void check(selected,record);});
     $('writingStatus').textContent='文法の確認は完了しました。意味を選ぶと、意図に合わせた添削結果を表示します。';
     return;
   }
   record.intent=intent||'';
   record.review=body.feedback;
   enqueueWriting(record);
   feedback(body.feedback,record.intent);
   $('writingStatus').textContent='AI添削が完了しました（添削エンジン 3.4）';
 }catch(e){
   $('writingStatus').textContent=e.message;
   $('writingExample').classList.toggle('hide',record.mode!=='guided');
   if(record.mode==='guided')$('writingExampleText').textContent='参考例：'+(prompts.find(x=>x.id===record.promptId)?.example||'')+'（正解は一通りではありません）';
 }finally{
   if(record.review){if(!records.includes(record)){records.push(record);save();renderStats();}}
   busy=false;$('writingSubmit').disabled=false;
 }
}
$('writingOpen').onclick=()=>{show('writing');renderStats();};
$('writingInput').addEventListener('input',saveDraft);
$('writingTabGuided').onclick=()=>setMode('guided');
$('writingTabFree').onclick=()=>setMode('free');
$('writingCategory').onchange=e=>{category=e.target.value;next()};
$('writingNext').onclick=next;
$('writingSubmit').onclick=()=>{void check();};
$('writingExampleToggle').onclick=()=>{if(mode!=='guided')return;$('writingExampleText').textContent='参考例：'+current.example+'（別の自然な英文も正解です）';$('writingExample').classList.toggle('hide')};
$('writingCopy').onclick=()=>{const txt=records.filter(x=>x.review).slice(-30).map(x=>x.answer+'\n→ '+x.review.corrected).join('\n\n');navigator.clipboard?.writeText(txt)};
document.querySelectorAll('[data-nav="writing"]').forEach(b=>b.addEventListener('click',renderStats));
$('writingSyncNow').onclick=()=>{void flushWriting();};
window.addEventListener('online',()=>{void flushWriting();});
next();setMode('guided');renderStats();showWritingSync();
void flushWriting();
})();