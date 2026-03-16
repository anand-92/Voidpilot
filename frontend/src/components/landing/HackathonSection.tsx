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
  CustomIconCode,
  CustomIconTrophy,
} from '../icons/CustomIcons';

const hackathonCards = [
  {
    title: 'Realtime Gemini Live',
    description: 'Voidpilot uses the Google GenAI SDK with Gemini Live for bidirectional audio conversation, live transcription, session resumption, and context window compression.',
    icon: IconLiveAgent,
    color: 'amber' as const,
  },
  {
    title: 'Grounded Walkthroughs',
    description: 'Walkthrough mode uses a server-side search_project_context tool backed by Gemini File Search so project answers come from retrieved project context.',
    icon: IconStoryteller,
    color: 'orange' as const,
  },
  {
    title: 'Creative Generation',
    description: 'Brainstorm flows use Gemini 3.1 Flash Image for images, Gemini 3.1 Flash Lite and Pro options for delegated text work, and Veo 3.1 for video generation.',
    icon: CustomIconCode,
    color: 'yellow' as const,
  },
];

const HACKATHON_COLOR_MAP: Record<string, { hover: string; hoverBorder: string; text: string; bg: string }> = {
  amber: { hover: 'hover:bg-blue-500/5', hoverBorder: 'hover:border-blue-500/20', text: 'text-blue-400', bg: 'bg-blue-500/10' },
  orange: { hover: 'hover:bg-blue-500/5', hoverBorder: 'hover:border-blue-500/20', text: 'text-blue-400', bg: 'bg-blue-500/10' },
  yellow: { hover: 'hover:bg-blue-500/5', hoverBorder: 'hover:border-blue-500/20', text: 'text-blue-400', bg: 'bg-blue-500/10' },
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
      <div className="max-w-7xl mx-auto w-full max-h-[80vh] overflow-y-auto pr-4 custom-scrollbar pointer-events-auto rounded-3xl border border-white/[0.06] bg-stone-950/40 backdrop-blur-xl shadow-2xl relative">
        <BorderBeam size={80} duration={8} colorFrom="#38bdf8" colorTo="#818cf8" />

        <div className="p-8 md:p-14 relative z-10 w-full">
          <BlurFade delay={0.1}>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
              <div>
                <Badge
                  variant="outline"
                  className="mb-4 h-auto gap-2 rounded-full border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm font-semibold text-blue-300"
                >
                  <CustomIconTrophy className="size-4" /> Contest Submission
                </Badge>
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Gemini Live Agent Challenge</h2>
                <p className="mt-4 text-xl text-stone-400 max-w-2xl leading-relaxed">
                  Voidpilot is a voice-first multimodal web app built around Gemini, with realtime conversation, grounded retrieval, and live creative generation at the center of the experience.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  variant="outline"
                  render={<a href="https://hackathon.remembr-ai.com" target="_blank" rel="noreferrer" />}
                  className="h-auto gap-2 rounded-full border-blue-500/20 bg-blue-500/10 px-6 py-3 font-semibold text-blue-400 hover:text-blue-300 w-full md:w-auto"
                >
                  Open Live Demo <GeminiArrowRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  render={<a href="https://github.com/AshishT558/gemini-live-3d-bridge" target="_blank" rel="noreferrer" />}
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
                      className="rounded-2xl h-full bg-black/20"
                      gradientColor="rgba(56, 189, 248, 0.15)"
                      gradientFrom="#38bdf8"
                      gradientTo="#818cf8"
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
                  <CustomIconCode className="text-blue-400 h-5 w-5" /> Gemini Integration
                </h3>
                <p className="text-sm leading-7 text-stone-400">
                  Voidpilot is a voice-first multimodal web app built around Gemini. Its core interaction uses the Google GenAI SDK with the Gemini Live API model <span className="text-stone-200">gemini-2.5-flash-native-audio-preview-12-2025</span>, which powers realtime audio conversation over WebSockets. The backend enables both input and output audio transcription, session resumption, and context window compression, making live voice interaction central to the product. Brainstorm workflows also use Gemini-family generation models: <span className="text-stone-200">gemini-3.1-flash-image-preview</span> for images, <span className="text-stone-200">gemini-3.1-flash-lite-preview</span>, <span className="text-stone-200">gemini-flash-latest</span>, and <span className="text-stone-200">gemini-3.1-pro-preview</span> for delegated text work and prompt enhancement, plus <span className="text-stone-200">veo-3.1-fast-generate-preview</span> for video generation. In Walkthrough mode, the app uses a server-side <span className="text-stone-200">search_project_context</span> tool backed by Gemini File Search so project explanations stay grounded in retrieved project context.
                </p>
              </div>
            </BlurFade>

            <BlurFade delay={0.5}>
              <div className="rounded-xl bg-stone-900/60 p-6 border border-white/[0.04]">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CustomIconTrophy className="text-blue-400 h-5 w-5" /> Public Project Link
                </h3>
                <div className="space-y-4 text-sm text-stone-400">
                  <p>
                    Working product / interactive demo:{' '}
                    <a
                      href="https://hackathon.remembr-ai.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline underline-offset-4"
                    >
                      https://hackathon.remembr-ai.com
                    </a>
                  </p>
                  <p>
                    The demo is publicly accessible, and the brainstorm entry flow includes an <span className="text-stone-200">Ephemeral Mode</span> option to continue as a guest.
                  </p>
                  <p>
                    Public source repository:{' '}
                    <a
                      href="https://github.com/AshishT558/gemini-live-3d-bridge"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline underline-offset-4"
                    >
                      github.com/AshishT558/gemini-live-3d-bridge
                    </a>
                  </p>
                </div>
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
