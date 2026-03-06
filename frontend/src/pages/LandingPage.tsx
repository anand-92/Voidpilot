import { Box, Mic, Sparkles, Download, Code, Trophy } from 'lucide-react'

const capabilities = [
  {
    title: 'Voice chat that feels immediate',
    description: 'Speak naturally and get responses back in real time.',
    icon: Mic,
  },
  {
    title: 'Prompt-driven 3D scenes',
    description: 'Type an idea and watch the scene update without leaving the session.',
    icon: Box,
  },
  {
    title: 'Faster creative iteration',
    description: 'Try a direction, tweak it, and compare results while you chat.',
    icon: Sparkles,
  },
]

export default function LandingPage() {
  return (
    <main className="relative w-full h-screen overflow-y-auto bg-[#020617] text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-500/25 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-12 md:gap-20 md:py-20">
        <section className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <p className="mb-5 rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">
            Gemini Live 3D demo
          </p>
          <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
            A live playground for voice and 3D
          </h1>
          <p className="mt-5 max-w-2xl text-base text-slate-300 md:text-lg">
            Talk with Gemini, steer the scene, iterate quickly, and even automate your desktop natively via Electron.
          </p>

          <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            <a
              href="https://github.com/tazzos/gemini-live-3d-bridge/releases/latest"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-7 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400 sm:w-auto"
            >
              <Download className="h-4 w-4" />
              Download App
            </a>
            <a
              href="#hackathon"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 sm:w-auto"
            >
              <Trophy className="h-4 w-4" />
              Hackathon Info
            </a>
          </div>
        </section>

        <section id="capabilities" className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          {capabilities.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="rounded-2xl border border-white/10 bg-slate-900/45 p-6 backdrop-blur-sm transition-colors hover:border-sky-400/40"
            >
              <div className="mb-4 inline-flex rounded-lg bg-sky-500/15 p-2 text-sky-300">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{description}</p>
            </article>
          ))}
        </section>

        <section id="hackathon" className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 md:p-10 backdrop-blur-md">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-lg bg-indigo-500/20 p-2 text-indigo-400">
              <Trophy className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-white">Gemini Live Agent Challenge</h2>
          </div>
          
          <div className="space-y-8 text-slate-300">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Challenge Overview</h3>
              <p className="text-base leading-relaxed">
                Redefining Interaction: From Static Chatbots to Immersive Experiences. This project is built as an entry to move beyond simple text-in/text-out interactions by leveraging Google’s Live API with multimodal inputs and outputs (audio and vision).
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <Mic className="h-4 w-4 text-indigo-400" />
                  Live Agents
                </h3>
                <p className="text-sm">
                  <strong>Focus: Real-time Interaction (Audio/Vision).</strong> Build an agent that users can talk to naturally and can be interrupted. Must use Gemini Live API or ADK and be hosted on Google Cloud.
                </p>
              </div>

              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-5">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-sky-400" />
                  Creative Storyteller
                </h3>
                <p className="text-sm">
                  <strong>Focus: Multimodal Storytelling with Interleaved Output.</strong> Build an agent that seamlessly weaves together text, images, audio, and video in a single fluid output stream leveraging Gemini's native interleaved output.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <Code className="h-4 w-4 text-emerald-400" />
                  UI Navigator
                </h3>
                <p className="text-sm">
                  <strong>Focus: Visual UI Understanding & Interaction.</strong> Build an agent that becomes the user's hands on screen. It observes the display, interprets visual elements, and performs actions based on user intent.
                </p>
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2 mt-4">
              <div className="rounded-xl bg-black/40 p-6 border border-white/5">
                <h3 className="text-lg font-semibold text-white mb-4">Submission Requirements</h3>
                <ul className="list-inside list-disc space-y-2 text-sm text-slate-300">
                  <li><strong>New Projects Only:</strong> Must be newly created during the contest period (Feb 16 - Mar 16, 2026).</li>
                  <li><strong>Google Cloud Native:</strong> Must use at least one Google Cloud service. Must include proof of deployment (e.g., console logs, code links).</li>
                  <li><strong>GenAI SDK:</strong> Agents must be built using Google GenAI SDK or Agent Development Kit.</li>
                  <li><strong>Code & Demo:</strong> Include a public code repository with spin-up instructions, an architecture diagram, and a demonstration video (max 4 minutes, YouTube/Vimeo, English/Subtitled) showing real-time agentic features working.</li>
                  <li><strong>Text Description:</strong> Must cover features, tech used, data sources, and learnings. Application must support English.</li>
                  <li><strong>Testing Access:</strong> Must provide a link to a working project/demo/test build (with login credentials if private).</li>
                  <li><strong>Cloud Credits:</strong> Fill out the <a href="https://forms.gle/rKNPXA1o6XADvQGb7" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">Google Cloud credits form</a> by March 13 (12:00 PM PT) to request $100.</li>
                </ul>
              </div>

              <div className="rounded-xl bg-black/40 p-6 border border-white/5">
                <h3 className="text-lg font-semibold text-white mb-4">Judging Criteria</h3>
                <ul className="list-inside list-disc space-y-3 text-sm text-slate-300">
                  <li><strong>Innovation & Multimodal User Experience (40%):</strong> Does the project break the "text box" paradigm? Is the interaction natural, immersive, seamless, and context-aware?</li>
                  <li><strong>Technical Implementation & Architecture (30%):</strong> Effective use of GenAI SDK/ADK, robust Google Cloud hosting, sound agent logic handling errors/timeouts, and avoidance of hallucinations.</li>
                  <li><strong>Demo & Presentation (30%):</strong> Clear definition of the problem/solution, clear architecture diagram, visual proof of Cloud deployment, and a demo showing actual software working.</li>
                  <li><strong>Stage Three (Bonus up to 1.0 pts):</strong>
                    <ul className="list-inside list-disc ml-4 mt-2 space-y-1 text-xs text-slate-400">
                      <li><strong>Content Creation (0.6 pts):</strong> Publish a public blog/podcast/video about the build process with the #GeminiLiveAgentChallenge hashtag.</li>
                      <li><strong>Automated Deployment (0.2 pts):</strong> Demonstrate automated deployment via scripts or IaC in the public repo.</li>
                      <li><strong>GDG Membership (0.2 pts):</strong> Provide a link to a public Google Developer Group profile.</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl bg-slate-800/50 p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Prizes & Important Dates</h3>
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div>
                  <p className="mb-2"><strong>Dates:</strong></p>
                  <ul className="list-inside list-disc text-slate-300 space-y-1">
                    <li>Submission Period: Feb 16 – Mar 16, 2026</li>
                    <li>Judging Period: Mar 17 – Apr 3, 2026</li>
                    <li>Winners Announced: April 22 - 24, 2026 (at Google NEXT)</li>
                  </ul>
                </div>
                <div>
                  <p className="mb-2"><strong>Prizes include:</strong></p>
                  <ul className="list-inside list-disc text-slate-300 space-y-1">
                    <li><strong>Grand Prize:</strong> $25,000 USD, $3k GCP Credits, Google Cloud Next Tickets & Travel Stipend.</li>
                    <li><strong>Category Winners (x3):</strong> $10,000 USD, $1k GCP Credits, Google Cloud Next Tickets.</li>
                    <li><strong>Subcategory Winners (x3):</strong> $5,000 USD, $500 GCP Credits.</li>
                  </ul>
                </div>
              </div>
            </div>

          </div>
        </section>
      </div>
    </main>
  )
}
