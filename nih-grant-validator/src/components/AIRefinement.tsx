import { useState } from 'react'
import { Sparkles, ShieldCheck, Users, BarChart3, Loader2, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, Lock } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import type { AIGatingResult } from '../types'

const supabase = createClient(
  'https://dvuhtfzsvcacyrlfettz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dWh0ZnpzdmNhY3lybGZldHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDk3OTYsImV4cCI6MjA4NTIyNTc5Nn0.vUtnPXeQrzU0kO0E7qK2qJtZ_RCqnXCEFSa60adHld0'
)

type TabType = 'refine' | 'compliance' | 'reviewer' | 'score'

const SECTION_TYPES = ['Specific Aims', 'Significance', 'Innovation', 'Approach', 'Commercialization Plan', 'Progress Report']
const GRANT_TYPES = ['Phase I', 'Phase II', 'Fast Track', 'Direct to Phase II', 'Phase IIB']

interface RefineResult {
  summary: string
  strengths: string[]
  improvements: { issue: string; suggestion: string }[]
  revisedExcerpt: string
}

interface ComplianceResult {
  compliant: boolean
  issues: { text: string; problem: string; suggestion: string }[]
  overallRisk: 'low' | 'medium' | 'high'
}

interface ReviewerResult {
  overallImpression: string
  significance: { score: number; strengths: string[]; weaknesses: string[] }
  innovation: { score: number; strengths: string[]; weaknesses: string[] }
  approach: { score: number; strengths: string[]; weaknesses: string[] }
  additionalComments: string
}

interface ScoreResult {
  predictedScore: number
  confidence: 'low' | 'medium' | 'high'
  rationale: string
  scoringFactors: { positive: string[]; negative: string[] }
  improvementPotential: string
}

interface Props {
  aiGating: AIGatingResult
}

