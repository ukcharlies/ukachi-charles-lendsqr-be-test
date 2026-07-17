import { nairaToKobo, koboToNaira, safeAdd } from '../../src/common/utils/money.js';
describe('money utilities', () => {
  test.each([
    ['5000.00', 500000n],
    ['1', 100n],
    ['0.01', 1n],
    ['1.1', 110n],
  ])('converts %s safely', (input, expected) => expect(nairaToKobo(input)).toBe(expected));
  test.each(['0', '-1', '1.001', 'NaN', '1e3', '01.00'])('rejects invalid amount %s', (input) =>
    expect(() => nairaToKobo(input)).toThrow(),
  );
  test('formats kobo', () => expect(koboToNaira('123456')).toBe('1234.56'));
  test('adds safe integers', () => expect(safeAdd(100n, 50n)).toBe(150n));
});
