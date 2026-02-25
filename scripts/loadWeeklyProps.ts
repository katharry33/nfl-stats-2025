#!/usr/bin/env npx tsx
// scripts/Loadweeklyprops.ts
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

if (!getApps().length) {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  initializeApp(key ? { credential: cert(JSON.parse(key)) } : undefined);
}
const db = getFirestore();

const ARGS      = process.argv.slice(2);
const WEEK      = parseInt(ARGS.find(a => a.startsWith('--week='))?.split('=')[1] ?? '22');
const SEASON    = parseInt(ARGS.find(a => a.startsWith('--season='))?.split('=')[1] ?? '2025');
const DRY_RUN   = ARGS.includes('--dry-run');
const POST_GAME = ARGS.includes('--post-game');
const COLLECTION = `allProps_${SEASON}`;

const TR_URLS: Record<string, string> = {
  'pass yds':     'https://www.teamrankings.com/nfl/stat/opponent-passing-yards-per-game',
  'pass att':     'https://www.teamrankings.com/nfl/stat/opponent-pass-attempts-per-game',
  'pass cmp':     'https://www.teamrankings.com/nfl/stat/opponent-pass-completions-per-game',
  'pass tds':     'https://www.teamrankings.com/nfl/stat/opponent-passing-touchdowns-per-game',
  'rush yds':     'https://www.teamrankings.com/nfl/stat/opponent-rushing-yards-per-game',
  'rush att':     'https://www.teamrankings.com/nfl/stat/opponent-rush-attempts-per-game',
  'rush tds':     'https://www.teamrankings.com/nfl/stat/opponent-rushing-touchdowns-per-game',
  'rec yds':      'https://www.teamrankings.com/nfl/stat/opponent-receiving-yards-per-game',
  'recs':         'https://www.teamrankings.com/nfl/stat/opponent-receptions-per-game',
  'rec tds':      'https://www.teamrankings.com/nfl/stat/opponent-receiving-touchdowns-per-game',
  'ints':         'https://www.teamrankings.com/nfl/stat/opponent-interceptions-thrown-per-game',
  'rush+rec yds': 'https://www.teamrankings.com/nfl/stat/opponent-rushing-yards-per-game',
  'pass+rush yds':'https://www.teamrankings.com/nfl/stat/opponent-total-yards-per-game',
};

const TEAM_NAME_TO_ABBR: Record<string, string> = {
  'Arizona Cardinals':'ARI','Atlanta Falcons':'ATL','Baltimore Ravens':'BAL',
  'Buffalo Bills':'BUF','Carolina Panthers':'CAR','Chicago Bears':'CHI',
  'Cincinnati Bengals':'CIN','Cleveland Browns':'CLE','Dallas Cowboys':'DAL',
  'Denver Broncos':'DEN','Detroit Lions':'DET','Green Bay Packers':'GB',
  'Houston Texans':'HOU','Indianapolis Colts':'IND','Jacksonville Jaguars':'JAX',
  'Kansas City Chiefs':'KC','Los Angeles Chargers':'LAC','Los Angeles Rams':'LAR',
  'Las Vegas Raiders':'LV','Miami Dolphins':'MIA','Minnesota Vikings':'MIN',
  'New England Patriots':'NE','New Orleans Saints':'NO','New York Giants':'NYG',
  'New York Jets':'NYJ','Philadelphia Eagles':'PHI','Pittsburgh Steelers':'PIT',
  'Seattle Seahawks':'SEA','San Francisco 49ers':'SF','Tampa Bay Buccaneers':'TB',
  'Tennessee Titans':'TEN','Washington Commanders':'WAS',
  'Cardinals':'ARI','Falcons':'ATL','Ravens':'BAL','Bills':'BUF','Panthers':'CAR',
  'Bears':'CHI','Bengals':'CIN','Browns':'CLE','Cowboys':'DAL','Broncos':'DEN',
  'Lions':'DET','Packers':'GB','Texans':'HOU','Colts':'IND','Jaguars':'JAX',
  'Chiefs':'KC','Chargers':'LAC','Rams':'LAR','Raiders':'LV','Dolphins':'MIA',
  'Vikings':'MIN','Patriots':'NE','Saints':'NO','Giants':'NYG','Jets':'NYJ',
  'Eagles':'PHI','Steelers':'PIT','Seahawks':'SEA','49ers':'SF',
  'Buccaneers':'TB','Titans':'TEN','Commanders':'WAS',
};

