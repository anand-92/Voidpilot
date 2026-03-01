import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <main className="w-full h-screen bg-[#020617] text-slate-100 flex items-center justify-center px-6">
      <section className="max-w-2xl text-center">
        <p className="text-sky-300/90 text-sm tracking-[0.2em] uppercase mb-4">Gemini Live 3D</p>
        <h1 className="text-4xl md:text-6xl font-semibold leading-tight">Step into the immersive experience</h1>
        <p className="mt-5 text-slate-300">Enter to launch the existing Three.js app.</p>
        <button
          type="button"
          onClick={() => navigate('/app')}
          className="mt-8 px-8 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold transition-colors"
        >
          Enter
        </button>
      </section>
    </main>
  )
}
