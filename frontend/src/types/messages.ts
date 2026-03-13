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
