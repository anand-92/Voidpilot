import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { BlurFade } from '@/components/ui/blur-fade';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
import { GeminiArrowRight } from '../icons/GeminiIcons';
import { PulseDot } from './PulseDot';
import { sectionVariants } from './LandingConstants';

export function HeroSection({ onLaunch }: { onLaunch: () => void }) {
  const isElectron = /electron/i.test(navigator.userAgent.toLowerCase()) || window.electronAPI !== undefined;

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
          className="group relative mb-4 md:mb-8 h-auto gap-2 rounded-full border-amber-500/20 bg-amber-500/10 px-3 md:px-5 py-1.5 md:py-2 text-[10px] md:text-xs font-medium tracking-widest text-amber-200 uppercase pointer-events-auto transition-all hover:bg-amber-500/20 hover:scale-105"
        >
          <PulseDot />
          Voidpilot — Live AI Desktop Agent
        </Badge>
      </BlurFade>

      <BlurFade delay={0.15}>
        <h1 className="max-w-4xl text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-stone-200 to-stone-500 sm:text-5xl md:text-7xl drop-shadow-sm leading-tight pb-1 md:pb-2 pointer-events-auto">
          AI that sees, hears, <br /> <AnimatedGradientText colorFrom="#d97706" colorTo="#fbbf24" className="text-3xl sm:text-5xl md:text-7xl font-extrabold">and takes the wheel.</AnimatedGradientText>
        </h1>
      </BlurFade>

      <BlurFade delay={0.25}>
        <p className="mt-3 md:mt-6 max-w-2xl text-sm text-stone-400 sm:text-lg md:text-xl font-light leading-relaxed pointer-events-auto">
          Talk to Gemini, steer the scene, and let it drive your desktop — all in real time.
        </p>
      </BlurFade>

      <BlurFade delay={0.35}>
        <motion.a
          href={isElectron ? "#/" : "https://github.com/anand-92/gemini-live-3d-bridge/releases/latest"}
          target={isElectron ? undefined : "_blank"}
          rel={isElectron ? undefined : "noreferrer"}
          onClick={isElectron ? onLaunch : undefined}
          className="mt-6 md:mt-10 inline-flex items-center gap-2 rounded-full bg-amber-600 px-6 md:px-8 py-2.5 md:py-3 text-sm md:text-base font-semibold text-stone-950 hover:bg-amber-500 transition-all pointer-events-auto shadow-[0_8px_30px_rgba(217,119,6,0.25)]"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
        >
          {isElectron ? "Launch App" : "Download App"} <GeminiArrowRight className="h-5 w-5" />
        </motion.a>
      </BlurFade>
    </motion.div>
  );
}
