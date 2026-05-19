import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, RotateCcw } from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { runMonteCarlo, generateMockPrices, type SimulationParams } from '../../lib/monteCarlo';
import { fetchHistoricalData } from '../../lib/data';
import { percentile } from '../../lib/statistics';

export function SimulationDetails() {
  const [symbol, setSymbol] = useState('SPY');
  const [result, setResult] = useState<ReturnType<typeof runMonteCarlo> | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    const prices = await fetchHistoricalData(symbol, 5);
    const params: SimulationParams = {
      symbol,
      initialInvestment: 10000,
      timeHorizonYears: 5,
      riskFreeRate: 0.02,
      model: 'gbm',
      numSimulations: 500,
      leverage: 1,
      leverageMethod: 'manual',
    };
    setResult(runMonteCarlo(params, prices));
    setLoading(false);
  };

  useMemo(() => {
    if (!result) {
      const demoPrices = generateMockPrices('SPY', 252 * 5);
      const demoResult = runMonteCarlo({
        symbol: 'SPY', initialInvestment: 10000, timeHorizonYears: 5, riskFreeRate: 0.02,
        model: 'gbm', numSimulations: 300, leverage: 1, leverageMethod: 'manual',
      }, demoPrices);
      setResult(demoResult);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const historicalChartData = useMemo(() => {
    if (!result) return [];
    return result.historicalPrices.map((p, i) => ({
      date: p.date,
      price: p.close,
      ma50: i >= 50 ? result.historicalPrices.slice(i - 50, i + 1).reduce((a, b) => a + b.close, 0) / 50 : p.close,
    }));
  }, [result]);

  const percentileTable = useMemo(() => {
    if (!result) return [];
    const cagr = result.finalValues.map((fv) => Math.pow(fv / result.initialInvestment, 1 / 5) - 1);
    return [
      { label: '5th', final: percentile(result.finalValues, 0.05), cagr: percentile(cagr, 0.05) },
      { label: '25th', final: percentile(result.finalValues, 0.25), cagr: percentile(cagr, 0.25) },
      { label: '50th (Median)', final: percentile(result.finalValues, 0.5), cagr: percentile(cagr, 0.5) },
      { label: '75th', final: percentile(result.finalValues, 0.75), cagr: percentile(cagr, 0.75) },
      { label: '95th', final: percentile(result.finalValues, 0.95), cagr: percentile(cagr, 0.95) },
    ];
  }, [result]);

  const drawdownData = useMemo(() => {
    if (!result) return [];
    const dd: { date: string; drawdown: number }[] = [];
    let peak = result.historicalPrices[0]?.close || 1;
    for (const p of result.historicalPrices) {
      if (p.close > peak) peak = p.close;
      dd.push({ date: p.date, drawdown: -((peak - p.close) / peak) * 100 });
    }
    return dd;
  }, [result]);

  return (
    <div className="max-w-7xl mx-auto px-6 pb-20 pt-8 space-y-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Simulation Details</h1>
            <p className="text-text-muted text-sm mt-1">Full statistical breakdown and historical analysis.</p>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all w-32"
            />
            <button
              onClick={handleRun}
              disabled={loading}
              className="px-4 py-2 bg-gold hover:bg-gold-dark text-black font-bold rounded-xl transition-all text-sm flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              {loading ? 'Running...' : 'Run'}
            </button>
          </div>
        </div>

        {result && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <StatCard label="Historical Ann. Return" value={`${result.historicalReturn.toFixed(1)}%`} icon={<Activity className="w-5 h-5" />} color="text-green" index={0} />
              <StatCard label="Historical Ann. Vol" value={`${result.historicalVolatility.toFixed(1)}%`} icon={<Activity className="w-5 h-5" />} color="text-blue-400" index={1} />
              <StatCard label="Ruin Probability" value={`${result.ruinProbability.toFixed(1)}%`} icon={<Activity className="w-5 h-5" />} color={result.ruinProbability > 5 ? 'text-red' : 'text-green'} index={2} />
              <StatCard label="Max Drawdown (Med)" value={`${result.maxDrawdownMedian.toFixed(1)}%`} icon={<Activity className="w-5 h-5" />} color="text-yellow-400" index={3} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-secondary border border-border rounded-2xl p-6">
                <h3 className="text-white font-bold mb-4">Historical Price Performance</h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historicalChartData}>
                      <defs>
                        <linearGradient id="histGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f5a623" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#f5a623" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '12px', fontSize: 12 }} />
                      <Area type="monotone" dataKey="price" stroke="#f5a623" fill="url(#histGradient)" strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="ma50" stroke="#00d4aa" fill="none" strokeWidth={1} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-secondary border border-border rounded-2xl p-6">
                <h3 className="text-white font-bold mb-4">Drawdown Analysis</h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={drawdownData}>
                      <defs>
                        <linearGradient id="ddGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ff4757" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#ff4757" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                      <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '12px', fontSize: 12 }} formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'Drawdown']} />
                      <Area type="monotone" dataKey="drawdown" stroke="#ff4757" fill="url(#ddGradient)" strokeWidth={1} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-secondary border border-border rounded-2xl p-6 overflow-x-auto">
              <h3 className="text-white font-bold mb-4">Simulation Percentiles</h3>
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-card border-b border-border">
                    <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-[2px]">Percentile</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-[2px]">Final Value</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-[2px]">CAGR</th>
                  </tr>
                </thead>
                <tbody>
                  {percentileTable.map((row, i) => (
                    <tr key={row.label} className={`border-b border-border/50 ${i % 2 === 0 ? 'bg-secondary' : 'bg-card'}`}>
                      <td className="px-6 py-4 text-white font-bold">{row.label}</td>
                      <td className="px-6 py-4 text-green font-mono">${Math.round(row.final).toLocaleString()}</td>
                      <td className="px-6 py-4 text-gold font-mono">{(row.cagr * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}


export default SimulationDetails
