import { AzureOpenAI } from 'openai'
import type { ChatCompletionTool } from 'openai/resources/chat/completions'
import { Message, PolicyType, CompanyContext } from '@/types'
import { getPolicyPrompt } from '@/lib/prompts'
import { SYSTEM_PROMPT } from '@/lib/prompts/base'

// Azure OpenAI configuration
const openai = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
})

const DEPLOYMENT_NAME = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5.1'

// Define the tools for policy generation and URL fetching
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
  {
    type: 'function',
    function: {
      name: 'fetch_url',
      description: 'Fetch and extract text content from a URL. Use when the user provides a URL to their company website, existing policies, compliance documentation, or any reference material that would help create better policies. This retrieves the page content so you can analyze it.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The full URL to fetch (must be http:// or https://)',
          },
        },
        required: ['url'],
      },
    },
  },
]

// Firecrawl API configuration
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY
const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev/v1'

// Crawl website using Firecrawl API
async function crawlWithFirecrawl(url: string): Promise<string> {
  if (!FIRECRAWL_API_KEY) {
    console.error('[FIRECRAWL] API key not configured')
    return 'Error: Firecrawl API key not configured'
  }

  console.log(`[FIRECRAWL] Starting crawl for: ${url}`)

  try {
    // Start crawl job
    const crawlResponse = await fetch(`${FIRECRAWL_BASE_URL}/crawl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        limit: 20, // Limit pages for free tier
        scrapeOptions: {
          formats: ['markdown'],
        },
      }),
    })

    if (!crawlResponse.ok) {
      const errorText = await crawlResponse.text()
      console.error(`[FIRECRAWL] Crawl request failed: ${crawlResponse.status}`, errorText)
      return `Error: Firecrawl request failed (HTTP ${crawlResponse.status})`
    }

    const crawlData = await crawlResponse.json()
    console.log('[FIRECRAWL] Crawl initiated:', crawlData)

    // If it's a sync response with data, use it directly
    if (crawlData.data && Array.isArray(crawlData.data)) {
      return formatFirecrawlResults(crawlData.data, url)
    }

    // Otherwise poll for async results
    const jobId = crawlData.id
    if (!jobId) {
      return 'Error: No crawl job ID returned'
    }

    // Poll for results (max 60 seconds)
    const maxAttempts = 30
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000))

      const statusResponse = await fetch(`${FIRECRAWL_BASE_URL}/crawl/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        },
      })

      if (!statusResponse.ok) {
        console.error(`[FIRECRAWL] Status check failed: ${statusResponse.status}`)
        continue
      }

      const statusData = await statusResponse.json()
      console.log(`[FIRECRAWL] Status (attempt ${attempt + 1}):`, statusData.status, `Pages: ${statusData.data?.length || 0}`)

      if (statusData.status === 'completed') {
        return formatFirecrawlResults(statusData.data || [], url)
      }

      if (statusData.status === 'failed') {
        return `Error: Crawl job failed - ${statusData.error || 'Unknown error'}`
      }
    }

    return 'Error: Crawl timed out after 60 seconds'
  } catch (error) {
    console.error('[FIRECRAWL] Error:', error)
    return `Error: Failed to crawl - ${error instanceof Error ? error.message : 'Network error'}`
  }
}

// Format Firecrawl results into combined markdown
function formatFirecrawlResults(pages: Array<{ markdown?: string; sourceURL?: string; metadata?: { title?: string } }>, startUrl: string): string {
  if (!pages || pages.length === 0) {
    return 'Error: No pages were crawled'
  }

  console.log(`[FIRECRAWL] Formatting ${pages.length} pages`)

  let combinedContent = `# Website Content from ${startUrl}\n\n`
  combinedContent += `**Pages crawled:** ${pages.length}\n\n---\n\n`

  for (const page of pages) {
    const title = page.metadata?.title || page.sourceURL || 'Untitled'
    const content = page.markdown || ''

    combinedContent += `## ${title}\n`
    combinedContent += `**URL:** ${page.sourceURL || 'N/A'}\n\n`
    combinedContent += content.slice(0, 10000) // Limit each page
    combinedContent += '\n\n---\n\n'
  }

  // Final truncation if too large
  const MAX_TOTAL_LENGTH = 80000
  if (combinedContent.length > MAX_TOTAL_LENGTH) {
    combinedContent = combinedContent.slice(0, MAX_TOTAL_LENGTH) + '\n\n[Content truncated due to size...]'
  }

  console.log(`[FIRECRAWL] Total content length: ${combinedContent.length}`)
  return combinedContent
}

// Fetch URL content using Firecrawl
async function fetchUrlContent(url: string): Promise<string> {
  // Basic URL validation
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return 'Error: Invalid URL. Please provide a valid HTTP or HTTPS URL.'
    }
  } catch {
    return 'Error: Invalid URL format.'
  }

  // Use Firecrawl to crawl the website
  return crawlWithFirecrawl(url)
}

