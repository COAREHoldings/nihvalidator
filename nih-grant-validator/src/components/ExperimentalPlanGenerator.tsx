import { useState, useCallback } from 'react'
import type { ProjectSchemaV2 } from '../types'
import { FlaskConical, Loader2, Copy, Download, Check, AlertCircle, RefreshCw, X, FileText } from 'lucide-react'
import { generateDocx, generatePdf } from '../lib/docxGenerator'

const SUPABASE_URL = 'https://dvuhtfzsvcacyrlfettz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dWh0ZnpzdmNhY3lybGZldHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDk3OTYsImV4cCI6MjA4NTIyNTc5Nn0.vUtnPXeQrzU0kO0E7qK2qJtZ_RCqnXCEFSa60adHld0'

interface Props {
  project: ProjectSchemaV2
  onClose: () => void
}

interface GeneratedPlan {
  content: string
  wordCount: number
  phase: string | null
  grantType: string
  generatedAt: string
}

type ActivePhaseTab = 'phase1' | 'phase2'

export function ExperimentalPlanGenerator({ project, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [downloadingDocx, setDownloadingDocx] = useState(false)
  
  // For non-Fast Track: single generated plan
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null)
  
  // For Fast Track: separate Phase I and Phase II
  const [phase1Plan, setPhase1Plan] = useState<GeneratedPlan | null>(null)
  const [phase2Plan, setPhase2Plan] = useState<GeneratedPlan | null>(null)
  const [activePhaseTab, setActivePhaseTab] = useState<ActivePhaseTab>('phase1')
  
  const isFastTrack = project.grant_type === 'Fast Track'

  // Build module content for generation
  const buildModuleContent = useCallback((phase?: 'Phase I' | 'Phase II') => {
    if (isFastTrack && phase) {
      // For Fast Track, use phase-specific data
      const m3Data = phase === 'Phase I' ? project.m3_fast_track.phase1 : project.m3_fast_track.phase2
      const m5Data = phase === 'Phase I' ? project.m5_fast_track?.phase1 : project.m5_fast_track?.phase2
      return {
        m1: project.m1_title_concept,
        m2: project.m2_hypothesis,
        m3: m3Data,
        m4: project.m4_team_mapping,
        m5: m5Data || {},
        m7: project.m7_regulatory,
      }
    }
    // For non-Fast Track, use standard module data
    return {
      m1: project.m1_title_concept,
      m2: project.m2_hypothesis,
      m3: project.m3_specific_aims,
      m4: project.m4_team_mapping,
      m5: project.m5_experimental_approach,
      m7: project.m7_regulatory,
    }
  }, [project, isFastTrack])

  const generatePlan = async (phase?: 'Phase I' | 'Phase II') => {
    setLoading(true)
    setError(null)
    
    try {
      const moduleContent = buildModuleContent(phase)
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-experimental-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          moduleContent,
          grantType: project.grant_type,
          phase: phase || null,
          programType: project.program_type,
          institute: project.institute,
        }),
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to generate Experimental Plan')
      }

      const plan: GeneratedPlan = result.data

      if (isFastTrack && phase) {
        if (phase === 'Phase I') {
          setPhase1Plan(plan)
        } else {
          setPhase2Plan(plan)
        }
      } else {
        setGeneratedPlan(plan)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = () => {
    if (isFastTrack) {
      generatePlan(activePhaseTab === 'phase1' ? 'Phase I' : 'Phase II')
    } else {
      generatePlan()
    }
  }

  const getCurrentPlan = (): GeneratedPlan | null => {
    if (isFastTrack) {
      return activePhaseTab === 'phase1' ? phase1Plan : phase2Plan
    }
    return generatedPlan
  }

  const copyToClipboard = async () => {
    const plan = getCurrentPlan()
    if (!plan) return
    
    try {
      await navigator.clipboard.writeText(plan.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Failed to copy to clipboard')
    }
  }

  const downloadAsText = () => {
    const plan = getCurrentPlan()
    if (!plan) return

    const phaseLabel = isFastTrack ? `_${activePhaseTab === 'phase1' ? 'Phase_I' : 'Phase_II'}` : ''
    const filename = `Experimental_Plan${phaseLabel}_${project.grant_type?.replace(/\s+/g, '_')}_${Date.now()}.txt`
    
    const blob = new Blob([plan.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadDocx = async () => {
    const plan = getCurrentPlan()
    if (!plan) return

    setDownloadingDocx(true)
    try {
      const phaseLabel = isFastTrack ? ` - ${activePhaseTab === 'phase1' ? 'Phase I' : 'Phase II'}` : ''
      await generateDocx({
        title: `Experimental Plan${phaseLabel}`,
        content: plan.content,
        filename: `Experimental_Plan${phaseLabel.replace(/\s+/g, '_')}_${Date.now()}.docx`
      })
    } catch (err) {
      console.error('DOCX generation error:', err)
    } finally {
      setDownloadingDocx(false)
    }
  }

  const handleDownloadPdf = () => {
    const plan = getCurrentPlan()
    if (!plan) return
    
    const phaseLabel = isFastTrack ? ` - ${activePhaseTab === 'phase1' ? 'Phase I' : 'Phase II'}` : ''
    generatePdf(`Experimental Plan${phaseLabel}`, plan.content)
  }

  const currentPlan = getCurrentPlan()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-primary-500" />
              Generate Experimental Plan
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              {isFastTrack 
                ? 'Generate separate Experimental Plans for Phase I and Phase II'
                : 'AI-generated Research Strategy from your Specific Aims'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Fast Track Phase Tabs */}
        {isFastTrack && (
          <div className="flex gap-2 p-4 border-b border-neutral-100 bg-neutral-50">
            <button
              onClick={() => setActivePhaseTab('phase1')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                activePhaseTab === 'phase1'
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
              }`}
            >
              Phase I Experimental Plan
              {phase1Plan && <Check className="w-4 h-4 inline ml-2" />}
            </button>
            <button
              onClick={() => setActivePhaseTab('phase2')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                activePhaseTab === 'phase2'
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
              }`}
            >
              Phase II Experimental Plan
              {phase2Plan && <Check className="w-4 h-4 inline ml-2" />}
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Generation Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {!currentPlan && !loading && (
            <div className="text-center py-12">
              <FlaskConical className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-700 mb-2">
                {isFastTrack 
                  ? `Generate ${activePhaseTab === 'phase1' ? 'Phase I' : 'Phase II'} Experimental Plan`
                  : 'Ready to Generate'}
              </h3>
              <p className="text-neutral-500 mb-6 max-w-md mx-auto">
                Click the button below to generate a comprehensive Experimental Plan / Research Strategy 
                document based on your Specific Aims and project context.
              </p>
              <div className="bg-neutral-50 rounded-lg p-4 mb-6 max-w-lg mx-auto text-left">
                <p className="text-sm font-medium text-neutral-700 mb-2">The generated plan will include:</p>
                <ul className="text-sm text-neutral-600 space-y-1">
                  <li>• Study design and methodology for each Aim</li>
                  <li>• Experimental protocols and procedures</li>
                  <li>• Timeline with milestones</li>
                  <li>• Statistical analysis approach</li>
                  <li>• Potential pitfalls and alternative strategies</li>
                  <li>• Go/No-Go criteria (for Phase I)</li>
                </ul>
              </div>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                <FlaskConical className="w-5 h-5" />
                Generate Experimental Plan
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-16">
              <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
              <p className="text-neutral-600 font-medium">Generating your Experimental Plan...</p>
              <p className="text-sm text-neutral-400 mt-1">This may take 15-30 seconds</p>
            </div>
          )}

          {currentPlan && !loading && (
            <div>
              {/* Stats Bar */}
              <div className="flex items-center justify-between mb-4 p-3 bg-neutral-50 rounded-lg">
                <div className="flex items-center gap-4 text-sm text-neutral-600">
                  <span>
                    <strong>{currentPlan.wordCount}</strong> words
                  </span>
                  <span className="text-neutral-300">|</span>
                  <span>
                    Generated: {new Date(currentPlan.generatedAt).toLocaleTimeString()}
                  </span>
                  {currentPlan.phase && (
                    <>
                      <span className="text-neutral-300">|</span>
                      <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs font-medium">
                        {currentPlan.phase}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerate}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-200 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div className="border border-neutral-200 rounded-lg overflow-hidden">
                <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-200">
                  <h4 className="font-medium text-neutral-700 text-sm">Preview</h4>
                </div>
                <div className="p-6 bg-white max-h-96 overflow-auto">
                  <div className="prose prose-neutral max-w-none">
                    {currentPlan.content.split('\n\n').map((paragraph, idx) => {
                      // Check if it's a header (starts with ## or ###)
                      if (paragraph.startsWith('###')) {
                        return (
                          <h4 key={idx} className="text-base font-semibold text-neutral-800 mt-4 mb-2">
                            {paragraph.replace(/^###\s*/, '')}
                          </h4>
                        )
                      }
                      if (paragraph.startsWith('##')) {
                        return (
                          <h3 key={idx} className="text-lg font-semibold text-neutral-900 mt-6 mb-3">
                            {paragraph.replace(/^##\s*/, '')}
                          </h3>
                        )
                      }
                      return (
                        <p key={idx} className="mb-4 text-neutral-800 leading-relaxed whitespace-pre-wrap">
                          {paragraph}
                        </p>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {currentPlan && !loading && (
          <div className="flex items-center justify-between p-6 border-t border-neutral-200 bg-neutral-50">
            <p className="text-sm text-neutral-500">
              Review the content and export when ready
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-4 py-2 border border-neutral-300 text-neutral-700 font-medium rounded-lg hover:bg-neutral-100 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={handleDownloadDocx}
                disabled={downloadingDocx}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {downloadingDocx ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                DOCX
              </button>
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-200 text-neutral-700 font-medium rounded-lg hover:bg-neutral-300 transition-colors"
              >
                <Download className="w-4 h-4" />
                PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
