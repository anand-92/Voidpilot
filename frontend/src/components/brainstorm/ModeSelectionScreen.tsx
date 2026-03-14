import { motion } from 'framer-motion'
import { Palette, Sparkles } from 'lucide-react'
import { useWebHaptics } from 'web-haptics/react'
import { Badge } from '@/components/ui/badge'
import { BlurFade } from '@/components/ui/blur-fade'
import { DotPattern } from '@/components/ui/dot-pattern'
import { MagicCard } from '@/components/ui/magic-card'
import { PulseDot } from '@/components/landing/PulseDot'
import { GeminiLiveLogo } from '../icons/CustomIcons'

export type BrainstormType = 'open_studio' | 'creative_spark'

type ModeSelectionScreenProps = {
  onSelectMode: (mode: BrainstormType) => void
}

const MODE_OPTIONS = [
  {
    id: 'open_studio' as const,
    title: 'Open Studio',
    description: 'Open-ended creative workspace with full tools — artifacts, images, video, and Flash delegation.',
    icon: Palette,
    gradientFrom: '#f59e0b',
    gradientTo: '#b45309',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    hoverGlow: 'group-hover:shadow-[0_0_40px_rgba(245,158,11,0.15)]',
  },
  {
    id: 'creative_spark' as const,
    title: 'Creative Spark',
    description: 'Guided inspiration mode — the AI leads with questions, spins your answers into wild ideas, and generates images & video.',
    icon: Sparkles,
    gradientFrom: '#f97316',
    gradientTo: '#c2410c',
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-400',
    hoverGlow: 'group-hover:shadow-[0_0_40px_rgba(249,115,22,0.15)]',
  },
] as const

export function ModeSelectionScreen({ onSelectMode }: ModeSelectionScreenProps) {
  const haptic = useWebHaptics()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[60] bg-black font-sans overflow-y-auto"
    >
      <DotPattern
        className="fixed inset-0 z-[1] text-amber-500/[0.04]"
        width={24}
        height={24}
        cr={0.8}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8 w-full">
        <BlurFade delay={0.1}>
          <Badge
            variant="outline"
            className="mb-5 h-auto gap-2 rounded-full border-amber-500/20 bg-amber-500/10 px-5 py-2 text-[10px] sm:text-xs font-medium tracking-widest text-amber-200 uppercase"
          >
            <PulseDot />
            CHOOSE YOUR MODE
          </Badge>
        </BlurFade>

        <BlurFade delay={0.15}>
          <div className="rounded-[2rem] border border-white/10 bg-white/5 px-6 py-4 md:px-10 md:py-5 shadow-[0_0_60px_rgba(245,158,11,0.08)] backdrop-blur-xl text-center">
            <h1 className="max-w-4xl text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-white">
              How do you want to <span className="text-amber-500">create?</span>
            </h1>
          </div>
        </BlurFade>

        <BlurFade delay={0.25}>
          <p className="mt-4 max-w-2xl text-center text-sm text-stone-400 sm:text-base md:text-lg font-light leading-relaxed">
            Pick a mode that matches your creative energy right now.
          </p>
        </BlurFade>

        <BlurFade delay={0.3} className="mt-10 w-full max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {MODE_OPTIONS.map((mode, index) => {
              const Icon = mode.icon

              return (
                <motion.div
                  key={mode.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + index * 0.1, duration: 0.4, ease: 'easeOut' }}
                >
                  <MagicCard
                    gradientColor="#1c1917"
                    gradientFrom={mode.gradientFrom}
                    gradientTo={mode.gradientTo}
                    gradientOpacity={0.6}
                    className="h-full rounded-[2rem]"
                  >
                    <button
                      onClick={() => {
                        haptic.trigger('success')
                        onSelectMode(mode.id)
                      }}
                      className={`group relative flex h-full min-h-[280px] w-full flex-col justify-between rounded-[2rem] p-8 text-left transition-all hover:bg-white/[0.02] ${mode.hoverGlow}`}
                    >
                      <div className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl ${mode.iconBg} ${mode.iconColor}`}>
                        <Icon className="h-8 w-8" />
                      </div>

                      <div className="mt-8">
                        <div className="flex items-center gap-3 mb-3">
                          <GeminiLiveLogo className={`h-5 w-5 ${mode.iconColor}`} />
                          <h3 className="text-2xl font-bold text-white">{mode.title}</h3>
                        </div>
                        <p className="text-sm leading-relaxed text-stone-400 max-w-[320px]">
                          {mode.description}
                        </p>
                      </div>

                      <div className={`absolute right-8 bottom-8 flex items-center gap-2 ${mode.iconColor} opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1`}>
                        <span className="text-sm font-semibold">Select</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </button>
                  </MagicCard>
                </motion.div>
              )
            })}
          </div>
        </BlurFade>
      </div>
    </motion.div>
  )
}
