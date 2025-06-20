export type Currency = 'USD' | 'NGN' | 'GHS' | 'KES';

interface CurrencyConfig {
  symbol: string;
  decimalPlaces: number;
  feePercentage: number; // e.g., 0.085 for 8.5%
  fixedFee: number; // in the smallest unit of the currency (e.g., cents for USD)
}

export const currencyConfigurations: Record<Currency, CurrencyConfig> = {
  USD: {
    symbol: '$',
    decimalPlaces: 2,
    feePercentage: 0.05, // 5%
    fixedFee: 50, // 50 cents
  },
  NGN: {
    symbol: '₦',
    decimalPlaces: 2,
    feePercentage: 0.085, // 8.5%
    fixedFee: 10000, // 100 Naira (100 * 100 kobo)
  },
  GHS: {
    symbol: 'GH₵',
    decimalPlaces: 2,
    feePercentage: 0.075, // 7.5%
    fixedFee: 200, // 2 Cedis (2 * 100 pesewas)
  },
  KES: {
    symbol: 'KSh',
    decimalPlaces: 2,
    feePercentage: 0.075, // 7.5%
    fixedFee: 5000, // 50 Shillings (50 * 100 cents)
  },
};

/**
 * Calculates the platform fee for a given price and currency.
 * @param price - The price of the ticket (as a string or number, in the main currency unit).
 * @param currency - The currency code.
 * @returns The calculated platform fee in the main currency unit.
 */
export const calculatePlatformFee = (price: string | number, currency: Currency): number => {
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numericPrice) || numericPrice <= 0) {
    return 0;
  }

  const config = currencyConfigurations[currency];
  if (!config) {
    console.warn(`Unsupported currency: ${currency}. Defaulting to USD fee structure.`);
    // Fallback to USD or a default if currency is not found, though type safety should prevent this.
    const defaultConfig = currencyConfigurations.USD;
    const percentageFee = numericPrice * defaultConfig.feePercentage;
    const totalFeeInSmallestUnit = percentageFee * (10 ** defaultConfig.decimalPlaces) + defaultConfig.fixedFee;
    return totalFeeInSmallestUnit / (10 ** defaultConfig.decimalPlaces);
  }

  const percentageFee = numericPrice * config.feePercentage;
  // Convert percentage fee to smallest unit, add fixed fee (already in smallest unit), then convert back to main unit
  const totalFeeInSmallestUnit = Math.round(percentageFee * (10 ** config.decimalPlaces)) + config.fixedFee;
  
  return totalFeeInSmallestUnit / (10 ** config.decimalPlaces);
};

/**
 * Formats a numeric amount into a currency string.
 * @param amount - The numeric amount (in the main currency unit).
 * @param currency - The currency code.
 * @returns A formatted currency string (e.g., "$10.00", "₦5000.00").
 */
export const formatCurrency = (amount: number, currency: Currency): string => {
  const config = currencyConfigurations[currency];
  if (!config) {
    // Fallback for unsupported currency, though type safety should prevent this.
    return `${currencyConfigurations.USD.symbol}${amount.toFixed(currencyConfigurations.USD.decimalPlaces)}`;
  }

  // Use Intl.NumberFormat for robust currency formatting if available and preferred in the future
  // For now, a simple approach:
  return `${config.symbol}${amount.toFixed(config.decimalPlaces)}`;
};
