import { PolicyType, CompanyContext } from '@/types'

export function getPolicyPrompt(type: PolicyType, context: CompanyContext): string {
  const baseInfo = `Company Profile:
- Name: ${context.companyName || '[Company Name]'}
- Industry: ${context.industry || '[Industry]'}
- Size: ${context.companySize || '[Company Size]'}
- Regions: ${(context.regions && context.regions.length > 0) ? context.regions.join(', ') : '[Not specified]'}
- Remote work: ${context.hasRemoteWork === true ? 'Yes' : context.hasRemoteWork === false ? 'No' : '[Not specified]'}
- BYOD: ${context.usesBYOD === true ? 'Yes' : context.usesBYOD === false ? 'No' : '[Not specified]'}
- Sensitive data: ${
    context.handlesPHI || context.handlesPaymentData ? 'Yes' : 'Not explicitly specified'
  }
- Compliance targets: ${
    context.complianceTargets && context.complianceTargets.length > 0
      ? context.complianceTargets.join(', ')
      : '[Not specified]'
  }
- Additional context: ${context.additionalInfo || 'None provided'}`

  // You could make this fully data-driven, but let's keep close to your current structure:
  const prompts: Record<PolicyType, string> = {
    IT_SECURITY: `You are drafting an IT Security Policy for the following company.

${baseInfo}

Generate a policy with the following structure and IDs:
1. purpose_scope          - Purpose and Scope
2. policy_statement       - Overall Policy Statement
3. access_control         - Identity, authentication, least privilege, remote access
4. data_protection        - Encryption, backups, data at rest/in transit
5. network_security       - Firewalls, VPN, Wi-Fi, perimeter/zero-trust basics
6. endpoint_security      - Laptops, mobiles, BYOD vs company devices
7. incident_response      - Reporting, triage, response, post-incident review
8. physical_security      - Office / data center access (omit or keep minimal if fully remote)
9. compliance_audit       - Alignment with ISO 27001 / SOC 2 and internal audits
10. enforcement           - Roles, responsibilities, enforcement, exceptions

Adapt the emphasis:
- If the company is remote-first or uses BYOD, expand sections 3, 4, 6 with concrete expectations for employees.
- If they have specific compliance targets, explicitly mention alignment with those standards where relevant.`,

    HR: `You are drafting a core HR Policy / Employee Handbook for the following company.

${baseInfo}

Generate a policy with sections and IDs:
1. purpose_scope          - Purpose and who it applies to
2. employment_policies    - Hiring, equal opportunity, non-discrimination
3. compensation_benefits  - Pay, benefits overview (no specific figures)
4. work_schedule          - Working hours, break, overtime, remote work rules
5. code_of_conduct        - Expected behavior, professionalism
6. workplace_safety       - Health & safety basics
7. anti_harassment        - Harassment / bullying / misconduct, reporting channels
8. grievance_procedure    - How employees can raise concerns
9. performance_management - Feedback, appraisal basics
10. disciplinary_actions  - How misconduct is handled
11. termination_exit      - Notice, handovers, return of assets

If the company operates in specific jurisdictions, reflect relevant legal concepts at a high level without giving legal advice.`,

    LEGAL_PRIVACY: `You are drafting an external-facing Legal & Privacy Policy for the following company.

${baseInfo}

Generate a policy with sections and IDs:
1. intro_scope            - Introduction, scope of the policy
2. data_collection        - What data is collected and from whom
3. legal_basis            - Legal bases for processing (e.g. consent, legitimate interests) when GDPR applies
4. data_use               - How the company uses the data
5. data_sharing           - When data is shared with third parties / processors
6. user_rights            - Data subject / user rights (access, correction, deletion, etc.)
7. data_retention         - Retention principles
8. data_security          - High-level security measures
9. cookies_tracking       - Cookies / similar technologies
10. international_transfers - Cross-border transfers (EU/other regions, if relevant)
11. children_privacy      - If services may be used by minors
12. policy_changes        - How changes will be communicated
13. contact_info          - Contact details for privacy queries

Align language with GDPR, CCPA, HIPAA, etc. only where relevant. Do not claim guaranteed compliance.`,

    INFORMATION_SECURITY: `You are drafting an internal Information Security Policy (the "mother" policy) for the following company.

${baseInfo}

Generate a policy with sections and IDs:
1. purpose_scope          - Purpose and scope
2. security_objectives    - Confidentiality, integrity, availability objectives
3. roles_responsibilities - Management, security officer, employees, vendors
4. information_classification - Data classification scheme (e.g. Public, Internal, Confidential, Restricted)
5. information_handling   - Rules for handling each classification
6. access_management      - High-level access control principles
7. risk_management        - Overview of risk assessment and treatment approach
8. security_controls      - Summary of technical/organizational controls
9. awareness_training     - Security awareness and training expectations
10. incident_management   - How incidents are reported and managed
11. business_continuity   - Reference to BCP/DR where relevant
12. compliance_review     - Review cycle, audits, linkage to standards

Explicitly state alignment intent with ISO 27001 / SOC 2 where appropriate, but do not overclaim.`
  }

  return `${prompts[type]}

Requirements:
- Use clear, plain language appropriate for employees and stakeholders.
- Adapt details to the company profile (remote vs office, BYOD, regions, compliance targets).
- Output MUST be valid JSON of the form:
{
  "title": "Policy Title",
  "sections": [
    { "id": "section_id", "title": "Section Title", "content": "Full section content..." }
  ]
}`
}