const BP_TO_PROP: Record<string, string> = {
  'passing yards':'Pass Yards','pass yards':'Pass Yards',
  'passing attempts':'Pass Attempts','pass attempts':'Pass Attempts',
  'passing completions':'Pass Completions','pass completions':'Pass Completions',
  'passing touchdowns':'Pass TDs','pass touchdowns':'Pass TDs','pass tds':'Pass TDs',
  'rushing yards':'Rush Yards','rush yards':'Rush Yards',
  'rushing attempts':'Rush Attempts','rush attempts':'Rush Attempts',
  'rushing touchdowns':'Rush TDs','rush touchdowns':'Rush TDs',
  'receiving yards':'Rec Yards','rec yards':'Rec Yards',
  'receptions':'Receptions',
  'receiving touchdowns':'Rec TDs','rec touchdowns':'Rec TDs',
  'anytime touchdown scorer':'Anytime TD','anytime td':'Anytime TD',
  'rush + rec yards':'Rush + Rec Yards','rush+rec yards':'Rush + Rec Yards',
  'pass + rush yards':'Pass + Rush Yards','pass+rush yards':'Pass + Rush Yards',
  'interceptions':'Interceptions','interceptions thrown':'Interceptions',
};

interface RawProp { player:string; prop:string; propNorm:string; line:number; overunder:string; odds:number; source:string; }
interface PFRGame { week:number; date:string; passYds:number; passAtt:number; passCmp:number; passTds:number; passInts:number; rushYds:number; rushAtt:number; rushTds:number; receptions:number; recYds:number; recTds:number; }
interface DefenseEntry { rank:number; avg:number; }
interface ScheduleGame { week:number; gameDate:string; gameTime:string; homeTeam:string; awayTeam:string; matchup:string; }

// ── Step 1: BettingPros ───────────────────────────────────────────────────────
async function scrapeBettingPros(week: number, season: number): Promise<RawProp[]> {
  console.log(`\n📡 Step 1: Scraping BettingPros (Week ${week})...`);
  const headers: Record<string,string> = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': `https://www.bettingpros.com/nfl/picks/prop-bets/?week=${week}`,
    'x-api-key': 'CHi8Hy5CEE4khd46XNYL23dCFX96oUdw8Tp7umSc',
  };
  for (const url of [
    `https://api.bettingpros.com/v3/picks?sport=NFL&week=${week}&season=${season}&category=player-props&limit=500`,
    `https://www.bettingpros.com/api/v3/picks?sport=NFL&week=${week}&season=${season}&category=player-props&limit=500`,
  ]) {
    try {
      const res = await fetchWithRetry(url, { headers });
      if (!res?.ok) continue;
      const data = await res.json() as any;
      const props = parseBPResponse(data);
      if (props.length > 0) { console.log(`   ✅ ${props.length} props`); return props; }
    } catch(e) { console.warn(`   API failed: ${(e as Error).message}`); }
  }
  try {
    const res = await fetchWithRetry(`https://www.bettingpros.com/nfl/picks/prop-bets/?week=${week}`, { headers: {...headers, Accept:'text/html'} });
    if (res?.ok) {
      const html = await res.text();
      const nd = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (nd) {
        const pp = JSON.parse(nd[1])?.props?.pageProps;
        const picks = pp?.picks ?? pp?.initialData?.picks ?? [];
        if (picks.length) { const p = parseBPResponse({picks}); if (p.length) return p; }
      }
    }
  } catch { }
  console.log('   ⚠️  Using sample data (BettingPros requires JS rendering).');
  return getSampleProps();
}

