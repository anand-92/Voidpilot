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
  IconHackathonLaunch,
  IconWalkthroughVoid,
  IconBrainstorm,
} from '../icons/CustomIcons';

const sections = [
  { id: 'hackathon' as SectionId, label: 'Hackathon', subtitle: 'Global challenge details', icon: IconHackathonLaunch, color: 'yellow' },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', glow: 'shadow-yellow-500/20' },
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', glow: 'shadow-rose-500/20' },
  stone: { bg: 'bg-stone-500/10', border: 'border-stone-500/20', text: 'text-stone-400', glow: 'shadow-stone-500/20' },
};

const indexCards = [
  ...sections.map((section) => ({
    key: section.id,
    label: section.label,
    subtitle: 'Built for the Gemini Live Agent Challenge — explore the hackathon categories, prizes, and submission details.',
    icon: section.icon,
    color: section.color,
  })),
  {
    key: 'walkthrough' as const,
    label: 'Talk to Voidpilot',
    subtitle: 'Have a real-time voice conversation with Gemini Live. Low-latency audio streaming with transcription — just press connect and start talking.',
    icon: IconWalkthroughVoid,
    color: 'rose',
  },
  {
    key: 'brainstorm' as const,
    label: 'Brainstorm Mode',
    subtitle: 'A creative workspace where you talk and Gemini generates images, videos, and documents in real time. Choose Open Studio or Creative Spark.',
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
          <div className="rounded-[2rem] border border-blue-500/20 bg-black/40 px-5 py-4 shadow-[0_0_60px_rgba(59,130,246,0.15)] backdrop-blur-xl md:px-8 md:py-6">
            <AnimatedTextRoller
              className="max-w-4xl text-center text-3xl font-extrabold tracking-tight leading-tight sm:text-5xl md:text-7xl"
              prefixClassName="font-extrabold tracking-tight text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              itemClassName="font-extrabold drop-shadow-[0_0_20px_rgba(59,130,246,0.8)]"
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

      <div className="mt-4 md:mt-10 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5 max-w-3xl w-full pointer-events-auto">
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
                className="h-full rounded-2xl bg-black/20 border-white/5"
                gradientColor="rgba(30, 58, 138, 0.4)"
                gradientFrom="#2563eb"
                gradientTo="#1e3a8a"
                gradientOpacity={0.6}
              >
                <button
                  onClick={handleClick}
                  className={`group relative flex h-full w-full items-center gap-3 rounded-2xl p-3 text-left transition-all duration-300 md:flex md:flex-col md:items-center md:text-center md:min-h-[280px] md:p-6`}
                >
                  <div className={`shrink-0 inline-flex h-12 w-12 md:h-16 md:w-16 md:mb-4 items-center justify-center rounded-2xl ${colors?.bg} ${colors?.text} transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className="h-6 w-6 md:h-8 md:w-8" />
                  </div>
                  <div className="min-w-0 flex-1 md:flex md:flex-col md:items-center">
                    <h3 className="text-base font-bold text-white md:mb-2 md:text-lg">{card.label}</h3>
                    <p className="text-xs leading-relaxed text-stone-500 md:text-sm">{card.subtitle}</p>
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
