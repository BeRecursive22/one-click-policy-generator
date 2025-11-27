import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { PolicyDocument } from '@/types'

const styles = StyleSheet.create({
  page: { padding: 50, fontSize: 11, fontFamily: 'Helvetica', lineHeight: 1.5 },
  header: { marginBottom: 30, borderBottom: '2 solid #333', paddingBottom: 20 },
  title: { fontSize: 24, fontFamily: 'Helvetica-Bold', marginBottom: 10, color: '#1a1a1a' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 5 },
  metadata: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, fontSize: 10, color: '#888' },
  standards: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  standardBadge: { backgroundColor: '#f0f0f0', padding: '4 8', borderRadius: 4, fontSize: 9, color: '#555' },
  section: { marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 10, color: '#333', borderBottom: '1 solid #ddd', paddingBottom: 5 },
  sectionContent: { fontSize: 11, color: '#444', textAlign: 'justify' },
  footer: { position: 'absolute', bottom: 30, left: 50, right: 50, fontSize: 9, color: '#999', textAlign: 'center', borderTop: '1 solid #eee', paddingTop: 10 },
  pageNumber: { position: 'absolute', bottom: 30, right: 50, fontSize: 9, color: '#999' },
})

function PolicyPDF({ policy }: { policy: PolicyDocument }) {
  return createElement(Document, {},
    createElement(Page, { size: 'A4', style: styles.page },
      createElement(View, { style: styles.header },
        createElement(Text, { style: styles.title }, policy.title),
        createElement(Text, { style: styles.subtitle }, policy.companyName),
        createElement(View, { style: styles.metadata },
          createElement(Text, {}, `Version: ${policy.metadata.version}`),
          createElement(Text, {}, `Effective Date: ${policy.metadata.effectiveDate}`)
        ),
        createElement(View, { style: styles.standards },
          ...policy.metadata.standards!.map((standard, i) =>
            createElement(Text, { key: i, style: styles.standardBadge }, standard)
          )
        )
      ),
      ...policy.sections.map((section, i) =>
        createElement(View, { key: i, style: styles.section, wrap: false },
          createElement(Text, { style: styles.sectionTitle }, `${i + 1}. ${section.title}`),
          createElement(Text, { style: styles.sectionContent }, section.content)
        )
      ),
      createElement(Text, { style: styles.footer },
        `This document is the property of ${policy.companyName}. Unauthorized distribution is prohibited.`
      ),
      createElement(Text, {
        style: styles.pageNumber,
        render: ({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`,
      })
    )
  )
}

export async function generatePDF(policy: PolicyDocument): Promise<Buffer> {
  const element = PolicyPDF({ policy })
  const buffer = await renderToBuffer(element)
  return Buffer.from(buffer)
}
