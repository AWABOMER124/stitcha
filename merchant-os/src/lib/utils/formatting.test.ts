import { describe, expect, it } from 'vitest';
import { isValidInternationalPhone, normalizeInternationalPhone } from './formatting';

describe('international registration phone numbers', () => {
  it('keeps the legacy Sudanese local-number experience', () => {
    expect(normalizeInternationalPhone('0912345678', '+249')).toBe('+249912345678');
  });

  it('creates E.164 numbers for other countries', () => {
    expect(normalizeInternationalPhone('5015048409', '+966')).toBe('+9665015048409');
    expect(normalizeInternationalPhone('415 555 2671', '+1')).toBe('+14155552671');
  });

  it('accepts valid E.164 values and rejects malformed values', () => {
    expect(isValidInternationalPhone('+14155552671')).toBe(true);
    expect(isValidInternationalPhone('+249912345678')).toBe(true);
    expect(isValidInternationalPhone('+001234')).toBe(false);
  });
});
