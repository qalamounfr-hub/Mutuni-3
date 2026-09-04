import {tokenizeExpected, normalizeArabic} from './normalize';
import {alignMonotone} from './alignment';
export type CursorStatus = 'pending' | 'matched' | 'uncertain' | 'skipped';
export interface CursorWord { expected:string; heard:string|null; score:number; status:CursorStatus; index:number; heardIndex:number|null; }

/** Streaming cursor. The alignment is replayed from the retained transcript on every
 * window, so a bad/late CTC window can never permanently desynchronise the cursor. */
export class Cursor {
  private expected:string[]=[]; private heard:string[]=[]; private words:CursorWord[]=[]; private position=0; private heardPosition=0;
  constructor(expected:string|string[]=[]){this.setExpected(expected)}
  setExpected(e:string|string[]){this.expected=Array.isArray(e)?e.map(normalizeArabic).filter(Boolean):tokenizeExpected(e); this.reset()}
  reset(){this.heard=[]; this.position=0; this.heardPosition=0; this.words=this.expected.map((expected,index)=>({expected,heard:null,score:0,status:'pending',index,heardIndex:null}))}
  advance(words:string[]){
    const normalized=words.map(normalizeArabic).filter(Boolean);
    if (normalized.length < this.heard.length) return this.snapshot();
    this.heard=normalized;
    const result=alignMonotone(this.expected,this.heard,this.position,this.heardPosition,{window:16,maxSkip:6});
    // Apply the ordered prefix only. In particular, record explicit skips; the old
    // implementation advanced the numeric cursor while leaving these words pending.
    let nextExpected=this.position, nextHeard=this.heardPosition;
    for (const step of result.steps) {
      if (step.expectedIndex !== nextExpected) continue;
      if (step.decision === 'match' || step.decision === 'uncertain') {
        if (step.decision === 'uncertain' && step.score < 0.55) break;
        const w=this.words[step.expectedIndex];
        if (w) { w.heard=this.heard[step.heardIndex ?? 0] ?? null; w.score=step.score; w.heardIndex=step.heardIndex; w.status=step.decision === 'match' ? 'matched' : 'uncertain'; }
        nextExpected++; nextHeard=Math.max(nextHeard,(step.heardIndex ?? this.heardPosition)+1);
      } else if (step.decision === 'skip') {
        // A skip is committed only when the alignment has enough evidence to
        // continue; alignMonotone already enforces that guard.
        const w=this.words[step.expectedIndex];
        if (w) { w.status='skipped'; w.heard=null; w.score=0; w.heardIndex=null; }
        nextExpected++;
      } else break;
    }
    this.position=Math.max(this.position,nextExpected); this.heardPosition=Math.max(this.heardPosition,nextHeard);
    return this.snapshot();
  }
  snapshot(){return this.words.map(w=>({...w}))}
  report(){const c={pending:0,matched:0,skipped:0,uncertain:0};this.words.forEach(w=>c[w.status]++);return {...c,total:this.words.length,position:this.position,score:this.words.length?Math.round((c.matched+c.uncertain*.5)/this.words.length*100):0}}
}
