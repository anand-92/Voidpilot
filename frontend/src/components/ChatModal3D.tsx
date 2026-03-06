import { useRef, useEffect } from 'react'
import { Send, LogOut, Terminal } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Html } from '@react-three/drei'
import { type MessageRole, type Message } from '../hooks/useGeminiLive'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

function messageLayoutClass(role: MessageRole): string {
    switch (role) {
        case 'user': return "ml-auto items-end max-w-[85%]"
        case 'system': return "mx-auto w-full items-center max-w-[85%]"
        case 'thought': return "mr-auto items-start max-w-[75%]"
        case 'user_voice': return "ml-auto items-end max-w-[85%]"
        case 'gemini_voice': return "mr-auto items-start max-w-[85%]"
        default: return "mr-auto items-start max-w-[85%]"
    }
}

function messageBubbleClass(role: MessageRole): string {
    switch (role) {
        case 'user': return "bg-indigo-500/20 text-indigo-300 border-r-4 border-indigo-500"
        case 'system': return "bg-slate-800/30 text-slate-500 text-xs italic font-mono"
        case 'thought': return "bg-slate-800/20 text-slate-500 text-xs italic border-l-2 border-slate-700/50 opacity-60"
        case 'user_voice': return "bg-emerald-500/20 text-emerald-300 border-r-4 border-emerald-500"
        case 'gemini_voice': return "bg-amber-500/20 text-amber-300 border-l-4 border-amber-500"
        default: return "bg-sky-500/10 text-sky-300 border-l-4 border-sky-500 shadow-[0_0_30px_rgba(56,189,248,0.05)]"
    }
}

interface ChatModalProps {
    messages: Message[];
    inputText: string;
    setInputText: (text: string) => void;
    handleSend: () => void;
    stop: () => void;
}

export function ChatModal3D({ messages, inputText, setInputText, handleSend, stop }: ChatModalProps) {
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    return (
        <Html
            transform
            position={[8, 2.5, 0]} // Positioned further to the right of the orb
            rotation={[0, -0.4, 0]} // Angled slightly towards the camera
            scale={0.5} // Scale down to fit in the scene reasonably
            className="pointer-events-auto"
            occlude="blending" // Occlude if behind other objects
        >
            <div
                className="w-[600px] h-[800px] flex flex-col bg-slate-950/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-8 duration-700 text-slate-100"
            >
                {/* Active Header indicator */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5 shadow-md">
                    <span className="font-bold tracking-tight bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">Gemini Live</span>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Active</span>
                    </div>
                </div>

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
                            {msg.role === 'user_voice' && (
                                <span className="text-[10px] uppercase tracking-widest text-emerald-600 mb-1 ml-2 font-mono">you (voice)</span>
                            )}
                            {msg.role === 'gemini_voice' && (
                                <span className="text-[10px] uppercase tracking-widest text-amber-600 mb-1 mr-2 font-mono text-right w-full">gemini (voice)</span>
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
                <div className="p-6 pt-2 space-y-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] bg-slate-900/50">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            aria-label="Message"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type a message..."
                            autoFocus
                            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:border-sky-500 transition-all text-white"
                        />
                        <button
                            onClick={handleSend}
                            aria-label="Send message"
                            title={inputText.trim() ? "Send message" : "Message cannot be empty"}
                            disabled={!inputText.trim()}
                            className="p-4 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl transition-all active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
                        >
                            <Send className="w-6 h-6" />
                        </button>
                        <button
                            onClick={stop}
                            aria-label="End session"
                            title="End session"
                            className="p-4 bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 rounded-2xl transition-all active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none"
                        >
                            <LogOut className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
        </Html>
    )
}
