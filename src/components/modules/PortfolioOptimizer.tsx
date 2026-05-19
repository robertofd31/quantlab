import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Zap, TrendingUp, BarChart3, AlertTriangle } from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { runPortfolioOptimizer, type OptimizerAsset } from '../../lib/portfolioOptimizer';
import { fetchHistoricalData } from '../../lib/data';

const PRESETS: Record<string, string[]> = {
  'US Large Cap': ['SPY', 'QQQ', 'IWM', 'DIA', 'VOO', 'VTI'],
  'US Equity ETFs': ['XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLP', 'XLI', 'XLU', 'XLB', 'XLC'],
  'Global ETFs': ['VEA', 'VWO', 'EFA', 'EEM', 'IEFA', 'VXUS'],
  'Bonds': ['TLT', 'IEF', 'SHY', 'LQD', 'HYG', 'BND', 'AGG'],
  'Commodities': ['GLD', 'SLV', 'USO', 'UNG', 'DBC'],
  'Factor ETFs': ['QUAL', 'MTUM', 'VLUE', 'SPYG', 'SPYV', 'SPLV'],
  'High Growth': ['ARKK', 'ARKW', 'QQQ', 'VGT', 'SOXX'],
  'Balanced Mix': ['SPY', 'TLT', 'GLD', 'VNQ', 'EFA'],
};

