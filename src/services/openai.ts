import { AzureOpenAI } from 'openai'
import type { ChatCompletionTool } from 'openai/resources/chat/completions'
import { Message, PolicyDocument, PolicyType, CompanyContext } from '@/types'
import { SYSTEM_PROMPT, getPolicyPrompt, POLICY_TYPE_LABELS, COMPLIANCE_STANDARDS } from '@/lib/prompts'
import { generateId } from '@/lib/utils'

// Azure OpenAI configuration
const openai = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
})

const DEPLOYMENT_NAME = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5.1'

// Define the tool for policy generation
const tools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'generate_policy',
      description: 'Generate a professional policy document. Only call this when the user has provided their company information AND explicitly wants to create/generate the policy. Do NOT call this for general questions or when user is just asking about capabilities.',
      parameters: {
        type: 'object',
        properties: {
          policy_type: {
            type: 'string',
            enum: ['IT_SECURITY', 'HR', 'LEGAL_PRIVACY', 'INFORMATION_SECURITY'],
            description: 'The type of policy to generate',
          },
          company_name: {
            type: 'string',
            description: 'The name of the company',
          },
          industry: {
            type: 'string',
            description: 'The industry or sector of the company',
          },
          company_size: {
            type: 'string',
            description: 'The approximate size of the company (e.g., "50 employees", "500+")',
          },
        },
        required: ['policy_type', 'company_name'],
      },
    },
  },
]

export async function chat(
  message: string,
  history: Message[]
): Promise<{ response: string; policy?: PolicyDocument }> {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: message },
  ]

  const completion = await openai.chat.completions.create({
    model: DEPLOYMENT_NAME,
    messages,
    tools,
    tool_choice: 'auto',
  })

  const responseMessage = completion.choices[0]?.message

  // Check if AI decided to call the generate_policy function
  if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
    const toolCall = responseMessage.tool_calls[0]

    if (toolCall.function.name === 'generate_policy') {
      try {
        const args = JSON.parse(toolCall.function.arguments)
        const policyType = args.policy_type as PolicyType
        const context: CompanyContext = {
          companyName: args.company_name,
          industry: args.industry,
          companySize: args.company_size,
        }

        const policy = await generatePolicy(policyType, context)

        return {
          response: `I've generated your ${POLICY_TYPE_LABELS[policyType]} for ${context.companyName}. You can see it in the preview panel on the right. Feel free to ask for any modifications or download the PDF when you're satisfied.`,
          policy,
        }
      } catch (error) {
        console.error('Error generating policy:', error)
        return {
          response: 'I encountered an error while generating the policy. Please try again.',
        }
      }
    }
  }

  // Regular text response (no function call)
  const response = responseMessage?.content || 'I could not generate a response.'
  return { response }
}

export async function generatePolicy(
  type: PolicyType,
  context: CompanyContext
): Promise<PolicyDocument> {
  const prompt = getPolicyPrompt(type, context)

  const completion = await openai.chat.completions.create({
    model: DEPLOYMENT_NAME,
    messages: [
      {
        role: 'system',
        content: 'You are a professional policy generator. Generate comprehensive, well-structured policy documents. Respond with valid JSON only in the format: {"title": "Policy Title", "sections": [{"title": "Section", "content": "Content..."}]}',
      },
      { role: 'user', content: prompt },
    ],
  })

  const responseContent = completion.choices[0]?.message?.content || '{}'

  try {
    // Try to extract JSON from the response (in case there's extra text)
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : responseContent
    const parsed = JSON.parse(jsonStr)

    return {
      id: generateId(),
      type,
      title: parsed.title || POLICY_TYPE_LABELS[type],
      companyName: context.companyName || 'Your Company',
      sections: parsed.sections || [],
      metadata: {
        version: '1.0',
        effectiveDate: new Date().toISOString().split('T')[0],
        standards: COMPLIANCE_STANDARDS,
      },
      createdAt: new Date(),
    }
  } catch (error) {
    console.error('Failed to parse policy response:', error)
    console.error('Raw response:', responseContent)
    throw new Error('Failed to generate policy document')
  }
}
