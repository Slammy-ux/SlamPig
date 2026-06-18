// ================================================================
// SlamPigs: Rummy Den — app.js  (ES module, strict by default)
// ================================================================

// ── DEBUG / ANALYTICS HOOKS ──────────────────────────────────────
const Debug = {
  enabled: location.search.includes('debug=1'),
  log(...args) { if (this.enabled) console.log('[SlamPigs]', ...args); },
  event(name, data) {
    if (this.enabled) console.log('[Event]', name, data ?? '');
    // swap in your analytics here: window.gtag?.('event', name, data);
  },
};

// ── PERSISTENCE ──────────────────────────────────────────────────
const Store = {
  KEY: 'slampigs_save_v1',
  save(G) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify({
        acorns: G.acorns, densCleared: G.densCleared, charms: G.charms,
        permanentMult: G.permanentMult, totalMeldsSet: G.totalMeldsSet,
        difficulty: G.difficulty, isEndless: G.isEndless, endlessCount: G.endlessCount,
      }));
    } catch(e) { Debug.log('Save failed', e); }
  },
  load() {
    try { const r = localStorage.getItem(this.KEY); return r ? JSON.parse(r) : null; }
    catch { return null; }
  },
  clear() { localStorage.removeItem(this.KEY); },
};

// ================================================================
// DATA
// ================================================================
const RANKS=[
  {value:2,  name:'Piglet',         emoji:'🐷', flavor:'Too cute to take seriously. Fatal mistake.'},
  {value:3,  name:'Cop Pig',        emoji:'🐽', flavor:'On the take. Always.'},
  {value:4,  name:'Pig in Mud',     emoji:'🐖', flavor:'Wallowing in your misfortune.'},
  {value:5,  name:'Pig-in-Blanket', emoji:'🌯', flavor:'Wrapped up, ready to roll.'},
  {value:6,  name:'Lipstick Pig',   emoji:'💄', flavor:'Dressed up, still a pig.'},
  {value:7,  name:'Biker Hog',      emoji:'🏍️', flavor:'No helmet, no rules, no mercy.'},
  {value:8,  name:'Corporate Hog',  emoji:'💼', flavor:'Will restructure your melds.'},
  {value:9,  name:'Ninja Pig',      emoji:'🥷', flavor:'You never saw it coming.'},
  {value:10, name:'Gym Pig',        emoji:'🏋️', flavor:'Been benching the discard pile.'},
  {value:11, name:'Wizard Pig',     emoji:'🧙', flavor:'Casts Summon Deadwood III.'},
  {value:12, name:'Pirate Hog',     emoji:'🏴‍☠️', flavor:'Raids the stock pile nightly.'},
  {value:13, name:'Royal Boar',     emoji:'👑', flavor:'By decree: you lose this hand.'},
  {value:14, name:'Big Pig',        emoji:'🐗', flavor:'The final boss was a pig all along.'},
];
const HABS=[
  {id:'forest',name:'Bacon',    emoji:'🥓'},
  {id:'plains',name:'Sausage',  emoji:'🌭'},
  {id:'tundra',name:'Pork Rind',emoji:'🍿'},
  {id:'swamp', name:'Ribs',     emoji:'🍖'},
];
const RANK_BY_VAL={};
RANKS.forEach(r=>RANK_BY_VAL[r.value]=r);

const WILD_PIGS={
  mud_pig:        {id:'mud_pig',        name:'Mud Pig',        emoji:'🐖',rarity:'common',   trueWild:true,  unmeldedChips:0, scoring:[{trigger:'perWild',     chips:20,         desc:'+20 chips each time a Wild is used in a meld'}],      desc:'True wildcard. Each wild used in a meld scores +20 chips.'},
  truffle_pig:    {id:'truffle_pig',    name:'Truffle Pig',    emoji:'🐽',rarity:'common',   peekOnDiscard:3,unmeldedChips:0, scoring:[{trigger:'perPack',     multMul:2,        desc:'Each Pack scores ×2 mult'}],                           desc:'Peek top 3 stock on discard. Each Pack you set scores ×2 mult.'},
  piggy_bank:     {id:'piggy_bank',     name:'Piggy Bank',     emoji:'🐷',rarity:'common',                   unmeldedChips:0, scoring:[{trigger:'always',      chips:0,bankPct:0.5,desc:'Bank 50% of score for next hand'}],               desc:'Banks 50% of your score this hand — paid out as bonus chips next hand.'},
  show_pig:       {id:'show_pig',       name:'Show Pig',       emoji:'🎀',rarity:'rare',     revealOpponent:true,unmeldedChips:0,scoring:[{trigger:'firstMeld', mult:3,           desc:'+3 mult on your first meld each hand'}],              desc:'Reveal opponent top deadwood. First meld each hand: +3 mult.'},
  greased_piglet: {id:'greased_piglet', name:'Greased Piglet', emoji:'🐽',rarity:'rare',     offTurnSwap:true,unmeldedChips:0, scoring:[{trigger:'perDiscard',  chips:15,         desc:'+15 chips if discarded card scores ≥10'}],            desc:'Off-turn discard swap. Each high discard (≥10 chips) gives +15 chips.'},
  guard_hog:      {id:'guard_hog',      name:'Guard Hog',      emoji:'🐗',rarity:'rare',     zeroDW:true,    unmeldedChips:0, scoring:[{trigger:'always',      permMult:0.5,     desc:'Permanently +0.5 mult each hand you set a meld with Guard Hog'}], desc:'0 deadwood. Each hand Guard Hog is in a meld, gain +0.5 permanent mult.'},
  boss_hog:       {id:'boss_hog',       name:'Boss Hog',       emoji:'👑',rarity:'legendary',trueWild:true,dualMeld:true,unmeldedChips:0,scoring:[{trigger:'perWolfInHand',chips:8,desc:'+8 chips per Wolf card held at slam'}],           desc:'True wildcard. +8 chips for every Wolf card in your hand when you Slam.'},
  hog_wild:       {id:'hog_wild',       name:'Hog Wild',       emoji:'🌀',rarity:'legendary',rerollEachTurn:true,unmeldedChips:0,scoring:[{trigger:'ifRollWolf',multMul:3,     desc:'If rolled to 7 (Wolf) this turn: ×3 mult'}],           desc:'Rerolls rank 2-14 each turn. If it rolled Wolf (7): ×3 mult this hand.'},
};
const FERAL_CARDS={
  feral_fox:    {id:'feral_fox',    name:'Sly Fox',      emoji:'🦊',unmeldedDW:13,feral:true},
  grizzly:      {id:'grizzly',      name:'Grizzly',      emoji:'🐻',unmeldedDW:11,feral:true},
  tiger_cub:    {id:'tiger_cub',    name:'Tiger Cub',    emoji:'🐯',unmeldedDW:10,feral:true},
  alphas_pride: {id:'alphas_pride', name:"Alpha's Pride", emoji:'🦁',unmeldedDW:16,feral:true},
};
const CHARMS={
  acorn_oak:     {id:'acorn_oak',     name:'Acorn Oak',     emoji:'🌳',rarity:'common',   price:50, kind:'planet',desc:'Trails permanently score +1 mult each.',                                    trailMult:1},
  pack_leader:   {id:'pack_leader',   name:'Pack Leader',   emoji:'🐺',rarity:'common',   price:50, kind:'planet',desc:'Packs of 4+ score +20 chips and +1 mult extra.',                            bigPackBonus:true},
  forest_floor:  {id:'forest_floor',  name:'Forest Floor',  emoji:'🌿',rarity:'common',   price:60, kind:'planet',desc:'Forest-habitat melds each add +0.5 mult.',                                  forestMult:0.5},
  ancient_trail: {id:'ancient_trail', name:'Ancient Trail', emoji:'🗺️',rarity:'rare',     price:100,kind:'planet',desc:'Trails of 5+ cards score ×2 mult (multiplicative).',                       longTrailMultMul:2},
  wolf_moon:     {id:'wolf_moon',     name:'Wolf Moon',     emoji:'🌕',rarity:'rare',     price:110,kind:'planet',desc:'Each Wolf card in any of your melds adds +10 chips.',                       wolfChips:10},
  tusk_polish:   {id:'tusk_polish',   name:'Tusk Polish',   emoji:'🦷',rarity:'legendary',price:180,kind:'planet',desc:'Every 4th meld you ever set permanently adds +1 mult.',                     meldMilestone:true},
  second_wind:   {id:'second_wind',   name:'Second Wind',   emoji:'💨',rarity:'common',   price:50, kind:'tarot', active:true,desc:'Once per hand: redeal your hand from the stock.'},
  mirror_pond:   {id:'mirror_pond',   name:'Mirror Pond',   emoji:'🪞',rarity:'rare',     price:100,kind:'tarot', active:true,desc:'Once per hand: pull any rank directly from the stock.'},
  stampede:      {id:'stampede',      name:'The Stampede',  emoji:'🦬',rarity:'rare',     price:100,kind:'tarot', active:true,desc:'Once per hand: this hand Bison and Bear score triple chips.'},
  alphas_mark:   {id:'alphas_mark',   name:"Alpha's Mark",  emoji:'⭐',rarity:'legendary',price:160,kind:'tarot', active:true,desc:'Once per run: one card in your next meld counts as any rank.'},
  thick_hide:    {id:'thick_hide',    name:'Thick Hide',    emoji:'🛡️',rarity:'rare',     price:110,kind:'tarot', desc:'Ignore the first time you fall short of the score target each Den.'},
  golden_trough: {id:'golden_trough', name:'Golden Trough', emoji:'🏆',rarity:'legendary',price:180,kind:'tarot', desc:'All Acorn rewards this run are doubled.'},
};
const BASE_TARGETS=[150,220,320,450,600,800,1100,1800];
const DENS=[
  {num:1,name:'Bunny Burrow',   boss:'Bunny Brigade',    emoji:'🐰',handsToWin:2,startHandSize:10,rankBuffs:{},              ferals:[],                                     acorns:40, wildPool:['common'],                  wildChoices:2,shop:false,deckCull:false,bossRule:null,                                                                                                                                                  blindType:'small'},
  {num:2,name:'Fox Hollow',     boss:'Sly Fox Gang',     emoji:'🦊',handsToWin:2,startHandSize:10,rankBuffs:{},              ferals:['feral_fox'],                          acorns:55, wildPool:['common','rare'],           wildChoices:3,shop:true, shopSize:1,deckCull:false,bossRule:null,                                                                                                                                                  blindType:'big'},
  {num:3,name:'Wolf Pack Pass', boss:'Howling Pack',     emoji:'🐺',handsToWin:2,startHandSize:10,rankBuffs:{7:2},           ferals:[],                                     acorns:70, wildPool:['common','rare'],           wildChoices:3,shop:true, shopSize:1,deckCull:true, bossRule:{id:'wolf_tax',         name:'Wolf Tax',      desc:'Each Wolf in your melds scores ×2 chips — but each Wolf in deadwood costs ×2 chips penalty.'},        blindType:'boss'},
  {num:4,name:'Bear Cave',      boss:'Cave Grizzlies',   emoji:'🐻',handsToWin:2,startHandSize:10,rankBuffs:{},              ferals:['grizzly','grizzly'],                  acorns:85, wildPool:['common','rare'],           wildChoices:3,shop:true, shopSize:1,deckCull:false,bossRule:{id:'trail_curse',     name:'Trail Curse',   desc:'Trails score no mult this Den — only chips. Build Packs.'},                                            blindType:'boss'},
  {num:5,name:'Bison Stampede', boss:'Thundering Herd',  emoji:'🦬',handsToWin:2,startHandSize:10,rankBuffs:{10:4},          ferals:['feral_fox'],                          acorns:100,wildPool:['common','rare','legendary'],wildChoices:3,shop:true,shopSize:2,deckCull:true, bossRule:{id:'stampede_clock',  name:'Stampede Clock',desc:'You have only 8 turns to Slam. Every 2 turns without slamming costs 50 chips from your score.'},    blindType:'boss'},
  {num:6,name:'Gorilla Temple', boss:'Temple Guardians', emoji:'🦍',handsToWin:2,startHandSize:10,rankBuffs:{11:3},          ferals:['grizzly'],                            acorns:120,wildPool:['common','rare','legendary'],wildChoices:3,shop:true,shopSize:2,deckCull:false,bossRule:{id:'mirror_rule',    name:'Monkey See',    desc:"Opponent copies your highest meld's chip value."},                                                   blindType:'boss'},
  {num:7,name:"Tiger's Lair",   boss:'Tiger Triplets',   emoji:'🐯',handsToWin:2,startHandSize:10,rankBuffs:{12:2},          ferals:['tiger_cub','tiger_cub','tiger_cub'],  acorns:140,wildPool:['common','rare','legendary'],wildChoices:3,shop:true,shopSize:2,deckCull:true, bossRule:{id:'triple_threat',  name:'Triple Threat', desc:'Must set at least 3 melds to Slam. 1-2 melds: score halved.'},                                          blindType:'boss'},
  {num:8,name:"The Alpha's Den",boss:'The Alpha Lion',   emoji:'🦁',handsToWin:3,startHandSize:10,rankBuffs:{11:2,12:2,13:2,14:2},ferals:['alphas_pride','alphas_pride'], acorns:250,wildPool:['rare','legendary'],         wildChoices:3,shop:true,shopSize:2,deckCull:true, bossRule:{id:'alpha_mirrors',  name:'Alpha Mirrors', desc:'Opponent starts with your mult from last hand. Score 2× target to truly win.'},                     blindType:'final',isFinal:true,guaranteedLegendary:true},
];
DENS.forEach((d,i)=>{ d.scoreTarget=BASE_TARGETS[i]; });