function parseBPResponse(data: any): RawProp[] {
  const props: RawProp[] = [];
  for (const pick of (data?.picks ?? data?.data ?? data?.results ?? [])) {
    try {
      const player = pick?.player?.full_name ?? pick?.name ?? pick?.player_name ?? '';
      const label  = pick?.market?.name ?? pick?.prop_type ?? pick?.category ?? '';
      const line   = parseFloat(pick?.line ?? pick?.value ?? '0');
      const side   = (pick?.side ?? pick?.pick ?? 'Over') as string;
      const odds   = parseInt(pick?.odds ?? pick?.line_odds ?? '-110');
      if (!player || !label || isNaN(line)) continue;
      const norm = label.toLowerCase().replace(/\s+/g,' ').trim();
      const prop = BP_TO_PROP[norm] ?? toTitleCase(label);
      props.push({ player: toTitleCase(player), prop, propNorm: toPropNormKey(prop), line,
        overunder: side.toLowerCase().includes('under') ? 'Under' : 'Over', odds, source: 'bettingpros' });
    } catch { }
  }
  return props;
}

function getSampleProps(): RawProp[] {
  return ([
    ['Jalen Hurts',    'Pass Yards',       247.5,'Over', -115],
    ['Jalen Hurts',    'Rush Yards',        42.5,'Over', -110],
    ['Jalen Hurts',    'Pass TDs',           1.5,'Over', -130],
    ['Jalen Hurts',    'Pass Attempts',     34.5,'Over', -110],
    ['Saquon Barkley', 'Rush Yards',        78.5,'Over', -120],
    ['Saquon Barkley', 'Receptions',         2.5,'Over', -140],
    ['Saquon Barkley', 'Rush + Rec Yards',  89.5,'Over', -110],
    ['A.J. Brown',     'Rec Yards',         72.5,'Over', -110],
    ['DeVonta Smith',  'Rec Yards',         58.5,'Over', -110],
    ['Dallas Goedert', 'Rec Yards',         42.5,'Over', -110],
    ['Patrick Mahomes','Pass Yards',        282.5,'Over',-115],
    ['Patrick Mahomes','Pass TDs',           1.5,'Over', -150],
    ['Patrick Mahomes','Pass Attempts',     39.5,'Over', -110],
    ['Patrick Mahomes','Interceptions',      0.5,'Under',-140],
    ['Isiah Pacheco',  'Rush Yards',        52.5,'Over', -110],
    ['Travis Kelce',   'Rec Yards',         52.5,'Over', -110],
    ['Travis Kelce',   'Receptions',         4.5,'Over', -120],
    ['Xavier Worthy',  'Rec Yards',         38.5,'Over', -110],
    ['Rashee Rice',    'Rec Yards',         48.5,'Over', -115],
  ] as [string,string,number,string,number][]).map(([player,prop,line,overunder,odds]) => ({
    player, prop, propNorm: toPropNormKey(prop), line, overunder, odds, source: 'sample'
  }));
}

// ── Step 2: Player → Team ─────────────────────────────────────────────────────
async function loadPlayerTeamMap(): Promise<Record<string,string>> {
  console.log('\n👥 Step 2: Loading player → team map...');
  const snap = await db.collection('static_playerTeamMapping').get();
  const map: Record<string,string> = {};
  snap.docs.forEach(d => {
    const x = d.data();
    const n = (x.playerName || x.player || '').toLowerCase().trim();
    const t = (x.team || '').toUpperCase();
    if (n && t) map[n] = t;
  });
  console.log(`   ✅ ${Object.keys(map).length} entries`);
  return map;
}

// ── Step 3: Schedule ──────────────────────────────────────────────────────────
async function loadSchedule(week: number, season: number): Promise<ScheduleGame[]> {
  console.log('\n📅 Step 3: Loading schedule...');
  const snap = await db.collection('schedule').where('week','==',week).where('season','==',season).get();
  if (snap.empty) {
    console.log('   ⚠️  No schedule found — using Super Bowl fallback');
    return [{ week:22, gameDate:'2026-02-08', gameTime:'6:30 PM', homeTeam:'NO', awayTeam:'PHI', matchup:'PHI @ KC' }];
  }
  const games = snap.docs.map(d => d.data() as ScheduleGame);
  console.log(`   ✅ ${games.length} game(s)`);
  return games;
}

