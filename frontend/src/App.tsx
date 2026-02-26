import { useState } from 'react'
import { useGeminiLive } from './hooks/useGeminiLive'
import Visualizer from './components/Visualizer'

export default function App() {
  const { isConnected, messages, intensityRef, start, stop, sendText } = useGeminiLive()
  const [inputText, setInputText] = useState('')

  const handleSend = () => {
    if (inputText.trim()) {
      sendText(inputText)
      setInputText('')
    }
  }

  return (
    <main className="relative w-full h-screen flex flex-col items-center justify-center bg-[#020617] text-slate-100 overflow-hidden">
      <Visualizer
        intensityRef={intensityRef}
        isConnected={isConnected}
        start={start}
        stop={stop}
        messages={messages}
        inputText={inputText}
        setInputText={setInputText}
        handleSend={handleSend}
      />
    </main>
  )
}