// ================================================================
// GAME CLASS  — encapsulates all mutable state
// ================================================================
class Game {
  constructor() {
    // run-level
    this.difficulty='medium';
    this.acorns=0;
    this.currentDen=0;
    this.densCleared=0;
    this.isEndless=false;
    this.endlessCount=0;
    this.charms=[];
    this.playerDeck=[];
    // den-level
    this.denPlayerWins=0;
    this.denOppWins=0;
    this.thickHideUsed=false;
    // hand-level
    this.playerHand=[];
    this.oppHand=[];
    this.stock=[];
    this.discardPile=[];
    this.phase='draw';
    this.handSort='dealt';
    this.selectedCardIds=new Set();
    this.committedMelds=[];
    this.handNum=0;
    this.handAcorns=0;
    // scoring carry
    this.lastHandScore=0;
    this.piggyBankStored=0;
    this.permanentMult=1;
    this.totalMeldsSet=0;
    // turn flags
    this.stampedeTurnActive=false;
    this.alphasMarkActive=false;
    this.turnCount=0;
    this.secondWindUsed=false;
    this.mirrorPondUsed=false;
    this.stoneSkinUsed=false;
    this.stoneSkinActive=false;
    this.stoneSkinCardId=null;
    this.showPigUsed=false;
    this.greasedPigletUsed=false;
    this.hogWildRolls={};
    this.fanSelectedIdx=null;
    this.peekActive=false;
    this.peekCards=[];
    // draft/cull helpers
    this._draftPool=[];
    this._draftChosen=null;
    this._cullCandidates=[];
    this._cullChosen=null;
    // card id counter
    this._nextId=1;
  }

  mkId(){ return this._nextId++; }

  applyDifficultyTargets(){
    const m={easy:0.7,medium:1.0,hard:1.35}[this.difficulty]??1.0;
    DENS.forEach((d,i)=>{ d.scoreTarget=Math.round(BASE_TARGETS[i]*m); });
  }

  getCurrentDen(){
    if(this.isEndless){
      const base=DENS[7];
      return{...base,
        name:`Wilds Beyond #${this.endlessCount}`,
        boss:`Feral Champion #${this.endlessCount}`,
        num:8+this.endlessCount,
        acorns:base.acorns+this.endlessCount*15,
        handsToWin:this.endlessCount>=3?3:2,
        isEndless:true,
      };
    }
    return DENS[this.currentDen];
  }

  getCommittedMeldIds(){
    const ids=new Set();
    this.committedMelds.forEach(m=>m.cardIds.forEach(id=>ids.add(String(id))));
    return ids;
  }

  getDeadwoodCards(){
    const ids=this.getCommittedMeldIds();
    return this.playerHand.filter(c=>!ids.has(String(c.id)));
  }

  getDeadwoodTotal(){
    const den=this.getCurrentDen();
    return this.getDeadwoodCards().reduce((s,c)=>s+cardDeadwoodCost(c,den.rankBuffs,this),0);
  }

  resetHand(){
    this.phase='draw';
    this.selectedCardIds=new Set();
    this.committedMelds=[];
    this.turnCount=0;
    this.handAcorns=0;
    this.stampedeTurnActive=false;
    this.secondWindUsed=false;
    this.mirrorPondUsed=false;
    this.stoneSkinUsed=false;
    this.stoneSkinActive=false;
    this.stoneSkinCardId=null;
    this.showPigUsed=false;
    this.greasedPigletUsed=false;
    this.hogWildRolls={};
    this.fanSelectedIdx=null;
    this.peekActive=false;
    this.peekCards=[];
  }

  loadSave(saved){
    this.acorns=saved.acorns??0;
    this.densCleared=saved.densCleared??0;
    this.charms=saved.charms??[];
    this.permanentMult=saved.permanentMult??1;
    this.totalMeldsSet=saved.totalMeldsSet??0;
    this.difficulty=saved.difficulty??'medium';
    this.isEndless=saved.isEndless??false;
    this.endlessCount=saved.endlessCount??0;
    this.playerDeck=buildStandardDeck(this);
    this.applyDifficultyTargets();
  }
}

// Singleton — all UI functions use this
const G = new Game();

// ================================================================
// CARD FACTORIES
// ================================================================
function makeAnimalCard(rank,hab,G){
  return{id:G.mkId(),kind:'animal',value:rank.value,name:rank.name,emoji:rank.emoji,
    hab,habEmoji:HABS.find(h=>h.id===hab).emoji};
}
function makeWildPig(pigId,G){
  const p=WILD_PIGS[pigId];
  return{id:G.mkId(),kind:'wild',wildId:pigId,name:p.name,emoji:p.emoji,rarity:p.rarity};
}
function makeFeralCard(feralId,G){
  const f=FERAL_CARDS[feralId];
  return{id:G.mkId(),kind:'feral',feralId,name:f.name,emoji:f.emoji};
}
function buildStandardDeck(g){
  const deck=[];
  for(const r of RANKS)for(const h of HABS)deck.push(makeAnimalCard(r,h.id,g));
  return deck;
}
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

// Returns a clean human-readable label for a card — used in log messages
// so there are always proper spaces between parts.
function cardLabel(card){
  if(card.kind==='animal') return `${card.value} ${card.name} ${card.habEmoji}`;
  return card.name;
}

// ================================================================
// DEADWOOD / VALUE HELPERS
// ================================================================
function cardDeadwoodCost(card,rankBuffs,state){
  state=state??G;
  if(card.kind==='wild'){
    const p=WILD_PIGS[card.wildId];
    if(p.zeroDW) return 0;
    if(state.stoneSkinCardId===card.id) return 0;
    return p.unmeldedDW??0;
  }
  if(card.kind==='feral'){
    if(state.stoneSkinCardId===card.id) return 0;
    return FERAL_CARDS[card.feralId].unmeldedDW??10;
  }
  if(state.stoneSkinCardId===card.id) return 0;
  let v=card.value;
  if(rankBuffs&&rankBuffs[card.value]) v+=rankBuffs[card.value];
  return v;
}
function cardChipValue(card){
  return card.kind==='animal'?card.value:0;
}

// ================================================================
// MELD SOLVER (bitmask DP — unchanged logic, just cleaner)
// ================================================================
function solveMelds(hand,rankBuffs,forPlayer){
  const n=hand.length;
  if(n===0)return{melds:[],deadwood:[],totalDW:0};

  function cardMeldValue(card){
    if(card.kind==='wild'){
      const p=WILD_PIGS[card.wildId];
      if(p.trueWild) return 'wild';
      if(p.rerollEachTurn) return G.hogWildRolls[card.id]??7;
      return null;
    }
    if(card.kind==='feral') return null;
    let v=card.value;
    if(rankBuffs&&rankBuffs[card.value]) v+=rankBuffs[card.value];
    return v;
  }

  const candidates=[];
  const byVal={};
  const wilds=[];
  for(let i=0;i<n;i++){
    const mv=cardMeldValue(hand[i]);
    if(mv==='wild') wilds.push(i);
    else if(mv!==null)(byVal[mv]=byVal[mv]??[]).push(i);
  }

  // Packs
  for(const v in byVal){
    const idxs=byVal[v];
    if(idxs.length>=3){
      let mask=0,dv=0;
      idxs.forEach(i=>{mask|=(1<<i);dv+=cardDeadwoodCost(hand[i],rankBuffs);});
      candidates.push({type:'pack',mask,val:dv,cards:idxs.slice()});
    } else if(idxs.length===2&&wilds.length>0){
      for(const wi of wilds){
        let mask=(1<<wi),dv=cardDeadwoodCost(hand[wi],rankBuffs);
        idxs.forEach(i=>{mask|=(1<<i);dv+=cardDeadwoodCost(hand[i],rankBuffs);});
        candidates.push({type:'pack',mask,val:dv,cards:[wi,...idxs]});
      }
    }
  }

  // Trails
  for(const hab of HABS){
    const habIdxs=[];
    for(let i=0;i<n;i++){
      if(hand[i].kind==='animal'&&hand[i].hab===hab.id) habIdxs.push(i);
    }
    habIdxs.sort((a,b)=>(cardMeldValue(hand[a])??0)-(cardMeldValue(hand[b])??0));

    function tryAddTrail(runIdxs){
      if(runIdxs.length<3)return;
      let mask=0,dv=0;
      runIdxs.forEach(i=>{mask|=(1<<i);dv+=cardDeadwoodCost(hand[i],rankBuffs);});
      candidates.push({type:'trail',mask,val:dv,cards:runIdxs.slice(),hab:hab.id});
      if(runIdxs.length>3){
        for(let s=0;s+2<runIdxs.length;s++)
          for(let e=s+2;e<runIdxs.length;e++){
            let m2=0,dv2=0;
            for(let k=s;k<=e;k++){m2|=(1<<runIdxs[k]);dv2+=cardDeadwoodCost(hand[runIdxs[k]],rankBuffs);}
            candidates.push({type:'trail',mask:m2,val:dv2,cards:runIdxs.slice(s,e+1),hab:hab.id});
          }
      }
    }

    if(habIdxs.length===0)continue;
    let run=[habIdxs[0]];
    for(let k=1;k<habIdxs.length;k++){
      const prev=cardMeldValue(hand[run[run.length-1]]);
      const cur=cardMeldValue(hand[habIdxs[k]]);
      if(cur===prev+1) run.push(habIdxs[k]);
      else{tryAddTrail(run);run=[habIdxs[k]];}
    }
    tryAddTrail(run);

    // wild-bridged trails
    if(wilds.length>0){
      for(let a=0;a<habIdxs.length-1;a++){
        for(let b=a+1;b<habIdxs.length;b++){
          const va=cardMeldValue(hand[habIdxs[a]]);
          const vb=cardMeldValue(hand[habIdxs[b]]);
          if(vb-va===2){
            for(const wi of wilds){
              const r3=[habIdxs[a],wi,habIdxs[b]];
              let mask=0,dv=0;
              r3.forEach(i=>{mask|=(1<<i);dv+=cardDeadwoodCost(hand[i],rankBuffs);});
              candidates.push({type:'trail',mask,val:dv,cards:r3,hab:hab.id});
            }
          }
        }
      }
    }
  }

  const full=(1<<n)-1;
  const memo=new Map(),chosen=new Map();
  function dp(mask){
    if(mask===0)return 0;
    if(memo.has(mask))return memo.get(mask);
    let best=0,bestC=-1;
    for(let ci=0;ci<candidates.length;ci++){
      const c=candidates[ci];
      if((c.mask&mask)===c.mask&&c.mask!==0){
        const sub=dp(mask&~c.mask);
        if(c.val+sub>best){best=c.val+sub;bestC=ci;}
      }
    }
    memo.set(mask,best);chosen.set(mask,bestC);
    return best;
  }
  dp(full);

  const melds=[];
  let cur=full;
  while(cur!==0){
    const ci=chosen.get(cur);
    if(ci===-1||ci===undefined)break;
    const c=candidates[ci];
    melds.push({type:c.type,cards:c.cards.map(i=>hand[i]),hab:c.hab??null});
    cur&=~c.mask;
  }

  const meldedIds=new Set();
  melds.forEach(m=>m.cards.forEach(cd=>meldedIds.add(cd.id)));
  const deadwood=hand.filter(c=>!meldedIds.has(c.id));
  let totalDW=0;
  deadwood.forEach(c=>totalDW+=cardDeadwoodCost(c,rankBuffs));
  return{melds,deadwood,totalDW};
}

// ================================================================
// MELD VALIDATION
// ================================================================
function validateProposedMeld(cards){
  if(cards.length<2)return{valid:false,reason:'Need at least 2 cards'};
  const den=G.getCurrentDen();
  const wilds=cards.filter(c=>c.kind==='wild'&&WILD_PIGS[c.wildId]?.trueWild);
  const nonWilds=cards.filter(c=>!(c.kind==='wild'&&WILD_PIGS[c.wildId]?.trueWild));

  // Try Pack
  if(nonWilds.length>0){
    const vals=nonWilds.map(c=>{
      if(c.kind==='animal') return c.value;
      if(c.kind==='wild'&&WILD_PIGS[c.wildId]?.rerollEachTurn) return G.hogWildRolls[c.id]??7;
      return null;
    }).filter(v=>v!==null);
    if(vals.length>0&&vals.every(v=>v===vals[0])){
      if(cards.length>=3) return{valid:true,type:'pack'};
      return{valid:false,reason:'Packs need 3+ cards of the same rank'};
    }
  }

  // Try Trail
  const animalNW=nonWilds.filter(c=>c.kind==='animal');
  if(animalNW.length>=1){
    const habs=new Set(animalNW.map(c=>c.hab));
    if(habs.size===1){
      const hab=[...habs][0];
      const sorted=[...animalNW].sort((a,b)=>
        (a.value+(den.rankBuffs?.[a.value]??0))-(b.value+(den.rankBuffs?.[b.value]??0)));
      const vals=sorted.map(c=>c.value+(den.rankBuffs?.[c.value]??0));
      let wBudget=wilds.length,valid=true;
      for(let i=1;i<vals.length;i++){
        const gap=vals[i]-vals[i-1];
        if(gap===1)continue;
        if(gap===2&&wBudget>0){wBudget--;continue;}
        valid=false;break;
      }
      if(valid&&cards.length>=3) return{valid:true,type:'trail',hab};
      if(!valid) return{valid:false,reason:'Trail cards must be consecutive in the same habitat'};
      if(cards.length<3) return{valid:false,reason:'Trails need 3+ consecutive cards'};
    }
  }
  if(nonWilds.length===0) return{valid:false,reason:'Need at least one animal card'};
  return{valid:false,reason:'Cards must form a Pack (same rank) or Trail (consecutive, same habitat)'};
}

