import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Zap, TrendingUp, Shield, AlertTriangle, Info } from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { calculateKelly, generateKellyCurve } from '../../lib/kelly';
import { fetchHistoricalData } from '../../lib/data';
import { generateMockPrices } from '../../lib/monteCarlo';

export function KellyModule() {
  const [symbol, setSymbol] = useState('SPY');
  const [riskFreeRate] = useState(2);
  const [prices, setPrices] = useState(generateMockPrices('SPY', 252 * 5));
  const [loading, setLoading] = useState(false);

  const kelly = useMemo(() => calculateKelly(prices, riskFreeRate / 100), [prices, riskFreeRate]);
  const curve = useMemo(() => generateKellyCurve(kelly.annualizedReturn / 100, kelly.annualizedVolatility / 100, riskFreeRate / 100), [kelly, riskFreeRate]);

  const handleLoad = async () => {
    setLoading(true);
    const data = await fetchHistoricalData(symbol, 5);
    setPrices(data);
    setLoading(false);
  };

  const stats = [
    { label: 'Full Kelly', value: `${kelly.fullKelly.toFixed(2)}x`, icon: <Zap className="w-5 h-5" />, color: kelly.fullKelly > 2 ? 'text-red' : kelly.fullKelly > 1 ? 'text-yellow-400' : 'text-green' },
    { label: 'Half Kelly', value: `${kelly.halfKelly.toFixed(2)}x`, icon: <Shield className="w-5 h-5" />, color: 'text-green' },
    { label: 'Quarter Kelly', value: `${kelly.quarterKelly.toFixed(2)}x`, icon: <TrendingUp className="w-5 h-5" />, color: 'text-blue-400' },
    { label: 'Sharpe Ratio', value: kelly.sharpeRatio.toFixed(2), icon: <AlertTriangle className="w-5 h-5" />, color: kelly.sharpeRatio > 1 ? 'text-green' : 'text-yellow-400' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 pb-20 pt-8 space-y-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Kelly Criterion & Leverage</h1>
            <p className="text-text-muted text-sm mt-1">Optimal leverage calculations and the Kelly growth curve.</p>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all w-32"
            />
            <button
              onClick={handleLoad}
              disabled={loading}
              className="px-4 py-2 bg-gold hover:bg-gold-dark text-black font-bold rounded-xl transition-all text-sm"
            >
              {loading ? 'Loading...' : 'Load'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {stats.map((s, i) => (
            <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} color={s.color} index={i} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-secondary border border-border rounded-2xl p-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-gold" />
              Kelly Growth Curve
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={curve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                  <XAxis dataKey="leverage" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '12px', fontSize: 12 }}
                    formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'Growth']}
                  />
                  <Line type="monotone" dataKey="growth" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <ReferenceLine x={kelly.fullKelly} stroke="#f5a623" strokeDasharray="4 4" label={{ value: 'Full Kelly', fill: '#f5a623', fontSize: 10, position: 'top' }} />
                  <ReferenceLine x={kelly.halfKelly} stroke="#00d4aa" strokeDasharray="4 4" label={{ value: 'Half Kelly', fill: '#00d4aa', fontSize: 10, position: 'bottom' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="text-white font-bold flex items-center gap-2">
              <Info className="w-4 h-4 text-gold" />
              What is the Kelly Criterion?
            </h3>
            <div className="space-y-3 text-sm text-text-muted">
              <p>
                The Kelly Criterion is a mathematical formula for bet sizing that maximises the long-term growth rate of wealth. It was developed by John L. Kelly at Bell Labs in 1956.
              </p>
              <p className="font-mono text-gold bg-gold/5 rounded-lg p-2 text-xs border border-gold/10">
                f* = (μ − r) / σ²
              </p>
              <p>
                <strong className="text-white">Full Kelly</strong> = {kelly.fullKelly.toFixed(2)}x maximises long-run wealth but can involve large short-term swings and deep drawdowns.
              </p>
              <p>
                <strong className="text-white">Half Kelly</strong> = {kelly.halfKelly.toFixed(2)}x halves variance while keeping ~75% of growth — a common practical choice for traders.
              </p>
              <p>
                <strong className="text-white">Quarter Kelly</strong> = {kelly.quarterKelly.toFixed(2)}x is conservative with lower volatility, suitable for risk-averse investors.
              </p>
            </div>
            <div className="border-t border-border pt-4 space-y-2">
              <h4 className="text-white font-bold text-sm">Current Asset Stats</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-primary/50 rounded-lg p-2 border border-border">
                  <div className="text-text-muted">Regime</div>
                  <div className={kelly.regimeColor + " font-bold"}>{kelly.regime}</div>
                </div>
                <div className="bg-primary/50 rounded-lg p-2 border border-border">
                  <div className="text-text-muted">Ann. Return</div>
                  <div className="text-white font-bold">{kelly.annualizedReturn.toFixed(1)}%</div>
                </div>
                <div className="bg-primary/50 rounded-lg p-2 border border-border">
                  <div className="text-text-muted">Ann. Volatility</div>
                  <div className="text-white font-bold">{kelly.annualizedVolatility.toFixed(1)}%</div>
                </div>
                <div className="bg-primary/50 rounded-lg p-2 border border-border">
                  <div className="text-text-muted">Max Drawdown</div>
                  <div className="text-white font-bold">{kelly.maxDrawdown.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


export default KellyModule
