import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../game/index.html',import.meta.url),'utf8');
const source=html.match(/<script id="game-code">([\s\S]*?)<\/script>/)[1];
function memory(raw=null){const db=new Map(raw?[['pen-spire-save-v2',raw]]:[]);return{getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,v),db};}
function boot(storage=memory()){const context=vm.createContext({console});vm.runInContext(source,context);return{...context.PenSpire,game:new context.PenSpire.Game(storage),storage};}
function renderMapHTML(map){
  const elements=new Map(),element=id=>{if(!elements.has(id))elements.set(id,{id,innerHTML:'',textContent:'',dataset:{},clientWidth:1280,addEventListener(){},focus(){},scrollIntoView(){}});return elements.get(id);};
  const document={getElementById:element,querySelectorAll:()=>[],addEventListener(){},activeElement:null};
  const context=vm.createContext({console,document,window:{localStorage:memory()},requestAnimationFrame:()=>0,cancelAnimationFrame(){},addEventListener(){},clearTimeout(){},setTimeout:()=>0,matchMedia:()=>({matches:false}),innerWidth:1280});
  vm.runInContext(source,context);assert(context.game.startRun('hero',271828));context.game.run.map=map;context.game.run.available=map[0].map(node=>node.id);context.game.run.visited=[];context.game.run.current=null;context.game.run.view='map';context.game.view='map';context.game.onChange();return elements.get('screen').innerHTML;
}
function battle(type='monster',topic='teacher',char='hero'){const x=boot();x.game.meta.wins=2;x.game.meta.hermit=true;x.game.startRun(char,123);x.game.run.current='0-0';x.game.startBattle(type,topic);return x;}
function putParagraph(x,index){const g=x.game,b=g.run.battle,t=g.topic();g.setTarget(index);b.energy=3;b.hand=t.bank.filter(s=>s.allowed.includes(index)).map((s,i)=>({id:`fixture-${index}-${i}`,type:'material',topicId:t.id,bankId:s.id,kind:s.kind,sentence:s.text,allowed:s.allowed,level:0,damageSpent:false}));for(const c of [...b.hand])assert.equal(g.play(c.id),true);}
function renderedBattle(type='monster',topic='teacher',char='hero'){
  const elements=new Map(),listeners=new Map(),element=id=>{if(!elements.has(id))elements.set(id,{id,innerHTML:'',textContent:'',dataset:{},clientWidth:1280,open:false,addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},focus(){},scrollIntoView(){}});return elements.get(id);};
  const document={getElementById:element,querySelectorAll:()=>[],addEventListener:(type,listener)=>listeners.set(type,listener),activeElement:null};
  const context=vm.createContext({console,document,window:{localStorage:memory()},requestAnimationFrame:()=>0,cancelAnimationFrame(){},addEventListener(){},clearTimeout(){},setTimeout:()=>0,matchMedia:()=>({matches:false}),innerWidth:1280});
  vm.runInContext(source,context);const game=context.game;game.meta.wins=2;game.meta.hermit=true;assert(game.startRun(char,123));game.run.current='0-0';game.startBattle(type,topic);
  return{game,elements,api:context.PenSpire,effects:context.PenSpireEffects,clickAction(action){const listener=listeners.get('click');assert.equal(typeof listener,'function','click handler registered');listener({target:{closest:selector=>selector==='button[data-action]'?{dataset:{action},disabled:false}:null}});}};
}
function cardFor(game,s,id='fixture-card'){return{id,type:'material',topicId:game.topic().id,bankId:s.id,kind:s.kind,sentence:s.text,allowed:s.allowed,level:0,damageSpent:false};}
const ATTACK_VALUES={a:6,claim:5,reason:6,example:5,effect:6,quote:5};
function paragraphAttack(game,index){return game.topic().paragraphs[index].pattern.reduce((total,kind)=>total+(ATTACK_VALUES[kind]||0),0);}
function renderedAttributes(html){return[...html.matchAll(/\b(?:aria-label|title|data-[\w-]+)\s*=\s*(["'])(.*?)\1/gs)].map(match=>match[2]);}
const normal=x=>JSON.parse(JSON.stringify(x));

test('failed submissions render an editable draft zone and settled-damage label',()=>{const x=renderedBattle('elite','teacher','hero'),g=x.game,b=g.run.battle;b.enemy.hp=b.enemy.maxHp=1000;putParagraph(x,0);const attack=b.draft.find(c=>ATTACK_VALUES[c.kind]);assert(attack,'draft fixture includes an attack');attack.allowed=[];assert.equal(g.submit(),false);assert(b.draft.some(c=>c.damageSpent));const html=x.elements.get('hand-zone').innerHTML;assert(html.includes('class="hand-group-label draft-group-label"'));assert(html.includes('上次提交沒組成段落：可撤回或補句後再提交'));assert(html.includes('傷害已算過'));assert(html.includes('class="hand-group-label hand-divider"'));assert(html.includes('id="hand-scroll" aria-label="卡牌：草稿在前，手牌在後"'));assert.equal((html.match(/class="hand-scroll"/g)||[]).length,1);});
test('empty draft hides its heading while an empty hand keeps its heading and prompt',()=>{const{game,elements}=renderedBattle();const b=game.run.battle;b.draft=[];b.hand=[];game.onChange();const html=elements.get('hand-zone').innerHTML;assert(!html.includes('class="hand-group-label draft-group-label"'));assert(html.includes('<div class="hand-group-label hand-divider"><strong>手牌</strong></div>'));assert(html.includes('<p class="empty hand-empty">可用隨手筆記補句，或結束回合補充手牌。</p>'));});
test('draft cards show draft sequence text and matching accessible names',()=>{const{game,elements}=renderedBattle();const b=game.run.battle,draft=b.hand.shift();draft.damageSpent=true;b.draft=[draft];b.hand=b.hand.slice(0,1);game.onChange();const html=elements.get('hand-zone').innerHTML;assert(html.includes('草稿第 1 句 ·'));assert(html.includes('aria-label="草稿第 1 句"'));assert.match(html,/aria-label="取消[^"]*；草稿第 1 句"/);assert(!html.includes('提交 1 ·'));assert(!html.includes('提交順序 1'));});
test('hero, tank and mage group headings do not expose writing hints',()=>{for(const char of ['hero','tank','mage']){const{game,elements,api}=renderedBattle('monster','teacher',char),b=game.run.battle,draft=b.hand.shift();b.draft=[draft];b.hand=b.hand.slice(0,1);game.onChange();const html=elements.get('hand-zone').innerHTML,headings=(html.split('<div class="hand-group-label').slice(1).map(part=>'<div class="hand-group-label'+part.slice(0,part.indexOf('</div>')+6))),headingText=headings.map(markup=>markup.replace(/<[^>]*>/g,'' )).join(' '),headingAttrs=headings.flatMap(renderedAttributes),t=game.topic(),kindNames=new Set(Object.values(api.KINDS)),privateHints=[t.genre,...t.paragraphs.map(p=>p.label).filter(label=>!kindNames.has(label))].filter(Boolean);assert.equal(headings.length,2);for(const token of privateHints){assert(!headingText.includes(token),char+': group heading leaked '+token);assert(!headingAttrs.some(value=>value.includes(token)),char+': group heading attribute leaked '+token);}}assert.match(html,/\.hand-group-label[^}]*font-size:14px/);assert.match(html,/\.hand-group-label small\{font-size:13px/);});
test('single HTML has no remote dependencies and compiles its actual embedded engine',()=>{new vm.Script(source);assert.doesNotMatch(html,/<(?:script|link)[^>]+(?:src|href)=["']https?:/i);assert.match(html,/height:100vh;height:100dvh/);assert.doesNotMatch(html,/max-width:\s*1240px/);});
test('only hero starts unlocked; purchases, clear counts and role hint descriptions are correct',()=>{const{game:g,CHARACTERS}=boot();assert.deepEqual(['hero','tank','mage','hermit','teacher'].filter(id=>g.unlocked(id)),['hero']);assert.equal(g.startRun('teacher',1),false);g.meta.wins=1;assert(g.unlocked('tank'));assert(!g.unlocked('mage'));g.meta.wins=2;assert(!g.unlocked('teacher'));g.meta.ink=30;assert(g.buyHermit());assert.equal(g.meta.ink,0);assert(g.unlocked('teacher'));assert(!g.buyHermit());assert(CHARACTERS.find(c=>c.id==='hermit').desc.includes('段落編號與句型公式'));assert(CHARACTERS.find(c=>c.id==='teacher').desc.includes('卡片提示'));});
for(const type of ['monster','elite','boss'])for(const char of ['hero','tank','mage','hermit','teacher'])test(`${char}/${type}: exact hint authority and rendered HTML`,()=>{const{game:g,elements,api}=renderedBattle(type,'teacher',char),h=g.hints(),b=g.run.battle,t=g.topic(),html=elements.get('screen').innerHTML+elements.get('hand-zone').innerHTML,attrs=renderedAttributes(html),expected=normal(type==='boss'?[]:b.required.map(i=>i+1));assert.deepEqual(normal(h.paragraphs),expected);assert.equal(b.target,type==='boss'?0:b.required[0]);if(expected.length)assert(html.includes(`弱點：${expected.map(n=>`第 ${n} 段`).join('、')}`));else assert(!html.includes('弱點：第 '));const kindNames=new Set(Object.values(api.KINDS)),cardHTML=elements.get('hand-zone').innerHTML;for(const card of g.run.battle.hand.filter(item=>item.type==='material')){const cardStart=cardHTML.indexOf('data-card-id="'+card.id+'"'),cardEnd=cardHTML.indexOf('</article>',cardStart);assert(cardStart>=0&&cardEnd>cardStart,char+'/'+type+': rendered material card missing');assert(cardHTML.slice(cardStart,cardEnd).includes('<span class="card-kind">'+api.KINDS[card.kind]),char+'/'+type+': card kind label missing for '+card.kind);}if(['hero','tank','mage'].includes(char)){assert.equal(h.genre,'');assert.equal(h.formula,'');assert.equal(h.cards.length,0);assert.deepEqual(normal(h.cardHints),{});for(const token of [t.genre,...t.paragraphs.map(p=>p.label).filter(label=>!kindNames.has(label))])assert(!attrs.some(value=>value.includes(token)),'hint leaked into attributes: '+token);assert(!html.includes(t.genre));}else if(char==='hermit'){assert.equal(h.genre,t.genre);assert(h.formula.includes('→'));assert.equal(h.cards.length,0);assert.deepEqual(normal(h.cardHints),{});assert(html.includes(t.genre));assert(html.includes(h.formula));assert(!html.includes('老師建議'));}else{assert.equal(h.genre,t.genre);assert(h.formula.includes('→'));assert(html.includes(t.genre));assert(html.includes(h.formula));assert.deepEqual(normal(Object.keys(h.cardHints).sort()),normal([...h.cards].sort()));}});
test('all five roles see sentence function names in Quick Notes',()=>{for(const char of ['hero','tank','mage','hermit','teacher']){const{game:g,elements,api,clickAction}=renderedBattle('monster','teacher',char);assert(elements.get('action-zone').innerHTML.includes('data-action="note-dialog"'));clickAction('note-dialog');assert.equal(elements.get('dialog-title').textContent,String.fromCharCode(0x96a8,0x624b,0x7b46,0x8a18,0xff1a,0x9078,0x4e00,0x53e5,0x540c,0x984c,0x53e5,0x5b50));const body=elements.get('dialog-body').innerHTML,kinds=new Set(g.topic().bank.map(sentence=>sentence.kind));for(const kind of kinds)assert(body.includes('<small>'+api.KINDS[kind]+'</small>'),char+': Quick Notes omitted '+kind);}});
for(const type of ['monster','elite','boss'])test(`teacher/${type}: marks a usable card with its sentence position`,()=>{const{game:g,elements,api}=renderedBattle(type,'teacher','teacher'),b=g.run.battle,t=g.topic(),pattern=t.paragraphs[b.target].pattern[0],sentence=t.bank.find(s=>s.kind===pattern&&s.allowed.includes(b.target)),card=cardFor(g,sentence,'hint-card');b.hand=[card];g.onChange();const h=g.hints(),html=elements.get('hand-zone').innerHTML,note=`可接在第 1 句：${api.KINDS[pattern]}`;assert.deepEqual(normal(h.cards),['hint-card']);assert.equal(h.cardHints['hint-card'],note);assert(html.includes(note));assert(html.includes('老師建議'));assert(renderedAttributes(html).some(value=>value.includes(note)));});
test('all 11 topics bind every battle card and Quick Note to the current topic',()=>{const x=battle();const g=x.game;for(const topic of x.TOPICS){g.startBattle('monster',topic.id);const b=g.run.battle;for(const c of [...b.hand,...b.draw]){assert.equal(c.topicId,topic.id);if(c.type==='material')assert(topic.bank.some(s=>s.id===c.bankId&&s.text===c.sentence));else assert(c.sentence.includes(topic.topic));}const s=topic.bank[0];assert(g.note(s.id));assert.equal(b.draft[0].topicId,topic.id);assert.equal(b.draft[0].sentence,s.text);g.endTurn();assert(g.note(topic.bank[1].id));assert.equal(b.draft.length,2);}});
test('new topics do not preserve previous sentences; upgrades survive rebinding',()=>{const{game:g}=battle();g.run.deck[0].level=2;g.startBattle('monster','pencil');assert([...g.run.battle.hand,...g.run.battle.draw].filter(c=>c.type==='material').every(c=>!c.sentence.includes('老師')));assert.equal([...g.run.battle.hand,...g.run.battle.draw].find(c=>c.id==='d0').level,2);});
test('ordinary: valid weakpoint paragraph deals full attack; another valid paragraph deals half',()=>{for(const hit of [false,true]){const x=battle(),g=x.game,b=g.run.battle,index=hit?3:0,expected=paragraphAttack(g,index);b.enemy.hp=b.enemy.maxHp=1000;b.required=[3];putParagraph(x,index);assert(g.submit());assert.equal(1000-b.enemy.hp,Math.floor(expected*(hit?1:.5)));}});
test('elite: attack values use 50/75/100 percent as required paragraphs complete',()=>{const x=battle('elite'),g=x.game,b=g.run.battle,first=paragraphAttack(g,1),second=paragraphAttack(g,3);b.enemy.hp=b.enemy.maxHp=1000;b.required=[1,3];assert.equal(g.rate(),.5);putParagraph(x,1);g.submit();assert.equal(g.rate(),.75);assert.equal(b.enemy.hp,1000-Math.floor(first*.75));putParagraph(x,3);g.submit();assert.equal(g.rate(),1);assert.equal(b.enemy.hp,1000-Math.floor(first*.75)-Math.floor(second));assert.equal(b.completed.length,2);putParagraph(x,3);assert.equal(g.submit(),false);assert.equal(b.enemy.hp,1000-Math.floor(first*.75)-Math.floor(second));assert.equal(b.completed.length,2);});
test('all nine sentence kinds resolve correctly for cards and Quick Notes',()=>{const cases=[['a','attack',6,9,0],['b','block',5,8,0],['claim','attack',5,8,0],['reason','attack',6,9,0],['example','attack',5,8,0],['step','block',5,8,0],['summary','block',4,6,1],['effect','attack',6,9,0],['quote','attack',5,8,0]];for(const[kind,type,base,upgraded,draw]of cases){const topic=boot().TOPICS.find(t=>t.bank.some(s=>s.kind===kind)),sentence=topic.bank.find(s=>s.kind===kind),x=battle('elite',topic.id),g=x.game,b=g.run.battle,card=cardFor(g,sentence,`play-${kind}`);b.required=[1,3];b.completed=[{index:1,text:'已完成'}];b.target=0;b.enemy.hp=b.enemy.maxHp=1000;b.hand=[card];assert.equal(g.value(card),base,`${kind} base`);card.level=1;assert.equal(g.value(card),upgraded,`${kind} upgrade`);card.level=0;const drawBefore=b.draw.length;assert(g.play(card.id));assert.equal(b.enemy.hp,1000);if(type==='attack'){assert.equal(b.block,0);b.draft[0].allowed=[];assert.equal(g.submit(),false);assert.equal(1000-b.enemy.hp,Math.floor(base*.75));}else{assert.equal(b.block,base);if(draw)assert.equal(drawBefore-b.draw.length,draw);}
    const noteRun=battle('elite',topic.id),ng=noteRun.game,nb=ng.run.battle,noteDraw=nb.draw.length;nb.required=[1,3];nb.completed=[{index:1,text:'已完成'}];nb.target=0;nb.enemy.hp=nb.enemy.maxHp=1000;assert(ng.note(sentence.id));assert.equal(nb.enemy.hp,1000);if(type==='attack'){assert.equal(nb.block,0);nb.draft[0].allowed=[];assert.equal(ng.submit(),false);assert.equal(1000-nb.enemy.hp,Math.floor(base*.75));}else{assert.equal(nb.block,base);if(draw)assert.equal(noteDraw-nb.draw.length,draw);}}
});
test('same-turn undo refunds block but keeps the draw marker until discard',()=>{const topic=boot().TOPICS.find(t=>t.bank.some(s=>s.kind==='summary')),x=battle('monster',topic.id),g=x.game,b=g.run.battle,s=topic.bank.find(s=>s.kind==='summary'),card=cardFor(g,s,'summary-undo');b.hand=[card];const initialDraw=b.draw.length;assert(g.play(card.id));assert.equal(b.block,4);assert.equal(initialDraw-b.draw.length,1);assert.equal(b.draft[0].drawApplied,true);assert(g.undo(card.id));assert.equal(b.energy,3);assert.equal(b.block,0);assert.equal(initialDraw-b.draw.length,1);assert(b.hand.some(c=>c.id===card.id&&c.drawApplied));assert(g.play(card.id));assert.equal(b.block,4);assert.equal(b.draw.length,initialDraw-1);assert(g.undo(card.id));assert.equal(b.block,0);assert.equal(b.energy,3);assert(g.endTurn());const discarded=b.discard.find(c=>c.id===card.id);assert(discarded);assert.equal(discarded.drawApplied,false);assert.equal(discarded.appliedBlock,0);});
test('heal tactic stays out of the starter deck, caps healing, exhausts once, and returns next battle',()=>{const x=battle(),g=x.game;assert(!g.run.deck.some(c=>c.type==='heal'));const heal={id:'heal-test',type:'heal',level:0};g.run.deck.push(heal);const findHeal=b=>{let c=b.hand.find(c=>c.id==='heal-test');if(!c){const i=b.draw.findIndex(c=>c.id==='heal-test');assert(i>=0);c=b.draw.splice(i,1)[0];b.hand.push(c);}return c;};g.run.hp=g.run.maxHp-2;g.startBattle('monster','teacher');let b=g.run.battle,c=findHeal(b);assert.equal(g.value(c),5);assert(g.play(c.id));assert.equal(g.run.hp,g.run.maxHp);assert(![...b.hand,...b.draw,...b.discard,...b.draft].some(item=>item.id==='heal-test'));assert(g.run.deck.some(item=>item.id==='heal-test'));assert.equal(g.play('heal-test'),false);g.run.deck.find(item=>item.id==='heal-test').level=1;g.run.hp=g.run.maxHp-10;g.startBattle('monster','teacher');b=g.run.battle;c=findHeal(b);assert.equal(g.value(c),8);assert(g.play(c.id));assert.equal(g.run.hp,g.run.maxHp-2);g.startBattle('monster','teacher');b=g.run.battle;assert([...b.hand,...b.draw].some(item=>item.id==='heal-test'));});
test('heal can replace one random reward choice and can be bought for 24 bookmarks',()=>{const{game:g}=battle();assert(!g.run.deck.some(c=>c.type==='heal'));g.winBattle();assert.equal(g.run.reward.length,3);assert.equal(g.run.reward.filter(type=>type==='heal').length,1);assert(g.reward('heal'));assert.equal(g.run.deck.filter(c=>c.type==='heal').length,1);g.run.view=g.view='shop';g.run.gold=100;assert(g.buy('heal'));assert.equal(g.run.gold,76);assert.equal(g.run.deck.filter(c=>c.type==='heal').length,2);assert(g.run.shopBought.includes('heal'));assert(!g.buy('heal'));assert.equal(g.run.gold,76);});
test('rendered cards label all nine effects, and heal appears in reward and shop screens',()=>{const{game:g,elements}=renderedBattle('monster','teacher','teacher'),t=g.topic(),b=g.run.battle,kinds=['a','b','claim','reason','example','step','summary','effect','quote'];b.hand=kinds.map(kind=>({id:`ui-${kind}`,type:'material',topicId:t.id,bankId:`ui-${kind}`,kind,sentence:`${t.topic} example ${kind}`,allowed:[0],level:0,damageSpent:false}));b.hand.push({id:'ui-heal',type:'heal',topicId:t.id,level:0,sentence:`先把〈${t.topic}〉的下一句想清楚。`});g.onChange();const html=elements.get('hand-zone').innerHTML;for(const label of ['攻擊 6','立即格擋 5','攻擊 5','立即格擋 4＋抽 1','回復 5 生命｜本場戰鬥耗盡'])assert(html.includes(label),label);g.run.reward=['heal','material','defend'];g.run.view=g.view='reward';g.onChange();assert(elements.get('screen').innerHTML.includes('喝口水'));assert(elements.get('screen').innerHTML.includes('回復 5 生命'));g.run.view=g.view='shop';g.onChange();assert(elements.get('screen').innerHTML.includes('喝口水'));assert(elements.get('screen').innerHTML.includes('24 書籤幣・購買'));});
test('version 2 saves preserve heal and effect markers; older version 2 saves without them still load',()=>{const x=boot(),g=x.game;assert(g.startRun('hero',271828));g.run.view=g.view='shop';g.run.gold=100;assert(g.buy('heal'));const topic=x.TOPICS.find(t=>t.bank.some(s=>s.kind==='summary'));assert(g.startBattle('monster',topic.id));const summary=topic.bank.find(s=>s.kind==='summary'),b=g.run.battle;b.hand=[cardFor(g,summary,'summary-save')];assert(g.play('summary-save'));const saved=JSON.parse(x.storage.getItem(x.SAVE_KEY));assert.equal(saved.version,2);assert(saved.run.deck.some(c=>c.type==='heal'));assert(saved.run.shopBought.includes('heal'));assert.equal(saved.run.battle.draft.find(c=>c.id==='summary-save').drawApplied,true);assert.equal(saved.run.battle.draft.find(c=>c.id==='summary-save').appliedBlock,4);const restored=new x.Game(memory(JSON.stringify(saved)));assert(restored.storageOK);assert.equal(restored.run.battle.draft.find(c=>c.id==='summary-save').drawApplied,true);assert.equal(restored.run.battle.draft.find(c=>c.id==='summary-save').appliedBlock,4);const legacy=normal(saved);legacy.run.deck=legacy.run.deck.filter(c=>c.type!=='heal');legacy.run.shopBought=legacy.run.shopBought.filter(type=>type!=='heal');for(const pile of ['hand','draw','discard','draft']){legacy.run.battle[pile]=legacy.run.battle[pile].filter(c=>c.type!=='heal');for(const card of legacy.run.battle[pile]){delete card.drawApplied;delete card.appliedBlock;}}assert.equal(legacy.version,2);assert.equal(x.validRun(legacy.run),true);assert(new x.Game(memory(JSON.stringify(legacy))).storageOK);});
test('an invalid draft cannot deal attack damage twice, and can be revised after feedback',()=>{const x=battle(),g=x.game,b=g.run.battle;b.enemy.hp=b.enemy.maxHp=1000;putParagraph(x,0);const expected=Math.floor(paragraphAttack(g,0)*.5);g.setTarget(3);assert.equal(g.submit(),false);assert.equal(b.enemy.hp,1000-expected);assert.equal(b.draft.length,3);g.submit();assert.equal(b.enemy.hp,1000-expected);g.setTarget(0);assert(g.submit());assert.equal(b.completed.length,1);assert.equal(b.draft.length,0);});
test('off-topic or wrong-paragraph sentences never complete a paragraph',()=>{const x=battle(),g=x.game,b=g.run.battle;putParagraph(x,0);b.draft[0].topicId='pencil';assert.equal(g.evaluate().valid,false);b.draft[0].topicId=g.topic().id;b.draft[0].allowed=[3];assert.equal(g.evaluate().valid,false);});
test('boss is invulnerable to bypass: only four distinct ordered paragraphs win',()=>{const x=battle('boss'),g=x.game,b=g.run.battle;for(let i=0;i<100;i++)g.damage(10000);assert.equal(b.enemy.hp,85);assert.equal(g.finish(true),false);assert.equal(g.run.status,'active');for(let i=0;i<4;i++){putParagraph(x,i);assert(g.submit());if(i<3){assert.equal(g.run.status,'active');for(let k=0;k<20;k++)g.damage(10000);assert.equal(b.enemy.hp,(3-b.phase)*28+1);}}assert.equal(b.phase,4);assert.equal(b.completed.length,4);assert.equal(g.run.status,'won');assert.equal(g.meta.wins,3);const ink=g.meta.ink;assert.equal(g.finish(true),false);assert.equal(g.meta.ink,ink);});
test('mage multiplier applies to sentence and direct attacks; hero has no bonus',()=>{for(const char of ['hero','mage']){const x=battle('monster','teacher',char),g=x.game,b=g.run.battle,expected=paragraphAttack(g,3);b.enemy.hp=b.enemy.maxHp=1000;b.required=[3];putParagraph(x,3);g.submit();assert.equal(1000-b.enemy.hp,Math.floor(expected*(char==='mage'?1.5:1)));b.completed=[{index:b.required[0],text:'完成段落'}];b.energy=3;b.hand=[{id:'direct',type:'strike',topicId:g.topic().id,level:0,sentence:'直接攻擊'}];g.play('direct');assert.equal(1000-b.enemy.hp,Math.floor(expected*(char==='mage'?1.5:1))+10*(char==='mage'?1.5:1));}assert.equal(boot().CHARACTERS.find(c=>c.id==='tank').hp,112);});
test('draft survives turns; note once per turn; undo does not refund past-turn energy',()=>{const{game:g}=battle();const s=g.topic().bank[0];assert(g.note(s.id));assert(!g.note(g.topic().bank[1].id));assert.equal(g.run.battle.energy,2);g.endTurn();assert.equal(g.run.battle.draft.length,1);const id=g.run.battle.draft[0].id;assert(g.undo(id));assert.equal(g.run.battle.energy,3);});
function randomFrom(seed){let a=seed>>>0;return()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
test('battle feedback history groups three rounds newest first and marks latest',()=>{const x=battle(),g=x.game,b=g.run.battle;b.enemy.attack=0;const card=b.hand[0];assert(g.play(card.id));assert.equal(g.submit(),false);assert(g.endTurn());assert(g.endTurn());assert.deepEqual([...new Set(g.battleLog.map(item=>item.round))],[1,2,3]);const html=g.feedbackHistoryHtml();assert(html.includes('第 3 回合'));assert(html.includes('第 2 回合'));assert(html.includes('第 1 回合'));assert(html.indexOf('第 3 回合')<html.indexOf('第 2 回合'));assert(html.indexOf('第 2 回合')<html.indexOf('第 1 回合'));assert(html.includes('最新'));const roundOne=g.battleLog.filter(item=>item.round===1);assert(roundOne[0].text!==roundOne[1].text);assert(html.indexOf(roundOne[0].text)<html.indexOf(roundOne[1].text));});
test('battle feedback deduplicates consecutive identical text within a round',()=>{const{game:g}=battle();g.notice='duplicate feedback';g.noticeType='info';g.changed();g.changed();assert.equal(g.battleLog.filter(item=>item.text==='duplicate feedback').length,1);});
test('starting another battle clears the prior battle history',()=>{const{game:g}=battle();g.notice='old battle message';g.changed();assert(g.battleLog.some(item=>item.text==='old battle message'));g.startBattle('monster','teacher');assert(!g.battleLog.some(item=>item.text==='old battle message'));assert.equal(g.battleLog.length,1);});
test('battle feedback keeps only the newest 80 entries',()=>{const{game:g}=battle();for(let i=0;i<81;i++){g.notice=`feedback-${i}`;g.changed();}assert.equal(g.battleLog.length,80);assert.equal(g.battleLog[0].text,'feedback-1');assert.equal(g.battleLog.at(-1).text,'feedback-80');});
test('feedback outside battle shows only the current notice',()=>{const{game:g}=battle();g.notice='only current notice';g.changed();g.view='shop';g.run.view='shop';g.notice='shop notice';const html=g.feedbackHistoryHtml();assert.equal(html,'<p class="notice">shop notice</p>');assert(!html.includes('第 1 回合'));assert(!html.includes('only current notice'));});
test('feedback history escapes notice markup',()=>{const{game:g}=battle();g.notice='<script>alert("x")</script>';g.changed();const html=g.feedbackHistoryHtml();assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));assert(html.includes('&quot;x&quot;'));});
test('feedback history contains no role genre or paragraph function hints',()=>{for(const char of ['hero','tank','mage']){const x=battle('monster','teacher',char),g=x.game;g.notice='Visible feedback only';g.changed();const html=g.feedbackHistoryHtml(),topic=g.topic();assert(!html.includes(topic.genre));for(const label of Object.values(x.KINDS))if(label&&!topic.paragraphs.some(paragraph=>paragraph.label===label))assert(!html.includes(label));}});
test('battle feedback log is not written to save data',()=>{const{game:g,storage}=battle();const oldMessage='memory-only battle history sentinel';g.notice=oldMessage;g.changed();const saved=storage.getItem('pen-spire-save-v2');assert(saved);assert(!saved.includes('battleLog'));assert(!saved.includes(oldMessage));assert.equal(JSON.parse(saved).run.battle.battleLog,undefined);});
test('resuming a saved battle does not backfill the old notice',()=>{const x=battle(),g=x.game;assert(g.battleLog.length);const restored=new x.Game(x.storage);assert.equal(restored.battleLog.length,0);assert(restored.resume());assert.equal(restored.battleLog.length,0);restored.changed();assert.equal(restored.battleLog.length,0);restored.notice='new feedback after resume';restored.changed();assert.equal(restored.battleLog.length,1);assert.equal(restored.battleLog[0].text,'new feedback after resume');});
function intervalMap(seed){
  const rnd=randomFrom(seed),layers=[];
  for(let f=0;f<10;f++){const count=f===9?1:f===0?2+Math.floor(rnd()*3):2+Math.floor(rnd()*4);const nodes=[];
    for(let i=0;i<count;i++){const r=rnd();const type=f===9?'boss':f===0?'monster':r<.48?'monster':r<.68?'camp':r<.84?'shop':'elite';nodes.push({id:`${f}-${i}`,floor:f,type,targets:[]});}layers.push(nodes);}
  const guarantees=[{type:'camp',from:2,to:4},{type:'shop',from:3,to:5},{type:'elite',from:4,to:6}];
  const guaranteedCount=g=>layers.slice(g.from,g.to+1).flat().filter(n=>n.type===g.type).length;
  for(const guarantee of guarantees){if(guaranteedCount(guarantee))continue;const candidates=layers.slice(guarantee.from,guarantee.to+1).flat().filter(node=>!guarantees.some(other=>other.type!==guarantee.type&&node.floor>=other.from&&node.floor<=other.to&&node.type===other.type&&guaranteedCount(other)===1));if(!candidates.length)throw Error('Map guarantee selection failed');candidates[Math.floor(rnd()*candidates.length)].type=guarantee.type;}
  function chooseIntervals(a,b){const memo=new Map();function canFinish(i,prevEnd){if(i===a)return prevEnd===b-1;const key=`${i}:${prevEnd}`;if(memo.has(key))return memo.get(key);const starts=i===0?[0]:[prevEnd,prevEnd+1];for(const s of starts){if(s<0||s>=b)continue;for(let e=s;e<=Math.min(b-1,s+2);e++){if(i===a-1&&e!==b-1)continue;if(canFinish(i+1,e)){memo.set(key,true);return true;}}}memo.set(key,false);return false;}
    const intervals=[];let prevEnd=-1;for(let i=0;i<a;i++){const choices=[];for(const s of (i===0?[0]:[prevEnd,prevEnd+1])){if(s<0||s>=b)continue;for(let e=s;e<=Math.min(b-1,s+2);e++){if(i===a-1&&e!==b-1)continue;if(canFinish(i+1,e))choices.push([s,e]);}}if(!choices.length)throw Error('Map interval selection failed');const [s,e]=choices[Math.floor(rnd()*choices.length)];intervals.push([s,e]);prevEnd=e;}return intervals;}
  for(let f=0;f<8;f++){const a=layers[f],b=layers[f+1];chooseIntervals(a.length,b.length).forEach(([s,e],i)=>{a[i].targets=b.slice(s,e+1).map(n=>n.id);});}
  layers[8].forEach(n=>{n.targets=['9-0'];});
  return layers;
}
function legacyMap(seed){const rnd=(()=>{let a=seed>>>0;return()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};})();const layers=[];for(let f=0;f<10;f++){const n=f===9?1:f===0?3:3+Math.floor(rnd()*2);const nodes=[];for(let i=0;i<n;i++){const r=rnd();const type=f===9?'boss':f===0?'monster':r<.48?'monster':r<.68?'camp':r<.84?'shop':'elite';nodes.push({id:`${f}-${i}`,floor:f,type,targets:[]});}layers.push(nodes);}layers[2][0].type='camp';layers[3][1].type='shop';layers[5][0].type='elite';for(let f=0;f<9;f++){const a=layers[f],b=layers[f+1];a.forEach((n,i)=>{const j=Math.min(b.length-1,Math.floor(i*b.length/a.length));n.targets.push(b[j].id);if(b.length>1){const k=Math.min(b.length-1,j+1);if(k!==j)n.targets.push(b[k].id);}});b.forEach((n,j)=>{if(!a.some(x=>x.targets.includes(n.id)))a[Math.min(a.length-1,Math.floor(j*a.length/b.length))].targets.push(n.id);});}return layers;}
test('seeded maps use adjacent hexes, stay connected, and keep guaranteed locations',()=>{
  const{generateMap}=boot(),signatures=new Set();
  for(let seed=1;seed<=2000;seed++){
    const map=generateMap(seed);assert.equal(map.length,10);
    if(seed<=30){assert.deepEqual(normal(map),normal(generateMap(seed)));signatures.add(JSON.stringify(map));}
    assert.equal(map.slice(0,9).every(layer=>layer.map(node=>node.col).join(',')==='1,2,3'),false,`seed ${seed} fell back to the fixed layout`);
    assert.equal(map[0].length>=2&&map[0].length<=4,true);assert(map[0].every(n=>n.type==='monster'));
    assert.equal(map[9].length,1);assert.equal(JSON.stringify(normal(map[9][0])),JSON.stringify({id:'9-0',floor:9,col:2,type:'boss',targets:[]}));
    for(let floor=0;floor<=8;floor++){
      const layer=map[floor],cols=layer.map(n=>n.col);assert(layer.length>=(floor===0?2:2)&&layer.length<=(floor===0?4:5));
      assert(cols.every(col=>Number.isInteger(col)&&col>=0&&col<=4));assert.equal(JSON.stringify(cols),JSON.stringify([...new Set(cols)].sort((a,b)=>a-b)));
      layer.forEach((node,index)=>{assert.equal(node.floor,floor);assert.equal(node.id,`${floor}-${index}`);});
    }
    const reached=new Set(map[0].map(n=>n.id));
    for(let floor=0;floor<8;floor++){
      const lower=map[floor],upper=map[floor+1],incoming=new Set();
      for(const node of lower){assert(reached.has(node.id));const adjacent=floor%2===0?[node.col-1,node.col]:[node.col,node.col+1];const expected=upper.filter(n=>adjacent.includes(n.col)).map(n=>n.id);assert.deepEqual(node.targets,expected);assert(node.targets.length>0);for(const id of node.targets){incoming.add(id);reached.add(id);}}
      assert(upper.every(n=>incoming.has(n.id)));
    }
    for(const node of map[8])assert.equal(JSON.stringify(node.targets),'["9-0"]');
    assert(map.slice(2,5).flat().some(n=>n.type==='camp'));assert(map.slice(3,6).flat().some(n=>n.type==='shop'));assert(map.slice(4,7).flat().some(n=>n.type==='elite'));
  }
  assert.equal(signatures.size,30);
});
test('mapReach matches exhaustive target traversal and identifies unreachable nodes',()=>{
  const{generateMap,mapReach}=boot(),map=generateMap(271828),run={map,current:map[2][0].id,available:[...map[2][0].targets],visited:[map[0][0].id,map[1][0].id]};
  const reach=mapReach(run),next=new Set(reach.next),ahead=new Set(reach.ahead),passed=new Set(reach.passed),expected=new Set(),queue=[...run.available];
  while(queue.length){const id=queue.shift();for(const node of map.flat())if(node.id===id)for(const target of node.targets)if(!next.has(target)&&!expected.has(target)){expected.add(target);queue.push(target);}}
  assert.deepEqual([...ahead].sort(),[...expected].sort());assert.deepEqual([...next].sort(),[...run.available].sort());assert.deepEqual([...passed].sort(),[...run.visited].sort());
  const unreachable=new Set(reach.unreachable);assert(map.flat().some(node=>unreachable.has(node.id)));
  for(const node of map.flat())assert.equal(unreachable.has(node.id),!next.has(node.id)&&!ahead.has(node.id)&&!passed.has(node.id));
  const initial=mapReach({map,current:null,available:map[0].map(n=>n.id),visited:[]});assert.deepEqual([...initial.next].sort(),[...map[0].map(n=>n.id)].sort());
});
test('renderMap smoke test renders hex and legacy square maps without throwing',()=>{
  const hex=boot().generateMap(271828),legacy=intervalMap(1234);
  for(const [map,isHex] of [[hex,true],[legacy,false]]){const output=renderMapHTML(map);for(const node of map.flat())assert(output.includes(`id="node-${node.id}"`),`missing rendered node ${node.id}`);assert.equal(output.includes('class="node hex-node'),isHex);if(isHex)assert.match(output,/class="node hex-node boss-band /);}
});
test('new hex maps persist and reload without changing version 2 progress',()=>{
  const x=boot(),seed=Array.from({length:2000},(_,i)=>i+1).find(s=>x.generateMap(s).some(layer=>layer.length===5));assert.notEqual(seed,undefined);assert(x.game.startRun('hero',seed));
  const expected=normal(x.game.run),raw=x.storage.getItem(x.SAVE_KEY);assert(raw);assert.equal(JSON.parse(raw).version,2);const restored=new x.Game(memory(raw));assert(restored.storageOK);assert.equal(x.validRun(restored.run),true);assert.deepEqual(normal(restored.run),expected);assert.deepEqual(normal(restored.run.map),expected.map);
});
test('version 2 saves with legacy and interval maps remain valid and unchanged; invalid cols fail closed',()=>{
  const x=boot();for(const oldMap of [legacyMap(1234),intervalMap(1234)]){assert(x.game.startRun('hero',1234));x.game.run.map=oldMap;x.game.run.available=oldMap[0].map(n=>n.id);assert(x.game.save());const raw=x.storage.getItem(x.SAVE_KEY),saved=JSON.parse(raw),expected=normal(saved.run);assert.equal(saved.version,2);assert.equal(x.validRun(saved.run),true);const restored=new x.Game(memory(raw));assert(restored.storageOK);assert.deepEqual(normal(restored.run),expected);assert.deepEqual(normal(restored.run.map),normal(oldMap));}
  assert(x.game.startRun('hero',55));for(const bad of [5,-1,1.5]){const candidate=normal(x.game.run);candidate.map[0][0].col=bad;assert.equal(x.validRun(candidate),false);}const legacy=normal(x.game.run);delete legacy.map[0][0].col;assert.equal(x.validRun(legacy),true);
});

test('cannot skip a node or escape battle into the next route',()=>{const{game:g}=boot();g.startRun('hero',3);assert.equal(g.enterNode('1-0'),false);assert(g.enterNode(g.run.available[0]));assert.equal(g.completeNode(),false);assert.equal(g.run.available.length,0);});
test('camp upgrades/removes the selected card and enforces ten-card minimum',()=>{const{game:g}=battle();g.run.view=g.view='camp';const id=g.run.deck[4].id;assert(g.camp('upgrade',id));assert.equal(g.run.deck.find(c=>c.id===id).level,1);assert.equal(g.run.deck[0].level,0);g.run.view=g.view='camp';assert(g.camp('remove',id));assert(!g.run.deck.some(c=>c.id===id));g.run.view=g.view='camp';assert(g.camp('remove',g.run.deck[0].id));g.run.view=g.view='camp';assert(!g.camp('remove',g.run.deck[0].id));assert.equal(g.run.deck.length,10);});
test('shop item is applied once and highlighter really discounts the first material each turn',()=>{const{game:g}=battle();g.run.view=g.view='shop';g.run.gold=100;assert(g.buy('highlighter'));assert.equal(g.run.gold,55);assert(!g.buy('highlighter'));g.startBattle('monster','teacher');const b=g.run.battle;const mats=[...b.hand,...b.draw].filter(c=>c.type==='material');b.hand=mats.slice(0,2);const first=b.hand[0].id;assert.equal(g.cost(b.hand[0]),0);g.play(first);assert.equal(b.energy,3);assert.equal(g.cost(b.hand[0]),1);g.endTurn();assert.equal(b.firstMaterial,false);});
test('local snapshot restores actual battle and unlocked progress',()=>{const x=battle('elite','reading','teacher'),g=x.game;g.meta.ink=77;g.note(g.topic().bank[0].id);const restored=new x.Game(x.storage);assert(restored.storageOK);assert.equal(restored.meta.ink,77);assert(restored.unlocked('teacher'));assert.equal(restored.run.battle.topicId,'reading');assert.equal(restored.run.battle.draft[0].sentence,g.run.battle.draft[0].sentence);assert(restored.resume());assert.equal(restored.view,'battle');});
test('malformed save and storage denial fail without overwriting the original',()=>{const storage=memory('{bad-json'),x=boot(storage);assert.equal(x.game.storageOK,false);x.game.startRun('hero',10);assert.equal(storage.getItem(x.SAVE_KEY),'{bad-json');const denied={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};assert.equal(boot(denied).game.storageOK,false);});
test('native format practice uses 5/3/3 parts; first-clear ink cannot be farmed',()=>{const{game:g,PRACTICES}=boot();assert.equal(PRACTICES.find(p=>p.id==='letter-practice').parts.length,5);assert.equal(PRACTICES.find(p=>p.id==='report-practice').parts.length,3);assert.equal(PRACTICES.find(p=>p.id==='poem-practice').parts.length,3);for(const p of PRACTICES){g.startPractice(p.id);for(let i=0;i<p.parts.length;i++)assert(g.practicePick(i));assert(g.practiceSubmit());const ink=g.meta.ink;g.practiceReset();for(let i=0;i<p.parts.length;i++)g.practicePick(i);g.practiceSubmit();assert.equal(g.meta.ink,ink);}assert.equal(g.meta.ink,20);});
test('25-course ledger and layout constraints exist; layout is not falsely browser-verified',()=>{const ledger=fs.readFileSync(new URL('../course-coverage.md',import.meta.url),'utf8');assert.equal((ledger.match(/^\| g[3456]-/gm)||[]).length,25);const layout=JSON.parse(fs.readFileSync(new URL('../layout-plan.json',import.meta.url),'utf8'));assert.equal(layout.viewport_profiles.length,7);assert(!layout.relations.some(r=>r.result==='error'));assert(['ready','verified'].includes(layout.status));if(layout.status==='ready')assert.equal(layout.verification.status,'not_run');});
test('damaged card metadata is rejected without overwriting a recoverable original save',()=>{const x=battle();const raw=JSON.parse(x.storage.getItem(x.SAVE_KEY));const c=[...raw.run.battle.hand,...raw.run.battle.draw].find(c=>c.type==='material');delete c.allowed;const original=JSON.stringify(raw),store=memory(original),restored=new x.Game(store);assert.equal(restored.storageOK,false);restored.startRun('hero',9);assert.equal(store.getItem(x.SAVE_KEY),original);});
test('full deck shop purchase does not deduct gold or consume the offer',()=>{const{game:g}=battle();g.run.view=g.view='shop';while(g.run.deck.length<80)g.run.deck.push({id:'full-'+g.run.deck.length,type:'material',level:0});const gold=g.run.gold;assert(!g.buy('material'));assert.equal(g.run.gold,gold);assert(!g.run.shopBought.includes('material'));});
for(const topic of boot().TOPICS)test(`all four ${topic.id} paragraphs can complete the actual boss`,()=>{const x=battle('boss',topic.id);for(let i=0;i<4;i++){putParagraph(x,i);assert(x.game.submit());}assert.equal(x.game.run.status,'won');assert.equal(x.game.run.archive.at(-1).paragraphs.length,4);});
test('elite partial/full breaks scale only unspent attacks in invalid drafts',()=>{for(const hits of [1,2]){const x=battle('elite'),g=x.game,b=g.run.battle;b.required=[1,3];b.enemy.hp=b.enemy.maxHp=1000;putParagraph(x,1);g.submit();if(hits===2){putParagraph(x,3);g.submit();}putParagraph(x,0);g.setTarget(2);const before=b.enemy.hp,expected=Math.floor(paragraphAttack(g,0)*(hits===1?.75:1));assert.equal(g.submit(),false);assert.equal(before-b.enemy.hp,expected);const after=b.enemy.hp;g.submit();assert.equal(b.enemy.hp,after);}});

test('sorting selected cards changes the actual submitted sentence order without energy or damage mutation',()=>{const x=battle('boss'),g=x.game,b=g.run.battle;putParagraph(x,0);const ids=b.draft.map(c=>c.id),energy=b.energy,hp=b.enemy.hp;assert(g.reorder('draft',ids[0],2));assert.equal(b.draft[2].id,ids[0]);assert(!g.evaluate().valid);assert.equal(b.energy,energy);assert.equal(b.enemy.hp,hp);assert(g.reorder('draft',ids[0],0));const text=b.draft.map(c=>c.sentence).join('');assert(g.submit());assert.equal(b.completed[0].text,text);});
test('sorting at zero energy preserves all card metadata and works in both pools',()=>{const x=battle(),g=x.game,b=g.run.battle;putParagraph(x,0);b.draft[0].damageSpent=true;b.energy=0;const cards=normal(b.draft),before=b.enemy.hp;assert(g.reorder('draft',cards[0].id,2));for(const c of b.draft)assert.deepEqual(normal(c),cards.find(x=>x.id===c.id));assert.equal(b.energy,0);assert.equal(b.enemy.hp,before);g.endTurn();b.energy=0;const hand=normal(b.hand);assert(g.reorder('hand',hand[0].id,hand.length-1));assert.equal(b.hand.at(-1).id,hand[0].id);assert.equal(b.energy,0);});
test('invalid sorting destinations, ids, pools and no-op moves leave both arrays unchanged',()=>{const{game:g}=battle(),b=g.run.battle;const before=normal(b),id=b.hand[0].id;for(const [pool,key,pos]of [['hand',id,-1],['hand',id,10],['hand',id,0.1],['hand','missing',1],['draft',id,0],['draw',id,1],['hand',id,0],['__proto__',id,0]])assert.equal(g.reorder(pool,key,pos),false);assert.deepEqual(normal(b),before);g.menu();assert.equal(g.reorder('hand',id,1),false);});
test('a repeated or cancelled reorder cannot charge energy or duplicate cards',()=>{const x=battle(),g=x.game,b=g.run.battle;putParagraph(x,0);const id=b.draft[0].id,energy=b.energy;assert(g.reorder('draft',id,2));for(let i=0;i<10;i++)assert(!g.reorder('draft',id,2));assert.equal(b.draft.length,3);assert.equal(new Set(b.draft.map(c=>c.id)).size,3);assert.equal(b.energy,energy);});
test('sorting spent invalid draft never resets attack accounting',()=>{const x=battle('elite'),g=x.game,b=g.run.battle;b.enemy.hp=b.enemy.maxHp=1000;putParagraph(x,0);g.setTarget(1);assert(!g.submit());const hp=b.enemy.hp,attacks=b.draft.filter(c=>ATTACK_VALUES[c.kind]);assert(attacks.length>0);assert(attacks.every(c=>c.damageSpent));g.reorder('draft',b.draft[0].id,2);g.submit();assert.equal(b.enemy.hp,hp);assert(attacks.every(c=>c.damageSpent));});
test('sorting preserves current-turn refunds, previous-turn no-refund and hand cap',()=>{const x=battle('boss'),g=x.game,b=g.run.battle;putParagraph(x,0);g.reorder('draft',b.draft[0].id,2);const id=b.draft[0].id,energy=b.energy;assert(g.undo(id));assert.equal(b.energy,energy+1);g.endTurn();const old=b.draft[0].id;g.reorder('draft',old,1);const nextEnergy=b.energy;assert(g.undo(old));assert.equal(b.energy,nextEnergy);while(b.hand.length<10)b.hand.push({...b.hand[0],id:'cap-'+b.hand.length});const selected=b.draft[0].id,snapshot=normal(b.draft);assert(!g.undo(selected));assert.deepEqual(normal(b.draft),snapshot);});
test('selected notes participate in order and refund once without creating a deck card',()=>{const x=battle('boss'),g=x.game,b=g.run.battle;putParagraph(x,0);b.draft.pop();b.energy=1;const s=g.topic().bank.find(s=>!b.draft.some(c=>c.bankId===s.id));assert(g.note(s.id));const note=b.draft.at(-1),hand=b.hand.length;assert(g.reorder('draft',note.id,0));assert(g.undo(note.id));assert.equal(b.energy,1);assert.equal(b.hand.length,hand);assert(!g.undo(note.id));});
test('sorted arrays and metadata survive saving and reload using existing version 2',()=>{const x=battle('boss'),g=x.game,b=g.run.battle;putParagraph(x,0);b.draft[0].damageSpent=true;g.reorder('draft',b.draft[0].id,2);g.endTurn();g.reorder('hand',b.hand[0].id,3);const snapshot=normal(b),restored=new x.Game(x.storage);assert(restored.storageOK);assert.deepEqual(normal(restored.run.battle),snapshot);assert.equal(JSON.parse(x.storage.getItem(x.SAVE_KEY)).version,2);});
test('weakness counters use 1/2/4 denominators and exclude other valid paragraphs',()=>{for(const [type,total]of [['monster',1],['elite',2],['boss',4]]){const{game:g}=battle(type),b=g.run.battle;b.required=type==='boss'?[0,1,2,3]:type==='elite'?[1,3]:[1];assert.deepEqual(normal(g.weaknessProgress()),{completed:0,total});b.completed=[{index:0,text:'valid nonweakpoint'}];assert.equal(g.weaknessProgress().completed,type==='boss'?1:0);b.completed.push({index:1,text:'weakpoint'});assert.equal(g.weaknessProgress().completed,type==='boss'?2:1);}});
test('combat effect notifications are optional and actual hp change is settled once',()=>{const{game:g}=battle('boss'),b=g.run.battle;const effects=[];g.onCombatEffect=(side,amount)=>effects.push({side,amount});g.damage(999);assert.equal(b.enemy.hp,85);assert.deepEqual(effects,[{side:'hero',amount:27}]);g.damage(999);assert.equal(b.enemy.hp,85);assert.equal(effects.at(-1).amount,0);const hp=g.run.hp;g.endTurn();assert.equal(g.run.hp,hp-b.enemy.attack);assert.equal(effects.at(-1).side,'monster');});
test('legacy battle snapshot loads with no new sorting fields or animation state',()=>{const x=battle('elite','reading');const raw=JSON.parse(x.storage.getItem(x.SAVE_KEY));assert.equal(raw.version,2);const restore=new x.Game(memory(JSON.stringify(raw)));assert(restore.storageOK);assert(restore.resume());assert(restore.reorder('hand',restore.run.battle.hand[0].id,1));assert.equal(restore.run.battle.topicId,'reading');});

test('B 像素資料保留試做畫格與調色盤',()=>{
  const{PIXEL_ART:art}=boot();assert.deepEqual(normal(art.palette),{o:'#071219',d:'#29404a',s:'#f2ba89',h:'#899a94',r:'#8bdbc1',t:'#efc779',b:'#d3e6dc',n:'#101c24',w:'#edf0df'});
  const expected={hero:{idle:4,cast:4,hurt:2,ko:3,win:2},slime:{idle:2,hurt:1},fx:{hit:5,block:3}},allowed=new Set(['.',...Object.keys(art.palette)]),heroAllowed=new Set(['.',...Object.keys(art.heroPalette)]);
  for(const[group,poses]of Object.entries(expected))for(const[pose,count]of Object.entries(poses)){assert.equal(art[group][pose].length,count,group+' '+pose+' frame count');for(const frame of art[group][pose]){assert.equal(frame.length,32);for(const row of frame){assert.equal(row.length,32);for(const key of row)assert((group==='hero'?heroAllowed:allowed).has(key),'unexpected pixel key '+key);}}}
  const svg=art.svg(art.hero.idle[0],4,art.heroPalette);assert.match(svg,/viewBox="0 0 32 32"/);assert.match(svg,/shape-rendering="crispEdges"/);assert.match(svg,/width="128" height="128"/);assert.match(svg,/<rect /);assert(!svg.includes('<canvas'));
});

test('五角色與七種怪物都使用自己的像素 SVG 素材',()=>{
  const actor=(markup,id)=>{const at=markup.indexOf('id="'+id+'"');assert(at>=0,id+' exists');const start=markup.lastIndexOf('<div',at),end=markup.indexOf('</div>',at);return markup.slice(start,end+6);};
  for(const char of ['hero','tank','mage','hermit','teacher']){const x=renderedBattle('monster','teacher',char),hero=actor(x.elements.get('screen').innerHTML,'hero-actor');assert.match(hero,/role="img" aria-label="[^"]*圖像預留"/);assert.match(hero,/viewBox="0 0 32 32"/);assert.match(hero,/shape-rendering="crispEdges"/);assert.doesNotMatch(hero,/viewBox="0 0 100 130"/);for(const pose of ['idle','cast','hurt','ko','win'])assert(hero.includes('data-pixel-pose="'+pose+'"'),char+' missing '+pose);}
  for(const type of ['monster','elite','boss']){const x=renderedBattle(type,'teacher','hero'),api=x.api,enemy=actor(x.elements.get('screen').innerHTML,'enemy-actor'),id=api.monsterIdForBattle(x.game.run.battle);assert.match(enemy,new RegExp('data-monster-id="'+id+'"'));assert.match(enemy,/role="img" aria-label="[^"]*圖像預留"/);assert.match(enemy,/viewBox="0 0 32 32"/);assert.match(enemy,/shape-rendering="crispEdges"/);assert.doesNotMatch(enemy,/viewBox="0 0 140 130"/);for(const pose of ['idle','attack','hurt','ko'])assert(enemy.includes('data-pixel-pose="'+pose+'"'),type+' missing '+pose);}
});
test('像素動畫只在允許動態的區塊，戰場特效不攔截指標',()=>{
  const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];assert.match(css,/\.battle-fx\{[^}]*pointer-events:none/);assert.match(css,/\.battle-pixel-hit\{left:85\.5%;transform:translateX\(-50%\);/);assert.match(css,/@media\(max-width:849px\)\{\.battle-pixel-hit\{left:86\.5%\}\.battle-pixel-block\{left:13\.5%\}\}/);const ranges=[];let cursor=0;while(true){const start=css.indexOf('@media(prefers-reduced-motion:no-preference){',cursor);if(start<0)break;const open=css.indexOf('{',start);let depth=0,end=-1;for(let i=open;i<css.length;i++){if(css[i]==='{')depth++;else if(css[i]==='}'&&--depth===0){end=i+1;break;}}assert(end>start);ranges.push([start,end]);cursor=end;}const animations=[...css.matchAll(/animation(?:-[a-z-]+)?\s*:/g)];assert(animations.length>0);for(const match of animations)assert(ranges.some(([start,end])=>match.index>=start&&match.index<end),'animation outside no-preference media');assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{[^}]*pixel-pose/);
});

function renderedBattleWithReducedMotion(){
  const elements=new Map(),listeners=new Map(),element=id=>{if(!elements.has(id))elements.set(id,{id,innerHTML:'',textContent:'',dataset:{},clientWidth:1280,open:false,addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},focus(){},scrollIntoView(){}});return elements.get(id);};const document={getElementById:element,querySelectorAll:()=>[],addEventListener:(type,listener)=>listeners.set(type,listener),activeElement:null};const context=vm.createContext({console,document,window:{localStorage:memory()},requestAnimationFrame:()=>0,cancelAnimationFrame(){},addEventListener(){},clearTimeout(){},setTimeout:()=>0,matchMedia:query=>({matches:query.includes('prefers-reduced-motion: reduce')}),innerWidth:1280});vm.runInContext(source,context);const game=context.game;game.meta.wins=2;game.meta.hermit=true;assert(game.startRun('hero',123));game.run.current='0-0';game.startBattle('monster','teacher');return{game,elements,effects:context.PenSpireEffects};
}

test('格擋特效播放時勇者維持存在的像素姿勢',()=>{
  const elements=new Map(),element=id=>{if(!elements.has(id))elements.set(id,{id,innerHTML:'',textContent:'',dataset:{},clientWidth:1280,open:false,addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},focus(){},scrollIntoView(){}});return elements.get(id);};
  const document={getElementById:element,querySelectorAll:()=>[],addEventListener(){},activeElement:null};
  const context=vm.createContext({console,document,window:{localStorage:memory()},requestAnimationFrame:()=>0,cancelAnimationFrame(){},addEventListener(){},clearTimeout(){},setTimeout:()=>0,matchMedia:()=>({matches:false}),innerWidth:1280});
  vm.runInContext(source,context);const game=context.game;game.meta.wins=2;game.meta.hermit=true;assert(game.startRun('hero',123));game.run.current='0-0';game.startBattle('monster','teacher');
  assert.equal(context.PenSpireEffects.play('block',5),true);
  const pose=elements.get('hero-actor').dataset.pose;
  assert.notEqual(pose,'block');
  assert(Object.keys(context.PenSpire.PIXEL_ART.hero).includes(pose),'hero pose must exist in PIXEL_ART');
  assert.equal(elements.get('battle-fx').dataset.active,'block');
  context.PenSpireEffects.cancel();
});

test('減少動態時切換靜止出招與受擊姿勢並只顯示靜止畫格',()=>{const x=renderedBattleWithReducedMotion();assert(x.effects.play('hero',9));assert.equal(x.elements.get('hero-actor').dataset.pose,'cast');assert.equal(x.elements.get('enemy-actor').dataset.pose,'hurt');assert.match(x.elements.get('battle-fx').innerHTML,/battle-pixel-hit/);assert.equal(x.elements.get('battle-fx').dataset.active,'hero');x.effects.cancel();assert.equal(x.elements.get('hero-actor').dataset.pose,'idle');});

test('素材與防禦牌的格擋通知不改變格擋數值',()=>{const x=battle(),g=x.game,b=g.run.battle,events=[];g.onCombatEffect=(side,amount)=>events.push([side,amount]);for(const kind of ['b','step','summary']){const card={type:'material',kind,level:0,drawApplied:true},before=b.block,expected=g.value(card),count=events.length;g.applyMaterialEffect(card);assert.equal(b.block,before+expected);assert.deepEqual(events.slice(count),[['block',expected]]);}const defend={id:'fixture-defend-notification',type:'defend',level:1};b.hand.push(defend);const before=b.block,expected=g.value(defend),count=events.length;assert(g.play(defend.id));assert.equal(b.block,before+expected);assert.deepEqual(events.slice(count),[['block',expected]]);});

test('戰鬥通知回呼有無接入時結算結果一致',()=>{const playSequence=withCallback=>{const x=battle('monster','teacher','hero'),g=x.game;if(withCallback)g.onCombatEffect=()=>{};putParagraph(x,0);g.submit();const afterSubmit={enemyHp:g.run.battle.enemy.hp,hp:g.run.hp,block:g.run.battle.block};g.endTurn();return{afterSubmit,enemyHp:g.run.battle.enemy.hp,hp:g.run.hp,block:g.run.battle.block};};assert.deepEqual(playSequence(false),playSequence(true));});


function matchingMaterialCards(cards,topic,index,count=topic.paragraphs[index].pattern.length){
  const used=new Set(),matches=[];
  for(const kind of topic.paragraphs[index].pattern.slice(0,count)){
    const card=cards.find(c=>c.kind===kind&&c.allowed.includes(index)&&!used.has(c.sentence));
    if(!card)return null;
    used.add(card.sentence);matches.push(card);
  }
  return matches;
}
function seededBattle(game,type,topicId,seed){assert(game.startRun('hero',seed));assert(game.startBattle(type,topicId));return game.run.battle;}
function materialCards(battle){return[...battle.hand,...battle.draw].filter(card=>card.type==='material');}

test('11 個題目的普通怪與菁英怪都能湊出每個弱點段落（種子 1～40）',()=>{
  const{game,TOPICS}=boot();game.meta.wins=2;
  for(const topic of TOPICS)for(const type of ['monster','elite'])for(let seed=1;seed<=40;seed++){
    const b=seededBattle(game,type,topic.id,seed),cards=materialCards(b);
    for(const index of b.required)assert(matchingMaterialCards(cards,topic,index),topic.id+'/'+type+'/seed '+seed+'/paragraph '+index);
  }
});

test('頭目起始牌組必含前兩段與第三段前兩位句子（種子 1～40）',()=>{
  const{game,TOPICS}=boot();game.meta.wins=2;
  for(const topic of TOPICS)for(let seed=1;seed<=40;seed++){
    const b=seededBattle(game,'boss',topic.id,seed),cards=materialCards(b);
    assert.equal(cards.length,8,topic.id+'/seed '+seed+': starting materials');
    assert(matchingMaterialCards(cards,topic,0),topic.id+'/seed '+seed+'/paragraph 0');
    assert(matchingMaterialCards(cards,topic,1),topic.id+'/seed '+seed+'/paragraph 1');
    assert(matchingMaterialCards(cards,topic,2,2),topic.id+'/seed '+seed+'/paragraph 2 prefix');
  }
});

test('素材牌只有兩張時仍按弱點句型前兩位分配',()=>{
  const x=battle('monster','brave','hero'),g=x.game,run=g.run;
  const materials=run.deck.filter(card=>card.type==='material').slice(0,2),tactics=run.deck.filter(card=>card.type!=='material');
  assert.equal(materials.length,2);assert(tactics.length>0);
  run.deck=[...materials,...Array.from({length:8},(_,i)=>({...tactics[i%tactics.length],id:'fixture-tactic-'+i}))];
  assert(g.startBattle('monster','brave'));
  const b=run.battle,topic=g.topic(),index=b.required[0],cards=materialCards(b);
  assert.equal(cards.length,2);
  assert.deepEqual(normal(cards.map(card=>card.kind)),normal(topic.paragraphs[index].pattern.slice(0,2)));
  assert(cards.every(card=>card.allowed.includes(index)));
});

test('素材牌數不超過題庫時 bankId 不重複',()=>{
  const{game,TOPICS}=boot();game.meta.wins=2;
  for(let i=0;i<TOPICS.length;i++){
    const topic=TOPICS[i],b=seededBattle(game,'monster',topic.id,i+1),cards=materialCards(b);
    assert(cards.length<=topic.bank.length,topic.id);
    assert.equal(new Set(cards.map(card=>card.bankId)).size,cards.length,topic.id);
  }
});

test('brave 普通怪可只用牌組句子完成弱點段落，不呼叫隨手筆記',()=>{
  const x=battle('monster','brave','hero'),g=x.game,b=g.run.battle,topic=g.topic(),index=b.required[0];
  const all=[...b.hand,...b.draw],selected=matchingMaterialCards(materialCards(b),topic,index);
  assert(selected,'牌組中應有完整弱點段落');
  const selectedIds=new Set(selected.map(card=>card.id));b.hand=[...selected];b.draw=all.filter(card=>!selectedIds.has(card.id));
  let noteCalls=0;const originalNote=g.note;g.note=function(...args){noteCalls++;return originalNote.apply(this,args);};
  g.setTarget(index);
  for(const card of selected)assert.equal(g.play(card.id),true,'出牌 '+card.id);
  assert.equal(g.submit(),true);
  assert.equal(noteCalls,0);
  assert(b.completed.some(paragraph=>paragraph.index===index));
});
test('草稿三句時擋住素材牌且戰術牌仍可使用',()=>{
  const x=battle(),g=x.game,b=g.run.battle,t=g.topic();
  const draft=t.bank.slice(0,3).map((s,i)=>({...cardFor(g,s,'draft-limit-'+i),paidCost:1,playedRound:b.round,appliedBlock:0,drawApplied:false}));
  const material=cardFor(g,t.bank[3],'draft-limit-fourth'),tactic=g.run.deck.find(c=>c.type==='defend');
  assert(tactic,'牌組含有防禦戰術牌');
  b.draft=draft;b.hand=[material,tactic];b.draw=b.draw.filter(c=>c.id!==tactic.id);b.discard=b.discard.filter(c=>c.id!==tactic.id);b.energy=3;
  const before={energy:b.energy,hand:normal(b.hand),draft:normal(b.draft)};
  assert.equal(g.play(material.id),false);
  assert.equal(b.energy,before.energy);
  assert.deepEqual(normal(b.hand),before.hand);
  assert.deepEqual(normal(b.draft),before.draft);
  assert(g.notice.includes('草稿已滿'));
  assert.equal(g.play(tactic.id),true);
  assert.equal(b.draft.length,3);
  assert(!b.hand.some(c=>c.id===tactic.id));
});

test('草稿三句時隨手筆記不消耗次數或能量',()=>{
  const x=battle(),g=x.game,b=g.run.battle,t=g.topic();
  b.draft=t.bank.slice(0,3).map((s,i)=>({...cardFor(g,s,'draft-limit-note-'+i),paidCost:1,playedRound:b.round,appliedBlock:0,drawApplied:false}));
  b.energy=2;
  const sentence=t.bank.find(s=>!b.draft.some(c=>c.bankId===s.id));
  assert(sentence);
  assert.equal(g.note(sentence.id),false);
  assert.equal(b.noteUsed,false);
  assert.equal(b.energy,2);
});

test('戰鬥畫面顯示三句上限並鎖住第四張素材牌',()=>{
  const x=renderedBattle(),g=x.game,b=g.run.battle,t=g.topic();
  b.draft=t.bank.slice(0,3).map((s,i)=>({...cardFor(g,s,'draft-limit-render-'+i),paidCost:1,playedRound:b.round,appliedBlock:0,drawApplied:false}));
  const locked=cardFor(g,t.bank[3],'draft-limit-locked');
  b.hand=[locked];b.energy=3;g.onChange();
  const screen=x.elements.get('screen').innerHTML,hand=x.elements.get('hand-zone').innerHTML,index=hand.indexOf('data-card-id="draft-limit-locked"'),end=hand.indexOf('</article>',index);
  assert(hand.includes('已選 3/3 句'));
  assert(index>=0&&end>index);
  const card=hand.slice(index,end);
  assert(card.includes('aria-disabled="true"'));
  assert(card.includes('已選三句'));
  assert(!hand.includes('/6 句'));
  assert(!hand.includes('已選六句'));
});

test('五句舊存檔仍可載入但加句要等撤回至兩句',()=>{
  const x=battle(),g=x.game,b=g.run.battle,t=g.topic();
  b.draft=t.bank.slice(0,5).map((s,i)=>({...cardFor(g,s,'draft-limit-old-'+i),paidCost:1,playedRound:b.round,appliedBlock:0,drawApplied:false}));
  assert(g.save());
  const restored=new x.Game(memory(x.storage.getItem(x.SAVE_KEY)));
  assert(restored.storageOK);
  assert.equal(x.validRun(restored.run),true);
  assert.equal(restored.run.battle.draft.length,5);
  assert(restored.resume());
  const rb=restored.run.battle,material=cardFor(restored,restored.topic().bank[6],'draft-limit-after-load');
  rb.hand=[material];rb.energy=3;
  assert.equal(restored.play(material.id),false);
  assert.equal(restored.undo(rb.draft[0].id),true);
  assert.equal(rb.draft.length,4);
  assert.equal(restored.play(material.id),false);
  assert.equal(restored.undo(rb.draft[0].id),true);
  assert.equal(restored.undo(rb.draft[0].id),true);
  assert.equal(rb.draft.length,2);
  assert.equal(restored.play(material.id),true);
  assert.equal(rb.draft.length,3);
});

test('勇者坦克法師在需要兩句或三句的段落都顯示固定三句上限',()=>{
  const topics=boot().TOPICS,topic=topics.find(t=>t.paragraphs.some(p=>p.pattern.length===2)&&t.paragraphs.some(p=>p.pattern.length===3));
  assert(topic,'題庫同時有兩句與三句段落');
  for(const char of ['hero','tank','mage'])for(const count of [2,3]){
    const x=renderedBattle('monster',topic.id,char),g=x.game,index=g.topic().paragraphs.findIndex(p=>p.pattern.length===count);
    assert.notEqual(index,-1);
    assert.equal(g.topic().paragraphs[index].pattern.length,count);
    assert(g.setTarget(index));
    assert.match(x.elements.get('hand-zone').innerHTML,/已選 0\/3 句/);
  }
});
test('隨手筆記按鈕在草稿三句時停用、兩句時可用',()=>{
  for(const count of [2,3]){
    const x=renderedBattle(),g=x.game,b=g.run.battle,t=g.topic();
    b.draft=t.bank.slice(0,count).map((s,i)=>({...cardFor(g,s,'note-button-'+count+'-'+i),paidCost:1,playedRound:b.round,appliedBlock:0,drawApplied:false}));
    b.energy=3;g.onChange();
    const html=x.elements.get('action-zone').innerHTML,button=html.match(/<button\b(?=[^>]*\bid="note-button")[^>]*>/)?.[0];
    assert(button,'隨手筆記按鈕有渲染');
    assert.equal(/\sdisabled(?:\s|>)/.test(button),count===3);
  }
});
test('11 個題目對應指定動畫集與完整播放網址',()=>{
  const x=boot(),{game,TOPICS,TEACHING_VIDEOS,ANIMATION_BASE}=x;
  const expected={teacher:['g3-01-person-skeleton','g3-02-person-layers'],pencil:['g3-03-object'],campus:['g4-03-scene-skeleton','g4-04-scene-layers'],trip:['g4-01-event-skeleton','g4-02-event-layers'],brave:['g6-01-person-focus-skeleton','g6-02-person-focus-layers'],special:['g6-03-event-focus-skeleton','g6-04-event-focus-layers'],desk:['g4-05-method-skeleton'],environment:['g5-01-howto-skeleton'],reading:['g5-02-why-skeleton'],humility:['g6-05-talk-skeleton'],book:['g6-06-what-skeleton','g6-07-argument-layers']};
  const expectedIds=Object.keys(expected).sort();
  assert.equal(ANIMATION_BASE,'https://bai-collab.github.io/pyes_Composition/');
  assert.deepEqual(Object.keys(TEACHING_VIDEOS).sort(),expectedIds);
  assert.deepEqual(normal(TOPICS).map(topic=>topic.id).sort(),expectedIds);
  assert(game.startRun('hero',271828));game.run.current='0-0';
  for(const topic of normal(TOPICS)){
    assert(game.startBattle('monster',topic.id));
    const videos=normal(game.teachingVideos());
    assert.deepEqual(videos,expected[topic.id].map((folder,index)=>({folder,label:index===0?'骨架：四段怎麼排':'長肉：一段裡怎麼排',url:ANIMATION_BASE+folder+'/'})));
    for(const video of videos){assert(video.url.startsWith(ANIMATION_BASE));assert(video.url.endsWith('/'));assert(!video.url.toLowerCase().includes('embed'));}
  }
});

test('開關教學期間不改戰鬥狀態且所有戰鬥操作都暫停',()=>{
  for(const char of ['hermit','hero']){
    const {game:g}=battle('monster','teacher',char),before=normal(g.run);
    assert.equal(g.openHelp(),true);assert.equal(g.activeBattle(),false);
    assert.equal(g.play(g.run.battle.hand[0]?.id),false);assert.equal(g.submit(),false);assert.equal(g.endTurn(),false);assert.equal(g.note(g.topic().bank[0].id),false);assert.equal(g.mulligan(),false);
    assert.deepEqual(normal(g.run),before);
    assert.equal(g.closeHelp(),true);assert.equal(g.activeBattle(),true);assert.deepEqual(normal(g.run),before);
  }
});

test('角色教學代價只付一次，免費角色不改戰鬥資料',()=>{
  for(const char of ['hero','tank','mage']){
    const {game:g}=battle('monster','teacher',char),b=g.run.battle;b.energy=2;
    assert.equal(g.helpCost(),1);assert.equal(g.confirmHelp(),true);assert.equal(b.energy,1);assert.equal(b.helpPaid,true);assert.equal(g.helpCost(),0);
    const paid=normal(g.run);assert.equal(g.confirmHelp(),true);assert.deepEqual(normal(g.run),paid);
  }
  for(const char of ['hermit','teacher']){
    const {game:g}=battle('monster','teacher',char),before=normal(g.run);
    assert.equal(g.helpCost(),0);assert.equal(g.confirmHelp(),true);assert.deepEqual(normal(g.run),before);
  }
});

test('提交失敗兩次才提醒，空草稿與重複段落不計數，下一場歸零',()=>{
  const empty=battle(),eg=empty.game;assert.equal(eg.submit(),false);assert.equal(eg.run.battle.failedSubmits,0);assert.equal(eg.helpAlert(),false);
  const x=renderedBattle(),g=x.game,b=g.run.battle;putParagraph(x,0);b.draft[0].allowed=[];
  assert.equal(g.submit(),false);assert.equal(b.failedSubmits,1);assert.equal(g.helpAlert(),false);
  let html=x.elements.get('hand-zone').innerHTML;assert(html.includes('id="help-btn"'));assert(!html.includes('class="help-alert"'));assert(!html.includes('卡關了嗎？'));
  assert.equal(g.submit(),false);assert.equal(b.failedSubmits,2);assert.equal(g.helpAlert(),true);
  html=x.elements.get('hand-zone').innerHTML;assert(html.includes('class="help-alert"'));assert(html.includes('卡關了嗎？看教學'));
  assert(g.startBattle('monster','pencil'));assert.equal(g.run.battle.failedSubmits,0);assert.equal(g.helpAlert(),false);
  const duplicate=battle(),dg=duplicate.game,db=dg.run.battle;db.completed.push({index:0,text:'已完成'});putParagraph(duplicate,0);assert.equal(dg.submit(),false);assert.equal(db.failedSubmits,0);
});

test('首次戰敗可看過教學後復活並保留草稿、手牌與怪物血量，再敗即結束',()=>{
  const x=battle('monster','teacher','hero'),g=x.game,r=g.run,b=r.battle;putParagraph(x,0);
  if(!b.hand.length)b.hand.push(b.draw.pop());assert(b.hand.length>0);
  b.energy=3;b.block=0;b.enemy.attack=10;b.enemy.hp=Math.min(b.enemy.hp,20);r.hp=1;
  const draftBefore=normal(b.draft),handIds=b.hand.map(card=>card.id),enemyHp=b.enemy.hp,round=b.round;
  assert.equal(g.endTurn(),true);assert.equal(r.status,'active');assert.equal(r.settled,false);assert.equal(b.defeated,true);assert.equal(b.defeatWatched,false);assert.equal(g.activeBattle(),false);assert.equal(g.revive(),false);
  assert.equal(g.markHelpWatched(),true);assert.equal(g.revive(),true);assert.equal(r.hp,Math.floor(r.maxHp/2));assert.equal(r.reviveUsed,true);assert.equal(b.defeated,false);assert.equal(b.defeatWatched,false);assert.equal(b.enemy.hp,enemyHp);assert.deepEqual(normal(b.draft),draftBefore);assert(handIds.every(id=>b.hand.some(card=>card.id===id)));assert(b.hand.length>=5);assert.equal(b.round,round+1);assert.equal(b.energy,3);assert.equal(b.block,0);assert.equal(b.noteUsed,false);assert.equal(b.mulliganUsed,false);assert.equal(b.firstMaterial,false);assert.equal(g.activeBattle(),true);
  r.hp=1;b.enemy.attack=50;assert.equal(g.endTurn(),true);assert.equal(r.status,'lost');assert.equal(r.settled,true);assert.equal(g.revive(),false);
});

test('能量不足的教學債務會在普通回合或復活後少一點能量',()=>{
  const normalTurn=battle(),g=normalTurn.game,b=g.run.battle;b.energy=0;
  assert.equal(g.confirmHelp(),true);assert.equal(b.helpPaid,true);assert.equal(b.helpDebt,true);assert.equal(b.energy,0);
  assert.equal(g.endTurn(),true);assert.equal(b.energy,2);assert.equal(b.helpDebt,false);
  const defeated=battle(),dg=defeated.game,dr=dg.run,db=dr.battle;db.energy=0;assert.equal(dg.confirmHelp(),true);dr.hp=1;db.enemy.attack=1;
  assert.equal(dg.endTurn(),true);assert.equal(db.defeated,true);assert.equal(db.helpDebt,true);assert.equal(dg.markHelpWatched(),true);assert.equal(dg.revive(),true);assert.equal(db.energy,2);assert.equal(db.helpDebt,false);
  const giveUp=battle(),ug=giveUp.game;ug.run.hp=1;ug.run.battle.enemy.attack=10;assert.equal(ug.endTurn(),true);assert.equal(ug.run.battle.defeated,true);assert.equal(ug.giveUp(),true);assert.equal(ug.run.status,'lost');
});

test('舊存檔仍可載入，新欄位會保存、戰敗重載與復活後限制都有效',()=>{
  const x=battle(),g=x.game;
  const legacy={version:2,meta:normal(g.meta),run:normal(g.run),selected:g.selected};delete legacy.run.reviveUsed;
  for(const key of ['failedSubmits','helpPaid','helpDebt','defeated','defeatWatched'])delete legacy.run.battle[key];
  assert.equal(x.validRun(legacy.run),true);const old=new x.Game(memory(JSON.stringify(legacy)));assert(old.storageOK);assert.equal(old.run.battle.failedSubmits,undefined);
  const b=g.run.battle;b.failedSubmits=2;b.helpPaid=true;b.helpDebt=true;assert.equal(g.save(),true);
  const saved=new x.Game(memory(x.storage.getItem(x.SAVE_KEY)));assert(saved.storageOK);assert.equal(saved.run.battle.failedSubmits,2);assert.equal(saved.run.battle.helpPaid,true);assert.equal(saved.run.battle.helpDebt,true);assert.equal(saved.run.reviveUsed,false);
  const defeated=battle(),dg=defeated.game;dg.run.hp=1;dg.run.battle.enemy.attack=10;assert.equal(dg.endTurn(),true);const reloaded=new defeated.Game(memory(defeated.storage.getItem(defeated.SAVE_KEY)));assert(reloaded.storageOK);assert.equal(reloaded.view,'battle');assert.equal(reloaded.run.battle.defeated,true);assert.equal(reloaded.activeBattle(),false);
  const revived=battle(),vg=revived.game;vg.run.hp=1;vg.run.battle.enemy.attack=10;assert.equal(vg.endTurn(),true);assert.equal(vg.markHelpWatched(),true);assert.equal(vg.revive(),true);const afterRevive=new revived.Game(memory(revived.storage.getItem(revived.SAVE_KEY)));assert(afterRevive.storageOK);assert.equal(afterRevive.run.reviveUsed,true);assert.equal(afterRevive.resume(),true);afterRevive.run.hp=1;afterRevive.run.battle.enemy.attack=50;assert.equal(afterRevive.endTurn(),true);assert.equal(afterRevive.run.status,'lost');
  for(const mutate of [run=>{run.battle.helpPaid='yes';},run=>{run.battle.failedSubmits=-1;},run=>{run.battle.failedSubmits=10001;},run=>{run.reviveUsed='yes';}]){const invalid=normal(g.run);mutate(invalid);assert.equal(x.validRun(invalid),false);}
});

test('戰鬥工具列能開啟付費或免費教學並呈現下回合能量提醒',()=>{
  const hero=renderedBattle('monster','teacher','hero'),heroHtml=hero.elements.get('hand-zone').innerHTML;assert(heroHtml.includes('id="help-btn"'));
  hero.clickAction('help-open');const paidBody=hero.elements.get('dialog-body').innerHTML;assert(paidBody.includes('id="help-cost"'));assert(paidBody.includes('id="help-confirm"'));
  const hermit=renderedBattle('monster','teacher','hermit');hermit.clickAction('help-open');const freeBody=hermit.elements.get('dialog-body').innerHTML;assert(!freeBody.includes('id="help-cost"'));assert(freeBody.includes('data-action="help-episode"'));
  hero.game.run.battle.helpDebt=true;hero.game.onChange();assert(hero.elements.get('screen').innerHTML.includes('下回合能量 -1'));
});

test('戰敗畫面會鎖住玩家並提供看教學、結束與看過後復活選項',()=>{
  const x=renderedBattle('monster','teacher','hero'),g=x.game,b=g.run.battle;b.defeated=true;g.run.hp=0;g.onChange();
  const html=x.elements.get('screen').innerHTML;assert(html.includes('id="defeat-panel"'));assert(html.includes('role="alertdialog"'));assert(html.includes('id="defeat-help"'));assert(html.includes('id="defeat-end"'));
  x.clickAction('defeat-help');let body=x.elements.get('dialog-body').innerHTML;assert(body.includes('data-action="help-episode"'));assert(!body.includes('id="help-cost"'));
  x.clickAction('help-seen');body=x.elements.get('dialog-body').innerHTML;assert(body.includes('id="revive-button"'));
});
test('離線時顯示可複製網址，按我看過了後仍可復活',()=>{
  const elements=new Map(),listeners=new Map(),element=id=>{if(!elements.has(id))elements.set(id,{id,innerHTML:'',textContent:'',dataset:{},clientWidth:1280,open:false,addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},focus(){},scrollIntoView(){}});return elements.get(id);};
  const document={getElementById:element,querySelectorAll:()=>[],addEventListener:(type,listener)=>listeners.set(type,listener),activeElement:null};
  const context=vm.createContext({console,document,navigator:{onLine:false},window:{localStorage:memory()},requestAnimationFrame:()=>0,cancelAnimationFrame(){},addEventListener(){},clearTimeout(){},setTimeout:()=>0,matchMedia:()=>({matches:false}),innerWidth:1280});
  vm.runInContext(source,context);const game=context.game;game.meta.wins=2;game.meta.hermit=true;assert(game.startRun('hero',123));game.run.current='0-0';assert(game.startBattle('monster','teacher'));game.run.battle.defeated=true;game.onChange();
  const click=(action,id)=>listeners.get('click')({target:{closest:selector=>selector==='button[data-action]'?{dataset:{action,id},disabled:false}:null}});
  click('defeat-help');click('help-episode','g3-01-person-skeleton');let body=elements.get('dialog-body').innerHTML;
  let player=elements.get('help-player').innerHTML;assert(body.includes('data-action="help-episode"'));assert(player.includes('目前連不到教學動畫'));assert(player.includes('id="help-url"'));assert(player.includes('https://bai-collab.github.io/pyes_Composition/g3-01-person-skeleton/'));assert(player.includes('data-action="help-copy"'));assert(player.includes('data-action="help-seen"'));
  click('help-seen','g3-01-person-skeleton');body=elements.get('dialog-body').innerHTML;player=elements.get('help-player').innerHTML;assert.equal(game.run.battle.defeatWatched,true);assert(body.includes('id="revive-button"'));assert(player.includes('目前連不到教學動畫'));assert.equal(game.activeBattle(),false);
});
test('沒有 fetch 時直接顯示完整動畫頁並允許戰敗復活',()=>{
  const elements=new Map(),listeners=new Map(),element=id=>{if(!elements.has(id))elements.set(id,{id,innerHTML:'',textContent:'',dataset:{},clientWidth:1280,open:false,addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},focus(){},scrollIntoView(){}});return elements.get(id);};
  const document={getElementById:element,querySelectorAll:()=>[],addEventListener:(type,listener)=>listeners.set(type,listener),activeElement:null};
  const context=vm.createContext({console,document,navigator:{onLine:true},fetch:undefined,AbortController:undefined,window:{localStorage:memory()},requestAnimationFrame:()=>0,cancelAnimationFrame(){},addEventListener(){},clearTimeout(){},setTimeout:()=>0,matchMedia:()=>({matches:false}),innerWidth:1280});
  vm.runInContext(source,context);const game=context.game;game.meta.wins=2;game.meta.hermit=true;assert(game.startRun('hero',123));game.run.current='0-0';assert(game.startBattle('monster','teacher'));game.run.battle.defeated=true;game.onChange();
  const click=(action,id)=>listeners.get('click')({target:{closest:selector=>selector==='button[data-action]'?{dataset:{action,id},disabled:false}:null}});
  click('defeat-help');click('help-episode','g3-01-person-skeleton');const player=elements.get('help-player').innerHTML,body=elements.get('dialog-body').innerHTML;
  assert(player.includes('<iframe id="help-frame"'));assert(player.includes('src="https://bai-collab.github.io/pyes_Composition/g3-01-person-skeleton/"'));assert(player.includes('title="教學動畫：骨架：四段怎麼排"'));assert.equal(game.run.battle.defeatWatched,true);assert(body.includes('id="revive-button"'));
});

function finishDemo(game,limit=game.DEMO_STEP_LIMIT){
  const steps=[];let result={done:false};
  for(let i=0;i<=limit&&!result.done;i++){result=game.demoStep();steps.push(result);}
  return{steps,result};
}

function enterDemoBattle(game){
  for(let i=0;i<80&&game.run?.view!=='battle';i++){const result=game.demoStep();assert(!result.done,'示範應在有限步數內進入戰鬥');}
  assert.equal(game.run?.view,'battle','固定種子應能找到戰鬥節點');
}

function savedAdventureForDemo(seed=4242){
  const storage=memory();let setItems=0;const originalSetItem=storage.setItem;storage.setItem=(key,value)=>{setItems++;originalSetItem(key,value);};
  const x=boot(storage),g=x.game;g.meta.wins=2;g.meta.hermit=true;g.meta.ink=27;assert(g.startRun('hero',seed));
  for(let i=0;i<80&&g.run.view!=='battle';i++){
    if(g.run.view==='map'){const available=g.run.available.map(id=>g.node(id)).filter(Boolean),node=available.find(item=>['monster','elite','boss'].includes(item.type))||available[0];assert(node);assert(g.enterNode(node.id));}
    else if(['camp','shop','reward'].includes(g.run.view))assert(g.completeNode());
    else assert.fail(`意外的冒險狀態：${g.run.view}`);
  }
  assert.equal(g.run.view,'battle');const card=g.run.battle.hand.find(item=>item.type==='material');assert(card);assert(g.play(card.id));
  return{x,game:g,storage,getSetItems:()=>setItems};
}

test('自動示範五角色各跑種子 1 到 5，全部在上限內以勝敗結束',()=>{
  const allowed=new Set(['enterNode','setTarget','play','undo','submit','note','mulligan','endTurn','reward','camp','buy','completeNode','openHelp','markHelpWatched','revive','giveUp']);
  for(const role of ['hero','tank','mage','hermit','teacher'])for(let seed=1;seed<=5;seed++){
    const x=boot(),g=x.game;g.meta.wins=2;g.meta.hermit=true;assert(g.startDemo(role,seed));const{steps,result}=finishDemo(g,x.DEMO_STEP_LIMIT);
    assert(result.done,`${role}/${seed} 未結束`);assert(g.demo.steps<=x.DEMO_STEP_LIMIT,`${role}/${seed} 超過步數上限`);assert(['won','lost'].includes(g.run.status),`${role}/${seed} 最終狀態不是勝敗`);assert(steps.every(step=>step.action===null||allowed.has(step.action)));
  }
});

test('示範勝敗都不改既有存檔、冒險或局外資料，結束後可續玩',()=>{
  const findDemoSeed=(role,status,from,to)=>{for(let seed=from;seed<=to;seed++){const probe=savedAdventureForDemo(seed+700);assert(probe.game.startDemo(role,seed));finishDemo(probe.game,probe.x.DEMO_STEP_LIMIT);if(probe.game.run.status===status)return seed;}return null;};
  for(const[role,status,from,to]of [['mage','won',6,60],['hero','lost',1,60]]){
    const seed=findDemoSeed(role,status,from,to);assert.notEqual(seed,null,`${role} 在種子 ${from} 到 ${to} 找不到以 ${status} 結束的示範局`);
    const fixture=savedAdventureForDemo(seed+700),api=fixture.x,g=fixture.game,storage=fixture.storage,rawBefore=storage.getItem(api.SAVE_KEY),runBefore=normal(g.run),metaBefore=normal(g.meta),writesBefore=fixture.getSetItems();
    assert(g.startDemo(role,seed));const{result}=finishDemo(g,api.DEMO_STEP_LIMIT);assert(result.done,`${role}/${seed} 未在步數上限內結束`);assert.equal(g.run.status,status,`${role}/${seed} 應以 ${status} 結束`);
    assert.equal(fixture.getSetItems()-writesBefore,0,'示範期間不得呼叫 setItem');assert.equal(storage.getItem(api.SAVE_KEY),rawBefore);assert.deepEqual(normal(g.meta),metaBefore);
    assert(g.endDemo());assert.equal(g.view,'menu');assert.deepEqual(normal(g.run),runBefore);assert.deepEqual(normal(g.meta),metaBefore);assert.equal(storage.getItem(api.SAVE_KEY),rawBefore);assert.equal(fixture.getSetItems()-writesBefore,0);
    assert(g.resume());assert.equal(g.view,runBefore.view);assert.deepEqual(normal(g.run),runBefore);
  }
});

test('示範中不能購買隱士、強化生命或領取練功房首次墨水',()=>{
  const x=boot(),g=x.game;g.meta.ink=100;g.meta.hermit=false;g.meta.wins=2;assert(g.startDemo('hero',1));const before=normal(g.meta),practice=x.PRACTICES[0];
  assert.equal(g.buyHermit(),false);assert.equal(g.upgradeMeta(),false);g.practice={id:practice.id,selected:practice.parts.map((_,index)=>index),solved:false};assert.equal(g.practiceSubmit(),false);
  assert.deepEqual(normal(g.meta),before);assert.equal(g.practice.solved,false);assert.equal(g.notice,'自動示範中不能使用。');
});

test('更換抽牌堆內容不會改變同一戰鬥的第一個自動決定',()=>{
  const first=boot(),second=boot();for(const g of [first.game,second.game]){g.meta.wins=2;g.meta.hermit=true;assert(g.startDemo('hero',37));enterDemoBattle(g);}
  const g1=first.game,g2=second.game,b=g2.run.battle,t=g2.topic(),length=b.draw.length;b.draw=Array.from({length},(_,index)=>{const sentence=t.bank[(index+1)%t.bank.length];return{id:`alternate-${index}`,type:'material',topicId:t.id,bankId:sentence.id,kind:sentence.kind,sentence:sentence.text,allowed:[...sentence.allowed],level:0,damageSpent:false};});
  const a=g1.demoStep(),c=g2.demoStep();assert.equal(a.action,c.action);assert.equal(a.id,c.id);
});

test('接手後可手動出牌，示範存檔閘仍有效',()=>{
  const storage=memory();let writes=0;const originalSetItem=storage.setItem;storage.setItem=(key,value)=>{writes++;originalSetItem(key,value);};const x=boot(storage),g=x.game;g.meta.wins=2;g.meta.hermit=true;assert(g.startDemo('hero',37));enterDemoBattle(g);const before=writes;
  assert(g.takeOver());assert.equal(g.demo.auto,false);const card=g.run.battle.hand[0];assert(card);assert(g.play(card.id));assert.equal(writes,before);assert(g.save());assert.equal(writes,before);
});

test('自動示範第一次戰敗依序開教學、標記看過並復活',()=>{
  const x=boot(),g=x.game;assert(g.startDemo('hero',1));enterDemoBattle(g);const b=g.run.battle;g.run.hp=1;b.enemy.attack=50;b.block=0;const first=g.demoStep();
  assert.equal(first.action,'endTurn');assert.equal(b.defeated,true);assert.equal(g.demo.forcedLoss,true);const topicId=b.topicId,enemyHp=b.enemy.hp;
  assert.equal(g.demoStep().action,'openHelp');assert.equal(g.helpOpen,true);assert.equal(g.demo.forcedLoss,false);
  assert.equal(g.demoStep().action,'markHelpWatched');assert.equal(b.defeatWatched,true);
  assert.equal(g.demoStep().action,'revive');assert.equal(g.run.hp,Math.floor(g.run.maxHp/2));assert.equal(g.run.reviveUsed,true);assert.equal(b.defeated,false);assert.equal(g.run.battle,b);assert.equal(b.topicId,topicId);assert.equal(b.enemy.hp,enemyHp);assert.equal(g.activeBattle(),true);
  b.enemy.attack=10;let result={done:false};for(let i=0;i<50&&!result.done&&!['play','submit'].includes(result.action);i++)result=g.demoStep();assert(['play','submit'].includes(result.action),'復活後應繼續使用手牌或提交草稿');
});

test('勇者、坦克、法師的示範通知不含段落標籤或完整公式；隱士通知會含句型公式',()=>{
  for(const role of ['hero','tank','mage']){
    const x=boot(),g=x.game;g.meta.wins=2;g.meta.hermit=true;assert(g.startDemo(role,1));const checks=[];let result={done:false};
    for(let i=0;i<=x.DEMO_STEP_LIMIT&&!result.done;i++){result=g.demoStep();const topic=g.topic(),labels=topic?.paragraphs.map(paragraph=>paragraph.label)||[];for(const text of [result.text,g.notice,...g.battleLog.map(item=>item.text)])if(text)checks.push({text,labels});}
    assert(result.done);for(const{ text,labels }of checks){for(const label of labels)assert(!text.includes(label),`${role} 通知洩漏段落標籤：${label}`);assert(!text.includes(' → '),`${role} 通知洩漏句型公式`);}
  }
  const x=boot(),g=x.game;g.meta.wins=2;g.meta.hermit=true;assert(g.startDemo('hermit',1));let result={done:false},sawFormula=false;
  for(let i=0;i<=x.DEMO_STEP_LIMIT&&!result.done;i++){result=g.demoStep();if(result.text?.includes(' → '))sawFormula=true;}
  assert(result.done);assert(sawFormula,'隱士至少一則通知應包含句型公式');
});

function renderedDemoApp(){
  const elements=new Map(),listeners=new Map(),elementListeners=new Map(),timers=new Map();let nextTimer=1;
  const element=id=>{if(!elements.has(id)){const local=new Map();elementListeners.set(id,local);elements.set(id,{id,innerHTML:'',textContent:'',dataset:{},clientWidth:390,open:false,disabled:false,addEventListener:(type,listener)=>local.set(type,listener),showModal(){this.open=true;},close(){this.open=false;local.get('close')?.();},focus(){},scrollIntoView(){}});}return elements.get(id);};
  const document={getElementById:element,querySelectorAll:()=>[],addEventListener:(type,listener)=>listeners.set(type,listener),activeElement:null};
  const context=vm.createContext({console,document,window:{localStorage:memory()},requestAnimationFrame:()=>0,cancelAnimationFrame(){},addEventListener(){},clearTimeout:id=>timers.delete(id),setTimeout:(callback,delay)=>{const id=nextTimer++;timers.set(id,{callback,delay});return id;},matchMedia:()=>({matches:false}),innerWidth:390});
  vm.runInContext(source,context);const click=(action,id=null)=>listeners.get('click')({target:{closest:selector=>selector==='button[data-action]'?{dataset:{action,id},disabled:false}:null}});
  return{game:context.game,api:context.PenSpire,elements,click,timers};
}

test('主選單、示範控制列、接手狀態與示範結果頁都有對應控制',()=>{
  const x=renderedDemoApp(),g=x.game;Object.assign(Object.getPrototypeOf(x.api),{location:{search:'?auto=1'},URLSearchParams});g.onChange();assert(x.elements.get('screen').innerHTML.includes('id="demo-button"'));g.selected='tank';g.onChange();assert.match(x.elements.get('screen').innerHTML,/id="demo-button"[^>]*disabled/);assert.equal(g.startDemo('tank',1),false);g.selected='hero';g.meta.wins=2;g.meta.hermit=true;assert(g.startDemo('hero',1));
  let hud=x.elements.get('hud').innerHTML;assert(hud.includes('id="demo-bar"'));assert(hud.includes('id="demo-pause"'));assert.equal((hud.match(/data-action="demo-speed"/g)||[]).length,3);assert(hud.includes('id="demo-takeover"'));assert(hud.includes('id="demo-end"'));
  assert.equal(g.takeOver(),true);hud=x.elements.get('hud').innerHTML;assert(hud.includes('示範局・你來操作'));assert(!hud.includes('demo-takeover'));assert(!hud.includes('demo-speed'));
  g.run.status='lost';g.run.view='result';g.view='result';g.demo.ended=true;g.onChange();const screen=x.elements.get('screen').innerHTML;assert(screen.includes('示範局：不存檔、不加墨水、不算通關'));assert(screen.includes('id="result-demo-end"'));assert(screen.includes('data-action="demo-end"'));
});

test('自動計時器只保留一個，依速度重排，暫停、對話框與接手會停止',()=>{
  const x=renderedDemoApp(),g=x.game;assert.deepEqual(normal(x.api.DEMO_DELAYS),{slow:1500,mid:800,fast:300});assert.equal(x.api.DEMO_STEP_LIMIT,3000);g.meta.wins=2;g.meta.hermit=true;assert(g.startDemo('hero',37));assert.equal(x.timers.size,1);assert.equal([...x.timers.values()][0].delay,800);
  enterDemoBattle(g);assert.equal(x.timers.size,1);x.click('article');assert.equal(x.timers.size,0);x.elements.get('dialog').close();assert.equal(x.timers.size,1);assert.equal([...x.timers.values()][0].delay,800);
  x.click('demo-speed','fast');assert.equal(x.timers.size,1);assert.equal([...x.timers.values()][0].delay,300);x.click('demo-pause');assert.equal(x.timers.size,0);x.click('demo-pause');assert.equal(x.timers.size,1);assert.equal([...x.timers.values()][0].delay,300);x.click('demo-takeover');assert.equal(x.timers.size,0);assert.equal(g.demo.auto,false);
});

function completedDemoBattle({hand,energy=3,attack=0,block=1000}={}){
  const x=boot(),g=x.game;g.meta.wins=2;g.meta.hermit=true;assert(g.startDemo('hero',37));enterDemoBattle(g);g.demo.forcedLoss=false;
  const b=g.run.battle,t=g.topic();b.type='monster';b.required=[0];b.completed=t.paragraphs.map((_,index)=>({index}));b.phase=0;b.target=0;b.draft=[];b.hand=hand.map(card=>({topicId:t.id,level:0,sentence:'戰術測試牌',damageSpent:false,...card}));b.energy=energy;b.block=block;b.enemy.hp=1000;b.enemy.maxHp=1000;b.enemy.attack=attack;g.run.hp=100;g.run.maxHp=100;
  return{g,b,t};
}

test('普通怪四段都完成後仍會打出筆鋒打擊，不受怪物攻擊條件限制',()=>{
  const {g}=completedDemoBattle({hand:[{id:'strike-fixture',type:'strike'}],energy:3,attack:0,block:1000});const result=g.demoStep();
  assert.equal(result.action,'play');assert.equal(result.id,'strike-fixture');
});

test('沒有可寫段落時先用可用格擋牌，無能量只剩素材牌時才結束回合',()=>{
  const defended=completedDemoBattle({hand:[{id:'defend-fixture',type:'defend'}],energy:3,attack:6,block:0});const defendResult=defended.g.demoStep();
  assert.equal(defendResult.action,'play');assert.equal(defendResult.id,'defend-fixture');
  const exhausted=completedDemoBattle({hand:[{id:'material-fixture',type:'material',kind:'fact',bankId:'unused',allowed:[3]}],energy:0,attack:0,block:0});const turnResult=exhausted.g.demoStep();
  assert.equal(turnResult.action,'endTurn');
});

test('五個角色整局示範的通知前綴至多一次且若出現就在開頭',()=>{
  const prefix='自動示範：';
  for(const role of ['hero','tank','mage','hermit','teacher']){
    const x=boot(),g=x.game;g.meta.wins=2;g.meta.hermit=true;assert(g.startDemo(role,1));const notices=new Set();let result={done:false};
    for(let i=0;i<=x.DEMO_STEP_LIMIT&&!result.done;i++){
      result=g.demoStep();for(const text of [result.text,g.notice,...g.battleLog.map(item=>item.text)])if(text)notices.add(text);
    }
    assert(result.done,`${role} 示範應在步數上限內結束`);
    for(const text of notices){const count=text.split(prefix).length-1;assert(count<=1,`${role} 通知重複前綴：${text}`);if(count)assert(text.startsWith(prefix),`${role} 通知前綴不在開頭：${text}`);}
  }
});

test('自動示範按鈕只在網址 auto=1 時顯示，缺少或讀取失敗的 location 會關閉',()=>{
  for(const[search,visible]of[[null,false],['?auto=0',false],['?auto=yes',false],['?auto=1',true],['?lang=zh&auto=1',true]]){
    const x=renderedDemoApp();
    if(search!==null){Object.assign(Object.getPrototypeOf(x.api),{location:{search},URLSearchParams});x.game.onChange();}
    const html=x.elements.get('screen').innerHTML;
    assert.equal(html.includes('id="demo-button"'),visible,search??'缺少 location');
    assert.equal(html.includes('自動示範一局'),visible,search??'缺少 location');
  }
  const x=renderedDemoApp();Object.defineProperty(Object.getPrototypeOf(x.api),'location',{configurable:true,get(){throw new Error('location 不可讀');}});
  assert.doesNotThrow(()=>x.game.onChange());assert(!x.elements.get('screen').innerHTML.includes('demo-button'));
});

test('自動示範第一場戰鬥只結束回合，直到故意戰敗',()=>{
  const x=boot(),g=x.game;g.meta.wins=2;g.meta.hermit=true;assert(g.startDemo('hero',1));enterDemoBattle(g);const b=g.run.battle;let result={done:false};
  for(let i=0;i<80&&!b.defeated;i++){result=g.demoStep();assert.equal(result.action,'endTurn','故意輸的第一場戰鬥只能結束回合');}
  assert(b.defeated,'第一場戰鬥應進入戰敗面板');assert(g.demo.forcedLoss);result=g.demoStep();assert.equal(result.action,'openHelp');assert.equal(g.demo.forcedLoss,false);
});

test('五角色種子 1 到 5 都在步數上限內完成示範並留下復活紀錄',()=>{
  for(const role of ['hero','tank','mage','hermit','teacher'])for(let seed=1;seed<=5;seed++){
    const x=boot(),g=x.game;g.meta.wins=2;g.meta.hermit=true;assert(g.startDemo(role,seed));const{steps,result}=finishDemo(g,x.DEMO_STEP_LIMIT);
    assert(result.done,`${role}/${seed} 未完成`);assert(g.demo.steps<=x.DEMO_STEP_LIMIT,`${role}/${seed} 超過步數上限`);assert(['won','lost'].includes(g.run.status),`${role}/${seed} 未以勝敗結束`);assert(steps.some(step=>step.action==='revive'),`${role}/${seed} 缺少復活紀錄`);
  }
});

test('自動示範同一局第二次戰敗會結束並顯示示範局結果',()=>{
  const x=renderedDemoApp(),g=x.game;g.meta.wins=2;g.meta.hermit=true;assert(g.startDemo('hero',1));enterDemoBattle(g);const b=g.run.battle;g.run.hp=1;b.enemy.attack=50;b.block=0;assert.equal(g.demoStep().action,'endTurn');assert.equal(g.demoStep().action,'openHelp');assert.equal(g.demoStep().action,'markHelpWatched');assert.equal(g.demoStep().action,'revive');
  g.run.hp=0;b.defeated=true;const result=g.demoStep();assert.equal(result.action,'giveUp');assert.equal(result.done,true);assert.equal(g.run.status,'lost');assert.equal(g.demo.ended,true);assert(x.elements.get('screen').innerHTML.includes('示範局'));
});

function renderedAutoDefeatApp({offline=false}={}){
  const elements=new Map(),listeners=new Map(),elementListeners=new Map(),timers=new Map(),clicks=[],blocked=new Set();let nextTimer=1;
  const attr=(tag,name)=>tag.match(new RegExp('\\b'+name+'="([^"]*)"'))?.[1]??null;
  const findTag=selector=>{for(const owner of elements.values()){const markup=owner.innerHTML||'',tags=markup.match(/<(?:button|iframe)\b[^>]*>/g)||[];for(const tag of tags){if(selector.startsWith('#')&&attr(tag,'id')===selector.slice(1))return tag;if(selector==='button[data-action="help-episode"]'&&tag.startsWith('<button')&&attr(tag,'data-action')==='help-episode')return tag;if(selector==='button[data-action="help-seen"]'&&tag.startsWith('<button')&&attr(tag,'data-action')==='help-seen')return tag;}}return null;};
  const element=id=>{if(!elements.has(id)){const local=new Map(),classes=new Set();const node={id,innerHTML:'',textContent:'',dataset:{},clientWidth:390,open:false,disabled:false,addEventListener:(type,listener)=>local.set(type,listener),classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name)},showModal(){this.open=true;},close(){this.open=false;local.get('close')?.();},focus(){},scrollIntoView(){},click(){const tag=findTag('#'+id);if(!tag)return;const action=attr(tag,'data-action'),dataId=attr(tag,'data-id'),target={dataset:{action,id:dataId},disabled:tag.includes(' disabled')};if(!action||target.disabled)return;clicks.push(action);listeners.get('click')?.({target:{closest:selector=>selector==='button[data-action]'?target:null}});}};elementListeners.set(id,local);elements.set(id,node);}return elements.get(id);};
  const document={getElementById:element,querySelectorAll:()=>[],querySelector:selector=>{if(blocked.has(selector))return null;const tag=findTag(selector);if(!tag)return null;const id=attr(tag,'id')||`query-${attr(tag,'data-action')}-${attr(tag,'data-id')||''}`;const node=element(id);node.dataset={action:attr(tag,'data-action'),id:attr(tag,'data-id')};node.disabled=tag.includes(' disabled');return node;},addEventListener:(type,listener)=>listeners.set(type,listener),activeElement:null};
  const context=vm.createContext({console,document,window:{localStorage:memory()},navigator:offline?{onLine:false}:undefined,requestAnimationFrame:()=>0,cancelAnimationFrame(){},addEventListener(){},clearTimeout:id=>timers.delete(id),setTimeout:(callback,delay)=>{const id=nextTimer++;timers.set(id,{callback,delay});return id;},matchMedia:()=>({matches:false}),innerWidth:390});
  vm.runInContext(source,context);const game=context.game,api=context.PenSpire;
  return{game,api,elements,timers,clicks,blocked,click(id){document.querySelector('#'+id)?.click();},fireTimer(){assert(timers.size>0,'預期有且只有待執行計時器');assert(timers.size<=1,'自動示範只能有一個計時器');const[id,timer]=timers.entries().next().value;timers.delete(id);timer.callback();return timer;}};
}

test('畫面自動示範用按鈕走戰敗、教學、停留與復活，暫停可從目前狀態繼續',()=>{
  const x=renderedAutoDefeatApp(),g=x.game;g.meta.wins=2;g.meta.hermit=true;assert(g.startDemo('hero',1));enterDemoBattle(g);const b=g.run.battle;g.run.hp=1;b.enemy.attack=50;b.block=0;g.onChange();
  x.fireTimer();assert.equal(b.defeated,true);x.fireTimer();assert.deepEqual(x.clicks,['defeat-help']);assert.equal(x.elements.get('dialog').open,true);assert.equal(g.demo.helpHold.phase,'episode');
  x.clicks.length=0;x.click('demo-help-pause');assert.equal(g.demo.paused,true);assert.equal(x.timers.size,0);x.click('demo-help-pause');assert.equal(g.demo.paused,false);assert.equal(x.timers.size,1);x.clicks.length=0;
  x.fireTimer();assert.deepEqual(x.clicks,['help-episode']);x.fireTimer();assert.equal(g.demo.helpHold.phase,'hold');assert.equal([...x.timers.values()][0].delay,4000);
  x.click('demo-help-pause');assert.equal(x.timers.size,0);const remaining=g.demo.helpHold.remaining;x.click('demo-help-pause');assert.equal([...x.timers.values()][0].delay,remaining);x.fireTimer();assert.equal(x.clicks.at(-1),'revive');assert.equal(g.run.reviveUsed,true);assert.equal(g.run.battle.defeated,false);assert.equal(g.demo.forcedLoss,false);assert(x.timers.size<=1);
  const offline=renderedAutoDefeatApp({offline:true}),o=offline.game;o.meta.wins=2;o.meta.hermit=true;assert(o.startDemo('hero',1));enterDemoBattle(o);o.run.hp=1;o.run.battle.enemy.attack=50;o.run.battle.block=0;o.onChange();offline.fireTimer();offline.fireTimer();offline.fireTimer();offline.fireTimer();assert(offline.clicks.includes('help-seen'));assert.equal(o.demo.helpHold.phase,'hold');offline.fireTimer();assert.equal(offline.clicks.at(-1),'revive');assert.equal(o.run.reviveUsed,true);
});

test('畫面流程找不到按鈕十次會暫停，接手與結束會停止自動點擊',()=>{
  const retry=renderedAutoDefeatApp(),g=retry.game;g.meta.wins=2;g.meta.hermit=true;assert(g.startDemo('hero',1));enterDemoBattle(g);g.run.hp=1;g.run.battle.enemy.attack=50;g.run.battle.block=0;g.onChange();retry.fireTimer();retry.blocked.add('#defeat-help');for(let i=0;i<10;i++)retry.fireTimer();assert.equal(g.demo.paused,true);assert.equal(g.notice,'自動示範：找不到『看完教學再挑戰』按鈕，已暫停。');assert.equal(retry.timers.size,0);
  const takeover=renderedAutoDefeatApp(),t=takeover.game;t.meta.wins=2;t.meta.hermit=true;assert(t.startDemo('hero',1));enterDemoBattle(t);t.run.hp=1;t.run.battle.enemy.attack=50;t.run.battle.block=0;t.onChange();takeover.fireTimer();takeover.fireTimer();takeover.clicks.length=0;takeover.click('demo-help-takeover');assert.equal(t.demo.auto,false);assert.equal(takeover.timers.size,0);assert.deepEqual(takeover.clicks,['demo-takeover']);
  const ending=renderedAutoDefeatApp(),e=ending.game;e.meta.wins=2;e.meta.hermit=true;assert(e.startDemo('hero',1));enterDemoBattle(e);e.run.hp=1;e.run.battle.enemy.attack=50;e.run.battle.block=0;e.onChange();ending.fireTimer();ending.fireTimer();ending.click('demo-help-end');assert.equal(e.demo,null);assert.equal(ending.elements.get('dialog').open,false);assert.equal(ending.timers.size,0);
});


function p5ExtractAssignedObject(source, marker){
  const markerAt=source.indexOf(marker);assert.notEqual(markerAt,-1,'missing source art marker '+marker);
  const openAt=source.indexOf('{',markerAt),closeAt=source.indexOf('\n};',openAt);assert(openAt>=0&&closeAt>=0,'could not bound art object '+marker);
  return JSON.parse(source.slice(openAt,closeAt+2));
}
function renderP5Combat(char='hero'){
  const elements=new Map(),listeners=new Map(),element=id=>{if(!elements.has(id))elements.set(id,{id,innerHTML:'',textContent:'',dataset:{},clientWidth:1280,open:false,addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},focus(){},scrollIntoView(){}});return elements.get(id);};
  const document={getElementById:element,querySelectorAll:()=>[],addEventListener:(type,listener)=>listeners.set(type,listener),activeElement:null};
  const context=vm.createContext({console,document,window:{localStorage:memory()},requestAnimationFrame:()=>0,cancelAnimationFrame(){},addEventListener(){},clearTimeout(){},setTimeout:()=>0,matchMedia:()=>({matches:false}),innerWidth:1280});
  vm.runInContext(source,context);const game=context.game;game.meta.wins=2;game.meta.hermit=true;assert(game.startRun(char,123));game.run.current='0-0';game.startBattle('monster','teacher');
  return{game,elements,effects:context.PenSpireEffects};
}
function p5CombatOutcome(scenario,withHook){
  const x=battle('monster','teacher','hero'),g=x.game,b=g.run.battle,effects=[];
  if(withHook)g.onCombatEffect=(side,amount)=>effects.push([side,amount]);
  if(scenario==='victory'){putParagraph(x,0);b.enemy.hp=1;assert.equal(g.submit(),true);}
  else{g.run.hp=1;b.block=0;b.enemy.attack=1;assert.equal(g.endTurn(),true);assert.equal(b.defeated,true);}
  return{snapshot:{run:normal(g.run),hp:g.run.hp,enemyHp:b.enemy.hp,block:b.block,defeated:b.defeated,view:g.view,saved:x.storage.getItem(x.SAVE_KEY)},effects};
}

test('hero v2 frames match the pinned preview and legacy art bytes stay identical',async()=>{
  const preview=fs.readFileSync(new URL('../art/pixel-preview.html',import.meta.url),'utf8'),approved=p5ExtractAssignedObject(preview,'window.HERO_V2_ART ='),{PIXEL_ART}=boot();
  assert.deepEqual(normal(PIXEL_ART.heroPalette),approved.palette);assert.deepEqual(normal(PIXEL_ART.hero),approved.hero);
  assert.deepEqual(normal(PIXEL_ART.fx.inkSlash),approved.fx.inkSlash);assert.deepEqual(normal(PIXEL_ART.fx.bookShield),approved.fx.bookShield);
  assert.deepEqual(Object.fromEntries(Object.entries(PIXEL_ART.hero).map(([pose,frames])=>[pose,frames.length])),{idle:4,cast:4,hurt:2,ko:3,win:2});
  assert.equal(PIXEL_ART.fx.inkSlash.length,6);assert.equal(PIXEL_ART.fx.bookShield.length,3);assert.equal(Object.keys(PIXEL_ART.heroPalette).length,16);
  const frames=[...Object.values(approved.hero).flat(),...Object.values(approved.fx).flat()],keys=new Set(Object.keys(approved.palette));
  for(const frame of frames){assert.equal(frame.length,32);for(const row of frame){assert.equal(row.length,32);for(const key of row)assert(key==='.'||keys.has(key),'unknown palette key '+key);}}
  const {createHash}=await import('node:crypto'),hash=value=>createHash('sha256').update(JSON.stringify(normal(value))).digest('hex');
  assert.equal(hash(PIXEL_ART.palette),'2caa24b61ce1732028d5cf6cd79df2dfe86fe8ebf6cc0513aade3de796b2c2e4');
  assert.equal(hash(PIXEL_ART.slime),'f644615a1cdeb2341e4fcf871e5b4b32c1ca39883512be5ec74ae8a7ab04bc7f');
  assert.equal(hash(PIXEL_ART.fx.hit),'f1a85e24e5adc07679b713ee3194c09316dcc85e56a23cf326ba1a07f4dfc7e7');
  assert.equal(hash(PIXEL_ART.fx.block),'67c4f92681350a642b9ecdd9b470a98da1e06cd54c6a42deccafa793bea7b7e6');
});

test('all sprite poses have visible frames and use aligned strips with the specified timing',()=>{
  const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
  for(const pose of ['idle','cast','hurt','ko','win'])assert(css.includes('.actor[data-pose="'+pose+'"] .pixel-pose[data-pixel-pose="'+pose+'"]'),'missing visible pose '+pose);
  const ends={2:'-50%',3:'-66.666667%',4:'-75%',5:'-80%',6:'-83.333333%'};
  for(const [count,end] of Object.entries(ends)){assert(css.includes('@keyframes pixel-strip-'+count+'{from{transform:translateX(0)}to{transform:translateX('+end+')}}'),'incorrect end point for '+count+' frames');assert(css.includes('steps('+count+',jump-none)'),'missing aligned steps for '+count+' frames');}
  for(const rule of ['animation:pixel-strip-4 1000ms steps(4,jump-none) infinite','animation:pixel-strip-4 480ms steps(4,jump-none) 1 forwards','animation:pixel-strip-2 300ms steps(2,jump-none) 1 forwards','animation:pixel-strip-3 600ms steps(3,jump-none) 1 forwards','animation:pixel-strip-2 700ms steps(2,jump-none) infinite','animation:pixel-strip-6 540ms steps(6,jump-none) 1','animation:pixel-strip-3 420ms steps(3,jump-none) 1'])assert(css.includes(rule),'missing animation timing '+rule);
  assert(css.includes('.actor[data-pose="ko"] .pixel-pose[data-pixel-pose="ko"]{display:block!important}'),'reduced motion must keep a static ko frame');
  assert(css.includes('.actor .pixel-strip,.battle-pixel-effect .pixel-strip{transform:translateX(0)!important}'),'reduced motion must stop sprite strips');
});

test('five role effects are character-specific and defeated hero renders ko without delaying victory screens',()=>{
  const hero=renderP5Combat('hero');assert.equal(typeof hero.effects.play,'function');assert(hero.effects.play('hero',6));
  const slash=hero.elements.get('battle-fx').innerHTML;assert(slash.includes('data-pixel-pose="inkSlash"'));assert(!slash.includes('fx-shot hero'));assert.equal(hero.elements.get('hero-actor').dataset.pose,'cast');
  hero.effects.cancel();assert(hero.effects.play('block',8));const shield=hero.elements.get('battle-fx').innerHTML;assert(shield.includes('data-pixel-pose="bookShield"'));assert(shield.includes('battle-pixel-book-shield'));
  const{PIXEL_CHARACTERS,PIXEL_ART}=boot(),css=html.match(/<style>([\s\S]*?)<\/style>/)[1];assert(css.includes('.battle-pixel-block.battle-pixel-book-shield{left:calc(14.5% + 18px)}'));assert(css.includes('.battle-pixel-block.battle-pixel-book-shield{left:calc(13.5% + 18px)}'));assert(css.includes('.battle-pixel-block.battle-pixel-character-defense{left:calc(14.5% + 18px)}'));assert(css.includes('@media(max-width:849px){.battle-pixel-block.battle-pixel-character-defense{left:clamp(64px,16.5vw,140px);width:64px;height:64px}}'));
  for(const role of ['hero','tank','mage','hermit','teacher']){const other=renderP5Combat(role),character=PIXEL_CHARACTERS[role];assert(other.effects.play('hero',6));const attack=other.elements.get('battle-fx').innerHTML,attackPose=role==='hero'?'inkSlash':'attack';assert(attack.includes('data-pixel-pose="'+attackPose+'"'));assert(attack.includes('data-character="'+role+'"'));assert(attack.includes('data-reduced-frame="'+character.reduced.attack+'"'));assert(!attack.includes('class="fx-shot hero"'));assert(attack.includes(PIXEL_ART.svg(character.fx.attack[0],4,character.palette)));other.effects.cancel();assert(other.effects.play('block',8));const defense=other.elements.get('battle-fx').innerHTML,defensePose=role==='hero'?'bookShield':'defense';assert(defense.includes('data-pixel-pose="'+defensePose+'"'));assert(defense.includes('battle-pixel-character-defense'));assert(defense.includes(PIXEL_ART.svg(character.fx.defense[0],4,character.palette)));}
  const lost=renderedBattle('monster','teacher','hero');lost.game.run.hp=0;lost.game.run.battle.defeated=true;lost.game.onChange();const battleMarkup=lost.elements.get('screen').innerHTML;assert(battleMarkup.includes('id="hero-actor" data-pose="ko"'));assert(battleMarkup.includes('aria-label="'+String.fromCharCode(0x52c7,0x8005,0x5716,0x50cf,0x9810,0x7559)+'"'));
  const ordinaryWin=battle('monster');ordinaryWin.game.winBattle();assert.equal(ordinaryWin.game.view,'reward');
  const bossWin=battle('boss');bossWin.game.run.battle.phase=4;bossWin.game.run.battle.completed=[0,1,2,3].map(index=>({index,text:'done'}));bossWin.game.winBattle();assert.equal(bossWin.game.view,'result');
});

test('display-only combat callbacks do not change victory or defeat state, damage, block, or saves',()=>{
  for(const scenario of ['victory','defeat']){const withoutHook=p5CombatOutcome(scenario,false),withHook=p5CombatOutcome(scenario,true);assert.deepEqual(withHook.snapshot,withoutHook.snapshot,scenario+' state changed when display callback was attached');assert(withHook.effects.length>0,scenario+' did not exercise the optional callback');assert.equal(withHook.snapshot.hp,withoutHook.snapshot.hp);assert.equal(withHook.snapshot.enemyHp,withoutHook.snapshot.enemyHp);assert.equal(withHook.snapshot.block,withoutHook.snapshot.block);assert.equal(withHook.snapshot.saved,withoutHook.snapshot.saved);}
});

// P5 fix1 appended regression coverage
test('墨水斬與書頁盾播完停在最後一格直到特效移除',()=>{
  const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
  assert(css.includes('.battle-fx[data-active="hero"] .battle-pixel-hit .pixel-strip-6{animation:pixel-strip-6 540ms steps(6,jump-none) 1 forwards}'));
  assert(css.includes('.battle-fx[data-active="block"] .battle-pixel-book-shield .pixel-strip-3{animation:pixel-strip-3 420ms steps(3,jump-none) 1 forwards}'));
});

test('同一場戰鬥倒下動畫只播一次，重繪顯示靜止末格且不改遊戲資料',()=>{
  const x=renderedBattle('monster','teacher','hero'),g=x.game,b=g.run.battle;g.run.hp=1;b.block=0;b.enemy.attack=1;assert.equal(g.endTurn(),true);assert.equal(b.defeated,true);
  const snapshot=()=>JSON.stringify({game:g,run:g.run,battle:g.run.battle,save:g.storage.getItem('pen-spire-save-v2')}),before=snapshot(),screen=x.elements.get('screen');
  assert.match(screen.innerHTML,/id="hero-actor" data-pose="ko" role="img"/);assert(!screen.innerHTML.includes('data-ko-played="true"'));
  g.onChange();assert.match(screen.innerHTML,/id="hero-actor" data-pose="ko" data-ko-played="true" role="img"/);assert.equal(snapshot(),before);
  const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];assert(css.includes('.actor[data-pose="ko"][data-ko-played="true"] .pixel-pose[data-pixel-pose="ko"] .pixel-strip-3{animation:none;transform:translateX(-66.666667%)}'));
});

test('減少動態時倒下姿勢直接顯示仰躺最後一格',()=>{
  const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];assert(css.includes('@media(prefers-reduced-motion:reduce){.actor[data-pose="ko"] .pixel-pose[data-pixel-pose="ko"] .pixel-strip-3{transform:translateX(-66.666667%)!important}}'));
});

test('窄畫面書頁盾套用縮小與定位規則',()=>{
  const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];assert(css.includes('@media(max-width:849px){.battle-pixel-block.battle-pixel-book-shield{left:clamp(64px,16.5vw,140px);width:64px;height:64px}}'));
});

test('減少動態時墨水斬與勇者出招靜止在第三格，出招與受擊姿勢可見',()=>{
  const css=html.match(/<style>([\s\S]*?)<\/style>/)[1],block='@media(prefers-reduced-motion:reduce){.actor[data-pose="cast"] .pixel-pose[data-pixel-pose="cast"],.actor[data-pose="hurt"] .pixel-pose[data-pixel-pose="hurt"]{display:block!important}';
  assert(css.includes(block),'reduced motion must show cast and hurt poses');
  assert(css.includes('.actor[data-pose="cast"] .pixel-pose[data-pixel-pose="idle"],.actor[data-pose="hurt"] .pixel-pose[data-pixel-pose="idle"]{display:none!important}'),'idle must hide while cast or hurt is shown');
  assert(css.includes('.actor[data-pose="cast"] .pixel-pose[data-pixel-pose="cast"] .pixel-strip-4{transform:translateX(-50%)!important}'),'hero cast must stay on third of four frames');
  assert(css.includes('.battle-pixel-ink-slash .pixel-strip-6{transform:translateX(-33.333333%)!important}'),'ink slash must stay on third of six frames');
  assert(css.indexOf('.battle-pixel-ink-slash .pixel-strip-6{transform:translateX(-33.333333%)!important}')>css.indexOf('.actor .pixel-strip,.battle-pixel-effect .pixel-strip{transform:translateX(0)!important}'),'third-frame rules must come after the first-frame reset');
});

test('減少動態時勇者出招切到出招姿勢、怪物與勇者受擊切到受擊姿勢，並顯示墨水斬',()=>{
  const x=renderedBattleWithReducedMotion();
  assert(x.effects.play('hero',9));
  assert.equal(x.elements.get('hero-actor').dataset.pose,'cast');assert.equal(x.elements.get('enemy-actor').dataset.pose,'hurt');
  assert.match(x.elements.get('battle-fx').innerHTML,/battle-pixel-ink-slash/);
  x.effects.cancel();
  assert(x.effects.play('monster',4));
  assert.equal(x.elements.get('hero-actor').dataset.pose,'hurt');
  assert.equal(x.elements.get('battle-fx').dataset.active,'monster');
  x.effects.cancel();
  assert.equal(x.elements.get('hero-actor').dataset.pose,'idle');
});


function renderS1P5Motion(char='hero',reduced=false){
  const elements=new Map(),listeners=new Map(),element=id=>{if(!elements.has(id))elements.set(id,{id,innerHTML:'',textContent:'',dataset:{},clientWidth:1280,open:false,addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},focus(){},scrollIntoView(){}});return elements.get(id);};
  const document={getElementById:element,querySelectorAll:()=>[],addEventListener:(type,listener)=>listeners.set(type,listener),activeElement:null};
  const context=vm.createContext({console,document,window:{localStorage:memory()},requestAnimationFrame:()=>0,cancelAnimationFrame(){},addEventListener(){},clearTimeout(){},setTimeout:()=>0,matchMedia:query=>({matches:reduced&&query.includes('prefers-reduced-motion: reduce')}),innerWidth:1280});
  vm.runInContext(source,context);const game=context.game;game.meta.wins=2;game.meta.hermit=true;assert(game.startRun(char,123));game.run.current='0-0';game.startBattle('monster','teacher');return{game,elements,effects:context.PenSpireEffects,api:context.PenSpire,storage:game.storage};
}
function s1p5ActorMarkup(markup,id){const at=markup.indexOf('id="'+id+'"');assert(at>=0,id+' exists');const start=markup.lastIndexOf('<div',at),end=markup.indexOf('</div>',at);return markup.slice(start,end+6);}

function p5ExtractCommentedAssignedObject(source,marker){
  const markerAt=source.indexOf(marker);assert.notEqual(markerAt,-1,'missing source art marker '+marker);const openAt=source.indexOf('{',markerAt),closeAt=source.indexOf('\n};',openAt);assert(openAt>=0&&closeAt>=0,'could not bound commented art object '+marker);return JSON.parse(source.slice(openAt,closeAt+2).replace(/^\s*\/\/[^\n]*(?:\n|$)/gm,''));
}
test('四角色素材逐字符合定版預覽並維持格數與調色盤鍵',()=>{
  const preview=fs.readFileSync(new URL('../art/pixel-preview.html',import.meta.url),'utf8'),approved=p5ExtractCommentedAssignedObject(preview,'window.CHAR_V2_ART ='),api=boot();
  assert.deepEqual(normal(api.CHAR_V2_ART),approved);
  const counts={idle:4,cast:4,hurt:2,ko:3,win:2},reduced={tank:3,mage:4,hermit:4,teacher:3};
  for(const id of ['tank','mage','hermit','teacher']){const character=approved[id],runtime=api.PIXEL_CHARACTERS[id],keys=new Set(['.',...Object.keys(character.palette)]);assert.deepEqual(normal(runtime.palette),character.palette);assert.deepEqual(Object.fromEntries(Object.entries(counts).map(([pose])=>[pose,character[pose].length])),counts);assert.equal(Object.keys(character.palette).length<=16,true,id+' palette exceeds 16 colors');assert.deepEqual(character.reduced,{attack:reduced[id]});assert.equal(character.fx.attack.length,6);assert.equal(character.fx.defense.length,3);for(const frames of [...Object.values(character).filter(Array.isArray),...Object.values(character.fx)])for(const frame of frames){assert.equal(frame.length,32,id+' frame height');for(const row of frame){assert.equal(row.length,32,id+' frame width');for(const key of row)assert(keys.has(key),id+' unknown palette key '+key);}}}
});

test('減少動態時五角色仍顯示出招、受擊與各自的靜止特效代表格',()=>{
  const css=html.slice(html.indexOf('<style>')+7,html.indexOf('</style>')),reset='.actor .pixel-strip,.battle-pixel-effect .pixel-strip{transform:translateX(0)!important}';assert(css.includes(reset));assert(css.includes('.actor[data-pose="cast"] .pixel-pose[data-pixel-pose="cast"] .pixel-strip-4{transform:translateX(-50%)!important}'));assert(css.includes('.actor[data-pose="ko"] .pixel-pose[data-pixel-pose="ko"] .pixel-strip-3{transform:translateX(-66.666667%)!important}'));assert(css.includes('.battle-pixel-character-defense .pixel-strip-3{transform:translateX(0)!important}'));
  const offsets={3:'-33.333333%',4:'-50%'};
  for(const role of ['hero','tank','mage','hermit','teacher']){const x=renderS1P5Motion(role,true),character=x.api.PIXEL_CHARACTERS[role],frame=character.reduced.attack,rule='.battle-pixel-character-attack[data-reduced-frame="'+frame+'"] .pixel-strip-6{transform:translateX('+offsets[frame]+')!important}';assert(css.includes(rule),role+' representative frame CSS');assert(css.indexOf(rule)>css.indexOf(reset));assert(x.effects.play('hero',9));assert.equal(x.elements.get('hero-actor').dataset.pose,'cast');assert.equal(x.elements.get('enemy-actor').dataset.pose,'hurt');const attack=x.elements.get('battle-fx').innerHTML;assert(attack.includes('data-reduced-frame="'+frame+'"'));assert(!attack.includes('class="fx-shot hero"'));x.effects.cancel();assert(x.effects.play('block',8));const defense=x.elements.get('battle-fx').innerHTML;assert(defense.includes('data-reduced-frame="1"'));assert(defense.includes(x.api.PIXEL_ART.svg(character.fx.defense[0],4,character.palette)));x.effects.cancel();assert(x.effects.play('monster',4));assert.equal(x.elements.get('hero-actor').dataset.pose,'hurt');const monsterId=x.api.monsterIdForBattle(x.game.run.battle),monsterArt=x.api.MONSTER_V2_ART[monsterId],monsterFx=x.elements.get('battle-fx').innerHTML;assert(monsterFx.includes('class="battle-pixel-effect battle-pixel-monster-fx"'));assert(monsterFx.includes(x.api.PIXEL_ART.svg(monsterArt.fx[0],4,monsterArt.palette)));assert(!monsterFx.includes('fx-shot monster'));}
});

test('五角色倒下只播一次、重繪停末格且不改戰鬥資料',()=>{
  for(const role of ['hero','tank','mage','hermit','teacher']){const x=renderS1P5Motion(role,false),g=x.game,b=g.run.battle,character=x.api.PIXEL_CHARACTERS[role];g.run.hp=1;b.block=0;b.enemy.attack=1;assert.equal(g.endTurn(),true,role+' defeat turn');assert.equal(b.defeated,true);const snapshot=()=>JSON.stringify({run:normal(g.run),saved:x.storage.getItem(x.api.SAVE_KEY)}),before=snapshot(),first=s1p5ActorMarkup(x.elements.get('screen').innerHTML,'hero-actor');assert(first.includes('data-pose="ko"'));assert(!first.includes('data-ko-played="true"'));assert(first.includes(x.api.PIXEL_ART.svg(character.ko[0],4,character.palette)));g.onChange();const second=s1p5ActorMarkup(x.elements.get('screen').innerHTML,'hero-actor');assert(second.includes('data-ko-played="true"'));assert.equal(snapshot(),before,role+' redraw changed saved battle');}
});

test('五角色同種子同出牌時特效回呼不改數值或存檔',()=>{
  const outcome=(role,withDisplay)=>{const x=renderS1P5Motion(role,false),g=x.game,b=g.run.battle;if(withDisplay)g.onCombatEffect=(side,amount)=>x.effects.play(side,amount);b.enemy.hp=b.enemy.maxHp=1000;putParagraph(x,0);assert.equal(g.submit(),true,role+' deterministic submit');assert.equal(g.endTurn(),true,role+' deterministic turn');return normal({run:g.run,view:g.view,saved:x.storage.getItem(x.api.SAVE_KEY)});};
  for(const role of ['hero','tank','mage','hermit','teacher'])assert.deepEqual(outcome(role,true),outcome(role,false),role+' visual effect changed state');
});

function s1p5FirstPoseSvg(markup,id,pose='idle'){
  const actor=s1p5ActorMarkup(markup,id),quote=String.fromCharCode(34),needle='data-pixel-pose='+quote+pose+quote,poseAt=actor.indexOf(needle);
  assert(poseAt>=0,id+' has pose '+pose);const start=actor.indexOf('<svg',poseAt),end=actor.indexOf('</svg>',start);assert(start>=0&&end>start,id+' has SVG for '+pose);return actor.slice(start,end+6);
}

test('ordinary monster uses topic-selected idle and hurt frames, never role or other monster idle art',()=>{
  const x=renderS1P5Motion('hero',false),api=x.api,roster=api.MONSTER_V2_ART,monsterId=api.monsterIdForBattle(x.game.run.battle),art=roster[monsterId],markup=x.elements.get('screen').innerHTML;
  assert(markup.includes('data-monster-id="'+monsterId+'"'));
  const idle=s1p5FirstPoseSvg(markup,'enemy-actor','idle');assert.equal(idle,api.PIXEL_ART.svg(art.idle[0],4,art.palette));
  for(const[role,character]of Object.entries(api.PIXEL_CHARACTERS))assert.notEqual(idle,api.PIXEL_ART.svg(character.idle[0],4,character.palette),'ordinary monster reused '+role+' idle frame');
  for(const[otherId,other]of Object.entries(roster))if(otherId!==monsterId){const otherIdle=other.idle?other.idle[0]:other.idlePhases[0][0];assert.notEqual(idle,api.PIXEL_ART.svg(otherIdle,4,other.palette),'ordinary monster reused '+otherId+' idle frame');}
  assert(x.effects.play('hero',6));assert.equal(x.elements.get('enemy-actor').dataset.pose,'hurt');
  assert.equal(s1p5FirstPoseSvg(markup,'enemy-actor','hurt'),api.PIXEL_ART.svg(art.hurt[0],4,art.palette));x.effects.cancel();
});

test('each role battle actor uses its own idle frame',()=>{
  for(const role of ['hero','tank','mage','hermit','teacher']){
    const x=renderS1P5Motion(role,false),api=x.api,characters=api.PIXEL_CHARACTERS,shown=s1p5FirstPoseSvg(x.elements.get('screen').innerHTML,'hero-actor','idle');
    assert.equal(shown,api.PIXEL_ART.svg(characters[role].idle[0],4,characters[role].palette),role+' must use its own idle frame');
    for(const[other,character]of Object.entries(characters))if(other!==role)assert.notEqual(shown,api.PIXEL_ART.svg(character.idle[0],4,character.palette),role+' reused '+other+' idle frame');
  }
});

test('unknown character ids do not fall back to hero art',()=>{
  const x=renderS1P5Motion('hero',false);assert.throws(()=>x.api.pixelSprite('unknown-character'),/Unknown pixel character: unknown-character/);
});


function p5ExtractAssignedObjectSource(source,marker){
  const markerAt=source.indexOf(marker);assert.notEqual(markerAt,-1,'missing source art marker '+marker);
  const openAt=source.indexOf('{',markerAt),closeAt=source.indexOf('\n};',openAt);assert(openAt>=0&&closeAt>=0,'could not bound source art object '+marker);
  return source.slice(openAt,closeAt+2);
}

test('七隻怪物矩陣逐字符合定版預覽並維持格數與調色盤鍵',()=>{
  const preview=fs.readFileSync(new URL('../art/pixel-preview.html',import.meta.url),'utf8'),api=boot(),approvedSource=p5ExtractAssignedObjectSource(preview,'window.MONSTER_V2_ART ='),embeddedSource=p5ExtractAssignedObjectSource(html,'const MONSTER_V2_ART =');
  assert.equal(embeddedSource,approvedSource,'monster art matrix source bytes differ from the pinned preview');
  assert.deepEqual(normal(api.MONSTER_V2_ART),JSON.parse(approvedSource));
  const tiers={monster:['slime','typo','doodle','eraser'],elite:['glitchKnight','owl'],boss:['blankPage']};
  for(const[tier,ids]of Object.entries(tiers))for(const id of ids){const art=api.MONSTER_V2_ART[id];assert.equal(art.tier,tier,id+' tier');assert.equal(Object.keys(art.palette).length<=16,true,id+' palette has more than 16 colors');assert.equal(art.attack.length,4,id+' attack frames');assert.equal(art.hurt.length,2,id+' hurt frames');assert.equal(art.ko.length,3,id+' ko frames');assert.equal(art.fx.length,5,id+' fx frames');if(id==='blankPage')assert.deepEqual(normal(art.idlePhases.map(phase=>phase.length)),[2,2,2,2]);else assert.equal(art.idle.length,4,id+' idle frames');
    const frames=[...(art.idle||[]),...(art.idlePhases||[]).flat(),...art.attack,...art.hurt,...art.ko,...art.fx],keys=new Set(['.',...Object.keys(art.palette)]);
    for(const frame of frames){assert.equal(frame.length,32,id+' frame height');for(const row of frame){assert.equal(row.length,32,id+' frame width');for(const key of row)assert(keys.has(key),id+' unknown palette key '+key);}}
  }
});

test('怪物依題目雜湊固定選擇且完全不消耗亂數',()=>{
  const x=battle('monster','teacher'),api=x,game=x.game;
  const tiers={monster:new Set(['slime','typo','doodle','eraser']),elite:new Set(['glitchKnight','owl']),boss:new Set(['blankPage'])};
  for(const topic of x.TOPICS)for(const type of ['monster','elite','boss']){const before=game.run.rng,battleInfo={type,topicId:topic.id},first=api.monsterIdForBattle(battleInfo);assert(tiers[type].has(first),type+'/'+topic.id+' selected an illegal monster id');assert.equal(api.monsterIdForBattle(battleInfo),first,type+'/'+topic.id+' changed its monster id');assert.equal(game.run.rng,before,type+'/'+topic.id+' consumed random state');}
  const before=game.run.rng;for(let i=0;i<20;i++)api.monsterIdForBattle(game.run.battle);assert.equal(game.run.rng,before,'repeated same-topic selection changed random state');
});

test('普通怪與菁英戰鬥畫面使用所選怪物待機首格且不借用其他角色或怪物',()=>{
  const topicIds=boot().TOPICS.map(topic=>topic.id),roleArt=boot().PIXEL_CHARACTERS;
  for(const type of ['monster','elite'])for(const topicId of topicIds){const x=renderedBattle(type,topicId,'hero'),api=x.api,b=x.game.run.battle,id=api.monsterIdForBattle(b),art=api.MONSTER_V2_ART[id],markup=x.elements.get('screen').innerHTML;assert(markup.includes('data-monster-id="'+id+'"'));const shown=s1p5FirstPoseSvg(markup,'enemy-actor','idle');assert.equal(shown,api.PIXEL_ART.svg(art.idle[0],4,art.palette),type+'/'+topicId+' selected idle frame');for(const[role,character]of Object.entries(roleArt))assert.notEqual(shown,api.PIXEL_ART.svg(character.idle[0],4,character.palette),type+'/'+topicId+' reused role '+role);for(const[otherId,other]of Object.entries(api.MONSTER_V2_ART))if(otherId!==id){const idle=other.idle?other.idle[0]:other.idlePhases[0][0];assert.notEqual(shown,api.PIXEL_ART.svg(idle,4,other.palette),type+'/'+topicId+' reused monster '+otherId);}}
});

test('頭目待機外觀逐階段跟著戰鬥 phase 並把超界階段限制在最後一階',()=>{
  const x=renderedBattle('boss','teacher','hero'),api=x.api,b=x.game.run.battle,art=api.MONSTER_V2_ART.blankPage;
  for(let phase=0;phase<4;phase++){b.phase=phase;x.game.onChange();const markup=x.elements.get('screen').innerHTML;assert(markup.includes('data-monster-id="blankPage"'));assert.equal(s1p5FirstPoseSvg(markup,'enemy-actor','idle'),api.PIXEL_ART.svg(art.idlePhases[phase][0],4,art.palette),'boss phase '+phase);}
  b.phase=4;x.game.onChange();assert.equal(s1p5FirstPoseSvg(x.elements.get('screen').innerHTML,'enemy-actor','idle'),api.PIXEL_ART.svg(art.idlePhases[3][0],4,art.palette),'boss phase above 3 must clamp to phase 3');
});

test('怪物攻擊疊上該怪物五格特效、攻擊動作 480ms 且全格擋不切勇者受擊',()=>{
  const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
  assert(css.includes('.actor[data-pose="attack"] .pixel-pose[data-pixel-pose="attack"] .pixel-strip-4{animation:pixel-strip-4 480ms steps(4,jump-none) 1 forwards}'));
  assert(css.includes('.battle-fx[data-active="monster"] .battle-pixel-monster-fx .pixel-strip-5{animation:pixel-strip-5 450ms steps(5,jump-none) 1 forwards}'));
  for(const type of ['monster','elite','boss']){const x=renderedBattle(type,'teacher','hero'),api=x.api,b=x.game.run.battle,id=api.monsterIdForBattle(b),art=api.MONSTER_V2_ART[id];assert(x.effects.play('monster',4));assert.equal(x.elements.get('enemy-actor').dataset.pose,'attack',type+' attack pose');assert.equal(x.elements.get('hero-actor').dataset.pose,'hurt',type+' hurt pose');const fx=x.elements.get('battle-fx').innerHTML;assert(fx.includes('class="battle-pixel-effect battle-pixel-monster-fx"'));assert(fx.includes('data-monster-id="'+id+'"'));assert(fx.includes(api.PIXEL_ART.svg(art.fx[0],4,art.palette)));assert(!fx.includes('fx-shot monster'));x.effects.cancel();assert(x.effects.play('monster',0));assert.equal(x.elements.get('enemy-actor').dataset.pose,'attack');assert.equal(x.elements.get('hero-actor').dataset.pose,'idle',type+' blocked hit must not set hurt');assert(x.elements.get('battle-fx').innerHTML.includes(api.PIXEL_ART.svg(art.fx[0],4,art.palette)));x.effects.cancel();}
});

test('角色攻擊讓普通怪、菁英與頭目都切換受擊姿勢',()=>{
  for(const type of ['monster','elite','boss']){const x=renderedBattle(type,'teacher','hero'),api=x.api,id=api.monsterIdForBattle(x.game.run.battle),art=api.MONSTER_V2_ART[id],markup=x.elements.get('screen').innerHTML;assert(x.effects.play('hero',6));assert.equal(x.elements.get('enemy-actor').dataset.pose,'hurt',type+' hurt pose');assert.equal(s1p5FirstPoseSvg(markup,'enemy-actor','hurt'),api.PIXEL_ART.svg(art.hurt[0],4,art.palette),type+' hurt frame');x.effects.cancel();}
});

test('減少動態時怪物攻擊、命中特效與受擊姿勢都停在指定代表格',()=>{
  const x=renderS1P5Motion('hero',true),api=x.api,css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
  assert(css.includes('.actor[data-pose="attack"] .pixel-pose[data-pixel-pose="attack"] .pixel-strip-4{transform:translateX(-50%)!important}'));
  assert(css.includes('.battle-pixel-monster-fx .pixel-strip-5{transform:translateX(-40%)!important}'));
  assert(css.includes('.actor[data-pose="hurt"] .pixel-pose[data-pixel-pose="hurt"] .pixel-strip-2{transform:translateX(0)!important}'));
  assert(x.effects.play('monster',4));assert.equal(x.elements.get('enemy-actor').dataset.pose,'attack');assert.equal(x.elements.get('hero-actor').dataset.pose,'hurt');assert(x.elements.get('battle-fx').innerHTML.includes('data-reduced-frame="3"'));assert(!x.elements.get('battle-fx').innerHTML.includes('fx-shot monster'));x.effects.cancel();
});

test('怪物繪圖函式遇到未知 id 會明確丟錯',()=>{
  const x=renderedBattle('monster','teacher','hero');assert.throws(()=>x.api.pixelMonsterSprite('unknown-monster'),/Unknown pixel monster: unknown-monster/);
});


test('ICON_V2_ART 逐字符合定版預覽並維持十個十六乘十六圖示與調色盤鍵',()=>{
  const preview=fs.readFileSync(new URL('../art/pixel-preview.html',import.meta.url),'utf8'),api=boot(),approvedSource=p5ExtractAssignedObjectSource(preview,'window.ICON_V2_ART ='),embeddedSource=p5ExtractAssignedObjectSource(html,'const ICON_V2_ART =');
  assert.equal(embeddedSource,approvedSource,'icon art matrix source bytes differ from the pinned preview');
  assert.deepEqual(normal(api.ICON_V2_ART),JSON.parse(approvedSource));
  const icons=api.ICON_V2_ART.icons,expected=['boss','camp','defend','elite','focus','heal','material','monster','shop','strike'];
  assert.deepEqual(Object.keys(icons).sort(),expected);
  assert.equal(Object.keys(api.ICON_V2_ART.palette).length,16);
  const keys=new Set(['.',...Object.keys(api.ICON_V2_ART.palette)]);
  for(const[id,rows]of Object.entries(icons)){assert.equal(rows.length,16,id+' height');for(const row of rows){assert.equal(row.length,16,id+' width');for(const key of row)assert(keys.has(key),id+' unknown palette key '+key);}}
});

test('卡片標題在手牌、草稿、商店、營火升級與獎勵都帶對應圖示',()=>{
  const x=renderedBattle('monster','teacher','hero'),g=x.game,b=g.run.battle,names={strike:'筆鋒打擊',defend:'穩住心神',focus:'整理思路',heal:'喝口水',material:'句子素材'},types=Object.keys(names),sentence=g.topic().bank.find(item=>item.allowed.includes(b.target));
  assert(sentence,'material card fixture has a usable sentence');
  const cards=types.map(type=>type==='material'?cardFor(g,sentence,'icon-material'):{id:'icon-'+type,type,topicId:g.topic().id,level:0,sentence:'測試戰術牌',damageSpent:false});
  b.hand=cards;b.draft=[{...cards.find(card=>card.type==='material'),id:'icon-draft-material',damageSpent:true}];g.onChange();
  const hand=x.elements.get('hand-zone').innerHTML;
  for(const type of types){const start=hand.indexOf('data-card-id="icon-'+type+'"'),end=hand.indexOf('</article>',start);assert(start>=0&&end>start,type+' card rendered');const card=hand.slice(start,end);assert(card.includes('data-icon="'+type+'" width="16" height="16"'),type+' card icon size');assert(card.includes('<span class="card-title-text">'+names[type]+'</span>'),type+' card title text');assert(card.includes('aria-hidden="true"'),type+' card icon is decorative');const button=card.match(/<button type="button" class="card-main"[^>]*>/);assert(button&&button[0].includes('aria-label="使用'+names[type]+'：'),type+' accessible card label remains text-only');}
  const draftStart=hand.indexOf('data-card-id="icon-draft-material"'),draftEnd=hand.indexOf('</article>',draftStart),draft=hand.slice(draftStart,draftEnd);assert(draft.includes('data-icon="material" width="16" height="16"'),'draft card icon');
  g.run.view=g.view='shop';g.onChange();const shop=x.elements.get('screen').innerHTML;
  for(const type of ['material','defend','focus','heal'])assert(shop.includes('data-icon="'+type+'" width="16" height="16"'),'shop offer '+type);
  g.run.reward=types;g.run.view=g.view='reward';g.onChange();const reward=x.elements.get('screen').innerHTML;
  for(const type of types)assert(reward.includes('data-icon="'+type+'" width="16" height="16"'),'reward offer '+type);
  g.run.deck=cards;g.run.view=g.view='camp';g.onChange();x.clickAction('camp-upgrade-dialog');const camp=x.elements.get('dialog-body').innerHTML;
  for(const type of types)assert(camp.includes('data-icon="'+type+'" width="16" height="16"'),'camp upgrade '+type);
});

test('地圖節點與圖例使用五種像素圖示並保留節點名稱與無障礙標籤',()=>{
  const hex=boot().generateMap(271828),legacy=legacyMap(1234),cases=[[hex,true],[legacy,false]],types=['monster','elite','camp','shop','boss'],names={monster:'普通怪',elite:'菁英怪',camp:'營火',shop:'商店',boss:'最終頭目'};
  for(const[original,isHex]of cases){const map=normal(original);map[0][0].type='monster';map[1][0].type='elite';map[2][0].type='camp';map[3][0].type='shop';map[9][0].type='boss';const output=renderMapHTML(map);assert.equal(output.includes('class="node hex-node'),isHex);assert(output.includes('每次只能前往相鄰且亮起的格子'));
    for(const type of types){assert(output.includes('data-icon="'+type+'" width="24" height="24"'),type+' map node icon');assert(output.includes('data-icon="'+type+'" width="16" height="16"'),type+' map legend icon');assert(output.includes(names[type]),type+' map node text');}
    assert.doesNotMatch(output,/[◆✦▥♨♛]/,'map view has no legacy node glyphs');
    for(const node of map.flat()){const marker='id="node-'+node.id+'"',position=output.indexOf(marker);assert(position>=0,'missing rendered node '+node.id);const tagStart=output.lastIndexOf('<button',position),tagEnd=output.indexOf('>',position),tag=output.slice(tagStart,tagEnd+1),aria=tag.match(/aria-label="([^"]*)"/);assert(aria,'node has an accessible label '+node.id);assert(aria[1].includes(names[node.type]),'node label preserves '+node.type);assert(!aria[1].includes('data-icon'),'node label excludes decorative icon metadata');}
  }
});

test('像素圖示繪圖函式遇到未知 id 會明確丟錯',()=>{
  const api=boot();assert.throws(()=>api.pixelIconSvg('unknown-icon'),/Unknown pixel icon: unknown-icon/);
});

test('同一種子戰鬥資料在重新繪製像素圖示前後與存檔相同',()=>{
  const x=renderedBattle('monster','teacher','hero'),g=x.game,api=x.api,beforeRun=normal(g.run),beforeMeta=normal(g.meta),beforeLog=normal(g.battleLog),beforeSave=g.storage.getItem(api.SAVE_KEY);
  g.onChange();
  assert.deepEqual(normal(g.run),beforeRun);
  assert.deepEqual(normal(g.meta),beforeMeta);
  assert.deepEqual(normal(g.battleLog),beforeLog);
  assert.equal(g.storage.getItem(api.SAVE_KEY),beforeSave);
});

test('試玩網址參數只接受 unlock=all 且不改變既有解鎖條件',()=>{
  const roles=['hero','tank','mage','hermit','teacher'];
  const regular=boot();
  assert.equal(regular.trialEnabled(),false);
  assert.deepEqual(roles.filter(id=>regular.game.unlocked(id)),['hero']);
  const context=vm.createContext({console,location:{search:'?unlock=all'},URLSearchParams});
  vm.runInContext(source,context);const api=context.PenSpire,game=new api.Game(memory());
  const before=JSON.stringify(normal(game.meta));
  assert.equal(api.trialEnabled(),true);
  assert.deepEqual(roles.filter(id=>game.unlocked(id)),roles);
  assert.equal(game.unlocked('unknown-role'),false);
  assert.equal(JSON.stringify(normal(game.meta)),before);
  for(const search of ['?unlock=ALL','?unlock=1','?unlock=']){
    context.location={search};
    assert.equal(api.trialEnabled(),false,search);
    assert.deepEqual(roles.filter(id=>game.unlocked(id)),['hero'],search);
  }
  const broken=vm.createContext({console,location:{get search(){throw new Error('location unreadable');}}});
  vm.runInContext(source,broken);assert.equal(broken.PenSpire.trialEnabled(),false);
});

test('試玩模式讀取舊存檔後完整操作仍不呼叫任何存檔寫入',()=>{
  const fixture=boot();fixture.game.meta.ink=37;fixture.game.selected='teacher';assert(fixture.game.save());
  const original=fixture.storage.getItem(fixture.SAVE_KEY),storage=memory(original);
  let setItems=0,removeItems=0;const setItem=storage.setItem;
  storage.setItem=(key,value)=>{setItems++;return setItem(key,value);};
  storage.removeItem=key=>{removeItems++;storage.db.delete(key);};
  const context=vm.createContext({console,location:{search:'?unlock=all'},URLSearchParams});
  vm.runInContext(source,context);const game=new context.PenSpire.Game(storage);
  assert.equal(game.selected,'teacher');assert.equal(game.meta.ink,37);
  assert.equal(storage.getItem('pen-spire-save-v2'),original);
  const roles=['hero','tank','mage','hermit','teacher'];
  for(let i=0;i<roles.length;i++){
    assert(game.startRun(roles[i],9000+i),roles[i]+' starts in trial mode');
    assert.equal(game.run.charId,roles[i]);
    assert(game.finish(false),roles[i]+' can finish a trial run');
  }
  assert(game.startRun('teacher',91001));
  const firstNode=game.run.available[0];game.node(firstNode).type='monster';assert(game.enterNode(firstNode));
  const playable=game.run.battle.hand.find(card=>game.cost(card)<=game.run.battle.energy);
  assert(playable,'battle has a playable card');assert(game.play(playable.id));assert(game.endTurn());
  game.winBattle();assert.equal(game.run.view,'reward');assert(game.reward('skip'));
  const shopNode=game.run.available[0];game.node(shopNode).type='shop';assert(game.enterNode(shopNode));
  assert(game.buy('potion'));assert(game.completeNode());
  const campNode=game.run.available[0];game.node(campNode).type='camp';assert(game.enterNode(campNode));
  assert(game.camp('heal'));assert(game.finish(false));
  assert.equal(setItems,0,'trial actions must not call setItem');
  assert.equal(removeItems,0,'trial actions must not call removeItem');
  assert.equal(storage.getItem('pen-spire-save-v2'),original,'existing save bytes stay identical');
});

test('auto=1 與 unlock=all 同用時五角色都能啟動示範且結束後存檔不變',()=>{
  const fixture=boot();fixture.game.selected='teacher';assert(fixture.game.save());
  const original=fixture.storage.getItem(fixture.SAVE_KEY),storage=memory(original);
  let setItems=0,removeItems=0;const setItem=storage.setItem;
  storage.setItem=(key,value)=>{setItems++;return setItem(key,value);};
  storage.removeItem=key=>{removeItems++;storage.db.delete(key);};
  const context=vm.createContext({console,location:{search:'?auto=1&unlock=all'},URLSearchParams});
  vm.runInContext(source,context);const api=context.PenSpire,game=new api.Game(storage);
  assert.equal(api.demoEnabled(),true);assert.equal(api.trialEnabled(),true);
  for(const [index,role] of ['hero','tank','mage','hermit','teacher'].entries()){
    assert(game.startDemo(role,100+index),role+' starts demo');
    assert.equal(game.run.charId,role);assert(game.endDemo());
  }
  assert.equal(setItems,0);assert.equal(removeItems,0);
  assert.equal(storage.getItem(api.SAVE_KEY),original);
});

test('試玩提示只在試玩模式顯示，與自動示範並用時兩個提示都可見',()=>{
  const regular=renderedDemoApp();regular.game.onChange();
  assert(!regular.elements.get('hud').innerHTML.includes('試玩模式・不存檔'));
  const trial=renderedDemoApp();
  Object.assign(Object.getPrototypeOf(trial.api),{location:{search:'?unlock=all'},URLSearchParams});
  trial.game.onChange();const trialHud=trial.elements.get('hud').innerHTML;
  assert(trialHud.includes('試玩模式・不存檔'));assert(trialHud.includes('本次未保存'));assert(!trialHud.includes('已本機保存'));
  const combo=renderedDemoApp();
  Object.assign(Object.getPrototypeOf(combo.api),{location:{search:'?auto=1&unlock=all'},URLSearchParams});
  assert(combo.game.startDemo('teacher',101));
  const hud=combo.elements.get('hud').innerHTML;
  assert(hud.includes('自動示範中・不存檔'));assert(hud.includes('試玩模式・不存檔'));
  assert.equal(combo.elements.get('app').dataset.trial,'true');
  assert.equal(combo.elements.get('hud').clientWidth,390);
  assert.match(html,/#demo-bar\{[^}]*flex-wrap:wrap[^}]*white-space:normal/);
  assert.match(html,/#demo-bar \.trial-status\{font-size:12px\}/);
});

test('試玩模式不擴大勇者、坦克、法師的提示或無障礙屬性',()=>{
  for(const role of ['hero','tank','mage']){
    const x=renderedBattle('monster','teacher',role),proto=Object.getPrototypeOf(x.api);
    Object.assign(proto,{location:{search:'?unlock=all'},URLSearchParams});x.game.onChange();
    const topic=x.game.topic(),hints=x.game.hints();
    const rendered=x.elements.get('screen').innerHTML+x.elements.get('hand-zone').innerHTML+x.elements.get('action-zone').innerHTML;
    const attributes=renderedAttributes(rendered);
    assert.equal(hints.genre,'');assert.equal(hints.formula,'');assert.equal(hints.cards.length,0);
    assert.deepEqual(normal(hints.cardHints),{});assert(!rendered.includes(' → '));
    for(const token of [topic.genre,...topic.paragraphs.map(p=>p.label)]){
      assert(!rendered.includes(token),role+' rendered text leaked '+token);
      assert(!attributes.some(value=>value.includes(token)),role+' attribute leaked '+token);
    }
  }
});

test('試玩頁首樣式只在試玩模式啟用並隨內容增高',()=>{
  const regular=renderedDemoApp();regular.game.onChange();
  assert.equal(regular.elements.get('app').dataset.trial,'false');
  const auto=renderedDemoApp();Object.assign(Object.getPrototypeOf(auto.api),{location:{search:'?auto=1'},URLSearchParams});
  assert(auto.game.startDemo('hero',7));
  assert.equal(auto.elements.get('app').dataset.trial,'false');
  assert(!auto.elements.get('hud').innerHTML.includes('試玩模式・不存檔'));
  const style=html.match(/<style>([\s\S]*?)<\/style>/)[1];
  const trialStatusRules=[...style.matchAll(/([^{}]+)\{[^{}]*\}/g)].map(match=>match[1].trim()).filter(selector=>selector.includes('.trial-status'));
  assert(trialStatusRules.length>0);
  for(const group of trialStatusRules)for(const selector of group.split(','))assert.match(selector,/#app\[data-trial=true\]/,'試玩標籤樣式必須限定在試玩模式');
  assert.match(style,/#app\[data-trial=true\]\{grid-template-rows:minmax\(52px,auto\) minmax\(0,1fr\) 0 0\}/);
  assert.match(style,/#app\[data-trial=true\]\[data-view="battle"\]\{grid-template-rows:minmax\(52px,auto\) minmax\(0,42fr\) minmax\(0,42fr\) minmax\(0,8fr\)\}/);
  assert.match(style,/#app\[data-trial=true\] #hud\{[^}]*flex-wrap:nowrap[^}]*white-space:nowrap/);
  assert.match(style,/#app\[data-trial=true\]\[data-demo=true\] #hud \.brand\{display:block\}/);
});

function metaBattle(type='monster',char='hero',levels={},topic='teacher'){
  const x=boot(),g=x.game;
  g.meta.wins=2;g.meta.hermit=true;Object.assign(g.meta,levels);
  assert.equal(g.startRun(char,123),true);
  g.run.current='0-0';
  assert.equal(g.startBattle(type,topic),true);
  return x;
}
function metaParagraphCards(game,topic,index,prefix){
  const used=new Set();
  return topic.paragraphs[index].pattern.map((kind,i)=>{const sentence=topic.bank.find(item=>item.kind===kind&&item.allowed.includes(index)&&!used.has(item.id));assert(sentence,'找到未重複的句子卡：'+kind);used.add(sentence.id);return cardFor(game,sentence,prefix+'-'+i);});
}
function renderedEffectNumber(elements,id,label){
  const html=elements.get('hand-zone').innerHTML,start=html.indexOf('data-card-id="'+id+'"');
  assert(start>=0,'找不到卡片 '+id);
  const end=html.indexOf('</article>',start),card=html.slice(start,end),marker=card.indexOf('class="card-effect"');
  assert(marker>=0,'找不到效果文字 '+id);
  const bodyStart=card.indexOf('>',marker)+1,bodyEnd=card.indexOf('</span>',bodyStart);
  const effect=card.slice(bodyStart,bodyEnd).replace(/<[^>]*>/g,'');
  const found=effect.match(new RegExp(label+'\\s+(\\d+)'));
  assert(found,'效果文字缺少數值：'+effect);
  return Number(found[1]);
}

test('舊版局外存檔自動補齊四條成長線，舊進行中局沒有快照時視為零階',()=>{
  const old={version:2,meta:{ink:7,wins:1,hermit:false,hpLevel:0,practices:{}},run:null,selected:'hero'};
  const x=boot(),storage=memory(JSON.stringify(old)),g=new x.Game(storage);
  assert(g.storageOK);assert(!g.notice.includes('原存檔無法讀取'));
  assert.deepEqual([g.meta.atkLevel,g.meta.defLevel,g.meta.energyLevel,g.meta.inkLevel],[0,0,0,0]);
  assert(g.startRun('hero',321));delete g.run.metaLevels;g.save();
  const restored=new x.Game(storage);
  assert(restored.storageOK);assert.equal(restored.run.metaLevels,undefined);assert.equal(restored.metaLevel('atkLevel'),0);
});

test('局外新欄位值不是 0 到 3 的整數時拒讀且保留原存檔位元組',()=>{
  for(const value of [4,-1,'1']){
    const data={version:2,meta:{ink:0,wins:0,hermit:false,hpLevel:0,practices:{},atkLevel:value},run:null,selected:'hero'};
    const raw=JSON.stringify(data),storage=memory(raw),GameClass=boot().Game,g=new GameClass(storage);
    assert(!g.storageOK);assert(g.notice.includes('原存檔無法讀取'));assert.equal(storage.getItem('pen-spire-save-v2'),raw);
  }
});

test('四條成長線依 40／80／140 墨水逐階購買並在重建 Game 後保存',()=>{
  const x=boot(),g=x.game;g.meta.ink=420;g.save();
  for(const line of ['attack','defense','energy','ink'])assert.equal(g.buyMetaUpgrade(line),true,line);
  assert.equal(g.meta.ink,260);
  assert.equal(g.buyMetaUpgrade('attack'),true);assert.equal(g.meta.ink,180);
  assert.equal(g.buyMetaUpgrade('attack'),true);assert.equal(g.meta.ink,40);
  assert.deepEqual([g.meta.atkLevel,g.meta.defLevel,g.meta.energyLevel,g.meta.inkLevel],[3,1,1,1]);
  const restored=new x.Game(x.storage);assert(restored.storageOK);
  assert.deepEqual([restored.meta.atkLevel,restored.meta.defLevel,restored.meta.energyLevel,restored.meta.inkLevel],[3,1,1,1]);
  assert.equal(restored.meta.ink,40);
});

test('墨水不足與已滿階時不能購買，存檔字串不變且提示清楚',()=>{
  const x=boot(),g=x.game;g.meta.ink=39;g.save();let raw=x.storage.getItem(x.SAVE_KEY);
  assert.equal(g.buyMetaUpgrade('attack'),false);assert.match(g.notice,/還差 1 墨水/);assert.equal(x.storage.getItem(x.SAVE_KEY),raw);
  g.meta.ink=260;g.meta.atkLevel=3;g.save();raw=x.storage.getItem(x.SAVE_KEY);
  assert.equal(g.buyMetaUpgrade('attack'),false);assert.match(g.notice,/已滿階/);assert.equal(x.storage.getItem(x.SAVE_KEY),raw);
});

test('示範與試玩模式禁止購買，試玩快照固定零階且不改存檔',()=>{
  const demo=boot(),d=demo.game;d.meta.ink=200;d.meta.atkLevel=2;d.save();
  const beforeDemo=demo.storage.getItem(demo.SAVE_KEY);assert(d.startDemo('hero',5));assert.equal(d.run.metaLevels.atkLevel,2);
  assert.equal(d.buyMetaUpgrade('attack'),false);assert.equal(d.upgradeMeta(),false);assert.equal(demo.storage.getItem(demo.SAVE_KEY),beforeDemo);

  const raw=JSON.stringify({version:2,meta:{ink:200,wins:0,hermit:false,hpLevel:0,atkLevel:2,defLevel:1,energyLevel:3,inkLevel:1,practices:{}},run:null,selected:'hero'});
  const storage=memory(raw),context=vm.createContext({console,location:{search:'?unlock=all'},URLSearchParams});vm.runInContext(source,context);
  const g=new context.PenSpire.Game(storage);assert(g.storageOK);g.meta.atkLevel=2;
  const beforeTrial=storage.getItem('pen-spire-save-v2');
  assert(g.startRun('hero',9));assert.deepEqual(normal(g.run.metaLevels),{atkLevel:0,defLevel:0,energyLevel:0,inkLevel:0});
  assert.equal(g.buyMetaUpgrade('attack'),false);assert.equal(g.upgradeMeta(),false);assert.equal(storage.getItem('pen-spire-save-v2'),beforeTrial);
});

test('局內快照合法值可存讀；舊快照可讀；快照壞值拒讀且不覆寫存檔',()=>{
  const x=boot(),g=x.game;g.meta.wins=2;g.meta.hermit=true;Object.assign(g.meta,{atkLevel:3,defLevel:2,energyLevel:1,inkLevel:3});
  assert(g.startRun('hero',77));assert.deepEqual(normal(g.run.metaLevels),{atkLevel:3,defLevel:2,energyLevel:1,inkLevel:3});
  const saved=JSON.parse(x.storage.getItem(x.SAVE_KEY)),restored=new x.Game(memory(JSON.stringify(saved)));
  assert(restored.storageOK);assert.deepEqual(normal(restored.run.metaLevels),{atkLevel:3,defLevel:2,energyLevel:1,inkLevel:3});
  for(const value of [4,-1,'1']){
    const corrupt=normal(saved);corrupt.run.metaLevels.atkLevel=value;
    const raw=JSON.stringify(corrupt),storage=memory(raw),bad=new x.Game(storage);
    assert(!bad.storageOK);assert(bad.notice.includes('原存檔無法讀取'));assert.equal(storage.getItem(x.SAVE_KEY),raw);
  }
});

test('冒險中購買成長不會更改當局快照，新冒險才採用新階數',()=>{
  const x=metaBattle('monster','mage'),g=x.game;g.meta.ink=40;g.run.metaLevels.atkLevel=0;
  assert.equal(g.buyMetaUpgrade('attack'),true);assert.equal(g.meta.atkLevel,1);assert.equal(g.run.metaLevels.atkLevel,0);
  assert(g.startRun('mage',124));assert.equal(g.run.metaLevels.atkLevel,1);
});

test('法師普通怪筆鋒打擊套用角色倍率、破解率與攻擊階，頭目筆鋒打擊不加成',()=>{
  const x=metaBattle('monster','mage',{atkLevel:3}),g=x.game,b=g.run.battle;
  b.completed.push({index:b.required[0],text:'已完成'});b.enemy.hp=b.enemy.maxHp=100;
  b.hand=[{id:'strike-test',type:'strike',level:0}];
  const expected=Math.floor(g.value(b.hand[0])*1.5*g.rate()*1.3);
  assert(g.play('strike-test'));assert.equal(100-b.enemy.hp,expected);assert(g.notice.includes('造成 '+expected+' 傷害'));
  const baseline=metaBattle('boss','mage',{atkLevel:0}),boosted=metaBattle('boss','mage',{atkLevel:3});
  for(const item of [baseline,boosted]){const game=item.game,boss=game.run.battle;boss.enemy.hp=boss.enemy.maxHp=100;boss.hand=[{id:'boss-strike',type:'strike',level:0}];assert(game.play('boss-strike'));}
  assert.equal(100-baseline.game.run.battle.enemy.hp,100-boosted.game.run.battle.enemy.hp);
});

test('頭目提交失敗傷害不受攻擊階影響，提交成功仍依階段固定結算',()=>{
  const runs=[0,3].map(level=>metaBattle('boss','mage',{atkLevel:level}));
  for(const x of runs){const g=x.game,b=g.run.battle,t=g.topic(),s=t.bank.find(item=>ATTACK_VALUES[item.kind]);assert(s);const card=cardFor(g,s,'boss-failed-'+b.phase);card.allowed=[];card.playedRound=1;card.paidCost=1;b.draft=[card];b.enemy.hp=b.enemy.maxHp=100;assert.equal(g.submit(),false);}
  assert.equal(runs[0].game.run.battle.enemy.hp,runs[1].game.run.battle.enemy.hp);

  const x=metaBattle('boss','mage',{atkLevel:3}),g=x.game,b=g.run.battle,t=g.topic();
  b.energy=9;b.hand=metaParagraphCards(g,t,0,'boss-success');b.enemy.hp=b.enemy.maxHp=112;
  for(const card of [...b.hand])assert(g.play(card.id));
  assert.equal(g.submit(),true);assert.equal(b.enemy.hp,(4-b.phase)*28);assert.equal(b.enemy.hp,84);
});

test('防禦階加進素材格擋與隨手筆記，撤回時扣回同一數值',()=>{
  const topic=boot().TOPICS.find(item=>item.bank.some(s=>s.kind==='summary')),x=metaBattle('monster','hero',{defLevel:2},boot().TOPICS.find(item=>item.id===topic.id).id),g=x.game,b=g.run.battle;
  const sentence=topic.bank.find(s=>s.kind==='summary'),card=cardFor(g,sentence,'block-upgrade-test');b.hand=[card];
  assert(g.play(card.id));assert.equal(b.draft[0].appliedBlock,g.value(card)+2);assert.equal(b.block,g.value(card)+2);
  assert(g.undo(card.id));assert.equal(b.block,0);
  const noteSentence=g.topic().bank.find(s=>s.kind==='summary');assert(noteSentence);assert(g.note(noteSentence.id));assert.equal(b.draft[0].appliedBlock,g.value(b.draft[0])+2);assert.equal(b.block,g.value(b.draft[0])+2);
});

test('能量階在第一、二、三回合套用上限，撤回不會超過當回合上限',()=>{
  const cases=[[0,[3,3,3]],[1,[4,3,3]],[2,[4,4,3]],[3,[4,4,4]]];
  for(const [level,limits] of cases){const x=metaBattle('monster','hero',{energyLevel:level}),g=x.game,b=g.run.battle;assert.equal(b.energy,limits[0]);for(let round=1;round<3;round++){b.block=100;assert(g.endTurn());assert.equal(b.energy,limits[round]);}}
  const topic=boot().TOPICS.find(item=>item.bank.some(s=>s.kind==='summary')),x=metaBattle('monster','hero',{energyLevel:3,defLevel:1},topic.id),g=x.game,b=g.run.battle,t=g.topic(),s=t.bank.find(item=>item.kind==='summary'),card=cardFor(g,s,'energy-undo');
  b.hand=[card];assert(g.play(card.id));b.energy=g.energyLimit(b.round);assert(g.undo(card.id));assert.equal(b.energy,4);assert.equal(b.block,0);
});

test('復活依新回合上限補能量，教學欠債仍扣 1 點',()=>{
  const x=metaBattle('monster','hero',{energyLevel:2}),g=x.game,b=g.run.battle;
  b.defeated=true;b.defeatWatched=true;b.helpDebt=true;assert(g.revive());
  assert.equal(b.round,2);assert.equal(b.energy,3);assert.equal(b.helpDebt,false);
  const y=metaBattle('monster','hero',{energyLevel:3}),h=y.game,c=h.run.battle;c.defeated=true;c.defeatWatched=true;assert(h.revive());assert.equal(c.energy,4);
});

test('墨水階結算先加成再無條件捨去，示範獎勵不寫入局外墨水',()=>{
  const x=metaBattle('monster','hero',{inkLevel:3}),g=x.game;g.run.earnedInk=11;assert(g.finish(false));
  assert.equal(g.run.rewardInk,20);assert.equal(g.meta.ink,20);
  const ui=renderedBattle(),uiGame=ui.game;uiGame.run.earnedInk=11;uiGame.run.metaLevels.inkLevel=3;assert(uiGame.finish(false));assert(ui.elements.get('screen').innerHTML.includes('墨水加成 +4'));
  const y=boot(),d=y.game;d.meta.ink=777;d.meta.inkLevel=3;assert(d.startDemo('hero',11));d.run.earnedInk=11;
  assert(d.finish(false));assert.equal(d.run.rewardInk,20);assert.equal(d.meta.ink,777);
});

test('墨水商店對話框列出五項、缺墨停用購買並避免提示權限資訊外洩',()=>{
  const x=renderedBattle(),g=x.game;g.run=null;g.view='menu';g.meta.ink=0;g.onChange();x.clickAction('meta-shop');
  const dialog=x.elements.get('dialog'),body=x.elements.get('dialog-body').innerHTML;
  assert.equal(dialog.open,true);assert.equal(x.elements.get('dialog-title').textContent,'墨水商店');
  assert.equal((body.match(/class="meta-shop-row"/g)||[]).length,5);assert(body.includes('還差 40 墨水'));assert(body.includes('disabled'));
  const attrs=renderedAttributes(body).join(' ');
  assert(!/(第 ?[0-9一二三四] ?段|文體|句型公式|→)/.test(body+' '+attrs));
  g.meta.atkLevel=3;g.meta.ink=500;g.onChange();x.clickAction('meta-shop');
  const full=x.elements.get('dialog-body').innerHTML.slice(x.elements.get('dialog-body').innerHTML.indexOf('data-meta-line="attack"'));
  assert(full.includes('已滿階'));
});

test('卡片文字的攻擊與格擋數字使用共用計算，普通怪提交傷害一致且頭目攻擊不加成',()=>{
  const topics=boot().TOPICS;let chosen=null;
  for(const topic of topics){for(let index=0;index<topic.paragraphs.length;index++){const pattern=topic.paragraphs[index].pattern;if(pattern.filter(kind=>ATTACK_VALUES[kind]).length===1&&pattern.length<=4){chosen={topic,index,pattern};break;}}if(chosen)break;}
  assert(chosen,'找到只有一張攻擊素材牌的完整段落');
  const x=renderedBattle('monster',chosen.topic.id,'mage'),g=x.game,b=g.run.battle;
  g.run.metaLevels={atkLevel:3,defLevel:2,energyLevel:0,inkLevel:0};b.target=chosen.index;b.enemy.hp=b.enemy.maxHp=1000;b.energy=9;
  const cards=metaParagraphCards(g,chosen.topic,chosen.index,'effect-material');
  b.hand=cards;for(const card of [...cards])assert(g.play(card.id));
  const attack=b.draft.find(card=>ATTACK_VALUES[card.kind]);assert(attack);g.onChange();
  const shown=renderedEffectNumber(x.elements,attack.id,'攻擊'),before=b.enemy.hp;
  assert.equal(g.submit(),true);assert.equal(before-b.enemy.hp,shown);

  const strikeRun=renderedBattle('monster',chosen.topic.id,'mage'),sg=strikeRun.game,sb=sg.run.battle;sg.run.metaLevels={atkLevel:3,defLevel:2,energyLevel:0,inkLevel:0};sb.enemy.hp=sb.enemy.maxHp=1000;sb.hand=[{id:'effect-strike',type:'strike',level:0}];sg.onChange();
  const strikeShown=renderedEffectNumber(strikeRun.elements,'effect-strike','造成攻擊'),strikeBefore=sb.enemy.hp;assert(sg.play('effect-strike'));assert.equal(strikeBefore-sb.enemy.hp,strikeShown);

  const blockTopic=topics.find(item=>item.bank.some(s=>s.kind==='summary')),blockRun=renderedBattle('monster',blockTopic.id,'mage'),h=blockRun.game,bb=h.run.battle;
  h.run.metaLevels={atkLevel:3,defLevel:2,energyLevel:0,inkLevel:0};
  const blockCard=cardFor(h,blockTopic.bank.find(s=>s.kind==='summary'),'effect-block');bb.hand=[blockCard];h.onChange();
  const blockShown=renderedEffectNumber(blockRun.elements,blockCard.id,'立即格擋');assert.equal(blockShown,h.blockValue(blockCard));
  assert(h.play(blockCard.id));assert.equal(bb.block,blockShown);
  const defend={id:'effect-defend',type:'defend',level:0};bb.hand=[defend];h.onChange();
  const defendShown=renderedEffectNumber(blockRun.elements,defend.id,'獲得');assert.equal(defendShown,h.blockValue(defend));
  assert(h.play(defend.id));assert.equal(bb.block,blockShown+defendShown);

  const boss=renderedBattle('boss',chosen.topic.id,'mage'),bg=boss.game,battleState=bg.run.battle;
  bg.run.metaLevels={atkLevel:3,defLevel:2,energyLevel:0,inkLevel:0};const bossAttack=cardFor(bg,chosen.topic.bank.find(s=>ATTACK_VALUES[s.kind]),'effect-boss-attack');battleState.hand=[bossAttack];bg.onChange();
  const bossShown=renderedEffectNumber(boss.elements,bossAttack.id,'攻擊');
  assert.equal(bossShown,Math.floor(bg.value(bossAttack)*1.5));
});

function renderedLobbyApp(search=''){
  const elements=new Map(),listeners=new Map(),focusCounts=new Map();let document;
  const element=id=>{if(!elements.has(id)){const local=new Map(),classes=new Set(),node={id,innerHTML:'',textContent:'',dataset:{},clientWidth:1366,open:false,disabled:false,addEventListener:(type,listener)=>local.set(type,listener),showModal(){this.open=true;},close(){this.open=false;local.get('close')?.();},focus(){focusCounts.set(id,(focusCounts.get(id)||0)+1);document.activeElement=this;},closest(selector){return selector==='button'?this:null;}};node.classList={add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name)};elements.set(id,node);}return elements.get(id);};
  document={getElementById:element,querySelectorAll:()=>[],addEventListener:(type,listener)=>listeners.set(type,listener),activeElement:null};
  const context=vm.createContext({console,document,location:{search},URLSearchParams,window:{localStorage:memory()},requestAnimationFrame:()=>0,cancelAnimationFrame(){},addEventListener(){},clearTimeout(){},setTimeout:()=>0,matchMedia:()=>({matches:false}),innerWidth:1366});
  vm.runInContext(source,context);
  const click=(action,id=null,buttonId=`test-${action}`)=>{const target=element(buttonId);target.dataset={action,id};target.disabled=false;document.activeElement=target;const listener=listeners.get('click');assert.equal(typeof listener,'function','click handler registered');listener({target:{closest:selector=>selector==='button[data-action]'?target:null}});};
  return{game:context.game,api:context.PenSpire,elements,focusCounts,click,activeElement:()=>document.activeElement};
}

test('大廳依進行中冒險指定主要按鈕',()=>{
  const fresh=renderedLobbyApp(),freshHtml=fresh.elements.get('screen').innerHTML;
  assert.match(freshHtml,/class="primary" data-action="new" id="start-button">開始爬塔<\/button>/);
  assert(!freshHtml.includes('id="resume-button"'));
  const active=renderedLobbyApp();assert(active.game.startRun('hero',42));active.game.view='menu';active.game.onChange();
  const activeHtml=active.elements.get('screen').innerHTML;
  assert.match(activeHtml,/class="primary" data-action="resume" id="resume-button">繼續冒險<\/button>/);
  assert.match(activeHtml,/class="" data-action="new" id="start-button">開始新冒險<\/button>/);
});

test('隱士卡上提供獨立購買按鈕並依墨水與示範狀態處理',()=>{
  const x=renderedLobbyApp(),g=x.game;g.meta.hermit=false;g.meta.ink=30;g.onChange();
  let screen=x.elements.get('screen').innerHTML,start=screen.indexOf('<div class="character-slot" data-role="hermit">'),end=screen.indexOf('</div>',start),slot=screen.slice(start,end+6);
  assert(start>=0);assert.equal((slot.match(/<button\b/g)||[]).length,2);assert(slot.includes('</button><button'));assert(slot.includes('data-action="buy-hermit"'));assert(slot.includes('取得・30 墨水'));
  x.click('buy-hermit',null,'hermit-buy-button');assert.equal(g.meta.hermit,true);assert.equal(g.meta.ink,0);assert(!x.elements.get('screen').innerHTML.includes('data-action="buy-hermit"'));
  const short=renderedLobbyApp();short.game.meta.ink=26;short.game.onChange();screen=short.elements.get('screen').innerHTML;assert.match(screen,/data-action="buy-hermit"[^>]*disabled[^>]*>還差 4 墨水/);
  const owned=renderedLobbyApp();owned.game.meta.hermit=true;owned.game.onChange();assert(!owned.elements.get('screen').innerHTML.includes('data-action="buy-hermit"'));
  const demo=renderedLobbyApp('?auto=1'),d=demo.game;d.meta.ink=60;assert(d.startDemo('hero',5));assert.equal(d.buyHermit(),false);assert.equal(d.meta.hermit,false);assert.equal(d.meta.ink,60);
});

test('塔外三入口存在，玩法對話框沿用內容並在關閉後回復焦點',()=>{
  const x=renderedLobbyApp(),screen=x.elements.get('screen').innerHTML;
  for(const id of ['meta-shop-button','practice-button','howto-button'])assert(screen.includes(`id="${id}"`),id+' missing');
  assert(!screen.includes('id="growth-panel"'));
  x.click('howto',null,'howto-button');assert.equal(x.elements.get('dialog').open,true);assert.equal(x.elements.get('dialog-title').textContent,'第一次來？看玩法');
  const body=x.elements.get('dialog-body').innerHTML;assert(body.includes('先選角色，再選亮起的路線。戰鬥時讀題目'));assert(body.includes('段落組合是本局的挑戰，不代表作文只能寫固定句數。'));
  const before=x.focusCounts.get('howto-button')||0;x.elements.get('dialog').close();assert.equal(x.focusCounts.get('howto-button'),before+1);assert.equal(x.activeElement().id,'howto-button');
});

test('大廳由上而下排列五張角色卡，窄版角色區可橫向捲動',()=>{
  const screen=renderedLobbyApp().elements.get('screen').innerHTML,roles=[...screen.matchAll(/class="character-slot" data-role="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(roles,['hero','tank','mage','hermit','teacher']);
  const header=screen.indexOf('class="lobby-intro"'),notice=screen.indexOf('class="menu-notice"'),cards=screen.indexOf('id="characters"'),actions=screen.indexOf('class="lobby-actions"');assert(header<notice&&notice<cards&&cards<actions);
  assert.match(html,/#characters\.character-grid\{[^}]*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(html,/@media\(max-width:849px\)[\s\S]*#characters\.character-grid\{display:flex;overflow-x:auto;overflow-y:hidden/);
  assert.match(html,/\.lobby-actions button\{min-height:44px/);
});

test('沒有 AudioContext 時仍能完整走過一場戰鬥並收到遊戲音效事件',()=>{
  const context=vm.createContext({console});vm.runInContext(source,context);assert.equal(context.AudioContext,undefined);
  const game=new context.PenSpire.Game(memory()),events=[];game.meta.wins=2;game.meta.hermit=true;assert(game.startRun('hero',123));game.run.current='0-0';assert(game.startBattle('monster','teacher'));game.onSound=id=>events.push(id);
  const x={game,api:context.PenSpire};game.run.battle.enemy.hp=1000;putParagraph(x,0);assert.equal(game.submit(),true);assert.equal(game.run.view,'battle');game.run.battle.block=0;assert(game.endTurn());
  for(const id of ['card','submitOk','hit','hurt','turn'])assert(events.includes(id),'missing '+id+' event');
});

test('遊戲動作各自發出卡牌、撤回、提交失敗、格擋、警告、擊倒、購買與營火事件',()=>{
  const x=battle(),g=x.game,events=[];g.onSound=id=>events.push(id);const b=g.run.battle,t=g.topic();b.enemy.hp=1000;
  const first=b.hand.find(card=>card.type==='material');assert(first);assert(g.play(first.id));assert(g.undo(first.id));
  b.energy=0;assert.equal(g.play(first.id),false);b.energy=3;b.draft=[];
  const bad=cardFor(g,t.bank[0],'bad-submit');bad.allowed=[];bad.kind='a';b.hand=[bad];assert(g.play(bad.id));assert.equal(g.submit(),false);
  b.hand=[{id:'test-defend',type:'defend',level:0}];b.energy=3;assert(g.play('test-defend'));
  b.block=0;b.enemy.attack=1;g.run.hp=20;assert(g.endTurn());
  b.hand=[{id:'test-strike',type:'strike',level:0}];b.energy=3;b.enemy.hp=1;assert(g.play('test-strike'));assert.equal(g.run.view,'reward');
  g.run.view=g.view='shop';g.run.gold=100;assert(g.buy('focus'));g.run.view=g.view='camp';assert(g.camp('heal'));
  for(const id of ['card','undo','deny','submitFail','block','hurt','turn','hit','enemyDown','buy','camp'])assert(events.includes(id),'missing '+id+' event');
});

test('勝敗短曲事件由遊戲狀態觸發',()=>{
  const victory=battle('boss','teacher','hero'),won=victory.game,winEvents=[];won.onSound=id=>winEvents.push(id);const run=won.run;run.battle.phase=4;run.battle.completed=[0,1,2,3].map(index=>({index,text:'段落'}));assert(won.finish(true));assert(winEvents.includes('triumph'));
  const defeat=battle('monster','teacher','hero'),lost=defeat.game,lossEvents=[];lost.onSound=id=>lossEvents.push(id);lost.run.hp=1;lost.run.battle.enemy.attack=1;assert(lost.endTurn());assert(lossEvents.includes('defeat'));
});

test('音訊事件與曲目識別碼數量及內容固定',()=>{
  const context=vm.createContext({console});vm.runInContext(source,context);const audio=context.PenSpireAudio;
  assert.deepEqual(normal(audio.SOUND_IDS),['click','card','undo','submitOk','submitFail','hit','block','hurt','enemyDown','turn','deny','buy','camp']);
  assert.deepEqual(normal(audio.MUSIC_IDS),['lobby','battle','boss','victory','defeat','triumph']);
  assert.equal(typeof audio.renderOffline,'function');
});

test('音訊設定預設、壞 JSON、試玩不寫入，以及重新建立後保留',()=>{
  const context=vm.createContext({console});vm.runInContext(source,context);const expectedDefault={music:false,musicVolume:0.5,sfx:true,sfxVolume:0.4,muted:false},audio=context.PenSpireAudio;
  assert.deepEqual(normal(audio.readSettings(null)),expectedDefault);
  const malformed={getItem:()=>'{bad-json',setItem(){throw new Error('must not write');}};assert.deepEqual(normal(audio.readSettings(malformed)),expectedDefault);
  const settings={music:true,musicVolume:0.65,sfx:true,sfxVolume:0.35,muted:false},storage=memory();assert.equal(audio.writeSettings(settings,storage),true);assert.equal(JSON.parse(storage.getItem('pen-spire-audio-v1')).musicVolume,0.65);
  const restarted=vm.createContext({console,window:{localStorage:storage}});vm.runInContext(source,restarted);assert.deepEqual(normal(restarted.PenSpireAudio.readSettings()),settings);
  let writes=0;const trialStorage={getItem:()=>null,setItem(){writes++;}},trial=vm.createContext({console,location:{search:'?unlock=all'},URLSearchParams});vm.runInContext(source,trial);assert.equal(trial.PenSpireAudio.writeSettings(settings,trialStorage),false);assert.equal(writes,0);
});

test('頁首聲音按鈕與鍵盤可操作的設定面板標記存在',()=>{
  const hud=renderedLobbyApp().elements.get('hud').innerHTML;
  assert.match(hud,/<button type="button" id="audio-button" aria-label="聲音設定" aria-haspopup="dialog"/);
  assert.match(html,/<dialog id="audio-settings-dialog" aria-labelledby="audio-settings-title"/);
  for(const id of ['audio-music-enabled','audio-music-volume','audio-sfx-enabled','audio-sfx-volume','audio-mute-toggle','audio-settings-close'])assert(html.includes('id="'+id+'"'),id+' missing');
  assert.match(html,/#audio-settings-dialog\{width:min\(380px,calc\(100vw - 24px\)\)/);
});
