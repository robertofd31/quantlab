import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, ReferenceLine, Legend, ReferenceArea,
  ComposedChart
} from 'recharts';
import { BookOpen, ChevronDown, ChevronUp, FileText, Calculator, Lightbulb, Settings, Bell } from 'lucide-react';
import type { KpiResult } from '../../lib/kpis';
import { kpiDefinitions } from '../../lib/kpiDefinitions';

interface KpiCardProps {
  kpi: KpiResult;
}

// Custom tooltip for richer chart info
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-xl p-3 shadow-lg">
      <div className="text-xs text-text-muted mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="text-xs font-bold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </div>
      ))}
    </div>
  );
}

export function KpiCard({ kpi }: KpiCardProps) {
  const [mode, setMode] = useState<'basic' | 'advanced'>('basic');
  const [showNotes, setShowNotes] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const def = kpiDefinitions[kpi.id];
  if (!def) return null;

  const signalConfig = def.signalLabels[kpi.signal] || { label: 'NEUTRAL', color: '#6b6b80' };
  const ext = def.extendedContent;

  const renderBasic = () => (
    <div className="space-y-4">
      {/* Main value */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="min-w-0">
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
          className="px-3 py-1.5 rounded-lg text-xs font-black border self-start sm:self-auto"
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
            <MetricBox label="Full Kelly" value={`${kpi.values.optimalKelly}x`} />
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

      {/* Sparkline */}
      {kpi.chartData && kpi.chartData.length > 0 && (
        <div className="h-[120px] md:h-[140px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {kpi.id === 'var-vag' ? (
              <BarChart data={kpi.chartData}>
                <Bar dataKey="var" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="vag" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Tooltip content={<CustomTooltip />} />
              </BarChart>
            ) : (kpi.id === 'kelly-curve' || kpi.id === 'jensen-kelly') ? (
              <AreaChart data={kpi.chartData}>
                <Area type="monotone" dataKey="growth" stroke={def.categoryColor} fill={`${def.categoryColor}15`} strokeWidth={2} />
                <Tooltip content={<CustomTooltip />} />
              </AreaChart>
            ) : (
              <LineChart data={kpi.chartData.slice(-30)}>
                <Line
                  type="monotone"
                  dataKey={kpi.id === 'vmkl' ? 'leverage' : 'omega'}
                  stroke={def.categoryColor}
                  strokeWidth={2}
                  dot={false}
                />
                <Tooltip content={<CustomTooltip />} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  const renderAdvanced = () => (
    <div className="space-y-6">
      {/* Main Chart */}
      {kpi.chartData && kpi.chartData.length > 0 && (
        <div className="bg-secondary rounded-xl p-3 md:p-4 border border-border">
          <div className="text-[10px] font-bold text-gold uppercase tracking-widest mb-2 md:mb-3">Indicator Chart</div>
          <div className="h-[240px] md:h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {kpi.id === 'jensen-kelly' && <JensenKellyChart kpi={kpi} />}
              {kpi.id === 'omega-ratio' && <OmegaChart kpi={kpi} />}
              {kpi.id === 'var-vag' && <VarVagChart kpi={kpi} />}
              {kpi.id === 'kelly-curve' && <KellyCurveChart kpi={kpi} />}
              {kpi.id === 'vmkl' && <VMKLChart kpi={kpi} />}
            </ResponsiveContainer>
          </div>
          {/* Chart annotation */}
          <ChartAnnotation kpi={kpi} />
        </div>
      )}

      {/* Formula */}
      <AccordionSection
        id="formula"
        title="Formula"
        icon={<Calculator className="w-4 h-4" />}
        expanded={expandedSection}
        setExpanded={setExpandedSection}
      >
        <div className="bg-primary/50 rounded-xl p-4 border border-border">
          <pre className="text-xs text-text-muted font-mono whitespace-pre-wrap leading-relaxed">{def.advancedFormula}</pre>
        </div>
      </AccordionSection>

      {/* Theory */}
      <AccordionSection
        id="theory"
        title="Theory & Explanation"
        icon={<FileText className="w-4 h-4" />}
        expanded={expandedSection}
        setExpanded={setExpandedSection}
      >
        <div className="text-sm text-text-muted leading-relaxed space-y-3">
          <p>{ext.theory}</p>
          <div className="bg-primary/30 rounded-xl p-4 border border-border">
            <div className="text-[10px] font-bold text-gold uppercase tracking-widest mb-2">Mathematical Derivation</div>
            <p>{ext.mathDerivation}</p>
          </div>
        </div>
      </AccordionSection>

      {/* Parameters */}
      <AccordionSection
        id="params"
        title="Parameters & Settings"
        icon={<Settings className="w-4 h-4" />}
        expanded={expandedSection}
        setExpanded={setExpandedSection}
      >
        <div className="space-y-2">
          {ext.settingsGuide.map((param) => (
            <div key={param.name} className="flex items-start gap-3 bg-primary/30 rounded-lg p-3 border border-border">
              <div className="flex-1">
                <div className="text-sm font-bold text-white">{param.name}</div>
                <div className="text-xs text-gold font-mono">{param.value}</div>
              </div>
              <div className="text-xs text-text-muted flex-1">{param.explanation}</div>
            </div>
          ))}
        </div>
      </AccordionSection>

      {/* Alerts */}
      <AccordionSection
        id="alerts"
        title="Alert Conditions"
        icon={<Bell className="w-4 h-4" />}
        expanded={expandedSection}
        setExpanded={setExpandedSection}
      >
        <div className="space-y-2">
          {ext.alerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-3 bg-primary/30 rounded-lg p-3 border border-border">
              <div className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">{alert.condition}</div>
                <div className="text-xs text-text-muted">{alert.message}</div>
              </div>
            </div>
          ))}
        </div>
      </AccordionSection>

      {/* Practical Examples */}
      <AccordionSection
        id="examples"
        title="Practical Examples & Use Cases"
        icon={<Lightbulb className="w-4 h-4" />}
        expanded={expandedSection}
        setExpanded={setExpandedSection}
      >
        <div className="text-sm text-text-muted leading-relaxed">
          {ext.practicalExamples}
        </div>
      </AccordionSection>

      {/* References */}
      <AccordionSection
        id="references"
        title="Academic References"
        icon={<FileText className="w-4 h-4" />}
        expanded={expandedSection}
        setExpanded={setExpandedSection}
      >
        <div className="space-y-2">
          {ext.references.map((ref, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-text-muted">
              <span className="text-gold font-mono text-xs mt-0.5">[{i + 1}]</span>
              <span>{ref}</span>
            </div>
          ))}
        </div>
      </AccordionSection>

      {/* Key Metrics Table */}
      <div className="bg-secondary rounded-xl p-4 border border-border">
        <div className="text-[10px] font-bold text-gold uppercase tracking-widest mb-3">Key Metrics</div>
        <KeyMetricsTable kpi={kpi} />
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
      <div className="p-4 md:p-5 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${def.categoryColor}15` }}
            >
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: def.categoryColor }} />
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-bold text-lg">{def.shortTitle}</h3>
              <p className="text-text-muted text-xs truncate">{def.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
            <div
              className="text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider border"
              style={{
                backgroundColor: `${signalConfig.color}15`,
                borderColor: `${signalConfig.color}30`,
                color: signalConfig.color,
              }}
            >
              {signalConfig.label}
            </div>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex bg-secondary rounded-lg p-1">
          <button
            onClick={() => setMode('basic')}
            className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${
              mode === 'basic' ? 'bg-gold/10 text-gold' : 'text-text-muted hover:text-white'
            }`}
          >
            Basic
          </button>
          <button
            onClick={() => setMode('advanced')}
            className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${
              mode === 'advanced' ? 'bg-gold/10 text-gold' : 'text-text-muted hover:text-white'
            }`}
          >
            Advanced
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 md:p-5">
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

// ═════════════════════════════════════════════════════════════════════════
// CHART COMPONENTS
// ═════════════════════════════════════════════════════════════════════════

function JensenKellyChart({ kpi }: { kpi: KpiResult }) {
  const data = kpi.chartData || [];
  const k = Number(kpi.values.kellyFull) || 1;
  const h = Number(kpi.values.kelly50) || 0.5;
  const geo1 = Number(kpi.values.geo1x);
  const geo2 = Number(kpi.values.geo2x);
  const geo3 = Number(kpi.values.geo3x);
  const geoK = Number(kpi.values.geoKelly);

  return (
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
      <XAxis dataKey="leverage" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}x`} />
      <YAxis tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
      <Tooltip content={<CustomTooltip />} />
      {/* Risk zones */}
      <ReferenceArea x1={0} x2={k * 0.33} y1={-100} y2={100} fill="#22c55e" fillOpacity={0.05} />
      <ReferenceArea x1={k * 0.33} x2={k * 0.66} y1={-100} y2={100} fill="#00d4aa" fillOpacity={0.05} />
      <ReferenceArea x1={k * 0.66} x2={k * 0.9} y1={-100} y2={100} fill="#f5a623" fillOpacity={0.05} />
      <ReferenceArea x1={k * 0.9} x2={5} y1={-100} y2={100} fill="#ef4444" fillOpacity={0.05} />
      {/* Zero line */}
      <ReferenceLine y={0} stroke="#ff4757" strokeDasharray="4 4" />
      {/* Key horizontal references */}
      <ReferenceLine y={geo1} stroke="#22c55e" strokeDasharray="2 2" label={{ value: `1x Geo ${geo1.toFixed(1)}%`, fill: '#22c55e', fontSize: 9 }} />
      <ReferenceLine y={geo2} stroke="#f5a623" strokeDasharray="2 2" label={{ value: `2x Geo ${geo2.toFixed(1)}%`, fill: '#f5a623', fontSize: 9 }} />
      <ReferenceLine y={geo3} stroke="#ef4444" strokeDasharray="2 2" label={{ value: `3x Geo ${geo3.toFixed(1)}%`, fill: '#ef4444', fontSize: 9 }} />
      {geoK > -100 && <ReferenceLine y={geoK} stroke="#00d4ff" strokeDasharray="2 2" label={{ value: `Kelly Geo ${geoK.toFixed(1)}%`, fill: '#00d4ff', fontSize: 9 }} />}
      {/* Vertical references */}
      <ReferenceLine x={1} stroke="#fff" strokeOpacity={0.2} strokeDasharray="3 3" />
      <ReferenceLine x={2} stroke="#fff" strokeOpacity={0.2} strokeDasharray="3 3" />
      <ReferenceLine x={3} stroke="#fff" strokeOpacity={0.2} strokeDasharray="3 3" />
      <ReferenceLine x={k} stroke="#00e676" strokeDasharray="4 4" label={{ value: `Full Kelly ${k.toFixed(1)}x`, fill: '#00e676', fontSize: 10 }} />
      <ReferenceLine x={h} stroke="#ffd600" strokeDasharray="4 4" label={{ value: `Half Kelly ${h.toFixed(1)}x`, fill: '#ffd600', fontSize: 10 }} />
      <Line type="monotone" dataKey="growth" stroke="#f5a623" strokeWidth={2} dot={false} name="Geometric Return" />
    </LineChart>
  );
}

function OmegaChart({ kpi }: { kpi: KpiResult }) {
  // Parse omega curve from values
  let curveData: any[] = [];
  try {
    const raw = kpi.values.omegaCurve as string;
    if (raw) {
      const parsed = JSON.parse(raw);
      curveData = parsed.map((p: any) => ({ mar: `${p.mar}%`, omega: p.omega }));
    }
  } catch {
    curveData = [];
  }

  // If no curve data, fallback to time series
  const data = curveData.length > 0 ? curveData : (kpi.chartData || []);
  const isCurve = curveData.length > 0;

  return (
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
      <XAxis dataKey={isCurve ? 'mar' : 'day'} tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
      <Tooltip content={<CustomTooltip />} />
      <ReferenceLine y={1} stroke="#f5a623" strokeDasharray="4 4" label={{ value: 'Breakeven (Ω=1)', fill: '#f5a623', fontSize: 10 }} />
      <ReferenceLine y={1.5} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Bullish (>1.5)', fill: '#22c55e', fontSize: 9 }} />
      <ReferenceLine y={0.7} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Bearish (<0.7)', fill: '#ef4444', fontSize: 9 }} />
      {/* Colored zones */}
      <ReferenceArea y1={1.5} y2={5} fill="#22c55e" fillOpacity={0.05} />
      <ReferenceArea y1={1.0} y2={1.5} fill="#f5a623" fillOpacity={0.05} />
      <ReferenceArea y1={0.7} y2={1.0} fill="#ff9800" fillOpacity={0.05} />
      <ReferenceArea y1={0} y2={0.7} fill="#ef4444" fillOpacity={0.05} />
      <Line type="monotone" dataKey="omega" stroke="#00d4aa" strokeWidth={2} dot={false} name={isCurve ? 'Ω Curve' : 'Omega Ratio'} />
    </LineChart>
  );
}

function VarVagChart({ kpi }: { kpi: KpiResult }) {
  const data = kpi.chartData || [];

  return (
    <ComposedChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
      <XAxis dataKey="leverage" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}x`} />
      <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
      <Tooltip content={<CustomTooltip />} />
      <Legend wrapperStyle={{ fontSize: 11 }} />
      <ReferenceLine yAxisId="right" y={1} stroke="#fff" strokeDasharray="3 3" label={{ value: 'Ratio=1', fill: '#fff', fontSize: 9 }} />
      <ReferenceLine yAxisId="right" y={3} stroke="#f5a623" strokeDasharray="3 3" label={{ value: 'Ratio=3', fill: '#f5a623', fontSize: 9 }} />
      <ReferenceLine yAxisId="right" y={6} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Ratio=6', fill: '#22c55e', fontSize: 9 }} />
      <Bar yAxisId="left" dataKey="var" name="VaR (Downside 5%)" fill="#ef4444" radius={[4, 4, 0, 0]} />
      <Bar yAxisId="left" dataKey="vag" name="VaG (Upside 95%)" fill="#22c55e" radius={[4, 4, 0, 0]} />
      <Line yAxisId="right" type="monotone" dataKey="ratio" name="Gain/Risk Ratio" stroke="#00d4ff" strokeWidth={2} dot={{ r: 4 }} />
    </ComposedChart>
  );
}

