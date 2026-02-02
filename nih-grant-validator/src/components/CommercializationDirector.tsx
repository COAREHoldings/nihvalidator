import { useState, useEffect, useMemo } from 'react'
import type { ProjectSchemaV2, M9CommercializationPlan, GrantType } from '../types'
import { NIH_COMMERCIALIZATION_HEADINGS, COMMERCIALIZATION_PAGE_LIMITS, WORDS_PER_PAGE } from '../types'
import { Sparkles, Loader2, Check, X, AlertTriangle, FileText, Download, ChevronDown, ChevronRight, Shield, TrendingUp } from 'lucide-react'

const SUPABASE_URL = 'https://dvuhtfzsvcacyrlfettz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dWh0ZnpzdmNhY3lybGZldHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDk3OTYsImV4cCI6MjA4NTIyNTc5Nn0.vUtnPXeQrzU0kO0E7qK2qJtZ_RCqnXCEFSa60adHld0'

interface Props {
  project: ProjectSchemaV2
  onUpdate: (updates: Partial<ProjectSchemaV2>) => void
}

interface SectionConfig {
  key: keyof M9CommercializationPlan
  heading: string
  prompts: { key: string; label: string; placeholder: string; multiline?: boolean }[]
  pageRange: { min: number; max: number }
  aiPrompt: string
}

