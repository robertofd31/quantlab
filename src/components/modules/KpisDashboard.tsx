import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, RefreshCw, Map, X, ChevronRight
} from 'lucide-react';
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

const KPI_ORDER = ['jensen-kelly', 'omega-ratio', 'var-vag', 'kelly-curve', 'vmkl'];

export default function KpisDashboard() {
  const [symbol, setSymbol] = useState('SPY');
  const [years, setYears] = useState(3);
  const [kpis, setKpis] = useState<KpiResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState<string>('jensen-kelly');
  const [showMap, setShowMap] = useState(false);

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

  const selectedKpiData = kpis.find((k) => k.id === selectedKpi);

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
        fullName: def?.name || kpi.name,
        category: def?.category || 'Other',
        categoryColor: def?.categoryColor || '#6b6b80',
        mainValue,
        signal: signalConfig.label,
        signalColor: signalConfig.color,
      };
    });
  }, [kpis]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 pb-20 pt-8">
      {/* Top header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-5 h-5 text-gold" />
              <h1 className="text-2xl font-black text-white">KPIs</h1>
            </div>
            <p className="text-text-muted text-sm">
              Advanced leverage, risk, and distribution indicators. All calculated with real data.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all"
            >
              {TICKERS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

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

            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 bg-card border border-border rounded-xl text-white hover:bg-white/5 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setShowMap(true)}
              className="px-3 py-2.5 bg-card border border-border rounded-xl text-white hover:bg-white/5 transition-all flex items-center gap-2 text-xs font-bold"
            >
              <Map className="w-4 h-4 text-gold" />
              Global Map
            </button>
          </div>
        </div>
      </motion.div>

      {/* Layout: Sidebar + Main */}
      <div className="flex gap-6">
        {/* Sidebar — KPI List */}
        <aside className="hidden md:flex w-72 flex-shrink-0 flex-col gap-2">
          <div className="text-[10px] font-bold text-gold uppercase tracking-[2px] mb-2 px-2 opacity-80">Indicators</div>
          {KPI_ORDER.map((kpiId) => {
            const def = kpiDefinitions[kpiId];
            const kpi = kpis.find((k) => k.id === kpiId);
            const isActive = selectedKpi === kpiId;

            let mainValue = '';
            if (kpi) {
              if (kpi.id === 'jensen-kelly') mainValue = `${kpi.values.kellyFull}x`;
              else if (kpi.id === 'omega-ratio') mainValue = `${kpi.values.currentOmega}`;
              else if (kpi.id === 'var-vag') mainValue = `${kpi.values.ratio3x}x`;
              else if (kpi.id === 'kelly-curve') mainValue = `${kpi.values.optimalKelly}x`;
              else if (kpi.id === 'vmkl') mainValue = `${kpi.values.optimalLeverage}x`;
            }

            return (
              <button
                key={kpiId}
                onClick={() => setSelectedKpi(kpiId)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all group ${
                  isActive
                    ? 'bg-gold/10 text-gold border border-gold/20'
                    : 'bg-card border border-transparent hover:border-border hover:text-white text-text-muted'
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: def?.categoryColor || '#6b6b80' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{def?.shortTitle}</div>
                  <div className="text-[10px] opacity-70 truncate">{def?.category}</div>
                </div>
                {mainValue && (
                  <div className="text-xs font-black">{mainValue}</div>
                )}
                {isActive && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
              </button>
            );
          })}

          {/* Legend */}
          <div className="mt-auto pt-4 border-t border-border space-y-2 text-[10px] text-text-muted">
            <div className="font-bold text-gold uppercase tracking-wider">Signal Legend</div>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green inline-block" /> BULLISH</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> NEUTRAL</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> CAUTION</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red inline-block" /> BEARISH</span>
          </div>
        </aside>

        {/* Mobile selector */}
        <div className="md:hidden mb-4">
          <select
            value={selectedKpi}
            onChange={(e) => setSelectedKpi(e.target.value)}
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-white font-black focus:outline-none focus:border-gold transition-all"
          >
            {KPI_ORDER.map((kpiId) => (
              <option key={kpiId} value={kpiId}>
                {kpiDefinitions[kpiId]?.shortTitle} — {kpiDefinitions[kpiId]?.category}
              </option>
            ))}
          </select>
        </div>

        {/* Main area */}
        <main className="flex-1 min-w-0">
          {selectedKpiData ? (
            <KpiCard kpi={selectedKpiData} key={selectedKpiData.id} />
          ) : loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-text-muted text-sm flex items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                Calculating indicators...
              </div>
            </div>
          ) : null}
        </main>
      </div>

      {/* Global Map Modal */}
      <AnimatePresence>
        {showMap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMap(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-secondary border border-border rounded-2xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Map className="w-5 h-5 text-gold" />
                  Global Overview — {symbol} ({years}Y)
                </h2>
                <button
                  onClick={() => setShowMap(false)}
                  className="p-2 bg-primary/50 rounded-lg hover:bg-white/5 transition-all"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              <p className="text-text-muted text-sm mb-6">
                Summary of all KPIs at once. Colors indicate signal strength.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {globalMapData.map((item) => (
                  <div
                    key={item.id}
                    className="bg-card border border-border rounded-xl p-4 space-y-3 cursor-pointer hover:border-gold/30 transition-all"
                    onClick={() => {
                      setShowMap(false);
                      setSelectedKpi(item.id);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2" style={{ color: item.categoryColor }}>
                        <span className="text-xs font-bold uppercase tracking-wider">{item.category}</span>
                      </div>
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
                    <div className="text-[10px] text-text-muted">{item.fullName}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
