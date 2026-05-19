import { motion } from 'framer-motion';

export function ModuleLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full"
      />
      <p className="mt-6 text-text-muted text-sm font-medium animate-pulse">
        Loading module...
      </p>
    </div>
  );
}
