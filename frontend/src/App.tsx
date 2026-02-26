import { useState, useRef, useEffect } from 'react'
import { Mic, Send, LogOut, Terminal } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useGeminiLive, type MessageRole } from './hooks/useGeminiLive'
import Visualizer from './components/Visualizer'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function messageLayoutClass(role: MessageRole): string {
  switch (role) {
    case 'user': return "ml-auto items-end max-w-[85%]"
    case 'system': return "mx-auto w-full items-center max-w-[85%]"
    case 'thought': return "mr-auto items-start max-w-[75%]"
    default: return "mr-auto items-start max-w-[85%]"
  }
}

function messageBubbleClass(role: MessageRole): string {
  switch (role) {
    case 'user': return "bg-indigo-500/20 text-indigo-300 border-r-4 border-indigo-500"
    case 'system': return "bg-slate-800/30 text-slate-500 text-xs italic font-mono"
    case 'thought': return "bg-slate-800/20 text-slate-500 text-xs italic border-l-2 border-slate-700/50 opacity-60"
    default: return "bg-sky-500/10 text-sky-300 border-l-4 border-sky-500 shadow-[0_0_30px_rgba(56,189,248,0.05)]"
  }
}

export default function App() {
  const { isConnected, messages, intensity, start, stop, sendText } = useGeminiLive()
  const [inputText, setInputText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    if (inputText.trim()) {
      sendText(inputText)
      setInputText('')
    }
  }

  return (
    <main className="relative w-full h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-[#020617] text-slate-100 overflow-hidden">
      <Visualizer intensity={intensity} />

      <div className={cn(
        "z-10 w-full max-w-2xl flex flex-col transition-all duration-700 ease-in-out",
        isConnected ? "h-[85vh]" : "h-auto"
      )}>
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-2xl">
            Gemini Live
          </h1>
          <div className="flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full bg-slate-900/50 border border-slate-800 backdrop-blur-xl">
            <div className={cn("w-2 h-2 rounded-full transition-shadow duration-500", isConnected ? "bg-emerald-500 shadow-[0_0_12px_#10b981]" : "bg-rose-500")} />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {isConnected ? "Live Session Active" : "Disconnected"}
            </span>
          </div>
        </div>

        {!isConnected ? (
          <button
            onClick={start}
            className="group relative self-center flex items-center gap-3 px-10 py-5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-2xl transition-all duration-300 hover:scale-105 hover:rotate-1 active:scale-95 shadow-[0_20px_50px_rgba(56,189,248,0.3)]"
          >
            <Mic className="w-6 h-6 group-hover:animate-pulse" />
            <span className="text-lg">START CONVERSATION</span>
          </button>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-950/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
            {/* Transcript Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale">
                  <Terminal className="w-12 h-12 mb-4" />
                  <p className="font-mono text-sm tracking-widest">AWAITING INPUT...</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex flex-col animate-in slide-in-from-bottom-2 duration-300",
                    messageLayoutClass(msg.role)
                  )}
                >
                  {msg.role === 'thought' && (
                    <span className="text-[10px] uppercase tracking-widest text-slate-600 mb-1 ml-2 font-mono">thinking</span>
                  )}
                  <div className={cn(
                    "px-5 py-3 rounded-2xl text-sm leading-relaxed",
                    messageBubbleClass(msg.role)
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="p-6 pt-2 space-y-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-sky-500/50 transition-colors"
                />
                <button
                  onClick={handleSend}
                  className="p-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl transition-all active:scale-95"
                >
                  <Send className="w-6 h-6" />
                </button>
                <button
                  onClick={stop}
                  className="p-4 bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 rounded-2xl transition-all active:scale-95"
                >
                  <LogOut className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
