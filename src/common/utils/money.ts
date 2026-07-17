import { ValidationError } from '../errors/app-error.js';
const MAX_KOBO = 9_000_000_000_000_000n;
export function nairaToKobo(amount: string): bigint {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(amount))
    throw new ValidationError(
      'Amount must be a positive decimal string with at most two decimal places',
    );
  const [whole = '', fraction = ''] = amount.split('.');
  const kobo = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (kobo <= 0n) throw new ValidationError('Amount must be greater than zero');
  if (kobo > MAX_KOBO) throw new ValidationError('Amount exceeds the allowed maximum');
  return kobo;
}
export function koboToNaira(value: bigint | string): string {
  const kobo = BigInt(value);
  return `${kobo / 100n}.${(kobo % 100n).toString().padStart(2, '0')}`;
}
export function safeAdd(left: bigint, right: bigint): bigint {
  const result = left + right;
  if (result > MAX_KOBO) throw new ValidationError('Balance exceeds the allowed maximum');
  return result;
}
