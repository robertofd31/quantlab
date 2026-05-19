import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar } from 'recharts';
import { StatCard } from '../ui/StatCard';

// --- Sigmoid ---
function generateSigmoidData(days: number = 252) {
  const data = [];
  let allocation = 100;
  for (let i = 0; i < days; i++) {
    const dd = Math.sin(i / 40) * 15 + Math.random() * 3;
    const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
    allocation = 30 + 70 * sigmoid(30 * (dd - 15) / 100);
    data.push({
      date: `Day ${i}`,
      allocation: parseFloat(allocation.toFixed(1)),
      dd: parseFloat(dd.toFixed(1)),
      tier: allocation > 80 ? 3 : allocation > 60 ? 2 : allocation > 40 ? 1 : 0,
    });
  }
  return data;
}

// --- EVaR ---
function generateEVaRData(days: number = 252) {
  const data = [];
  let val = 0.3;
  for (let i = 0; i < days; i++) {
    val += (Math.random() - 0.48) * 0.02;
    val = Math.max(0, Math.min(1, val));
    data.push({ date: `Day ${i}`, value: parseFloat(val.toFixed(3)) });
  }
  return data;
}

// --- FPT ---
function generateFPTData() {
  const upBins = [];
  const downBins = [];
  for (let i = 0; i < 20; i++) {
    upBins.push({ x: i * 5 + 2.5, count: Math.floor(Math.random() * 30 * Math.exp(-i / 5)) });
    downBins.push({ x: i * 5 + 2.5, count: Math.floor(Math.random() * 20 * Math.exp(-i / 7)) });
  }
  return { upBins, downBins, upHitRate: 62, downHitRate: 38 };
}

// --- VMKL ---
function generateVMKLData(days: number = 252) {
  const data = [];
  let lev = 1.2;
  for (let i = 0; i < days; i++) {
    lev += (Math.random() - 0.5) * 0.04;
    lev = Math.max(0, Math.min(3, lev));
    data.push({ date: `Day ${i}`, leverage: parseFloat(lev.toFixed(2)) });
  }
  return data;
}

// --- Premium ---
function generatePremiumData(days: number = 252) {
  const data = [];
  let prem = 0;
  for (let i = 0; i < days; i++) {
    prem += (Math.random() - 0.5) * 0.5;
    data.push({
      date: `Day ${i}`,
      premium: parseFloat(prem.toFixed(2)),
      upper: 5,
      lower: -5,
      avg: 0,
    });
  }
  return data;
}

