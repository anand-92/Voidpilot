import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { ThreeBackground } from '../components/ThreeBackground';
import { CustomCursor } from '../components/CustomCursor';
import {
  CustomIconMic,
  CustomIconBox,
  CustomIconSparkles,
  CustomIconDownload,
  CustomIconCode,
  CustomIconTrophy,
  CustomIconGlobe,
  CustomIconLayers
} from '../components/icons/CustomIcons';

const capabilities = [
  {
    title: 'Voice chat that feels immediate',
    description: 'Speak naturally and get responses back in real time.',
    icon: CustomIconMic,
  },
  {
    title: 'Prompt-driven 3D scenes',
    description: 'Type an idea and watch the scene update without leaving the session.',
    icon: CustomIconBox,
  },
  {
    title: 'Faster creative iteration',
    description: 'Try a direction, tweak it, and compare results while you chat.',
    icon: CustomIconSparkles,
  },
];

type SectionId = 'index' | 'hero' | 'capabilities' | 'hackathon';

const SECTION_SCROLL_MAP: Record<SectionId, number> = {
  index: 0,
  hero: 0,
  capabilities: 1,
  hackathon: 2,
};

const sections: { id: SectionId; label: string; subtitle: string; icon: typeof CustomIconMic; color: string }[] = [
  { id: 'hero', label: 'Overview', subtitle: 'Voice and 3D playground', icon: CustomIconSparkles, color: 'sky' },
  { id: 'capabilities', label: 'Capabilities', subtitle: 'Multimodal synergy', icon: CustomIconLayers, color: 'indigo' },
  { id: 'hackathon', label: 'Hackathon', subtitle: 'Global challenge details', icon: CustomIconTrophy, color: 'emerald' },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  sky: { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400', glow: 'shadow-sky-500/20' },
  indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', glow: 'shadow-indigo-500/20' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
};

function PulseDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
    </span>
  );
}

const hackathonCards = [
  {
    title: 'Live Agents',
    description: 'Real-time Audio/Vision interaction. Build natural conversational agents hosted on Google Cloud.',
    icon: CustomIconMic,
    color: 'indigo' as const,
  },
  {
    title: 'Creative Storyteller',
    description: 'Multimodal storytelling with interleaved text, images, audio, and video streams natively.',
    icon: CustomIconGlobe,
    color: 'sky' as const,
  },
  {
    title: 'UI Navigator',
    description: 'Visual UI understanding. Agent acts as the user\'s hands, interpreting visuals and performing actions.',
    icon: CustomIconLayers,
    color: 'emerald' as const,
  },
];

