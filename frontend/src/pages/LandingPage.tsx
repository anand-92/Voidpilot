import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue } from 'framer-motion';
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

// --- Helpers for continuous section visibility ---
// Each section is centered at its index (0, 1, 2). 
// Opacity is 1 when progress matches index, fades to 0 when distance >= fadeRange.
function sectionOpacity(progress: number, sectionIndex: number): number {
  const distance = Math.abs(progress - sectionIndex);
  const fadeRange = 0.5; // Over what distance does the section fully fade
  if (distance >= fadeRange) return 0;
  return 1 - (distance / fadeRange);
}

function sectionTranslateY(progress: number, sectionIndex: number): number {
  const diff = progress - sectionIndex;
  const fadeRange = 0.5;
  const clampedDiff = Math.max(-fadeRange, Math.min(fadeRange, diff));
  return -clampedDiff * (80 / fadeRange); // Moves from +80 to -80 as you scroll past
}

function sectionScale(progress: number, sectionIndex: number): number {
  const opacity = sectionOpacity(progress, sectionIndex);
  return 0.92 + opacity * 0.08; // Scale from 0.92 to 1.0
}

export default function LandingPage() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollVelocity = useRef(0);
  const lastTouchY = useRef<number | null>(null);
  const animFrameRef = useRef<number>(0);
  const totalSections = 2; // max value of scrollProgress (0 to 2)

