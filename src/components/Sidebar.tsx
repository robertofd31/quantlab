import { modules } from './modules';
import type { TabId } from '../App';

export function Sidebar({ activeTab, setActiveTab }: { activeTab: TabId; setActiveTab: (t: TabId) => void }) {
  // Don't show sidebar on KPIs page
  if (activeTab === 'kpis') return null;

  return (
    <aside className="hidden md:flex w-64 bg-secondary border-r border-border p-6 flex-col gap-2 flex-shrink-0 sticky top-[72px] h-[calc(100vh-72px)] overflow-y-auto">
      <div className="text-[10px] font-bold text-gold uppercase tracking-[2px] mb-4 px-2 opacity-80">Modules</div>
      {modules.map((m) => (
        <button
          key={m.id}
          onClick={() => setActiveTab(m.id)}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all group ${
            activeTab === m.id
              ? 'bg-gold/10 text-gold border border-gold/20'
              : 'text-text-muted hover:bg-white/5 hover:text-white'
          }`}
        >
          <m.icon className={`w-4 h-4 ${activeTab === m.id ? 'text-gold' : 'text-text-muted group-hover:text-white'}`} />
          {m.label}
        </button>
      ))}

      <div className="mt-auto pt-6 border-t border-border">
        <div className="text-[10px] font-bold text-text-muted uppercase tracking-[2px] mb-2 px-2">Data Source</div>
        <div className="flex items-center gap-2 text-[10px] font-black text-green bg-green/10 px-3 py-2 rounded-xl border border-green/20">
          <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
          Local Cache (Yahoo)
        </div>
      </div>
    </aside>
  );
}
