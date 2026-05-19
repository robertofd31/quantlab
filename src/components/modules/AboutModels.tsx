import { BookOpen, Target, TrendingUp, Zap, Layers, Box, LineChart, Shield } from 'lucide-react';

const modelInfo = [
  {
    title: 'Standard Monte Carlo',
    icon: LineChart,
    description: 'Uses historical mean return and volatility (geometric Brownian motion) to project future prices.\n\n**How to use:**\n1. Select your asset type (Equities, Crypto, Commodities, Forex, or Index ETFs)\n2. Choose your specific investment\n3. Choose "Standard" in the model selector\n4. Adjust simulations and time horizon\n5. View projected wealth paths and probability bands',
    pros: 'Simple to understand, transparent assumptions',
    cons: 'Assumes constant volatility and normal returns, no fat tails',
    bestFor: 'Long-term wealth forecasting, retirement planning, general education',
  },
  {
    title: 'Geometric Brownian Motion (GBM)',
    icon: TrendingUp,
    description: 'A mathematical model where price evolves with a random walk and a deterministic drift.\n\n**How to use:**\n1. Select your asset\n2. Choose "GBM" model\n3. The system automatically estimates drift (μ) and volatility (σ) from historical data\n4. View price projections with confidence intervals',
    pros: 'Theoretically rigorous, widely used in finance',
    cons: 'Assumes constant parameters, log-normal returns, no jumps or regime shifts',
    bestFor: 'Option pricing, risk management, academic analysis',
  },
  {
    title: 'GARCH Volatility',
    icon: Layers,
    description: 'Models time-varying volatility where periods of high/low volatility cluster together (volatility clustering).\n\n**How to use:**\n1. Select your asset\n2. Choose "GARCH" model\n3. View projected paths with dynamic volatility regimes\n4. Notice the asymmetric volatility behavior',
    pros: 'Captures volatility clustering, more realistic risk assessment',
    cons: 'Computationally intensive, sensitive to parameter estimation',
    bestFor: 'Risk assessment during volatile periods, stress testing',
  },
  {
    title: 'Markov Chain Regime',
    icon: Box,
    description: 'Models markets as transitioning between distinct states (e.g., bull/bear/crisis) with specific transition probabilities.\n\n**How to use:**\n1. Select your asset\n2. Choose "Markov" model\n3. View regime transitions and steady-state probabilities\n4. Understand how long markets stay in each state',
    pros: 'Captures regime changes and state persistence',
    cons: 'Requires defining states, limited to discrete regimes',
    bestFor: 'Strategic asset allocation, regime-based strategies',
  },
  {
    title: 'Feynman Path Integral',
    icon: Target,
    description: 'Applies quantum physics-inspired path summation to financial projections.\n\n**How to use:**\n1. Select your asset\n2. Choose "Feynman" model\n3. Explore unconventional price trajectories\n4. Compare with traditional models',
    pros: 'Unique perspective, novel approach',
    cons: 'Experimental, not industry standard',
    bestFor: 'Research, exploration of alternative methodologies',
  },
];

const kellyInfo = {
  title: 'Kelly Criterion',
  icon: Zap,
  description: 'The Kelly Criterion determines the optimal leverage to maximize long-term wealth growth without risking ruin.\n\n**How to use:**\n1. Select your asset\n2. View the Kelly analysis section\n3. See Full Kelly, Half Kelly, and Quarter Kelly statistics\n4. Compare growth curves and success probabilities\n5. Use the leverage simulator to test different levels',
  formula: 'f* = μ / σ²',
  explanation: 'Where μ is the expected excess return and σ² is the variance of returns.\n\n**Full Kelly** maximizes expected log wealth but has high drawdown risk.\n**Half Kelly** provides a balance between growth and safety.\n**Quarter Kelly** is conservative with lower volatility.',
};

const optimizerInfo = {
  title: 'Portfolio Optimizer',
  icon: Shield,
  description: 'Finds the Kelly-optimal portfolio allocation across multiple assets using the Nekrasov Kelly criterion.\n\n**How to use:**\n1. Select your asset universe\n2. Click "Calculate Nekrasov Kelly"\n3. View the optimal allocation vector\n4. Check the Diversification Bonus\n5. Explore correlation matrix',
  formula: 'K* = μ^T Σ^-1 μ',
  explanation: 'Where μ is the expected return vector and Σ is the covariance matrix.\n\nThe Diversification Bonus shows how much the optimal portfolio outperforms the best single asset.',
};

export default function AboutModels() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <BookOpen className="w-6 h-6 text-gold" />
        <h2 className="text-2xl font-bold text-white">About Models</h2>
      </div>
      <p className="text-text-secondary max-w-3xl">
        QuantLab uses five distinct stochastic models to simulate financial markets. Each has unique strengths and is suited to different analytical goals. Below, you can learn how each model works, when to use it, and what to watch out for.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {modelInfo.map((m) => (
          <div key={m.title} className="bg-secondary rounded-2xl p-6 border border-border space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                <m.icon className="w-5 h-5 text-gold" />
              </div>
              <h3 className="text-lg font-bold text-white">{m.title}</h3>
            </div>
            <div className="text-text-secondary text-sm whitespace-pre-line leading-relaxed">
              {m.description}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-primary/50 rounded-xl p-3 border border-border">
                <div className="text-green font-bold mb-1">Pros</div>
                <div className="text-text-secondary">{m.pros}</div>
              </div>
              <div className="bg-primary/50 rounded-xl p-3 border border-border">
                <div className="text-red font-bold mb-1">Cons</div>
                <div className="text-text-secondary">{m.cons}</div>
              </div>
              <div className="bg-primary/50 rounded-xl p-3 border border-border">
                <div className="text-gold font-bold mb-1">Best For</div>
                <div className="text-text-secondary">{m.bestFor}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-secondary rounded-2xl p-6 border border-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-gold" />
            </div>
            <h3 className="text-lg font-bold text-white">{kellyInfo.title}</h3>
          </div>
          <div className="text-text-secondary text-sm whitespace-pre-line leading-relaxed">
            {kellyInfo.description}
          </div>
          <div className="bg-primary/50 rounded-xl p-4 border border-border">
            <div className="text-gold font-mono text-sm mb-2">Formula: {kellyInfo.formula}</div>
            <div className="text-text-secondary text-xs whitespace-pre-line">{kellyInfo.explanation}</div>
          </div>
        </div>

        <div className="bg-secondary rounded-2xl p-6 border border-border space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-gold" />
            </div>
            <h3 className="text-lg font-bold text-white">{optimizerInfo.title}</h3>
          </div>
          <div className="text-text-secondary text-sm whitespace-pre-line leading-relaxed">
            {optimizerInfo.description}
          </div>
          <div className="bg-primary/50 rounded-xl p-4 border border-border">
            <div className="text-gold font-mono text-sm mb-2">Formula: {optimizerInfo.formula}</div>
            <div className="text-text-secondary text-xs whitespace-pre-line">{optimizerInfo.explanation}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
