import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  color?: string;
  index?: number;
}

export function StatCard({ label, value, sub, icon, color = 'text-white', index = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-card border border-border rounded-2xl p-7 hover:border-border-light transition-all group relative overflow-hidden"
    >
      {icon && (
        <div className={`w-12 h-12 rounded-xl bg-white/[0.03] border border-border flex items-center justify-center mb-6 ${color}`}>
          {icon}
        </div>
      )}
      <div className="text-text-muted text-[10px] uppercase tracking-widest font-bold mb-1">{label}</div>
      <div className="text-2xl font-black text-white">{value}</div>
      {sub && <div className="text-[10px] text-text-muted mt-1">{sub}</div>}
    </motion.div>
  );
}
