import { useNavigate } from 'react-router-dom'
import { ArrowRight, Box, Mic, Sparkles } from 'lucide-react'

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
  const navigate = useNavigate()

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
            Talk with Gemini, steer the scene, and iterate quickly.
          </p>

          <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-7 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400 sm:w-auto"
            >
              Open app
              <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="#capabilities"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-7 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 sm:w-auto"
            >
              See capabilities
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

        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/0 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Quick start</p>
          <ol className="mt-4 grid gap-4 text-sm text-slate-200 md:grid-cols-3 md:gap-5">
            <li className="rounded-xl border border-white/10 bg-black/20 p-4">1. Open a live session.</li>
            <li className="rounded-xl border border-white/10 bg-black/20 p-4">2. Describe what you want to build or change.</li>
            <li className="rounded-xl border border-white/10 bg-black/20 p-4">3. Keep refining until the scene feels right.</li>
          </ol>
        </section>
      </div>
    </main>
  )
}
