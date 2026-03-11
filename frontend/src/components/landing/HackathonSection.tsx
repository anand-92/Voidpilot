import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BlurFade } from '@/components/ui/blur-fade';
import { MagicCard } from '@/components/ui/magic-card';
import { Separator } from '@/components/ui/separator';
import { BorderBeam } from '@/components/ui/border-beam';
import { EnhancedTiltCard } from './EnhancedTiltCard';
import { sectionVariants } from './LandingConstants';
import { GeminiArrowRight } from '../icons/GeminiIcons';
import { cn } from '@/lib/utils';
import {
  IconLiveAgent,
  IconStoryteller,
  IconUINavigator,
  CustomIconCode,
  CustomIconTrophy,
} from '../icons/CustomIcons';

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

export function HackathonSection({ onCardTap }: { onCardTap: () => void }) {
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
                        <p className="text-sm text-stone-300 leading-relaxed">{description}</p>
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
