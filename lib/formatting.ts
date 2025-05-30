// Currency formatting utilities

/**
 * Format a number as Nigerian Naira currency
 */
export function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}
