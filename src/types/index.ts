// Message types for chat interface
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  files?: FileAttachment[]
}

export interface FileAttachment {
  id: string
  name: string
  type: string
  size: number
  content?: string
}

// Policy types
export type PolicyType =
  | 'IT_SECURITY'
  | 'HR'
  | 'LEGAL_PRIVACY'
  | 'INFORMATION_SECURITY'

export interface PolicySection {
  title: string
  content: string
}

export interface PolicyDocument {
  id: string
  type: PolicyType
  title: string
  companyName: string
  sections: PolicySection[]
  metadata: PolicyMetadata
  createdAt: Date
}

export interface PolicyMetadata {
  version: string
  effectiveDate: string
  standards: string[]
}

// Chat API types
export interface ChatRequest {
  message: string
  history: Message[]
  files?: FileAttachment[]
}

export interface ChatResponse {
  response: string
  policy?: PolicyDocument
}

// Context gathered from user
export interface CompanyContext {
  companyName?: string
  industry?: string
  companySize?: string
  additionalInfo?: string
  uploadedFiles?: FileAttachment[]
}
