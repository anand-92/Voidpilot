export type MessageRole =
  | 'user'
  | 'gemini'
  | 'system'
  | 'thought'
  | 'user_voice'
  | 'gemini_voice'

export interface Message {
  role: MessageRole
  content: string
  isToolResponse?: boolean
}

export type ToolActivityStatus = 'running' | 'complete' | 'no_results' | 'error'

export interface ConversationToolActivityEntry {
  insertionIndex: number
  status: ToolActivityStatus
  toolName: string | null
}
