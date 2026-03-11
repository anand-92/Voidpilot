import { motion } from 'framer-motion'

export function ActivitySpinner() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.06] px-4 py-2.5 text-xs text-amber-300">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="size-1.5 rounded-full bg-amber-400"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      <span className="font-medium">Generating artifact…</span>
    </div>
  )
}