// ================================================================
// SCORING ENGINE
// ================================================================
function computeHandScore(committedMelds,playerHand,isCleanSlam){
  const den=G.getCurrentDen();
  const breakdown=[];
  let chips=0,mult=G.permanentMult;

  const addChips=(n,label)=>{chips+=n;breakdown.push({type:'chips',label,n});};
  const addMult=(n,label)=>{mult+=n;breakdown.push({type:'mult',label,n});};
  const mulMult=(n,label)=>{mult*=n;breakdown.push({type:'xmult',label,n});};

  if(G.piggyBankStored>0) addChips(G.piggyBankStored,`🐷 Piggy Bank carry (+${G.piggyBankStored})`);

  let meldIndex=0,wildsUsedInMelds=0;
  for(const meld of committedMelds){
    const cards=meld.cardIds.map(id=>playerHand.find(c=>String(c.id)===String(id))).filter(Boolean);
    const meldType=meld.type,hab=meld.hab;
    let meldChips=cards.reduce((s,c)=>s+cardChipValue(c),0);
    let meldMult=meldType==='pack'?1:2;

    if(G.stampedeTurnActive)
      cards.forEach(c=>{if(c.kind==='animal'&&(c.name==='Bison'||c.name==='Bear'))meldChips+=c.value*2;});

    wildsUsedInMelds+=cards.filter(c=>c.kind==='wild'||c.kind==='feral').length;

    if(G.charms.includes('forest_floor')&&hab==='forest') meldMult+=CHARMS.forest_floor.forestMult??0;
    if(meldType==='trail'&&G.charms.includes('acorn_oak')) meldMult+=CHARMS.acorn_oak.trailMult??0;
    if(meldType==='trail'&&cards.length>=5&&G.charms.includes('ancient_trail')) meldMult*=CHARMS.ancient_trail.longTrailMultMul??1;
    if(meldType==='pack'&&cards.length>=4&&G.charms.includes('pack_leader')){meldChips+=20;meldMult+=1;}
    if(G.charms.includes('wolf_moon')){
      const wolves=cards.filter(c=>c.kind==='animal'&&c.value===7);
      meldChips+=wolves.length*(CHARMS.wolf_moon.wolfChips??0);
    }

    const hasShowPig=playerHand.some(c=>c.kind==='wild'&&c.wildId==='show_pig');
    if(hasShowPig&&meldIndex===0){meldMult+=3;breakdown.push({type:'pig',label:'🎀 Show Pig: first meld +3 mult',n:3});}

    const hasTrufflePig=playerHand.some(c=>c.kind==='wild'&&c.wildId==='truffle_pig');
    if(hasTrufflePig&&meldType==='pack'){meldMult*=2;breakdown.push({type:'pig',label:'🐽 Truffle Pig: Pack ×2 mult',n:2});}

    const hasBossHog=playerHand.some(c=>c.kind==='wild'&&c.wildId==='boss_hog');
    if(hasBossHog){
      const w=playerHand.filter(c=>c.kind==='animal'&&c.value===7).length;
      meldChips+=w*8;
      if(w>0)breakdown.push({type:'pig',label:`👑 Boss Hog: ${w} Wolves +${w*8} chips`,n:w*8});
    }

    if(den.bossRule?.id==='wolf_tax'&&meldType==='pack'){
      const wolves=cards.filter(c=>c.kind==='animal'&&c.value===7);
      if(wolves.length>0) meldChips*=2;
    }
    if(den.bossRule?.id==='trail_curse'&&meldType==='trail') meldMult=1;

    addChips(meldChips,`${meldType==='pack'?'🃏 Pack':'🔗 Trail'} chips`);
    addMult(meldMult,`${meldType==='pack'?'Pack':'Trail'} ×${meldMult.toFixed(1)} mult`);
    meldIndex++;
  }

  const hasMudPig=playerHand.some(c=>c.kind==='wild'&&c.wildId==='mud_pig');
  if(hasMudPig&&wildsUsedInMelds>0) addChips(wildsUsedInMelds*20,`🐖 Mud Pig: ${wildsUsedInMelds} wilds +${wildsUsedInMelds*20} chips`);

  const hogWild=playerHand.find(c=>c.kind==='wild'&&c.wildId==='hog_wild');
  if(hogWild&&G.hogWildRolls[hogWild.id]===7) mulMult(3,'🌀 Hog Wild: Wolf roll ×3 mult!');

  if(isCleanSlam) mulMult(2,'💫 Clean Slam ×2 mult!');

  if(den.bossRule?.id==='triple_threat'&&committedMelds.length<3){
    chips=Math.floor(chips/2);
    breakdown.push({type:'penalty',label:'⚠️ Triple Threat: <3 melds, score halved!',n:-1});
  }
  if(den.bossRule?.id==='stampede_clock'&&G.turnCount>8){
    const penalty=Math.floor((G.turnCount-8)/2)*50;
    chips=Math.max(0,chips-penalty);
    breakdown.push({type:'penalty',label:`⏰ Stampede: turn ${G.turnCount}, -${penalty} chips`,n:-penalty});
  }

  const committedIds=G.getCommittedMeldIds();
  const dwCards=playerHand.filter(c=>!committedIds.has(String(c.id)));
  const dwPenalty=dwCards.reduce((s,c)=>s+cardDeadwoodCost(c,den.rankBuffs),0);
  if(dwPenalty>0){
    chips=Math.max(0,chips-dwPenalty);
    breakdown.push({type:'penalty',label:`💀 Deadwood penalty -${dwPenalty}`,n:-dwPenalty});
  }

  return{chips,mult,score:Math.floor(chips*mult),breakdown,dwPenalty};
}

// ================================================================
// GAME FLOW
// ================================================================
function startGame(){
  // Reset run state but keep difficulty selection
  const diff=G.difficulty;
  G.acorns=0;G.currentDen=0;G.densCleared=0;G.isEndless=false;G.endlessCount=0;
  G.charms=[];G.playerDeck=buildStandardDeck(G);
  G.permanentMult=1;G.totalMeldsSet=0;G.piggyBankStored=0;G.lastHandScore=0;
  G.difficulty=diff;
  G.applyDifficultyTargets();
  Store.clear();
  updateTopbar();
  showScreen('screen-map');
  document.getElementById('topbar').style.display='flex';
  renderDenMap();
  Debug.event('game_start',{difficulty:G.difficulty});
}

function getCurrentDen(){ return G.getCurrentDen(); }

function enterDen(idx){
  if(idx===-1) document.body.className='den-endless';
  else{ G.currentDen=idx; document.body.className=`den-${idx+1}`; }
  G.denPlayerWins=0;G.denOppWins=0;G.thickHideUsed=false;G.handNum=0;
  startNewHand();
  Debug.event('enter_den',{den:idx});
}

function startNewHand(){
  const den=G.getCurrentDen();
  G.handNum++;
  G.resetHand();

  let deck=[...G.playerDeck];
  den.ferals.forEach(fid=>deck.push(makeFeralCard(fid,G)));
  shuffle(deck);

  G.playerHand=deck.splice(0,den.startHandSize);
  G.oppHand=deck.splice(0,den.startHandSize);
  G.stock=deck;
  G.discardPile=[];
  if(G.stock.length>0) G.discardPile.push(G.stock.pop());

  rollHogWilds(G.playerHand);
  rollHogWilds(G.oppHand);

  showScreen('screen-hand');
  renderHandScreen();
  setLog(`<b>Hand ${G.handNum}</b> — draw from the stock or take the discard.`);
  Debug.event('hand_start',{hand:G.handNum});
}

function rollHogWilds(hand){
  hand.forEach(c=>{
    if(c.kind==='wild'&&WILD_PIGS[c.wildId].rerollEachTurn)
      G.hogWildRolls[c.id]=Math.floor(Math.random()*13)+2;
  });
}

// ================================================================
// RENDER — all use DocumentFragment; no inline onclick
// ================================================================
function renderHandScreen(){
  const den=G.getCurrentDen();
  document.getElementById('hand-den-label').textContent=`${den.emoji} ${den.name}`;
  const diffLabel={easy:'🐷',medium:'🐗',hard:'💀'}[G.difficulty]??'';
  const bossTag=den.bossRule?` · 👁️ ${den.bossRule.name}`:'';
  document.getElementById('hand-threshold-label').textContent=
    `${diffLabel} Target: ${den.scoreTarget.toLocaleString()} pts · Hand ${G.handNum} of best-${den.handsToWin*2-1}${bossTag}`;
  document.getElementById('hand-first-to').textContent=den.handsToWin;

  // Score pips
  const pipsEl=document.getElementById('hand-score-pips');
  let pHtml='';
  for(let i=0;i<den.handsToWin;i++)
    pHtml+=`<div class="hand-pip-lg ${i<G.denPlayerWins?'pw':''}" aria-label="${i<G.denPlayerWins?'Your win':'Pending'}"></div>`;
  pHtml+=`<span class="vs-label" aria-hidden="true" style="margin:0 4px">VS</span>`;
  for(let i=den.handsToWin-1;i>=0;i--)
    pHtml+=`<div class="hand-pip-lg ${i<G.denOppWins?'ow':''}" aria-label="${i<G.denOppWins?'Opponent win':'Pending'}"></div>`;
  pipsEl.innerHTML=pHtml;

  const modEl=document.getElementById('hand-modifier-line');
  const modParts=[];
  const buffs=Object.entries(den.rankBuffs??{});
  if(buffs.length>0) modParts.push(buffs.map(([v,b])=>{const r=RANK_BY_VAL[v];return r?`${r.emoji} +${b}`:''}).filter(Boolean).join(' '));
  if(den.bossRule) modParts.push(`<span style="color:var(--pink)">👁️ ${den.bossRule.name}: ${den.bossRule.desc}</span>`);
  modEl.innerHTML=modParts.length?`<span class="den-modifier-badge">${modParts.join(' · ')}</span>`:'';

  renderOppHand();
  renderPlayerHand();
  renderPiles();
  renderAbilityBar();
  renderBottomBar();
}

function renderOppHand(){
  const den=G.getCurrentDen();
  const frag=document.createDocumentFragment();
  G.oppHand.forEach(()=>{
    const div=document.createElement('div');
    div.className='card-back';
    div.setAttribute('aria-label','Opponent card (face down)');
    div.textContent='🐖';
    frag.appendChild(div);
  });
  document.getElementById('opp-cards-row').replaceChildren(frag);
  document.getElementById('opp-zone-label').textContent=`${den.boss} (${G.oppHand.length} cards)`;
}

function renderPiles(){
  const stockEl=document.getElementById('stock-pile');
  document.getElementById('stock-count').textContent=G.stock.length+' left';
  const canDraw=G.phase==='draw'&&G.stock.length>0;
  stockEl.style.opacity=canDraw?'1':'.4';
  stockEl.style.cursor=canDraw?'pointer':'not-allowed';
  stockEl.setAttribute('aria-disabled',String(!canDraw));
  renderDiscardFan();
}

