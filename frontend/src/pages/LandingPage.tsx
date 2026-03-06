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
          
          <div className="space-y-6 text-slate-300">
            <p className="text-lg leading-relaxed">
              This project is an entry for the <strong>Gemini Live Agent Challenge</strong> on Devpost, redefining interaction from static chatbots to immersive experiences.
            </p>

            <div className="grid gap-6 md:grid-cols-2 mt-6">
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <Mic className="h-4 w-4 text-indigo-400" />
                  Live Agents Category
                </h3>
                <p className="text-sm">
                  Built to handle real-time audio and vision. Our agent interacts naturally with users, gracefully handles barge-ins, and is powered directly by the Gemini Live API with low latency.
                </p>
              </div>

              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-5">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <Code className="h-4 w-4 text-sky-400" />
                  UI Navigator & Storyteller
                </h3>
                <p className="text-sm">
                  The desktop app leverages <strong>@midscene/computer</strong> so the agent can become the user's hands on screen—interpreting visual elements and executing OS-level actions natively in an Electron sandbox.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-xl bg-black/40 p-5 border border-white/5">
              <h3 className="font-semibold text-white mb-3">Key Technical Achievements:</h3>
              <ul className="list-inside list-disc space-y-2 text-sm text-slate-400">
                <li>Native Desktop App architecture using React + Electron.</li>
                <li>Real-time bidirectional WebSocket relay through a Python FastAPI backend.</li>
                <li>Zero-latency voice interface powered by Gemini Live.</li>
                <li>OS automation sandbox utilizing multimodal visual UI understanding.</li>
                <li>Cloud-ready backend deployment built for Google Cloud Run.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
