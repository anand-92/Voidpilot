import { useState } from 'react'
import { useGeminiLive } from './hooks/useGeminiLive'

export default function App() {
  const { isConnected, messages, start, stop, sendText } = useGeminiLive()
  const [inputText, setInputText] = useState('')

  const handleSend = () => {
    if (inputText.trim()) {
      sendText(inputText)
      setInputText('')
    }
  }

  return (
    <main className="relative w-full h-screen flex flex-col items-center justify-center bg-[#020617] text-slate-100 overflow-hidden">
      <div className="z-10 flex flex-col items-center gap-4 bg-slate-900/80 p-6 rounded-2xl shadow-2xl backdrop-blur-md">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          Desktop Assistant
        </h1>
        <div className="flex gap-4 mb-4">
          {!isConnected ? (
            <button
              onClick={start}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 transition-colors rounded-lg font-medium shadow-lg"
            >
              Start Live Session
            </button>
          ) : (
            <button
              onClick={stop}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 transition-colors rounded-lg font-medium shadow-lg"
            >
              Stop Live Session
            </button>
          )}
        </div>
        
        <div className="w-full max-w-2xl bg-slate-800/50 rounded-lg p-4 h-64 overflow-y-auto mb-4 border border-slate-700/50">
          {messages.length === 0 ? (
            <p className="text-slate-400 text-center italic mt-24">No messages yet. Start speaking or type a message!</p>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`mb-3 ${msg.role === 'user' ? 'text-blue-300' : msg.role === 'system' ? 'text-slate-500 italic' : 'text-slate-200'}`}>
                <span className="font-semibold">{msg.role === 'user' ? 'You: ' : msg.role === 'system' ? 'System: ' : 'Gemini: '}</span>
                <span>{msg.content}</span>
              </div>
            ))
          )}
        </div>
        
        <div className="w-full flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            disabled={!isConnected}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!isConnected || !inputText.trim()}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:hover:bg-slate-700 transition-colors rounded-lg"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  )
}
