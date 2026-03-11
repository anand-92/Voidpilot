import { motion } from 'framer-motion';
import { BlurFade } from '@/components/ui/blur-fade';
import { MagicCard } from '@/components/ui/magic-card';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
import { EnhancedTiltCard } from './EnhancedTiltCard';
import { sectionVariants } from './LandingConstants';
import {
  IconVoiceWaveform,
  IconScene3D,
  IconIterationLoop,
} from '../icons/CustomIcons';

const capabilities = [
  {
    title: 'Voice chat that feels immediate',
    description: 'Speak naturally and get responses back in real time.',
    icon: IconVoiceWaveform,
  },
  {
    title: 'Prompt-driven 3D scenes',
    description: 'Type an idea and watch the scene update without leaving the session.',
    icon: IconScene3D,
  },
  {
    title: 'Faster creative iteration',
    description: 'Try a direction, tweak it, and compare results while you chat.',
    icon: IconIterationLoop,
  },
];

export function CapabilitiesSection({ onCardTap }: { onCardTap: () => void }) {
  return (
    <motion.div
      className="absolute inset-x-0 top-16 bottom-0 flex flex-col items-center justify-center px-4 md:px-6 w-full"
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="max-w-7xl mx-auto w-full">
        <BlurFade delay={0.1}>
          <div className="mb-6 md:mb-12 md:text-center pointer-events-auto">
            <h2 className="text-2xl font-bold sm:text-3xl md:text-5xl text-white">
              Experience True <AnimatedGradientText colorFrom="#d97706" colorTo="#fbbf24" className="text-2xl sm:text-3xl md:text-5xl font-bold">Synergy</AnimatedGradientText>
            </h2>
            <p className="mt-2 md:mt-4 text-stone-500 max-w-2xl mx-auto text-sm md:text-lg">Harness the multimodal capabilities of the Gemini model. Blend audio, vision, and contextual understanding in one fluid interface.</p>
          </div>
        </BlurFade>

        <div className="grid grid-cols-1 gap-3 md:gap-6 md:grid-cols-3 w-full">
          {capabilities.map(({ title, description, icon: Icon }, i) => (
            <BlurFade key={title} delay={0.2 + i * 0.1}>
              <EnhancedTiltCard className="pointer-events-auto">
                <MagicCard
                  className="rounded-2xl md:rounded-3xl h-full"
                  gradientColor="#1c1917"
                  gradientFrom="#d97706"
                  gradientTo="#b45309"
                  gradientOpacity={0.5}
                >
                  <article onTouchStart={onCardTap} className="group relative overflow-hidden p-4 md:p-8 transition-all duration-300 h-full flex items-start gap-3 md:block">
                    <div className="shrink-0 inline-flex h-10 w-10 md:h-14 md:w-14 md:mb-6 items-center justify-center rounded-xl md:rounded-2xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-stone-950 transition-colors duration-300">
                      <Icon className="h-5 w-5 md:h-7 md:w-7" />
                    </div>
                    <div className="min-w-0 flex-1 md:flex-none">
                      <h3 className="text-base md:text-xl font-bold text-white mb-1 md:mb-3">{title}</h3>
                      <p className="text-xs md:text-base text-stone-500 leading-relaxed group-hover:text-stone-400 transition-colors">{description}</p>
                    </div>
                  </article>
                </MagicCard>
              </EnhancedTiltCard>
            </BlurFade>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