// Smooth momentum-based scroll
  const momentumLoop = useRef(() => {});

  useEffect(() => {
    momentumLoop.current = () => {
      setScrollProgress(prev => {
        const next = prev + scrollVelocity.current;
        // Clamp to range
        const clamped = Math.max(0, Math.min(totalSections, next));

        // If we hit bounds, kill velocity
        if (clamped <= 0 || clamped >= totalSections) {
          scrollVelocity.current *= 0.3;
        }

        return clamped;
      });

      // Apply friction to velocity
      scrollVelocity.current *= 0.95;

      // Stop the loop if velocity is negligible
      if (Math.abs(scrollVelocity.current) > 0.0001) {
        animFrameRef.current = requestAnimationFrame(momentumLoop.current);
      }
    };
  }, []);

  useEffect(() => {
const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Normalize delta across browsers/trackpads (smaller = more granular)
      const delta = e.deltaY * 0.00015;

      // Add to velocity (momentum-based)
      scrollVelocity.current += delta;

      // Cap max velocity
      scrollVelocity.current = Math.max(-0.03, Math.min(0.03, scrollVelocity.current));

      // Start momentum loop if not running
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(momentumLoop.current);
    };

    const handleTouchStart = (e: TouchEvent) => {
      lastTouchY.current = e.touches[0].clientY;
      // Stop current momentum when user touches
      scrollVelocity.current = 0;
      cancelAnimationFrame(animFrameRef.current);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (lastTouchY.current === null) return;

      // If the target is within a scrollable container, don't prevent default or take over
      let target = e.target as HTMLElement | null;
      let isScrollableContainer = false;
      while (target && target !== document.body) {
        if (target.classList.contains('overflow-y-auto') || target.classList.contains('custom-scrollbar')) {
            const hasScrollableContent = target.scrollHeight > target.clientHeight;
            const isAtTop = target.scrollTop === 0;
            const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 1;

            const currentY = e.touches[0].clientY;
            const deltaY = lastTouchY.current - currentY;

            if (hasScrollableContent) {
              // If scrolling up (deltaY < 0) and at top, we want to handle it
              // If scrolling down (deltaY > 0) and at bottom, we want to handle it
              // Otherwise, let the container scroll natively
              if (!((deltaY < 0 && isAtTop) || (deltaY > 0 && isAtBottom))) {
                isScrollableContainer = true;
                break;
              }
            }
        }
        target = target.parentElement;
      }

      if (isScrollableContainer) {
        lastTouchY.current = e.touches[0].clientY;
        return;
      }

      e.preventDefault();

      const currentY = e.touches[0].clientY;
      const deltaY = lastTouchY.current - currentY;
      lastTouchY.current = currentY;

      // Normalize delta for touch (slightly different scale than wheel)
      const delta = deltaY * 0.002;

      scrollVelocity.current += delta;
      scrollVelocity.current = Math.max(-0.05, Math.min(0.05, scrollVelocity.current));

      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(momentumLoop.current);
    };

    const handleTouchEnd = () => {
      lastTouchY.current = null;
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Derive which section is "active" for indicators
  const activeSection = Math.round(scrollProgress);

  // Compute per-section visual properties
  const s0Opacity = sectionOpacity(scrollProgress, 0);
  const s1Opacity = sectionOpacity(scrollProgress, 1);
  const s2Opacity = sectionOpacity(scrollProgress, 2);
  const s0Y = sectionTranslateY(scrollProgress, 0);
  const s1Y = sectionTranslateY(scrollProgress, 1);
  const s2Y = sectionTranslateY(scrollProgress, 2);
  const s0Scale = sectionScale(scrollProgress, 0);
  const s1Scale = sectionScale(scrollProgress, 1);
  const s2Scale = sectionScale(scrollProgress, 2);

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#020617] text-slate-100 font-sans selection:bg-sky-500/30">

      <ThreeBackground scrollProgress={scrollProgress} />

      <CustomCursor />

      {/* Fixed Header */}
      <header className="fixed top-0 left-0 w-full z-50 border-b border-white/5 bg-slate-950/20 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
            <CustomIconSparkles className="h-5 w-5 text-sky-400" />
            <span className="pointer-events-auto">Gemini <span className="text-sky-400">Live 3D</span></span>
          </div>

          {/* Progress Indicators */}
          <div className="hidden md:flex items-center gap-4">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                onClick={() => {
                  // Animate smoothly to section
                  scrollVelocity.current = (i - scrollProgress) * 0.05;
                  cancelAnimationFrame(animFrameRef.current);
                  animFrameRef.current = requestAnimationFrame(momentumLoop.current);
                }}
                className={`h-2 transition-all duration-500 rounded-full ${activeSection === i ? 'w-8 bg-sky-400' : 'w-2 bg-white/20 hover:bg-white/40'}`}
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

      {/* Continuous Content Layers - all rendered simultaneously, opacity-driven */}
      <div className="absolute inset-0 w-full h-full pt-20 z-10">

        {/* SECTION 0: HERO */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
          style={{
            opacity: s0Opacity,
            transform: `translateY(${s0Y}px) scale(${s0Scale})`,
            pointerEvents: s0Opacity > 0.3 ? 'auto' : 'none',
            transition: 'none', // No CSS transition — driven by JS
          }}
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
        </div>

        {/* SECTION 1: CAPABILITIES */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center px-6 w-full"
          style={{
            opacity: s1Opacity,
            transform: `translateY(${s1Y}px) scale(${s1Scale})`,
            pointerEvents: s1Opacity > 0.3 ? 'auto' : 'none',
          }}
        >
          <div className="max-w-7xl mx-auto w-full">
            <div className="mb-12 md:text-center pointer-events-auto">
              <h2 className="text-3xl font-bold md:text-5xl text-white">Experience True Synergy</h2>
              <p className="mt-4 text-slate-400 max-w-2xl mx-auto text-lg">Harness the multimodal capabilities of the Gemini model. Blend audio, vision, and contextual understanding in one fluid interface.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 w-full">
              {capabilities.map(({ title, description, icon: Icon }) => (
                <EnhancedTiltCard key={title} className="pointer-events-auto">
                  <article className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 p-8 backdrop-blur-xl transition-all duration-300 hover:border-sky-500/50 hover:bg-slate-900/60 shadow-[0_0_30px_-10px_rgba(14,165,233,0.1)] hover:shadow-[0_0_40px_-10px_rgba(14,165,233,0.4)] h-full">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-slate-950 transition-colors duration-300">
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                    <p className="text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">{description}</p>
                  </article>
                </EnhancedTiltCard>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 2: HACKATHON */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center px-6 w-full"
          style={{
            opacity: s2Opacity,
            transform: `translateY(${s2Y}px) scale(${s2Scale})`,
            pointerEvents: s2Opacity > 0.3 ? 'auto' : 'none',
          }}
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
        </div>

      </div>
    </main>
  );
}
