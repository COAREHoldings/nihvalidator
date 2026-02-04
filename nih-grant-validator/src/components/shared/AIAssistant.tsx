import { useState } from 'react'
import { Sparkles, ChevronRight, ChevronLeft, Lightbulb, FileText, ShieldCheck, Loader2, X, Copy, Check } from 'lucide-react'

const SUPABASE_URL = 'https://dvuhtfzsvcacyrlfettz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dWh0ZnpzdmNhY3lybGZldHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDk3OTYsImV4cCI6MjA4NTIyNTc5Nn0.vUtnPXeQrzU0kO0E7qK2qJtZ_RCqnXCEFSa60adHld0'

interface AIAssistantProps {
  isOpen: boolean
  onToggle: () => void
  currentStep: number
  stepName: string
  context?: string
}

async function callAIRefine(action: string, payload: Record<string, unknown>): Promise<{ result?: string; error?: string }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-refine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ action, ...payload })
    })
    const data = await response.json()
    if (data.error) return { error: data.error.message || 'AI request failed' }
    return { result: data.result || data.suggestions?.[0] || data.draft || '' }
  } catch (err) {
    return { error: 'Failed to connect to AI service' }
  }
}

const STEP_PROMPTS: Record<number, { title: string; suggestions: string[] }> = {
  1: {
    title: 'Setup Tips',
    suggestions: [
      'Select the grant type that best matches your project stage',
      'Choose the NIH Institute most aligned with your research area',
      'Upload your FOA for automatic requirements extraction'
    ]
  },
  2: {
    title: 'Core Concept Tips',
    suggestions: [
      'Start with a clear problem statement that identifies the unmet need',
      'Your hypothesis should be testable and directly address the problem',
      'Specific aims should be achievable within the funding period'
    ]
  },
  3: {
    title: 'Research Plan Tips',
    suggestions: [
      'Describe methodology in sufficient detail for reproducibility',
      'Include statistical power analysis and sample size justification',
      'Address potential pitfalls and alternative approaches'
    ]
  },
  4: {
    title: 'Team & Budget Tips',
    suggestions: [
      'Highlight relevant expertise for each team member',
      'Ensure budget stays within NIH caps for your grant type',
      'SBIR requires minimum 67% small business effort (Phase I)'
    ]
  },
  5: {
    title: 'Review Tips',
    suggestions: [
      'Run validation to identify missing required fields',
      'Review compliance audit before export',
      'Export JSON for document generation'
    ]
  }
}

export function AIAssistant({ isOpen, onToggle, currentStep, stepName, context }: AIAssistantProps) {
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const stepPrompts = STEP_PROMPTS[currentStep] || STEP_PROMPTS[1]

  const handleAskAI = async () => {
    if (!query.trim()) return
    
    setLoading(true)
    setError(null)
    
    const { result, error: aiError } = await callAIRefine('general_assist', {
      query,
      context: `NIH SBIR/STTR grant application - ${stepName}. ${context || ''}`,
      step: currentStep
    })

    setLoading(false)
    
    if (aiError) {
      setError(aiError)
    } else {
      setResponse(result || null)
    }
  }

  const handleCopy = () => {
    if (response) {
      navigator.clipboard.writeText(response)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleQuickPrompt = async (prompt: string) => {
    setQuery(prompt)
    setLoading(true)
    setError(null)
    
    const { result, error: aiError } = await callAIRefine('general_assist', {
      query: prompt,
      context: `NIH SBIR/STTR grant application - ${stepName}. ${context || ''}`,
      step: currentStep
    })

    setLoading(false)
    
    if (aiError) {
      setError(aiError)
    } else {
      setResponse(result || null)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-primary-500 text-white p-3 rounded-l-lg shadow-lg hover:bg-primary-600 transition-colors z-40"
        title="Open AI Assistant"
      >
        <ChevronLeft className="w-5 h-5" />
        <Sparkles className="w-5 h-5 mt-1" />
      </button>
    )
  }

  return (
    <aside className="w-80 border-l border-neutral-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 text-sm">AI Assistant</h3>
            <p className="text-xs text-neutral-500">{stepName}</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Tips */}
      <div className="p-4 border-b border-neutral-100">
        <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
          {stepPrompts.title}
        </h4>
        <ul className="space-y-2">
          {stepPrompts.suggestions.map((tip, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-neutral-600">{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Ask AI Section */}
      <div className="flex-1 overflow-auto p-4">
        <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
          Ask AI
        </h4>
        
        <div className="space-y-2 mb-4">
          <button
            onClick={() => handleQuickPrompt(`Help me write a compelling ${stepName.toLowerCase()} section`)}
            className="w-full text-left text-xs px-3 py-2 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors"
          >
            Help me write this section
          </button>
          <button
            onClick={() => handleQuickPrompt(`What are common mistakes in ${stepName.toLowerCase()} for NIH SBIR/STTR?`)}
            className="w-full text-left text-xs px-3 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
          >
            Common mistakes to avoid
          </button>
          <button
            onClick={() => handleQuickPrompt(`Check my ${stepName.toLowerCase()} for NIH compliance issues`)}
            className="w-full text-left text-xs px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
          >
            Check compliance
          </button>
        </div>

        <div className="relative">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about your grant..."
            rows={3}
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            onClick={handleAskAI}
            disabled={loading || !query.trim()}
            className="absolute bottom-2 right-2 p-1.5 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {response && (
          <div className="mt-3 p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-500">AI Response</span>
              <button
                onClick={handleCopy}
                className="p-1 text-neutral-400 hover:text-neutral-600"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-sm text-neutral-700 whitespace-pre-wrap">{response}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-neutral-100 bg-neutral-50">
        <p className="text-xs text-neutral-400 text-center">
          AI suggestions are for guidance only. Always verify with NIH guidelines.
        </p>
      </div>
    </aside>
  )
}
