import { PolicyType, CompanyContext } from '@/types'

export * from './base'

export function getPolicyPrompt(type: PolicyType, context: CompanyContext): string {
  const baseInfo = `Company Name: ${context.companyName || '[Company Name]'}
Industry: ${context.industry || '[Industry]'}
Company Size: ${context.companySize || '[Company Size]'}
Additional Context: ${context.additionalInfo || 'None provided'}`

  const prompts: Record<PolicyType, string> = {
    IT_SECURITY: `Generate a comprehensive IT Security Policy for:
${baseInfo}

Structure with sections: Purpose and Scope, Policy Statement, Access Control, Data Protection, Network Security, Endpoint Security, Incident Response, Physical Security, Compliance and Audit, Policy Enforcement.`,

    HR: `Generate a comprehensive HR Policy for:
${baseInfo}

Structure with sections: Purpose and Scope, Employment Policies, Compensation and Benefits, Work Schedule, Code of Conduct, Performance Management, Workplace Safety, Anti-Harassment, Grievance Procedures, Disciplinary Actions, Termination.`,

    LEGAL_PRIVACY: `Generate a comprehensive Legal & Privacy Policy for:
${baseInfo}

Structure with sections: Introduction, Data Collection, Legal Basis, Data Usage, User Rights, Data Retention, Data Security, Cookies, International Transfers, Children's Privacy, Policy Changes, Contact Information.`,

    INFORMATION_SECURITY: `Generate a comprehensive Information Security Policy for:
${baseInfo}

Structure with sections: Purpose and Scope, Security Objectives, Roles and Responsibilities, Information Classification, Information Handling, Access Management, Risk Management, Security Controls, Security Awareness, Incident Management, Business Continuity, Compliance.`,
  }

  return `${prompts[type]}

The policy should be professional and aligned with ISO 27001, SOC 2, GDPR, and HIPAA standards.

Return as JSON: {"title": "Policy Title", "sections": [{"title": "Section", "content": "Content..."}]}`
}
