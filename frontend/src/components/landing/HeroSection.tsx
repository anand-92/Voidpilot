import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { BlurFade } from '@/components/ui/blur-fade';
import AnimatedTextRoller from '@/components/shadcn-space/animated-text/animated-text-04';
import { voidpilotHeroItems } from '@/components/shadcn-space/animated-text/constants';
import { GeminiArrowRight } from '../icons/GeminiIcons';
import { PulseDot } from './PulseDot';
import { sectionVariants } from './LandingConstants';

export function HeroSection({ onLaunch }: { onLaunch: () => void }) {
  return (
    <motion.div
      className="absolute inset-x-0 top-16 bottom-0 flex flex-col items-center justify-center px-4 md:px-6 text-center"
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <BlurFade delay={0.1}>
        <Badge
          variant="outline"
          className="group relative mb-4 md:mb-8 h-auto gap-2 rounded-full border-blue-500/20 bg-blue-500/10 px-3 md:px-5 py-1.5 md:py-2 text-[10px] md:text-xs font-medium tracking-widest text-blue-200 uppercase pointer-events-auto transition-all hover:bg-blue-500/20 hover:scale-105"
        >
          <PulseDot />
          Voidpilot — Live AI Assistant
        </Badge>
      </BlurFade>

      <BlurFade delay={0.15}>
        <div className="pointer-events-auto flex max-w-5xl flex-col items-center gap-3 text-center md:gap-5">
          <div className="rounded-[2rem] border border-blue-500/20 bg-black/40 px-5 py-4 shadow-[0_0_60px_rgba(59,130,246,0.15)] backdrop-blur-xl md:px-8 md:py-6">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl md:text-7xl drop-shadow-sm leading-tight">
              <span className="mb-2 block text-transparent bg-clip-text bg-gradient-to-br from-white via-stone-200 to-stone-500 md:mb-3">
                Your copilot for
              </span>
              <AnimatedTextRoller
                className="text-3xl sm:text-5xl md:text-7xl"
                prefixClassName="font-extrabold tracking-tight text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                itemClassName="font-extrabold"
                items={voidpilotHeroItems}
              />
            </h1>
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.25}>
        <p className="mt-3 md:mt-6 max-w-2xl text-sm text-stone-300 sm:text-lg md:text-xl font-normal leading-relaxed pointer-events-auto drop-shadow-[0_1px_12px_rgba(0,0,0,0.35)]">
          Talk to Gemini and let it assist you — all in real time.
        </p>
      </BlurFade>

      <BlurFade delay={0.35}>
        <motion.button
          onClick={onLaunch}
          className="mt-6 md:mt-10 inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 md:px-8 py-2.5 md:py-3 text-sm md:text-base font-semibold text-white hover:bg-blue-500 transition-all pointer-events-auto shadow-[0_8px_30px_rgba(37,99,235,0.25)]"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
        >
          Get Started <GeminiArrowRight className="h-5 w-5" />
        </motion.button>
      </BlurFade>
    </motion.div>
  );
}
