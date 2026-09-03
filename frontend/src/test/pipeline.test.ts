import { describe, expect, it } from 'vitest';
import { band, classifyQuery, getRun, RUNS } from '@/data/runs';

describe('classifyQuery', () => {
  it('routes shoreline / change questions to the change-detection surface', () => {
    expect(classifyQuery('Has the shoreline retreated since 2019?')).toEqual({ kind: 'change' });
    expect(classifyQuery('what changed between the two passes').kind).toBe('change');
  });

  it('routes parcel/drainage questions to the halted-chain failure', () => {
    expect(classifyQuery('Which parcels drained fastest after 09 Jul?')).toEqual({
      kind: 'failure',
      runId: '0f3a12',
    });
  });

  it('routes structure-count questions to the low-confidence completion', () => {
    expect(classifyQuery('How many structures fall inside the extent?')).toEqual({
      kind: 'low-confidence',
      runId: '0f3a44',
    });
  });

  it('falls through to the flood answer', () => {
    expect(classifyQuery('Where is the flooded cropland?')).toEqual({
      kind: 'answer',
      runId: '0f3a91',
    });
  });
});

describe('band', () => {
  it('maps confidence to a qualitative band at the DESIGN.md thresholds', () => {
    expect(band(0.82)).toBe('High');
    expect(band(0.75)).toBe('High');
    expect(band(0.6)).toBe('Moderate');
    expect(band(0.5)).toBe('Moderate');
    expect(band(0.44)).toBe('Low');
  });
});

describe('mock runs', () => {
  it('every referenced run id resolves', () => {
    for (const id of ['0f3a91', '0f3a70', '0f3a44', '0f3a12']) {
      expect(getRun(id), id).toBeDefined();
    }
  });

  it('the change run carries kind "change" and no answer tokens', () => {
    const change = getRun('0f3a70')!;
    expect(change.kind).toBe('change');
    expect(change.answer).toBeUndefined();
  });

  it('the failed run produces no confidence and halts a stage', () => {
    const failed = getRun('0f3a12')!;
    expect(failed.state).toBe('failed');
    expect(failed.confidence).toBeNull();
    expect(failed.stages?.some((s) => s.state === 'failed')).toBe(true);
  });

  it('answer runs reference only region ids that exist', () => {
    for (const run of RUNS) {
      if (!run.answer) continue;
      const ids = new Set((run.regions ?? []).map((r) => r.id));
      for (const tok of run.answer) {
        if (tok.t === 'ref')
          expect(ids.has(tok.regionId), `${run.id} → ${tok.regionId}`).toBe(true);
      }
    }
  });
});
