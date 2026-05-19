import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { Play, RotateCcw, Plus, Minus, Layers } from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { runPortfolioSimulation, type AssetConfig, type PortfolioSimParams } from '../../lib/portfolioSimulator';
import { fetchHistoricalData } from '../../lib/data';

const PRESET_UNIVERSES: Record<string, string[]> = {
  'US Large Cap': ['SPY', 'QQQ', 'IWM', 'DIA'],
  'Tech Heavy': ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META'],
  'Balanced': ['SPY', 'TLT', 'GLD', 'VNQ'],
  'Crypto': ['BTC-USD', 'ETH-USD'],
  'Global': ['VEA', 'VWO', 'SPY', 'BND'],
};

const REBALANCING_OPTIONS = [
  { value: 'none', label: 'None (Buy & Hold)' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
] as const;

const DCA_OPTIONS = [
  { value: 'none', label: 'No DCA' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
] as const;

export function PortfolioSimulator() {
  const [assets, setAssets] = useState<{ symbol: string; weight: number }[]>([
    { symbol: 'SPY', weight: 50 },
    { symbol: 'TLT', weight: 30 },
    { symbol: 'GLD', weight: 20 },
  ]);
  const [initialInvestment, setInitialInvestment] = useState(10000);
  const [timeHorizon, setTimeHorizon] = useState(10);
  const [numSimulations, setNumSimulations] = useState(300);
  const [rebalancing, setRebalancing] = useState<'none' | 'monthly' | 'quarterly' | 'annual'>('quarterly');
  const [transactionCost, setTransactionCost] = useState(0.1);
  const [dcaAmount, setDcaAmount] = useState(0);
  const [dcaFrequency, setDcaFrequency] = useState<'none' | 'monthly' | 'quarterly'>('none');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof runPortfolioSimulation> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addAsset = () => {
    if (assets.length < 6) {
      setAssets([...assets, { symbol: '', weight: 0 }]);
    }
  };

  const removeAsset = (index: number) => {
    setAssets(assets.filter((_, i) => i !== index));
  };

  const updateAsset = (index: number, field: 'symbol' | 'weight', value: string | number) => {
    const updated = [...assets];
    updated[index] = { ...updated[index], [field]: value };
    setAssets(updated);
  };

  const normalizeWeights = () => {
    const total = assets.reduce((sum, a) => sum + a.weight, 0);
    if (total === 0) return;
    setAssets(assets.map((a) => ({ ...a, weight: parseFloat(((a.weight / total) * 100).toFixed(1)) })));
  };

  const runSim = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const assetConfigs: AssetConfig[] = [];
      for (const a of assets) {
        if (!a.symbol) continue;
        const prices = await fetchHistoricalData(a.symbol, 5);
        assetConfigs.push({ symbol: a.symbol, weight: a.weight, prices });
      }
      if (assetConfigs.length < 2) {
        throw new Error('Select at least 2 assets');
      }
      const params: PortfolioSimParams = {
        assets: assetConfigs,
        initialInvestment,
        timeHorizonYears: timeHorizon,
        numSimulations,
        rebalancing,
        transactionCost: transactionCost / 100,
        dcaAmount,
        dcaFrequency,
      };
      const simResult = runPortfolioSimulation(params);
      setResult(simResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Simulation failed');
    } finally {
      setLoading(false);
    }
  }, [assets, initialInvestment, timeHorizon, numSimulations, rebalancing, transactionCost, dcaAmount, dcaFrequency]);

  // Demo result on mount
  useMemo(() => {
    if (!result && !loading) {
      const demoAssets: AssetConfig[] = [
        { symbol: 'SPY', weight: 50, prices: Array.from({ length: 252 * 5 }, (_, i) => ({ date: `Day ${i}`, close: 400 + i * 0.3 + Math.random() * 10 })) },
        { symbol: 'TLT', weight: 30, prices: Array.from({ length: 252 * 5 }, (_, i) => ({ date: `Day ${i}`, close: 100 + Math.sin(i / 50) * 5 + Math.random() * 2 })) },
        { symbol: 'GLD', weight: 20, prices: Array.from({ length: 252 * 5 }, (_, i) => ({ date: `Day ${i}`, close: 180 + i * 0.05 + Math.random() * 5 })) },
      ];
      const demoResult = runPortfolioSimulation({
        assets: demoAssets,
        initialInvestment: 10000,
        timeHorizonYears: 10,
        numSimulations: 200,
        rebalancing: 'quarterly',
        transactionCost: 0.001,
      });
      setResult(demoResult);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pathChartData = useMemo(() => {
    if (!result) return [];
    const days = result.paths[0]?.days || [];
    return days.map((_, i) => {
      const point: Record<string, number> = { day: i };
      result.paths.forEach((p, idx) => {
        point[`path${idx}`] = p.totalValue[i];
      });
      return point;
    });
  }, [result]);

  const allocationData = useMemo(() => {
    if (!result) return [];
    return result.assetStats.map((a) => ({ name: a.symbol, value: a.weight }));
  }, [result]);

  const comparisonData = useMemo(() => {
    if (!result) return [];
    const bins = 20;
    const min = Math.min(...result.finalValues, ...result.buyHoldFinalValues);
    const max = Math.max(...result.finalValues, ...result.buyHoldFinalValues);
    const step = (max - min) / bins || 1;
    const data = [];
    for (let i = 0; i < bins; i++) {
      const binMin = min + i * step;
      const binMax = min + (i + 1) * step;
      data.push({
        bin: `${Math.round(binMin / 1000)}k-${Math.round(binMax / 1000)}k`,
        rebalanced: result.finalValues.filter((v) => v >= binMin && v < binMax).length,
        buyHold: result.buyHoldFinalValues.filter((v) => v >= binMin && v < binMax).length,
      });
    }
    return data;
  }, [result]);

  const COLORS = ['#f5a623', '#00d4aa', '#ff4757', '#00d4ff', '#a855f7', '#f472b6'];

  return (
    <div className="max-w-7xl mx-auto px-6 pb-20 pt-8 space-y-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white">Portfolio Simulator</h1>
          <p className="text-text-muted text-sm mt-1">Multi-asset correlated Monte Carlo with rebalancing & DCA.</p>
        </div>

        {/* Asset Builder */}
        <div className="bg-secondary border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-gold" />
              Asset Allocation
            </h2>
            <div className="flex gap-2">
              <button onClick={normalizeWeights} className="px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-bold text-text-muted hover:text-white transition-all">
                Normalize
              </button>
              <button onClick={addAsset} disabled={assets.length >= 6} className="px-3 py-1.5 bg-gold/10 border border-gold/20 rounded-lg text-xs font-bold text-gold hover:bg-gold/20 transition-all disabled:opacity-50">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {assets.map((asset, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Ticker (e.g. SPY)"
                  value={asset.symbol}
                  onChange={(e) => updateAsset(index, 'symbol', e.target.value.toUpperCase())}
                  className="flex-1 bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all"
                />
                <div className="flex items-center gap-2 w-40">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={asset.weight}
                    onChange={(e) => updateAsset(index, 'weight', Number(e.target.value))}
                    className="flex-1 accent-gold"
                  />
                  <span className="text-sm font-black text-white w-12 text-right">{asset.weight}%</span>
                </div>
                <button onClick={() => removeAsset(index)} className="p-2 text-text-muted hover:text-red transition-all">
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-2 pt-2">
            {Object.entries(PRESET_UNIVERSES).map(([name, tickers]) => (
              <button
                key={name}
                onClick={() => setAssets(tickers.map((t) => ({ symbol: t, weight: Math.round(100 / tickers.length) })))}
                className="px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-bold text-text-muted hover:text-gold hover:border-gold/30 transition-all"
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Parameters */}
        <div className="bg-secondary border border-border rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-gold" />
            Parameters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Initial Investment ($)</label>
              <input type="number" value={initialInvestment} onChange={(e) => setInitialInvestment(Number(e.target.value))} className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Time Horizon (Years)</label>
              <input type="number" min={1} max={30} value={timeHorizon} onChange={(e) => setTimeHorizon(Number(e.target.value))} className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Simulations</label>
              <input type="number" min={50} max={2000} value={numSimulations} onChange={(e) => setNumSimulations(Number(e.target.value))} className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Transaction Cost (%)</label>
              <input type="number" step={0.01} value={transactionCost} onChange={(e) => setTransactionCost(Number(e.target.value))} className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Rebalancing</label>
              <select value={rebalancing} onChange={(e) => setRebalancing(e.target.value as any)} className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all">
                {REBALANCING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">DCA Frequency</label>
              <select value={dcaFrequency} onChange={(e) => setDcaFrequency(e.target.value as any)} className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all">
                {DCA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {dcaFrequency !== 'none' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">DCA Amount ($)</label>
                <input type="number" value={dcaAmount} onChange={(e) => setDcaAmount(Number(e.target.value))} className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all" />
              </div>
            )}
          </div>
          <div className="mt-6 flex gap-4">
            <button onClick={runSim} disabled={loading} className="px-6 py-3 bg-gold hover:bg-gold-dark text-black font-black rounded-xl transition-all flex items-center gap-2 disabled:opacity-50">
              <Play className="w-4 h-4" /> {loading ? 'Running...' : 'Run Simulation'}
            </button>
            {error && <span className="text-red text-sm font-bold self-center">{error}</span>}
          </div>
        </div>

        {/* Results */}
        {result && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <StatCard label="Final Median" value={`$${Math.round(result.finalMedian).toLocaleString()}`} color="text-green" index={0} />
              <StatCard label="Median CAGR" value={`${result.medianCagr.toFixed(1)}%`} color="text-gold" index={1} />
              <StatCard label="Sharpe Ratio" value={result.sharpeRatio.toFixed(2)} color="text-blue-400" index={2} />
              <StatCard label="Max Drawdown" value={`${result.maxDrawdownMedian.toFixed(1)}%`} color="text-red" index={3} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Paths */}
              <div className="lg:col-span-2 bg-secondary border border-border rounded-2xl p-6">
                <h3 className="text-white font-bold mb-4">Portfolio Paths (Rebalanced)</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={pathChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '12px', fontSize: 12 }} />
                      {result.paths.slice(0, 8).map((_, idx) => (
                        <Area key={idx} type="monotone" dataKey={`path${idx}`} stroke={COLORS[idx % COLORS.length]} fill="none" strokeWidth={1.5} strokeOpacity={0.5} dot={false} />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Allocation Pie */}
              <div className="bg-secondary border border-border rounded-2xl p-6">
                <h3 className="text-white font-bold mb-4">Target Allocation</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={allocationData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name} ${value.toFixed(0)}%`} labelLine={false}>
                        {allocationData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '12px', fontSize: 12 }} formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Weight']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Correlation Matrix */}
            <div className="bg-secondary border border-border rounded-2xl p-6 overflow-x-auto">
              <h3 className="text-white font-bold mb-4">Correlation Matrix</h3>
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-card border-b border-border">
                    <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-[2px]">Asset</th>
                    {result.assetStats.map((a) => (
                      <th key={a.symbol} className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-[2px]">{a.symbol}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.correlationMatrix.map((row, i) => (
                    <tr key={i} className={`border-b border-border/50 ${i % 2 === 0 ? 'bg-secondary' : 'bg-card'}`}>
                      <td className="px-4 py-3 text-white font-bold">{result.assetStats[i]?.symbol}</td>
                      {row.map((val, j) => (
                        <td key={j} className={`px-4 py-3 font-mono ${val > 0.8 ? 'text-red' : val > 0.5 ? 'text-yellow-400' : val > 0.2 ? 'text-gold' : 'text-green'}`}>
                          {val.toFixed(2)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Rebalanced vs Buy & Hold */}
            <div className="bg-secondary border border-border rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4">Rebalanced vs Buy & Hold — Distribution</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                    <XAxis dataKey="bin" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '12px', fontSize: 12 }} />
                    <Bar dataKey="rebalanced" fill="rgba(0,212,170,0.7)" stroke="#00d4aa" strokeWidth={1} radius={[4, 4, 0, 0]} name="Rebalanced" />
                    <Bar dataKey="buyHold" fill="rgba(245,166,35,0.7)" stroke="#f5a623" strokeWidth={1} radius={[4, 4, 0, 0]} name="Buy & Hold" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Asset Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {result.assetStats.map((a, i) => (
                <div key={a.symbol} className="bg-card border border-border rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-white font-bold">{a.symbol}</span>
                    <span className="text-text-muted text-sm">{a.weight.toFixed(1)}%</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-text-muted">Ann. Return</span><span className="text-green font-bold">{a.annReturn.toFixed(1)}%</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">Ann. Vol</span><span className="text-yellow-400 font-bold">{a.annVol.toFixed(1)}%</span></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}


export default PortfolioSimulator
