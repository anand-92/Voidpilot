import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { BrainstormArtifact, BrainstormFlashModel, BrainstormToolId } from '../../hooks/useGeminiBrainstorm'
import type { Message } from '@/types/messages'

export type BrainstormLayoutProps = {
  intensityRef: React.MutableRefObject<number>
  isConnected: boolean
  isStarting: boolean
  messages: Message[]
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
  onCreateShare?: () => Promise<string | null>
}

export { BrainstormDesktopLayout } from './BrainstormDesktopLayout'
export { BrainstormMobileLayout } from './BrainstormMobileLayout'