export async function chat(
  message: string,
  history: Message[]
): Promise<{ response: string; policyContent?: string }> {
  // Build initial messages array with proper typing for tool calls
  const messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool'
    content: string | null
    tool_calls?: Array<{
      id: string
      type: 'function'
      function: { name: string; arguments: string }
    }>
    tool_call_id?: string
  }> = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: message },
  ]

  // Tool calling loop (max 3 iterations to prevent infinite loops)
  let iterations = 0
  const MAX_ITERATIONS = 3

  console.log('[CHAT] Starting chat with message:', message)
  console.log('[CHAT] History length:', history.length)

  while (iterations < MAX_ITERATIONS) {
    iterations++
    console.log(`[CHAT] Iteration ${iterations}/${MAX_ITERATIONS}`)

    const completion = await openai.chat.completions.create({
      model: DEPLOYMENT_NAME,
      messages: messages as Parameters<typeof openai.chat.completions.create>[0]['messages'],
      tools,
      tool_choice: 'auto',
    })

    const responseMessage = completion.choices[0]?.message
    console.log('[CHAT] Response received:', {
      hasContent: !!responseMessage?.content,
      contentPreview: responseMessage?.content?.slice(0, 200),
      toolCalls: responseMessage?.tool_calls?.map(tc => tc.type === 'function' ? tc.function.name : tc.type),
    })

    // No tool calls - return text response
    if (!responseMessage?.tool_calls || responseMessage.tool_calls.length === 0) {
      console.log('[CHAT] No tool calls, returning text response')
      return { response: responseMessage?.content || 'I could not generate a response.' }
    }

    // Add assistant message with tool calls to conversation
    const functionToolCalls = responseMessage.tool_calls.filter(
      (tc): tc is typeof tc & { type: 'function'; function: { name: string; arguments: string } } =>
        tc.type === 'function'
    )
    messages.push({
      role: 'assistant',
      content: responseMessage.content,
      tool_calls: functionToolCalls.map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
    })

    // Process each tool call
    for (const toolCall of responseMessage.tool_calls) {
      if (toolCall.type !== 'function') continue

      const args = JSON.parse(toolCall.function.arguments)
      console.log(`[TOOL] Calling tool: ${toolCall.function.name}`)
      console.log('[TOOL] Arguments:', JSON.stringify(args, null, 2))

      // Handle fetch_url tool
      if (toolCall.function.name === 'fetch_url') {
        console.log('[TOOL:fetch_url] Fetching URL:', args.url)
        const content = await fetchUrlContent(args.url)
        console.log('[TOOL:fetch_url] Result length:', content.length)
        console.log('[TOOL:fetch_url] Result preview:', content.slice(0, 500))
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content,
        })
      }

      // Handle generate_policy tool
      if (toolCall.function.name === 'generate_policy') {
        console.log('[TOOL:generate_policy] Generating policy with:', args)
        try {
          const policyType = args.policy_type as PolicyType
          const context: CompanyContext = {
            companyName: args.company_name,
            industry: args.industry,
            companySize: args.company_size,
          }

          const policyMarkdown = await generatePolicy(policyType, context)
          console.log('[TOOL:generate_policy] Generated markdown length:', policyMarkdown.length)
          console.log('[TOOL:generate_policy] Markdown preview:', policyMarkdown.slice(0, 500))

          // Extract policy title from markdown (first heading)
          const titleMatch = policyMarkdown.match(/^#\s+(.+)/m)
          const policyTitle = titleMatch ? titleMatch[1] : 'Your Policy'

          return {
            response: `I've generated **${policyTitle}** for ${args.company_name}. You can view the complete policy in the panel on the right, where you can also download it in various formats.`,
            policyContent: policyMarkdown,
          }
        } catch (error) {
          console.error('[TOOL:generate_policy] Error:', error)
          return {
            response: 'I encountered an error while generating the policy. Please try again.',
          }
        }
      }
    }
  }

  // If we've exhausted iterations, return a fallback response
  return { response: 'I could not complete the request. Please try again.' }
}

export async function generatePolicy(
  type: PolicyType,
  context: CompanyContext
): Promise<string> {
  const prompt = getPolicyPrompt(type, context)

  const completion = await openai.chat.completions.create({
    model: DEPLOYMENT_NAME,
    messages: [
      {
        role: 'system',
        content: `You are a professional policy generator. Generate comprehensive, well-structured policy documents in clean Markdown format.

Use proper markdown formatting:
- Use # for the main title
- Use ## for major sections
- Use ### for subsections
- Use bullet points and numbered lists where appropriate
- Use **bold** for emphasis on key terms
- Include a clear table of contents at the beginning

Make the policy professional, thorough, and ready for business use.
Do NOT output JSON. Output clean, readable Markdown only.`,
      },
      { role: 'user', content: prompt },
    ],
  })

  return completion.choices[0]?.message?.content || '# Policy Generation Error\n\nUnable to generate policy. Please try again.'
}
