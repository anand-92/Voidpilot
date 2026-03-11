import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { BrainstormArtifact, BrainstormFlashModel } from '../../hooks/useGeminiBrainstorm'
import type { Message } from '../../hooks/useGeminiLive'

export type BrainstormLayoutProps = {
  isConnected: boolean
  isStarting: boolean
  messages: Message[]
  artifacts: Map<string, BrainstormArtifact>
  artifactList: Array<[string, BrainstormArtifact]>
  totalSize: number
  isGenerating: boolean
  inputText: string
  selectedArtifact: string | null
  currentArtifact: BrainstormArtifact | null
  selectedFlashModel: BrainstormFlashModel
  setSelectedFlashModel: Dispatch<SetStateAction<BrainstormFlashModel>>
  messagesEndRef: RefObject<HTMLDivElement | null>
  setInputText: (value: string) => void
  setSelectedArtifact: Dispatch<SetStateAction<string | null>>
  handleSend: () => void
  handleConnect: () => Promise<void>
  stop: () => void
}

export { BrainstormDesktopLayout } from './BrainstormDesktopLayout'
export { BrainstormMobileLayout } from './BrainstormMobileLayout'
