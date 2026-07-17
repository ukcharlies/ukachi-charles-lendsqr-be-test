import { createHash, createHmac, randomBytes } from 'node:crypto';
export const normalizeEmail = (value: string): string => value.trim().toLowerCase();
export function normalizeNigerianPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (/^0[789][01]\d{8}$/.test(digits)) return `+234${digits.slice(1)}`;
  if (/^234[789][01]\d{8}$/.test(digits)) return `+${digits}`;
  throw new Error('Invalid Nigerian phone number');
}
export const hashIdentity = (value: string): string =>
  createHash('sha256').update(value).digest('hex');
export function createOpaqueToken(pepper: string): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url');
  return { raw, hash: hashToken(raw, pepper) };
}
export const hashToken = (token: string, pepper: string): string =>
  createHmac('sha256', pepper).update(token).digest('hex');
export const fingerprint = (value: object): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const maskAccountNumber = (value: string): string =>
  `${'*'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
