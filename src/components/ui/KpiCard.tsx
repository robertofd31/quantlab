import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, ReferenceLine, Legend
} from 'recharts';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import type { KpiResult } from '../../lib/kpis';
import { kpiDefinitions } from '../../lib/kpiDefinitions';

interface KpiCardProps {
  kpi: KpiResult;
}

export function KpiCard({ kpi }: KpiCardProps) {
  const [mode, setMode] = useState<'basic' | 'advanced'>('basic');
  const [showNotes, setShowNotes] = useState(false);
  const def = kpiDefinitions[kpi.id];
  if (!def) return null;

  const signalConfig = def.signalLabels[kpi.signal] || { label: 'NEUTRAL', color: '#6b6b80' };

  const renderBasic = () => (
    <div className="space-y-4">
      {/* Main value */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-black text-white">
            {kpi.id === 'jensen-kelly' && `${kpi.values.kellyFull}x`}
            {kpi.id === 'omega-ratio' && `${kpi.values.currentOmega}`}
            {kpi.id === 'var-vag' && `${kpi.values.ratio3x}x`}
            {kpi.id === 'kelly-curve' && `${kpi.values.optimalKelly}x`}
            {kpi.id === 'vmkl' && `${kpi.values.optimalLeverage}x`}
          </div>
          <div className="text-sm text-text-muted mt-1">
            {def.basicInterpretation(kpi.values)}
          </div>
        </div>
        <div
          className="px-3 py-1.5 rounded-lg text-xs font-black border"
          style={{
            backgroundColor: `${signalConfig.color}15`,
            borderColor: `${signalConfig.color}30`,
            color: signalConfig.color,
          }}
        >
          {signalConfig.label}
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        {kpi.id === 'jensen-kelly' && (
          <>
            <MetricBox label="Annual Return" value={`${kpi.values.arithmeticReturn}%`} />
            <MetricBox label="Volatility" value={`${kpi.values.volatility}%`} />
            <MetricBox label="Half Kelly" value={`${kpi.values.kelly50}x`} />
            <MetricBox label="Max Leverage" value={`${kpi.values.maxLeverage}x`} />
          </>
        )}
        {kpi.id === 'omega-ratio' && (
          <>
            <MetricBox label="Omega" value={`${kpi.values.currentOmega}`} />
            <MetricBox label="Target" value={`${kpi.values.annualTarget}%`} />
            <MetricBox label="Lookback" value={`${kpi.values.lookback}d`} />
            <MetricBox label="Max MAR" value={`${kpi.values.maxMar}%`} />
          </>
        )}
        {kpi.id === 'var-vag' && (
          <>
            <MetricBox label="VaR 1x" value={`${kpi.values.var1x}%`} />
            <MetricBox label="VaG 1x" value={`${kpi.values.vag1x}%`} />
            <MetricBox label="VaR 3x" value={`${kpi.values.var3x}%`} />
            <MetricBox label="VaG 3x" value={`${kpi.values.vag3x}%`} />
          </>
        )}
        {kpi.id === 'kelly-curve' && (
          <>
            <MetricBox label="Optimal Kelly" value={`${kpi.values.optimalKelly}x`} />
            <MetricBox label="Half Kelly" value={`${kpi.values.halfKelly}x`} />
            <MetricBox label="Max Growth" value={`${kpi.values.maxGrowth}%`} />
            <MetricBox label="Regime" value={`${kpi.values.regime}`} />
          </>
        )}
        {kpi.id === 'vmkl' && (
          <>
            <MetricBox label="Leverage" value={`${kpi.values.optimalLeverage}x`} />
            <MetricBox label="Forecast Vol" value={`${kpi.values.forecastVol}%`} />
            <MetricBox label="Predicted μ" value={`${kpi.values.predictedMu}%`} />
            <MetricBox label="Regime" value={`${kpi.values.regime}`} />
          </>
        )}
      </div>

      {/* Mini sparkline */}
      {kpi.chartData && kpi.chartData.length > 0 && (
        <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {kpi.id === 'var-vag' ? (
              <BarChart data={kpi.chartData}>
                <Bar dataKey="var" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="vag" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '8px', fontSize: 11 }}
                />
              </BarChart>
            ) : (
              <LineChart data={kpi.chartData.slice(-30)}>
                <Line
                  type="monotone"
                  dataKey={kpi.id === 'kelly-curve' ? 'growth' : kpi.id === 'vmkl' ? 'leverage' : 'omega'}
                  stroke={def.categoryColor}
                  strokeWidth={2}
                  dot={false}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '8px', fontSize: 11 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  const renderAdvanced = () => (
    <div className="space-y-4">
      {/* Full chart */}
      {kpi.chartData && kpi.chartData.length > 0 && (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {kpi.id === 'jensen-kelly' && (
              <LineChart data={kpi.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                <XAxis dataKey="leverage" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '12px', fontSize: 12 }} />
                <ReferenceLine y={0} stroke="#ff4757" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="growth" stroke="#f5a623" strokeWidth={2} dot={false} />
              </LineChart>
            )}
            {kpi.id === 'omega-ratio' && (
              <LineChart data={kpi.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '12px', fontSize: 12 }} />
                <ReferenceLine y={1} stroke="#f5a623" strokeDasharray="4 4" label={{ value: 'Breakeven', fill: '#f5a623', fontSize: 10 }} />
                <ReferenceLine y={1.5} stroke="#089981" strokeDasharray="3 3" />
                <ReferenceLine y={0.7} stroke="#ff9800" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="omega" stroke="#00d4aa" fill="rgba(0,212,170,0.1)" strokeWidth={2} />
              </LineChart>
            )}
            {kpi.id === 'var-vag' && (
              <BarChart data={kpi.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                <XAxis dataKey="leverage" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}x`} />
                <YAxis tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '12px', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="var" name="VaR (Downside)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="vag" name="VaG (Upside)" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
            {kpi.id === 'kelly-curve' && (
              <AreaChart data={kpi.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                <XAxis dataKey="leverage" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}x`} />
                <YAxis tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '12px', fontSize: 12 }} />
                <ReferenceLine y={0} stroke="#ff4757" strokeDasharray="4 4" />
                <ReferenceLine x={Number(kpi.values.optimalKelly)} stroke="#00e676" strokeDasharray="4 4" label={{ value: 'Kelly Opt', fill: '#00e676', fontSize: 10 }} />
                <ReferenceLine x={Number(kpi.values.halfKelly)} stroke="#ffd600" strokeDasharray="4 4" label={{ value: 'Half Kelly', fill: '#ffd600', fontSize: 10 }} />
                <Area type="monotone" dataKey="growth" stroke="#a855f7" fill="rgba(168,85,247,0.15)" strokeWidth={2} />
              </AreaChart>
            )}
            {kpi.id === 'vmkl' && (
              <LineChart data={kpi.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '12px', fontSize: 12 }} />
                <ReferenceLine y={1} stroke="#fff" strokeWidth={2} />
                <ReferenceLine y={3} stroke="#f5a623" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="leverage" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Formula */}
      <div className="bg-primary/50 rounded-xl p-4 border border-border">
        <div className="text-[10px] font-bold text-gold uppercase tracking-widest mb-2">Formula</div>
        <pre className="text-xs text-text-muted font-mono whitespace-pre-wrap">{def.advancedFormula}</pre>
      </div>

      {/* Parameters table */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold text-gold uppercase tracking-widest">Parameters</div>
        <div className="grid grid-cols-1 gap-2">
          {def.advancedParameters.map((param) => (
            <div key={param.name} className="flex items-start gap-3 bg-primary/30 rounded-lg p-3 border border-border">
              <div className="flex-1">
                <div className="text-sm font-bold text-white">{param.name}</div>
                <div className="text-xs text-gold font-mono">{param.value}</div>
              </div>
              <div className="text-xs text-text-muted flex-1">{param.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed values */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold text-gold uppercase tracking-widest">Calculated Values</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.entries(kpi.values).map(([key, val]) => (
            <div key={key} className="bg-primary/30 rounded-lg p-2 border border-border">
              <div className="text-[10px] text-text-muted uppercase">{key}</div>
              <div className="text-sm font-bold text-white">{String(val)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${def.categoryColor}15` }}
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: def.categoryColor }} />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">{def.shortTitle}</h3>
              <p className="text-text-muted text-[10px]">{def.name}</p>
            </div>
          </div>
          <div
            className="text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider"
            style={{
              backgroundColor: `${def.categoryColor}15`,
              color: def.categoryColor,
              border: `1px solid ${def.categoryColor}30`,
            }}
          >
            {def.category}
          </div>
        </div>

        {/* Toggle */}
        <div className="flex bg-secondary rounded-lg p-1">
          <button
            onClick={() => setMode('basic')}
            className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
              mode === 'basic' ? 'bg-gold/10 text-gold' : 'text-text-muted hover:text-white'
            }`}
          >
            Basic
          </button>
          <button
            onClick={() => setMode('advanced')}
            className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
              mode === 'advanced' ? 'bg-gold/10 text-gold' : 'text-text-muted hover:text-white'
            }`}
          >
            Advanced
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {mode === 'basic' ? renderBasic() : renderAdvanced()}
          </motion.div>
        </AnimatePresence>

        {/* Notes accordion */}
        <div className="mt-4 pt-4 border-t border-border">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-2 text-xs font-bold text-gold hover:text-gold-light transition-all"
          >
            <BookOpen className="w-4 h-4" />
            Educational Notes
            {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <AnimatePresence>
            {showNotes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-3 text-sm text-text-muted">
                  <div>
                    <span className="text-white font-bold">What is it?</span>
                    <p className="mt-1">{def.notes}</p>
                  </div>
                  <div>
                    <span className="text-white font-bold">Why it matters</span>
                    <p className="mt-1">{def.whyItMatters}</p>
                  </div>
                  <div>
                    <span className="text-white font-bold">How to use it</span>
                    <p className="mt-1">{def.howToUse}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-primary/30 rounded-lg p-2 border border-border text-center">
      <div className="text-[10px] text-text-muted uppercase tracking-wider">{label}</div>
      <div className="text-sm font-black text-white mt-0.5">{value}</div>
    </div>
  );
}