function renderDiscardFan(){
  const fanEl=document.getElementById('discard-fan');
  const countEl=document.getElementById('discard-count-label');
  const hintEl=document.getElementById('discard-fan-hint');
  if(!fanEl)return;

  if(G.discardPile.length===0){
    fanEl.innerHTML='<div class="fan-card fan-empty" style="width:48px;height:68px" aria-label="Empty discard pile"><span style="font-size:.6rem;color:var(--text-faint)">EMPTY</span></div>';
    countEl.textContent='';
    hintEl.textContent=G.phase==='draw'?'Draw from the stock to start.':'';
    return;
  }

  const den=G.getCurrentDen();
  const reachable=new Set();
  const topIdx=G.discardPile.length-1;
  reachable.add(topIdx);

  if(G.phase==='draw'){
    const baseHand=G.playerHand.slice();
    for(let i=topIdx-1;i>=0;i--){
      const taken=G.discardPile.slice(i);
      const target=G.discardPile[i];
      let creates=false;
      for(let di=0;di<(baseHand.length+taken.length);di++){
        const trial=[...baseHand,...taken].filter((_,j)=>j!==di);
        if(trial.find(c=>c.id===target.id)===undefined)continue;
        const res=solveMelds(trial,den.rankBuffs,true);
        if(res.melds.some(m=>m.cards.some(c=>c.id===target.id))){creates=true;break;}
      }
      if(creates) reachable.add(i);
      else break;
    }
  }

  const MAX_SHOW=12;
  const pile=G.discardPile;
  let startIdx=0;
  if(pile.length>MAX_SHOW){
    startIdx=Math.max(0,pile.length-MAX_SHOW);
    const minR=Math.min(...reachable);
    startIdx=Math.min(startIdx,minR);
  }

  const habBgs={forest:'var(--hab-forest)',plains:'var(--hab-plains)',tundra:'var(--hab-tundra)',swamp:'var(--hab-swamp)'};
  const rankColors={forest:'#7ed957',plains:'#f3bb4a',tundra:'#5cc8ff',swamp:'#7ee8c0'};
  const frag=document.createDocumentFragment();

  if(startIdx>0){
    const pfx=document.createElement('div');
    pfx.style.cssText='display:flex;align-items:center;color:var(--text-faint);font-size:.65rem;font-weight:700;margin-right:4px;align-self:center';
    pfx.textContent=`+${startIdx}`;
    frag.appendChild(pfx);
  }

  for(let i=startIdx;i<pile.length;i++){
    const card=pile[i];
    const isTop=i===topIdx;
    const isReach=reachable.has(i)&&!isTop;
    const isLocked=!reachable.has(i)&&G.phase==='draw';
    const isSel=G.fanSelectedIdx!==null&&i===G.fanSelectedIdx;
    const willTake=G.fanSelectedIdx!==null&&i>G.fanSelectedIdx&&i<=topIdx;

    let cls='fan-card';
    if(isTop)cls+=' fan-top';
    if(isReach)cls+=' fan-reachable';
    if(isLocked)cls+=' fan-locked';
    if(isSel)cls+=' fan-selected-reach';
    if(willTake)cls+=' fan-will-take';

    const el=document.createElement('div');
    el.className=cls;
    el.style.cssText=card.kind==='animal'?`background:${habBgs[card.hab]};`:'background:#1a0828;';

    const clickable=(isTop||isReach||isSel)&&G.phase==='draw';
    if(clickable){
      el.setAttribute('role','button');
      el.setAttribute('tabindex','0');
      el.dataset.action='fan-click';
      el.dataset.idx=String(i);
    }
    const aLabel=card.kind==='animal'
      ?`${card.value} ${card.name} ${card.habEmoji}${isTop?' (top)':isReach?' (reachable)':' (locked)'}`
      :card.name;
    el.setAttribute('aria-label',aLabel);

    let badge='';
    if(isSel){const n=pile.length-i;badge=`<div class="fan-badge">TAKE ${n} card${n>1?'s':''}</div>`;}
    else if(isTop&&G.phase==='draw')badge=`<div class="fan-badge">TOP</div>`;
    else if(isReach)badge=`<div class="fan-badge">✦ REACH</div>`;
    else if(isLocked&&G.phase==='draw')badge=`<div class="fan-badge badge-locked">LOCKED</div>`;

    let inner='';
    if(card.kind==='animal'){
      const rc=rankColors[card.hab]??'var(--text)';
      inner=`<span class="fan-rank" style="color:${rc}">${card.value}</span><span class="fan-name">${card.name}</span><span class="fan-hab">${card.habEmoji}</span>`;
    } else {
      inner=`<span style="font-size:1.3rem">${card.emoji}</span><span class="fan-name" style="color:#c899e8">${card.name}</span>`;
    }
    el.innerHTML=badge+inner;
    frag.appendChild(el);
  }
  fanEl.replaceChildren(frag);

  // live region
  const liveEl=document.getElementById('discard-live');
  if(liveEl&&pile.length>0) liveEl.textContent=`Discard top: ${cardLabel(pile[topIdx])}`;

  countEl.textContent=pile.length?`(${pile.length} card${pile.length>1?'s':''})`:'';

  if(G.phase!=='draw') hintEl.textContent='';
  else if(G.fanSelectedIdx!==null){
    const n=pile.length-G.fanSelectedIdx;
    hintEl.innerHTML=`Taking <b style="color:var(--pink)">${n} card${n>1?'s':''}</b> — confirm or pick differently`;
  } else if(reachable.size>1){
    hintEl.innerHTML=`<span style="color:var(--gold)">✦ ${reachable.size-1} deeper card${reachable.size>2?'s':''} reachable</span> — click to preview, then confirm`;
  } else {
    hintEl.textContent='Click the top card to take it, or draw from stock.';
  }

  // Confirm/cancel row
  const existing=document.getElementById('fan-confirm-row');
  if(G.fanSelectedIdx!==null){
    const n=pile.length-G.fanSelectedIdx;
    const target=pile[G.fanSelectedIdx];
    const name=cardLabel(target);
    const rowHTML=`<button class="fan-confirm" data-action="fan-confirm" aria-label="Confirm taking ${n} card${n>1?'s':''} starting from ${name}">Take ${n} card${n>1?'s':''} (${name}${n>1?` +${n-1} above`:''})</button><button class="fan-confirm fan-confirm-cancel" data-action="fan-cancel">Cancel</button>`;
    if(existing) existing.innerHTML=rowHTML;
    else{
      const row=document.createElement('div');
      row.id='fan-confirm-row';
      row.style.cssText='display:flex;gap:8px;margin-top:8px;align-items:center;flex-wrap:wrap';
      row.innerHTML=rowHTML;
      fanEl.after(row);
    }
  } else {
    existing?.remove();
  }
}

// ── Card tooltip ────────────────────────────────────────────────
function cardTooltipHTML(card,dw,inMeld,rankBuffs){
  let name,emoji,desc='',tipLines=[];
  if(card.kind==='animal'){
    const r=RANK_BY_VAL[card.value]??{},h=HABS.find(h=>h.id===card.hab)??{};
    name=r.name??card.name;emoji=`${r.emoji??''} ${h.emoji??''}`;
    const buffed=rankBuffs?.[card.value];
    tipLines.push(['Meld rank',`${card.value} (${r.name??''})`]);
    tipLines.push(['Habitat',`${h.emoji??''} ${h.name??card.hab}`]);
    if(buffed)tipLines.push(['⚡ DW penalty',`+${buffed} pts`]);
  } else if(card.kind==='wild'){
    const p=WILD_PIGS[card.wildId]??{};
    name=p.name??card.name;emoji=p.emoji??card.emoji;desc=p.desc??'';
    if(p.rerollEachTurn){const roll=G.hogWildRolls[card.id];tipLines.push(['Roll',roll?`${roll} (${RANK_BY_VAL[roll]?.name??'?'})`:'—']);}
    tipLines.push(['Type','Wild Pig']);
  } else {
    const f=FERAL_CARDS[card.feralId]??{};
    name=f.name??card.name;emoji=f.emoji??card.emoji;
    desc='A feral card shuffled into this Den\'s deck.';
    tipLines.push(['Type','<span style="color:var(--red)">Feral</span>']);
  }
  const dwClass=dw===0?'tip-ok':dw>=10?'tip-bad':dw>=7?'tip-warn':'tip-ok';
  const meldStr=inMeld?'<span class="card-tip-meld">✓ In meld (0 DW)</span>'
    :`<span class="card-tip-dw ${dwClass}">${dw} deadwood</span>`;
  const rowsHTML=tipLines.map(([l,v])=>`<div class="card-tip-row"><span class="card-tip-label">${l}</span><span class="card-tip-val">${v}</span></div>`).join('');
  return `<div class="card-tip" role="tooltip"><div class="card-tip-name">${emoji} ${name}</div>${rowsHTML}<div class="card-tip-row"><span class="card-tip-label">Deadwood</span><span>${meldStr}</span></div>${desc?`<div class="card-tip-desc">${desc}</div>`:''}</div>`;
}

// ── Build card element (no inline onclick) ───────────────────────
function buildCardEl(card){
  const den=G.getCurrentDen();
  const inMeld=G.getCommittedMeldIds().has(String(card.id));
  const dw=cardDeadwoodCost(card,den.rankBuffs);
  const isSel=G.selectedCardIds.has(String(card.id));
  const hiDW=!inMeld&&!isSel&&dw>=11;

  let cls='card';
  if(card.kind==='animal')cls+=` hab-${card.hab}`;
  if(card.kind==='wild'||card.kind==='feral')cls+=' pig-card';
  if(isSel)cls+=' multi-sel';
  else if(hiDW)cls+=' high-dw';

  let inner='';
  if(card.kind==='animal'){
    const buffed=den.rankBuffs?.[card.value];
    inner=`<div class="card-body"><span class="card-rank">${card.value}</span><span class="card-hab">${card.habEmoji}</span><span class="card-name">${card.name}</span>${buffed?`<span class="card-buff">⚡+${buffed} DW</span>`:''}</div>`;
  } else if(card.kind==='wild'){
    const p=WILD_PIGS[card.wildId];
    const rv=p.rerollEachTurn?(G.hogWildRolls[card.id]??'?'):'';
    inner=`<div class="card-body"><span class="card-pig-icon">${card.emoji}</span><span class="card-pig-label">${p.rerollEachTurn?`↺${rv}`:card.name}</span></div>`;
  } else {
    inner=`<div class="card-body"><span class="card-pig-icon">${card.emoji}</span><span class="card-pig-label" style="color:var(--red)">${card.name}</span></div>`;
  }
  inner+=`<span class="card-dw-tag" aria-hidden="true">${dw}</span>`;
  inner+=cardTooltipHTML(card,dw,inMeld,den.rankBuffs);

  const el=document.createElement('div');
  el.className=cls;
  el.setAttribute('role','button');
  el.setAttribute('tabindex','0');
  el.setAttribute('aria-pressed',String(isSel));
  el.setAttribute('aria-label',`${cardLabel(card)}, ${dw} deadwood${isSel?', selected':''}`);
  el.dataset.action='select-card';
  el.dataset.cardId=String(card.id);
  el.innerHTML=inner;
  return el;
}

function getSortedDeadwood(cards){
  const dead=[...cards];
  if(G.handSort==='rank')
    dead.sort((a,b)=>(a.kind==='animal'?a.value:100)-(b.kind==='animal'?b.value:100));
  else if(G.handSort==='habitat'){
    const ho={forest:0,plains:1,tundra:2,swamp:3};
    dead.sort((a,b)=>{
      const ah=a.kind==='animal'?(ho[a.hab]??4):5;
      const bh=b.kind==='animal'?(ho[b.hab]??4):5;
      return ah!==bh?ah-bh:(a.kind==='animal'?a.value:99)-(b.kind==='animal'?b.value:99);
    });
  }
  return dead;
}

function renderPlayerHand(){
  const meldWrap=document.getElementById('meld-zone-wrap');
  const meldRow=document.getElementById('meld-zone-row');

  if(G.committedMelds.length>0){
    meldWrap.classList.add('has-melds');
    const frag=document.createDocumentFragment();
    G.committedMelds.forEach((meld,mi)=>{
      const habObj=meld.hab?HABS.find(h=>h.id===meld.hab):null;
      const lbl=meld.type==='pack'?`PACK — ${meld.cardIds.length} of a kind`:`TRAIL ${habObj?.emoji??''} ${habObj?.name??''}`;
      const box=document.createElement('div');
      box.className='meld-group-box';
      const cardsHTML=meld.cardIds.map(id=>{
        const c=G.playerHand.find(c=>String(c.id)===String(id));
        if(!c)return'';
        if(c.kind==='animal') return `<div class="meld-card-mini hab-${c.hab}" title="${c.name} ${c.habEmoji}">${c.value}</div>`;
        return `<div class="meld-card-mini pig-mini" title="${c.name}">${c.emoji}</div>`;
      }).join('');
      box.innerHTML=`<button class="btn-unmeld" data-action="unmeld" data-idx="${mi}" aria-label="Undo meld ${mi+1}">✕</button><div class="meld-group-box-label">${lbl}</div><div class="meld-group-box-cards">${cardsHTML}</div>`;
      frag.appendChild(box);
    });
    meldRow.replaceChildren(frag);
  } else {
    meldWrap.classList.remove('has-melds');
    meldRow.replaceChildren();
  }

  const dwLabel=document.getElementById('deadwood-zone-label');
  if(dwLabel) dwLabel.style.display=G.committedMelds.length>0?'block':'none';

  const row=document.getElementById('player-hand-row');
  const frag=document.createDocumentFragment();
  getSortedDeadwood(G.getDeadwoodCards()).forEach(card=>frag.appendChild(buildCardEl(card)));
  row.replaceChildren(frag);

  // Bottom DW display
  const totalDW=G.getDeadwoodTotal();
  const dwEl=document.getElementById('dw-display');
  dwEl.textContent=totalDW;
  dwEl.className='dw-val'+(totalDW===0?' dw-ok':totalDW>=20?' dw-high':'');

  const meldSummary=document.getElementById('meld-summary');
  if(G.committedMelds.length>0){
    const packs=G.committedMelds.filter(m=>m.type==='pack').length;
    const trails=G.committedMelds.filter(m=>m.type==='trail').length;
    const parts=[];
    if(packs>0)parts.push(`<span class="meld-count">${packs} Pack${packs>1?'s':''}</span>`);
    if(trails>0)parts.push(`<span class="meld-count">${trails} Trail${trails>1?'s':''}</span>`);
    meldSummary.innerHTML=parts.join(' + ')+` (${G.getDeadwoodCards().length} deadwood)`;
  } else {
    meldSummary.innerHTML='<span style="color:var(--text-faint)">No melds set</span>';
  }
  document.getElementById('meld-groups-area')?.style&&(document.getElementById('meld-groups-area').style.display='none');
  renderBottomBar();
}

function renderBottomBar(){
  const inDiscard=G.phase==='discard';
  const selCount=G.selectedCardIds.size;
  const btnSetMeld=document.getElementById('btn-set-meld');
  const btnClearSel=document.getElementById('btn-clear-sel');
  const btnDiscard=document.getElementById('btn-discard');
  const btnSlam=document.getElementById('btn-slam');
  const hintEl=document.getElementById('player-phase-hint');

  if(btnSetMeld){
    if(inDiscard&&selCount>=2){
      const selCards=[...G.selectedCardIds].map(id=>G.playerHand.find(c=>String(c.id)===id)).filter(Boolean);
      const v=validateProposedMeld(selCards);
      btnSetMeld.disabled=!v.valid;
      btnSetMeld.title=v.valid?`Set a ${v.type}`:(v.reason??'Invalid meld');
      btnSetMeld.textContent=v.valid?`＋ Set ${v.type==='pack'?'Pack':'Trail'}`:'＋ Set Meld';
    } else {btnSetMeld.disabled=true;btnSetMeld.textContent='＋ Set Meld';}
  }
  if(btnClearSel) btnClearSel.style.display=selCount>0?'inline-flex':'none';
  if(btnDiscard){
    if(inDiscard&&selCount===1){
      const id=[...G.selectedCardIds][0];
      btnDiscard.disabled=G.getCommittedMeldIds().has(id);
    } else btnDiscard.disabled=true;
  }
  if(btnSlam){
    let canSlam=false;
    if(inDiscard&&selCount===1){
      const id=[...G.selectedCardIds][0];
      canSlam=!G.getCommittedMeldIds().has(id);
    }
    btnSlam.disabled=!canSlam;
  }
  if(hintEl){
    if(G.phase==='draw') hintEl.textContent='← Draw or take the discard';
    else if(G.phase==='discard'){
      if(selCount===0) hintEl.textContent='Select cards to set melds, then discard one';
      else if(selCount===1) hintEl.textContent='Discard selected — or add more cards to meld';
      else hintEl.textContent=`${selCount} selected — Set Meld or clear`;
    } else if(G.phase==='opp') hintEl.textContent="Opponent's turn…";
    else hintEl.textContent='';
  }
  renderScoreTicker();
}

