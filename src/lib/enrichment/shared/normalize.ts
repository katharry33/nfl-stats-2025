// src/lib/enrichment/normalize.ts

export function normalizeProp(raw: string): string {
  if (!raw) return '';
  let p = raw.toLowerCase().trim();

  // Early exits for common verbose forms
  if (p.includes('receiving yard')) return 'rec yds';
  if (p.includes('receiving rec'))  return 'recs';
  if (p.includes('rushing yard'))   return 'rush yds';
  if (p.includes('passing yard'))   return 'pass yds';

  p = p.replace(/\s+/g, ' ');
  p = p.replace(/\s*\+\s*/g, '+');
  p = p.replace(/\byards\b|\byard\b|\byd\b/g, 'yds');
  p = p.replace(/\btouchdowns\b|\btouchdown\b/g, 'tds');
  p = p.replace(/\btd\b(?!s)/g, 'tds');

  const map: Record<string, string> = {
    'pass yds': 'pass yds', 'pass yards': 'pass yds', 'passing yds': 'pass yds', 'passing yards': 'pass yds',
    'pass att': 'pass att', 'pass attempts': 'pass att', 'passing attempts': 'pass att',
    'pass cmp': 'pass cmp', 'pass completions': 'pass cmp', 'pass comp': 'pass cmp', 'completions': 'pass cmp',
    'pass tds': 'pass tds', 'passing tds': 'pass tds',
    'rush yds': 'rush yds', 'rush yards': 'rush yds', 'rushing yards': 'rush yds',
    'rush att': 'rush att', 'rush attempts': 'rush att', 'rushing attempts': 'rush att', 'carries': 'rush att',
    'rush tds': 'rush tds', 'rushing tds': 'rush tds',
    'rec yds': 'rec yds', 'rec yards': 'rec yds', 'receiving yards': 'rec yds',
    'recs': 'recs', 'receptions': 'recs',
    'targets': 'targets',
    'anytime td': 'anytime td', 'anytime touchdown': 'anytime td',
    'pass+rush yds': 'pass+rush yds', 'pass yards+rush yards': 'pass+rush yds',
    'rush+rec yds': 'rush+rec yds', 'rush yards+rec yards': 'rush+rec yds',
  };

  return map[p] ?? p;
}

export function normalizeTeamAbbr(raw: string): string {
  if (!raw) return '';
  // If it's a URL like "https://.../PHI.webp", extract "PHI"
  if (raw.includes('logos/')) {
    const parts = raw.split('/');
    return parts[parts.length - 1].replace('.webp', '').toUpperCase();
  }
  // Strip leading dashes or dots
  return raw.replace(/^[-.\s]+/, '').trim().toUpperCase();
}

export function getOpponent(myTeam: string, matchup: string): string | null {
  if (!matchup.includes('@')) return null;
  const [away, home] = matchup.split('@').map(t => t.trim().toUpperCase());
  return myTeam.toUpperCase() === away ? home : away;
}

export function normalizePlayerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/'/g, '')
    .replace(/-/g, ' ')
    .replace(/\s+(jr|sr|iii|ii|iv|v)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatMatchup(awayTeam: string, homeTeam: string): string {
  return `${normalizeTeamAbbr(awayTeam)} @ ${normalizeTeamAbbr(homeTeam)}`;
}

export function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function formatTime(d: Date): string {
  const hours   = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const ampm    = hours >= 12 ? 'PM' : 'AM';
  const h       = hours % 12 || 12;
  const m       = minutes === 0 ? '' : `:${String(minutes).padStart(2, '0')}`;
  return `${h}${m} ${ampm}`;
}

export function splitComboProp(propNorm: string): string[] | null {
  if (!propNorm.includes('+')) return null;
  const parts = propNorm.split('+').map(p => p.trim());
  const componentMap: Record<string, string> = {
    'rush yds': 'rush yds', 'rec yds': 'rec yds',
    'pass yds': 'pass yds', 'rush att': 'rush att', 'recs': 'recs',
  };
  const mapped = parts.map(p => componentMap[p]);
  if (mapped.some(m => !m)) return null;
  return mapped;
}
import { NormalizedProp } from '@/lib/types';

// Helper to strip the noise seen in your NBA screenshot
const scrub = (val: string) => (val || '').replace(/^[-.\s]+/, '').trim();

export function hydrateProp(raw: any, id: string): NormalizedProp {
  return {
    ...raw,
    id,
    // NBA Fix: Remove the leading dashes/dots from these specific fields
    player: scrub(raw.player || raw.playerName),
    matchup: scrub(raw.matchup).replace(/-/g, '@'), // Also swap hyphen for @
    opponent: scrub(raw.opponent),
    team: scrub(raw.team),
    
    // Core normalization
    prop: normalizeProp(raw.prop || ''),
    gameDate: raw.gameDate || raw.date || '',
    overUnder: raw.overunder || raw.overUnder || 'Over',
    
    // Safety check for numbers
    line: Number(raw.line) || 0,
    season: Number(raw.season),
    week: raw.week ? Number(raw.week) : null,
  };
}