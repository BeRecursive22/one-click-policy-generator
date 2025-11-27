import { NextRequest, NextResponse } from 'next/server'
import { generatePDF } from '@/services/pdf'
import { PolicyDocument } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { policy } = body as { policy: PolicyDocument }

    if (!policy || !policy.title || !policy.sections) {
      return NextResponse.json({ error: 'Valid policy document is required' }, { status: 400 })
    }

    const pdfBuffer = await generatePDF(policy)
    const filename = `${policy.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`

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
