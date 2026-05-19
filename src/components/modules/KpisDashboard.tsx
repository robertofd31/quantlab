import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, RefreshCw, LayoutGrid, Map } from 'lucide-react';
import { KpiCard } from '../ui/KpiCard';
import { calculateAllKpis, type KpiResult } from '../../lib/kpis';
import { fetchHistoricalData } from '../../lib/data';
import { kpiDefinitions } from '../../lib/kpiDefinitions';

const TICKERS = ['SPY', 'QQQ', 'IWM', 'BTC-USD', 'ETH-USD', 'AAPL', 'TSLA', 'GLD', 'TLT'];
const TIMEFRAMES = [
  { label: '1Y', years: 1 },
  { label: '3Y', years: 3 },
  { label: '5Y', years: 5 },
];

export default function KpisDashboard() {
  const [symbol, setSymbol] = useState('SPY');
  const [years, setYears] = useState(3);
  const [kpis, setKpis] = useState<KpiResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'grid' | 'map'>('grid');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const prices = await fetchHistoricalData(symbol, years);
      const riskFreeRate = 0.04;
      const results = calculateAllKpis({ prices, riskFreeRate, symbol });
      setKpis(results);
    } catch (e) {
      console.error('Failed to load KPIs:', e);
    } finally {
      setLoading(false);
    }
  }, [symbol, years]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Global map data
  const globalMapData = useMemo(() => {
    return kpis.map((kpi) => {
      const def = kpiDefinitions[kpi.id];
      const signalConfig = def?.signalLabels[kpi.signal] || { label: 'NEUTRAL', color: '#6b6b80' };

      let mainValue = '';
      if (kpi.id === 'jensen-kelly') mainValue = `${kpi.values.kellyFull}x`;
      else if (kpi.id === 'omega-ratio') mainValue = `${kpi.values.currentOmega}`;
      else if (kpi.id === 'var-vag') mainValue = `${kpi.values.ratio3x}x`;
      else if (kpi.id === 'kelly-curve') mainValue = `${kpi.values.optimalKelly}x`;
      else if (kpi.id === 'vmkl') mainValue = `${kpi.values.optimalLeverage}x`;

      return {
        id: kpi.id,
        name: def?.shortTitle || kpi.name,
        category: def?.category || 'Other',
        categoryColor: def?.categoryColor || '#6b6b80',
        mainValue,
        signal: signalConfig.label,
        signalColor: signalConfig.color,
        icon: def?.icon || 'BarChart3',
      };
    });
  }, [kpis]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 pb-20 pt-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-5 h-5 text-gold" />
              <h1 className="text-2xl font-black text-white">KPIs</h1>
            </div>
            <p className="text-text-muted text-sm">
              Indicadores avanzados de leverage, riesgo y distribución. Todos calculados con datos reales.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Ticker selector */}
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all"
            >
              {TICKERS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Timeframe */}
            <div className="flex bg-secondary rounded-xl p-1 border border-border">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.label}
                  onClick={() => setYears(tf.years)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    years === tf.years ? 'bg-gold/10 text-gold' : 'text-text-muted hover:text-white'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 bg-card border border-border rounded-xl text-white hover:bg-white/5 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* View toggle */}
            <div className="flex bg-secondary rounded-xl p-1 border border-border">
              <button
                onClick={() => setView('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  view === 'grid' ? 'bg-gold/10 text-gold' : 'text-text-muted hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3 h-3" />
                Grid
              </button>
              <button
                onClick={() => setView('map')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  view === 'map' ? 'bg-gold/10 text-gold' : 'text-text-muted hover:text-white'
                }`}
              >
                <Map className="w-3 h-3" />
                Mapa
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Global Map View */}
      {view === 'map' && globalMapData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-secondary border border-border rounded-2xl p-6"
        >
          <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <Map className="w-5 h-5 text-gold" />
            Vista Global — {symbol} ({years}Y)
          </h2>
          <p className="text-text-muted text-sm mb-6">Resumen de todos los KPIs a la vez. Colores según señal.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {globalMapData.map((item) => (
              <motion.div
                key={item.id}
                whileHover={{ scale: 1.02 }}
                className="bg-card border border-border rounded-xl p-4 space-y-3 cursor-pointer"
                  onClick={() => {
                  setView('grid');
                  setTimeout(() => {
                    const el = document.getElementById(item.id);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                }}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.categoryColor }}
                  />
                  <span
                    className="text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider"
                    style={{
                      backgroundColor: `${item.signalColor}15`,
                      color: item.signalColor,
                      border: `1px solid ${item.signalColor}30`,
                    }}
                  >
                    {item.signal}
                  </span>
                </div>
                <div className="text-2xl font-black text-white">{item.mainValue}</div>
                <div className="text-sm font-bold text-white">{item.name}</div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider">{item.category}</div>
              </motion.div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green inline-block" /> Óptimo / Comprar</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Moderado / Neutral</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Precaución</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red inline-block" /> Evitar / Vender</span>
          </div>
        </motion.div>
      )}

      {/* KPI Grid */}
      {view === 'grid' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {kpis.length === 0 && loading && (
            <div className="col-span-full flex items-center justify-center h-64">
              <div className="text-text-muted text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Calculando indicadores...
              </div>
            </div>
          )}
          {kpis.map((kpi) => (
            <div key={kpi.id} id={kpi.id}>
              <KpiCard kpi={kpi} />
            </div>
          ))}
        </div>
      )}

      {/* Category legend */}
      <div className="flex flex-wrap gap-4 justify-center text-xs text-text-muted pt-4 border-t border-border">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#f5a623' }} /> Leverage</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#ef4444' }} /> Risk</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#00d4aa' }} /> Distribution</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#3b82f6' }} /> Volatility</span>
      </div>
    </div>
  );
}
