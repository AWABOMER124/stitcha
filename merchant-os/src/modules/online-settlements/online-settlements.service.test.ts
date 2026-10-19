import { describe, expect, it } from 'vitest';
import { previousWeekRange } from './online-settlements.service';

describe('weekly online settlement periods', () => {
  it('uses the previous complete Monday-to-Monday window', () => {
    const range = previousWeekRange(new Date('2026-10-22T18:00:00.000Z'));
    expect(range.periodFrom.toISOString()).toBe('2026-10-12T00:00:00.000Z');
    expect(range.periodTo.toISOString()).toBe('2026-10-19T00:00:00.000Z');
  });
});
