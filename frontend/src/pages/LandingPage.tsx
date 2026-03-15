import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebHaptics } from 'web-haptics/react';
import { GeminiArrowLeft } from '../components/icons/GeminiIcons';
import { ThreeBackground } from '../components/ThreeBackground';
import { CustomCursor } from '../components/CustomCursor';
import { GeminiLiveLogo } from '../components/icons/CustomIcons';
import WalkthroughOverlay from '../components/walkthrough/WalkthroughOverlay';
import { Button } from '@/components/ui/button';
import { DotPattern } from '@/components/ui/dot-pattern';

import { IndexView } from '../components/landing/IndexView';
import { HeroSection } from '../components/landing/HeroSection';
import { CapabilitiesSection } from '../components/landing/CapabilitiesSection';
import { HackathonSection } from '../components/landing/HackathonSection';
import { useAnimatedScroll } from '../components/landing/useAnimatedScroll';
import { SECTION_SCROLL_MAP, type SectionId } from '../components/landing/LandingConstants';

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
      className={`${isWalkthroughOpen ? '' : 'custom-cursor '}relative h-screen w-full overflow-hidden bg-black font-sans text-stone-100 selection:bg-amber-500/30`}
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

      <WalkthroughOverlay isOpen={isWalkthroughOpen} onClose={closeWalkthrough} />
    </main>
  );
}
