'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'
import ChatInterface from '@/components/ChatInterface'
import PolicyPreview from '@/components/PolicyPreview'
import { PolicyDocument } from '@/types'

export default function Home() {
  const [generatedPolicy, setGeneratedPolicy] = useState<PolicyDocument | null>(null)

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">One-Click Policy Generator</h1>
            <p className="text-sm text-muted-foreground">
              Generate professional IT, HR, Legal & Security policies
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Chat Panel */}
        <div className={`${generatedPolicy ? 'w-1/2 border-r' : 'w-full'} flex flex-col transition-all`}>
          <ChatInterface onPolicyGenerated={setGeneratedPolicy} />
        </div>

        {/* Policy Preview Panel */}
        {generatedPolicy && (
          <div className="w-1/2 p-4 overflow-hidden">
            <PolicyPreview policy={generatedPolicy} />
          </div>
        )}
      </main>
    </div>
  )
}