function renderScoreTicker(){
  const el=document.getElementById('score-ticker');
  if(!el)return;
  if(G.committedMelds.length===0){
    el.innerHTML='<span style="color:var(--text-faint);font-size:.75rem">Set melds to see score</span>';
    return;
  }
  const{chips,mult,score}=computeHandScore(G.committedMelds,G.playerHand,false);
  const den=G.getCurrentDen();
  const pct=Math.min(100,Math.round(score/den.scoreTarget*100));
  const hit=score>=den.scoreTarget;
  el.innerHTML=`<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:6px">
      <span style="font-size:.7rem;color:var(--text-faint);font-weight:700;letter-spacing:1px">CHIPS</span>
      <span style="font-family:'Lilita One',cursive;font-size:1.4rem;color:var(--blue)">${chips}</span>
      <span style="color:var(--text-faint)" aria-hidden="true">×</span>
      <span style="font-family:'Lilita One',cursive;font-size:1.4rem;color:var(--pink)">${mult.toFixed(1)}</span>
      <span style="color:var(--text-faint)" aria-hidden="true">=</span>
      <span style="font-family:'Lilita One',cursive;font-size:1.8rem;color:${hit?'var(--green)':'var(--gold)'}" aria-live="polite" aria-label="Score ${score.toLocaleString()}">${score.toLocaleString()}</span>
    </div>
    <div style="flex:1;min-width:120px">
      <div style="font-size:.65rem;color:var(--text-faint);margin-bottom:3px">TARGET: ${den.scoreTarget.toLocaleString()} ${hit?'✓':''}</div>
      <div style="background:var(--bg3);border-radius:6px;height:8px;overflow:hidden" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div style="height:100%;border-radius:6px;background:${hit?'var(--green)':'var(--gold)'};width:${pct}%;transition:width .3s"></div>
      </div>
    </div>
  </div>`;
}

function renderAbilityBar(){
  const bar=document.getElementById('ability-bar');
  const btns=[];
  const hasShowPig=G.playerHand.some(c=>c.kind==='wild'&&c.wildId==='show_pig');
  if(hasShowPig) btns.push(`<button class="active-ability-btn${G.showPigUsed?' used':''}" data-action="ability-show-pig" ${G.showPigUsed?'disabled':''}>🎀 Show Pig${G.showPigUsed?' (used)':''}</button>`);
  const hasGP=G.playerHand.some(c=>c.kind==='wild'&&c.wildId==='greased_piglet');
  if(hasGP&&G.discardPile.length>0) btns.push(`<button class="active-ability-btn${G.greasedPigletUsed?' used':''}" data-action="ability-greased-piglet" ${G.greasedPigletUsed?'disabled':''}>🐽 Swap${G.greasedPigletUsed?' (used)':''}</button>`);
  if(G.charms.includes('second_wind')) btns.push(`<button class="active-ability-btn${G.secondWindUsed?' used':''}" data-action="ability-second-wind" ${G.secondWindUsed?'disabled':''}>💨 Second Wind${G.secondWindUsed?' (used)':''}</button>`);
  if(G.charms.includes('mirror_pond'))  btns.push(`<button class="active-ability-btn${G.mirrorPondUsed?' used':''}" data-action="ability-mirror-pond" ${G.mirrorPondUsed?'disabled':''}>🪞 Mirror Pond${G.mirrorPondUsed?' (used)':''}</button>`);
  if(G.charms.includes('stone_skin')&&G.phase==='discard'&&!G.stoneSkinUsed) btns.push(`<button class="active-ability-btn" data-action="ability-stone-skin">🪨 Stone Skin</button>`);
  if(G.charms.includes('stampede')&&!G.stampedeTurnActive) btns.push(`<button class="active-ability-btn" data-action="ability-stampede">🦬 Stampede</button>`);
  if(G.charms.includes('alphas_mark')&&!G.alphasMarkActive&&G.selectedCardIds.size===1) btns.push(`<button class="active-ability-btn" data-action="ability-alphas-mark">⭐ Alpha's Mark</button>`);
  bar.innerHTML=btns.join('');
}

function renderDenMap(){
  const grid=document.getElementById('den-grid');
  const frag=document.createDocumentFragment();
  DENS.forEach((den,i)=>{
    const cleared=i<G.densCleared,current=!G.isEndless&&i===G.densCleared,locked=i>G.densCleared;
    const div=document.createElement('div');
    div.className='den-node'+(cleared?' cleared':current?' current':locked?' locked':'')+(den.isFinal?' final':'');
    let badge='';
    if(cleared)badge=`<span class="den-status-badge badge-cleared">✓ Done</span>`;
    else if(current)badge=`<span class="den-status-badge badge-current">► Enter</span>`;
    else if(den.isFinal)badge=`<span class="den-status-badge badge-final">⭐ Final</span>`;
    const bossTag=den.bossRule?`<div style="font-size:.6rem;color:var(--pink);margin-top:2px">👁️ ${den.bossRule.name}</div>`:'';
    div.innerHTML=`${badge}<span class="den-emoji-big" aria-hidden="true">${den.emoji}</span><div class="den-num">Den ${den.num}</div><div class="den-name-label">${den.name}</div><div style="font-size:.68rem;color:var(--gold)">${den.scoreTarget.toLocaleString()} pts target</div>${bossTag}`;
    if(!locked){
      div.setAttribute('role','button');div.setAttribute('tabindex','0');
      div.setAttribute('aria-label',`Enter Den ${den.num}: ${den.name}`);
      div.dataset.action='enter-den';div.dataset.denIdx=String(i);
    }
    frag.appendChild(div);
  });
  if(G.isEndless){
    const div=document.createElement('div');
    div.className='den-node current';
    div.innerHTML=`<span class="den-status-badge badge-current">► Enter</span><span class="den-emoji-big">🌀</span><div class="den-num">Den ${8+G.endlessCount}</div><div class="den-name-label">Wilds Beyond #${G.endlessCount}</div>`;
    div.setAttribute('role','button');div.setAttribute('tabindex','0');
    div.setAttribute('aria-label',`Enter Wilds Beyond #${G.endlessCount}`);
    div.dataset.action='enter-den';div.dataset.denIdx='-1';
    frag.appendChild(div);
  }
  grid.replaceChildren(frag);

  const charmRow=document.getElementById('map-charms-row');
  charmRow.innerHTML=G.charms.length===0
    ?'<span style="font-size:.75rem;color:var(--text-faint);font-style:italic">None yet</span>'
    :G.charms.map(cid=>{const c=CHARMS[cid];return `<div class="tooltip-wrap charm-mini" tabindex="0" aria-label="${c.name}: ${c.desc}">${c.emoji} ${c.name}<div class="tooltip-box" role="tooltip"><div class="tooltip-title">${c.emoji} ${c.name}</div>${c.desc}</div></div>`;}).join('');

  document.querySelectorAll('.diff-btn').forEach(b=>b.classList.toggle('active',b.id===`diff-${G.difficulty}`));

  const rb=document.getElementById('map-right-btn');
  const den=G.getCurrentDen();
  rb.innerHTML=(den?.shop&&G.densCleared>=den.num&&!G.isEndless)?`<button class="btn btn-gold" data-action="open-shop">🛒 Shop</button>`:'';
}

// ================================================================
// PLAYER ACTIONS
// ================================================================
function selectCard(cardId){
  if(G.stoneSkinActive){
    G.stoneSkinActive=false;G.stoneSkinUsed=true;G.stoneSkinCardId=cardId;
    closeModal('modal-generic');
    setLog('<b>Stone Skin</b> hardens — that card counts as 0 deadwood!');
    renderHandScreen();return;
  }
  if(G.phase!=='discard')return;
  const idStr=String(cardId);
  if(G.selectedCardIds.has(idStr)) G.selectedCardIds.delete(idStr);
  else G.selectedCardIds.add(idStr);
  renderPlayerHand();renderAbilityBar();
}

function clearSelection(){
  G.selectedCardIds.clear();renderPlayerHand();renderAbilityBar();
}

function doSetMeld(){
  if(G.phase!=='discard'||G.selectedCardIds.size<2)return;
  const selCards=[...G.selectedCardIds].map(id=>G.playerHand.find(c=>String(c.id)===id)).filter(Boolean);
  const v=validateProposedMeld(selCards);
  if(!v.valid){setLog(`<span style="color:var(--red)">Invalid meld: ${v.reason}</span>`);return;}
  G.committedMelds.push({type:v.type,cardIds:[...G.selectedCardIds],hab:v.hab??null});
  G.selectedCardIds.clear();
  const{score}=computeHandScore(G.committedMelds,G.playerHand,false);
  const den=G.getCurrentDen();
  const hit=score>=den.scoreTarget;
  setLog(`<span style="color:var(--green)">✓ ${v.type==='pack'?'Pack':'Trail'} set!</span> Running score: <b style="color:${hit?'var(--green)':'var(--gold)'}">${score.toLocaleString()}</b> / ${den.scoreTarget.toLocaleString()} target.`);
  renderPlayerHand();renderAbilityBar();
  Debug.event('meld_set',{type:v.type});
}

function unsetMeld(meldIndex){
  if(meldIndex<0||meldIndex>=G.committedMelds.length)return;
  G.committedMelds.splice(meldIndex,1);G.selectedCardIds.clear();
  setLog('Meld undone — cards returned to your hand.');renderPlayerHand();renderAbilityBar();
}

function doDrawStock(){
  if(G.phase!=='draw')return;
  if(G.stock.length===0){setLog('The stock is empty! The hand is a push.');endHandPush();return;}
  const card=G.stock.pop();
  G.playerHand.push(card);rollHogWilds(G.playerHand);
  G.phase='discard';G.selectedCardIds.clear();
  // ✅ cardLabel() ensures proper spacing e.g. "7 Biker Hog 🏍️" not "7Biker Hog🏍️"
  setLog(`You drew <b>${cardLabel(card)}</b> from the stock.`);
  renderHandScreen();_animateNewCard();
}

function doTakeDiscardAt(pileIdx){
  if(G.phase!=='draw'||G.discardPile.length===0)return;
  if(pileIdx<0||pileIdx>=G.discardPile.length)return;
  G.fanSelectedIdx=null;
  const taken=G.discardPile.splice(pileIdx);
  taken.forEach(c=>G.playerHand.push(c));
  rollHogWilds(G.playerHand);
  G.phase='discard';G.selectedCardIds.clear();
  const target=taken[0];
  if(taken.length===1){
    setLog(`You took <b>${cardLabel(target)}</b> from the discard.`);
  } else {
    setLog(`You reached deep and took <b>${cardLabel(target)}</b> plus <b>${taken.length-1}</b> card${taken.length>2?'s':''} above it!`);
  }
  renderHandScreen();
  setTimeout(()=>{
    const handEl=document.getElementById('player-hand-row');
    if(!handEl)return;
    [...handEl.querySelectorAll('.card')].slice(-taken.length).forEach((el,i)=>{
      setTimeout(()=>{el.classList.add('card-deal-anim');setTimeout(()=>el.classList.remove('card-deal-anim'),280);},i*40);
    });
  },10);
}

function doDiscard(){
  if(G.phase!=='discard'||G.selectedCardIds.size!==1)return;
  const id=[...G.selectedCardIds][0];
  if(G.getCommittedMeldIds().has(id))return;
  const idx=G.playerHand.findIndex(c=>String(c.id)===id);
  if(idx<0)return;
  animateDiscard(idx,()=>_doDiscardCommit(id));
}

function doSlamDown(){
  if(G.phase!=='discard'||G.selectedCardIds.size!==1)return;
  const id=[...G.selectedCardIds][0];
  if(G.getCommittedMeldIds().has(id))return;
  const idx=G.playerHand.findIndex(c=>String(c.id)===id);
  if(idx<0)return;
  const discarded=G.playerHand.splice(idx,1)[0];
  G.discardPile.push(discarded);
  G.selectedCardIds.clear();G.phase='over';
  resolveSlam(true);
  Debug.event('slam_down');
}

// ── Animations ──────────────────────────────────────────────────
function _animateNewCard(){
  requestAnimationFrame(()=>{
    const cards=document.getElementById('player-hand-row')?.querySelectorAll('.card');
    const last=cards?.[cards.length-1];
    if(last){last.classList.add('card-deal-anim');setTimeout(()=>last.classList.remove('card-deal-anim'),280);}
  });
}

function animateDiscard(cardIdx,callback){
  const handEl=document.getElementById('player-hand-row');
  const fanEl=document.getElementById('discard-fan');
  if(!handEl||!fanEl){callback();return;}
  const srcEl=handEl.querySelectorAll('.card')[cardIdx];
  if(!srcEl){callback();return;}
  const srcRect=srcEl.getBoundingClientRect();
  const fanRect=fanEl.getBoundingClientRect();
  const clone=srcEl.cloneNode(true);
  clone.style.cssText=[
    'position:fixed',`top:${srcRect.top}px`,`left:${srcRect.left}px`,
    `width:${srcRect.width}px`,`height:${srcRect.height}px`,
    'margin:0','z-index:9000','pointer-events:none',
    'transition:transform .28s cubic-bezier(.4,0,.2,1), opacity .28s',
    'border-radius:10px','will-change:transform,opacity',
  ].join(';');
  document.body.appendChild(clone);
  const dx=(fanRect.left+fanRect.width/2)-(srcRect.left+srcRect.width/2);
  const dy=(fanRect.top+fanRect.height/2)-(srcRect.top+srcRect.height/2);
  srcEl.style.visibility='hidden';
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    clone.style.transform=`translate(${dx}px,${dy}px) scale(.72) rotate(${(Math.random()*18-9).toFixed(1)}deg)`;
    clone.style.opacity='0';
  }));
  setTimeout(()=>{clone.remove();callback();},300);
}

