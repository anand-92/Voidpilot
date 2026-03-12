import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { BlurFade } from '@/components/ui/blur-fade';
import { MagicCard } from '@/components/ui/magic-card';
import { Marquee } from '@/components/ui/marquee';
import AnimatedTextRoller from '@/components/shadcn-space/animated-text/animated-text-04';
import { voidpilotHeroItems } from '@/components/shadcn-space/animated-text/constants';
import { GeminiArrowRight } from '../icons/GeminiIcons';
import { PulseDot } from './PulseDot';
import { sectionVariants, indexCardVariants } from './LandingConstants';
import type { SectionId } from './LandingConstants';
import {
  IconOverviewOrbit,
  IconCapabilitiesConverge,
  IconHackathonLaunch,
  IconWalkthroughVoid,
  IconBrainstorm,
} from '../icons/CustomIcons';

const sections = [
  { id: 'hero' as SectionId, label: 'Overview', subtitle: 'Voice, vision, and desktop control', icon: IconOverviewOrbit, color: 'amber' },
  { id: 'capabilities' as SectionId, label: 'Capabilities', subtitle: 'Multimodal synergy', icon: IconCapabilitiesConverge, color: 'orange' },
  { id: 'hackathon' as SectionId, label: 'Hackathon', subtitle: 'Global challenge details', icon: IconHackathonLaunch, color: 'yellow' },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', glow: 'shadow-orange-500/20' },
  yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', glow: 'shadow-yellow-500/20' },
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', glow: 'shadow-rose-500/20' },
  stone: { bg: 'bg-stone-500/10', border: 'border-stone-500/20', text: 'text-stone-400', glow: 'shadow-stone-500/20' },
};

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

const socialProofItems = [
  'Voice in Real-time',
  'AI-Powered Assistance',
  '3D Scene Generation',
  'Hackathon Ready',
  'Multimodal Agents',
  'Built with Google GenAI SDK',
];

export interface IndexViewProps {
  onNavigate: (section: SectionId) => void;
  onWalkthroughOpen: () => void;
}

export function IndexView({ onNavigate, onWalkthroughOpen }: IndexViewProps) {
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
          <div className="rounded-[2rem] border border-white/10 bg-white/6 px-5 py-4 shadow-[0_0_60px_rgba(56,189,248,0.12)] backdrop-blur-xl md:px-8 md:py-6">
            <AnimatedTextRoller
              className="max-w-4xl text-center text-3xl font-extrabold tracking-tight leading-tight sm:text-5xl md:text-7xl"
              prefixClassName="font-extrabold tracking-tight text-white"
              itemClassName="font-extrabold"
              items={voidpilotHeroItems}
            />
          </div>
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
              className="h-full"
            >
              <MagicCard
                className="h-full rounded-2xl"
                gradientColor="#1c1917"
                gradientFrom="#d97706"
                gradientTo="#92400e"
                gradientOpacity={0.6}
              >
                <button
                  onClick={handleClick}
                  className={`group relative flex h-full w-full items-center gap-3 rounded-2xl p-3 text-left transition-all duration-300 md:block md:min-h-[250px] md:p-6`}
                >
                  <div className={`shrink-0 inline-flex h-9 w-9 md:h-11 md:w-11 md:mb-3 items-center justify-center rounded-xl ${colors?.bg} ${colors?.text}`}>
                    <Icon className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <div className="min-w-0 flex-1 md:flex md:min-h-[128px] md:flex-col md:justify-between">
                    <h3 className="text-base font-bold text-white md:mb-1 md:min-h-[56px] md:text-lg">{card.label}</h3>
                    <p className="text-xs leading-relaxed text-stone-500 md:min-h-[72px] md:text-sm">{card.subtitle}</p>
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
