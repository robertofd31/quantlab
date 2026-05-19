import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, AlertTriangle, TrendingUp } from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { calculatePerBak, calculateMarkov, generateVIXCurve } from '../../lib/volatility';
import { fetchHistoricalData } from '../../lib/data';
import { generateMockPrices } from '../../lib/monteCarlo';

export function VolatilityRegimes() {
  const [symbol, setSymbol] = useState('SPY');
  const [prices, setPrices] = useState(generateMockPrices('SPY', 252 * 5));
  const [loading, setLoading] = useState(false);

  const handleLoad = async () => {
    setLoading(true);
    const data = await fetchHistoricalData(symbol, 5);
    setPrices(data);
    setLoading(false);
  };

  const bak = useMemo(() => calculatePerBak(prices), [prices]);
  const markov = useMemo(() => calculateMarkov(prices), [prices]);
  const vix = useMemo(() => generateVIXCurve(), []);

  const markovData = markov.states.map((state, i) => ({
    state,
    crash: markov.matrix[i][0],
    bear: markov.matrix[i][1],
    neutral: markov.matrix[i][2],
    bull: markov.matrix[i][3],
  }));

  return (
    <div className="max-w-7xl mx-auto px-6 pb-20 pt-8 space-y-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Volatility & Market Regimes</h1>
            <p className="text-text-muted text-sm mt-1">Per Bak fragility, Markov transitions, and VIX term structure.</p>
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
          <StatCard label="Fragility Score" value={`${bak.score.toFixed(0)}/100`} icon={<AlertTriangle className="w-5 h-5" />} color={bak.regimeColor} index={0} />
          <StatCard label="Tail Risk" value={`${bak.tailRisk.toFixed(1)}%`} icon={<Activity className="w-5 h-5" />} color="text-red" index={1} />
          <StatCard label="Vol Regime" value={`${bak.volRegime.toFixed(1)}%`} icon={<TrendingUp className="w-5 h-5" />} color="text-yellow-400" index={2} />
          <StatCard label="VIX Structure" value={vix.regime} icon={<Activity className="w-5 h-5" />} color={vix.contango ? 'text-green' : 'text-red'} index={3} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Per Bak Stress Vectors */}
          <div className="bg-secondary border border-border rounded-2xl p-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gold" />
              Per Bak — Stress Vectors
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Tail Risk', value: bak.tailRisk, color: 'bg-red' },
                { label: 'Vol Regime', value: bak.volRegime, color: 'bg-yellow-400' },
                { label: 'Credit Stress', value: bak.creditStress, color: 'bg-orange-400' },
                { label: 'Positioning', value: bak.positioning, color: 'bg-blue-400' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-muted font-bold">{item.label}</span>
                    <span className="text-white font-black">{item.value.toFixed(1)}</span>
                  </div>
                  <div className="w-full bg-card rounded-full h-2">
                    <div className={`${item.color} h-2 rounded-full transition-all`} style={{ width: `${Math.min(item.value, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className={`mt-4 text-sm font-bold ${bak.regimeColor}`}>{bak.regime} Regime</div>
          </div>

          {/* Markov Chain Transition Matrix */}
          <div className="bg-secondary border border-border rounded-2xl p-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gold" />
              Markov Chain — Regime Transition
            </h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={markovData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                  <XAxis dataKey="state" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '12px', fontSize: 12 }} />
                  <Bar dataKey="crash" stackId="a" fill="#ff4757" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="bear" stackId="a" fill="#ff9800" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="neutral" stackId="a" fill="#00d4aa" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="bull" stackId="a" fill="#00e676" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-text-muted">
              {markov.steadyState.map((s, i) => (
                <div key={i} className="flex justify-between">
                  <span>Steady {markov.states[i]}:</span>
                  <span className="text-white font-bold">{(s * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* VIX Term Structure */}
        <div className="bg-secondary border border-border rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4">VIX Term Structure</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={vix.curve}>
                <defs>
                  <linearGradient id="vixGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f5a623" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f5a623" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                <XAxis dataKey="maturity" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '12px', fontSize: 12 }} />
                <Area type="monotone" dataKey="value" stroke="#f5a623" fill="url(#vixGradient)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


export default VolatilityRegimes
