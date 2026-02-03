import { useState, useCallback } from 'react'
import type { ProjectSchemaV2 } from '../types'
import { FileText, Loader2, Copy, Download, Check, AlertCircle, RefreshCw, X } from 'lucide-react'

const SUPABASE_URL = 'https://raqkwtjsxohnhtcacakb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhcWt3dGpzeG9obmh0Y2FjYWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDIyNTQsImV4cCI6MjA4NTI3ODI1NH0.pDpNp4UlpCinhi6gl2qtKhT3t20uUGHU_FUxTxYjttI'

interface Props {
  project: ProjectSchemaV2
  onClose: () => void
}

interface GeneratedAims {
  content: string
  wordCount: number
  phase: string | null
  grantType: string
  generatedAt: string
}

type ActivePhaseTab = 'phase1' | 'phase2'

export function SpecificAimsGenerator({ project, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  
  // For non-Fast Track: single generated aims
  const [generatedAims, setGeneratedAims] = useState<GeneratedAims | null>(null)
  
  // For Fast Track: separate Phase I and Phase II
  const [phase1Aims, setPhase1Aims] = useState<GeneratedAims | null>(null)
  const [phase2Aims, setPhase2Aims] = useState<GeneratedAims | null>(null)
  const [activePhaseTab, setActivePhaseTab] = useState<ActivePhaseTab>('phase1')
  
  const isFastTrack = project.grant_type === 'Fast Track'

  // Build module content for generation
  const buildModuleContent = useCallback((phase?: 'Phase I' | 'Phase II') => {
    if (isFastTrack && phase) {
      // For Fast Track, use phase-specific data
      const m3Data = phase === 'Phase I' ? project.m3_fast_track.phase1 : project.m3_fast_track.phase2
      return {
        m1: project.m1_title_concept,
        m2: project.m2_hypothesis,
        m3: m3Data,
        m4: project.m4_team_mapping,
      }
    }
    // For non-Fast Track, use standard module data
    return {
      m1: project.m1_title_concept,
      m2: project.m2_hypothesis,
      m3: project.m3_specific_aims,
      m4: project.m4_team_mapping,
    }
  }, [project, isFastTrack])

  const generateAimsPage = async (phase?: 'Phase I' | 'Phase II') => {
    setLoading(true)
    setError(null)
    
    try {
      const moduleContent = buildModuleContent(phase)
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-aims-page`, {
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
        }),
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to generate Specific Aims page')
      }

      const aims: GeneratedAims = result.data

      if (isFastTrack && phase) {
        if (phase === 'Phase I') {
          setPhase1Aims(aims)
        } else {
          setPhase2Aims(aims)
        }
      } else {
        setGeneratedAims(aims)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = () => {
    if (isFastTrack) {
      generateAimsPage(activePhaseTab === 'phase1' ? 'Phase I' : 'Phase II')
    } else {
      generateAimsPage()
    }
  }

  const getCurrentAims = (): GeneratedAims | null => {
    if (isFastTrack) {
      return activePhaseTab === 'phase1' ? phase1Aims : phase2Aims
    }
    return generatedAims
  }

  const copyToClipboard = async () => {
    const aims = getCurrentAims()
    if (!aims) return
    
    try {
      await navigator.clipboard.writeText(aims.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Failed to copy to clipboard')
    }
  }

  const downloadAsText = () => {
    const aims = getCurrentAims()
    if (!aims) return

    const phaseLabel = isFastTrack ? `_${activePhaseTab === 'phase1' ? 'Phase_I' : 'Phase_II'}` : ''
    const filename = `Specific_Aims${phaseLabel}_${project.grant_type?.replace(/\s+/g, '_')}_${Date.now()}.txt`
    
    const blob = new Blob([aims.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const currentAims = getCurrentAims()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary-500" />
              Generate Specific Aims Page
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              {isFastTrack 
                ? 'Generate separate Specific Aims pages for Phase I and Phase II'
                : 'AI-generated NIH Specific Aims page from your module content'}
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
              Phase I Specific Aims
              {phase1Aims && <Check className="w-4 h-4 inline ml-2" />}
            </button>
            <button
              onClick={() => setActivePhaseTab('phase2')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                activePhaseTab === 'phase2'
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
              }`}
            >
              Phase II Specific Aims
              {phase2Aims && <Check className="w-4 h-4 inline ml-2" />}
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

          {!currentAims && !loading && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-700 mb-2">
                {isFastTrack 
                  ? `Generate ${activePhaseTab === 'phase1' ? 'Phase I' : 'Phase II'} Specific Aims`
                  : 'Ready to Generate'}
              </h3>
              <p className="text-neutral-500 mb-6 max-w-md mx-auto">
                Click the button below to generate a properly formatted NIH Specific Aims page 
                using content from your completed modules (1-4).
              </p>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                <FileText className="w-5 h-5" />
                Generate Specific Aims
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-16">
              <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
              <p className="text-neutral-600 font-medium">Generating your Specific Aims page...</p>
              <p className="text-sm text-neutral-400 mt-1">This may take a few seconds</p>
            </div>
          )}

          {currentAims && !loading && (
            <div>
              {/* Stats Bar */}
              <div className="flex items-center justify-between mb-4 p-3 bg-neutral-50 rounded-lg">
                <div className="flex items-center gap-4 text-sm text-neutral-600">
                  <span>
                    <strong>{currentAims.wordCount}</strong> words
                  </span>
                  <span className="text-neutral-300">|</span>
                  <span>
                    Generated: {new Date(currentAims.generatedAt).toLocaleTimeString()}
                  </span>
                  {currentAims.phase && (
                    <>
                      <span className="text-neutral-300">|</span>
                      <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs font-medium">
                        {currentAims.phase}
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
                <div className="p-6 bg-white">
                  <div className="prose prose-neutral max-w-none">
                    {currentAims.content.split('\n\n').map((paragraph, idx) => (
                      <p key={idx} className="mb-4 text-neutral-800 leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {currentAims && !loading && (
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
                    Copy to Clipboard
                  </>
                )}
              </button>
              <button
                onClick={downloadAsText}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
