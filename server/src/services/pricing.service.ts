import { env } from '../config/env.js';
import { round2 } from '../utils/crypto.js';

export interface ShippingConfig {
  freeThreshold: number;
  flatRate: number;
  taxRate: number;
  defaultCurrency: string;
}

export function getShippingConfig(): ShippingConfig {
  return {
    freeThreshold: env.FREE_SHIPPING_THRESHOLD,
    flatRate: env.FLAT_SHIPPING_RATE,
    taxRate: env.TAX_RATE,
    defaultCurrency: env.DEFAULT_CURRENCY,
  };
}

export function computeShipping(
  itemsSubtotal: number,
  config: ShippingConfig = getShippingConfig(),
): number {
  if (itemsSubtotal <= 0) return 0;
  if (config.freeThreshold > 0 && itemsSubtotal >= config.freeThreshold) return 0;
  return round2(config.flatRate);
}

export function computeTax(taxableAmount: number, config: ShippingConfig = getShippingConfig()): number {
  return round2(Math.max(0, taxableAmount) * config.taxRate);
}
