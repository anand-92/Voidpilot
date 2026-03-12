import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { BrainstormArtifact, BrainstormFlashModel, BrainstormToolId } from '../../hooks/useGeminiBrainstorm'
import type { Message } from '../../hooks/useGeminiLive'

export type BrainstormLayoutProps = {
  intensityRef: React.MutableRefObject<number>
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
  selectedTools: BrainstormToolId[]
  setSelectedTools: Dispatch<SetStateAction<BrainstormToolId[]>>
  messagesEndRef: RefObject<HTMLDivElement | null>
  setInputText: (value: string) => void
  setSelectedArtifact: Dispatch<SetStateAction<string | null>>
  handleSend: () => void
  handleConnect: () => Promise<void>
  stop: () => void
}

export { BrainstormDesktopLayout } from './BrainstormDesktopLayout'
export { BrainstormMobileLayout } from './BrainstormMobileLayout'
