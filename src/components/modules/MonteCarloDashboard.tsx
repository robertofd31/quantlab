import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ReferenceLine, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Play, RotateCcw, TrendingUp, DollarSign, Percent, Activity, Target, History, BarChart3 } from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { runMonteCarlo, generateMockPrices, type SimulationParams, type SimulationModel } from '../../lib/monteCarlo';
import { fetchHistoricalData } from '../../lib/data';

const ASSET_TYPES = [
  { id: 'equity_index', label: 'Equity Index', examples: ['SPY', 'QQQ', 'IWM', 'DIA', 'EEM', 'EFA', 'VEA', 'VWO'] },
  { id: 'individual_stock', label: 'Individual Stock', examples: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM'] },
  { id: 'sector_etf', label: 'Sector ETF', examples: ['XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLP', 'XLI', 'XLU', 'XLB', 'XLC'] },
  { id: 'bond', label: 'Bond', examples: ['TLT', 'IEF', 'SHY', 'LQD', 'HYG', 'EMB', 'BND', 'AGG'] },
  { id: 'commodity', label: 'Commodity', examples: ['GLD', 'SLV', 'USO', 'UNG', 'DBA', 'DBC'] },
  { id: 'crypto', label: 'Crypto', examples: ['BTC-USD', 'ETH-USD'] },
];

const models: { id: SimulationModel; label: string }[] = [
  { id: 'standard', label: 'Standard Monte Carlo' },
  { id: 'gbm', label: 'Geometric Brownian Motion' },
  { id: 'garch', label: 'GARCH(1,1)' },
  { id: 'markov', label: 'Markov Chain' },
  { id: 'feynman', label: 'Feynman Path Integral' },
];

export function MonteCarloDashboard() {
  const [assetType, setAssetType] = useState('equity_index');
  const [symbol, setSymbol] = useState('SPY');
  const [historicalYears, setHistoricalYears] = useState(5);
  const [initialInvestment, setInitialInvestment] = useState(10000);
  const [timeHorizon, setTimeHorizon] = useState(5);
  const [riskFreeRate, setRiskFreeRate] = useState(2);
  const [model, setModel] = useState<SimulationModel>('gbm');
  const [numSimulations, setNumSimulations] = useState(500);
  const [leverageMethod, setLeverageMethod] = useState<'manual' | 'kelly' | 'fractional' | 'optimization'>('manual');
  const [leverage, setLeverage] = useState(1);
  const [fraction, setFraction] = useState(0.5);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof runMonteCarlo> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentAssetType = ASSET_TYPES.find((t) => t.id === assetType);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const prices = await fetchHistoricalData(symbol, historicalYears);
      let effectiveLeverage = leverage;
      if (leverageMethod === 'kelly') {
        // Will be calculated inside runMonteCarlo
      }
      const params: SimulationParams = {
        symbol,
        initialInvestment,
        timeHorizonYears: timeHorizon,
        riskFreeRate: riskFreeRate / 100,
        model,
        numSimulations,
        leverage: effectiveLeverage,
        leverageMethod,
        fraction: leverageMethod === 'fractional' ? fraction : undefined,
        historicalYears,
      };
      const simResult = runMonteCarlo(params, prices);
      setResult(simResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  // Demo result on mount for UX
  useMemo(() => {
    if (!result && !loading) {
      const demoPrices = generateMockPrices('SPY', 252 * 5);
      const demoResult = runMonteCarlo({
        symbol: 'SPY',
        initialInvestment: 10000,
        timeHorizonYears: 5,
        riskFreeRate: 0.02,
        model: 'gbm',
        numSimulations: 300,
        leverage: 1,
        leverageMethod: 'manual',
      }, demoPrices);
      setResult(demoResult);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pathAnalysis = useMemo(() => {
    if (!result) return null;
    const belowInitial = result.finalValues.filter((v) => v < result.initialInvestment).length;
    const aboveInitial = result.finalValues.filter((v) => v >= result.initialInvestment).length;
    const benchmarkValue = result.initialInvestment * Math.pow(1 + riskFreeRate / 100, timeHorizon);
    const aboveBenchmark = result.finalValues.filter((v) => v > benchmarkValue).length;
    return {
      belowInitial,
      aboveInitial,
      aboveBenchmark,
      belowInitialPct: ((belowInitial / result.finalValues.length) * 100).toFixed(1),
      aboveInitialPct: ((aboveInitial / result.finalValues.length) * 100).toFixed(1),
      aboveBenchmarkPct: ((aboveBenchmark / result.finalValues.length) * 100).toFixed(1),
      benchmarkValue,
    };
  }, [result, riskFreeRate, timeHorizon]);

  const histogramData = useMemo(() => {
    if (!result) return [];
    const min = Math.min(...result.finalValues);
    const max = Math.max(...result.finalValues);
    const bins = 40;
    const step = (max - min) / bins || 1;
    const counts = Array(bins).fill(0);
    for (const v of result.finalValues) {
      const idx = Math.min(Math.floor((v - min) / step), bins - 1);
      counts[idx]++;
    }
    return counts.map((c, i) => ({
      bin: parseFloat((min + i * step).toFixed(0)),
      count: c,
    }));
  }, [result]);

  const stats = result ? [
    { label: 'Initial Investment', value: `$${result.initialInvestment.toLocaleString()}`, icon: <DollarSign className="w-5 h-5" />, color: 'text-gold' },
    { label: 'Final Median Value', value: `$${Math.round(result.finalMedian).toLocaleString()}`, sub: `95% CI: $${Math.round(result.ciLower).toLocaleString()} - $${Math.round(result.ciUpper).toLocaleString()}`, icon: <TrendingUp className="w-5 h-5" />, color: 'text-green' },
    { label: 'Median CAGR', value: `${result.medianCagr.toFixed(1)}%`, icon: <Percent className="w-5 h-5" />, color: 'text-blue-400' },
    { label: 'Leverage Used', value: `${result.leverage.toFixed(2)}x`, sub: leverageMethod === 'kelly' ? 'Full Kelly' : leverageMethod === 'fractional' ? 'Half Kelly' : leverageMethod === 'optimization' ? 'Numerical Opt' : 'Manual', icon: <Activity className="w-5 h-5" />, color: 'text-purple-400' },
  ] : [];

  const historicalStats = result ? [
    { label: 'Hist. Ann. Return', value: `${result.historicalReturn.toFixed(1)}%`, icon: <TrendingUp className="w-4 h-4" />, color: result.historicalReturn > 0 ? 'text-green' : 'text-red' },
    { label: 'Hist. Ann. Volatility', value: `${result.historicalVolatility.toFixed(1)}%`, icon: <Activity className="w-4 h-4" />, color: 'text-blue-400' },
    { label: 'Hist. Max Drawdown', value: `${result.maxDrawdownMedian.toFixed(1)}%`, icon: <BarChart3 className="w-4 h-4" />, color: 'text-yellow-400' },
    { label: 'Sharpe Ratio', value: `${result.sharpeRatio.toFixed(2)}`, icon: <Target className="w-4 h-4" />, color: result.sharpeRatio > 1 ? 'text-green' : result.sharpeRatio > 0.5 ? 'text-yellow-400' : 'text-red' },
  ] : [];

  const fanChartData = useMemo(() => {
    if (!result) return [];
    return result.percentilePaths.map((p) => ({
      year: parseFloat((p.day / 252).toFixed(1)),
      p10: p.p10,
      p25: p.p25,
      p50: p.p50,
      p75: p.p75,
      p90: p.p90,
      mean: p.mean,
    }));
  }, [result]);

  const historicalPriceData = useMemo(() => {
    if (!result) return [];
    return result.historicalPrices.map((p) => ({
      date: p.date,
      price: p.close,
    }));
  }, [result]);

  return (
    <div className="max-w-7xl mx-auto px-6 pb-20 space-y-10">
      {/* Configuration Panel — 4 columns like original */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-secondary border border-border rounded-2xl p-8"
      >
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-gold" />
          Simulation Parameters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Column 1 — Asset */}
          <div className="space-y-4">
            <div className="text-[10px] font-bold text-gold uppercase tracking-[2px] mb-2">Asset</div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Asset Type</label>
              <select
                value={assetType}
                onChange={(e) => { setAssetType(e.target.value); setSymbol(ASSET_TYPES.find(t => t.id === e.target.value)?.examples[0] || 'SPY'); }}
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all"
              >
                {ASSET_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Select Asset</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all"
              >
                {currentAssetType?.examples.map((ex) => (
                  <option key={ex} value={ex}>{ex}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Or type ticker..."
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Historical Data (Years)</label>
              <input
                type="number"
                min={1}
                max={30}
                value={historicalYears}
                onChange={(e) => setHistoricalYears(Number(e.target.value))}
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all"
              />
            </div>
          </div>

          {/* Column 2 — Investment */}
          <div className="space-y-4">
            <div className="text-[10px] font-bold text-gold uppercase tracking-[2px] mb-2">Investment</div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Initial Investment ($)</label>
              <input
                type="number"
                value={initialInvestment}
                onChange={(e) => setInitialInvestment(Number(e.target.value))}
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Time Horizon (Years)</label>
              <input
                type="number"
                min={1}
                max={30}
                value={timeHorizon}
                onChange={(e) => setTimeHorizon(Number(e.target.value))}
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Risk-Free Rate (%)</label>
              <input
                type="number"
                step={0.1}
                value={riskFreeRate}
                onChange={(e) => setRiskFreeRate(Number(e.target.value))}
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all"
              />
            </div>
          </div>

          {/* Column 3 — Model */}
          <div className="space-y-4">
            <div className="text-[10px] font-bold text-gold uppercase tracking-[2px] mb-2">Model</div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Simulation Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as SimulationModel)}
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Simulations</label>
              <input
                type="number"
                min={10}
                max={3000}
                value={numSimulations}
                onChange={(e) => setNumSimulations(Number(e.target.value))}
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all"
              />
            </div>
          </div>

          {/* Column 4 — Leverage */}
          <div className="space-y-4">
            <div className="text-[10px] font-bold text-gold uppercase tracking-[2px] mb-2">Leverage</div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Leverage Method</label>
              <select
                value={leverageMethod}
                onChange={(e) => setLeverageMethod(e.target.value as any)}
                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all"
              >
                <option value="manual">Manual</option>
                <option value="kelly">Kelly Criterion</option>
                <option value="fractional">Fractional Kelly</option>
                <option value="optimization">Numerical Optimization</option>
              </select>
            </div>
            {leverageMethod === 'manual' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Leverage (x)</label>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  max={5}
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all"
                />
              </div>
            )}
            {leverageMethod === 'fractional' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Fraction (e.g. 0.5 = Half Kelly)</label>
                <input
                  type="number"
                  step={0.1}
                  min={0.1}
                  max={1}
                  value={fraction}
                  onChange={(e) => setFraction(Number(e.target.value))}
                  className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all"
                />
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex gap-4">
          <button
            onClick={handleRun}
            disabled={loading}
            className="px-6 py-3 bg-gold hover:bg-gold-dark text-black font-black rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            {loading ? 'Running...' : 'Run Simulation'}
          </button>
          {error && <span className="text-red text-sm font-bold self-center">{error}</span>}
        </div>
      </motion.div>

      {/* Results */}
      {result && pathAnalysis && (
        <>
          {/* 4 Headline Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {stats.map((s, i) => (
              <StatCard key={s.label} label={s.label} value={s.value} sub={s.sub} icon={s.icon} color={s.color} index={i} />
            ))}
          </div>

          {/* Historical Asset Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {historicalStats.map((s, i) => (
              <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} color={s.color} index={i} />
            ))}
          </div>

          {/* Path Analysis Panel */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-secondary border border-border rounded-2xl p-6"
          >
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-gold" />
              Path Analysis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-xl p-5 text-center">
                <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Paths Below Initial</div>
                <div className="text-3xl font-black text-red">{pathAnalysis.belowInitial}</div>
                <div className="text-sm text-text-muted mt-1">{pathAnalysis.belowInitialPct}% of simulations</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-5 text-center">
                <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Paths Above Initial</div>
                <div className="text-3xl font-black text-green">{pathAnalysis.aboveInitial}</div>
                <div className="text-sm text-text-muted mt-1">{pathAnalysis.aboveInitialPct}% of simulations</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-5 text-center">
                <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Paths Above Benchmark</div>
                <div className="text-3xl font-black text-gold">{pathAnalysis.aboveBenchmark}</div>
                <div className="text-sm text-text-muted mt-1">{pathAnalysis.aboveBenchmarkPct}% vs risk-free</div>
                <div className="text-[10px] text-text-muted mt-1">Benchmark: ${Math.round(pathAnalysis.benchmarkValue).toLocaleString()}</div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Probability Fan Chart */}
            <div className="bg-secondary border border-border rounded-2xl p-6">
              <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gold" />
                Probability Cone (Projected Wealth)
              </h3>
              <p className="text-text-muted text-xs mb-4">Percentile bands across all {numSimulations.toLocaleString()} simulations. P50 is the median trajectory.</p>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={fanChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} label={{ value: 'Years', position: 'insideBottom', offset: -5, fill: '#6b6b80', fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '12px', fontSize: 12 }}
                      formatter={(value: any, name: any) => [`$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, String(name).toUpperCase()]}
                    />
                    <ReferenceLine y={result.initialInvestment} stroke="#ff4757" strokeDasharray="4 4" label={{ value: 'Initial', fill: '#ff4757', fontSize: 10, position: 'right' }} />
                    {/* P10-P90 outer band */}
                    <Area type="monotone" dataKey="p90" stroke="none" fill="rgba(59,130,246,0.08)" />
                    <Area type="monotone" dataKey="p10" stroke="none" fill="rgba(59,130,246,0.08)" />
                    {/* P25-P75 inner band */}
                    <Area type="monotone" dataKey="p75" stroke="none" fill="rgba(34,197,94,0.12)" />
                    <Area type="monotone" dataKey="p25" stroke="none" fill="rgba(34,197,94,0.12)" />
                    <Line type="monotone" dataKey="p90" stroke="#3b82f6" strokeWidth={1} strokeOpacity={0.4} dot={false} strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="p75" stroke="#22c55e" strokeWidth={1} strokeOpacity={0.5} dot={false} />
                    <Line type="monotone" dataKey="p50" stroke="#f5a623" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="mean" stroke="#a855f7" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
                    <Line type="monotone" dataKey="p25" stroke="#22c55e" strokeWidth={1} strokeOpacity={0.5} dot={false} />
                    <Line type="monotone" dataKey="p10" stroke="#ef4444" strokeWidth={1} strokeOpacity={0.4} dot={false} strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 mt-3 text-[10px]">
                <span className="flex items-center gap-1 text-text-muted"><span className="w-3 h-[2px] bg-gold inline-block" /> P50 Median</span>
                <span className="flex items-center gap-1 text-text-muted"><span className="w-3 h-[2px] bg-purple-400 inline-block" /> Mean</span>
                <span className="flex items-center gap-1 text-text-muted"><span className="w-3 h-[2px] bg-green inline-block opacity-50" /> P25 / P75</span>
                <span className="flex items-center gap-1 text-text-muted"><span className="w-3 h-[2px] bg-blue-400 inline-block opacity-40" /> P10 / P90</span>
              </div>
            </div>

            {/* Final Value Distribution */}
            <div className="bg-secondary border border-border rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4">Final Value Distribution</h3>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={histogramData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                    <XAxis dataKey="bin" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '12px', fontSize: 12 }}
                      formatter={(value: any) => [Number(value), 'Count']}
                    />
                    <Bar dataKey="count" fill="rgba(0,212,170,0.6)" stroke="#00d4aa" strokeWidth={1} radius={[4, 4, 0, 0]} />
                    <ReferenceLine x={result.finalMedian} stroke="#f5a623" strokeDasharray="4 4" label={{ value: 'Median', fill: '#f5a623', fontSize: 10, position: 'top' }} />
                    <ReferenceLine x={result.finalMean} stroke="#a855f7" strokeDasharray="6 3" label={{ value: 'Mean', fill: '#a855f7', fontSize: 10, position: 'top' }} />
                    <ReferenceLine x={result.initialInvestment} stroke="#ff4757" strokeDasharray="4 4" label={{ value: 'Initial', fill: '#ff4757', fontSize: 10, position: 'bottom' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Historical Price Context */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-secondary border border-border rounded-2xl p-6"
          >
            <h3 className="text-white font-bold mb-2 flex items-center gap-2">
              <History className="w-4 h-4 text-gold" />
              Historical Price Context
            </h3>
            <p className="text-text-muted text-xs mb-4">Actual price history for {symbol} over the last {historicalYears} years.</p>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historicalPriceData}>
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f5a623" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f5a623" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} tickFormatter={(v: string) => v.slice(0, 7)} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '12px', fontSize: 12 }}
                    formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Price']}
                  />
                  <Area type="monotone" dataKey="price" stroke="#f5a623" strokeWidth={2} fill="url(#priceGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