function getGameForTeam(team: string, games: ScheduleGame[]): ScheduleGame | null {
  return games.find(g => g.homeTeam?.toUpperCase()===team || g.awayTeam?.toUpperCase()===team || g.matchup?.toUpperCase().includes(team)) ?? null;
}

function getOpponent(team: string, matchup: string): string {
  const parts = matchup.toUpperCase().replace(/ VS /g,' @ ').split(' @ ');
  if (parts.length !== 2) return '';
  return parts[0].trim() === team ? parts[1].trim() : parts[0].trim();
}

// ── Step 4: PFR ───────────────────────────────────────────────────────────────
const PFR_CACHE = new Map<string, PFRGame[]>();

async function loadPfrIdMap(): Promise<Record<string,string>> {
  console.log('\n🔑 Loading PFR ID map...');
  const snap = await db.collection('static_pfr_Id_Map').get();
  const map: Record<string,string> = {};
  snap.docs.forEach(d => {
    const x = d.data();
    const n = (x.playerName || x.player || '').toLowerCase().trim();
    const id = x.pfrId || x.pfr_id || '';
    if (n && id) map[n] = id;
  });
  console.log(`   ✅ ${Object.keys(map).length} PFR IDs`);
  return map;
}

async function fetchPfrGameLog(pfrId: string, season: number): Promise<PFRGame[]> {
  const key = `${pfrId}:${season}`;
  if (PFR_CACHE.has(key)) return PFR_CACHE.get(key)!;
  await sleep(600);
  const url = `https://www.pro-football-reference.com/players/${pfrId[0]}/${pfrId}/gamelog/${season}/`;
  const res = await fetchWithRetry(url, { headers: {
    'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36',
    'Accept':'text/html',
  }});
  if (!res?.ok) { PFR_CACHE.set(key,[]); return []; }
  const games = parsePfrHtml(await res.text());
  PFR_CACHE.set(key, games);
  return games;
}

function parsePfrHtml(html: string): PFRGame[] {
  const games: PFRGame[] = [];
  const cmtMatch = html.match(/<!--([\s\S]*?id="stats"[\s\S]*?)-->/i);
  const tbl = cmtMatch?.[1] ?? html.match(/<table[^>]*id="stats"[^>]*>([\s\S]*?)<\/table>/i)?.[1];
  if (!tbl) return games;
  const rx = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(tbl)) !== null) {
    const row = m[1];
    if (row.includes('<th') && !row.includes('<td')) continue;
    const cell = (stat: string) => {
      const cm = row.match(new RegExp(`<(?:td|th)[^>]*data-stat="${stat}"[^>]*>([\\s\\S]*?)<\\/(?:td|th)>`, 'i'));
      if (!cm) return '';
      let v = cm[1];
      if (stat === 'game_date') { const csk = cm[0].match(/data-csk="([^"]+)"/); if (csk) v = csk[1]; }
      return v.replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').trim();
    };
    const wk = parseInt(cell('week_num'),10);
    if (isNaN(wk)) continue;
    games.push({ week:wk, date:cell('game_date'),
      passYds:+cell('pass_yds')||0, passAtt:+cell('pass_att')||0, passCmp:+cell('pass_cmp')||0,
      passTds:+cell('pass_td')||0, passInts:+cell('pass_int')||0,
      rushYds:+cell('rush_yds')||0, rushAtt:+cell('rush_att')||0, rushTds:+cell('rush_td')||0,
      receptions:+cell('rec')||0, recYds:+cell('rec_yds')||0, recTds:+cell('rec_td')||0,
    });
  }
  return games;
}

function getStatFromGame(g: PFRGame, k: string): number | null {
  switch(k) {
    case 'pass yds': return g.passYds; case 'pass att': return g.passAtt;
    case 'pass cmp': return g.passCmp; case 'pass tds': return g.passTds;
    case 'ints':     return g.passInts;
    case 'rush yds': return g.rushYds; case 'rush att': return g.rushAtt;
    case 'rush tds': return g.rushTds; case 'rec yds':  return g.recYds;
    case 'recs':     return g.receptions; case 'rec tds': return g.recTds;
    case 'anytime td': return (g.passTds+g.rushTds+g.recTds)>0?1:0;
    case 'rush+rec yds': return g.rushYds+g.recYds;
    case 'pass+rush yds': return g.passYds+g.rushYds;
    default: return null;
  }
}

