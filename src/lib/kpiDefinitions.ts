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

  // Extended advanced content
  extendedContent: {
    theory: string;
    mathDerivation: string;
    pineScriptCode: string;
    references: string[];
    practicalExamples: string;
    settingsGuide: { name: string; value: string; explanation: string }[];
    alerts: { condition: string; message: string }[];
  };

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

    extendedContent: {
      theory: `Jensen's Inequality is a theorem stating that for concave functions (like logarithms or sad face), the expected value of the function is less than the function of the expected value: E[log(1+R)] ≤ log(1+E[R]). What this means for investors is that your realized geometric return (what you actually earn through compounding) is always less than your arithmetic average return. This gap is called volatility drag. The drag formula: Drag = L² × σ² / 2. The quadratic term (L²) is crucial because if you double your leverage, you quadruple your drag.`,
      mathDerivation: `Geometric return formula: r_geometric = L × r_arithmetic - (L² × σ²) / 2. This shows the tug-of-war between leverage amplification (L × r_arithmetic) and drag (L² × σ²/2). Maximum survivable leverage: L_max = 2 × r_arithmetic / σ². At this point, drag completely cancels out returns (geometric return = 0). Beyond this, you're guaranteed to lose money over time.`,
      pineScriptCode: `//@version=6\nindicator("Jensen's Inequality + Kelly Leverage", shorttitle="JIKL", overlay=false)\n\nlookback_period = input.int(756, "Lookback Period", minval=50, maxval=1500)\nuse_log_returns = input.bool(true, "Use Log Returns")\nuse_ticker_rf = input.bool(true, "Use T-Bill Ticker")\nrf_ticker = input.symbol("FRED:DGS3MO", "Risk-Free Rate Ticker")\nmanual_rf = input.float(4.0, "Manual Risk-Free Rate (%)", minval=0, maxval=20, step=0.25)\n\n// Calculate returns and volatility\nret = use_log_returns ? math.log(close / close[1]) : (close - close[1]) / close[1]\narith_ret = ta.sma(ret, lookback_period) * 252\nvol = ta.stdev(ret, lookback_period) * math.sqrt(252)\n\n// Risk-free rate\nrf_rate_raw = use_ticker_rf ? request.security(rf_ticker, "D", close) : manual_rf\nrf_rate = na(rf_rate_raw) ? manual_rf : rf_rate_raw / 100\n\n// Kelly Criterion\nkelly_full = (arith_ret - rf_rate) / math.pow(vol, 2)\nkelly_full := math.max(0, math.min(kelly_full, 10))\n\n// Geometric returns at key levels\ngeo(leverage) => leverage * arith_ret - math.pow(leverage, 2) * math.pow(vol, 2) / 2\n\n// Plot\nplot(geo(1.0), "1.0x Geo Return", color=color.green)\nplot(geo(2.0), "2.0x Geo Return", color=color.orange)\nplot(geo(kelly_full), "Kelly Optimal", color=color.blue, style=plot.style_circles)\nhline(0, "Zero", color=color.white)`,
      references: [
        'Kelly, J.L. (1956). "A New Interpretation of Information Rate." Bell System Technical Journal.',
        'Thorp, E.O. (2006). "The Kelly Criterion in Blackjack, Sports Betting, and the Stock Market." Handbook of Asset and Liability Management.',
        'Maginn, J.L. et al. (2007). "Managing Investment Portfolios: A Dynamic Process." CFA Institute.',
      ],
      practicalExamples: `Low volatility assets: Higher Kelly → can handle more leverage safely. High volatility assets (crypto for example): Lower Kelly → even 2x can be destructive. Current market regime matters: The indicator adapts to changing volatility conditions. Fractional Kelly is wisdom: Full Kelly assumes perfect parameter estimates (which we never have).`,
      settingsGuide: [
        { name: 'Lookback Period', value: '756', explanation: 'Period for calculating returns and volatility (756 = 3 years, optimal for long-term investing)' },
        { name: 'Log Returns', value: 'true', explanation: 'Log returns are more accurate for geometric compounding' },
        { name: 'Risk-Free Rate', value: 'FRED:DGS3MO', explanation: '3-month Treasury Bill rate. Can use manual override.' },
      ],
      alerts: [
        { condition: 'Kelly Below 1x', message: 'High volatility relative to returns — avoid leverage' },
        { condition: 'Kelly Above 5x', message: 'Very high risk-adjusted opportunity — but use fractional Kelly' },
        { condition: '2x Leverage Negative', message: 'Drag exceeds returns — leverage is destructive' },
      ],
    },

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

    extendedContent: {
      theory: `The Omega ratio was introduced by Keating and Shadwick in 2002 as a superior alternative to the Sharpe ratio. Sharpe assumes normally distributed returns (ignores fat tails and might be unrealistic sometimes), Omega captures the entire return distribution. This makes it ideal for analyzing crypto, leveraged ETFs, and any assets with asymmetric returns or fat tails.`,
      mathDerivation: `Omega ratio is defined as: Ω(MAR) = (Sum of returns above MAR) / (Sum of returns below MAR) Where MAR (Minimum Acceptable Return) is your return threshold. The indicator calculates this using log returns for better statistical properties: Log returns: ln(price / previous price). For time series mode: Loops through lookback period, summing gains above threshold and losses below threshold. For curve mode: Calculates Omega at multiple MAR levels (from 0% to max) to reveal distribution shape. Values above 1.0 indicate gains exceed losses. For example, Ω = 1.5 means $1.50 in gains for every $1.00 in losses relative to your target.`,
      pineScriptCode: `//@version=6\nindicator("Omega Ratio Analysis", shorttitle="Ω", overlay=false)\n\nlookback = input.int(252, "Lookback Period", minval=20, maxval=1000)\nannualThreshold = input.float(10.0, "Annual Target Return (%)", step=0.5)\nsmoothing = input.int(5, "Smoothing Period", minval=1, maxval=50)\n\n// Calculate returns\nreturns = math.log(close / close[1])\ndailyThreshold = math.log(1 + annualThreshold / 100) / 252\n\n// Calculate Omega\nvar float totalGains = 0.0\nvar float totalLosses = 0.0\n\nfor i = 0 to lookback - 1\n    ret = returns[i]\n    if not na(ret)\n        if ret > dailyThreshold\n            totalGains += ret - dailyThreshold\n        else\n            totalLosses += math.abs(ret - dailyThreshold)\n\nrawOmega = totalLosses > 0 ? totalGains / totalLosses : na\nomega = ta.sma(rawOmega, smoothing)\n\n// Plot\nplot(omega, "Omega Ratio", color=omega > 1.5 ? color.green : omega > 1.0 ? color.teal : omega > 0.7 ? color.orange : color.red, linewidth=2)\nhline(1.0, "Breakeven", color=color.gray)\nhline(1.5, "Excellent", color=color.new(color.green, 70), linestyle=hline.style_dashed)`,
      references: [
        'Keating, C. & Shadwick, W.F. (2002). "A Universal Performance Measure." The Journal of Performance Measurement.',
        'Kazemi, H. et al. (2004). "Alternative Investments: CTAs and the Omega Ratio." Journal of Alternative Investments.',
      ],
      practicalExamples: `For Long-Term Investors: Use 252-bar lookback on daily charts (1 year). Set annual target around 10% (historical market average). If Omega stays above 1.0, you're beating your goal. For Comparing Assets: Plot two assets (like SPY vs TQQQ). If the leveraged version has a gentler curve slope, it captures more explosive upside days. For Regime Detection: Use shorter periods (60-90 bars) for curve calculation. When curves become steeper, returns are normalizing and momentum may be fading.`,
      settingsGuide: [
        { name: 'Lookback Period', value: '252', explanation: 'Number of bars for calculation. 252 = 1 year (recommended for long-term daily investing)' },
        { name: 'Annual Target Return', value: '10%', explanation: 'Your minimum acceptable annual return (e.g., 10% = historical S&P 500 long-term average)' },
        { name: 'Smoothing Period', value: '5', explanation: 'Smooth the Omega ratio to reduce noise' },
        { name: 'MAR Increments', value: '50', explanation: 'Curve smoothness/resolution. Higher = smoother curve (50 recommended).' },
      ],
      alerts: [
        { condition: 'Omega Bullish', message: 'Omega ratio crossed above 1.0 — Performance improving' },
        { condition: 'Omega Bearish', message: 'Omega ratio crossed below 1.0 — Performance deteriorating' },
        { condition: 'Omega Excellent', message: 'Omega ratio reached excellent level (>1.5)' },
        { condition: 'Omega Poor', message: 'Omega ratio reached poor level (<0.7)' },
      ],
    },

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

    extendedContent: {
      theory: `Standard VaR calculations assume linear scaling (2x leverage = 2x risk), which is wrong for leveraged ETFs. Also, most VaR indicators show risk without comparing it to potential reward. This indicator tells you how to quantify whether current market conditions are friendly or hostile to leveraged positions. It calculates both downside risk (VaR), upside potential (VaG), and their relationship across different leverage levels.`,
      mathDerivation: `Historical simulation with daily rebalancing: Unlike parametric VaR (assumes normal distribution) or Monte Carlo (generates synthetic scenarios), this uses historical simulation — what actually happened in the past. Calculate daily returns from closing prices. Simulate leveraged ETF behavior with daily rebalancing: apply leverage to each daily return, compound over the holding period, and cap losses at -100% (ETFs can't go negative). Create a distribution by sliding the holding period window across the lookback period (252-day lookback with 21-day holding = 232 scenarios). Sort all outcomes and extract percentiles: VaR = lower tail (e.g., 5th percentile at 95% confidence), VaG = upper tail (e.g., 95th percentile). Calculate efficiency ratio: VaG / |VaR|. This tells you: for every dollar of downside risk, how many dollars of upside potential do you get?`,
      pineScriptCode: `//@version=6\nindicator("VAR Leverage Indicator (Multi-Period)", overlay=false, precision=2)\n\nlookback_period = input.int(252, "Lookback Period", minval=50, maxval=5000)\nholding_period = input.int(21, "Holding Period (days)", minval=1, maxval=1000)\nconfidence_level = input.float(95.0, "Confidence Level (%)", minval=1.0, maxval=100.0, step=0.1)\nleverage1 = input.float(1.0, "Leverage Level 1", minval=0.1, maxval=100.0, step=0.1)\nleverage2 = input.float(2.0, "Leverage Level 2", minval=0.1, maxval=100.0, step=0.1)\nleverage3 = input.float(3.0, "Leverage Level 3", minval=0.1, maxval=100.0, step=0.1)\n\n// Calculate returns\nreturns = (close - close[1]) / close[1]\n\n// Calculate VaR and VaG\ncalculate_var_vag(lev) =>\n    var float[] return_array = array.new_float(0)\n    array.clear(return_array)\n    num_windows = lookback_period - holding_period + 1\n    for start = 1 to num_windows\n        compounded = 1.0\n        for day = 0 to holding_period - 1\n            idx = start + day\n            if not na(returns[idx])\n                leveraged_return = lev * returns[idx]\n                capped = math.max(leveraged_return, -1.0)\n                compounded *= (1 + capped)\n                if compounded <= 0\n                    compounded := 0\n                    break\n        total_return = (compounded - 1) * 100\n        array.push(return_array, total_return)\n    array.sort(return_array, order.ascending)\n    var_idx = math.floor(array.size(return_array) * (100 - confidence_level) / 100)\n    vag_idx = math.floor(array.size(return_array) * confidence_level / 100)\n    var_val = array.get(return_array, var_idx)\n    vag_val = array.get(return_array, vag_idx)\n    [var_val, vag_val]\n\n[var1, vag1] = calculate_var_vag(leverage1)\n[var2, vag2] = calculate_var_vag(leverage2)\n[var3, vag3] = calculate_var_vag(leverage3)\n\n// Plot\nplot(var1, "VaR 1x", color=color.green, linewidth=2)\nplot(var2, "VaR 2x", color=color.orange, linewidth=2)\nplot(var3, "VaR 3x", color=color.red, linewidth=2)\nhline(0, "Zero", color=color.gray, linestyle=hline.style_dashed)`,
      references: [
        'Jorion, P. (2006). "Value at Risk: The New Benchmark for Managing Financial Risk." McGraw-Hill.',
        'Hull, J.C. (2018). "Risk Management and Financial Institutions." Wiley Finance.',
      ],
      practicalExamples: `Determine optimal leverage level for current market conditions. Identify when to scale up or reduce leveraged positions based on regime changes. Calculate dollar risk on any account size for proper position sizing. Understand true risk of leveraged ETFs beyond the "3x" label. Detect transitions between leverage-friendly and leverage-hostile regimes.`,
      settingsGuide: [
        { name: 'Lookback Period', value: '252', explanation: 'Longer = more data but slower to adapt; Shorter = more responsive but less reliable' },
        { name: 'Holding Period', value: '21 days', explanation: 'Match to your timeframe: 5-10 days (day traders), 21-42 days (swing traders), 63-126 days (position traders)' },
        { name: 'Confidence Level', value: '95%', explanation: '90% for typical outcomes, 95% for balanced view, 99% for extreme tail risk' },
        { name: 'Leverage Levels', value: '1x, 2x, 3x', explanation: 'Customize to your trading, supports decimals like 1.5x' },
      ],
      alerts: [
        { condition: 'VaR Threshold Breached', message: 'VaR for max leverage exceeded threshold — reduce exposure' },
        { condition: 'Gain/Loss Ratio Deteriorated', message: 'VaG/VaR ratio dropped below threshold — leverage efficiency declining' },
      ],
    },

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

    extendedContent: {
      theory: `The Kelly Criterion Curve indicator gives you the leverage/return tradeoff by displaying a bell curve with growth and leverage. This indicator shows where you are on the risk curve depending on your allocation/leverage used and the optimal leverage to use in any asset. The curve peaks at the Optimal Kelly leverage (full Kelly) and then declines, showing that: Too little leverage = underutilized capital. Too much leverage = volatility drag destroys returns.`,
      mathDerivation: `Kelly growth function: g(f) = μ·f - 0.5·σ²·f² Where: g(f) = Expected growth rate at leverage f, μ = Annualized return, σ = Annualized volatility, f = Leverage multiplier. The curve peaks at the Optimal Kelly leverage (full Kelly) and then declines. The curve is dynamically divided into zones based on your asset's return profile: Underinvesting (Green) - Too conservative, underutilized capital. Optimal Sizing (Teal) - Sweet spot for position sizing. High Risk (Yellow) - Diminishing returns, high volatility drag. Never Logical (Red) - Risk outweighs reward. Suicidal (Black) - Negative expected returns.`,
      pineScriptCode: `//@version=6\nindicator("Kelly Criterion Curve", shorttitle="Kelly", overlay=false)\n\nlookback = input.int(252, "Lookback Period", minval=1, maxval=10000)\nannual_trading_days = input.int(252, "Annual Trading Days", minval=200, maxval=365)\nuse_log_returns = input.bool(true, "Use Log Returns")\ncurveIncrements = input.int(100, "Curve Smoothness", minval=20, maxval=200, step=10)\nmaxLeverage = input.float(5.0, "Maximum Leverage Display", minval=2.0, maxval=10.0, step=0.5)\n\n// Calculate returns\nreturns = use_log_returns ? math.log(close / nz(close[1], close)) : (close - nz(close[1], close)) / nz(close[1], close)\n\n// Calculate mean and volatility\nmean_return = ta.sma(returns, lookback)\nvolatility = ta.stdev(returns, lookback)\n\n// Annualize\nannualized_return = mean_return * annual_trading_days\nannualized_volatility = volatility * math.sqrt(annual_trading_days)\n\n// Optimal Kelly\noptimal_kelly = annualized_return / math.pow(annualized_volatility, 2)\nhalf_kelly = optimal_kelly * 0.5\n\n// Growth function\nkellyGrowth(leverage) =>\n    annualized_return * leverage - 0.5 * math.pow(annualized_volatility, 2) * math.pow(leverage, 2)\n\n// Plot curve\nfor i = 0 to curveIncrements\n    lev = maxLeverage * i / curveIncrements\n    growth = kellyGrowth(lev)\n    // Zones colored based on risk\n    // (simplified - full implementation uses box drawings)\n\n// Plot markers\nplot(optimal_kelly > 0 and optimal_kelly <= maxLeverage ? kellyGrowth(optimal_kelly) : na, "Optimal Kelly", color=color.blue, style=plot.style_circles, linewidth=3)\nplot(half_kelly > 0 and half_kelly <= maxLeverage ? kellyGrowth(half_kelly) : na, "Half Kelly", color=color.yellow, style=plot.style_circles, linewidth=3)\n\nhline(0.0, "Zero Growth", color=color.gray)\n\n// Info table\nif barstate.islast\n    var table infoTable = table.new(position.top_right, 2, 7, bgcolor=color.black)\n    table.cell(infoTable, 0, 0, "Symbol", text_color=color.white)\n    table.cell(infoTable, 1, 0, syminfo.ticker, text_color=color.white)\n    table.cell(infoTable, 0, 1, "Ann. Return", text_color=color.white)\n    table.cell(infoTable, 1, 1, str.tostring(annualized_return * 100, "#.##") + "%", text_color=annualized_return >= 0 ? color.green : color.red)\n    table.cell(infoTable, 0, 2, "Ann. Vol", text_color=color.white)\n    table.cell(infoTable, 1, 2, str.tostring(annualized_volatility * 100, "#.##") + "%", text_color=color.white)\n    table.cell(infoTable, 0, 3, "Optimal Kelly", text_color=color.white)\n    table.cell(infoTable, 1, 3, str.tostring(optimal_kelly, "#.##") + "x", text_color=color.blue)\n    table.cell(infoTable, 0, 4, "Half Kelly", text_color=color.white)\n    table.cell(infoTable, 1, 4, str.tostring(half_kelly, "#.##") + "x", text_color=color.yellow)`,
      references: [
        'Kelly, J.L. (1956). "A New Interpretation of Information Rate." Bell System Technical Journal.',
        'Thorp, E.O. (2006). "The Kelly Criterion in Blackjack, Sports Betting, and the Stock Market." Handbook of Asset and Liability Management.',
        'Poundstone, W. (2005). "Fortune\'s Formula: The Untold Story of the Scientific Betting System That Beat the Casinos and Wall Street." Hill and Wang.',
      ],
      practicalExamples: `Russell 2000, last 500 days: Kelly optimal ~1.7x, full Kelly ~3.4x. While Russell 2000 returned 16%, full Kelly would have returned 27.8%, and more than full Kelly (3.4x leverage) would lower the returns. Berkshire Hathaway, last 1000 days: BRK stock optimal Kelly (full Kelly) is 2.5x. To reduce volatility, one could use 1/2 Kelly which is 1.25x leverage. Bitcoin, last 2000 trading days: The indicator tells us not to leverage Bitcoin. Even a 2x leverage can lead to ruin given its volatility.`,
      settingsGuide: [
        { name: 'Lookback Period', value: '252', explanation: 'Historical data window for calculations (252 = 1 year)' },
        { name: 'Annual Trading Days', value: '252', explanation: 'For annualization (default: 252)' },
        { name: 'Log Returns', value: 'true', explanation: 'More accurate for compounding (recommended: ON)' },
        { name: 'Curve Smoothness', value: '100', explanation: 'Number of points on curve (default: 100)' },
        { name: 'Max Leverage Display', value: '5x', explanation: 'X-axis range' },
      ],
      alerts: [
        { condition: 'Leverage in High Risk Zone', message: 'Current leverage exceeds optimal sizing — consider reducing' },
        { condition: 'Leverage in Never Logical Zone', message: 'Risk outweighs reward — reduce position immediately' },
      ],
    },

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

    extendedContent: {
      theory: `The Volatility Managed Kelly Leverage (VMKL) indicator is a tool that dynamically adjusts position sizing based on forecasted market volatility. It helps you to optimize leverage exposure by systematically reducing risk during high volatility periods and increasing exposure when markets are calm. VMKL adapts in real-time to changing market conditions, potentially generating alpha while smoothing volatility and reducing maximum drawdown. This indicator implements the Optimal Volatility Plus Mean Strategy (OVPMS) from the paper: "Alpha Generation and Risk Smoothing using Managed Volatility" by Tony Cooper (2010).`,
      mathDerivation: `Volatility Forecasting: Uses Exponential Weighted Moving Average (EWMA): σ²(t) = λ·σ²(t-1) + (1-λ)·r²(t-1). This predicts next-day volatility from recent price movements. Return Prediction: Expected Return = a × σ^(b+1) Where: a = Power coefficient (baseline return, default: 0.10), b = Power exponent (return-volatility relationship, default: -1.76 for SPY), σ = Forecasted volatility. The negative exponent means returns decrease as volatility increases — a well-documented market behaviour. Optimal Leverage Calculation: Full Kelly Leverage = μ / σ². Actual Leverage = Full Kelly × Kelly Fraction × Caps × Smoothing. The Kelly Criterion provides the theoretically optimal leverage, which is then reduced via: Kelly Fraction (safety margin, default 75% = three-quarter Kelly), Leverage Caps (hard maximum and minimum limits), Smoothing (SMA to reduce rebalancing frequency).`,
      pineScriptCode: `//@version=6\nindicator("Volatility Managed Kelly Leverage", shorttitle="VMKL", overlay=false)\n\n// Volatility Settings\nlambda = input.float(0.94, "EWMA Lambda", minval=0.80, maxval=0.999, step=0.01)\nvol_multiplier = input.float(1.0, "Volatility Multiplier", minval=0.5, maxval=2.0, step=0.1)\n\n// Return Prediction\npower_b = input.float(-1.76, "Power Exponent (b)", minval=-10.0, maxval=2.0, step=0.1)\npower_a = input.float(0.10, "Power Coefficient (a)", minval=0.001, maxval=0.30, step=0.01)\nuse_adaptive = input.bool(false, "Adaptive Parameters")\n\n// Risk Controls\nmax_leverage = input.float(3.0, "Maximum Leverage", minval=0.1, maxval=20.0, step=0.5)\nmin_leverage = input.float(0.1, "Minimum Leverage", minval=0.0, maxval=5.0, step=0.1)\nkelly_fraction = input.float(0.75, "Kelly Fraction", minval=0.01, maxval=3.0, step=0.05)\nvol_floor = input.float(0.10, "Volatility Floor", minval=0.01, maxval=0.50, step=0.01)\nleverage_smooth = input.int(3, "Leverage Smoothing", minval=1, maxval=50)\n\n// Sensitivity\nsensitivity_mode = input.string("Enhanced", "Sensitivity Mode", options=["Standard", "Enhanced", "Maximum"])\ncrash_protection = input.bool(false, "Crash Protection")\ncrash_threshold = input.float(0.25, "Crash Vol Threshold", minval=0.15, maxval=0.50, step=0.05)\n\n// Calculate EWMA variance\nTRADING_DAYS = 252\nreturns = math.log(close / close[1])\ninitial_variance = ta.variance(returns, 20)\n\nvar float ewma_var = na\nif na(ewma_var)\n    ewma_var := initial_variance\nelse\n    ewma_var := lambda * ewma_var + (1 - lambda) * math.pow(returns[1], 2)\n\nadjusted_var = ewma_var * math.pow(vol_multiplier, 2)\nraw_forecast_vol = math.sqrt(adjusted_var * TRADING_DAYS)\nbase_forecast_vol = math.max(raw_forecast_vol, vol_floor)\n\nsensitivity_factor = switch sensitivity_mode\n    "Standard" => 1.0\n    "Enhanced" => 1.25\n    "Maximum" => 1.5\n    => 1.0\n\nforecast_vol = base_forecast_vol * sensitivity_factor\n\n// Predicted mu\nraw_predicted_mu = power_a * math.pow(forecast_vol, power_b + 1)\nmu_cap = 0.50\npredicted_mu = math.min(raw_predicted_mu, mu_cap)\n\n// Full Kelly\nfull_kelly_leverage = predicted_mu / math.pow(forecast_vol, 2)\nkelly_fraction_leverage = full_kelly_leverage * kelly_fraction\n\n// Caps and smoothing\nin_crash_mode = crash_protection and forecast_vol > crash_threshold\neffective_max = in_crash_mode ? max_leverage * 0.5 : max_leverage\ncapped_leverage = math.max(min_leverage, math.min(kelly_fraction_leverage, effective_max))\noptimal_leverage = ta.sma(capped_leverage, leverage_smooth)\n\n// Regime detection\nregime = optimal_leverage >= 4.0 ? "VERY AGGRESSIVE" :\n         optimal_leverage >= 2.5 ? "AGGRESSIVE" :\n         optimal_leverage >= 1.5 ? "GROWTH" :\n         optimal_leverage >= 0.75 ? "BALANCED" :\n         optimal_leverage >= 0.25 ? "DEFENSIVE" : "CASH"\n\n// Plot\nplot(optimal_leverage, "Optimal Leverage", color=optimal_leverage > 3.0 ? color.lime : optimal_leverage > 2.0 ? color.new(#00d4ff, 0) : optimal_leverage > 1.0 ? color.yellow : color.red, linewidth=3)\n\nhline(0.0, "Zero", color=color.gray)\nhline(1.0, "1x", color=color.white, linewidth=2)\nhline(2.0, "2x", color=color.yellow, linestyle=hline.style_dashed)\nhline(3.0, "3x", color=color.orange, linestyle=hline.style_dashed)\nhline(5.0, "5x", color=color.red, linestyle=hline.style_dotted)`,
      references: [
        'Cooper, T. (2010). "Alpha Generation and Risk Smoothing using Managed Volatility." Available at SSRN.',
        'Hull, J.C. (2018). "Options, Futures, and Other Derivatives." 10th Edition, Pearson.',
        'Tsay, R.S. (2010). "Analysis of Financial Time Series." 3rd Edition, Wiley.',
      ],
      practicalExamples: `The OVPMS strategy returned 12.6% annual return vs 7.0% for buy-and-hold, with the same volatility as the underlying index. Outstanding. For Conservative (Safe) settings: Kelly Fraction 0.50, Max Leverage 2.0x, Lambda 0.97, Sensitivity Enhanced. For Moderate (Balanced) settings: Kelly Fraction 0.75, Max Leverage 3.0x, Lambda 0.94, Sensitivity Enhanced. For Aggressive (Maximum) settings: Kelly Fraction 1.0, Max Leverage 5.0x, Lambda 0.90, Sensitivity Standard.`,
      settingsGuide: [
        { name: 'EWMA Lambda', value: '0.94', explanation: 'Controls how fast volatility estimates adapt. 0.94 = 11 days half-life. Higher = longer memory, smoother. Lower = shorter memory, faster reaction.' },
        { name: 'Power Exponent (b)', value: '-1.76', explanation: 'Return-volatility relationship. SPY: -1.76, QQQ: -1.71, Russell 2000: -1.82. More negative = more defensive in high volatility.' },
        { name: 'Power Coefficient (a)', value: '0.10', explanation: 'Baseline expected return in normal volatility. Paper uses 0.10 for stocks.' },
        { name: 'Kelly Fraction', value: '75%', explanation: 'What fraction of Full Kelly to actually use. 0.50 = Half Kelly (conservative), 0.75 = Three-quarter Kelly (moderate), 1.0 = Full Kelly (aggressive).' },
        { name: 'Max Leverage', value: '3.0x', explanation: 'Hard cap on leverage. Paper recommends 3.0x as good balance.' },
        { name: 'Vol Floor', value: '10%', explanation: 'Prevents extreme leverage in ultra-low volatility. Higher floor = lower max leverage.' },
      ],
      alerts: [
        { condition: 'Crash Mode Activated', message: 'VMKL: Crash protection activated — leverage cut in half' },
        { condition: 'Leverage > 3x', message: 'VMKL: Very aggressive positioning' },
        { condition: 'Leverage < 1x', message: 'VMKL: Defensive positioning' },
        { condition: 'Leverage < 0.5x', message: 'VMKL: Near cash position' },
      ],
    },

    signalLabels: {
      aggressive: { label: 'VERY AGGRESSIVE', color: '#00ff00' },
      buy: { label: 'AGGRESSIVE', color: '#00d4ff' },
      neutral: { label: 'GROWTH', color: '#f5a623' },
      defensive: { label: 'DEFENSIVE', color: '#ff9800' },
    },
  },
};
