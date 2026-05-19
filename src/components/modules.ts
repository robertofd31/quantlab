import { LayoutDashboard, TrendingUp, Activity, Zap, BarChart3, PieChart, Compass, Gamepad2, BookOpen, Briefcase } from 'lucide-react';
import type { TabId } from '../App';

export const modules = [
  { id: 'monte-carlo' as TabId, label: 'Monte Carlo', icon: LayoutDashboard },
  { id: 'portfolio-simulator' as TabId, label: 'Portfolio Simulator', icon: PieChart },
  { id: 'portfolio-optimizer' as TabId, label: 'Portfolio Optimizer', icon: Compass },
  { id: 'kelly' as TabId, label: 'Kelly & Leverage', icon: Zap },
  { id: 'simulation-details' as TabId, label: 'Simulation Details', icon: BarChart3 },
  { id: 'volatility-regimes' as TabId, label: 'Volatility & Regimes', icon: Activity },
  { id: 'indicators-advanced' as TabId, label: 'Indicators Advanced', icon: TrendingUp },
  { id: 'kelly-game' as TabId, label: 'Kelly Game', icon: Gamepad2 },
  { id: 'about-models' as TabId, label: 'About Models', icon: BookOpen },
  { id: 'use-cases' as TabId, label: 'Use Cases', icon: Briefcase },
];
