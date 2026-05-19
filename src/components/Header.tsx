import { useState } from 'react';
import { Menu, X, Home, BarChart2 } from 'lucide-react';
import { modules } from './modules';
import type { TabId } from '../App';

export function Header({ activeTab, setActiveTab }: { activeTab: TabId; setActiveTab: (t: TabId) => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const isKpis = activeTab === 'kpis';
  const isHome = !isKpis;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-[1440px] mx-auto px-6 h-[72px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-gold-light to-gold-dark rounded-xl flex items-center justify-center font-black text-black text-sm">
            QL
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-sm leading-tight">QuantLab</span>
            <span className="text-gold font-bold text-[10px] uppercase tracking-[2px] leading-tight">Advanced Analytics</span>
          </div>
        </div>

        {/* Top-level navigation: Home | KPIs */}
        <div className="hidden md:flex items-center gap-1 bg-secondary/50 rounded-xl p-1 border border-border">
          <button
            onClick={() => setActiveTab('monte-carlo')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              isHome ? 'bg-gold/10 text-gold border border-gold/20' : 'text-text-muted hover:text-white'
            }`}
          >
            <Home className="w-4 h-4" />
            Home
          </button>
          <button
            onClick={() => setActiveTab('kpis')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              isKpis ? 'bg-gold/10 text-gold border border-gold/20' : 'text-text-muted hover:text-white'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            KPIs
          </button>
        </div>

        <button
          className="md:hidden text-white p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-primary/95 backdrop-blur-xl border-t border-border px-6 py-4 space-y-2">
          {/* Top-level tabs */}
          <div className="flex gap-2 mb-4 pb-4 border-b border-border">
            <button
              onClick={() => { setActiveTab('monte-carlo'); setMobileOpen(false); }}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                isHome ? 'bg-gold/10 text-gold border border-gold/20' : 'text-text-muted'
              }`}
            >
              <Home className="w-4 h-4" />
              Home
            </button>
            <button
              onClick={() => { setActiveTab('kpis'); setMobileOpen(false); }}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                isKpis ? 'bg-gold/10 text-gold border border-gold/20' : 'text-text-muted'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              KPIs
            </button>
          </div>
          {/* Sub-modules (only show when on Home) */}
          {isHome && modules.map((m) => (
            <button
              key={m.id}
              onClick={() => { setActiveTab(m.id); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all group ${
                activeTab === m.id
                  ? 'bg-gold/10 text-gold border border-gold/20'
                  : 'text-text-muted hover:bg-white/5 hover:text-white'
              }`}
            >
              <m.icon className={`w-4 h-4 ${activeTab === m.id ? 'text-gold' : 'text-text-muted group-hover:text-white'}`} />
              {m.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