const HACKATHON_COLOR_MAP: Record<string, { hover: string; hoverBorder: string; text: string; bg: string }> = {
  indigo: { hover: 'hover:bg-indigo-500/5', hoverBorder: 'hover:border-indigo-500/30', text: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  sky: { hover: 'hover:bg-sky-500/5', hoverBorder: 'hover:border-sky-500/30', text: 'text-sky-400', bg: 'bg-sky-500/10' },
  emerald: { hover: 'hover:bg-emerald-500/5', hoverBorder: 'hover:border-emerald-500/30', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
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

export default function LandingPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('index');
  const { progress: scrollProgress, scrollTo } = useAnimatedScroll();

  const navigateTo = useCallback((section: SectionId) => {
    scrollTo(SECTION_SCROLL_MAP[section]);
    setActiveSection(section);
  }, [scrollTo]);

  const goBack = useCallback(() => {
    scrollTo(0);
    setActiveSection('index');
  }, [scrollTo]);

  return (
    <main className="custom-cursor relative w-full h-screen overflow-hidden bg-[#060818] text-slate-100 font-sans selection:bg-sky-500/30">
      <div className="fixed top-0 left-0 w-full h-screen overflow-hidden">
        <ThreeBackground scrollProgress={scrollProgress} />
        <CustomCursor />

        <header className="fixed top-0 left-0 w-full z-50 border-b border-white/5 bg-slate-950/20 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <AnimatePresence mode="wait">
                {activeSection !== 'index' && (
                  <motion.button
                    key="back-btn"
                    initial={{ opacity: 0, x: -10, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -10, scale: 0.8 }}
                    transition={{ duration: 0.25 }}
                    onClick={goBack}
                    className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-white/20 hover:text-white transition-all border border-white/5 pointer-events-auto"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </motion.button>
                )}
              </AnimatePresence>
              <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
                <CustomIconSparkles className="h-5 w-5 text-sky-400" />
                <span className="pointer-events-auto">Gemini <span className="text-sky-400">Live 3D</span></span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
              <a href="https://github.com/anand-92/gemini-live-3d-bridge/releases/latest" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 hover:bg-white/20 transition-all border border-white/5 pointer-events-auto">
                <CustomIconDownload className="h-4 w-4" /> Download
              </a>
            </div>
          </div>
        </header>

        <div className="absolute inset-0 w-full h-full z-10">
          <AnimatePresence mode="wait">
            {activeSection === 'index' && (
              <IndexView key="index" onNavigate={navigateTo} />
            )}
            {activeSection === 'hero' && (
              <HeroSection key="hero" />
            )}
            {activeSection === 'capabilities' && (
              <CapabilitiesSection key="capabilities" />
            )}
            {activeSection === 'hackathon' && (
              <HackathonSection key="hackathon" />
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

function IndexView({ onNavigate }: { onNavigate: (section: SectionId) => void }) {
  return (
    <motion.div
      className="absolute inset-x-0 top-16 bottom-0 flex flex-col items-center justify-center px-6"
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-5 py-2 text-xs font-medium tracking-widest text-sky-200 uppercase pointer-events-auto"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <PulseDot />
        Gemini Live Interactive Demo
      </motion.div>

      <motion.h1
        className="max-w-4xl text-center text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-400 md:text-7xl drop-shadow-sm leading-tight pb-2 pointer-events-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.6 }}
      >
        A live playground for <br /> <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-500">voice and 3D.</span>
      </motion.h1>

      <motion.p
        className="mt-4 max-w-2xl text-center text-lg text-slate-300 md:text-xl font-light leading-relaxed pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        Talk with Gemini, steer the scene, iterate quickly, and even automate your desktop natively via Electron.
      </motion.p>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5 max-w-3xl w-full pointer-events-auto">
        {sections.map((section, i) => {
          const colors = COLOR_MAP[section.color];
          const Icon = section.icon;
          return (
            <motion.button
              key={section.id}
              custom={i}
              variants={indexCardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => onNavigate(section.id)}
              className={`group relative rounded-2xl border ${colors.border} ${colors.bg} p-6 text-left backdrop-blur-xl transition-all duration-300 hover:scale-[1.04] hover:shadow-lg hover:${colors.glow} active:scale-[0.98]`}
            >
              <div className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl ${colors.bg} ${colors.text}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{section.label}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{section.subtitle}</p>
              <ChevronRight className={`absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 ${colors.text} opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all`} />
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

function HeroSection() {
  return (
    <motion.div
      className="absolute inset-x-0 top-16 bottom-0 flex flex-col items-center justify-center px-6 text-center"
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="group relative mb-8 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-5 py-2 text-xs font-medium tracking-widest text-sky-200 uppercase pointer-events-auto transition-all hover:bg-sky-500/20 hover:scale-105">
        <PulseDot />
        Gemini Live Interactive Demo
      </div>

      <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-400 md:text-7xl drop-shadow-sm leading-tight pb-2 pointer-events-auto">
        A live playground for <br /> <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-500">voice and 3D.</span>
      </h1>

      <p className="mt-6 max-w-2xl text-lg text-slate-300 md:text-xl font-light leading-relaxed pointer-events-auto">
        Talk with Gemini, steer the scene, iterate quickly, and even automate your desktop natively via Electron.
      </p>

      <motion.a
        href="#/app"
        className="mt-10 inline-flex items-center gap-2 rounded-full bg-sky-500 px-8 py-3 text-base font-semibold text-slate-950 hover:bg-sky-400 transition-all pointer-events-auto"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
      >
        Launch App <ChevronRight className="h-5 w-5" />
      </motion.a>
    </motion.div>
  );
}

function CapabilitiesSection() {
  return (
    <motion.div
      className="absolute inset-x-0 top-16 bottom-0 flex flex-col items-center justify-center px-6 w-full"
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="max-w-7xl mx-auto w-full">
        <div className="mb-12 md:text-center pointer-events-auto">
          <h2 className="text-3xl font-bold md:text-5xl text-white">Experience True Synergy</h2>
          <p className="mt-4 text-slate-400 max-w-2xl mx-auto text-lg">Harness the multimodal capabilities of the Gemini model. Blend audio, vision, and contextual understanding in one fluid interface.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 w-full">
          {capabilities.map(({ title, description, icon: Icon }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.5, ease: EASE }}
            >
              <EnhancedTiltCard className="pointer-events-auto">
                <article className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 p-8 backdrop-blur-xl transition-all duration-300 hover:border-sky-500/50 hover:bg-slate-900/60 shadow-[0_0_30px_-10px_rgba(14,165,233,0.1)] hover:shadow-[0_0_40px_-10px_rgba(14,165,233,0.4)] h-full">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-slate-950 transition-colors duration-300">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                  <p className="text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">{description}</p>
                </article>
              </EnhancedTiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function HackathonSection() {
  return (
    <motion.div
      className="absolute inset-x-0 top-16 bottom-0 flex flex-col items-center justify-center px-6 w-full"
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="max-w-7xl mx-auto w-full max-h-[80vh] overflow-y-auto pr-4 custom-scrollbar pointer-events-auto rounded-3xl border border-white/10 bg-[#060b1e]/60 backdrop-blur-3xl shadow-2xl relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-500/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>

        <div className="p-8 md:p-14 relative z-10 w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-semibold text-indigo-300 mb-4">
                <CustomIconTrophy className="h-4 w-4" /> Global Challenge
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Gemini Live Agent</h2>
              <p className="mt-4 text-xl text-slate-300 max-w-2xl leading-relaxed">
                Redefining Interaction: From Static Chatbots to Immersive Experiences using Google's Live API.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <a href="https://geminiliveagentchallenge.devpost.com" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 text-sky-400 font-semibold hover:text-sky-300 hover:gap-3 transition-all bg-sky-500/10 px-6 py-3 rounded-full border border-sky-500/20 w-full md:w-auto">
                Register on Devpost <ChevronRight className="h-4 w-4" />
              </a>
              <a href="https://github.com/anand-92/gemini-live-3d-bridge" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 text-indigo-400 font-semibold hover:bg-white/5 transition-all px-6 py-3 rounded-full border border-white/10 w-full md:w-auto">
                View Source Code
              </a>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3 mb-10">
            {hackathonCards.map(({ title, description, icon: Icon, color }) => {
              const colors = HACKATHON_COLOR_MAP[color];
              return (
                <EnhancedTiltCard key={title}>
                  <div className={`group rounded-2xl border border-white/5 bg-white/[0.02] p-6 ${colors.hover} ${colors.hoverBorder} transition-all backdrop-blur-sm h-full`}>
                    <div className={`mb-4 ${colors.text} ${colors.bg} w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
                  </div>
                </EnhancedTiltCard>
              );
            })}
          </div>

          <div className="grid gap-8 md:grid-cols-2 mt-4 text-left">
            <div className="rounded-xl bg-black/40 p-6 border border-white/5 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CustomIconCode className="text-sky-400 h-5 w-5" /> Submission Requirements
              </h3>
              <ul className="list-inside list-disc space-y-2 text-sm text-slate-300">
                <li><strong>New Projects Only:</strong> Must be newly created during the contest period.</li>
                <li><strong>Google Cloud Native:</strong> Must use at least one Google Cloud service.</li>
                <li><strong>GenAI SDK:</strong> Agents must be built using Google GenAI SDK or Agent Development Kit.</li>
                <li><strong>Code & Demo:</strong> Include a public code repository with step-by-step spin-up instructions, visual architecture, and a 4min demo video.</li>
              </ul>
            </div>

            <div className="rounded-xl bg-black/40 p-6 border border-white/5 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CustomIconTrophy className="text-indigo-400 h-5 w-5" /> Prizes & Dates
              </h3>
              <ul className="list-inside list-disc space-y-3 text-sm text-slate-300">
                <li><strong>Dates:</strong> Feb 16 - Mar 16, 2026. Winners announced at Google NEXT.</li>
                <li><strong>Grand Prize (x1):</strong> $25,000 USD, $3k GCP Credits, Next '26 Tickets.</li>
                <li><strong>Category Winners (x3):</strong> $10,000 USD, $1k GCP Credits, Next '26 Tickets.</li>
                <li><strong>Subcategory (x3):</strong> $5,000 USD, $500 GCP Credits.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <footer className="w-full text-center text-sm text-slate-500 mt-6 relative z-20 pointer-events-auto">
        <p>&copy; {new Date().getFullYear()} Gemini Live 3D Bridge. Built for the Google Live Agent Challenge.</p>
      </footer>
    </motion.div>
  );
}
