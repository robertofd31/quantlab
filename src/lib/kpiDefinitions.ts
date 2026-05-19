export interface KpiDefinition {
  id: string;
  name: string;
  shortTitle: string;
  category: 'Leverage' | 'Risk' | 'Distribution' | 'Volatility';
  categoryColor: string;
  icon: string; // lucide icon name

  // Modo Básico
  basicDescription: string;
  basicInterpretation: (values: Record<string, number | string>) => string;

  // Modo Avanzado
  advancedDescription: string;
  advancedFormula: string;
  advancedParameters: { name: string; value: string; description: string }[];

  // Notas educativas
  notes: string;
  whyItMatters: string;
  howToUse: string;

  // Señales
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
      if (kelly > 3) return `Kelly óptimo: ${kelly.toFixed(2)}x — Apalancamiento AGRESIVO. El arrastre de volatilidad es manejable.`;
      if (kelly > 1.5) return `Kelly óptimo: ${kelly.toFixed(2)}x — Apalancamiento MODERADO. Buen punto óptimo.`;
      if (kelly > 0.5) return `Kelly óptimo: ${kelly.toFixed(2)}x — Apalancamiento CONSERVADOR. Poca ventaja del apalancamiento.`;
      return `Kelly óptimo: ${kelly.toFixed(2)}x — EVITAR apalancamiento. La volatilidad destruye más que lo que genera.`;
    },

    advancedDescription: 'Combina la desigualdad de Jensen (que explica por qué el retorno geométrico es siempre menor que el aritmético) con el Criterio de Kelly para encontrar el apalancamiento que maximiza el crecimiento logarítmico del capital.',
    advancedFormula: 'Kelly = (μ - r_f) / σ²\n\nr_geometric = L × r_arithmetic - (L² × σ²) / 2\n\nL_max = 2 × r_arithmetic / σ²',
    advancedParameters: [
      { name: 'Lookback', value: '756 bars (3 years)', description: 'Período para calcular retornos y volatilidad' },
      { name: 'Log Returns', value: 'Sí', description: 'Usa log-returns para compounding geométrico exacto' },
      { name: 'Risk-Free Rate', value: 'Auto (T-Bill) o Manual', description: 'Tasa libre de riesgo para exceso de retorno' },
    ],

    notes: "La desigualdad de Jensen establece que para funciones cóncavas (como logaritmos), E[log(1+R)] ≤ log(1+E[R]). Esto significa que tu retorno geométrico realizado SIEMPRE es menor que tu retorno aritmético promedio. A esta brecha se le llama 'volatility drag' (arrastre de volatilidad).",
    whyItMatters: 'La mayoría de los inversores asumen que 2x de apalancamiento = 2x de retorno. La realidad: el arrastre crece CUADRÁTICAMENTE (L²). Doblar el apalancamiento cuadruplica el arrastre. Este indicador te muestra exactamente dónde el apalancamiento deja de ser rentable.',
    howToUse: 'Observa el Kelly óptimo. Si es >3x, el activo puede soportar apalancamiento. Si es <1x, NI SE TE OCURRA apalancar. Usa media Kelly (½ Kelly) para tamaños de posición conservadores.',

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
      if (omega > 1.5) return `Omega: ${omega.toFixed(2)} — EXCELENTE. Ganas $1.50 por cada $1 que pierdes vs tu objetivo.`;
      if (omega > 1.0) return `Omega: ${omega.toFixed(2)} — BUENO. Ganas más de lo que pierdes. Cumples tu objetivo.`;
      if (omega > 0.7) return `Omega: ${omega.toFixed(2)} — PRECAUCIÓN. Pierdes más de lo que ganas. Revisa tu estrategia.`;
      return `Omega: ${omega.toFixed(2)} — MALO. Las pérdidas dominan. Considera reducir exposición.`;
    },

    advancedDescription: 'El ratio Omega, introducido por Keating y Shadwick en 2002, captura la distribución completa de retornos (no solo la volatilidad como Sharpe). Ideal para activos con colas gordas: crypto, ETFs apalancados, y cualquier activo con retornos asimétricos.',
    advancedFormula: 'Ω(MAR) = Σ(max(0, r_i - MAR)) / Σ(max(0, MAR - r_i))\n\nDonde MAR = Minimum Acceptable Return (tu umbral de retorno objetivo)',
    advancedParameters: [
      { name: 'Lookback', value: '252 bars (1 year)', description: 'Ventana rodante para cálculo' },
      { name: 'MAR Type', value: 'Fixed o Risk-Free', description: 'Umbral de retorno mínimo aceptable' },
      { name: 'Smoothing', value: '5 bars', description: 'SMA para reducir ruido' },
    ],

    notes: 'Sharpe asume distribución normal de retornos (ignora colas gordas). Omega captura la distribución COMPLETA. Los fondos cuantitativos prefieren Omega porque responde: "¿Cuánto gano ARRIBA de mi umbral vs cuánto pierdo ABAJO?"',
    whyItMatters: 'Sharpe puede ser engañoso con activos de colas gordas. Un activo con Sharpe 1.0 pero Omega 0.5 tiene retornos positivos promedio pero extremos negativos frecuentes. Omega revela la verdadera forma de la distribución.',
    howToUse: 'Compara dos activos (ej: SPY vs TQQQ). Si la curva Omega del apalancado tiene pendiente más suave, captura más upside explosivo. Cruce de curvas = umbral MAR donde un activo supera al otro.',

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
      if (ratio3x > 6) return `Ratio 3x: ${ratio3x.toFixed(2)} — REGIMEN FAVORABLE al apalancamiento. Riesgo manejable.`;
      if (ratio3x > 3) return `Ratio 3x: ${ratio3x.toFixed(2)} — Apalancamiento ACEPTABLE. Monitoriza la volatilidad.`;
      if (ratio3x > 1) return `Ratio 3x: ${ratio3x.toFixed(2)} — PRECAUCIÓN. El apalancamiento puede ser destructivo.`;
      return `Ratio 3x: ${ratio3x.toFixed(2)} — EVITAR apalancamiento. Riesgo excesivo vs recompensa.`;
    },

    advancedDescription: 'Simula el comportamiento real de ETFs apalancados con rebalanceo diario. A diferencia del VAR paramétrico (asume distribución normal), usa simulación histórica: aplica apalancamiento a cada retorno diario, compone sobre el período de tenencia, y limita pérdidas al -100%.',
    advancedFormula: 'VAR = Percentil inferior (100 - confianza)% de retornos compuestos\nVaG = Percentil superior (confianza)% de retornos compuestos\nRatio = VaG / |VAR|\n\nCompounded = Π(1 + min(L × r_i, -1))',
    advancedParameters: [
      { name: 'Lookback', value: '252 days', description: 'Datos históricos para simulación' },
      { name: 'Holding Period', value: '21 days', description: 'Período de tenencia (1 mes)' },
      { name: 'Confidence', value: '95%', description: 'Nivel de confianza para percentiles' },
      { name: 'Leverage', value: '1x, 2x, 3x', description: 'Niveles de apalancamiento a comparar' },
    ],

    notes: 'El cálculo lineal de riesgo (2x = 2x riesgo) es FALSO para ETFs apalancados. Debido al rebalanceo diario y la volatilidad, un ETF 3x puede perder MÁS que 3x en mercados bajistas volátiles o MENOS en mercados alcistas tendenciales.',
    whyItMatters: 'La mayoría de los traders usan el mismo apalancamiento en TODAS las condiciones de mercado. Este indicador cuantifica la eficiencia del apalancamiento: cuando el ratio VaG/|VAR| del apalancado es MAYOR que el del 1x, el apalancamiento es favorable.',
    howToUse: 'Monitoriza el ratio. Si ratio 3x > ratio 1x → mercado favorece apalancamiento. Si ratio 3x cae por debajo de 1.0 → reducir apalancamiento URGENTEMENTE.',

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
      if (kelly > 3) return `Kelly óptimo: ${kelly.toFixed(2)}x — Régimen: ${regime}. Mucho margen para apalancar.`;
      if (kelly > 1.5) return `Kelly óptimo: ${kelly.toFixed(2)}x — Régimen: ${regime}. Apalancamiento moderado óptimo.`;
      if (kelly > 0.5) return `Kelly óptimo: ${kelly.toFixed(2)}x — Régimen: ${regime}. Poco beneficio del apalancamiento.`;
      return `Kelly óptimo: ${kelly.toFixed(2)}x — Régimen: ${regime}. NO apalancar. Arrastre excesivo.`;
    },

    advancedDescription: 'La curva de Kelly muestra la función de crecimiento g(f) = μ·f - 0.5·σ²·f². Es una parábola que alcanza su máximo en el Kelly óptimo. Divide el espectro de apalancamiento en 5 zonas de riesgo coloreadas.',
    advancedFormula: 'g(f) = μ·f - 0.5·σ²·f²\n\nf* = μ / σ² (Kelly óptimo)\n\nZones:\n• Underinvesting (f < f*/3)\n• Optimal Sizing (f*/3 < f < 2f*/3)\n• High Risk (2f*/3 < f < f*)\n• Never Logical (f* < f < f_zero)\n• Suicidal (f > f_zero)',
    advancedParameters: [
      { name: 'Lookback', value: '252 bars (1 year)', description: 'Ventana histórica' },
      { name: 'Annual Days', value: '252', description: 'Días de trading para anualizar' },
      { name: 'Log Returns', value: 'Sí', description: 'Más preciso para compounding' },
      { name: 'Max Display', value: '5x', description: 'Rango del eje X' },
    ],

    notes: 'Desarrollado por John L. Kelly Jr. en 1956 para teoría de la información, luego adaptado por Edward O. Thorp para conteo de cartas e inversión. La curva muestra por qué el crecimiento máximo NO es simplemente retorno × apalancamiento: la volatilidad destruye compounding.',
    whyItMatters: 'Kelly completo maximiza el crecimiento logarítmico a largo plazo pero con drawdowns severos. La mayoría de los profesionales usan ¼ a ½ Kelly. Esta curva te muestra visualmente dónde estás en el espectro de riesgo.',
    howToUse: 'Encuentra tu apalancamiento actual en la curva. Si cae en "High Risk" o peor, reduce posición. Si está en "Underinvesting" y tienes tolerancia al riesgo, considera aumentar. Usa ½ Kelly para sizing conservador.',

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
      if (lev >= 4) return `Apalancamiento: ${lev.toFixed(2)}x — ${regime}. Máxima exposición, mercado tranquilo.`;
      if (lev >= 2.5) return `Apalancamiento: ${lev.toFixed(2)}x — ${regime}. Exposición elevada, condiciones favorables.`;
      if (lev >= 1.5) return `Apalancamiento: ${lev.toFixed(2)}x — ${regime}. Crecimiento moderado.`;
      if (lev >= 0.75) return `Apalancamiento: ${lev.toFixed(2)}x — ${regime}. Balanceado, gestión prudente.`;
      if (lev >= 0.25) return `Apalancamiento: ${lev.toFixed(2)}x — ${regime}. Defensivo, alta volatilidad.`;
      return `Apalancamiento: ${lev.toFixed(2)}x — ${regime}. Mínima exposición, protección de capital.`;
    },

    advancedDescription: 'Implementa la estrategia OVPMS (Optimal Volatility Plus Mean Strategy) de Tony Cooper (2010). Usa EWMA para pronosticar volatilidad y ajusta dinámicamente el apalancamiento de Kelly. Genera alpha reduciendo la volatilidad de la volatilidad (vo-vo), curtosis y drawdown máximo.',
    advancedFormula: 'σ²(t) = λ·σ²(t-1) + (1-λ)·r²(t-1)  (EWMA)\n\nE[R] = a × σ^(b+1)  (Return prediction)\n\nL = (E[R] / σ²) × KellyFraction × Caps  (Optimal leverage)',
    advancedParameters: [
      { name: 'EWMA Lambda', value: '0.94', description: '11 días de half-life. Balance óptimo entre reactividad y suavizado.' },
      { name: 'Power Exponent (b)', value: '-1.76', description: 'Relación retorno-volatilidad. SPY: -1.76, QQQ: -1.71.' },
      { name: 'Power Coefficient (a)', value: '0.10', description: 'Retorno base en condiciones normales.' },
      { name: 'Kelly Fraction', value: '75%', description: 'Three-quarter Kelly para gestión de riesgo.' },
      { name: 'Max Leverage', value: '3.0x', description: 'Tope hard de apalancamiento.' },
      { name: 'Vol Floor', value: '10%', description: 'Previene apalancamiento extremo en baja volatilidad.' },
    ],

    notes: 'Basado en el paper "Alpha Generation and Risk Smoothing using Managed Volatility" (Cooper, 2010). Testeado en 125+ años de datos de múltiples índices globales. La OVPMS retornó 12.6% anual vs 7.0% buy-and-hold, con la MISMA volatilidad que el índice subyacente.',
    whyItMatters: 'La volatilidad de la volatilidad (vo-vo) es costosa. Al apuntar a una volatilidad consistente a través de apalancamiento dinámico: reduce drag de volatilidad, reduce drawdowns automáticamente, reduce curtosis, y genera alpha explotando la relación retorno-volatilidad.',
    howToUse: 'Cuando VMKL > 2x → mercado tranquilo, considera aumentar exposición. Cuando VMKL < 1x → mercado volátil, reducir posiciones. Monitoriza el régimen: CRASH = protección activada.',

    signalLabels: {
      aggressive: { label: 'VERY AGGRESSIVE', color: '#00ff00' },
      buy: { label: 'AGGRESSIVE', color: '#00d4ff' },
      neutral: { label: 'GROWTH', color: '#f5a623' },
      defensive: { label: 'DEFENSIVE', color: '#ff9800' },
    },
  },
};
