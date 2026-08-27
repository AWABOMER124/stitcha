import { describe, expect, it } from 'vitest';
import { createWorkbook, safeExcelValue } from './excel';

describe('Excel exports', () => {
  it.each(['=1+1', '+SUM(A1:A2)', '-cmd', '@link'])('neutralizes formula-like text: %s', value => {
    expect(safeExcelValue(value)).toBe(`'${value}`);
  });

  it('keeps ordinary values and numeric negatives intact', () => {
    expect(safeExcelValue('WASLA')).toBe('WASLA');
    expect(safeExcelValue(-15)).toBe(-15);
  });

  it('creates an xlsx zip buffer', async () => {
    const buffer = await createWorkbook({ title: 'اختبار', merchantName: 'وصلة', columns: [{ header: 'الاسم', key: 'name' }], rows: [{ name: 'متجر' }] });
    expect(Buffer.from(buffer).subarray(0, 2).toString()).toBe('PK');
  });
});
