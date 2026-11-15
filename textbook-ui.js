/* English Pocket textbook: structured lessons, reading progress, and quiz links. */
(function(){
  'use strict';
  const DATA=window.ENGLISH_POCKET_TEXTBOOK||[];
  const KEY='english-pocket-textbook-progress-v1';
  const el=id=>document.getElementById(id);
  const root=el('textbookContent');
  let completed={};
  try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))completed=saved;}catch(e){}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(completed));}catch(e){console.warn('Unable to save textbook progress',e)}}
  function node(tag,className,content){
    const n=document.createElement(tag);if(className)n.className=className;
    if(typeof content==='string')n.textContent=content;return n;
  }
  function add(parent,tag,cls,content){const n=node(tag,cls,content);parent.append(n);return n;}
  function button(label,onClick,cls='btn'){const n=node('button',cls,label);n.type='button';n.onclick=onClick;return n;}
  function showTextbook(){if(typeof show==='function')show('textbook');}
  function renderIndex(){
    root.replaceChildren();el('textbookTop').classList.remove('hide');
    const count=DATA.filter(x=>completed[x.id]).length;
    add(root,'p','tiny muted',DATA.length+'章・読了 '+count+'章。興味のある項目から読み始められます。');
    for(const group of [...new Set(DATA.map(x=>x.category))]){
      add(root,'h2','textbook-section-title',group);
      for(const lesson of DATA.filter(x=>x.category===group)){
        const card=node('button','textbook-list-item');card.type='button';
        const top=add(card,'span','textbook-list-top');
        add(top,'strong','',lesson.title);
        add(top,'span','tiny muted',completed[lesson.id]?'✓ 読了':lesson.level);
        add(card,'span','tiny muted',lesson.lead);
        card.onclick=()=>renderChapter(lesson.id);root.append(card);
      }
    }
  }
  function renderChapter(id){
    const lesson=DATA.find(x=>x.id===id);if(!lesson){renderIndex();return;}
    showTextbook();el('textbookTop').classList.add('hide');root.replaceChildren();
    root.append(button('← 目次へ戻る',renderIndex,'btn secondary textbook-back'));
    add(root,'div','eyebrow',lesson.category+' ・ '+lesson.level);
    add(root,'h1','textbook-title',lesson.title);
    add(root,'p','textbook-lead',lesson.lead);
    for(const section of lesson.sections){
      const item=add(root,'article','textbook-chapter card');
      add(item,'h2','textbook-heading',section.title);
      add(item,'p','textbook-body',section.body);
      for(const example of section.examples){
        const pair=add(item,'div','textbook-example');
        add(pair,'div','textbook-en',example[0]);
        add(pair,'div','textbook-ja',example[1]);
      }
    }
    const tip=add(root,'div','textbook-tip');
    add(tip,'strong','','覚えるポイント');add(tip,'p','',lesson.tips);
    const actions=add(root,'div','textbook-actions');
    actions.append(button(completed[id]?'✓ 読了済み（解除する）':'✓ この章を読了にする',()=>{
      completed[id]=!completed[id];save();renderChapter(id);
    },'btn secondary'));
    actions.append(button('関連する問題を5問解く →',()=>{
      if(typeof start==='function')start(lesson.mode);
    }));
    add(root,'p','tiny muted','※ 関連問題は現在の4分野の問題集から出題します。章ごとの専用問題は今後拡充します。');
    window.scrollTo(0,0);
  }
  el('textbookOpen').onclick=()=>{showTextbook();renderIndex();};
  document.querySelectorAll('[data-nav="textbook"]').forEach(x=>x.addEventListener('click',renderIndex));
  renderIndex();window.englishPocketTextbook={open:()=>{showTextbook();renderIndex();},chapter:renderChapter};
})();