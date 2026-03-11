import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { GeminiArrowRight, GeminiArrowLeft } from '../components/icons/GeminiIcons';
import { ThreeBackground } from '../components/ThreeBackground';
import { CustomCursor } from '../components/CustomCursor';
import { useWebHaptics } from 'web-haptics/react';
import {
  GeminiLiveLogo,
  IconOverviewOrbit,
  IconCapabilitiesConverge,
  IconHackathonLaunch,
  IconVoiceWaveform,
  IconScene3D,
  IconIterationLoop,
  IconLiveAgent,
  IconStoryteller,
  IconUINavigator,
  IconWalkthroughVoid,
  IconBrainstorm,
  CustomIconDownload,
  CustomIconCode,
  CustomIconTrophy,
} from '../components/icons/CustomIcons';
import WalkthroughModal from '../components/WalkthroughModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SparklesText } from '@/components/ui/sparkles-text';
import { BlurFade } from '@/components/ui/blur-fade';
import { MagicCard } from '@/components/ui/magic-card';
import { DotPattern } from '@/components/ui/dot-pattern';
import { Marquee } from '@/components/ui/marquee';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
import { BorderBeam } from '@/components/ui/border-beam';
import { cn } from '@/lib/utils';

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

type SectionId = 'index' | 'hero' | 'capabilities' | 'hackathon';

const SECTION_SCROLL_MAP: Record<SectionId, number> = {
  index: 0,
  hero: 0,
  capabilities: 1,
  hackathon: 2,
};

const sections: { id: SectionId; label: string; subtitle: string; icon: typeof IconOverviewOrbit; color: string }[] = [
  { id: 'hero', label: 'Overview', subtitle: 'Voice, vision, and desktop control', icon: IconOverviewOrbit, color: 'amber' },
  { id: 'capabilities', label: 'Capabilities', subtitle: 'Multimodal synergy', icon: IconCapabilitiesConverge, color: 'orange' },
  { id: 'hackathon', label: 'Hackathon', subtitle: 'Global challenge details', icon: IconHackathonLaunch, color: 'yellow' },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', glow: 'shadow-orange-500/20' },
  yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', glow: 'shadow-yellow-500/20' },
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', glow: 'shadow-rose-500/20' },
  stone: { bg: 'bg-stone-500/10', border: 'border-stone-500/20', text: 'text-stone-400', glow: 'shadow-stone-500/20' },
};

function PulseDot() {
  return (
    <span className="relative flex size-2">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
      <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
    </span>
  );
}

const hackathonCards = [
  {
    title: 'Live Agents',
    description: 'Real-time Audio/Vision interaction. Build natural conversational agents hosted on Google Cloud.',
    icon: IconLiveAgent,
    color: 'amber' as const,
  },
  {
    title: 'Creative Storyteller',
    description: 'Multimodal storytelling with interleaved text, images, audio, and video streams natively.',
    icon: IconStoryteller,
    color: 'orange' as const,
  },
  {
    title: 'UI Navigator',
    description: 'Visual UI understanding. Agent acts as the user\'s hands, interpreting visuals and performing actions.',
    icon: IconUINavigator,
    color: 'yellow' as const,
  },
];

const HACKATHON_COLOR_MAP: Record<string, { hover: string; hoverBorder: string; text: string; bg: string }> = {
  amber: { hover: 'hover:bg-amber-500/5', hoverBorder: 'hover:border-amber-500/20', text: 'text-amber-400', bg: 'bg-amber-500/10' },
  orange: { hover: 'hover:bg-orange-500/5', hoverBorder: 'hover:border-orange-500/20', text: 'text-orange-400', bg: 'bg-orange-500/10' },
  yellow: { hover: 'hover:bg-yellow-500/5', hoverBorder: 'hover:border-yellow-500/20', text: 'text-yellow-400', bg: 'bg-yellow-500/10' },
};