export function PortfolioOptimizer() {
  const [selectedPreset, setSelectedPreset] = useState('US Large Cap');
  const [customTickers, setCustomTickers] = useState('');
  const [nAssets, setNAssets] = useState(3);
  const [riskFreeRate, setRiskFreeRate] = useState(2);
  const [historicalYears, setHistoricalYears] = useState(5);
  const [usePreset, setUsePreset] = useState(true);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof runPortfolioOptimizer> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentTickers = useMemo(() => {
    if (usePreset) return PRESETS[selectedPreset] || [];
    return customTickers.split(/[,\s]+/).filter((t) => t.length > 0);
  }, [usePreset, selectedPreset, customTickers]);

  const runOptimizer = useCallback(async () => {
    if (currentTickers.length < nAssets) {
      setError(`Need at least ${nAssets} tickers. You have ${currentTickers.length}.`);
      return;
    }
    if (currentTickers.length > 15) {
      setError('Maximum 15 tickers to prevent browser freeze.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const assets: OptimizerAsset[] = [];
      for (const symbol of currentTickers) {
        try {
          const prices = await fetchHistoricalData(symbol, historicalYears);
          if (prices.length > 30) {
            assets.push({ symbol, prices });
          }
        } catch {
          console.warn(`Skipped ${symbol}: insufficient data`);
        }
      }
      if (assets.length < nAssets) {
        throw new Error(`Only ${assets.length} assets loaded with data. Need at least ${nAssets}.`);
      }
      const optimizerResult = runPortfolioOptimizer(assets, nAssets, riskFreeRate / 100);
      setResult(optimizerResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Optimizer failed');
    } finally {
      setLoading(false);
    }
  }, [currentTickers, nAssets, riskFreeRate, historicalYears]);

  const topResult = result?.combinations[0];

  return (
    <div className="max-w-7xl mx-auto px-6 pb-20 pt-8 space-y-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white">Portfolio Optimizer</h1>
          <p className="text-text-muted text-sm mt-1">
            Exhaustive Kelly + MPT ranking across asset universes. Finds the portfolio with the highest
            <span className="text-gold font-bold"> Diversification Bonus</span>.
          </p>
        </div>

        {/* Configuration */}
        <div className="bg-secondary border border-border rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Search className="w-5 h-5 text-gold" />
            Optimizer Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-4">
              <div className="text-[10px] font-bold text-gold uppercase tracking-[2px] mb-2">Universe</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setUsePreset(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${usePreset ? 'bg-gold/10 text-gold border border-gold/20' : 'bg-card text-text-muted border border-border'}`}
                >
                  Presets
                </button>
                <button
                  onClick={() => setUsePreset(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!usePreset ? 'bg-gold/10 text-gold border border-gold/20' : 'bg-card text-text-muted border border-border'}`}
                >
                  Custom
                </button>
              </div>
              {usePreset ? (
                <select
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all"
                >
                  {Object.keys(PRESETS).map((name) => (
                    <option key={name} value={name}>{name} ({PRESETS[name].length} assets)</option>
                  ))}
                </select>
              ) : (
                <textarea
                  value={customTickers}
                  onChange={(e) => setCustomTickers(e.target.value)}
                  placeholder="SPY, QQQ, TLT, GLD, ..."
                  className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all h-20 resize-none"
                />
              )}
            </div>

            <div className="space-y-4">
              <div className="text-[10px] font-bold text-gold uppercase tracking-[2px] mb-2">Parameters</div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Assets per Portfolio</label>
                <div className="flex bg-card p-1 border border-border rounded-xl">
                  {[2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setNAssets(n)}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${nAssets === n ? 'bg-gold/10 text-gold' : 'text-text-muted hover:text-white'}`}
                    >
                      {n} Assets
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Historical Lookback (Years)</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={historicalYears}
                  onChange={(e) => setHistoricalYears(Number(e.target.value))}
                  className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white font-black focus:outline-none focus:border-gold transition-all"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-[10px] font-bold text-gold uppercase tracking-[2px] mb-2">Settings</div>
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
              <div className="p-3 bg-card border border-border rounded-xl text-xs text-text-muted">
                <strong className="text-white">Tickers selected:</strong> {currentTickers.length}
                <div className="mt-1 text-[10px] truncate">{currentTickers.slice(0, 8).join(', ')}{currentTickers.length > 8 ? '...' : ''}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-[10px] font-bold text-gold uppercase tracking-[2px] mb-2">Action</div>
              <button
                onClick={runOptimizer}
                disabled={loading}
                className="w-full px-6 py-3 bg-gold hover:bg-gold-dark text-black font-black rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                {loading ? 'Computing...' : 'Run Optimizer'}
              </button>
              {error && <span className="text-red text-xs font-bold block">{error}</span>}
              {result && (
                <div className="p-3 bg-card border border-border rounded-xl text-xs text-text-muted">
                  <div className="text-white font-bold">{result.totalChecked.toLocaleString()}</div>
                  <div>combinations checked</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        {result && topResult && (
          <>
            {/* Top Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <StatCard label="Best Portfolio" value={topResult.symbols.join(' + ')} color="text-gold" index={0} />
              <StatCard label="Diversification Bonus" value={`+${topResult.diversificationBonus.toFixed(2)}`} sub="Nekrasov K* - max(f*ᵢ)" color="text-green" index={1} />
              <StatCard label="Nekrasov Kelly" value={topResult.nekrasovKelly.toFixed(2)} icon={<Zap className="w-5 h-5" />} color="text-purple-400" index={2} />
              <StatCard label="Portfolio Sharpe" value={topResult.portfolioSharpe.toFixed(2)} icon={<TrendingUp className="w-5 h-5" />} color="text-blue-400" index={3} />
            </div>

            {/* Winner Detail */}
            <div className="bg-secondary border border-border rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-gold" />
                Best Portfolio: {topResult.symbols.join(' + ')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Metrics</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-text-muted">Nekrasov K*</span><span className="text-white font-black">{topResult.nekrasovKelly.toFixed(3)}</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">Max Individual f*ᵢ</span><span className="text-white font-black">{topResult.maxIndividualKelly.toFixed(3)}</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">Diversification Bonus</span><span className="text-green font-black">+{topResult.diversificationBonus.toFixed(3)}</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">Ann. Return</span><span className="text-gold font-black">{topResult.portfolioAnnReturn.toFixed(1)}%</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">Ann. Vol</span><span className="text-yellow-400 font-black">{topResult.portfolioAnnVol.toFixed(1)}%</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">Sharpe</span><span className="text-blue-400 font-black">{topResult.portfolioSharpe.toFixed(2)}</span></div>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Diversifiers</div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-text-muted mb-1">Best Diversifier</div>
                      <div className="text-lg font-black text-green">{topResult.bestDiversifier}</div>
                      <div className="text-[10px] text-text-muted">Removing this asset reduces K* the most</div>
                    </div>
                    <div className="border-t border-border pt-3">
                      <div className="text-xs text-text-muted mb-1">Worst Diversifier</div>
                      <div className="text-lg font-black text-red">{topResult.worstDiversifier}</div>
                      <div className="text-[10px] text-text-muted">Portfolio benefits least from this asset</div>
                    </div>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-5 overflow-x-auto">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Correlation Matrix</div>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr>
                        <th className="p-1 text-text-muted"></th>
                        {topResult.symbols.map((s) => (
                          <th key={s} className="p-1 text-text-muted font-bold">{s}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topResult.correlationMatrix.map((row, i) => (
                        <tr key={i}>
                          <td className="p-1 text-white font-bold">{topResult.symbols[i]}</td>
                          {row.map((val, j) => (
                            <td key={j} className={`p-1 font-mono ${val > 0.8 ? 'text-red' : val > 0.5 ? 'text-yellow-400' : val > 0.2 ? 'text-gold' : 'text-green'}`}>
                              {val.toFixed(2)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Individual Kelly Table */}
            <div className="bg-secondary border border-border rounded-2xl p-6 overflow-x-auto">
              <h3 className="text-white font-bold mb-4">Individual Asset Kelly</h3>
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-card border-b border-border">
                    <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-[2px]">Symbol</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-[2px]">Individual Kelly f*ᵢ</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-[2px]">Ann. Return</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-[2px]">Ann. Vol</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-[2px]">Sharpe</th>
                  </tr>
                </thead>
                <tbody>
                  {result.individualKellys.sort((a, b) => b.kelly - a.kelly).map((k, i) => (
                    <tr key={k.symbol} className={`border-b border-border/50 ${i % 2 === 0 ? 'bg-secondary' : 'bg-card'}`}>
                      <td className="px-6 py-4 text-white font-bold">{k.symbol}</td>
                      <td className="px-6 py-4 font-mono font-black">
                        <span className={k.kelly > 2 ? 'text-red' : k.kelly > 1 ? 'text-yellow-400' : k.kelly > 0 ? 'text-green' : 'text-text-muted'}>
                          {k.kelly.toFixed(2)}x
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gold font-mono">{k.annReturn.toFixed(1)}%</td>
                      <td className="px-6 py-4 text-yellow-400 font-mono">{k.annVol.toFixed(1)}%</td>
                      <td className="px-6 py-4 text-blue-400 font-mono">{k.sharpe.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Full Rankings */}
            <div className="bg-secondary border border-border rounded-2xl p-6 overflow-x-auto">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-gold" />
                Portfolio Rankings by Diversification Bonus
              </h3>
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-card border-b border-border">
                    <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-[2px]">Rank</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-[2px]">Portfolio</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-[2px]">Nekrasov K*</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-[2px]">Max f*ᵢ</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-[2px]">Diversification Bonus</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-[2px]">Sharpe</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-[2px]">Best Div</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-text-muted uppercase tracking-[2px]">Worst Div</th>
                  </tr>
                </thead>
                <tbody>
                  {result.combinations.slice(0, 20).map((combo, i) => (
                    <tr key={i} className={`border-b border-border/50 ${i % 2 === 0 ? 'bg-secondary' : 'bg-card'} ${i === 0 ? 'bg-gold/5' : ''}`}>
                      <td className="px-4 py-3">
                        {i === 0 ? (
                          <span className="inline-flex items-center gap-1 text-gold font-black"><Zap className="w-3 h-3" /> 1</span>
                        ) : (
                          <span className="text-text-muted font-bold">{i + 1}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white font-bold">{combo.symbols.join(' + ')}</td>
                      <td className="px-4 py-3 text-white font-mono">{combo.nekrasovKelly.toFixed(2)}</td>
                      <td className="px-4 py-3 text-text-muted font-mono">{combo.maxIndividualKelly.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`font-black font-mono ${combo.diversificationBonus > 0 ? 'text-green' : 'text-red'}`}>
                          {combo.diversificationBonus > 0 ? '+' : ''}{combo.diversificationBonus.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-blue-400 font-mono">{combo.portfolioSharpe.toFixed(2)}</td>
                      <td className="px-4 py-3 text-green font-mono">{combo.bestDiversifier}</td>
                      <td className="px-4 py-3 text-red font-mono">{combo.worstDiversifier}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-text-muted">
                <strong className="text-white">Diversification Bonus explained:</strong> K* − max(f*ᵢ) represents the extra growth rate you gain from combining assets vs. picking only the best single asset. A positive bonus means the portfolio genuinely benefits from diversification. Based on Nekrasov (2014) multivariate Kelly.
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}


export default PortfolioOptimizer
