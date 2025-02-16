import JSBI from 'jsbi';

export function fromReadableAmount(amount: number, decimals: number): string {
  const fixedAmount = amount.toFixed(decimals); // Handle floating point precision
  const [whole, fraction = ''] = fixedAmount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0');
  const rawAmount = `${whole}${paddedFraction}`;
  return rawAmount.replace(/^0+/, '') || '0'; // Remove leading zeros but keep single 0
} 