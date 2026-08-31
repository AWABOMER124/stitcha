import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { sandboxTransition, validSandboxSignature } from './partner-sandbox.service';
import { partnerCodeHash, partnerPassword } from './partner-security.service';
describe('Sandbox boundaries and transitions', () => {
  it('mirrors pickup and delivery to the sample order', () => {
    expect(sandboxTransition('ASSIGNED', 'PICKED_UP', 'READY').orderStatus).toBe('OUT_FOR_DELIVERY');
    expect(sandboxTransition('IN_TRANSIT', 'DELIVERED', 'OUT_FOR_DELIVERY').orderStatus).toBe('DELIVERED');
  });
  it('cancels a label without cancelling its commercial order', () => {
    expect(sandboxTransition('REQUESTED', 'CANCELLED', 'READY')).toEqual({ applied: true, orderStatus: 'READY' });
  });
  it('rejects cancellation after pickup and changes to terminal states', () => {
    expect(() => sandboxTransition('PICKED_UP', 'CANCELLED', 'OUT_FOR_DELIVERY')).toThrow();
    expect(() => sandboxTransition('DELIVERED', 'CANCELLED', 'DELIVERED')).toThrow();
    expect(() => sandboxTransition('CANCELLED', 'DELIVERED', 'READY', true)).toThrow();
  });
  it('treats duplicate and late events as no-ops', () => {
    expect(sandboxTransition('DELIVERED', 'DELIVERED', 'DELIVERED').applied).toBe(false);
    expect(sandboxTransition('IN_TRANSIT', 'ASSIGNED', 'OUT_FOR_DELIVERY', true).applied).toBe(false);
  });
  it('allows forward webhook jumps but not UI jumps', () => {
    expect(() => sandboxTransition('REQUESTED', 'DELIVERED', 'READY')).toThrow();
    expect(sandboxTransition('REQUESTED', 'DELIVERED', 'READY', true).orderStatus).toBe('DELIVERED');
  });
  it('validates exact signed bytes and rejects altered or foreign signatures', () => {
    const raw = '{"status":"ASSIGNED"}';
    const signature = createHmac('sha256', 'test-key').update(raw).digest('hex');
    expect(validSandboxSignature(raw, signature, 'test-key')).toBe(true);
    expect(validSandboxSignature(raw, `sha256=${signature.toUpperCase()}`, 'test-key')).toBe(true);
    expect(validSandboxSignature(raw + ' ', signature, 'test-key')).toBe(false);
    expect(validSandboxSignature(raw, signature, 'other')).toBe(false);
    expect(validSandboxSignature(raw, null, 'test-key')).toBe(false);
    expect(validSandboxSignature(raw, 'nothex', 'test-key')).toBe(false);
  });
  it('binds OTP hashes to the account, channel and destination', () => {
    const old = process.env.PHONE_OTP_SECRET;
    process.env.PHONE_OTP_SECRET = 'unit-test-only';
    try {
      const hash = partnerCodeHash('u1', 'EMAIL', 'one@example.invalid', '123456');
      expect(hash).not.toBe(partnerCodeHash('u2', 'EMAIL', 'one@example.invalid', '123456'));
      expect(hash).not.toBe(partnerCodeHash('u1', 'WHATSAPP', 'one@example.invalid', '123456'));
      expect(hash).not.toBe(partnerCodeHash('u1', 'EMAIL', 'two@example.invalid', '123456'));
    } finally { if (old === undefined) delete process.env.PHONE_OTP_SECRET; else process.env.PHONE_OTP_SECRET = old; }
  });
  it('enforces password bounds including the bcrypt byte limit', () => {
    expect(partnerPassword.safeParse('short').success).toBe(false);
    expect(partnerPassword.safeParse('a'.repeat(73)).success).toBe(false);
    expect(partnerPassword.safeParse('ش'.repeat(40)).success).toBe(false);
    expect(partnerPassword.safeParse('Good-Test-123!').success).toBe(true);
  });
});
