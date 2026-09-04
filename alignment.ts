import {normalizeArabic, similarity} from './normalize';

export type AlignmentDecision = 'match' | 'uncertain' | 'skip' | 'insert';
export interface AlignmentStep { expectedIndex: number; heardIndex: number | null; score: number; decision: AlignmentDecision; }
export interface MonotoneAlignment { steps: AlignmentStep[]; nextExpected: number; nextHeard: number; coverage: number; }

const INF = 1e9;
function pairScore(a: string, b: string): number { return similarity(a, b); }

/** Needleman–Wunsch local, borné autour du curseur. Aucun chemin ne peut reculer. */
export function alignMonotone(expectedRaw: string[], heardRaw: string[], previousExpected = 0, previousHeard = 0, options: {window?: number; maxSkip?: number} = {}): MonotoneAlignment {
  const expected = expectedRaw.map(normalizeArabic).filter(Boolean);
  const heard = heardRaw.map(normalizeArabic).filter(Boolean);
  const window = options.window ?? 12;
  const maxSkip = options.maxSkip ?? 3;
  const e0 = Math.max(0, Math.min(previousExpected, expected.length));
  const h0 = Math.max(0, Math.min(previousHeard, heard.length));
  const e = expected.slice(e0, Math.min(expected.length, e0 + window));
  const h = heard.slice(h0);
  const n = e.length, m = h.length;
  if (!n || !m) return {steps: [], nextExpected: e0, nextHeard: h0, coverage: 0};
  const dp = Array.from({length: n + 1}, () => Array(m + 1).fill(INF));
  const back: Array<Array<[number, number, AlignmentDecision] | null>> = Array.from({length: n + 1}, () => Array(m + 1).fill(null));
  dp[0][0] = 0;
  for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
    if (i === 0 && j === 0) continue;
    if (i > 0 && dp[i - 1][j] + 0.78 < dp[i][j]) { dp[i][j] = dp[i - 1][j] + 0.78; back[i][j] = [i - 1, j, 'skip']; }
    if (j > 0 && dp[i][j - 1] + 0.42 < dp[i][j]) { dp[i][j] = dp[i][j - 1] + 0.42; back[i][j] = [i, j - 1, 'insert']; }
    if (i > 0 && j > 0) {
      const s = pairScore(e[i - 1], h[j - 1]);
      if (dp[i - 1][j - 1] + (1 - s) < dp[i][j]) { dp[i][j] = dp[i - 1][j - 1] + (1 - s); back[i][j] = [i - 1, j - 1, s >= 0.72 ? 'match' : 'uncertain']; }
    }
  }
  const reverse: AlignmentStep[] = [];
  let i = n, j = m;
  while (i || j) {
    const b = back[i][j];
    if (!b) break;
    const [pi, pj, decision] = b;
    if (decision !== 'insert') reverse.push({expectedIndex: e0 + i - 1, heardIndex: h0 + j - 1, score: decision === 'skip' ? 0 : pairScore(e[i - 1], h[j - 1]), decision});
    i = pi; j = pj;
  }
  const steps = reverse.reverse();
  let advance = e0, nextHeard = h0;
  let evidence = 0, matched = 0, skipped = 0;
  for (const step of steps) {
    if (step.expectedIndex !== advance) continue;
    if (step.decision === 'match' || (step.decision === 'uncertain' && step.score >= 0.55)) { advance++; matched++; nextHeard = Math.max(nextHeard, (step.heardIndex ?? h0) + 1); }
    else if (step.decision === 'skip' && skipped < maxSkip && (matched >= 2 || steps.slice(steps.indexOf(step) + 1).some(next => (next.decision === 'match' || next.decision === 'uncertain') && next.score >= 0.72))) { advance++; skipped++; }
    else break;
    evidence++;
  }
  return {steps, nextExpected: advance, nextHeard, coverage: evidence / Math.max(1, matched + skipped)};
}
