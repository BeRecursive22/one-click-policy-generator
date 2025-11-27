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

export const POLICY_TYPE_LABELS: Record<PolicyType, string> = { IT_SECURITY: 'IT Security Policy', HR: 'HR Policy', LEGAL_PRIVACY: 'Legal & Privacy Policy', INFORMATION_SECURITY: 'Information Security Policy', }

export const COMPLIANCE_STANDARDS = ['ISO 27001', 'SOC 2', 'GDPR', 'HIPAA']

// Policy types
export type PolicyType =
  | 'IT_SECURITY'
  | 'HR'
  | 'LEGAL_PRIVACY'
  | 'INFORMATION_SECURITY'

  export interface PolicyDocument {
    id: string
    type: PolicyType
    title: string
    companyName: string
  
    sections: PolicySection[]
  
    metadata: PolicyMetadata
    createdAt: Date
    updatedAt?: Date
  }
  
  export interface PolicySection {
    id: string                     // 'purpose_scope', 'access_control', etc.
    title: string
    content: string
    // optional tags for future use (standards, audience)
    tags?: string[]                // ['ISO27001:A.9', 'all-employees']
  }
  
  export interface PolicyMetadata {
    version: string                // '1.0'
    effectiveDate: string          // '2025-01-01'
    ownerRole?: string             // 'CISO', 'Head of HR'
    audience?: string              // 'All Employees', 'IT Team'
  
    jurisdictions?: string[]       // ['India', 'US', 'EU']
    standards?: string[]           // ['ISO 27001', 'SOC 2', 'GDPR']
    reviewFrequencyMonths?: number // 12
  
    // nice-to-have later:
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH'
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

// src/types/index.ts

export interface CompanyContext {
  companyName?: string
  industry?: string
  companySize?: '1-10' | '11-50' | '51-200' | '201-500' | '500+'
  regions?: string[]            // ['India', 'EU', 'US']
  employeeLocations?: string[]  // ['India', 'Remote', 'Hybrid']
  hasRemoteWork?: boolean
  hasShiftWork?: boolean
  hasContractors?: boolean

  // IT / Security profile
  usesBYOD?: boolean
  hasVPN?: boolean
  cloudProviders?: string[]     // ['AWS', 'Azure']
  ssoProvider?: string          // 'Okta', 'Google Workspace'
  handlesPHI?: boolean
  handlesPaymentData?: boolean

  // Compliance targets
  complianceTargets?: string[]  // ['ISO 27001', 'SOC 2', 'GDPR', 'HIPAA']

  additionalInfo?: string
}
