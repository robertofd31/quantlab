import { motion } from 'framer-motion';

export function Hero() {
  return (
    <section className="pt-24 pb-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-gold/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-green/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-semibold mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            Henrique Wealth Academy
          </span>
          <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
            <span className="text-white">OptiFolio </span>
            <span className="text-gradient-gold">Simulator</span>
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            A professional-grade financial simulator powered by five stochastic models,
            Kelly Criterion mathematics, and interactive analytics.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