const SECTION_CONFIGS: SectionConfig[] = [
  {
    key: 'section1_value',
    heading: NIH_COMMERCIALIZATION_HEADINGS[0],
    prompts: [
      { key: 'product_service_description', label: 'What product/service will result?', placeholder: 'Describe the product or service that will result from this project', multiline: true },
      { key: 'unmet_need', label: 'What unmet need does it address?', placeholder: 'Describe the unmet clinical, market, or societal need', multiline: true },
      { key: 'phase2_outcomes', label: 'What outcomes will Phase II achieve?', placeholder: 'Specific milestones and deliverables expected from Phase II', multiline: true },
      { key: 'measurable_impact', label: 'What measurable impact is expected?', placeholder: 'Quantifiable outcomes (lives saved, cost reduction, efficiency gains)', multiline: true }
    ],
    pageRange: COMMERCIALIZATION_PAGE_LIMITS.section1,
    aiPrompt: 'Convert these responses into a clear NIH-compliant narrative for the Value, Outcomes, and Impact section. Remove promotional language, emphasize measurable outcomes, and flag any unsupported claims.'
  },
  {
    key: 'section2_company',
    heading: NIH_COMMERCIALIZATION_HEADINGS[1],
    prompts: [
      { key: 'legal_entity_status', label: 'Legal entity status', placeholder: 'Corporation type, state of incorporation, founding date', multiline: false },
      { key: 'management_team', label: 'Management team', placeholder: 'Key executives and their relevant experience', multiline: true },
      { key: 'technical_expertise', label: 'Technical expertise', placeholder: 'Core technical capabilities and credentials', multiline: true },
      { key: 'prior_funding', label: 'Prior funding', placeholder: 'Previous SBIR/STTR awards, venture funding, grants', multiline: true },
      { key: 'commercialization_experience', label: 'Commercialization experience', placeholder: 'Track record of bringing products to market', multiline: true }
    ],
    pageRange: COMMERCIALIZATION_PAGE_LIMITS.section2,
    aiPrompt: 'Create a Company section narrative highlighting execution credibility. Avoid exaggeration, align team capabilities to commercialization goals.'
  },
  {
    key: 'section3_market',
    heading: NIH_COMMERCIALIZATION_HEADINGS[2],
    prompts: [
      { key: 'paying_customer', label: 'Who is the paying customer?', placeholder: 'Hospitals, insurers, patients, pharma companies, etc.', multiline: true },
      { key: 'end_user', label: 'Who is the end user?', placeholder: 'Physicians, patients, lab technicians, etc.', multiline: true },
      { key: 'alternatives_exist', label: 'What alternatives exist?', placeholder: 'Current solutions, competitors, standard of care', multiline: true },
      { key: 'switch_reason', label: 'Why will customers switch?', placeholder: 'Key differentiators and value proposition', multiline: true },
      { key: 'market_size_assumptions', label: 'Market size assumptions', placeholder: 'Data sources and calculations for market estimates', multiline: true },
      { key: 'tam_sam_som', label: 'TAM/SAM/SOM breakdown', placeholder: 'Total Addressable Market, Serviceable Addressable Market, Serviceable Obtainable Market', multiline: true }
    ],
    pageRange: COMMERCIALIZATION_PAGE_LIMITS.section3,
    aiPrompt: 'Structure a Market, Customer, and Competition section with clear TAM/SAM/SOM. Display assumptions explicitly, avoid inflated market claims, and generate competitive differentiation.'
  },
  {
    key: 'section4_ip',
    heading: NIH_COMMERCIALIZATION_HEADINGS[3],
    prompts: [
      { key: 'patents_filed_issued', label: 'Patents filed or issued', placeholder: 'Patent numbers, filing dates, status', multiline: true },
      { key: 'licensing_agreements', label: 'Licensing agreements', placeholder: 'Existing licenses, terms, exclusivity', multiline: true },
      { key: 'freedom_to_operate', label: 'Freedom-to-operate review', placeholder: 'FTO analysis status, potential blocking patents', multiline: true },
      { key: 'exclusivity_timeline', label: 'Exclusivity timeline', placeholder: 'Expected patent life and protection period', multiline: true }
    ],
    pageRange: COMMERCIALIZATION_PAGE_LIMITS.section4,
    aiPrompt: 'Draft a structured IP Protection narrative. Flag any protection gaps, avoid unsupported claims of "strong IP".'
  },
  {
    key: 'section5_finance',
    heading: NIH_COMMERCIALIZATION_HEADINGS[4],
    prompts: [
      { key: 'total_capital_required', label: 'Total capital required post-award', placeholder: 'Amount needed to reach commercialization', multiline: true },
      { key: 'current_funding_secured', label: 'Current funding secured', placeholder: 'Committed funding sources and amounts', multiline: true },
      { key: 'investor_commitments', label: 'Investor commitments', placeholder: 'Letters of intent, term sheets, verbal commitments', multiline: true },
      { key: 'matching_funds_phase2b', label: 'Matching funds (Phase IIB)', placeholder: 'Required for Phase IIB applications', multiline: true },
      { key: 'burn_rate_runway', label: 'Burn rate and runway', placeholder: 'Monthly expenses and months of runway', multiline: true }
    ],
    pageRange: COMMERCIALIZATION_PAGE_LIMITS.section5,
    aiPrompt: 'Create a Finance Plan aligning needs with milestones. Detect unrealistic funding assumptions, emphasize investor validation.'
  },
  {
    key: 'section6_revenue',
    heading: NIH_COMMERCIALIZATION_HEADINGS[5],
    prompts: [
      { key: 'revenue_model', label: 'Revenue model', placeholder: 'Licensing, direct sales, acquisition target, subscription, etc.', multiline: true },
      { key: 'pricing_assumptions', label: 'Pricing assumptions', placeholder: 'Basis for pricing, competitive comparison', multiline: true },
      { key: 'time_to_revenue', label: 'Time to revenue', placeholder: 'Timeline from Phase II completion to first revenue', multiline: true },
      { key: 'break_even_projection', label: 'Break-even projection', placeholder: 'Units/revenue needed to break even, timeline', multiline: true }
    ],
    pageRange: COMMERCIALIZATION_PAGE_LIMITS.section6,
    aiPrompt: 'Draft a Revenue Stream section with clear formulas. Avoid exaggerated projections, ensure consistency with market size and finance plan.'
  }
]

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
    return { result: data.result || data.draft || '' }
  } catch {
    return { error: 'Failed to connect to AI service' }
  }
}

function countWords(text: string): number {
  return text?.trim().split(/\s+/).filter(w => w.length > 0).length || 0
}

