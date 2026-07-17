import {
  createOpaqueToken,
  hashToken,
  maskAccountNumber,
  normalizeEmail,
  normalizeNigerianPhone,
} from '../../src/common/utils/identity.js';
describe('identity utilities', () => {
  test('normalizes identifiers', () => {
    expect(normalizeEmail(' A@Example.COM ')).toBe('a@example.com');
    expect(normalizeNigerianPhone('0801 234 5678')).toBe('+2348012345678');
  });
  test('rejects invalid phone', () => expect(() => normalizeNigerianPhone('123')).toThrow());
  test('creates only hashable opaque tokens', () => {
    const token = createOpaqueToken('pepper');
    expect(token.raw).not.toBe(token.hash);
    expect(hashToken(token.raw, 'pepper')).toBe(token.hash);
  });
  test('masks account number', () => expect(maskAccountNumber('0123456789')).toBe('******6789'));
});