function calcAvg(games: PFRGame[], k: string, beforeWeek: number): number | null {
  const el = games.filter(g => g.week < beforeWeek);
  if (!el.length) return null;
  let total=0, count=0;
  for (const g of el) {
    const s = getStatFromGame(g,k);
    if (s===null) continue;
    if (k==='anytime td' && g.passAtt===0 && g.rushAtt===0 && g.receptions===0) continue;
    total+=s; count++;
  }
  return count ? Math.round(total/count*10)/10 : null;
}

// ── Step 5: TeamRankings ──────────────────────────────────────────────────────
async function loadDefenseStats(): Promise<Record<string,Record<string,DefenseEntry>>> {
  console.log('\n🛡️  Step 5: Loading TeamRankings defense stats...');
  const map: Record<string,Record<string,DefenseEntry>> = {};
  for (const [k,url] of Object.entries(TR_URLS)) {
    try {
      await sleep(400);
      const res = await fetchWithRetry(url, { headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html'} });
      if (!res?.ok) { console.warn(`   ⚠️  ${k}: failed`); continue; }
      map[k] = parseTRTable(await res.text());
      console.log(`   ✅ ${k}: ${Object.keys(map[k]).length} teams`);
    } catch(e) { console.warn(`   ⚠️  ${k}: ${(e as Error).message}`); }
  }
  return map;
}

function parseTRTable(html: string): Record<string,DefenseEntry> {
  const out: Record<string,DefenseEntry> = {};
  const tbl = html.match(/<table[^>]*class="[^"]*tr-table[^"]*"[^>]*>([\s\S]*?)<\/table>/i)?.[1]
    ?? html.match(/<table[^>]*>([\s\S]*?)<\/table>/i)?.[1];
  if (!tbl) return out;
  const rx = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray|null, rank=0;
  while ((m=rx.exec(tbl))!==null) {
    const row=m[1];
    if (row.includes('<th')) continue;
    const cells=[...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(c=>c[1].replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').trim());
    if (cells.length<3) continue;
    const rc=parseInt(cells[0]); rank=isNaN(rc)?rank+1:rc;
    const avg=parseFloat(cells[2]); if(isNaN(avg)) continue;
    const abbr=TEAM_NAME_TO_ABBR[cells[1]]??cells[1].toUpperCase().slice(0,3);
    out[abbr]={rank,avg};
  }
  return out;
}

// ── Step 6: Run-1 Formulas ────────────────────────────────────────────────────
function applyRun1(playerAvg:number, oppRank:number, oppAvg:number, line:number) {
  const yardsScore    = playerAvg + oppAvg/100;
  const rankScore     = oppRank/32*10;
  const totalScore    = yardsScore - rankScore;
  const scoreDiff     = totalScore - line;
  const scalingFactor = scoreDiff/10;
  const expFn         = Math.exp(-scalingFactor);
  const winProbability = 1/(1+expFn);
  const recommendedSide = scoreDiff>0?'Over':scoreDiff<0?'Under':'';
  const projWinPct = recommendedSide==='Over'?winProbability:recommendedSide==='Under'?1-winProbability:0;
  return { yardsScore, rankScore, totalScore, scoreDiff, scalingFactor, winProbability, recommendedSide, projWinPct };
}

// ── Step 7: Season Hit % ──────────────────────────────────────────────────────
function calcHitPct(games:PFRGame[], k:string, line:number, ou:string, excludeWeek:number): number|null {
  const isOver = ou.toLowerCase()==='over';
  let wins=0, total=0;
  for (const g of games) {
    if (g.week>=excludeWeek) continue;
    const s=getStatFromGame(g,k); if(s===null) continue;
    total++; if(isOver?s>line:s<line) wins++;
  }
  return total>=3 ? wins/total : null;
}

// ── Step 8: Run-2 Formulas ────────────────────────────────────────────────────
function applyRun2(projWinPct:number, seasonHitPct:number|null, odds:number, k:string) {
  const avgWinProb    = seasonHitPct!==null ? (projWinPct+seasonHitPct)/2 : projWinPct;
  const impliedProb   = odds>0 ? 100/(odds+100) : Math.abs(odds)/(Math.abs(odds)+100);
  const bestEdgePct   = avgWinProb - impliedProb;
  const b             = odds>0 ? odds/100 : 100/Math.abs(odds);
  const expectedValue = Math.min(avgWinProb*b-(1-avgWinProb), 2);
  let kellyPct: number|null = null;
  if (bestEdgePct>0) {
    const raw=(b*avgWinProb-(1-avgWinProb))/b;
    const cap=k==='anytime td'?0.02:k==='pass tds'?0.05:0.10;
    kellyPct=Math.min(Math.max(raw,0),cap);
  }
  const valueIcon = bestEdgePct>0.10?'🔥':bestEdgePct>0.05?'⚠️':'❄️';
  const confidenceScore = seasonHitPct!==null ? 0.5*projWinPct+0.3*seasonHitPct+0.2*avgWinProb : null;
  return { avgWinProb, impliedProb, bestEdgePct, expectedValue, kellyPct, valueIcon, confidenceScore };
}

// ── Post-game ─────────────────────────────────────────────────────────────────
async function runPostGame(pfrIdMap: Record<string,string>) {
  console.log(`\n🏆 Post-Game: Week ${WEEK} actual results...`);
  const snap = await db.collection(COLLECTION).where('week','==',WEEK).get();
  const props = snap.docs.map(d=>({id:d.id,...d.data() as any}));
  console.log(`   ${props.length} props`);
  const cache = new Map<string,PFRGame|null>();
  const updates: {id:string;data:any}[] = [];
  for (const prop of props) {
    const pfrId = pfrIdMap[(prop.player||'').toLowerCase().trim()];
    if (!pfrId) continue;
    const ck=`${pfrId}:${WEEK}`;
    if (!cache.has(ck)) {
      const gs=await fetchPfrGameLog(pfrId,SEASON);
      cache.set(ck, gs.find(g=>g.week===WEEK)??null);
    }
    const game=cache.get(ck); if(!game) continue;
    const nk=prop.propNorm||toPropNormKey(prop.prop||'');
    const stat=getStatFromGame(game,nk); if(stat===null) continue;
    const ou=(prop.overunder||'').toLowerCase();
    const actualResult=ou?(stat===prop.line?'Push':(ou==='over'?stat>prop.line:stat<prop.line)?'Win':'Loss'):null;
    updates.push({id:prop.id, data:{gameStat:stat,actualResult,updatedAt:Timestamp.now()}});
    console.log(`   ${prop.player} ${prop.prop} ${prop.line} (${prop.overunder}) → ${stat} → ${actualResult??'N/A'}`);
  }
  if (!DRY_RUN && updates.length>0) {
    for (let i=0;i<updates.length;i+=400) {
      const batch=db.batch();
      updates.slice(i,i+400).forEach(u=>batch.update(db.collection(COLLECTION).doc(u.id),u.data));
      await batch.commit();
    }
  }
  const [w,l,p]=[updates.filter(u=>u.data.actualResult==='Win').length,updates.filter(u=>u.data.actualResult==='Loss').length,updates.filter(u=>u.data.actualResult==='Push').length];
  console.log(`\n   ✅ ${updates.length} updated — W:${w} L:${l} P:${p}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🏈 NFL Props Pipeline — Week ${WEEK} / ${SEASON}`);
  console.log(`   Collection: ${COLLECTION}  Mode: ${DRY_RUN?'🔍 DRY RUN':POST_GAME?'🏆 POST-GAME':'✍️  LIVE'}`);
  console.log(`${'═'.repeat(60)}`);

  const [playerTeamMap, pfrIdMap] = await Promise.all([loadPlayerTeamMap(), loadPfrIdMap()]);
  if (POST_GAME) { await runPostGame(pfrIdMap); return; }

  const rawProps   = await scrapeBettingPros(WEEK, SEASON);
  const schedule   = await loadSchedule(WEEK, SEASON);
  const defenseMap = await loadDefenseStats();
  const seasonToUse = WEEK<=3 ? SEASON-1 : SEASON;

  console.log(`\n⚙️  Enriching ${rawProps.length} props...`);
  const enriched: any[] = [];

  for (const raw of rawProps) {
    const pNorm = raw.player.toLowerCase().trim();
    let team = playerTeamMap[pNorm] ?? '';
    if (!team) { const ln=pNorm.split(' ').pop()??''; team=Object.entries(playerTeamMap).find(([n])=>n.endsWith(ln))?.[1]??''; }

    const game     = team ? getGameForTeam(team,schedule) : schedule[0]??null;
    const matchup  = game?.matchup??'';
    const gameDate = game?.gameDate??'';
    const opponent = team&&matchup ? getOpponent(team,matchup) : '';

    const pfrId = pfrIdMap[pNorm] ?? Object.entries(pfrIdMap).find(([n])=>n.endsWith(pNorm.split(' ').pop()??''))?.[1];
    let games: PFRGame[]=[]; let playerAvg:number|null=null;
    if (pfrId) {
      process.stdout.write(`   📊 ${raw.player} (${raw.prop})... `);
      games = await fetchPfrGameLog(pfrId, seasonToUse);
      playerAvg = calcAvg(games, raw.propNorm, WEEK);
      process.stdout.write(`avg=${playerAvg??'N/A'}\n`);
    } else { console.log(`   ⚠️  No PFR ID: ${raw.player}`); }

    const defStats = (opponent && defenseMap[raw.propNorm]) ? (defenseMap[raw.propNorm][opponent]??null) : null;
    const run1 = (playerAvg!==null && defStats) ? applyRun1(playerAvg, defStats.rank, defStats.avg, raw.line) : null;
    const seasonHitPct = games.length ? calcHitPct(games, raw.propNorm, raw.line, raw.overunder, WEEK) : null;
    const run2 = (run1 && raw.odds!==0) ? applyRun2(run1.projWinPct, seasonHitPct, raw.odds, raw.propNorm) : null;

    enriched.push({
      ...raw, team, matchup, gameDate,
      playerAvg, opponentRank:defStats?.rank??null, opponentAvgVsStat:defStats?.avg??null,
      yardsScore:run1?.yardsScore??null, rankScore:run1?.rankScore??null,
      totalScore:run1?.totalScore??null, scoreDiff:run1?.scoreDiff??null,
      scalingFactor:run1?.scalingFactor??null, winProbability:run1?.winProbability??null,
      recommendedSide:run1?.recommendedSide??null, projWinPct:run1?.projWinPct??null,
      seasonHitPct,
      avgWinProb:run2?.avgWinProb??null, impliedProb:run2?.impliedProb??null,
      bestEdgePct:run2?.bestEdgePct??null, expectedValue:run2?.expectedValue??null,
      kellyPct:run2?.kellyPct??null, valueIcon:run2?.valueIcon??null,
      confidenceScore:run2?.confidenceScore??null,
    });
  }

  // Summary
  console.log(`\n${'═'.repeat(60)}\n📊 RESULTS — Week ${WEEK} (by Confidence)\n${'═'.repeat(60)}`);
  console.log(`${'Player'.padEnd(22)} ${'Prop'.padEnd(16)} ${'Line'.padStart(5)} ${'Side'.padEnd(6)} ${'Odds'.padStart(5)}  ${'Avg'.padStart(6)}  ${'Hit%'.padStart(5)}  ${'Edge'.padStart(5)}  ${'Conf'.padStart(5)} Icon`);
  console.log('─'.repeat(105));
  const sorted = [...enriched].sort((a,b)=>(b.confidenceScore??0)-(a.confidenceScore??0));
  const fmt = (v:number|null, d=1) => v!==null ? v.toFixed(d) : '—';
  for (const p of sorted) {
    console.log(
      `${p.player.padEnd(22)} ${p.prop.padEnd(16)} ${String(p.line).padStart(5)} ${p.overunder.padEnd(6)} ${String(p.odds).padStart(5)}  ${fmt(p.playerAvg).padStart(6)}  ${(p.seasonHitPct!==null?`${(p.seasonHitPct*100).toFixed(0)}%`:'—').padStart(5)}  ${(p.bestEdgePct!==null?`${(p.bestEdgePct*100).toFixed(1)}%`:'—').padStart(5)}  ${fmt(p.confidenceScore,3).padStart(5)} ${p.valueIcon??''}`
    );
  }

  if (DRY_RUN) { console.log(`\n🔍 DRY RUN — ${enriched.length} props would be saved to ${COLLECTION}\n`); return; }

  console.log(`\n💾 Saving to ${COLLECTION}...`);
  const existSnap = await db.collection(COLLECTION).where('week','==',WEEK).select('player','prop','overunder').get();
  const existKeys = new Set(existSnap.docs.map(d=>{ const x=d.data(); return `${x.player}||${x.prop}||${x.overunder}`.toLowerCase(); }));
  let added=0, skipped=0;

  for (let i=0;i<enriched.length;i+=400) {
    const batch=db.batch(); let n=0;
    for (const p of enriched.slice(i,i+400)) {
      const k=`${p.player}||${p.prop}||${p.overunder}`.toLowerCase();
      if (existKeys.has(k)) { skipped++; continue; }
      const doc = Object.fromEntries(Object.entries({
        week:WEEK, season:SEASON, source:p.source, player:p.player, team:p.team,
        prop:p.prop, propNorm:p.propNorm, line:p.line, overunder:p.overunder, odds:p.odds,
        matchup:p.matchup, gameDate:p.gameDate,
        playerAvg:p.playerAvg, opponentRank:p.opponentRank, opponentAvgVsStat:p.opponentAvgVsStat,
        yardsScore:p.yardsScore, rankScore:p.rankScore, totalScore:p.totalScore,
        scoreDiff:p.scoreDiff, scalingFactor:p.scalingFactor,
        winProbability:p.winProbability, recommendedSide:p.recommendedSide, projWinPct:p.projWinPct,
        seasonHitPct:p.seasonHitPct,
        avgWinProb:p.avgWinProb, impliedProb:p.impliedProb, bestEdgePct:p.bestEdgePct,
        expectedValue:p.expectedValue, kellyPct:p.kellyPct, valueIcon:p.valueIcon,
        confidenceScore:p.confidenceScore,
        gameStat:null, actualResult:null,
        createdAt:Timestamp.now(), updatedAt:Timestamp.now(),
      }).filter(([,v])=>v!==null));
      batch.set(db.collection(COLLECTION).doc(), doc);
      existKeys.add(k); added++; n++;
    }
    if (n>0) await batch.commit();
    process.stdout.write(`\r   ✍️  ${added} saved...`);
  }
  console.log(`\n\n✅ Done — saved:${added} skipped:${skipped}`);
  console.log(`\n💡 After games: npx tsx scripts/Loadweeklyprops.ts --week=${WEEK} --post-game\n`);
}

function toPropNormKey(label:string): string {
  return label.toLowerCase()
    .replace(/passing/g,'pass').replace(/rushing/g,'rush').replace(/receiving/g,'rec')
    .replace(/yards?/g,'yds').replace(/touchdowns?/g,'tds').replace(/attempts?/g,'att')
    .replace(/completions?/g,'cmp').replace(/\breceptions?\b/,'recs').replace(/interceptions?/,'ints')
    .replace(/anytime touchdown scorer/,'anytime td')
    .replace(/rush \+ rec yds/,'rush+rec yds').replace(/pass \+ rush yds/,'pass+rush yds')
    .replace(/\s+/g,' ').trim();
}
function toTitleCase(s:string) { return s.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()); }
async function fetchWithRetry(url:string, opts:RequestInit={}, retries=3): Promise<Response|null> {
  for (let i=0;i<retries;i++) {
    try { const r=await fetch(url,opts); if(r.ok||r.status===404) return r; if(r.status===429||r.status>=500){await sleep(1000*Math.pow(2,i));continue;} return r; }
    catch(e) { if(i===retries-1) throw e; await sleep(1000*Math.pow(2,i)); }
  }
  return null;
}
function sleep(ms:number) { return new Promise<void>(r=>setTimeout(r,ms)); }

main().catch(err=>{ console.error('❌ Fatal:',err); process.exit(1); });