export function IndicatorsAdvanced() {
  const sigmoid = useMemo(() => generateSigmoidData(), []);
  const evar = useMemo(() => generateEVaRData(), []);
  const fpt = useMemo(() => generateFPTData(), []);
  const vmkl = useMemo(() => generateVMKLData(), []);
  const premium = useMemo(() => generatePremiumData(), []);

  const lastSig = sigmoid[sigmoid.length - 1];
  const lastEvar = evar[evar.length - 1];
  const lastVmkl = vmkl[vmkl.length - 1];
  const lastPrem = premium[premium.length - 1];

  const renderSection = (title: string, tag: string, tagColor: string, explanation: string, stats: any[], chart: React.ReactNode) => (
    <section className="bg-card border border-border rounded-3xl overflow-hidden">
      <div className="p-8 border-b border-border">
        <h2 className="text-xl font-bold text-white flex items-center gap-3">
          {title}
          <span className={`text-[10px] font-mono border px-2 py-1 rounded uppercase tracking-wider ${tagColor}`}>{tag}</span>
        </h2>
        <div className="mt-4 p-4 bg-secondary border border-border rounded-xl text-sm text-text-muted">
          <strong className="text-white">Why this indicator:</strong> {explanation}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {stats.map((s: any) => (
            <StatCard key={s.label} label={s.label} value={s.value} sub={s.sub} color={s.color} />
          ))}
        </div>
      </div>
      <div className="p-6 bg-secondary">
        {chart}
      </div>
    </section>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 pb-20 pt-8 space-y-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">

        {/* Sigmoid */}
        {renderSection(
          'Sigmoid Risk Allocator',
          'Visual allocation dial',
          'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
          'Unlike simple "risk-on / risk-off" signals, the Sigmoid Allocator uses a mathematical S-curve to create smooth, gradual transitions in position sizing. It naturally saturates at extremes, preventing all-in panic or over-exposure.',
          [
            { label: 'Allocation', value: `${lastSig.allocation.toFixed(1)}%`, sub: `Tier ${lastSig.tier}`, color: lastSig.tier === 3 ? 'text-green' : lastSig.tier === 2 ? 'text-cyan-400' : 'text-orange-400' },
            { label: 'Drawdown', value: `${lastSig.dd.toFixed(1)}%`, sub: 'From rolling ATH', color: 'text-white' },
            { label: 'Risk Tier', value: lastSig.tier === 3 ? 'Low' : lastSig.tier === 2 ? 'Medium' : 'High', sub: `Tier ${lastSig.tier}`, color: lastSig.tier === 3 ? 'text-green' : lastSig.tier === 2 ? 'text-cyan-400' : 'text-orange-400' },
            { label: 'Signal', value: lastSig.allocation > 70 ? 'BUY' : 'NEUTRAL', sub: 'Allocation-based', color: lastSig.allocation > 70 ? 'text-green' : 'text-text-muted' },
          ],
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sigmoid}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} domain={[0, 105]} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '12px', fontSize: 12 }} />
                <Area type="monotone" dataKey="allocation" stroke="#00d4ff" fill="rgba(0,212,255,0.12)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* EVaR */}
        {renderSection(
          'EVaR — Entropic Value at Risk',
          'Black Swan detector',
          'text-red border-red/30 bg-red/10',
          'Markets exhibit "fat-tailed" distributions where extreme events occur far more frequently than normal distributions predict. EVaR uses Tsallis entropy from statistical mechanics to model power-law distributions. This is your safety filter detecting Black Swans before they hit.',
          [
            { label: 'EVaR Risk', value: `${(lastEvar.value * 100).toFixed(1)}%`, sub: 'Normalized', color: lastEvar.value > 0.7 ? 'text-red' : lastEvar.value > 0.5 ? 'text-orange-400' : 'text-green' },
            { label: 'Position Size', value: `${((1 - lastEvar.value) * 100).toFixed(0)}%`, sub: 'Suggested', color: 'text-white' },
            { label: 'Risk Level', value: lastEvar.value > 0.7 ? 'High' : lastEvar.value > 0.5 ? 'Medium' : 'Low', sub: 'Based on EVaR', color: lastEvar.value > 0.7 ? 'text-red' : lastEvar.value > 0.5 ? 'text-orange-400' : 'text-green' },
            { label: 'Signal', value: lastEvar.value > 0.7 ? 'CAUTION' : 'NEUTRAL', sub: 'Risk-based', color: lastEvar.value > 0.7 ? 'text-yellow-500' : 'text-text-muted' },
          ],
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evar}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} domain={[0, 1]} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '12px', fontSize: 12 }} formatter={(value: any) => [`${(Number(value) * 100).toFixed(1)}%`, 'EVaR']} />
                <Area type="monotone" dataKey="value" stroke="#ff4444" fill="rgba(244,67,54,0.1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* FPT */}
        {renderSection(
          'FPT + Monte Carlo',
          'Target projector',
          'text-purple-400 border-purple-400/30 bg-purple-400/10',
          'First Passage Time answers: "How long until price reaches my target, and what are the odds of getting there first?" Using Geometric Brownian Motion — the model behind Black-Scholes — it runs Monte Carlo simulations to determine when thresholds are likely hit.',
          [
            { label: 'Upside First', value: `${fpt.upHitRate}%`, sub: 'Probability', color: 'text-green' },
            { label: 'Downside First', value: `${fpt.downHitRate}%`, sub: 'Probability', color: 'text-red' },
            { label: 'Target', value: '+/- 5.0%', sub: 'Threshold', color: 'text-white' },
            { label: 'Signal', value: fpt.upHitRate > fpt.downHitRate ? 'BULLISH' : 'BEARISH', sub: 'Direction', color: fpt.upHitRate > fpt.downHitRate ? 'text-green' : 'text-red' },
          ],
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fpt.upBins.map((u: any, i: number) => ({ x: u.x, up: u.count, down: fpt.downBins[i]?.count || 0 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                <XAxis dataKey="x" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} label={{ value: 'Bars to Target', fill: '#6b6b80', fontSize: 10, position: 'insideBottom' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '12px', fontSize: 12 }} />
                <Bar dataKey="up" fill="rgba(0,230,118,0.55)" stroke="#00e676" strokeWidth={1} radius={[4, 4, 0, 0]} />
                <Bar dataKey="down" fill="rgba(244,67,54,0.45)" stroke="#f44336" strokeWidth={1} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* VMKL */}
        {renderSection(
          'Volatility Managed Kelly Leverage',
          'Profit optimizer',
          'text-gold border-gold/30 bg-gold/10',
          'Based on Cooper (2010). Dynamically adjusts leverage using EWMA volatility forecasting and Kelly Criterion mathematics. The insight: volatility of volatility is costly — by targeting consistent volatility, the strategy reduces drawdowns while generating alpha.',
          [
            { label: 'Optimal Leverage', value: `${lastVmkl.leverage.toFixed(2)}x`, sub: 'Current', color: 'text-cyan-400' },
            { label: 'Forecast Vol', value: `${(Math.random() * 20 + 10).toFixed(1)}%`, sub: 'Annualised', color: 'text-white' },
            { label: 'Regime', value: lastVmkl.leverage > 2 ? 'Aggressive' : lastVmkl.leverage > 1 ? 'Moderate' : 'Conservative', sub: 'Leverage-based', color: lastVmkl.leverage > 2 ? 'text-red' : lastVmkl.leverage > 1 ? 'text-yellow-400' : 'text-green' },
            { label: 'Signal', value: lastVmkl.leverage > 1.5 ? 'BUY' : 'NEUTRAL', sub: 'Leverage-based', color: lastVmkl.leverage > 1.5 ? 'text-green' : 'text-text-muted' },
          ],
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vmkl}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '12px', fontSize: 12 }} formatter={(value: any) => [`${Number(value).toFixed(2)}x`, 'Leverage']} />
                <Line type="monotone" dataKey="leverage" stroke="#00d4ff" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Premium/Discount */}
        {renderSection(
          'Asset Premium/Discount Monitor',
          'Opportunity scanner',
          'text-orange-500 border-orange-500/30 bg-orange-500/10',
          'Measures when SPY trades at premium or discount vs its historical relationship with QQQ. Calculates the price ratio vs a 252-day baseline, with bands and percentile rankings. At 95th percentile: potentially overvalued. At 5th percentile: potentially undervalued.',
          [
            { label: 'Premium', value: `${lastPrem.premium.toFixed(2)}%`, sub: 'Current', color: lastPrem.premium > 0 ? 'text-red' : 'text-green' },
            { label: 'Signal', value: lastPrem.premium > 5 ? 'SELL' : lastPrem.premium < -5 ? 'BUY' : 'NEUTRAL', sub: 'Mean-reversion', color: lastPrem.premium > 5 ? 'text-red' : lastPrem.premium < -5 ? 'text-green' : 'text-yellow-500' },
            { label: 'Correlation', value: '0.92', sub: 'SPY vs QQQ (50d)', color: 'text-white' },
            { label: 'Percentile', value: `${Math.floor(Math.random() * 100)}%`, sub: 'Historical', color: 'text-white' },
          ],
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={premium}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '12px', fontSize: 12 }} />
                <Line type="monotone" dataKey="premium" stroke="#f5a623" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="upper" stroke="#ff4757" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="lower" stroke="#00d4aa" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="avg" stroke="#8b949e" strokeWidth={1} strokeDasharray="2 2" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

      </motion.div>
    </div>
  );
}


export default IndicatorsAdvanced
