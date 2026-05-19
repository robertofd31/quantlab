const fs = require('fs');
const path = require('path');

const tickers = [
  'SPY', 'QQQ', 'BTC-USD', 'ETH-USD', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META',
  'TSLA', 'BRK-B', 'JPM', 'V', 'JNJ', 'WMT', 'PG', 'UNH', 'MA', 'HD',
  'BAC', 'ABBV', 'PFE', 'KO', 'MRK', 'COST', 'AVGO', 'TMO', 'DIS', 'CSCO',
  'VZ', 'ADBE', 'NFLX', 'CRM', 'ACN', 'LIN', 'WFC', 'PM', 'TXN', 'NEE',
  'RTX', 'HON', 'BMY', 'LOW', 'UNP', 'IBM', 'C', 'GS', 'MS', 'BLK',
  'SCHW', 'PLD', 'ELV', 'LMT', 'SBUX', 'MDT', 'CVX', 'XOM', 'OXY', 'SLB',
  'MPC', 'PSX', 'VLO', 'MRO', 'DVN', 'FANG', 'EOG', 'COP', 'PXD', 'OKE',
  'KMI', 'WMB', 'ET', 'EPD', 'MPLX', 'ENB', 'TRP', 'PBA', 'OKE', 'GLD',
  'SLV', 'USO', 'UNG', 'DBA', 'DBB', 'DBC', 'PDBC', 'GSG', 'IAU', 'IEF',
  'TLT', 'SHY', 'LQD', 'HYG', 'EMB', 'BND', 'AGG', 'VCIT', 'VMBS', 'MUB',
  'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLP', 'XLI', 'XLU', 'XLB', 'XLC',
  'TLT', 'IEF', 'SHY', 'LQD', 'HYG', 'EMB', 'VNQ', 'REET', 'SCHH', 'USRT',
  'ARKK', 'ARKG', 'ARKW', 'ARKF', 'ARKQ', 'ARKX', 'ICLN', 'PBW', 'QCLN', 'SMOG',
  'BOTZ', 'ROBT', 'AIQ', 'THNQ', 'IRBO', 'ROBO', 'DRIV', 'LIT', 'REMX', 'PICK',
  'CORN', 'WEAT', 'SOYB', 'JO', 'NIB', 'CAFE', 'BAL', 'SGG', 'CANE', 'WOOD',
  'URA', 'NLR', 'CPER', 'JJCTF', 'PALL', 'SPAB', 'SPTM', 'SPEM', 'SPIP', 'SPDW',
  'VEA', 'VWO', 'IEMG', 'SCZ', 'EFA', 'EFV', 'EEM', 'FXI', 'ASHR', 'EWZ',
  'INDA', 'EPI', 'RSX', 'TUR', 'EPOL', 'EWN', 'EWL', 'EWD', 'EWK', 'EWG',
  'EWQ', 'EWP', 'EWI', 'EWO', 'EIRL', 'ENOR', 'EDEN', 'EFNL', 'EPHE', 'EPU',
  'ARGT', 'EIS', 'KWEB', 'ASHS', 'CHIQ', 'CHIX', 'CHIC', 'CNYA', 'MCHI', 'KBA',
  'OBOR', '2801.HK', '3188.HK', 'FXI', 'CXSE', 'ASHR', 'KURE', 'CHIH', 'CHIS', 'CQQQ',
  'KTEC', 'THD', 'EPHE', 'EIDO', 'IDX', 'EPU', 'ARGT', 'ICOL', 'EPOL', 'GREK',
  'RSX', 'ERUS', 'KWEB', 'ASHS', 'KURE', 'CHIQ', 'MCHI', 'ASHR', 'FXI', 'CXSE',
];

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchYahoo(symbol, years = 5) {
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = period2 - Math.round(years * 365.25 * 24 * 60 * 60);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d&events=history`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    throw new Error(`Fetch failed for ${symbol}: ${e.message}`);
  }
}

function parseChart(json) {
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error('Invalid chart data');
  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  const volumes = result.indicators?.quote?.[0]?.volume || [];
  const points = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] == null) continue;
    points.push({
      date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
      close: closes[i],
      volume: volumes[i] || 0,
    });
  }
  return points;
}

async function download(symbol) {
  try {
    const json = await fetchYahoo(symbol, 5);
    const points = parseChart(json);
    if (points.length < 30) {
      console.warn(`${symbol}: only ${points.length} points, skipping`);
      return false;
    }
    const file = path.join(DATA_DIR, `${symbol.replace(/\//g, '_')}.json`);
    fs.writeFileSync(file, JSON.stringify(points, null, 2));
    console.log(`${symbol}: ${points.length} days saved`);
    return true;
  } catch (e) {
    console.error(`${symbol}: ${e.message}`);
    return false;
  }
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  let success = 0;
  let fail = 0;
  for (const symbol of tickers) {
    const file = path.join(DATA_DIR, `${symbol.replace(/\//g, '_')}.json`);
    if (fs.existsSync(file)) {
      console.log(`${symbol}: already cached`);
      success++;
      continue;
    }
    const ok = await download(symbol);
    if (ok) success++; else fail++;
    await sleep(350); // rate limit
  }
  console.log(`\nDone! ${success} success, ${fail} failed out of ${tickers.length}`);
}

main().catch(console.error);