function KellyCurveChart({ kpi }: { kpi: KpiResult }) {
  const data = kpi.chartData || [];
  const opt = Number(kpi.values.optimalKelly) || 0;
  const half = Number(kpi.values.halfKelly) || 0;
  const zeroLev = Number(kpi.values.zeroGrowthLeverage) || 0;

  // Find zone boundaries from data
  const underEnd = data.find((d: any) => d.zone !== 'Underinvesting')?.leverage || opt * 0.33;
  const optEnd = data.find((d: any) => d.zone === 'High Risk')?.leverage || opt * 0.66;
  const riskEnd = data.find((d: any) => d.zone === 'Never Logical')?.leverage || opt;

  return (
    <AreaChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
      <XAxis dataKey="leverage" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}x`} />
      <YAxis tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
      <Tooltip content={<CustomTooltip />} />
      {/* Risk zones colored */}
      <ReferenceArea x1={0} x2={underEnd} fill="#22c55e" fillOpacity={0.06} />
      <ReferenceArea x1={underEnd} x2={optEnd} fill="#00d4aa" fillOpacity={0.06} />
      <ReferenceArea x1={optEnd} x2={riskEnd} fill="#f5a623" fillOpacity={0.06} />
      <ReferenceArea x1={riskEnd} x2={zeroLev || 5} fill="#ef4444" fillOpacity={0.06} />
      {zeroLev > 0 && zeroLev < 10 && <ReferenceArea x1={zeroLev} x2={5} fill="#000" fillOpacity={0.15} />}
      {/* Key lines */}
      <ReferenceLine y={0} stroke="#ff4757" strokeDasharray="4 4" label={{ value: 'Zero Growth', fill: '#ff4757', fontSize: 9 }} />
      <ReferenceLine x={opt} stroke="#00e676" strokeDasharray="4 4" label={{ value: `Full Kelly ${opt.toFixed(1)}x`, fill: '#00e676', fontSize: 10 }} />
      <ReferenceLine x={half} stroke="#ffd600" strokeDasharray="4 4" label={{ value: `Half Kelly ${half.toFixed(1)}x`, fill: '#ffd600', fontSize: 10 }} />
      {zeroLev > 0 && zeroLev < 10 && (
        <ReferenceLine x={zeroLev} stroke="#ff0000" strokeDasharray="4 4" label={{ value: `Zero Growth ${zeroLev.toFixed(1)}x`, fill: '#ff0000', fontSize: 10 }} />
      )}
      <Area type="monotone" dataKey="growth" stroke="#a855f7" fill="rgba(168,85,247,0.15)" strokeWidth={2} name="Expected Growth" />
    </AreaChart>
  );
}

function VMKLChart({ kpi }: { kpi: KpiResult }) {
  const data = kpi.chartData || [];

  return (
    <ComposedChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
      <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} />
      <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} label={{ value: 'Leverage', angle: -90, position: 'insideLeft', fill: '#6b6b80', fontSize: 10 }} />
      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#6b6b80' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} label={{ value: 'Volatility', angle: 90, position: 'insideRight', fill: '#6b6b80', fontSize: 10 }} />
      <Tooltip content={<CustomTooltip />} />
      <Legend wrapperStyle={{ fontSize: 11 }} />
      {/* Signal-aligned regime reference lines */}
      <ReferenceLine yAxisId="left" y={3} stroke="#f5a623" strokeDasharray="3 3" label={{ value: 'Max Cap (3x)', fill: '#f5a623', fontSize: 9 }} />
      <ReferenceLine yAxisId="left" y={2} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Bullish (>2x)', fill: '#22c55e', fontSize: 9 }} />
      <ReferenceLine yAxisId="left" y={1} stroke="#fff" strokeWidth={2} label={{ value: 'Neutral (1x)', fill: '#fff', fontSize: 9 }} />
      <ReferenceLine yAxisId="left" y={0.3} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Bearish (<0.3x)', fill: '#ef4444', fontSize: 9 }} />
      {/* Signal background zones: BULLISH >2, NEUTRAL 1-2, CAUTION 0.3-1, BEARISH <0.3 */}
      <ReferenceArea yAxisId="left" y1={2} y2={3} fill="#22c55e" fillOpacity={0.05} />
      <ReferenceArea yAxisId="left" y1={1} y2={2} fill="#f5a623" fillOpacity={0.05} />
      <ReferenceArea yAxisId="left" y1={0.3} y2={1} fill="#ff9800" fillOpacity={0.05} />
      <ReferenceArea yAxisId="left" y1={0} y2={0.3} fill="#ef4444" fillOpacity={0.05} />
      <Area yAxisId="right" type="monotone" dataKey="volatility" stroke="#ff9800" fill="rgba(255,152,0,0.1)" strokeWidth={1} dot={false} name="Forecast Volatility" />
      <Line yAxisId="left" type="monotone" dataKey="leverage" stroke="#3b82f6" strokeWidth={2} dot={false} name="Recommended Leverage" />
    </ComposedChart>
  );
}

// Chart annotation text below chart
function ChartAnnotation({ kpi }: { kpi: KpiResult }) {
  const annotations: Record<string, string> = {
    'jensen-kelly': 'Zones: Green=Underinvesting, Teal=Optimal, Yellow=High Risk, Red=Never Logical. Horizontal lines show geometric returns at 1x/2x/3x/Kelly. Vertical lines mark leverage levels.',
    'omega-ratio': 'Zones: Green=Bullish (Ω>1.5), Yellow=Neutral (1.0-1.5), Orange=Caution (0.7-1.0), Red=Bearish (<0.7). Ω=1 means gains equal losses relative to target.',
    'var-vag': 'Bars show VaR (downside 5%) and VaG (upside 95%). Blue line shows Gain/Risk ratio. Ratio > 3 is neutral, > 6 is bullish for leverage.',
    'kelly-curve': 'Parabolic curve showing expected growth vs leverage. Peak = Optimal Kelly. Left of peak: underinvesting. Right of peak: risk increases, then turns negative (red zone).',
    'vmkl': 'Blue line = recommended leverage. Orange area = forecast volatility. Zones: Green=Bullish (>2x), Yellow=Neutral (1-2x), Orange=Caution (0.3-1x), Red=Bearish (<0.3x). Hard cap at 3x.',
  };
  const text = annotations[kpi.id];
  if (!text) return null;
  return (
    <div className="mt-3 text-[11px] text-text-muted leading-relaxed border-t border-border pt-3">
      <span className="text-gold font-bold">Chart Guide:</span> {text}
    </div>
  );
}

function KeyMetricsTable({ kpi }: { kpi: KpiResult }) {
  const metrics: { label: string; value: string }[] = [];
  const v = kpi.values;

  if (kpi.id === 'jensen-kelly') {
    metrics.push(
      { label: 'Annual Return', value: `${v.arithmeticReturn}%` },
      { label: 'Volatility', value: `${v.volatility}%` },
      { label: 'Full Kelly', value: `${v.kellyFull}x` },
      { label: 'Half Kelly', value: `${v.kelly50}x` },
      { label: 'Quarter Kelly', value: `${v.kelly25}x` },
      { label: 'Max Leverage', value: `${v.maxLeverage}x` },
      { label: 'Geometric Return (1x)', value: `${v.geo1x}%` },
      { label: 'Geometric Return (Kelly)', value: `${v.geoKelly}%` },
      { label: 'Sharpe (1x)', value: String(v.sharpe1x) },
      { label: 'Sharpe (Kelly)', value: String(v.sharpeKelly) },
    );
  } else if (kpi.id === 'omega-ratio') {
    metrics.push(
      { label: 'Current Omega', value: String(v.currentOmega) },
      { label: 'Annual Target', value: `${v.annualTarget}%` },
      { label: 'Lookback', value: `${v.lookback} days` },
      { label: 'Max MAR', value: `${v.maxMar}%` },
    );
  } else if (kpi.id === 'var-vag') {
    metrics.push(
      { label: 'VaR 1x (5%)', value: `${v.var1x}%` },
      { label: 'VaG 1x (95%)', value: `${v.vag1x}%` },
      { label: 'VaR 3x (5%)', value: `${v.var3x}%` },
      { label: 'VaG 3x (95%)', value: `${v.vag3x}%` },
      { label: 'Ratio 1x', value: String(v.ratio1x) },
      { label: 'Ratio 3x', value: String(v.ratio3x) },
      { label: 'Holding Period', value: `${v.holdingPeriod} days` },
      { label: 'Confidence', value: `${v.confidence}%` },
    );
  } else if (kpi.id === 'kelly-curve') {
    metrics.push(
      { label: 'Annual Return', value: `${v.annualizedReturn}%` },
      { label: 'Annual Volatility', value: `${v.annualizedVolatility}%` },
      { label: 'Full Kelly', value: `${v.optimalKelly}x` },
      { label: 'Half Kelly', value: `${v.halfKelly}x` },
      { label: 'Max Growth', value: `${v.maxGrowth}%` },
      { label: 'Zero Growth Leverage', value: `${v.zeroGrowthLeverage}x` },
      { label: 'Regime', value: String(v.regime) },
    );
  } else if (kpi.id === 'vmkl') {
    metrics.push(
      { label: 'Optimal Leverage', value: `${v.optimalLeverage}x` },
      { label: 'Forecast Volatility', value: `${v.forecastVol}%` },
      { label: 'Predicted Return (μ)', value: `${v.predictedMu}%` },
      { label: 'Full Kelly', value: `${v.fullKelly}x` },
      { label: 'Kelly Fraction', value: `${v.kellyFraction}%` },
      { label: 'Regime', value: String(v.regime) },
      { label: 'Mu Capped', value: String(v.isMuCapped) },
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-border">
          {metrics.map((m) => (
            <tr key={m.label} className="hover:bg-white/[0.02] transition-colors">
              <td className="py-2.5 px-3 text-text-muted text-xs font-medium w-1/2">{m.label}</td>
              <td className="py-2.5 px-3 text-white font-bold text-right">{m.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// UTILITY COMPONENTS
// ═════════════════════════════════════════════════════════════════════════

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-primary/30 rounded-lg p-2 border border-border text-center">
      <div className="text-[10px] text-text-muted uppercase tracking-wider">{label}</div>
      <div className="text-sm font-black text-white mt-0.5">{value}</div>
    </div>
  );
}

function AccordionSection({
  id,
  title,
  icon,
  children,
  expanded,
  setExpanded,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
}) {
  const isOpen = expanded === id;

  return (
    <div className="bg-secondary rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setExpanded(isOpen ? null : id)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all"
      >
        <div className="flex items-center gap-2 text-gold">
          {icon}
          <span className="text-sm font-bold text-white">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