function _doDiscardCommit(cardId){
  const idx=G.playerHand.findIndex(c=>String(c.id)===String(cardId));
  if(idx<0)return;
  const card=G.playerHand.splice(idx,1)[0];
  G.selectedCardIds.clear();
  G.committedMelds=G.committedMelds.filter(m=>!m.cardIds.includes(String(card.id)));
  G.discardPile.push(card);

  // Truffle Pig peek
  if(card.kind==='wild'&&card.wildId==='truffle_pig'&&G.stock.length>0){
    const peekN=Math.min(3,G.stock.length);
    G.peekCards=G.stock.slice(G.stock.length-peekN);
    showGenericModal('🐽 Truffle Pig Roots Around!',
      `Peek at the top ${peekN} cards: <b>${G.peekCards.map(c=>cardLabel(c)).join(', ')}</b><br><br><span class="note">They stay in this order. Plan wisely!</span>`,
      [{label:'Got it',cls:'btn btn-primary',fn:()=>closeModal('modal-generic')}]);
  }

  G.phase='opp';
  setLog(`You discarded <b>${cardLabel(card)}</b>.`);
  renderHandScreen();
  setTimeout(doOppTurn,800);
}

// ================================================================
// OPPONENT AI
// ================================================================
function doOppTurn(){
  document.getElementById('opp-thinking-label').style.display='block';
  setTimeout(()=>{_doOppTurnInner();document.getElementById('opp-thinking-label').style.display='none';},600);
}

function _doOppTurnInner(){
  const den=G.getCurrentDen();
  rollHogWilds(G.oppHand);
  let drawFromStock=true;
  if(G.discardPile.length>0){
    const top=G.discardPile[G.discardPile.length-1];
    const withDiscard=[...G.oppHand,top];
    let bestWith=Infinity;
    for(let i=0;i<withDiscard.length;i++){
      const{totalDW}=solveMelds(withDiscard.filter((_,j)=>j!==i),den.rankBuffs,false);
      bestWith=Math.min(bestWith,totalDW);
    }
    const{totalDW:cur}=solveMelds(G.oppHand,den.rankBuffs,false);
    if(bestWith<cur) drawFromStock=false;
  }
  if(drawFromStock){
    if(G.stock.length===0){setLog('Stock exhausted — the hand is a push!');endHandPush();return;}
    G.oppHand.push(G.stock.pop());
  } else {
    G.oppHand.push(G.discardPile.pop());
  }
  rollHogWilds(G.oppHand);

  let bestIdx=0,bestDW=Infinity;
  for(let i=0;i<G.oppHand.length;i++){
    const{totalDW}=solveMelds(G.oppHand.filter((_,j)=>j!==i),den.rankBuffs,false);
    if(totalDW<bestDW||(totalDW===bestDW&&cardDeadwoodCost(G.oppHand[i],den.rankBuffs)>cardDeadwoodCost(G.oppHand[bestIdx],den.rankBuffs))){
      bestDW=totalDW;bestIdx=i;
    }
  }

  {
    const trial=G.oppHand.filter((_,j)=>j!==bestIdx);
    const oppMelds=solveMelds(trial,den.rankBuffs,false);
    const oppChips=oppMelds.melds.reduce((s,m)=>s+m.cards.reduce((s2,c)=>s2+cardChipValue(c),0),0);
    const oppMult=Math.max(1,oppMelds.melds.reduce((s,m)=>s+(m.type==='trail'?2:1),0));
    const oppScore=Math.max(0,Math.floor(oppChips*oppMult)-oppMelds.totalDW);
    const diffMult={easy:1.2,medium:0.9,hard:0.7}[G.difficulty]??0.9;
    if(oppScore>=den.scoreTarget*diffMult){
      G.oppHand.splice(bestIdx,1);G.phase='over';
      setLog(`<b>${den.boss}</b> discards and <b style="color:var(--red)">SLAMS DOWN!</b> (${oppScore.toLocaleString()} pts)`);
      renderHandScreen();setTimeout(()=>resolveSlam(false),400);return;
    }
  }

  const discarded=G.oppHand.splice(bestIdx,1)[0];
  G.discardPile.push(discarded);G.phase='draw';G.turnCount++;
  setLog(`<b>${den.boss}</b> draws and discards. Your turn — draw from stock or take the discard.`);
  renderHandScreen();
}

// ================================================================
// SLAM RESOLUTION
// ================================================================
function resolveSlam(playerSlammed){
  const den=G.getCurrentDen();
  const isCleanSlam=G.getDeadwoodTotal()===0;
  const{chips,mult,score,breakdown,dwPenalty}=computeHandScore(G.committedMelds,G.playerHand,isCleanSlam);
  G.lastHandScore=score;

  const hasPiggyBank=G.playerHand.some(c=>c.kind==='wild'&&c.wildId==='piggy_bank');
  G.piggyBankStored=hasPiggyBank?Math.floor(score*0.5):0;

  const committedIds=G.getCommittedMeldIds();
  const guardInMeld=G.playerHand.some(c=>c.kind==='wild'&&c.wildId==='guard_hog'&&committedIds.has(String(c.id)));
  if(guardInMeld) G.permanentMult=parseFloat((G.permanentMult+0.5).toFixed(1));

  G.totalMeldsSet+=G.committedMelds.length;
  if(G.charms.includes('tusk_polish')&&Math.floor(G.totalMeldsSet/4)>Math.floor((G.totalMeldsSet-G.committedMelds.length)/4))
    G.permanentMult=parseFloat((G.permanentMult+1).toFixed(1));

  const oppResult=solveMelds(G.oppHand,den.rankBuffs,false);
  const oppChips=oppResult.melds.reduce((s,m)=>s+m.cards.reduce((s2,c)=>s2+cardChipValue(c),0),0);
  const oppMult=oppResult.melds.reduce((s,m)=>s+(m.type==='trail'?2:1),0)||1;
  const oppTargetMult=den.bossRule?.id==='alpha_mirrors'?G.permanentMult:1;
  const oppScore=Math.floor(oppChips*oppMult*oppTargetMult);

  const targetMet=score>=den.scoreTarget;
  let playerWinsHand=false,outcomeLabel='',outcomeColor='var(--red)';

  if(!playerSlammed){playerWinsHand=false;outcomeLabel='💀 Opponent Slammed!';outcomeColor='var(--red)';}
  else if(isCleanSlam&&targetMet){playerWinsHand=true;outcomeLabel='💫 CLEAN SLAM!';outcomeColor='var(--green)';}
  else if(targetMet){playerWinsHand=true;outcomeLabel='🐾 SLAM DOWN!';outcomeColor='var(--green)';}
  else if(G.charms.includes('thick_hide')&&!G.thickHideUsed){
    G.thickHideUsed=true;playerWinsHand=true;outcomeLabel='🛡️ Thick Hide absorbs the miss!';outcomeColor='var(--gold)';
  } else {playerWinsHand=false;outcomeLabel='❌ Target missed!';outcomeColor='var(--red)';}

  if(playerWinsHand) G.denPlayerWins++;
  else G.denOppWins++;

  let handAcorns=0;
  if(playerWinsHand){
    handAcorns+=Math.floor(score/100);
    if(G.charms.includes('golden_trough')) handAcorns*=2;
  }
  G.acorns+=handAcorns;G.handAcorns+=handAcorns;
  updateTopbar();Store.save(G);
  Debug.event('slam_resolve',{score,targetMet,playerWinsHand});

  const resultTitle=document.getElementById('hand-result-title');
  const resultBody=document.getElementById('hand-result-body');
  const reveal=document.getElementById('hand-reveal');
  resultTitle.textContent=outcomeLabel;resultTitle.style.color=outcomeColor;

  const bdHTML=breakdown.map(b=>{
    const col=b.type==='chips'?'var(--blue)':b.type==='mult'||b.type==='xmult'?'var(--pink)':b.type==='pig'?'var(--gold)':'var(--red)';
    const val=b.type==='chips'?`+${b.n} chips`:b.type==='xmult'?`×${b.n} mult`:b.type==='mult'?`+${(b.n?.toFixed?b.n.toFixed(1):b.n)} mult`:b.n;
    return `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border-soft);font-size:.75rem"><span style="color:var(--text-dim)">${b.label}</span><span style="color:${col};font-weight:800">${val}</span></div>`;
  }).join('');

  reveal.innerHTML=`<div style="grid-column:1/-1">
    <div style="text-align:center;margin-bottom:12px">
      <div style="font-size:.7rem;color:var(--text-faint);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">SCORE</div>
      <div style="font-family:'Lilita One',cursive;font-size:2.5rem;color:${playerWinsHand?'var(--green)':'var(--red)'}" aria-live="assertive">${score.toLocaleString()}</div>
      <div style="font-size:.8rem;color:var(--text-dim)">Target: ${den.scoreTarget.toLocaleString()} — ${playerWinsHand?'<span style=color:var(--green)>HIT ✓</span>':'<span style=color:var(--red)>MISSED ✗</span>'}</div>
    </div>
    <div style="background:var(--bg3);border-radius:8px;padding:10px;max-height:180px;overflow-y:auto">${bdHTML}</div>
  </div>`;

  resultBody.innerHTML=`<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:10px">
    <div style="text-align:center"><div style="font-size:.65rem;color:var(--text-faint);text-transform:uppercase">Chips</div><div style="font-family:'Lilita One',cursive;color:var(--blue);font-size:1.2rem">${chips}</div></div>
    <div style="text-align:center"><div style="font-size:.65rem;color:var(--text-faint);text-transform:uppercase">Mult</div><div style="font-family:'Lilita One',cursive;color:var(--pink);font-size:1.2rem">${mult.toFixed(1)}×</div></div>
    <div style="text-align:center"><div style="font-size:.65rem;color:var(--text-faint);text-transform:uppercase">Deadwood</div><div style="font-family:'Lilita One',cursive;color:var(--red);font-size:1.2rem">-${dwPenalty}</div></div>
    ${handAcorns>0?`<div style="text-align:center"><div style="font-size:.65rem;color:var(--text-faint);text-transform:uppercase">Acorns</div><div style="font-family:'Lilita One',cursive;color:var(--gold);font-size:1.2rem">+${handAcorns} 🌰</div></div>`:''}
    ${G.piggyBankStored>0?`<div style="text-align:center"><div style="font-size:.65rem;color:var(--text-faint);text-transform:uppercase">Banked</div><div style="font-family:'Lilita One',cursive;color:var(--gold);font-size:1.2rem">${G.piggyBankStored} 🐷</div></div>`:''}
    ${G.permanentMult>1?`<div style="text-align:center"><div style="font-size:.65rem;color:var(--text-faint);text-transform:uppercase">Perm Mult</div><div style="font-family:'Lilita One',cursive;color:var(--green);font-size:1.2rem">${G.permanentMult}×</div></div>`:''}
  </div>`;
  openModal('modal-hand-result');
}

function endHandPush(){
  const den=G.getCurrentDen();G.phase='over';
  const ps=G.committedMelds.length>0?computeHandScore(G.committedMelds,G.playerHand,false).score:0;
  const or=solveMelds(G.oppHand,den.rankBuffs,false);
  const oc=or.melds.reduce((s,m)=>s+m.cards.reduce((s2,c)=>s2+cardChipValue(c),0),0);
  const om=Math.max(1,or.melds.reduce((s,m)=>s+(m.type==='trail'?2:1),0));
  const os=Math.max(0,Math.floor(oc*om)-or.totalDW);
  if(ps>os){G.denPlayerWins++;showGenericModal('🃏 Stock Exhausted — You Win!',`Your ${ps.toLocaleString()} beats their ${os.toLocaleString()}.`,[{label:'Continue →',cls:'btn btn-primary',fn:()=>{closeModal('modal-generic');continueAfterHandPush();}}]);}
  else if(os>ps){G.denOppWins++;showGenericModal('🃏 Stock Exhausted — Opponent Wins',`Their ${os.toLocaleString()} beats your ${ps.toLocaleString()}.`,[{label:'Continue →',cls:'btn btn-primary',fn:()=>{closeModal('modal-generic');continueAfterHandPush();}}]);}
  else showGenericModal('⚖️ Tie',`Scores tied at ${ps.toLocaleString()} each.`,[{label:'Continue →',cls:'btn btn-primary',fn:()=>{closeModal('modal-generic');continueAfterHandPush();}}]);
}

function continueAfterHandPush(){
  const den=G.getCurrentDen();
  if(G.denPlayerWins>=den.handsToWin||G.denOppWins>=den.handsToWin) showDenResult();
  else startNewHand();
}

function nextHandOrDenResult(){
  closeModal('modal-hand-result');
  const den=G.getCurrentDen();
  if(G.denPlayerWins>=den.handsToWin||G.denOppWins>=den.handsToWin) showDenResult();
  else startNewHand();
}

