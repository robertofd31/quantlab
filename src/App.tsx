import { useState, Suspense, lazy } from 'react'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Hero } from './components/Hero'
import { ModuleLoader } from './components/ModuleLoader'
import { MonteCarloDashboard } from './components/modules/MonteCarloDashboard'

// Lazy load heavy modules
const PortfolioSimulator = lazy(() => import('./components/modules/PortfolioSimulator'))
const PortfolioOptimizer = lazy(() => import('./components/modules/PortfolioOptimizer'))
const KellyModule = lazy(() => import('./components/modules/KellyModule'))
const KellyGame = lazy(() => import('./components/modules/KellyGame'))
const SimulationDetails = lazy(() => import('./components/modules/SimulationDetails'))
const VolatilityRegimes = lazy(() => import('./components/modules/VolatilityRegimes'))
const IndicatorsAdvanced = lazy(() => import('./components/modules/IndicatorsAdvanced'))
const AboutModels = lazy(() => import('./components/modules/AboutModels'))
const UseCases = lazy(() => import('./components/modules/UseCases'))

export type TabId = 'monte-carlo' | 'portfolio-simulator' | 'portfolio-optimizer' | 'kelly' | 'simulation-details' | 'volatility-regimes' | 'indicators-advanced' | 'kelly-game' | 'about-models' | 'use-cases'

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('monte-carlo')

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex flex-1 pt-[72px]">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<ModuleLoader />}>
            {activeTab === 'monte-carlo' && (
              <>
                <Hero />
                <MonteCarloDashboard />
              </>
            )}
            {activeTab === 'portfolio-simulator' && <PortfolioSimulator />}
            {activeTab === 'portfolio-optimizer' && <PortfolioOptimizer />}
            {activeTab === 'kelly' && <KellyModule />}
            {activeTab === 'simulation-details' && <SimulationDetails />}
            {activeTab === 'volatility-regimes' && <VolatilityRegimes />}
            {activeTab === 'indicators-advanced' && <IndicatorsAdvanced />}
            {activeTab === 'kelly-game' && <KellyGame />}
            {activeTab === 'about-models' && <AboutModels />}
            {activeTab === 'use-cases' && <UseCases />}
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export default App