function wordsToPages(words: number): number {
  return Math.round((words / WORDS_PER_PAGE) * 10) / 10
}

interface SectionEditorProps {
  config: SectionConfig
  data: Record<string, unknown>
  onUpdate: (updates: Record<string, unknown>) => void
  grantType: GrantType | null
  isPhase2B: boolean
}

function SectionEditor({ config, data, onUpdate, grantType, isPhase2B }: SectionEditorProps) {
  const [expanded, setExpanded] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const sectionWordCount = useMemo(() => {
    let total = 0
    config.prompts.forEach(p => {
      total += countWords(String(data[p.key] || ''))
    })
    total += countWords(String(data.ai_narrative || ''))
    return total
  }, [config.prompts, data])

  const pageCount = wordsToPages(sectionWordCount)
  const isOverLimit = pageCount > config.pageRange.max
  const isUnderLimit = pageCount < config.pageRange.min && sectionWordCount > 0

  const handleGenerateNarrative = async () => {
    setAiLoading(true)
    setAiError(null)
    
    const responses = config.prompts.map(p => ({
      question: p.label,
      answer: String(data[p.key] || '')
    })).filter(r => r.answer.trim())

    const { result, error } = await callAIRefine('commercialization_narrative', {
      section: config.heading,
      responses,
      instructions: config.aiPrompt,
      grant_type: grantType,
      is_phase2b: isPhase2B
    })

    setAiLoading(false)
    if (error) {
      setAiError(error)
    } else {
      onUpdate({ ai_narrative: result, ai_approved: false })
    }
  }

  const handleCompressNarrative = async () => {
    if (!data.ai_narrative) return
    setAiLoading(true)
    setAiError(null)

    const targetWords = Math.floor(config.pageRange.max * WORDS_PER_PAGE * 0.9)
    const { result, error } = await callAIRefine('compress_narrative', {
      content: data.ai_narrative,
      target_words: targetWords,
      section: config.heading
    })

    setAiLoading(false)
    if (error) {
      setAiError(error)
    } else {
      onUpdate({ ai_narrative: result, ai_approved: false })
    }
  }

  return (
    <div className="border border-neutral-200 rounded-lg mb-4 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 bg-neutral-50 flex items-center justify-between hover:bg-neutral-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          <span className="font-semibold text-neutral-900">{config.heading}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-1 rounded ${isOverLimit ? 'bg-red-100 text-red-700' : isUnderLimit ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
            {pageCount} / {config.pageRange.max} pages
          </span>
          {data.ai_approved && <Check className="w-4 h-4 text-green-600" />}
        </div>
      </button>

      {expanded && (
        <div className="p-4">
          <p className="text-sm text-neutral-600 mb-4">
            Recommended: {config.pageRange.min}-{config.pageRange.max} pages (~{Math.round(config.pageRange.min * WORDS_PER_PAGE)}-{Math.round(config.pageRange.max * WORDS_PER_PAGE)} words)
          </p>

          {config.prompts.map(prompt => (
            <div key={prompt.key} className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                {prompt.label}
                {isPhase2B && prompt.key === 'matching_funds_phase2b' && (
                  <span className="ml-2 text-xs text-red-600 font-semibold">Required for Phase IIB</span>
                )}
              </label>
              {prompt.multiline ? (
                <textarea
                  value={String(data[prompt.key] || '')}
                  onChange={e => onUpdate({ [prompt.key]: e.target.value })}
                  placeholder={prompt.placeholder}
                  rows={3}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y text-sm"
                />
              ) : (
                <input
                  type="text"
                  value={String(data[prompt.key] || '')}
                  onChange={e => onUpdate({ [prompt.key]: e.target.value })}
                  placeholder={prompt.placeholder}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              )}
            </div>
          ))}

          <div className="mt-6 pt-4 border-t border-neutral-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-neutral-900">AI-Generated Narrative</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateNarrative}
                  disabled={aiLoading}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                >
                  {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate
                </button>
                {isOverLimit && data.ai_narrative && (
                  <button
                    onClick={handleCompressNarrative}
                    disabled={aiLoading}
                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                  >
                    Compress
                  </button>
                )}
              </div>
            </div>

            {aiError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {aiError}
              </div>
            )}

            {data.ai_narrative ? (
              <div>
                <textarea
                  value={String(data.ai_narrative)}
                  onChange={e => onUpdate({ ai_narrative: e.target.value, ai_approved: false })}
                  rows={8}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y text-sm"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-neutral-500">
                    {countWords(String(data.ai_narrative))} words
                  </span>
                  <div className="flex items-center gap-2">
                    {data.ai_approved ? (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <Check className="w-4 h-4" /> Approved
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => onUpdate({ ai_approved: true })}
                          className="flex items-center gap-1 text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          <Check className="w-4 h-4" /> Accept
                        </button>
                        <button
                          onClick={() => onUpdate({ ai_narrative: '', ai_approved: false })}
                          className="flex items-center gap-1 text-sm px-3 py-1 bg-neutral-200 text-neutral-700 rounded hover:bg-neutral-300"
                        >
                          <X className="w-4 h-4" /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-500 italic">
                Fill in the prompts above, then click "Generate" to create NIH-compliant narrative.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function CommercializationDirector({ project, onUpdate }: Props) {
  const grantType = project.grant_type
  const isPhase2B = grantType === 'Phase IIB'
  const isFastTrack = grantType === 'Fast Track'
  const data = project.m9_commercialization || {}

  // Calculate totals
  const totals = useMemo(() => {
    let words = 0
    let approvedSections = 0

    SECTION_CONFIGS.forEach(config => {
      const sectionData = data[config.key] as Record<string, unknown> || {}
      config.prompts.forEach(p => {
        words += countWords(String(sectionData[p.key] || ''))
      })
      words += countWords(String(sectionData.ai_narrative || ''))
      if (sectionData.ai_approved) approvedSections++
    })

    return {
      words,
      pages: wordsToPages(words),
      approvedSections,
      totalSections: 6
    }
  }, [data])

  // Validation score calculation
  const validationResult = useMemo(() => {
    let score = 0
    const riskFlags: string[] = []
    const weaknesses: string[] = []

    // Check all sections present (30 points)
    const sectionsWithContent = SECTION_CONFIGS.filter(config => {
      const sectionData = data[config.key] as Record<string, unknown> || {}
      return sectionData.ai_narrative || config.prompts.some(p => sectionData[p.key])
    }).length
    score += (sectionsWithContent / 6) * 30

    // Check all sections approved (30 points)
    score += (totals.approvedSections / 6) * 30

    // Page limit compliance (20 points)
    if (totals.pages <= COMMERCIALIZATION_PAGE_LIMITS.total) {
      score += 20
    } else {
      riskFlags.push(`Page limit exceeded: ${totals.pages}/${COMMERCIALIZATION_PAGE_LIMITS.total} pages`)
    }

    // Section balance (20 points)
    SECTION_CONFIGS.forEach(config => {
      const sectionData = data[config.key] as Record<string, unknown> || {}
      const sectionWords = countWords(String(sectionData.ai_narrative || ''))
      const pages = wordsToPages(sectionWords)
      if (pages > config.pageRange.max) {
        weaknesses.push(`${config.heading.split('.')[0]}: Over page limit`)
      } else if (pages < config.pageRange.min && sectionWords > 0) {
        weaknesses.push(`${config.heading.split('.')[0]}: Under recommended length`)
      }
    })
    score += Math.max(0, 20 - weaknesses.length * 3)

    // Phase IIB specific checks
    if (isPhase2B) {
      const financeData = data.section5_finance as Record<string, unknown> || {}
      if (!financeData.investor_commitments) {
        riskFlags.push('Phase IIB: Missing investor documentation')
      }
      if (!financeData.matching_funds_phase2b) {
        riskFlags.push('Phase IIB: Missing matching funds information')
      }
    }

    return {
      score: Math.round(Math.min(100, Math.max(0, score))),
      riskFlags,
      weaknesses
    }
  }, [data, totals, isPhase2B])

  const updateSection = (sectionKey: string, updates: Record<string, unknown>) => {
    const currentSection = (data as Record<string, unknown>)[sectionKey] as Record<string, unknown> || {}
    onUpdate({
      m9_commercialization: {
        ...data,
        [sectionKey]: { ...currentSection, ...updates },
        validation_score: validationResult.score,
        risk_flags: validationResult.riskFlags,
        section_weaknesses: validationResult.weaknesses,
        total_word_count: totals.words,
        page_count: totals.pages
      }
    })
  }

  const handleExport = (format: 'word' | 'pdf') => {
    // Generate document content
    let content = ''
    SECTION_CONFIGS.forEach(config => {
      const sectionData = data[config.key] as Record<string, unknown> || {}
      content += `\n\n${config.heading}\n\n`
      content += String(sectionData.ai_narrative || '[No content]')
    })

    // Create downloadable file
    const blob = new Blob([content], { type: format === 'word' ? 'application/msword' : 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `commercialization_plan.${format === 'word' ? 'doc' : 'txt'}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-neutral-900 mb-2">Commercialization Director</h2>
        <p className="text-sm text-neutral-600">
          NIH-required commercialization plan for {grantType} applications. Maximum 12 pages.
        </p>
        {isFastTrack && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            Fast Track: Integrate Phase I outcomes into your commercialization narrative.
          </div>
        )}
        {isPhase2B && (
          <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded text-sm text-purple-800">
            Phase IIB: Enhanced validation required. Include investor documentation and regulatory readiness.
          </div>
        )}
      </div>

      {/* Page Counter */}
      <div className="mb-6 p-4 bg-neutral-50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-neutral-900">Document Summary</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('word')}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              <Download className="w-4 h-4" /> Word
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-neutral-600 text-white rounded hover:bg-neutral-700"
            >
              <FileText className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="p-3 bg-white rounded border">
            <p className="text-xs text-neutral-500 mb-1">Total Pages</p>
            <p className={`text-2xl font-bold ${totals.pages > 12 ? 'text-red-600' : 'text-neutral-900'}`}>
              {totals.pages} / 12
            </p>
          </div>
          <div className="p-3 bg-white rounded border">
            <p className="text-xs text-neutral-500 mb-1">Word Count</p>
            <p className="text-2xl font-bold text-neutral-900">{totals.words.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-white rounded border">
            <p className="text-xs text-neutral-500 mb-1">Sections Approved</p>
            <p className="text-2xl font-bold text-neutral-900">{totals.approvedSections} / 6</p>
          </div>
          <div className="p-3 bg-white rounded border">
            <p className="text-xs text-neutral-500 mb-1">Strength Score</p>
            <p className={`text-2xl font-bold ${validationResult.score >= 70 ? 'text-green-600' : validationResult.score >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
              {validationResult.score}
            </p>
          </div>
        </div>

        {totals.pages > 12 && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4" />
            Page limit exceeded. Use the "Compress" button in each section to reduce content.
          </div>
        )}
      </div>

      {/* Validation Results */}
      {(validationResult.riskFlags.length > 0 || validationResult.weaknesses.length > 0) && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Validation Findings
          </h4>
          {validationResult.riskFlags.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-red-700 mb-1">Risk Flags:</p>
              <ul className="text-sm text-red-700 list-disc list-inside">
                {validationResult.riskFlags.map((flag, i) => <li key={i}>{flag}</li>)}
              </ul>
            </div>
          )}
          {validationResult.weaknesses.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-700 mb-1">Section Weaknesses:</p>
              <ul className="text-sm text-amber-700 list-disc list-inside">
                {validationResult.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Sections */}
      {SECTION_CONFIGS.map(config => (
        <SectionEditor
          key={config.key}
          config={config}
          data={(data[config.key] as Record<string, unknown>) || {}}
          onUpdate={updates => updateSection(config.key, updates)}
          grantType={grantType}
          isPhase2B={isPhase2B}
        />
      ))}
    </div>
  )
}
