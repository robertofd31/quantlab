# QuantLab

A professional-grade financial simulator powered by five stochastic models,
Kelly Criterion mathematics, and interactive analytics.

## Features

- **Monte Carlo Dashboard** — 5 simulation models (Standard, GBM, GARCH, Markov, Feynman)
- **Portfolio Simulator** — Multi-asset correlated GBM with rebalancing & DCA
- **Portfolio Optimizer** — Nekrasov Kelly Criterion allocation engine
- **Kelly & Leverage** — Full/Half/Quarter Kelly analysis with growth curves
- **Volatility & Regimes** — Per Bak stress vectors, Markov transitions, VIX term structure
- **Indicators Advanced** — Sigmoid, EVaR, FPT, VMKL, Premium/Discount
- **Kelly Game** — Interactive bootstrap & Markov chain betting simulator
- **About Models** — Detailed explanations of all 5 models + Kelly math
- **Use Cases** — Guided scenarios for retirement, DCA, leverage, crypto, etc.

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v3
- Recharts for data visualization
- Framer Motion for animations
- pnpm package manager

## Local Development

```bash
pnpm install
pnpm run dev
```

## Build

```bash
pnpm run build
```

## Data

Historical prices cached locally from Yahoo Finance (205+ tickers).
Update with `node scripts/download-prices.cjs`.