// ================================================================
// DEN RESULT
// ================================================================
function showDenResult(){
  const den=G.getCurrentDen();
  const playerWon=G.denPlayerWins>=den.handsToWin;
  showScreen('screen-den-result');
  if(playerWon){
    const denBonus=den.acorns*(G.charms.includes('golden_trough')?2:1);
    G.acorns+=denBonus;
    if(!G.isEndless) G.densCleared=Math.max(G.densCleared,den.num);
    G.thickHideUsed=false;updateTopbar();Store.save(G);
    Debug.event('den_cleared',{den:den.num});
  }
  const hero=document.getElementById('den-result-hero');
  if(playerWon){
    let bd=`<div class="rb-item"><span class="rb-val">+${den.acorns*(G.charms.includes('golden_trough')?2:1)}</span><span class="rb-label">Den Reward</span></div>`;
    if(G.handAcorns>0)bd+=`<div class="rb-item"><span class="rb-val">+${G.handAcorns}</span><span class="rb-label">Hand Bonuses</span></div>`;
    let btns=`<button class="btn btn-gold" data-action="start-draft">🐖 Draft a Wild Pig</button>`;
    if(den.deckCull)btns+=` <button class="btn btn-ghost" data-action="start-cull">✂️ Cull Deck</button>`;
    if(den.isFinal&&!G.isEndless){
      btns=`<button class="btn btn-primary btn-lg" data-action="start-endless">🌀 Wilds Beyond</button> `+btns;
      hero.innerHTML=`<div class="result-icon">🏆</div><div class="result-title" style="color:var(--gold)">THE ALPHA FALLS!</div><div class="result-sub">You've conquered all 8 Dens!<br>The Wilds Beyond await…</div><div class="result-breakdown">${bd}</div><div style="margin-bottom:16px"><div class="result-acorns">🌰 ${G.acorns}</div></div><div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">${btns}</div>`;
      return;
    }
    hero.innerHTML=`<div class="result-icon">🏆</div><div class="result-title" style="color:var(--green)">Den Cleared!</div><div class="result-sub">${den.emoji} <b>${den.name}</b> defeated ${G.denPlayerWins}–${G.denOppWins}</div><div class="result-breakdown">${bd}</div><div style="margin-bottom:16px"><div style="font-size:.8rem;color:var(--text-faint);margin-bottom:4px">Total Acorns</div><div class="result-acorns">🌰 ${G.acorns}</div></div><div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">${btns}</div>`;
  } else {
    hero.innerHTML=`<div class="result-icon">💀</div><div class="result-title" style="color:var(--red)">Defeated…</div><div class="result-sub">The <b>${den.boss}</b> drove you out of <b>${den.name}</b> (${G.denPlayerWins}–${G.denOppWins}).</div><div class="result-acorns" style="font-size:1.5rem">🌰 ${G.acorns} Acorns saved</div><div style="margin-top:20px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn btn-primary btn-lg" data-action="new-game">🔄 Start New Run</button></div>`;
  }
}

function startEndless(){
  G.isEndless=true;G.endlessCount=1;G.denPlayerWins=0;G.denOppWins=0;
  G.thickHideUsed=false;G.handNum=0;G.handAcorns=0;
  renderDenMap();showScreen('screen-map');
}

// ================================================================
// DRAFT
// ================================================================
function startDraft(){
  const den=G.getCurrentDen();
  const pool=buildDraftPool(den);
  showScreen('screen-draft');G._draftPool=pool;G._draftChosen=null;
  const grid=document.getElementById('draft-pick-grid');
  grid.innerHTML=pool.map((p,i)=>{
    const desc=WILD_PIGS[p.id].desc;
    return `<div class="pick-card" role="button" tabindex="0" data-action="choose-draft" data-idx="${i}" aria-label="${p.name}: ${desc}"><span class="pick-emoji" aria-hidden="true">${p.emoji}</span><div class="pick-rarity ${p.rarity}">${p.rarity.toUpperCase()}</div><div class="pick-name">${p.name}</div><div class="pick-desc">${desc}</div></div>`;
  }).join('');
  document.getElementById('btn-draft-confirm').disabled=true;
}

function buildDraftPool(den){
  const pool=den.wildPool??['common'];
  let cands=Object.values(WILD_PIGS).filter(p=>pool.includes(p.rarity));
  if(den.guaranteedLegendary) cands=cands.filter(p=>p.rarity==='legendary').concat(cands.filter(p=>p.rarity!=='legendary'));
  shuffle(cands);
  const owned=G.playerDeck.filter(c=>c.kind==='wild').map(c=>c.wildId);
  cands=cands.filter(p=>!owned.includes(p.id));
  if(cands.length===0) cands=Object.values(WILD_PIGS).slice();
  return cands.slice(0,Math.min(den.wildChoices??2,cands.length));
}

function chooseDraft(i){
  document.querySelectorAll('.pick-card').forEach(el=>{el.classList.remove('chosen');el.setAttribute('aria-pressed','false');});
  const el=document.querySelector(`.pick-card[data-idx="${i}"]`);
  if(el){el.classList.add('chosen');el.setAttribute('aria-pressed','true');}
  G._draftChosen=i;
  document.getElementById('btn-draft-confirm').disabled=false;
}
function confirmDraft(){
  if(G._draftChosen===null)return;
  const pig=G._draftPool[G._draftChosen];
  G.playerDeck.push(makeWildPig(pig.id,G));
  flyAcorns(`Added ${pig.emoji} ${pig.name} to deck!`);
  updateTopbar();afterDraft();
}
function skipDraft(){afterDraft();}
function afterDraft(){
  const den=G.getCurrentDen();
  if(den.shop&&!G.isEndless){showScreen('screen-map');renderDenMap();}
  else advanceDen();
}

// ================================================================
// DECK CULL
// ================================================================
function startCull(){
  showScreen('screen-cull');G._cullChosen=null;
  const zone=document.getElementById('cull-zone');
  const cullable=G.playerDeck.filter(c=>c.kind==='animal');
  const habColors={forest:'#1a3a14',plains:'#3a2e0a',tundra:'#0a2235',swamp:'#0a2820'};
  const habBorder={forest:'#2d6a22',plains:'#7a6010',tundra:'#1060a0',swamp:'#107050'};
  const habText={forest:'#7ed957',plains:'#f3bb4a',tundra:'#5cc8ff',swamp:'#7ee8c0'};
  zone.innerHTML=cullable.map((c,i)=>
    `<div class="cull-card" role="button" tabindex="0" data-action="choose-cull" data-idx="${i}" style="background:${habColors[c.hab]};border-color:${habBorder[c.hab]};color:${habText[c.hab]}" aria-label="Remove ${c.name} ${c.habEmoji}">${c.value}</div>`
  ).join('');
  document.getElementById('btn-cull-confirm').disabled=true;
  G._cullCandidates=cullable;
}
function chooseCull(i){
  document.querySelectorAll('.cull-card').forEach(el=>el.classList.remove('cull-chosen'));
  document.querySelector(`.cull-card[data-idx="${i}"]`)?.classList.add('cull-chosen');
  G._cullChosen=i;document.getElementById('btn-cull-confirm').disabled=false;
}
function confirmCull(){
  if(G._cullChosen===null)return;
  const card=G._cullCandidates[G._cullChosen];
  const idx=G.playerDeck.findIndex(c=>c.id===card.id);
  if(idx>=0)G.playerDeck.splice(idx,1);
  updateTopbar();flyAcorns(`Culled ${card.name} ${card.habEmoji} from deck`);advanceDen();
}
function skipCull(){advanceDen();}
function advanceDen(){
  if(G.isEndless){G.endlessCount++;G.denPlayerWins=0;G.denOppWins=0;G.thickHideUsed=false;G.handNum=0;G.handAcorns=0;}
  renderDenMap();showScreen('screen-map');
}

// ================================================================
// SHOP
// ================================================================
function openShop(){
  const den=G.getCurrentDen();const shopSize=den.shopSize??1;
  showScreen('screen-shop');
  document.getElementById('shop-subtitle').textContent=`Spend Acorns on permanent Charms. ${shopSize} slot${shopSize>1?'s':''} available.`;
  const all=Object.values(CHARMS);shuffle(all);
  const avail=all.filter(c=>!G.charms.includes(c.id)).slice(0,Math.min(shopSize+2,all.length));
  document.getElementById('shop-items').innerHTML=avail.map(c=>{
    const owned=G.charms.includes(c.id);const cant=G.acorns<c.price&&!owned;
    return `<div class="shop-item${owned?' owned':cant?' cant-afford':''}" ${!owned&&!cant?`role="button" tabindex="0" data-action="buy-charm" data-charm-id="${c.id}" aria-label="Buy ${c.name} for ${c.price} acorns"`:'aria-disabled="true"'}>
      <span class="shop-emoji" aria-hidden="true">${c.emoji}</span>
      <div class="shop-info"><div class="shop-name">${c.name} <span class="pick-rarity ${c.rarity}" style="font-size:.65rem">${c.rarity.toUpperCase()}</span></div>
      <div style="font-size:.75rem;color:var(--text-dim);margin:3px 0">${c.desc}</div>
      <div class="${owned?'shop-price owned-label':'shop-price'}">${owned?'✓ Owned':`🌰 ${c.price} Acorns`}</div></div></div>`;
  }).join('');
}
function buyCharm(id){
  const c=CHARMS[id];
  if(!c||G.charms.includes(id)||G.acorns<c.price)return;
  G.acorns-=c.price;G.charms.push(id);updateTopbar();flyAcorns(`-${c.price} 🌰 — ${c.emoji} ${c.name}!`);
  openShop();Store.save(G);
}
function leaveShop(){renderDenMap();showScreen('screen-map');}

// ================================================================
// ABILITIES
// ================================================================
function useShowPig(){
  if(G.showPigUsed||G.phase==='draw')return;
  G.showPigUsed=true;
  const den=G.getCurrentDen();
  const{deadwood}=solveMelds(G.oppHand,den.rankBuffs,false);
  if(deadwood.length===0){
    showGenericModal('🎀 Show Pig','The opponent has no unmelded cards!',[{label:'Noted!',cls:'btn btn-primary',fn:()=>closeModal('modal-generic')}]);
  } else {
    const highest=deadwood.reduce((a,b)=>cardDeadwoodCost(b,den.rankBuffs)>cardDeadwoodCost(a,den.rankBuffs)?b:a);
    showGenericModal('🎀 Show Pig Struts!',
      `Opponent's highest unmelded: <b style="color:var(--gold)">${cardLabel(highest)}</b> (${cardDeadwoodCost(highest,den.rankBuffs)} DW).<br>They have <b>${deadwood.length}</b> unmelded totalling <b>${deadwood.reduce((s,c)=>s+cardDeadwoodCost(c,den.rankBuffs),0)}</b> DW.`,
      [{label:'Thanks!',cls:'btn btn-primary',fn:()=>closeModal('modal-generic')}]);
  }
  renderAbilityBar();
}
function useGreasedPiglet(){
  if(G.greasedPigletUsed||G.discardPile.length===0)return;
  const pigIdx=G.playerHand.findIndex(c=>c.kind==='wild'&&c.wildId==='greased_piglet');
  if(pigIdx<0)return;
  G.greasedPigletUsed=true;
  const pig=G.playerHand.splice(pigIdx,1)[0];
  const top=G.discardPile.pop();
  G.playerHand.push(top);G.discardPile.push(pig);
  rollHogWilds(G.playerHand);
  setLog(`<b>Greased Piglet</b> swaps for <b>${cardLabel(top)}</b>!`);
  renderHandScreen();
}
function useSecondWind(){
  if(G.secondWindUsed)return;
  G.secondWindUsed=true;
  const sz=G.playerHand.length-(G.phase==='discard'?1:0);
  G.stock.push(...G.playerHand);G.playerHand=[];shuffle(G.stock);
  for(let i=0;i<Math.min(sz,G.stock.length);i++)G.playerHand.push(G.stock.pop());
  rollHogWilds(G.playerHand);G.selectedCardIds.clear();G.committedMelds=[];
  setLog('<b>Second Wind!</b> Hand redealt.');G.phase='discard';renderHandScreen();
}
function useMirrorPond(){
  if(G.mirrorPondUsed||G.phase==='opp')return;
  showGenericModal('🪞 Mirror Pond','Choose a rank to pull from the stock:',
    RANKS.map(r=>({label:`${r.emoji} ${r.value} — ${r.name}`,cls:'btn btn-ghost btn-sm',fn:()=>{
      closeModal('modal-generic');
      const idx=G.stock.findIndex(c=>c.kind==='animal'&&c.value===r.value);
      if(idx<0){setLog(`<span class="log-bad">Mirror Pond:</span> No <b>${r.name}</b> in stock!`);return;}
      G.mirrorPondUsed=true;
      const card=G.stock.splice(idx,1)[0];
      G.playerHand.push(card);rollHogWilds(G.playerHand);G.phase='discard';G.selectedCardIds.clear();
      setLog(`<b>Mirror Pond</b> pulls <b>${cardLabel(card)}</b> from the stock!`);renderHandScreen();
    }})));
}
function useStoneSkin(){
  if(G.stoneSkinUsed)return;
  showGenericModal('🪨 Stone Skin','Click a card in your hand to mark it as 0 deadwood.',
    [{label:'Cancel',cls:'btn btn-ghost',fn:()=>closeModal('modal-generic')}]);
  G.stoneSkinActive=true;
}
function useStampede(){
  if(G.stampedeTurnActive)return;
  G.stampedeTurnActive=true;setLog('<b>🦬 The Stampede!</b> Bison and Bear score triple chips this hand.');
  renderAbilityBar();renderScoreTicker();
}
function useAlphasMark(){
  if(G.alphasMarkActive||G.selectedCardIds.size!==1)return;
  G.alphasMarkActive=true;setLog("<b>⭐ Alpha's Mark!</b> That card counts as any rank in your next meld.");
  renderAbilityBar();
}

