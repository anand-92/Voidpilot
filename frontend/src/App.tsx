import { useState, useEffect } from 'react'
import { useGeminiLive } from './hooks/useGeminiLive'
import Visualizer from './components/Visualizer'

export default function App() {
  const { isConnected, messages, intensityRef, start, stop, sendText, threeJsCode, clearThreeJsCode, generatedImage, clearGeneratedImage } = useGeminiLive()
  const [inputText, setInputText] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && generatedImage && clearGeneratedImage) {
        clearGeneratedImage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [generatedImage, clearGeneratedImage]);

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
        threeJsCode={threeJsCode}
        clearThreeJsCode={clearThreeJsCode}
      />

      {/* Fullscreen Image Modal - outside Visualizer/Canvas */}
      {generatedImage && clearGeneratedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Generated image preview"
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img 
              src={generatedImage} 
              alt="Generated scene preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
            <button
              autoFocus
              onClick={clearGeneratedImage}
              className="absolute top-4 right-4 px-6 py-3 bg-slate-800/90 hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-white text-white text-lg font-medium rounded-lg backdrop-blur-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
