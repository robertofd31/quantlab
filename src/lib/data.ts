import type { PricePoint } from './statistics';
import { generateMockPrices } from './monteCarlo';

const TICKER_MAP: Record<string, string> = {
  'BTC': 'BTC-USD',
  'ETH': 'ETH-USD',
  'BRKB': 'BRK-B',
  'BRK.B': 'BRK-B',
  'GOOG': 'GOOGL',
};

function resolveSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  return TICKER_MAP[upper] || upper;
}

export async function fetchHistoricalData(
  symbol: string,
  years: number = 5
): Promise<PricePoint[]> {
  const resolved = resolveSymbol(symbol);
  const fileName = `${resolved}.json`;

  try {
    const res = await fetch(`/data/${fileName}`);
    if (!res.ok) throw new Error(`Local data not found: ${fileName}`);
    const points: PricePoint[] = await res.json();
    if (points.length < 30) throw new Error('Not enough data points');

    // Filter to last N years
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - years);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const filtered = points.filter((p) => p.date >= cutoffStr);

    return filtered.length >= 30 ? filtered : points;
  } catch (e) {
    console.warn(`Local data unavailable for ${symbol}, using mock data.`, e);
    return generateMockPrices(symbol, Math.round(years * 252));
  }
}
