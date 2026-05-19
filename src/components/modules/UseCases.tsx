import { BookOpen, PiggyBank, Activity, Landmark, Bitcoin, Globe, GraduationCap } from 'lucide-react';

const useCases = [
  {
    title: 'Retirement Planning',
    icon: PiggyBank,
    description: 'Plan your retirement with confidence using Monte Carlo projections.\n\n**How:**\n1. Select a broad market index (S&P 500, FTSE 100, or global ETF)\n2. Set your initial investment and monthly contributions\n3. Run 1,000+ simulations over 20-30 years\n4. Analyze the probability bands to see worst-case and best-case scenarios\n5. Adjust contributions or timeline to meet your goals',
    tip: 'Use the 10th percentile (P10) as a conservative estimate and the 90th percentile (P90) as an optimistic scenario.',
  },
  {
    title: 'Strategy Testing',
    icon: Activity,
    description: 'Test trading or investment strategies before committing real capital.\n\n**How:**\n1. Select the assets in your strategy\n2. Run simulations with different market models\n3. Compare results across Standard, GARCH, and Markov models\n4. Identify which strategies hold up in volatile or bear markets\n5. Use Kelly Criterion to size positions optimally',
    tip: 'Run the same strategy through all five models to understand robustness.',
  },
  {
    title: 'Leverage Analysis',
    icon: Landmark,
    description: 'Understand the risks and rewards of using leverage (margin, futures, options).\n\n**How:**\n1. Select a volatile asset (crypto, small-cap equity, or commodity)\n2. Use the Kelly Criterion analysis to find optimal leverage\n3. Simulate with 1x, 2x, 3x leverage\n4. Observe how leverage amplifies both gains and drawdowns\n5. Use the Kelly Game to experience leveraged trading interactively',
    tip: 'Never use Full Kelly leverage in practice. Half Kelly or Quarter Kelly are safer for real trading.',
  },
  {
    title: 'Dollar-Cost Averaging (DCA)',
    icon: Activity,
    description: 'Analyze how regular contributions affect wealth accumulation over time.\n\n**How:**\n1. Select your target asset\n2. Enable DCA in the Portfolio Simulator\n3. Set monthly contribution amount\n4. Compare DCA vs lump-sum investment\n5. See how DCA smooths out volatility and reduces timing risk',
    tip: 'DCA is especially powerful in volatile assets like cryptocurrencies.',
  },
  {
    title: 'Crypto Asset Analysis',
    icon: Bitcoin,
    description: 'Model the extreme volatility and growth potential of cryptocurrency investments.\n\n**How:**\n1. Select a crypto asset (BTC, ETH, SOL, etc.)\n2. Use GARCH or Markov models to capture volatility clustering\n3. Run simulations with high volatility assumptions\n4. Analyze drawdown risks and recovery probabilities\n5. Use Kelly Criterion to avoid catastrophic losses from over-leverage',
    tip: 'Crypto assets often show regime-switching behavior. The Markov Chain model captures this well.',
  },
  {
    title: 'Global Diversification',
    icon: Globe,
    description: 'Build and test multi-asset portfolios across geographies and asset classes.\n\n**How:**\n1. Select multiple assets from different regions (US, Europe, Asia, Emerging Markets)\n2. Use the Portfolio Simulator with correlation analysis\n3. Compare rebalanced vs buy-and-hold strategies\n4. Use the Portfolio Optimizer to find Kelly-optimal weights\n5. Analyze the Diversification Bonus',
    tip: 'Low correlation between assets provides the biggest diversification benefit.',
  },
  {
    title: 'Financial Education',
    icon: GraduationCap,
    description: 'Learn about market dynamics, risk, and portfolio theory through hands-on simulation.\n\n**How:**\n1. Explore all five simulation models to understand their assumptions\n2. Use the Kelly Game to experience position sizing interactively\n3. Compare single-asset vs multi-asset portfolios\n4. Analyze the effect of fees, rebalancing, and taxes\n5. Read the About Models section to understand the mathematics',
    tip: 'The Kelly Game is the best way to intuitively understand why over-leverage leads to ruin.',
  },
];

export default function UseCases() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <BookOpen className="w-6 h-6 text-gold" />
        <h2 className="text-2xl font-bold text-white">Use Cases</h2>
      </div>
      <p className="text-text-secondary max-w-3xl">
        QuantLab is designed for a wide range of financial analysis tasks. Whether you are planning for retirement, testing a trading strategy, or learning about portfolio theory, these guided use cases will help you get the most out of the simulator.
      </p>

      <div className="grid grid-cols-1 gap-6">
        {useCases.map((uc) => (
          <div key={uc.title} className="bg-secondary rounded-2xl p-6 border border-border space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                <uc.icon className="w-5 h-5 text-gold" />
              </div>
              <h3 className="text-lg font-bold text-white">{uc.title}</h3>
            </div>
            <div className="text-text-secondary text-sm whitespace-pre-line leading-relaxed">
              {uc.description}
            </div>
            <div className="bg-primary/50 rounded-xl p-4 border border-border">
              <div className="text-gold font-bold text-xs uppercase tracking-wide mb-1">Pro Tip</div>
              <div className="text-text-secondary text-sm">{uc.tip}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
