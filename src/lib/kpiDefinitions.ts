export interface KpiDefinition {
  id: string;
  name: string;
  shortTitle: string;
  category: 'Leverage' | 'Risk' | 'Distribution' | 'Volatility';
  categoryColor: string;
  icon: string; // lucide icon name

  // Basic mode
  basicDescription: string;
  basicInterpretation: (values: Record<string, number | string>) => string;

  // Advanced mode
  advancedDescription: string;
  advancedFormula: string;
  advancedParameters: { name: string; value: string; description: string }[];

  // Educational notes
  notes: string;
  whyItMatters: string;
  howToUse: string;

  // Signals
  signalLabels: Record<string, { label: string; color: string }>;
}

export const kpiDefinitions: Record<string, KpiDefinition> = {
  'jensen-kelly': {
    id: 'jensen-kelly',
    name: "Jensen's Inequality + Kelly Leverage",
    shortTitle: 'JIKL',
    category: 'Leverage',
    categoryColor: '#f5a623',
    icon: 'Scale',

    basicDescription: 'Reveals how volatility drag erodes returns and calculates the scientifically optimal leverage using the Kelly Criterion.',
    basicInterpretation: (v) => {
      const kelly = Number(v.kellyFull);
      if (kelly > 3) return `Optimal Kelly: ${kelly.toFixed(2)}x — AGGRESSIVE leverage. Volatility drag is manageable.`;
      if (kelly > 1.5) return `Optimal Kelly: ${kelly.toFixed(2)}x — MODERATE leverage. Good sweet spot.`;
      if (kelly > 0.5) return `Optimal Kelly: ${kelly.toFixed(2)}x — CONSERVATIVE leverage. Little leverage advantage.`;
      return `Optimal Kelly: ${kelly.toFixed(2)}x — AVOID leverage. Volatility destroys more than it creates.`;
    },

    advancedDescription: 'Combines Jensen\'s Inequality (which explains why geometric return is always less than arithmetic return) with the Kelly Criterion to find the leverage that maximizes the logarithmic growth of capital.',
    advancedFormula: 'Kelly = (μ - r_f) / σ²\n\nr_geometric = L × r_arithmetic - (L² × σ²) / 2\n\nL_max = 2 × r_arithmetic / σ²',
    advancedParameters: [
      { name: 'Lookback', value: '756 bars (3 years)', description: 'Period for calculating returns and volatility' },
      { name: 'Log Returns', value: 'Yes', description: 'Uses log-returns for exact geometric compounding' },
      { name: 'Risk-Free Rate', value: 'Auto (T-Bill) or Manual', description: 'Risk-free rate for excess return calculation' },
    ],

    notes: "Jensen's Inequality states that for concave functions (like logarithms), E[log(1+R)] ≤ log(1+E[R]). This means your realized geometric return is ALWAYS less than your arithmetic average return. This gap is called 'volatility drag'.",
    whyItMatters: 'Most investors assume that 2x leverage = 2x return. Reality: drag grows QUADRATICALLY (L²). Doubling leverage quadruples the drag. This indicator shows exactly where leverage stops being profitable.',
    howToUse: 'Look at Optimal Kelly. If it is >3x, the asset can handle leverage. If it is <1x, DO NOT leverage. Use Half Kelly (½ Kelly) for conservative position sizing.',

    signalLabels: {
      buy: { label: 'OPTIMAL', color: '#22c55e' },
      neutral: { label: 'MODERATE', color: '#f5a623' },
      aggressive: { label: 'AGGRESSIVE', color: '#00d4ff' },
      defensive: { label: 'AVOID', color: '#ef4444' },
    },
  },

  'omega-ratio': {
    id: 'omega-ratio',
    name: 'Omega Ratio Analysis',
    shortTitle: 'Omega',
    category: 'Distribution',
    categoryColor: '#00d4aa',
    icon: 'GitBranch',

    basicDescription: 'Measures how much you gain above your target versus how much you lose below it. Superior to Sharpe for asymmetric returns.',
    basicInterpretation: (v) => {
      const omega = Number(v.currentOmega);
      if (omega > 1.5) return `Omega: ${omega.toFixed(2)} — EXCELLENT. You gain $1.50 for every $1 you lose vs your target.`;
      if (omega > 1.0) return `Omega: ${omega.toFixed(2)} — GOOD. You gain more than you lose. Meeting your target.`;
      if (omega > 0.7) return `Omega: ${omega.toFixed(2)} — CAUTION. You lose more than you gain. Review your strategy.`;
      return `Omega: ${omega.toFixed(2)} — POOR. Losses dominate. Consider reducing exposure.`;
    },

    advancedDescription: 'The Omega Ratio, introduced by Keating and Shadwick in 2002, captures the complete return distribution (not just volatility like Sharpe). Ideal for fat-tailed assets: crypto, leveraged ETFs, and any asset with asymmetric returns.',
    advancedFormula: 'Ω(MAR) = Σ(max(0, r_i - MAR)) / Σ(max(0, MAR - r_i))\n\nWhere MAR = Minimum Acceptable Return (your return target threshold)',
    advancedParameters: [
      { name: 'Lookback', value: '252 bars (1 year)', description: 'Rolling window for calculation' },
      { name: 'MAR Type', value: 'Fixed or Risk-Free', description: 'Minimum acceptable return threshold' },
      { name: 'Smoothing', value: '5 bars', description: 'SMA to reduce noise' },
    ],

    notes: 'Sharpe assumes normally distributed returns (ignores fat tails). Omega captures the COMPLETE distribution. Quant funds prefer Omega because it answers: "How much do I gain ABOVE my threshold vs how much do I lose BELOW it?"',
    whyItMatters: 'Sharpe can be misleading with fat-tailed assets. An asset with Sharpe 1.0 but Omega 0.5 has positive average returns but frequent extreme negative events. Omega reveals the true shape of the distribution.',
    howToUse: 'Compare two assets (e.g., SPY vs TQQQ). If the leveraged one has a gentler Omega curve slope, it captures more explosive upside. Curve crossover = MAR threshold where one asset surpasses the other.',

    signalLabels: {
      buy: { label: 'EXCELLENT', color: '#089981' },
      neutral: { label: 'GOOD', color: '#26a69a' },
      caution: { label: 'CAUTION', color: '#ff9800' },
      sell: { label: 'POOR', color: '#f23645' },
    },
  },

  'var-vag': {
    id: 'var-vag',
    name: 'Multi-Leverage VAR/VaG',
    shortTitle: 'VAR/VaG',
    category: 'Risk',
    categoryColor: '#ef4444',
    icon: 'ShieldAlert',

    basicDescription: 'Calculates downside risk (VAR) and upside potential (VaG) for different leverage levels with simulated daily rebalancing.',
    basicInterpretation: (v) => {
      const ratio3x = Number(v.ratio3x);
      if (ratio3x > 6) return `3x Ratio: ${ratio3x.toFixed(2)} — LEVERAGE-FRIENDLY regime. Risk is manageable.`;
      if (ratio3x > 3) return `3x Ratio: ${ratio3x.toFixed(2)} — ACCEPTABLE leverage. Monitor volatility.`;
      if (ratio3x > 1) return `3x Ratio: ${ratio3x.toFixed(2)} — CAUTION. Leverage may be destructive.`;
      return `3x Ratio: ${ratio3x.toFixed(2)} — AVOID leverage. Excessive risk vs reward.`;
    },

    advancedDescription: 'Simulates real leveraged ETF behavior with daily rebalancing. Unlike parametric VaR (assumes normal distribution), it uses historical simulation: applies leverage to each daily return, compounds over the holding period, and caps losses at -100%.',
    advancedFormula: 'VAR = Lower percentile (100 - confidence)% of compounded returns\nVaG = Upper percentile (confidence)% of compounded returns\nRatio = VaG / |VAR|\n\nCompounded = Π(1 + min(L × r_i, -1))',
    advancedParameters: [
      { name: 'Lookback', value: '252 days', description: 'Historical data for simulation' },
      { name: 'Holding Period', value: '21 days', description: 'Holding period (1 month)' },
      { name: 'Confidence', value: '95%', description: 'Confidence level for percentiles' },
      { name: 'Leverage', value: '1x, 2x, 3x', description: 'Leverage levels to compare' },
    ],

    notes: 'Linear risk calculation (2x = 2x risk) is FALSE for leveraged ETFs. Due to daily rebalancing and volatility, a 3x ETF can lose MORE than 3x in volatile bear markets or LESS in trending bull markets.',
    whyItMatters: 'Most traders use the same leverage in ALL market conditions. This indicator quantifies leverage efficiency: when the leveraged VaG/|VAR| ratio is GREATER than the 1x ratio, leverage is favorable.',
    howToUse: 'Monitor the ratio. If 3x ratio > 1x ratio → market favors leverage. If 3x ratio drops below 1.0 → reduce leverage URGENTLY.',

    signalLabels: {
      buy: { label: 'FAVORABLE', color: '#22c55e' },
      neutral: { label: 'ACCEPTABLE', color: '#f5a623' },
      caution: { label: 'RISKY', color: '#ff9800' },
      sell: { label: 'HOSTILE', color: '#ef4444' },
    },
  },

  'kelly-curve': {
    id: 'kelly-curve',
    name: 'Kelly Criterion Curve',
    shortTitle: 'Kelly Curve',
    category: 'Leverage',
    categoryColor: '#a855f7',
    icon: 'TrendingUp',

    basicDescription: 'Shows the leverage/return tradeoff as a bell curve. Identifies your optimal leverage and which risk zone you are in.',
    basicInterpretation: (v) => {
      const kelly = Number(v.optimalKelly);
      const regime = String(v.regime);
      if (kelly > 3) return `Optimal Kelly: ${kelly.toFixed(2)}x — Regime: ${regime}. Large margin for leverage.`;
      if (kelly > 1.5) return `Optimal Kelly: ${kelly.toFixed(2)}x — Regime: ${regime}. Moderate leverage is optimal.`;
      if (kelly > 0.5) return `Optimal Kelly: ${kelly.toFixed(2)}x — Regime: ${regime}. Little leverage benefit.`;
      return `Optimal Kelly: ${kelly.toFixed(2)}x — Regime: ${regime}. DO NOT leverage. Excessive drag.`;
    },

    advancedDescription: 'The Kelly Curve shows the growth function g(f) = μ·f - 0.5·σ²·f². It is a parabola peaking at Optimal Kelly. It divides the leverage spectrum into 5 colored risk zones.',
    advancedFormula: 'g(f) = μ·f - 0.5·σ²·f²\n\nf* = μ / σ² (Optimal Kelly)\n\nZones:\n• Underinvesting (f < f*/3)\n• Optimal Sizing (f*/3 < f < 2f*/3)\n• High Risk (2f*/3 < f < f*)\n• Never Logical (f* < f < f_zero)\n• Suicidal (f > f_zero)',
    advancedParameters: [
      { name: 'Lookback', value: '252 bars (1 year)', description: 'Historical window' },
      { name: 'Annual Days', value: '252', description: 'Trading days for annualization' },
      { name: 'Log Returns', value: 'Yes', description: 'More precise for compounding' },
      { name: 'Max Display', value: '5x', description: 'X-axis range' },
    ],

    notes: 'Developed by John L. Kelly Jr. in 1956 for information theory, later adapted by Edward O. Thorp for card counting and investing. The curve shows why maximum growth is NOT simply return × leverage: volatility destroys compounding.',
    whyItMatters: 'Full Kelly maximizes long-term logarithmic growth but with severe drawdowns. Most professionals use ¼ to ½ Kelly. This curve visually shows where you are on the risk spectrum.',
    howToUse: 'Find your current leverage on the curve. If it falls in "High Risk" or worse, reduce position. If in "Underinvesting" and you have risk tolerance, consider increasing. Use ½ Kelly for conservative sizing.',

    signalLabels: {
      buy: { label: 'OPTIMAL', color: '#22c55e' },
      neutral: { label: 'MODERATE', color: '#f5a623' },
      aggressive: { label: 'AGGRESSIVE', color: '#00d4ff' },
      defensive: { label: 'AVOID', color: '#ef4444' },
    },
  },

  'vmkl': {
    id: 'vmkl',
    name: 'Volatility Managed Kelly Leverage',
    shortTitle: 'VMKL',
    category: 'Volatility',
    categoryColor: '#3b82f6',
    icon: 'Activity',

    basicDescription: 'Dynamically adjusts leverage based on forecasted market volatility using EWMA and Kelly Criterion. Reduces risk during high volatility, increases exposure when markets are calm.',
    basicInterpretation: (v) => {
      const lev = Number(v.optimalLeverage);
      const regime = String(v.regime);
      if (lev >= 4) return `Leverage: ${lev.toFixed(2)}x — ${regime}. Maximum exposure, calm market.`;
      if (lev >= 2.5) return `Leverage: ${lev.toFixed(2)}x — ${regime}. High exposure, favorable conditions.`;
      if (lev >= 1.5) return `Leverage: ${lev.toFixed(2)}x — ${regime}. Moderate growth.`;
      if (lev >= 0.75) return `Leverage: ${lev.toFixed(2)}x — ${regime}. Balanced, prudent management.`;
      if (lev >= 0.25) return `Leverage: ${lev.toFixed(2)}x — ${regime}. Defensive, high volatility.`;
      return `Leverage: ${lev.toFixed(2)}x — ${regime}. Minimum exposure, capital protection.`;
    },

    advancedDescription: 'Implements the OVPMS (Optimal Volatility Plus Mean Strategy) from Tony Cooper (2010). Uses EWMA to forecast volatility and dynamically adjusts Kelly leverage. Generates alpha by reducing volatility-of-volatility (vo-vo), kurtosis, and maximum drawdown.',
    advancedFormula: 'σ²(t) = λ·σ²(t-1) + (1-λ)·r²(t-1)  (EWMA)\n\nE[R] = a × σ^(b+1)  (Return prediction)\n\nL = (E[R] / σ²) × KellyFraction × Caps  (Optimal leverage)',
    advancedParameters: [
      { name: 'EWMA Lambda', value: '0.94', description: '11-day half-life. Optimal balance between reactivity and smoothing.' },
      { name: 'Power Exponent (b)', value: '-1.76', description: 'Return-volatility relationship. SPY: -1.76, QQQ: -1.71.' },
      { name: 'Power Coefficient (a)', value: '0.10', description: 'Baseline return in normal conditions.' },
      { name: 'Kelly Fraction', value: '75%', description: 'Three-quarter Kelly for risk management.' },
      { name: 'Max Leverage', value: '3.0x', description: 'Hard cap on leverage.' },
      { name: 'Vol Floor', value: '10%', description: 'Prevents extreme leverage in low volatility.' },
    ],

    notes: 'Based on "Alpha Generation and Risk Smoothing using Managed Volatility" (Cooper, 2010). Tested on 125+ years of data across multiple global indices. OVPMS returned 12.6% annual vs 7.0% buy-and-hold, with the SAME volatility as the underlying index.',
    whyItMatters: 'Volatility of volatility (vo-vo) is costly. By targeting consistent volatility through dynamic leverage: reduces volatility drag, reduces drawdowns automatically, reduces kurtosis, and generates alpha by exploiting the return-volatility relationship.',
    howToUse: 'When VMKL > 2x → calm market, consider increasing exposure. When VMKL < 1x → volatile market, reduce positions. Monitor regime: CRASH = protection activated.',

    signalLabels: {
      aggressive: { label: 'VERY AGGRESSIVE', color: '#00ff00' },
      buy: { label: 'AGGRESSIVE', color: '#00d4ff' },
      neutral: { label: 'GROWTH', color: '#f5a623' },
      defensive: { label: 'DEFENSIVE', color: '#ff9800' },
    },
  },
};