// ================================================================
// DIFFICULTY & SORT
// ================================================================
function setDifficulty(d){
  G.difficulty=d;G.applyDifficultyTargets();renderDenMap();
  Debug.event('difficulty_set',{d});
}
function toggleSort(mode){
  G.handSort=G.handSort===mode?'dealt':mode;
  const btnR=document.getElementById('sort-rank-btn');
  const btnH=document.getElementById('sort-hab-btn');
  if(btnR){btnR.style.background=G.handSort==='rank'?'var(--blue)':'';btnR.style.color=G.handSort==='rank'?'#001a2a':'';}
  if(btnH){btnH.style.background=G.handSort==='habitat'?'var(--green)':'';btnH.style.color=G.handSort==='habitat'?'#001a0a':'';}
  renderPlayerHand();
}

// ================================================================
// MODAL & UI HELPERS
// ================================================================
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const el=document.getElementById(id);
  el.classList.add('active');
  if(id==='screen-map'||id==='screen-title') document.body.className='';
  // Move focus to first interactive element in new screen
  requestAnimationFrame(()=>{
    const first=el.querySelector('button,[role="button"],[tabindex="0"]');
    first?.focus({preventScroll:true});
  });
}

function openModal(id){
  const modal=document.getElementById(id);
  modal.classList.remove('hidden');
  modal.removeAttribute('aria-hidden');
  // Focus trap
  const getFocusable=()=>[...modal.querySelectorAll('button:not([disabled]),[tabindex="0"]:not([disabled]),input,select,textarea,a[href]')];
  modal._trap=(e)=>{
    if(e.key!=='Tab')return;
    const els=getFocusable();
    if(!els.length)return;
    const first=els[0],last=els[els.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  };
  modal._esc=(e)=>{if(e.key==='Escape')closeModal(id);};
  modal.addEventListener('keydown',modal._trap);
  document.addEventListener('keydown',modal._esc);
  requestAnimationFrame(()=>getFocusable()[0]?.focus());
}

function closeModal(id){
  const modal=document.getElementById(id);
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden','true');
  if(modal._trap){modal.removeEventListener('keydown',modal._trap);delete modal._trap;}
  if(modal._esc){document.removeEventListener('keydown',modal._esc);delete modal._esc;}
}

function setLog(html){
  document.getElementById('log-zone').innerHTML=html;
  // Mirror to aria-live region (plain text, no HTML tags)
  const live=document.getElementById('log-live');
  if(live) live.textContent=document.getElementById('log-zone').textContent;
}

function updateTopbar(){
  document.getElementById('stat-acorns').textContent=G.acorns;
  document.getElementById('stat-den').textContent=G.isEndless?`WB #${G.endlessCount}`:`${G.densCleared+1}/8`;
  document.getElementById('stat-deck').textContent=G.playerDeck.length;
}

function flyAcorns(msg){
  const el=document.createElement('div');
  el.className='fly-acorn';el.textContent=msg;
  el.style.top='60px';el.style.left='50%';el.style.transform='translateX(-50%)';
  el.setAttribute('aria-live','polite');
  document.body.appendChild(el);setTimeout(()=>el.remove(),1100);
}

function showGenericModal(title,bodyOrBtns,btns){
  document.getElementById('gen-modal-title').textContent=title;
  if(btns===undefined){
    document.getElementById('gen-modal-body').innerHTML=bodyOrBtns;
    document.getElementById('gen-modal-btns').innerHTML='';
  } else if(typeof bodyOrBtns==='string'){
    document.getElementById('gen-modal-body').innerHTML=bodyOrBtns;
    const btnsEl=document.getElementById('gen-modal-btns');
    btnsEl.innerHTML=btns.map((b,i)=>`<button class="${b.cls}" id="gmb${i}">${b.label}</button>`).join('');
    btns.forEach((b,i)=>document.getElementById(`gmb${i}`).addEventListener('click',b.fn));
  } else {
    document.getElementById('gen-modal-body').innerHTML='';
    const btnsEl=document.getElementById('gen-modal-btns');
    btnsEl.innerHTML=bodyOrBtns.map((b,i)=>`<button class="${b.cls}" id="gmb${i}">${b.label}</button>`).join('');
    bodyOrBtns.forEach((b,i)=>document.getElementById(`gmb${i}`).addEventListener('click',b.fn));
  }
  openModal('modal-generic');
}

function showCharmsSummary(){
  document.getElementById('charms-modal-body').innerHTML=G.charms.length===0
    ?'<p style="color:var(--text-faint);font-style:italic">No Charms yet — visit a shop after clearing a Den!</p>'
    :G.charms.map(cid=>{const c=CHARMS[cid];return `<div style="margin-bottom:10px"><div style="font-weight:800;font-size:.9rem;margin-bottom:2px">${c.emoji} ${c.name} <span class="pick-rarity ${c.rarity}" style="font-size:.65rem">${c.rarity.toUpperCase()}</span></div><div style="font-size:.78rem;color:var(--text-dim)">${c.desc}</div></div>`;}).join('<hr class="sep">');
  openModal('modal-charms');
}

// ================================================================
// TUTORIAL
// ================================================================
const TUTORIAL_CONTENT={
  basics:`<div class="tut-section"><h3>The Goal</h3>
<div class="tut-row"><span class="tut-icon" aria-hidden="true">🎯</span><span>Hit the <b>score target</b> before the opponent Slams Down. Melds generate Chips × Mult = Score.</span></div>
<div class="tut-row"><span class="tut-icon" aria-hidden="true">🃏</span><span>Draw from the <b>Stock</b> or take from the <b>Discard Fan</b>. You can reach deep into the discard — but you take every card above it too.</span></div>
<div class="tut-row"><span class="tut-icon" aria-hidden="true">✅</span><span>Select cards and press <b>Set Pack</b> or <b>Set Trail</b> to commit a meld. Then select one deadwood card and press <b>Discard</b> or <b>Slam Down!</b></span></div>
<div class="tut-row"><span class="tut-icon" aria-hidden="true">🏆</span><span>Win enough hands to clear the Den. Lose all hands and the run ends.</span></div></div>
<div class="tut-section"><h3>Melds</h3>
<div class="tut-row"><span class="tut-icon" aria-hidden="true">📦</span><span><b>Pack</b> — 3+ cards of the same rank, any habitat. +1× Mult.</span></div>
<div class="tut-row"><span class="tut-icon" aria-hidden="true">🔗</span><span><b>Trail</b> — 3+ consecutive ranks in the <i>same</i> habitat. +2× Mult.</span></div>
<div class="tut-row"><span class="tut-icon" aria-hidden="true">🌀</span><span>True Wilds (Mud Pig, Boss Hog) fill any rank or bridge a single gap in a Trail.</span></div></div>`,
  scoring:`<div class="tut-section"><h3>Chips × Mult = Score</h3>
<div class="tut-row"><span class="tut-icon" aria-hidden="true">💎</span><span><b>Chips</b> = sum of card face values in melds. Deadwood cards are subtracted as a penalty.</span></div>
<div class="tut-row"><span class="tut-icon" aria-hidden="true">✖️</span><span><b>Mult</b> starts at your permanent mult (1.0), adds from meld types, Wild Pig triggers, and Charms.</span></div>
<div class="tut-row"><span class="tut-icon" aria-hidden="true">💫</span><span><b>Clean Slam</b> (zero deadwood) gives ×2 mult!</span></div></div>
<div class="tut-section"><h3>Boss Rules</h3><div class="tut-row"><span class="tut-icon" aria-hidden="true">👁️</span><span>Dens 3–8 have a Boss Rule modifying scoring. Read it in the Den header.</span></div></div>`,
  pigs:`<div class="tut-section"><h3>Wild Pig Cards</h3><div class="tut-row"><span class="tut-icon" aria-hidden="true">🐖</span><span>Wild Pigs are drafted after each Den. They fire scoring triggers when you Slam Down.</span></div></div>
<div class="tut-card-grid">${Object.values(WILD_PIGS).map(p=>`<div class="tut-card"><div class="tut-card-name">${p.emoji} ${p.name} <span class="tut-rarity-${p.rarity}">${p.rarity.toUpperCase()}</span></div><div class="tut-card-desc">${p.desc}</div></div>`).join('')}</div>`,
  charms:`<div class="tut-section"><h3>Planet Charms (Permanent)</h3>
<div class="tut-card-grid">${Object.values(CHARMS).filter(c=>c.kind==='planet').map(ch=>`<div class="tut-card"><div class="tut-card-name">${ch.emoji} ${ch.name} <span class="tut-rarity-${ch.rarity}">${ch.rarity.toUpperCase()}</span> <span style="color:var(--text-faint);font-size:.62rem">🌰${ch.price}</span></div><div class="tut-card-desc">${ch.desc}</div></div>`).join('')}</div>
<div class="tut-section" style="margin-top:12px"><h3>Tarot Charms (Active)</h3>
<div class="tut-card-grid">${Object.values(CHARMS).filter(c=>c.kind==='tarot').map(ch=>`<div class="tut-card"><div class="tut-card-name">${ch.emoji} ${ch.name} <span class="tut-rarity-${ch.rarity}">${ch.rarity.toUpperCase()}</span> <span style="color:var(--text-faint);font-size:.62rem">🌰${ch.price}</span></div><div class="tut-card-desc">${ch.desc}</div></div>`).join('')}</div>`,
};

let _tutTab='basics';
function showTutorial(tab){
  _tutTab=tab??'basics';tutTab(_tutTab);openModal('modal-tutorial');
}
function tutTab(tab){
  _tutTab=tab;
  document.querySelectorAll('.tut-tab').forEach(b=>{
    const match=b.dataset.tab===tab;
    b.classList.toggle('active',match);b.setAttribute('aria-selected',String(match));
  });
  const el=document.getElementById('tutorial-content');
  if(el)el.innerHTML=TUTORIAL_CONTENT[tab]??'';
}

// ================================================================
// EVENT DELEGATION  — single listener replaces ALL inline onclick
// ================================================================
document.addEventListener('click',handleGlobalClick);
document.addEventListener('keydown',e=>{
  // Enter/Space activates data-action elements for keyboard users
  if(e.key==='Enter'||e.key===' '){
    const el=e.target.closest('[data-action]');
    if(el){e.preventDefault();el.click();}
  }
});

function handleGlobalClick(e){
  const el=e.target.closest('[data-action]');
  if(!el)return;
  const a=el.dataset.action;
  switch(a){
    case 'start-game':              startGame();break;
    case 'enter-den':               enterDen(parseInt(el.dataset.denIdx,10));break;
    case 'set-difficulty':          setDifficulty(el.dataset.diff);break;
    case 'open-shop':               openShop();break;
    case 'leave-shop':              leaveShop();break;
    case 'show-charms':             showCharmsSummary();break;
    case 'show-tutorial':           showTutorial();break;
    case 'draw-stock':              doDrawStock();break;
    case 'fan-click':               fanCardClick(parseInt(el.dataset.idx,10));break;
    case 'fan-confirm':             fanConfirmTake();break;
    case 'fan-cancel':              fanCancelTake();break;
    case 'select-card':             selectCard(el.dataset.cardId);break;
    case 'unmeld':                  unsetMeld(parseInt(el.dataset.idx,10));break;
    case 'set-meld':                doSetMeld();break;
    case 'clear-sel':               clearSelection();break;
    case 'discard':                 doDiscard();break;
    case 'slam-down':               doSlamDown();break;
    case 'sort-rank':               toggleSort('rank');break;
    case 'sort-habitat':            toggleSort('habitat');break;
    case 'hand-result-next':        nextHandOrDenResult();break;
    case 'start-draft':             startDraft();break;
    case 'start-cull':              startCull();break;
    case 'start-endless':           startEndless();break;
    case 'new-game':                startGame();break;
    case 'choose-draft':            chooseDraft(parseInt(el.dataset.idx,10));break;
    case 'draft-confirm':           confirmDraft();break;
    case 'draft-skip':              skipDraft();break;
    case 'choose-cull':             chooseCull(parseInt(el.dataset.idx,10));break;
    case 'cull-confirm':            confirmCull();break;
    case 'cull-skip':               skipCull();break;
    case 'buy-charm':               buyCharm(el.dataset.charmId);break;
    case 'close-modal':             closeModal(el.dataset.modalId);break;
    case 'tut-tab':                 tutTab(el.dataset.tab);break;
    case 'ability-show-pig':        useShowPig();break;
    case 'ability-greased-piglet':  useGreasedPiglet();break;
    case 'ability-second-wind':     useSecondWind();break;
    case 'ability-mirror-pond':     useMirrorPond();break;
    case 'ability-stone-skin':      useStoneSkin();break;
    case 'ability-stampede':        useStampede();break;
    case 'ability-alphas-mark':     useAlphasMark();break;
  }
}

function fanCardClick(pileIdx){
  if(G.phase!=='draw')return;
  const topIdx=G.discardPile.length-1;
  if(pileIdx===topIdx){G.fanSelectedIdx=null;doTakeDiscardAt(pileIdx);return;}
  G.fanSelectedIdx=(G.fanSelectedIdx===pileIdx)?null:pileIdx;
  renderDiscardFan();
}
function fanConfirmTake(){if(G.fanSelectedIdx!==null)doTakeDiscardAt(G.fanSelectedIdx);}
function fanCancelTake(){G.fanSelectedIdx=null;renderDiscardFan();}

// ================================================================
// INIT
// ================================================================
document.addEventListener('DOMContentLoaded',()=>{
  const saved=Store.load();
  if(saved){
    G.loadSave(saved);
    Debug.log('Restored saved run',saved);
  }
  Debug.log('SlamPigs initialized. Add ?debug=1 to URL for debug logs.');
});
