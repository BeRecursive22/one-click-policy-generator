import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'

const styles = StyleSheet.create({
  page: { padding: 50, fontSize: 11, fontFamily: 'Helvetica', lineHeight: 1.6 },
  header: { marginBottom: 30, borderBottom: '2 solid #333', paddingBottom: 20 },
  title: { fontSize: 22, fontFamily: 'Helvetica-Bold', marginBottom: 8, color: '#1a1a1a' },
  subtitle: { fontSize: 12, color: '#666', marginBottom: 5, fontStyle: 'italic' },
  section: { marginTop: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 8, color: '#333' },
  subsectionTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 6, color: '#444' },
  paragraph: { fontSize: 11, color: '#444', marginBottom: 8, textAlign: 'justify' },
  listItem: { fontSize: 11, color: '#444', marginBottom: 4, marginLeft: 15 },
  pageNumber: { position: 'absolute', bottom: 30, right: 50, fontSize: 9, color: '#999' },
})

interface ParsedSection {
  title: string
  level: number
  content: string[]
}

function parseMarkdown(markdown: string): { title: string; subtitle: string; sections: ParsedSection[] } {
  const lines = markdown.split('\n')
  let title = ''
  let subtitle = ''
  const sections: ParsedSection[] = []
  let currentSection: ParsedSection | null = null

  for (const line of lines) {
    const h1Match = line.match(/^#\s+(.+)/)
    const h2Match = line.match(/^##\s+(.+)/)
    const h3Match = line.match(/^###\s+(.+)/)

    if (h1Match && !title) {
      title = h1Match[1]
    } else if (line.startsWith('*Last updated:') || line.startsWith('_Last updated:')) {
      subtitle = line.replace(/[*_]/g, '').trim()
    } else if (h2Match) {
      if (currentSection) sections.push(currentSection)
      currentSection = { title: h2Match[1], level: 2, content: [] }
    } else if (h3Match) {
      if (currentSection) sections.push(currentSection)
      currentSection = { title: h3Match[1], level: 3, content: [] }
    } else if (currentSection && line.trim()) {
      currentSection.content.push(line.trim())
    }
  }

  if (currentSection) sections.push(currentSection)

  return { title, subtitle, sections }
}

function MarkdownPDF({ markdown }: { markdown: string }) {
  const { title, subtitle, sections } = parseMarkdown(markdown)

  return createElement(Document, {},
    createElement(Page, { size: 'A4', style: styles.page, wrap: true },
      createElement(View, { style: styles.header },
        createElement(Text, { style: styles.title }, title || 'Policy Document'),
        subtitle && createElement(Text, { style: styles.subtitle }, subtitle)
      ),
      ...sections.map((section, i) =>
        createElement(View, { key: i, style: styles.section, wrap: false },
          createElement(Text, { style: section.level === 2 ? styles.sectionTitle : styles.subsectionTitle }, section.title),
          ...section.content.map((line, j) => {
            const isList = line.startsWith('-') || line.startsWith('•') || /^\d+\./.test(line)
            return createElement(Text, {
              key: j,
              style: isList ? styles.listItem : styles.paragraph
            }, isList ? `• ${line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '')}` : line)
          })
        )
      ),
      createElement(Text, {
        style: styles.pageNumber,
        render: ({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`,
        fixed: true
      })
    )
  )
}

export async function generatePDFFromMarkdown(markdown: string): Promise<Buffer> {
  const element = MarkdownPDF({ markdown })
  const buffer = await renderToBuffer(element)
  return Buffer.from(buffer)
}
