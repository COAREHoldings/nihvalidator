import { useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { 
  Upload, FileText, CheckCircle, XCircle, AlertTriangle, 
  Download, Sparkles, ChevronDown, ChevronUp, ArrowLeft,
  FileCheck, AlertCircle, Info, Users, DollarSign, Briefcase, ClipboardList, Loader2
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dvuhtfzsvcacyrlfettz.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dWh0ZnpzdmNhY3lybGZldHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDk3OTYsImV4cCI6MjA4NTIyNTc5Nn0.vUtnPXeQrzU0kO0E7qK2qJtZ_RCqnXCEFSa60adHld0'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

type Mechanism = 'Phase I' | 'Phase II' | 'Direct-to-Phase II' | 'Fast Track' | 'Phase IIB'
type DocumentType = 'specific_aims' | 'research_strategy' | 'budget' | 'commercialization_plan' | 'biosketches' | 'letters_of_support' | 'milestones'
type DocumentStatus = 'present' | 'missing' | 'incomplete'

interface DocumentInfo {
  type: DocumentType
  label: string
  description: string
  required: Mechanism[]
  recommended: Mechanism[]
  file?: File
  content?: string
  status?: DocumentStatus
}

interface AuditResult {
  success: boolean
  mechanism: string
  requirements: {
    required: string[]
    recommended: string[]
    conditional: Record<string, string[]>
  }
  audit: {
    documentStatus: Record<string, { status: DocumentStatus; issues: string[] }>
    parsedSections: {
      title?: string
      aims?: string[]
      hypothesis?: string
      significance?: string
      innovation?: string
      approach?: string
      timeline?: string
      budget_total?: string
      team?: string[]
    }
    conditionalDetection: Record<string, { detected: boolean; details: string }>
    validationResults: {
      structural: { score: number; findings: { issue: string; severity: string; location: string }[] }
      scientific: { score: number; findings: { issue: string; severity: string; location: string }[]; hypothesisClarity: number; methodologicalRigor: number; statisticalApproach: number }
      budget: { score: number; findings: { issue: string; severity: string; location: string }[]; justificationQuality: number }
      commercialization: { score: number; findings: { issue: string; severity: string; location: string }[]; marketAnalysis: number; ipStrategy: number; revenueModel: number }
      consistency: { score: number; findings: { issue: string; severity: string; location: string }[] }
    }
    reviewerSimulation: {
      scientific: { overallImpression: string; strengths: string[]; weaknesses: string[]; score: number; recommendedScore: string }
      commercialization: { overallImpression: string; strengths: string[]; weaknesses: string[]; score: number }
      budget: { overallImpression: string; concerns: string[]; recommendations: string[] }
    }
    overallScores: {
      structural: number
      scientific: number
      budget: number
      commercialization: number
      consistency: number
      weighted_total: number
    }
  }
  suggestions?: {
    prioritized_improvements: { priority: number; area: string; issue: string; suggestion: string; impact: string }[]
    quick_wins: string[]
    major_revisions: string[]
    reviewer_tips: string[]
  }
  disclaimer: string
  timestamp: string
}

const DOCUMENT_TYPES: DocumentInfo[] = [
  { type: 'specific_aims', label: 'Specific Aims', description: '1-page summary of aims and goals', required: ['Phase I', 'Phase II', 'Direct-to-Phase II', 'Fast Track', 'Phase IIB'], recommended: [] },
  { type: 'research_strategy', label: 'Research Strategy', description: 'Significance, Innovation, Approach sections', required: ['Phase I', 'Phase II', 'Direct-to-Phase II', 'Fast Track', 'Phase IIB'], recommended: [] },
  { type: 'budget', label: 'Budget', description: 'Detailed budget and justification', required: ['Phase II', 'Direct-to-Phase II', 'Fast Track', 'Phase IIB'], recommended: ['Phase I'] },
  { type: 'commercialization_plan', label: 'Commercialization Plan', description: 'NIH 12-page commercialization plan', required: ['Phase II', 'Direct-to-Phase II', 'Fast Track', 'Phase IIB'], recommended: [] },
  { type: 'biosketches', label: 'Biosketches', description: 'Key personnel biosketches', required: [], recommended: ['Phase I', 'Phase II', 'Direct-to-Phase II', 'Fast Track', 'Phase IIB'] },
  { type: 'letters_of_support', label: 'Letters of Support', description: 'Collaborator and partner letters', required: [], recommended: ['Phase I', 'Phase II', 'Direct-to-Phase II', 'Fast Track', 'Phase IIB'] },
  { type: 'milestones', label: 'Milestones', description: 'Project milestones and timeline', required: ['Fast Track'], recommended: ['Phase II', 'Direct-to-Phase II', 'Phase IIB'] },
]

const MECHANISMS: { value: Mechanism; label: string; description: string }[] = [
  { value: 'Phase I', label: 'Phase I', description: 'Feasibility study (up to $275K)' },
  { value: 'Phase II', label: 'Phase II', description: 'Full R&D (up to $1.75M)' },
  { value: 'Direct-to-Phase II', label: 'Direct-to-Phase II', description: 'Skip Phase I with feasibility data' },
  { value: 'Fast Track', label: 'Fast Track', description: 'Combined Phase I + II' },
  { value: 'Phase IIB', label: 'Phase IIB', description: 'Bridge funding for commercialization' },
]

interface AuditModeProps {
  onBack: () => void
}

export function AuditMode({ onBack }: AuditModeProps) {
  const [mechanism, setMechanism] = useState<Mechanism | null>(null)
  const [documents, setDocuments] = useState<Map<DocumentType, DocumentInfo>>(new Map())
  const [isProcessing, setIsProcessing] = useState(false)
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['scores', 'documents']))
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false)
  const [parsingFile, setParsingFile] = useState<string | null>(null)

  // Extract text from PDF using pdf.js
  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
      fullText += pageText + '\n\n'
    }
    
    return fullText.trim()
  }

  // Extract text from DOCX using mammoth
  const extractTextFromDOCX = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  }

  const handleFileUpload = useCallback(async (docType: DocumentType, file: File) => {
    setParsingFile(file.name)
    
    try {
      let content = ''
      
      if (file.name.toLowerCase().endsWith('.pdf')) {
        content = await extractTextFromPDF(file)
      } else if (file.name.toLowerCase().endsWith('.docx')) {
        content = await extractTextFromDOCX(file)
      } else if (file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.md')) {
        content = await file.text()
      } else {
        // Try to read as text for other formats
        content = await file.text()
      }
      
      if (!content || content.trim().length === 0) {
        alert(`Could not extract text from ${file.name}. Please ensure the file contains readable text.`)
        return
      }
      
      const docInfo = DOCUMENT_TYPES.find(d => d.type === docType)!
      setDocuments(prev => new Map(prev).set(docType, { ...docInfo, file, content, status: 'present' }))
    } catch (error) {
      console.error('Error parsing file:', error)
      alert(`Error parsing ${file.name}. Please try a different file format or ensure the file is not corrupted.`)
    } finally {
      setParsingFile(null)
    }
  }, [])

  const removeDocument = useCallback((docType: DocumentType) => {
    setDocuments(prev => {
      const newMap = new Map(prev)
      newMap.delete(docType)
      return newMap
    })
  }, [])

  const runAudit = async () => {
    if (!mechanism || documents.size === 0) return

    setIsProcessing(true)
    try {
      const documentsObj: Record<string, string> = {}
      documents.forEach((doc, type) => {
        if (doc.content) {
          documentsObj[type] = doc.content
        }
      })

      const { data, error } = await supabase.functions.invoke('audit-grant', {
        body: { documents: documentsObj, mechanism, generateSuggestions: false }
      })

      if (error) throw error
      setAuditResult(data)
    } catch (err) {
      console.error('Audit error:', err)
      alert('Failed to run audit. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const generateSuggestions = async () => {
    if (!mechanism || documents.size === 0) return

    setGeneratingSuggestions(true)
    try {
      const documentsObj: Record<string, string> = {}
      documents.forEach((doc, type) => {
        if (doc.content) {
          documentsObj[type] = doc.content
        }
      })

      const { data, error } = await supabase.functions.invoke('audit-grant', {
        body: { documents: documentsObj, mechanism, generateSuggestions: true }
      })

      if (error) throw error
      setAuditResult(data)
    } catch (err) {
      console.error('Suggestions error:', err)
    } finally {
      setGeneratingSuggestions(false)
    }
  }

  const exportReport = () => {
    if (!auditResult) return

    const report = `
NIH SBIR/STTR GRANT AUDIT REPORT
================================
ADVISORY PRE-SUBMISSION AUDIT - NOT AN OFFICIAL NIH REVIEW
Generated: ${new Date().toLocaleString()}
Mechanism: ${auditResult.mechanism}

OVERALL SCORES
--------------
Weighted Total: ${auditResult.audit.overallScores.weighted_total}/100
  - Structural Completeness (25%): ${auditResult.audit.overallScores.structural}/100
  - Scientific Rigor (30%): ${auditResult.audit.overallScores.scientific}/100
  - Budget Compliance (15%): ${auditResult.audit.overallScores.budget}/100
  - Commercialization (20%): ${auditResult.audit.overallScores.commercialization}/100
  - Cross-module Consistency (10%): ${auditResult.audit.overallScores.consistency}/100

DOCUMENT STATUS
---------------
${Object.entries(auditResult.audit.documentStatus).map(([doc, info]) => 
  `${doc}: ${info.status.toUpperCase()}${info.issues.length > 0 ? '\n  Issues: ' + info.issues.join(', ') : ''}`
).join('\n')}

REVIEWER SIMULATION
-------------------
Scientific Reviewer:
${auditResult.audit.reviewerSimulation.scientific.overallImpression}
Score: ${auditResult.audit.reviewerSimulation.scientific.score}/9 (${auditResult.audit.reviewerSimulation.scientific.recommendedScore})
Strengths:
${auditResult.audit.reviewerSimulation.scientific.strengths.map(s => `  - ${s}`).join('\n')}
Weaknesses:
${auditResult.audit.reviewerSimulation.scientific.weaknesses.map(w => `  - ${w}`).join('\n')}

Commercialization Reviewer:
${auditResult.audit.reviewerSimulation.commercialization.overallImpression}
Score: ${auditResult.audit.reviewerSimulation.commercialization.score}/9

Budget Reviewer:
${auditResult.audit.reviewerSimulation.budget.overallImpression}
Concerns:
${auditResult.audit.reviewerSimulation.budget.concerns.map(c => `  - ${c}`).join('\n')}

VALIDATION FINDINGS
-------------------
Structural Issues:
${auditResult.audit.validationResults.structural.findings.map(f => `  [${f.severity.toUpperCase()}] ${f.location}: ${f.issue}`).join('\n') || '  None found'}

Scientific Issues:
${auditResult.audit.validationResults.scientific.findings.map(f => `  [${f.severity.toUpperCase()}] ${f.location}: ${f.issue}`).join('\n') || '  None found'}

Budget Issues:
${auditResult.audit.validationResults.budget.findings.map(f => `  [${f.severity.toUpperCase()}] ${f.location}: ${f.issue}`).join('\n') || '  None found'}

Commercialization Issues:
${auditResult.audit.validationResults.commercialization.findings.map(f => `  [${f.severity.toUpperCase()}] ${f.location}: ${f.issue}`).join('\n') || '  None found'}

Consistency Issues:
${auditResult.audit.validationResults.consistency.findings.map(f => `  [${f.severity.toUpperCase()}] ${f.location}: ${f.issue}`).join('\n') || '  None found'}

${auditResult.suggestions ? `
IMPROVEMENT SUGGESTIONS
-----------------------
Priority Improvements:
${auditResult.suggestions.prioritized_improvements.map(i => `  ${i.priority}. [${i.impact.toUpperCase()}] ${i.area}: ${i.issue}\n     Suggestion: ${i.suggestion}`).join('\n\n')}

Quick Wins:
${auditResult.suggestions.quick_wins.map(q => `  - ${q}`).join('\n')}

Major Revisions Needed:
${auditResult.suggestions.major_revisions.map(m => `  - ${m}`).join('\n')}

Reviewer Tips:
${auditResult.suggestions.reviewer_tips.map(t => `  - ${t}`).join('\n')}
` : ''}

CONDITIONAL REQUIREMENTS DETECTED
---------------------------------
${Object.entries(auditResult.audit.conditionalDetection).map(([cond, info]) => 
  `${cond.replace(/_/g, ' ')}: ${info.detected ? 'YES - ' + info.details : 'Not detected'}`
).join('\n')}

---
DISCLAIMER: ${auditResult.disclaimer}
`

    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nih-audit-${mechanism?.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }

  const getStatusColor = (status: DocumentStatus | undefined) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800 border-green-200'
      case 'incomplete': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'missing': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-neutral-100 text-neutral-600 border-neutral-200'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200 h-16 flex items-center px-4 md:px-6">
        <button onClick={onBack} className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mr-4">
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Back</span>
        </button>
        <h1 className="text-lg font-semibold text-neutral-900">Grant Audit Engine</h1>
        <div className="ml-auto">
          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
            Advisory Pre-Submission Audit
          </span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Disclaimer Banner */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Advisory Pre-Submission Audit - Not an NIH Official Review</p>
            <p className="text-sm text-amber-700 mt-1">This tool provides guidance for grant improvement. Results do not guarantee funding outcomes.</p>
          </div>
        </div>

        {!auditResult ? (
          <div className="space-y-6">
            {/* Step 1: Mechanism Selection */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-primary-500 text-white rounded-full text-sm flex items-center justify-center">1</span>
                Select Grant Mechanism
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {MECHANISMS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setMechanism(m.value)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      mechanism === m.value
                        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                        : 'border-neutral-200 hover:border-primary-300 hover:bg-neutral-50'
                    }`}
                  >
                    <p className="font-medium text-neutral-900">{m.label}</p>
                    <p className="text-sm text-neutral-500 mt-1">{m.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Document Upload */}
            {mechanism && (
              <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary-500 text-white rounded-full text-sm flex items-center justify-center">2</span>
                  Upload Documents
                </h2>
                
                {/* Document Status Panel */}
                <div className="mb-6 p-4 bg-neutral-50 rounded-lg">
                  <h3 className="text-sm font-medium text-neutral-700 mb-3">Document Status</h3>
                  <div className="flex flex-wrap gap-2">
                    {DOCUMENT_TYPES.map(doc => {
                      const uploaded = documents.has(doc.type)
                      const isRequired = doc.required.includes(mechanism)
                      const isRecommended = doc.recommended.includes(mechanism)
                      
                      let statusClass = 'bg-neutral-100 text-neutral-500 border-neutral-200'
                      if (uploaded) {
                        statusClass = 'bg-green-100 text-green-700 border-green-200'
                      } else if (isRequired) {
                        statusClass = 'bg-red-100 text-red-700 border-red-200'
                      } else if (isRecommended) {
                        statusClass = 'bg-yellow-100 text-yellow-700 border-yellow-200'
                      }
                      
                      return (
                        <span key={doc.type} className={`px-3 py-1 text-xs font-medium rounded-full border ${statusClass}`}>
                          {uploaded ? <CheckCircle className="w-3 h-3 inline mr-1" /> : isRequired ? <XCircle className="w-3 h-3 inline mr-1" /> : isRecommended ? <AlertTriangle className="w-3 h-3 inline mr-1" /> : null}
                          {doc.label}
                        </span>
                      )
                    })}
                  </div>
                  <div className="mt-3 flex gap-4 text-xs text-neutral-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> Present</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> Required Missing</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> Recommended</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {DOCUMENT_TYPES.map(doc => {
                    const isRequired = doc.required.includes(mechanism)
                    const isRecommended = doc.recommended.includes(mechanism)
                    const uploaded = documents.get(doc.type)
                    
                    return (
                      <div key={doc.type} className={`p-4 rounded-lg border ${uploaded ? 'border-green-200 bg-green-50' : isRequired ? 'border-red-200 bg-red-50' : 'border-neutral-200'}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-neutral-900 flex items-center gap-2">
                              {doc.label}
                              {isRequired && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required</span>}
                              {isRecommended && !isRequired && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Recommended</span>}
                            </p>
                            <p className="text-sm text-neutral-500">{doc.description}</p>
                          </div>
                          {uploaded && (
                            <button onClick={() => removeDocument(doc.type)} className="text-red-500 hover:text-red-700">
                              <XCircle className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                        
                        {uploaded ? (
                          <div className="flex items-center gap-2 text-sm text-green-700">
                            <FileText className="w-4 h-4" />
                            <span className="truncate">{uploaded.file?.name}</span>
                            <span className="text-xs text-green-600">({Math.round((uploaded.content?.length || 0) / 1000)}K chars)</span>
                          </div>
                        ) : parsingFile ? (
                          <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-primary-300 rounded-lg bg-primary-50">
                            <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                            <span className="text-sm text-primary-600">Extracting text from {parsingFile}...</span>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
                            <Upload className="w-4 h-4 text-neutral-400" />
                            <span className="text-sm text-neutral-500">Upload PDF, DOCX, or TXT</span>
                            <input
                              type="file"
                              accept=".pdf,.docx,.txt,.md"
                              className="hidden"
                              onChange={(e) => e.target.files?.[0] && handleFileUpload(doc.type, e.target.files[0])}
                            />
                          </label>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Run Audit Button */}
            {mechanism && documents.size > 0 && (
              <button
                onClick={runAudit}
                disabled={isProcessing}
                className="w-full px-6 py-4 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Running Comprehensive Audit...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-5 h-5" />
                    Run Grant Audit
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          /* Audit Results */
          <div className="space-y-6">
            {/* Overall Score Card */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900">Audit Results</h2>
                  <p className="text-neutral-500">{auditResult.mechanism} Application</p>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-bold ${getScoreColor(auditResult.audit.overallScores.weighted_total)}`}>
                    {auditResult.audit.overallScores.weighted_total}
                  </div>
                  <p className="text-sm text-neutral-500">Weighted Score</p>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-5 gap-4">
                {[
                  { key: 'structural', label: 'Structural', weight: '25%', icon: ClipboardList },
                  { key: 'scientific', label: 'Scientific', weight: '30%', icon: FileText },
                  { key: 'budget', label: 'Budget', weight: '15%', icon: DollarSign },
                  { key: 'commercialization', label: 'Commercial', weight: '20%', icon: Briefcase },
                  { key: 'consistency', label: 'Consistency', weight: '10%', icon: CheckCircle },
                ].map(item => {
                  const score = auditResult.audit.overallScores[item.key as keyof typeof auditResult.audit.overallScores] as number
                  return (
                    <div key={item.key} className="text-center">
                      <item.icon className={`w-6 h-6 mx-auto mb-2 ${getScoreColor(score)}`} />
                      <div className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</div>
                      <p className="text-xs text-neutral-500">{item.label}</p>
                      <p className="text-xs text-neutral-400">({item.weight})</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Document Status Section */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
              <button
                onClick={() => toggleSection('documents')}
                className="w-full px-6 py-4 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100 transition-colors"
              >
                <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Document Status
                </h3>
                {expandedSections.has('documents') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {expandedSections.has('documents') && (
                <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(auditResult.audit.documentStatus).map(([doc, info]) => (
                    <div key={doc} className={`p-3 rounded-lg border ${getStatusColor(info.status)}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {info.status === 'present' ? <CheckCircle className="w-4 h-4" /> : info.status === 'incomplete' ? <AlertTriangle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        <span className="font-medium text-sm">{doc.replace(/_/g, ' ')}</span>
                      </div>
                      {info.issues.length > 0 && (
                        <p className="text-xs mt-1">{info.issues[0]}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reviewer Simulation Section */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
              <button
                onClick={() => toggleSection('reviewers')}
                className="w-full px-6 py-4 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100 transition-colors"
              >
                <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Reviewer Simulation
                </h3>
                {expandedSections.has('reviewers') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {expandedSections.has('reviewers') && (
                <div className="p-6 space-y-6">
                  {/* Scientific Reviewer */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-blue-900">Scientific Reviewer</h4>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        auditResult.audit.reviewerSimulation.scientific.score <= 3 ? 'bg-green-100 text-green-800' :
                        auditResult.audit.reviewerSimulation.scientific.score <= 5 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        Score: {auditResult.audit.reviewerSimulation.scientific.score}/9 ({auditResult.audit.reviewerSimulation.scientific.recommendedScore})
                      </span>
                    </div>
                    <p className="text-sm text-blue-800 mb-3">{auditResult.audit.reviewerSimulation.scientific.overallImpression}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-green-700 mb-1">Strengths</p>
                        <ul className="text-xs text-green-800 space-y-1">
                          {auditResult.audit.reviewerSimulation.scientific.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-1"><CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-red-700 mb-1">Weaknesses</p>
                        <ul className="text-xs text-red-800 space-y-1">
                          {auditResult.audit.reviewerSimulation.scientific.weaknesses.map((w, i) => (
                            <li key={i} className="flex items-start gap-1"><XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Commercialization Reviewer */}
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-purple-900">Commercialization Reviewer</h4>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        auditResult.audit.reviewerSimulation.commercialization.score <= 3 ? 'bg-green-100 text-green-800' :
                        auditResult.audit.reviewerSimulation.commercialization.score <= 5 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        Score: {auditResult.audit.reviewerSimulation.commercialization.score}/9
                      </span>
                    </div>
                    <p className="text-sm text-purple-800 mb-3">{auditResult.audit.reviewerSimulation.commercialization.overallImpression}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-green-700 mb-1">Strengths</p>
                        <ul className="text-xs text-green-800 space-y-1">
                          {auditResult.audit.reviewerSimulation.commercialization.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-1"><CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-red-700 mb-1">Weaknesses</p>
                        <ul className="text-xs text-red-800 space-y-1">
                          {auditResult.audit.reviewerSimulation.commercialization.weaknesses.map((w, i) => (
                            <li key={i} className="flex items-start gap-1"><XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Budget Reviewer */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-3">Budget Reviewer</h4>
                    <p className="text-sm text-green-800 mb-3">{auditResult.audit.reviewerSimulation.budget.overallImpression}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-amber-700 mb-1">Concerns</p>
                        <ul className="text-xs text-amber-800 space-y-1">
                          {auditResult.audit.reviewerSimulation.budget.concerns.map((c, i) => (
                            <li key={i} className="flex items-start gap-1"><AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />{c}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-blue-700 mb-1">Recommendations</p>
                        <ul className="text-xs text-blue-800 space-y-1">
                          {auditResult.audit.reviewerSimulation.budget.recommendations.map((r, i) => (
                            <li key={i} className="flex items-start gap-1"><Info className="w-3 h-3 mt-0.5 flex-shrink-0" />{r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Validation Findings Section */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
              <button
                onClick={() => toggleSection('findings')}
                className="w-full px-6 py-4 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100 transition-colors"
              >
                <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Validation Findings
                </h3>
                {expandedSections.has('findings') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {expandedSections.has('findings') && (
                <div className="p-6 space-y-4">
                  {['structural', 'scientific', 'budget', 'commercialization', 'consistency'].map(category => {
                    const results = auditResult.audit.validationResults[category as keyof typeof auditResult.audit.validationResults]
                    if (!results?.findings?.length) return null
                    return (
                      <div key={category}>
                        <h4 className="font-medium text-neutral-800 capitalize mb-2">{category} Issues</h4>
                        <div className="space-y-2">
                          {results.findings.map((f, i) => (
                            <div key={i} className={`p-3 rounded-lg border ${
                              f.severity === 'critical' ? 'bg-red-50 border-red-200' :
                              f.severity === 'major' ? 'bg-amber-50 border-amber-200' :
                              'bg-blue-50 border-blue-200'
                            }`}>
                              <div className="flex items-start gap-2">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                  f.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                  f.severity === 'major' ? 'bg-amber-100 text-amber-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>{f.severity}</span>
                                <div>
                                  <p className="text-sm text-neutral-800">{f.issue}</p>
                                  <p className="text-xs text-neutral-500 mt-1">Location: {f.location}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Conditional Detection */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
              <button
                onClick={() => toggleSection('conditional')}
                className="w-full px-6 py-4 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100 transition-colors"
              >
                <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Conditional Requirements Detected
                </h3>
                {expandedSections.has('conditional') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {expandedSections.has('conditional') && (
                <div className="p-6 grid grid-cols-2 gap-4">
                  {Object.entries(auditResult.audit.conditionalDetection).map(([cond, info]) => (
                    <div key={cond} className={`p-4 rounded-lg border ${info.detected ? 'bg-amber-50 border-amber-200' : 'bg-neutral-50 border-neutral-200'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {info.detected ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : <CheckCircle className="w-5 h-5 text-neutral-400" />}
                        <span className="font-medium capitalize">{cond.replace(/_/g, ' ')}</span>
                      </div>
                      <p className="text-sm text-neutral-600">{info.detected ? info.details : 'Not detected in documents'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Suggestions Section */}
            {auditResult.suggestions && (
              <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
                <button
                  onClick={() => toggleSection('suggestions')}
                  className="w-full px-6 py-4 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100 transition-colors"
                >
                  <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    AI Improvement Suggestions
                  </h3>
                  {expandedSections.has('suggestions') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                {expandedSections.has('suggestions') && (
                  <div className="p-6 space-y-6">
                    <div>
                      <h4 className="font-medium text-neutral-800 mb-3">Priority Improvements</h4>
                      <div className="space-y-3">
                        {auditResult.suggestions.prioritized_improvements.map((item, i) => (
                          <div key={i} className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                            <div className="flex items-start gap-3">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                                item.impact === 'high' ? 'bg-red-500' : item.impact === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                              }`}>{item.priority}</span>
                              <div className="flex-1">
                                <p className="font-medium text-neutral-800">{item.area}: {item.issue}</p>
                                <p className="text-sm text-neutral-600 mt-1">{item.suggestion}</p>
                              </div>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                item.impact === 'high' ? 'bg-red-100 text-red-800' : item.impact === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                              }`}>{item.impact} impact</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {auditResult.suggestions.quick_wins.length > 0 && (
                      <div>
                        <h4 className="font-medium text-neutral-800 mb-2">Quick Wins</h4>
                        <ul className="space-y-1">
                          {auditResult.suggestions.quick_wins.map((w, i) => (
                            <li key={i} className="text-sm text-neutral-600 flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {auditResult.suggestions.reviewer_tips.length > 0 && (
                      <div>
                        <h4 className="font-medium text-neutral-800 mb-2">Reviewer Tips for {mechanism}</h4>
                        <ul className="space-y-1">
                          {auditResult.suggestions.reviewer_tips.map((t, i) => (
                            <li key={i} className="text-sm text-neutral-600 flex items-start gap-2">
                              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {!auditResult.suggestions && (
                <button
                  onClick={generateSuggestions}
                  disabled={generatingSuggestions}
                  className="flex-1 px-6 py-3 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generatingSuggestions ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating Suggestions...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate AI Suggestions
                    </>
                  )}
                </button>
              )}
              <button
                onClick={exportReport}
                className="flex-1 px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download Audit Report
              </button>
              <button
                onClick={() => { setAuditResult(null); setDocuments(new Map()); setMechanism(null) }}
                className="flex-1 px-6 py-3 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-100 transition-colors"
              >
                Start New Audit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