function EnhancedTiltCard({ children, className }: { children: React.ReactNode, className?: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(((mouseY / rect.height) - 0.5) * -20);
    y.set(((mouseX / rect.width) - 0.5) * 20);
  };

  const handleMouseLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      className={`relative [perspective:1000px] ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX: x, rotateY: y, transformStyle: "preserve-3d" }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <div style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d", height: "100%" }}>
        {children}
      </div>
    </motion.div>
  );
}

const EASE = [0.22, 1, 0.36, 1] as const;

const sectionVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 40, filter: 'blur(8px)' },
  visible: {
    opacity: 1, scale: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.6, ease: EASE },
  },
  exit: {
    opacity: 0, scale: 0.95, y: -30, filter: 'blur(6px)',
    transition: { duration: 0.35, ease: EASE },
  },
};

const indexCardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.1, duration: 0.5, ease: EASE },
  }),
  exit: (i: number) => ({
    opacity: 0, scale: 0.85, y: -20,
    transition: { delay: i * 0.05, duration: 0.3, ease: EASE },
  }),
};

function useAnimatedScroll() {
  const [progress, setProgress] = useState(0);
  const currentRef = useRef(0);
  const targetRef = useRef(0);
  const isAnimating = useRef(false);
  const rafId = useRef(0);

  useEffect(() => () => cancelAnimationFrame(rafId.current), []);

  const scrollTo = useCallback((value: number) => {
    targetRef.current = value;
    if (isAnimating.current) return;
    isAnimating.current = true;

    const tick = () => {
      const diff = targetRef.current - currentRef.current;
      if (Math.abs(diff) < 0.001) {
        currentRef.current = targetRef.current;
        setProgress(targetRef.current);
        isAnimating.current = false;
        return;
      }
      currentRef.current += diff * 0.08;
      setProgress(currentRef.current);
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
  }, []);

  return { progress, scrollTo };
}

/* Marquee social proof items */
const socialProofItems = [
  'Voice + Vision in Real-time',
  'Desktop Automation via Gemini',
  '3D Scene Generation',
  'Hackathon Ready',
  'Multimodal Agents',
  'Built with Google GenAI SDK',
];

export default function LandingPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('index');
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);
  const { progress: scrollProgress, scrollTo } = useAnimatedScroll();
  const haptic = useWebHaptics();

  const navigateTo = useCallback((section: SectionId) => {
    haptic.trigger('selection');
    scrollTo(SECTION_SCROLL_MAP[section]);
    setActiveSection(section);
  }, [scrollTo, haptic]);

  const goBack = useCallback(() => {
    haptic.trigger('light');
    scrollTo(0);
    setActiveSection('index');
  }, [scrollTo, haptic]);

  const openWalkthrough = useCallback(() => {
    haptic.trigger('selection');
    setIsWalkthroughOpen(true);
  }, [haptic]);

  const closeWalkthrough = useCallback(() => {
    setIsWalkthroughOpen(false);
  }, []);

  const triggerSuccess = useCallback(() => haptic.trigger('success'), [haptic]);
  const triggerLight = useCallback(() => haptic.trigger('light'), [haptic]);

  return (
    <main
      className={`${isWalkthroughOpen ? '' : 'custom-cursor '}relative h-screen w-full overflow-hidden bg-[#0c0a09] font-sans text-stone-100 selection:bg-amber-500/30`}
    >
      <div className="fixed top-0 left-0 w-full h-screen overflow-hidden">
        <ThreeBackground scrollProgress={scrollProgress} />
        <DotPattern
          className="absolute inset-0 z-[1] text-amber-500/[0.04]"
          width={24}
          height={24}
          cr={0.8}
        />
        {!isWalkthroughOpen && <CustomCursor />}

        <header className="fixed top-0 left-0 w-full z-50 border-b border-white/[0.04] bg-stone-950/30 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <AnimatePresence mode="wait">
                {activeSection !== 'index' && (
                  <motion.div
                    key="back-btn"
                    initial={{ opacity: 0, x: -10, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -10, scale: 0.8 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goBack}
                      className="gap-1.5 rounded-full border-stone-700 bg-stone-800/60 text-stone-300 hover:bg-stone-800 hover:text-white pointer-events-auto"
                    >
                      <GeminiArrowLeft data-icon="inline-start" />
                      Back
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
                <GeminiLiveLogo className="h-6 w-6 text-amber-500" />
                <span className="pointer-events-auto">Void<span className="text-amber-400">pilot</span></span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-300">
              <Button
                variant="outline"
                size="sm"
                render={<a href="https://github.com/anand-92/gemini-live-3d-bridge/releases/latest" target="_blank" rel="noreferrer" />}
                className="gap-2 rounded-full border-stone-700 bg-stone-800/60 hover:bg-stone-800 pointer-events-auto"
              >
                <CustomIconDownload data-icon="inline-start" />
                Download
              </Button>
            </div>
          </div>
        </header>

        <div className="absolute inset-0 w-full h-full z-10">
          <AnimatePresence mode="wait">
            {activeSection === 'index' && (
              <IndexView key="index" onNavigate={navigateTo} onWalkthroughOpen={openWalkthrough} />
            )}
            {activeSection === 'hero' && (
              <HeroSection key="hero" onLaunch={triggerSuccess} />
            )}
            {activeSection === 'capabilities' && (
              <CapabilitiesSection key="capabilities" onCardTap={triggerLight} />
            )}
            {activeSection === 'hackathon' && (
              <HackathonSection key="hackathon" onCardTap={triggerLight} />
            )}
          </AnimatePresence>
        </div>
      </div>

      <WalkthroughModal isOpen={isWalkthroughOpen} onClose={closeWalkthrough} />
    </main>
  );
}

interface IndexViewProps {
  onNavigate: (section: SectionId) => void;
  onWalkthroughOpen: () => void;
}

const indexCards = [
  ...sections.map((section) => ({
    key: section.id,
    label: section.label,
    subtitle: section.subtitle,
    icon: section.icon,
    color: section.color,
  })),
  {
    key: 'walkthrough' as const,
    label: 'Talk to Voidpilot',
    subtitle: 'Voice walkthrough agent',
    icon: IconWalkthroughVoid,
    color: 'rose',
  },
  {
    key: 'brainstorm' as const,
    label: 'Brainstorm Mode',
    subtitle: 'Voice-driven ideation',
    icon: IconBrainstorm,
    color: 'stone',
  },
];

function IndexView({ onNavigate, onWalkthroughOpen }: IndexViewProps) {
  return (
    <motion.div
      className="absolute inset-x-0 top-16 bottom-0 flex flex-col items-center justify-center px-4 md:px-6"
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <BlurFade delay={0.1}>
        <div className="mb-2 md:mb-4 pointer-events-auto">
          <Badge
            variant="outline"
            className="h-auto gap-2 rounded-full border-amber-500/20 bg-amber-500/10 px-3 md:px-5 py-1.5 md:py-2 text-[10px] md:text-xs font-medium tracking-widest text-amber-200 uppercase"
          >
            <PulseDot />
            Voidpilot — Live AI Desktop Agent
          </Badge>
        </div>
      </BlurFade>

      <BlurFade delay={0.15}>
        <div className="pointer-events-auto">
          <SparklesText
            className="max-w-4xl text-center text-3xl font-extrabold tracking-tight sm:text-5xl md:text-7xl leading-tight pb-1 md:pb-2"
            colors={{ first: '#d97706', second: '#fbbf24' }}
            sparklesCount={6}
          >
            AI that sees, hears, and takes the wheel.
          </SparklesText>
        </div>
      </BlurFade>

      <BlurFade delay={0.25}>
        <p className="mt-2 md:mt-4 max-w-2xl text-center text-sm text-stone-400 sm:text-lg md:text-xl font-light leading-relaxed pointer-events-auto">
          Talk to Gemini, steer the scene, and let it drive your desktop — all in real time.
        </p>
      </BlurFade>

      <div className="mt-4 md:mt-10 grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-5 max-w-5xl w-full pointer-events-auto">
        {indexCards.map((card, i) => {
          const colors = COLOR_MAP[card.color];
          const Icon = card.icon;
          const handleClick = () => {
            if (card.key === 'walkthrough') {
              onWalkthroughOpen();
            } else if (card.key === 'brainstorm') {
              window.location.hash = '#/brainstorm';
            } else {
              onNavigate(card.key as SectionId);
            }
          };
          return (
            <motion.div
              key={card.key}
              custom={i}
              variants={indexCardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <MagicCard
                className="rounded-2xl"
                gradientColor="#1c1917"
                gradientFrom="#d97706"
                gradientTo="#92400e"
                gradientOpacity={0.6}
              >
                <button
                  onClick={handleClick}
                  className={`group relative w-full rounded-2xl p-3 md:p-6 text-left transition-all duration-300 flex items-center gap-3 md:block`}
                >
                  <div className={`shrink-0 inline-flex h-9 w-9 md:h-11 md:w-11 md:mb-3 items-center justify-center rounded-xl ${colors?.bg} ${colors?.text}`}>
                    <Icon className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <div className="min-w-0 flex-1 md:flex-none">
                    <h3 className="text-base md:text-lg font-bold text-white md:mb-1">{card.label}</h3>
                    <p className="text-xs md:text-sm text-stone-500 leading-relaxed">{card.subtitle}</p>
                  </div>
                  <GeminiArrowRight className={`shrink-0 h-5 w-5 ${colors?.text} md:absolute md:right-4 md:top-1/2 md:-translate-y-1/2 opacity-50 md:opacity-0 md:group-hover:opacity-100 md:group-hover:translate-x-1 transition-all`} />
                </button>
              </MagicCard>
            </motion.div>
          );
        })}
      </div>

      {/* Subtle marquee for social proof */}
      <BlurFade delay={0.6} className="w-full max-w-5xl mt-6 md:mt-10 pointer-events-auto">
        <Marquee pauseOnHover className="[--duration:30s] [--gap:2rem] opacity-40">
          {socialProofItems.map((item) => (
            <span key={item} className="text-xs font-medium text-stone-500 uppercase tracking-widest whitespace-nowrap">
              {item}
            </span>
          ))}
        </Marquee>
      </BlurFade>
    </motion.div>
  );
}

function HeroSection({ onLaunch }: { onLaunch: () => void }) {
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
          href="#/app"
          onClick={onLaunch}
          className="mt-6 md:mt-10 inline-flex items-center gap-2 rounded-full bg-amber-600 px-6 md:px-8 py-2.5 md:py-3 text-sm md:text-base font-semibold text-stone-950 hover:bg-amber-500 transition-all pointer-events-auto shadow-[0_8px_30px_rgba(217,119,6,0.25)]"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
        >
          Launch App <GeminiArrowRight className="h-5 w-5" />
        </motion.a>
      </BlurFade>
    </motion.div>
  );
}

function CapabilitiesSection({ onCardTap }: { onCardTap: () => void }) {
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

function HackathonSection({ onCardTap }: { onCardTap: () => void }) {
  return (
    <motion.div
      className="absolute inset-x-0 top-16 bottom-0 flex flex-col items-center justify-center px-6 w-full"
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="max-w-7xl mx-auto w-full max-h-[80vh] overflow-y-auto pr-4 custom-scrollbar pointer-events-auto rounded-3xl border border-white/[0.06] bg-stone-950/70 backdrop-blur-3xl shadow-2xl relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
        <BorderBeam size={80} duration={8} colorFrom="#d97706" colorTo="#b45309" />

        <div className="p-8 md:p-14 relative z-10 w-full">
          <BlurFade delay={0.1}>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
              <div>
                <Badge
                  variant="outline"
                  className="mb-4 h-auto gap-2 rounded-full border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-sm font-semibold text-amber-300"
                >
                  <CustomIconTrophy className="size-4" /> Global Challenge
                </Badge>
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Gemini Live Agent Challenge</h2>
                <p className="mt-4 text-xl text-stone-400 max-w-2xl leading-relaxed">
                  Redefining Interaction: From Static Chatbots to Immersive Experiences using Google's Live API.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  variant="outline"
                  render={<a href="https://geminiliveagentchallenge.devpost.com" target="_blank" rel="noreferrer" />}
                  className="h-auto gap-2 rounded-full border-amber-500/20 bg-amber-500/10 px-6 py-3 font-semibold text-amber-400 hover:text-amber-300 w-full md:w-auto"
                >
                  Register on Devpost <GeminiArrowRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  render={<a href="https://github.com/anand-92/gemini-live-3d-bridge" target="_blank" rel="noreferrer" />}
                  className="h-auto gap-2 rounded-full border-stone-700 px-6 py-3 font-semibold text-stone-400 hover:bg-white/5 w-full md:w-auto"
                >
                  View Source Code
                </Button>
              </div>
            </div>
          </BlurFade>

          <div className="grid gap-6 md:grid-cols-3 mb-10">
            {hackathonCards.map(({ title, description, icon: Icon, color }, i) => {
              const colors = HACKATHON_COLOR_MAP[color];
              return (
                <BlurFade key={title} delay={0.2 + i * 0.1}>
                  <EnhancedTiltCard>
                    <MagicCard
                      className="rounded-2xl h-full"
                      gradientColor="#1c1917"
                      gradientFrom="#d97706"
                      gradientTo="#92400e"
                      gradientOpacity={0.4}
                    >
                      <div onTouchStart={onCardTap} className={`group p-6 ${colors.hover} transition-all h-full`}>
                        <div className={cn('mb-4 size-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform', colors.text, colors.bg)}>
                          <Icon className="size-6" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                        <p className="text-sm text-stone-500 leading-relaxed">{description}</p>
                      </div>
                    </MagicCard>
                  </EnhancedTiltCard>
                </BlurFade>
              );
            })}
          </div>

          <div className="grid gap-8 md:grid-cols-2 mt-4 text-left">
            <BlurFade delay={0.4}>
              <div className="rounded-xl bg-stone-900/60 p-6 border border-white/[0.04]">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CustomIconCode className="text-amber-400 h-5 w-5" /> Submission Requirements
                </h3>
                <ul className="list-inside list-disc space-y-2 text-sm text-stone-400">
                  <li><strong className="text-stone-200">New Projects Only:</strong> Must be newly created during the contest period.</li>
                  <li><strong className="text-stone-200">Google Cloud Native:</strong> Must use at least one Google Cloud service.</li>
                  <li><strong className="text-stone-200">GenAI SDK:</strong> Agents must be built using Google GenAI SDK or Agent Development Kit.</li>
                  <li><strong className="text-stone-200">Code & Demo:</strong> Include a public code repository with step-by-step spin-up instructions, visual architecture, and a 4min demo video.</li>
                </ul>
              </div>
            </BlurFade>

            <BlurFade delay={0.5}>
              <div className="rounded-xl bg-stone-900/60 p-6 border border-white/[0.04]">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CustomIconTrophy className="text-amber-400 h-5 w-5" /> Prizes & Dates
                </h3>
                <ul className="list-inside list-disc space-y-3 text-sm text-stone-400">
                  <li><strong className="text-stone-200">Dates:</strong> Feb 16 - Mar 16, 2026. Winners announced at Google NEXT.</li>
                  <li><strong className="text-stone-200">Grand Prize (x1):</strong> $25,000 USD, $3k GCP Credits, Next '26 Tickets.</li>
                  <li><strong className="text-stone-200">Category Winners (x3):</strong> $10,000 USD, $1k GCP Credits, Next '26 Tickets.</li>
                  <li><strong className="text-stone-200">Subcategory (x3):</strong> $5,000 USD, $500 GCP Credits.</li>
                </ul>
              </div>
            </BlurFade>
          </div>
        </div>
      </div>

      <footer className="w-full text-center text-sm text-stone-600 mt-6 relative z-20 pointer-events-auto">
        <Separator className="mb-4 bg-white/[0.04]" />
        <p>&copy; {new Date().getFullYear()} Voidpilot. Built for the Gemini Live Agent Challenge.</p>
      </footer>
    </motion.div>
  );
}
