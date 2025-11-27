import { NextRequest, NextResponse } from 'next/server'
import { generatePDFFromMarkdown } from '@/services/pdf'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { markdown } = body as { markdown: string }

    if (!markdown || typeof markdown !== 'string') {
      return NextResponse.json({ error: 'Markdown content is required' }, { status: 400 })
    }

    const pdfBuffer = await generatePDFFromMarkdown(markdown)

    // Extract title from markdown for filename
    const titleMatch = markdown.match(/^#\s+(.+)/m)
    const title = titleMatch ? titleMatch[1] : 'Policy'
    const filename = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('PDF Export error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
