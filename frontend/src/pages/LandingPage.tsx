import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
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

// Better Tilt Card Helper
function EnhancedTiltCard({ children, className }: { children: React.ReactNode, className?: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Calculate rotation (-10 to 10 degrees)
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const rotateX = ((mouseY / height) - 0.5) * -20;
    const rotateY = ((mouseX / width) - 0.5) * 20;

    x.set(rotateX);
    y.set(rotateY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      className={`relative [perspective:1000px] ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: x,
        rotateY: y,
        transformStyle: "preserve-3d",
      }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <div style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d", height: "100%" }}>
        {children}
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const [currentSection, setCurrentSection] = useState(0);
  const totalSections = 3; // 0: Hero, 1: Capabilities, 2: Hackathon
  const isTransitioning = useRef(false);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isTransitioning.current) return;

      // Debounce threshold for wheel delta
      if (Math.abs(e.deltaY) < 30) return;

      if (e.deltaY > 0) {
        // Scroll down (next section)
        if (currentSection < totalSections - 1) {
          isTransitioning.current = true;
          setCurrentSection(prev => prev + 1);
          setTimeout(() => { isTransitioning.current = false; }, 1200); // 1.2s timeout prevents rapid fire skips
        }
      } else if (e.deltaY < 0) {
        // Scroll up (prev section)
        if (currentSection > 0) {
          isTransitioning.current = true;
          setCurrentSection(prev => prev - 1);
          setTimeout(() => { isTransitioning.current = false; }, 1200);
        }
      }
    };

    // Prevent default scrolling globally on the window
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [currentSection]);

  // Framer Motion variants for section transitions
  const sectionVariants: Variants = {
    initial: { opacity: 0, y: 50, filter: 'blur(10px)', scale: 0.95 },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)', scale: 1, transition: { duration: 0.8, ease: "easeOut" } },
    exit: { opacity: 0, y: -50, filter: 'blur(10px)', scale: 1.05, transition: { duration: 0.5, ease: "easeIn" } },
  };

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#020617] text-slate-100 font-sans selection:bg-sky-500/30">

      {/* 3D Immersive Background - Now listens to currentSection state instead of native scroll! */}
      <ThreeBackground currentSection={currentSection} />

      <CustomCursor />

      {/* Fixed UI Overlays */}
      <header className="fixed top-0 left-0 w-full z-50 border-b border-white/5 bg-slate-950/20 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
            <CustomIconSparkles className="h-5 w-5 text-sky-400" />
            <span className="pointer-events-auto">Gemini <span className="text-sky-400">Live 3D</span></span>
          </div>

          {/* Section Indicators */}
          <div className="hidden md:flex items-center gap-4">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                onClick={() => {
                  if (!isTransitioning.current) {
                    isTransitioning.current = true;
                    setCurrentSection(i);
                    setTimeout(() => { isTransitioning.current = false; }, 1200);
                  }
                }}
                className={`h-2 transition-all duration-500 rounded-full ${currentSection === i ? 'w-8 bg-sky-400' : 'w-2 bg-white/20 hover:bg-white/40'}`}
              />
            ))}
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <a href="https://github.com/anand-92/gemini-live-3d-bridge/releases/latest" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 hover:bg-white/20 transition-all border border-white/5 pointer-events-auto">
              <CustomIconDownload className="h-4 w-4" /> Download
            </a>
          </div>
        </div>
      </header>

      {/* Scrollytelling Container - Strictly strictly bounds the view, no scrollbars allowed */}
      <div className="absolute inset-0 w-full h-full pt-20 z-10 flex items-center justify-center">
        <AnimatePresence mode="wait">

          {/* ----- SECTION 0: HERO ----- */}
          {currentSection === 0 && (
            <motion.section
              key="section-0"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
            >
              <div className="group relative mb-8 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-5 py-2 text-xs font-medium tracking-widest text-sky-200 uppercase pointer-events-auto transition-all hover:bg-sky-500/20 hover:scale-105">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500"></span>
                </span>
                Gemini Live Interactive Demo
              </div>

              <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-400 md:text-7xl lg:text-7xl drop-shadow-sm leading-tight pb-2 pointer-events-auto">
                A live playground for <br /> <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-500">voice and 3D.</span>
              </h1>

              <p className="mt-6 max-w-2xl text-lg text-slate-300 md:text-xl font-light leading-relaxed pointer-events-auto">
                Talk with Gemini, steer the scene, iterate quickly, and even automate your desktop natively via Electron.
              </p>

              <div className="mt-8 text-sm text-slate-500 animate-pulse hidden md:block">
                Scroll down to explore
              </div>
            </motion.section>
          )}

          {/* ----- SECTION 1: CAPABILITIES ----- */}
          {currentSection === 1 && (
            <motion.section
              key="section-1"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute inset-0 flex flex-col items-center justify-center px-6 w-full max-w-7xl mx-auto"
            >
              <div className="mb-12 md:text-center pointer-events-auto">
                <h2 className="text-3xl font-bold md:text-5xl text-white">Experience True Synergy</h2>
                <p className="mt-4 text-slate-400 max-w-2xl mx-auto text-lg">Harness the multimodal capabilities of the Gemini model. Blend audio, vision, and contextual understanding in one fluid interface.</p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3 w-full">
                {capabilities.map(({ title, description, icon: Icon }, index) => (
                  <EnhancedTiltCard key={title} className="pointer-events-auto">
                    <motion.article
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 + index * 0.15 }}
                      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 p-8 backdrop-blur-xl transition-all duration-300 hover:border-sky-500/50 hover:bg-slate-900/60 shadow-[0_0_30px_-10px_rgba(14,165,233,0.1)] hover:shadow-[0_0_40px_-10px_rgba(14,165,233,0.4)] h-full"
                    >
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-slate-950 transition-colors duration-300">
                        <Icon className="h-7 w-7" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                      <p className="text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">{description}</p>
                    </motion.article>
                  </EnhancedTiltCard>
                ))}
              </div>
            </motion.section>
          )}

          {/* ----- SECTION 2: HACKATHON FOCUS ----- */}
          {currentSection === 2 && (
            <motion.section
              key="section-2"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute inset-0 flex flex-col items-center justify-center px-6 w-full max-w-7xl mx-auto"
            >
              <div className="w-full max-h-[80vh] overflow-y-auto pr-4 custom-scrollbar pointer-events-auto rounded-3xl border border-white/10 bg-[#060b1e]/60 backdrop-blur-3xl shadow-2xl relative">
                {/* Decorative glows */}
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
                        Redefining Interaction: From Static Chatbots to Immersive Experiences using Google’s Live API.
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
                    <EnhancedTiltCard>
                      <div className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-indigo-500/5 hover:border-indigo-500/30 transition-all backdrop-blur-sm h-full">
                        <div className="mb-4 text-indigo-400 bg-indigo-500/10 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <CustomIconMic className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Live Agents</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">Real-time Audio/Vision interaction. Build natural conversational agents hosted on Google Cloud.</p>
                      </div>
                    </EnhancedTiltCard>

                    <EnhancedTiltCard>
                      <div className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-sky-500/5 hover:border-sky-500/30 transition-all backdrop-blur-sm h-full">
                        <div className="mb-4 text-sky-400 bg-sky-500/10 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <CustomIconGlobe className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Creative Storyteller</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">Multimodal storytelling with interleaved text, images, audio, and video streams natively.</p>
                      </div>
                    </EnhancedTiltCard>

                    <EnhancedTiltCard>
                      <div className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all backdrop-blur-sm h-full">
                        <div className="mb-4 text-emerald-400 bg-emerald-500/10 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <CustomIconLayers className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">UI Navigator</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">Visual UI understanding. Agent acts as the user's hands, interpreting visuals and performing actions.</p>
                      </div>
                    </EnhancedTiltCard>
                  </div>

                  {/* Sub-scrollable area so we still have all info but it fits precisely in the viewport slide */}
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
                        <li><strong>Dates:</strong> Feb 16 – Mar 16, 2026. Winners announced at Google NEXT.</li>
                        <li><strong>Grand Prize (x1):</strong> $25,000 USD, $3k GCP Credits, Next '26 Tickets.</li>
                        <li><strong>Category Winners (x3):</strong> $10,000 USD, $1k GCP Credits, Next '26 Tickets.</li>
                        <li><strong>Subcategory (x3):</strong> $5,000 USD, $500 GCP Credits.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <footer className="w-full text-center text-sm text-slate-500 mt-6 relative z-20 pointer-events-auto">
                <p>© {new Date().getFullYear()} Gemini Live 3D Bridge. Built for the Google Live Agent Challenge.</p>
              </footer>
            </motion.section>
          )}

        </AnimatePresence>
      </div>
    </main>
  );
}
