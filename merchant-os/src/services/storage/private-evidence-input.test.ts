import { describe, expect, it } from 'vitest';
import { normalizePrivateEvidence } from './private-evidence-input';

describe('normalizePrivateEvidence', () => {
  it('detects content from magic bytes instead of trusting the browser MIME', async () => {
    const file = new File([Buffer.from('%PDF-1.7\nproof')], 'proof.exe', { type: 'application/octet-stream' });
    const result = await normalizePrivateEvidence(file);
    expect(result.mimeType).toBe('application/pdf');
    expect(result.filename).toBe('receipt.pdf');
    expect(result.sha256).toHaveLength(64);
  });

  it('rejects a spoofed or empty receipt', async () => {
    await expect(normalizePrivateEvidence(new File([Buffer.from('not an image')], 'proof.png', { type: 'image/png' }))).rejects.toThrow();
    await expect(normalizePrivateEvidence(new File([], 'empty.pdf', { type: 'application/pdf' }))).rejects.toThrow();
  });
});