export function AIRefinement({ aiGating }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('refine')
  const [text, setText] = useState('')
  const [sectionType, setSectionType] = useState('Specific Aims')
  const [grantType, setGrantType] = useState('Phase I')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RefineResult | ComplianceResult | ReviewerResult | ScoreResult | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  const tabs = [
    { id: 'refine', label: 'Section Refinement', icon: Sparkles, desc: 'Get improvement suggestions' },
    { id: 'compliance', label: 'Compliance Check', icon: ShieldCheck, desc: 'Check for prohibited language' },
    { id: 'reviewer', label: 'Reviewer Simulation', icon: Users, desc: 'Simulate NIH reviewer feedback' },
    { id: 'score', label: 'Score Prediction', icon: BarChart3, desc: 'Estimate impact score' },
  ] as const

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // AI Gating Block
  if (!aiGating.allowed) {
    return (
      <div>
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">AI Refinement</h2>
          <p className="text-neutral-600">Use AI to improve your grant sections and get expert feedback</p>
        </div>
        
        <div className="p-8 bg-neutral-50 rounded-lg border border-neutral-200 text-center">
          <Lock className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-neutral-700 mb-2">AI Refinement Locked</h3>
          <p className="text-neutral-500 mb-6">{aiGating.blocking_reason}</p>
          
          {aiGating.missing_fields.length > 0 && (
            <div className="text-left max-w-md mx-auto">
              <h4 className="font-semibold text-neutral-700 mb-3">Missing Requirements:</h4>
              {aiGating.missing_fields.map(mf => (
                <div key={mf.module_id} className="mb-3 p-3 bg-white rounded border border-neutral-200">
                  <p className="font-medium text-neutral-800 mb-1">Module {mf.module_id}</p>
                  <ul className="text-sm text-neutral-600">
                    {mf.fields.slice(0, 3).map(f => (
                      <li key={f}>- {f.replace(/_/g, ' ')}</li>
                    ))}
                    {mf.fields.length > 3 && (
                      <li className="text-neutral-400">...and {mf.fields.length - 3} more</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError('Please enter text to analyze')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-refine', {
        body: { action: activeTab, text, sectionType, grantType }
      })

      if (fnError) throw new Error(fnError.message)
      if (data?.error) throw new Error(data.error.message)
      setResult(data?.data || data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const renderResult = () => {
    if (!result) return null

    if (activeTab === 'refine') {
      const r = result as RefineResult
      return (
        <div className="space-y-6">
          <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
            <h4 className="font-semibold text-neutral-900 mb-2">Summary</h4>
            <p className="text-neutral-700">{r.summary}</p>
          </div>
          <div>
            <h4 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-semantic-success" /> Strengths
            </h4>
            <ul className="space-y-2">
              {r.strengths?.map((s, i) => (
                <li key={i} className="p-3 bg-green-50 border border-green-200 rounded-lg text-neutral-800">{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-semantic-warning" /> Suggested Improvements
            </h4>
            <div className="space-y-3">
              {r.improvements?.map((imp, i) => (
                <div key={i} className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="font-medium text-neutral-900 mb-1">Issue: {imp.issue}</p>
                  <p className="text-neutral-700">Suggestion: {imp.suggestion}</p>
                </div>
              ))}
            </div>
          </div>
          {r.revisedExcerpt && (
            <div>
              <h4 className="font-semibold text-neutral-900 mb-3">Revised Excerpt</h4>
              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
                <p className="text-neutral-800 whitespace-pre-wrap">{r.revisedExcerpt}</p>
              </div>
            </div>
          )}
        </div>
      )
    }

    if (activeTab === 'compliance') {
      const r = result as ComplianceResult
      return (
        <div className="space-y-6">
          <div className={`p-4 rounded-lg border ${r.compliant ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-3">
              {r.compliant ? <CheckCircle className="w-8 h-8 text-semantic-success" /> : <XCircle className="w-8 h-8 text-semantic-error" />}
              <div>
                <h4 className="font-semibold text-neutral-900">{r.compliant ? 'Compliant' : 'Issues Found'}</h4>
                <p className="text-neutral-700">Overall Risk: <span className="font-semibold">{r.overallRisk.toUpperCase()}</span></p>
              </div>
            </div>
          </div>
          {r.issues?.length > 0 && (
            <div>
              <h4 className="font-semibold text-neutral-900 mb-3">Compliance Issues</h4>
              <div className="space-y-3">
                {r.issues.map((issue, i) => (
                  <div key={i} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 font-mono mb-2">"{issue.text}"</p>
                    <p className="text-neutral-900 mb-1"><strong>Problem:</strong> {issue.problem}</p>
                    <p className="text-neutral-700"><strong>Fix:</strong> {issue.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }

    if (activeTab === 'reviewer') {
      const r = result as ReviewerResult
      const sections = [
        { key: 'significance', label: 'Significance', data: r.significance },
        { key: 'innovation', label: 'Innovation', data: r.innovation },
        { key: 'approach', label: 'Approach', data: r.approach },
      ]
      return (
        <div className="space-y-6">
          <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
            <h4 className="font-semibold text-neutral-900 mb-2">Overall Impression</h4>
            <p className="text-neutral-700 whitespace-pre-wrap">{r.overallImpression}</p>
          </div>
          {sections.map(({ key, label, data }) => (
            <div key={key} className="border border-neutral-200 rounded-lg overflow-hidden">
              <button onClick={() => toggleSection(key)} className="w-full p-4 bg-neutral-50 flex items-center justify-between hover:bg-neutral-100 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-neutral-900">{label}</span>
                  <span className={`px-2 py-1 rounded text-sm font-bold ${data.score <= 3 ? 'bg-green-100 text-green-800' : data.score <= 5 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                    Score: {data.score}
                  </span>
                </div>
                {expandedSections[key] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {expandedSections[key] && (
                <div className="p-4 space-y-4">
                  <div>
                    <h5 className="text-sm font-semibold text-green-700 mb-2">Strengths</h5>
                    <ul className="space-y-1">{data.strengths?.map((s: string, i: number) => <li key={i} className="text-neutral-700 text-sm">- {s}</li>)}</ul>
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold text-red-700 mb-2">Weaknesses</h5>
                    <ul className="space-y-1">{data.weaknesses?.map((w: string, i: number) => <li key={i} className="text-neutral-700 text-sm">- {w}</li>)}</ul>
                  </div>
                </div>
              )}
            </div>
          ))}
          {r.additionalComments && (
            <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
              <h4 className="font-semibold text-neutral-900 mb-2">Additional Comments</h4>
              <p className="text-neutral-700">{r.additionalComments}</p>
            </div>
          )}
        </div>
      )
    }

    if (activeTab === 'score') {
      const r = result as ScoreResult
      const scoreLabel = r.predictedScore <= 2 ? 'Exceptional/Outstanding' : r.predictedScore <= 4 ? 'Excellent/Very Good' : r.predictedScore <= 6 ? 'Good/Satisfactory' : 'Fair/Marginal'
      return (
        <div className="space-y-6">
          <div className={`p-6 rounded-lg border text-center ${r.predictedScore <= 3 ? 'bg-green-50 border-green-200' : r.predictedScore <= 5 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
            <div className={`text-6xl font-bold mb-2 ${r.predictedScore <= 3 ? 'text-green-600' : r.predictedScore <= 5 ? 'text-amber-600' : 'text-red-600'}`}>{r.predictedScore}</div>
            <p className="text-lg font-semibold text-neutral-900">{scoreLabel}</p>
            <p className="text-sm text-neutral-600">Confidence: {r.confidence}</p>
          </div>
          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <h4 className="font-semibold text-neutral-900 mb-2">Rationale</h4>
            <p className="text-neutral-700">{r.rationale}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-3">Positive Factors</h4>
              <ul className="space-y-2">{r.scoringFactors?.positive?.map((p, i) => <li key={i} className="text-neutral-700 text-sm">+ {p}</li>)}</ul>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-800 mb-3">Negative Factors</h4>
              <ul className="space-y-2">{r.scoringFactors?.negative?.map((n, i) => <li key={i} className="text-neutral-700 text-sm">- {n}</li>)}</ul>
            </div>
          </div>
          <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
            <h4 className="font-semibold text-neutral-900 mb-2">Improvement Potential</h4>
            <p className="text-neutral-700">{r.improvementPotential}</p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">AI Refinement</h2>
        <p className="text-neutral-600">Use AI to improve your grant sections and get expert feedback</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setResult(null); setError(null) }} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${activeTab === tab.id ? 'bg-primary-500 text-white shadow-sm' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}>
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <p className="text-sm text-neutral-500 mb-6">{tabs.find(t => t.id === activeTab)?.desc}</p>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Section Type</label>
          <select value={sectionType} onChange={e => setSectionType(e.target.value)} className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
            {SECTION_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Grant Type</label>
          <select value={grantType} onChange={e => setGrantType(e.target.value)} className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
            {GRANT_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-neutral-700 mb-2">Paste your grant section text</label>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={10} placeholder="Paste your Specific Aims, Research Strategy, or other grant section text here..." className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y" />
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <XCircle className="w-5 h-5 text-semantic-error flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <button onClick={handleAnalyze} disabled={loading || !text.trim()} className="w-full px-6 py-4 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        {loading ? (<><Loader2 className="w-5 h-5 animate-spin" />Analyzing...</>) : (<><Sparkles className="w-5 h-5" />Analyze with AI</>)}
      </button>

      {result && (
        <div className="mt-8 pt-8 border-t border-neutral-200">
          <h3 className="text-xl font-semibold text-neutral-900 mb-6">Results</h3>
          {renderResult()}
        </div>
      )}
    </div>
  )
}
