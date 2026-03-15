import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { BrainstormArtifact, BrainstormFlashModel, BrainstormToolId, BrainstormVoice } from '../../hooks/useGeminiBrainstorm'
import type { BrainstormType } from './ModeSelectionScreen'
import type { ConversationToolActivityEntry, Message } from '@/types/messages'

export type BrainstormLayoutProps = {
  brainstormType: BrainstormType | null
  intensityRef: React.MutableRefObject<number>
  isConnected: boolean
  isStarting: boolean
  messages: Message[]
  toolActivityEntries: ConversationToolActivityEntry[]
  artifactList: Array<[string, BrainstormArtifact]>
  totalSize: number
  isGenerating: boolean
  inputText: string
  selectedArtifact: string | null
  currentArtifact: BrainstormArtifact | null
  selectedArtifactLoadState: 'loading' | 'error' | null
  sessionTitle: string | null
  selectedFlashModel: BrainstormFlashModel
  setSelectedFlashModel: Dispatch<SetStateAction<BrainstormFlashModel>>
  selectedVoice: BrainstormVoice
  setSelectedVoice: Dispatch<SetStateAction<BrainstormVoice>>
  selectedTools: BrainstormToolId[]
  setSelectedTools: Dispatch<SetStateAction<BrainstormToolId[]>>
  messagesEndRef: RefObject<HTMLDivElement | null>
  setInputText: (value: string) => void
  setSelectedArtifact: Dispatch<SetStateAction<string | null>>
  downloadArtifact: (filename: string) => Promise<void>
  downloadAllArtifacts: () => Promise<void>
  handleSend: () => void
  handleConnect: () => Promise<void>
  stop: () => void
  isMicPaused: boolean
  toggleMicPause: () => void
  onCreateShare?: () => Promise<string | null>
  autoStartError?: string | null
  clearAutoStartError?: () => void
  onGoBack?: () => void
}

export { BrainstormDesktopLayout } from './BrainstormDesktopLayout'
export { BrainstormMobileLayout } from './BrainstormMobileLayout'
export { CreativeSparkDesktopLayout } from './CreativeSparkDesktopLayout'
export { CreativeSparkMobileLayout } from './CreativeSparkMobileLayout'
