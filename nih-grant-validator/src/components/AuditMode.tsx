import { useState, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { 
  Upload, FileText, CheckCircle, XCircle, AlertTriangle, 
  Download, Sparkles, ChevronDown, ChevronUp, ArrowLeft,
  FileCheck, AlertCircle, Info, Users, DollarSign, Briefcase, 
  ClipboardList, Loader2, Plus, Trash2, File, Type, X
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dvuhtfzsvcacyrlfettz.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dWh0ZnpzdmNhY3lybGZldHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDk3OTYsImV4cCI6MjA4NTIyNTc5Nn0.vUtnPXeQrzU0kO0E7qK2qJtZ_RCqnXCEFSa60adHld0'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

type Mechanism = 'Phase I' | 'Phase II' | 'Direct-to-Phase II' | 'Fast Track' | 'Phase IIB'
type DocumentType = 'specific_aims' | 'research_strategy' | 'budget' | 'commercialization_plan' | 'biosketches' | 'letters_of_support' | 'milestones'

interface UploadedFile {
  id: string
  file: File
  fileName: string
  content: string
  audit?: DocumentAuditResult
  isAuditing?: boolean
}

interface DocumentAuditResult {
  score: number
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  [key: string]: unknown
}

interface DocumentCategory {
  type: DocumentType
  label: string
  description: string
  required: Mechanism[]
  recommended: Mechanism[]
  multiFile: boolean
  maxFiles: number
  files: UploadedFile[]
  inputMode: 'upload' | 'paste'
  pastedText: string
}

interface PackageAuditResult {
  success: boolean
  mechanism: string
  audit: {
    overallScores: {
      structural: number
      scientific: number
      budget: number
      commercialization: number
      consistency: number
      weighted_total: number
    }
    reviewerSimulation: {
      scientific: { overallImpression: string; strengths: string[]; weaknesses: string[]; score: number; recommendedScore: string }
      commercialization: { overallImpression: string; strengths: string[]; weaknesses: string[]; score: number }
      budget: { overallImpression: string; concerns: string[]; recommendations: string[] }
    }
    validationResults: Record<string, { score: number; findings: { issue: string; severity: string; location: string }[] }>
    conditionalDetection: Record<string, { detected: boolean; details: string }>
  }
  suggestions?: {
    prioritized_improvements: { priority: number; area: string; issue: string; suggestion: string; impact: string }[]
    quick_wins: string[]
    major_revisions: string[]
    reviewer_tips: string[]
  }
}

const MECHANISMS: { value: Mechanism; label: string; description: string }[] = [
  { value: 'Phase I', label: 'Phase I', description: 'Feasibility study (up to $275K)' },
  { value: 'Phase II', label: 'Phase II', description: 'Full R&D (up to $1.75M)' },
  { value: 'Direct-to-Phase II', label: 'Direct-to-Phase II', description: 'Skip Phase I with feasibility data' },
  { value: 'Fast Track', label: 'Fast Track', description: 'Combined Phase I + II' },
  { value: 'Phase IIB', label: 'Phase IIB', description: 'Bridge funding for commercialization' },
]

const createInitialCategories = (): DocumentCategory[] => [
  { type: 'specific_aims', label: 'Specific Aims', description: '1-page summary of aims and goals', required: ['Phase I', 'Phase II', 'Direct-to-Phase II', 'Fast Track', 'Phase IIB'], recommended: [], multiFile: false, maxFiles: 1, files: [], inputMode: 'upload', pastedText: '' },
  { type: 'research_strategy', label: 'Research Strategy', description: 'Significance, Innovation, Approach sections', required: ['Phase I', 'Phase II', 'Direct-to-Phase II', 'Fast Track', 'Phase IIB'], recommended: [], multiFile: false, maxFiles: 1, files: [], inputMode: 'upload', pastedText: '' },
  { type: 'budget', label: 'Budget', description: 'Detailed budget and justification', required: ['Phase II', 'Direct-to-Phase II', 'Fast Track', 'Phase IIB'], recommended: ['Phase I'], multiFile: false, maxFiles: 1, files: [], inputMode: 'upload', pastedText: '' },
  { type: 'commercialization_plan', label: 'Commercialization Plan', description: 'NIH 12-page commercialization plan', required: ['Phase II', 'Direct-to-Phase II', 'Fast Track', 'Phase IIB'], recommended: [], multiFile: false, maxFiles: 1, files: [], inputMode: 'upload', pastedText: '' },
  { type: 'biosketches', label: 'Biosketches', description: 'Key personnel biosketches (PI, Co-I, etc.)', required: [], recommended: ['Phase I', 'Phase II', 'Direct-to-Phase II', 'Fast Track', 'Phase IIB'], multiFile: true, maxFiles: 10, files: [], inputMode: 'upload', pastedText: '' },
  { type: 'letters_of_support', label: 'Letters of Support', description: 'Collaborator and partner letters', required: [], recommended: ['Phase I', 'Phase II', 'Direct-to-Phase II', 'Fast Track', 'Phase IIB'], multiFile: true, maxFiles: 15, files: [], inputMode: 'upload', pastedText: '' },
  { type: 'milestones', label: 'Milestones', description: 'Project milestones and timeline', required: ['Fast Track'], recommended: ['Phase II', 'Direct-to-Phase II', 'Phase IIB'], multiFile: false, maxFiles: 1, files: [], inputMode: 'upload', pastedText: '' },
]

interface AuditModeProps {
  onBack: () => void
}

export function AuditMode({ onBack }: AuditModeProps) {
  const [mechanism, setMechanism] = useState<Mechanism | null>(null)
  const [categories, setCategories] = useState<DocumentCategory[]>(createInitialCategories())
  const [isProcessing, setIsProcessing] = useState(false)
  const [packageAudit, setPackageAudit] = useState<PackageAuditResult | null>(null)
  const [activeTab, setActiveTab] = useState<'individual' | 'package'>('individual')
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set())
  const [parsingFile, setParsingFile] = useState<string | null>(null)
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false)
  const extractionCancelledRef = useRef(false)
  const [extractionTimedOut, setExtractionTimedOut] = useState(false)

  const setInputMode = (categoryType: DocumentType, mode: 'upload' | 'paste') => {
    setCategories(prev => prev.map(cat => 
      cat.type === categoryType ? { ...cat, inputMode: mode } : cat
    ))
  }

  const setPastedText = (categoryType: DocumentType, text: string) => {
    setCategories(prev => prev.map(cat =>
      cat.type === categoryType ? { ...cat, pastedText: text } : cat
    ))
  }

  const addPastedDocument = (categoryType: DocumentType) => {
    const cat = categories.find(c => c.type === categoryType)
    if (!cat || !cat.pastedText.trim()) return
    
    const newFile: UploadedFile = {
      id: `${categoryType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file: new File([cat.pastedText], `pasted_${cat.label.toLowerCase().replace(/\s+/g, '_')}.txt`),
      fileName: `Pasted Text (${cat.pastedText.length.toLocaleString()} chars)`,
      content: cat.pastedText
    }

    setCategories(prev => prev.map(c => {
      if (c.type !== categoryType) return c
      if (c.multiFile) {
        if (c.files.length >= c.maxFiles) return c
        return { ...c, files: [...c.files, newFile], pastedText: '' }
      } else {
        return { ...c, files: [newFile], pastedText: '' }
      }
    }))
  }

  const cancelExtraction = () => {
    extractionCancelledRef.current = true
    setParsingFile(null)
  }

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''
    const maxPages = Math.min(pdf.numPages, 50) // Limit to 50 pages
    for (let i = 1; i <= maxPages; i++) {
      if (extractionCancelledRef.current) throw new Error('cancelled')
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item) => ('str' in item ? item.str : '')).join(' ')
      fullText += pageText + '\n\n'
    }
    return fullText.trim()
  }

  const extractTextFromDOCX = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  }

  const handleFileUpload = useCallback(async (categoryType: DocumentType, file: File) => {
    // Check file size (warn if > 5MB)
    if (file.size > 5 * 1024 * 1024) {
      if (!confirm(`${file.name} is ${(file.size / 1024 / 1024).toFixed(1)}MB. Large files may take longer to process. Continue?`)) {
        return
      }
    }

    extractionCancelledRef.current = false
    setExtractionTimedOut(false)
    setParsingFile(file.name)
    
    try {
      let content = ''
      
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 30000)
      })
      
      const extractionPromise = (async () => {
        if (file.name.toLowerCase().endsWith('.pdf')) {
          return await extractTextFromPDF(file)
        } else if (file.name.toLowerCase().endsWith('.docx')) {
          return await extractTextFromDOCX(file)
        } else {
          return await file.text()
        }
      })()
      
      content = await Promise.race([extractionPromise, timeoutPromise])

      if (extractionCancelledRef.current) return

      if (!content || content.trim().length === 0) {
        alert(`Could not extract text from ${file.name}. Try pasting text instead.`)
        setInputMode(categoryType, 'paste')
        return
      }

      const newFile: UploadedFile = {
        id: `${categoryType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        fileName: file.name,
        content
      }

      setCategories(prev => prev.map(cat => {
        if (cat.type !== categoryType) return cat
        if (cat.multiFile) {
          if (cat.files.length >= cat.maxFiles) {
            alert(`Maximum ${cat.maxFiles} files allowed for ${cat.label}`)
            return cat
          }
          return { ...cat, files: [...cat.files, newFile] }
        } else {
          return { ...cat, files: [newFile] }
        }
      }))
    } catch (error: any) {
      if (error?.message === 'cancelled') return
      if (error?.message === 'timeout') {
        setExtractionTimedOut(true)
        setInputMode(categoryType, 'paste')
        alert('Extraction timed out (30s). Please paste your text manually.')
        return
      }
      console.error('Error parsing file:', error)
      alert(`Error parsing ${file.name}. Try pasting text instead.`)
      setInputMode(categoryType, 'paste')
    } finally {
      setParsingFile(null)
    }
  }, [])

  const removeFile = useCallback((categoryType: DocumentType, fileId: string) => {
    setCategories(prev => prev.map(cat => {
      if (cat.type !== categoryType) return cat
      return { ...cat, files: cat.files.filter(f => f.id !== fileId) }
    }))
  }, [])

  const auditSingleDocument = async (categoryType: DocumentType, fileId: string) => {
    const category = categories.find(c => c.type === categoryType)
    const file = category?.files.find(f => f.id === fileId)
    if (!file || !mechanism) return

    setCategories(prev => prev.map(cat => {
      if (cat.type !== categoryType) return cat
      return {
        ...cat,
        files: cat.files.map(f => f.id === fileId ? { ...f, isAuditing: true } : f)
      }
    }))

    try {
      const { data, error } = await supabase.functions.invoke('audit-document', {
        body: { documentType: categoryType, documentContent: file.content, fileName: file.fileName, mechanism }
      })

      if (error) throw error

      setCategories(prev => prev.map(cat => {
        if (cat.type !== categoryType) return cat
        return {
          ...cat,
          files: cat.files.map(f => f.id === fileId ? { ...f, audit: data.audit, isAuditing: false } : f)
        }
      }))
    } catch (err) {
      console.error('Audit error:', err)
      setCategories(prev => prev.map(cat => {
        if (cat.type !== categoryType) return cat
        return {
          ...cat,
          files: cat.files.map(f => f.id === fileId ? { ...f, isAuditing: false } : f)
        }
      }))
    }
  }

  const runFullAudit = async () => {
    if (!mechanism) return
    setIsProcessing(true)

    // First, audit all individual documents that haven't been audited
    for (const category of categories) {
      for (const file of category.files) {
        if (!file.audit) {
          await auditSingleDocument(category.type, file.id)
        }
      }
    }

    // Then run package-level audit
    try {
      const documentsObj: Record<string, string> = {}
      categories.forEach(cat => {
        if (cat.files.length > 0) {
          if (cat.multiFile) {
            documentsObj[cat.type] = cat.files.map((f, i) => `[${f.fileName}]\n${f.content}`).join('\n\n---\n\n')
          } else {
            documentsObj[cat.type] = cat.files[0].content
          }
        }
      })

      const { data, error } = await supabase.functions.invoke('audit-grant', {
        body: { documents: documentsObj, mechanism, generateSuggestions: false }
      })

      if (error) throw error
      setPackageAudit(data)
      setActiveTab('package')
    } catch (err) {
      console.error('Package audit error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const generateSuggestions = async () => {
    if (!mechanism) return
    setGeneratingSuggestions(true)

    try {
      const documentsObj: Record<string, string> = {}
      categories.forEach(cat => {
        if (cat.files.length > 0) {
          if (cat.multiFile) {
            documentsObj[cat.type] = cat.files.map(f => `[${f.fileName}]\n${f.content}`).join('\n\n---\n\n')
          } else {
            documentsObj[cat.type] = cat.files[0].content
          }
        }
      })

      const { data, error } = await supabase.functions.invoke('audit-grant', {
        body: { documents: documentsObj, mechanism, generateSuggestions: true }
      })

      if (error) throw error
      setPackageAudit(data)
    } catch (err) {
      console.error('Suggestions error:', err)
    } finally {
      setGeneratingSuggestions(false)
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

  const totalFiles = categories.reduce((sum, cat) => sum + cat.files.length, 0)
  const auditedFiles = categories.reduce((sum, cat) => sum + cat.files.filter(f => f.audit).length, 0)

  const toggleDocExpand = (id: string) => {
    setExpandedDocs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }

  const exportReport = () => {
    if (!packageAudit) return
    let report = `NIH SBIR/STTR GRANT AUDIT REPORT\n${'='.repeat(40)}\nMechanism: ${packageAudit.mechanism}\nGenerated: ${new Date().toLocaleString()}\n\n`
    
    report += `INDIVIDUAL DOCUMENT AUDITS\n${'-'.repeat(30)}\n`
    categories.forEach(cat => {
      if (cat.files.length === 0) return
      report += `\n${cat.label.toUpperCase()}\n`
      cat.files.forEach(f => {
        if (f.audit) {
          report += `  ${f.fileName}: ${f.audit.score}/100\n`
          if (f.audit.strengths?.length) report += `    Strengths: ${f.audit.strengths.join('; ')}\n`
          if (f.audit.weaknesses?.length) report += `    Weaknesses: ${f.audit.weaknesses.join('; ')}\n`
        }
      })
    })

    report += `\nPACKAGE AUDIT\n${'-'.repeat(30)}\n`
    report += `Weighted Total: ${packageAudit.audit.overallScores.weighted_total}/100\n`
    report += `  Structural: ${packageAudit.audit.overallScores.structural}/100\n`
    report += `  Scientific: ${packageAudit.audit.overallScores.scientific}/100\n`
    report += `  Budget: ${packageAudit.audit.overallScores.budget}/100\n`
    report += `  Commercialization: ${packageAudit.audit.overallScores.commercialization}/100\n`
    report += `  Consistency: ${packageAudit.audit.overallScores.consistency}/100\n`

    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nih-audit-${mechanism?.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetAudit = () => {
    setCategories(createInitialCategories())
    setPackageAudit(null)
    setMechanism(null)
    setActiveTab('individual')
  }

  return (
    <div className="min-h-screen bg-neutral-50">
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
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Advisory Pre-Submission Audit - Not an NIH Official Review</p>
            <p className="text-sm text-amber-700 mt-1">This tool provides guidance for grant improvement. Results do not guarantee funding outcomes.</p>
          </div>
        </div>

        {!packageAudit ? (
          <div className="space-y-6">
            {/* Mechanism Selection */}
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

            {/* Document Upload */}
            {mechanism && (
              <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary-500 text-white rounded-full text-sm flex items-center justify-center">2</span>
                  Upload Documents
                </h2>

                {/* Status Summary */}
                <div className="mb-6 p-4 bg-neutral-50 rounded-lg">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {categories.map(cat => {
                      const hasFiles = cat.files.length > 0
                      const isRequired = cat.required.includes(mechanism)
                      const isRecommended = cat.recommended.includes(mechanism)
                      let statusClass = 'bg-neutral-100 text-neutral-500 border-neutral-200'
                      if (hasFiles) statusClass = 'bg-green-100 text-green-700 border-green-200'
                      else if (isRequired) statusClass = 'bg-red-100 text-red-700 border-red-200'
                      else if (isRecommended) statusClass = 'bg-yellow-100 text-yellow-700 border-yellow-200'
                      
                      return (
                        <span key={cat.type} className={`px-3 py-1 text-xs font-medium rounded-full border ${statusClass}`}>
                          {hasFiles && <CheckCircle className="w-3 h-3 inline mr-1" />}
                          {!hasFiles && isRequired && <XCircle className="w-3 h-3 inline mr-1" />}
                          {cat.label} {cat.multiFile && cat.files.length > 0 && `(${cat.files.length})`}
                        </span>
                      )
                    })}
                  </div>
                  <div className="flex gap-4 text-xs text-neutral-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> Present</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> Required Missing</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> Recommended</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {categories.map(cat => {
                    const isRequired = cat.required.includes(mechanism)
                    const isRecommended = cat.recommended.includes(mechanism)
                    const hasFiles = cat.files.length > 0

                    return (
                      <div key={cat.type} className={`p-4 rounded-lg border ${hasFiles ? 'border-green-200 bg-green-50' : isRequired ? 'border-red-200 bg-red-50' : 'border-neutral-200'}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-neutral-900 flex items-center gap-2">
                              {cat.label}
                              {isRequired && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required</span>}
                              {isRecommended && !isRequired && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Recommended</span>}
                              {cat.multiFile && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Multiple Files</span>}
                            </p>
                            <p className="text-sm text-neutral-500">{cat.description}</p>
                          </div>
                        </div>

                        {/* Uploaded Files List */}
                        {cat.files.length > 0 && (
                          <div className="mb-3 space-y-2">
                            {cat.files.map(f => (
                              <div key={f.id} className="flex items-center gap-3 p-2 bg-white rounded border border-neutral-200">
                                <File className="w-4 h-4 text-neutral-400" />
                                <span className="flex-1 text-sm text-neutral-700 truncate">{f.fileName}</span>
                                <span className="text-xs text-neutral-400">{Math.round(f.content.length / 1000)}K</span>
                                {f.audit && (
                                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${getScoreBg(f.audit.score)} text-white`}>
                                    {f.audit.score}
                                  </span>
                                )}
                                {f.isAuditing && <Loader2 className="w-4 h-4 animate-spin text-primary-500" />}
                                {!f.audit && !f.isAuditing && (
                                  <button
                                    onClick={() => auditSingleDocument(cat.type, f.id)}
                                    className="text-xs text-primary-600 hover:text-primary-800"
                                  >
                                    Audit
                                  </button>
                                )}
                                <button onClick={() => removeFile(cat.type, f.id)} className="text-red-400 hover:text-red-600">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Upload Button */}
                        {(cat.multiFile ? cat.files.length < cat.maxFiles : cat.files.length === 0) && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setInputMode(cat.type, 'upload')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                  cat.inputMode === 'upload' ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                }`}
                              >
                                <Upload className="w-3.5 h-3.5" /> Upload File
                              </button>
                              <button
                                onClick={() => setInputMode(cat.type, 'paste')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                  cat.inputMode === 'paste' ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                }`}
                              >
                                <Type className="w-3.5 h-3.5" /> Paste Text
                              </button>
                            </div>

                            {cat.inputMode === 'upload' ? (
                              <label className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                                parsingFile ? 'border-primary-300 bg-primary-50' : 'border-neutral-300 hover:border-primary-400 hover:bg-primary-50'
                              }`}>
                                {parsingFile ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <div className="flex items-center gap-2">
                                      <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                                      <span className="text-sm text-primary-600">Extracting {parsingFile}...</span>
                                    </div>
                                    <button
                                      onClick={(e) => { e.preventDefault(); cancelExtraction(); }}
                                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                                    >
                                      <X className="w-3 h-3" /> Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    {cat.multiFile && cat.files.length > 0 ? <Plus className="w-4 h-4 text-neutral-400" /> : <Upload className="w-4 h-4 text-neutral-400" />}
                                    <span className="text-sm text-neutral-500">
                                      {cat.multiFile && cat.files.length > 0 ? `Add Another ${cat.label.replace(/s$/, '')}` : 'Upload PDF, DOCX, or TXT'}
                                    </span>
                                    <input
                                      type="file"
                                      accept=".pdf,.docx,.txt,.md"
                                      className="hidden"
                                      onChange={(e) => e.target.files?.[0] && handleFileUpload(cat.type, e.target.files[0])}
                                    />
                                  </>
                                )}
                              </label>
                            ) : (
                              <div className="space-y-2">
                                <textarea
                                  value={cat.pastedText}
                                  onChange={(e) => setPastedText(cat.type, e.target.value)}
                                  placeholder="Paste your document text here..."
                                  className="w-full h-40 p-3 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-400 resize-y"
                                />
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-neutral-400">
                                    {cat.pastedText.length.toLocaleString()} characters
                                  </span>
                                  <button
                                    onClick={() => addPastedDocument(cat.type)}
                                    disabled={!cat.pastedText.trim()}
                                    className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Add Document
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Run Audit Button */}
            {mechanism && totalFiles > 0 && (
              <button
                onClick={runFullAudit}
                disabled={isProcessing}
                className="w-full px-6 py-4 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Auditing Documents ({auditedFiles}/{totalFiles})...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-5 h-5" />
                    Run Full Audit ({totalFiles} documents)
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          /* Results View */
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-2 flex gap-2">
              <button
                onClick={() => setActiveTab('individual')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'individual' ? 'bg-primary-500 text-white' : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Individual Document Audits
              </button>
              <button
                onClick={() => setActiveTab('package')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeTab === 'package' ? 'bg-primary-500 text-white' : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                Package Audit
              </button>
            </div>

            {activeTab === 'individual' ? (
              /* Individual Document Audits */
              <div className="space-y-4">
                {/* Summary Table */}
                <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
                  <h3 className="font-semibold text-neutral-900 mb-4">Document Scores Summary</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-200">
                          <th className="text-left py-2 px-3 font-medium text-neutral-600">Document</th>
                          <th className="text-left py-2 px-3 font-medium text-neutral-600">File</th>
                          <th className="text-center py-2 px-3 font-medium text-neutral-600">Score</th>
                          <th className="text-left py-2 px-3 font-medium text-neutral-600">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categories.filter(c => c.files.length > 0).flatMap(cat =>
                          cat.files.map(f => (
                            <tr key={f.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                              <td className="py-2 px-3 font-medium">{cat.label}</td>
                              <td className="py-2 px-3 text-neutral-600 truncate max-w-[200px]">{f.fileName}</td>
                              <td className="py-2 px-3 text-center">
                                {f.audit ? (
                                  <span className={`font-bold ${getScoreColor(f.audit.score)}`}>{f.audit.score}</span>
                                ) : (
                                  <span className="text-neutral-400">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                {f.audit ? (
                                  <span className="text-green-600 text-xs">Audited</span>
                                ) : f.isAuditing ? (
                                  <span className="text-primary-600 text-xs">Auditing...</span>
                                ) : (
                                  <span className="text-neutral-400 text-xs">Pending</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Expandable Document Details */}
                {categories.filter(c => c.files.length > 0).map(cat =>
                  cat.files.filter(f => f.audit).map(f => (
                    <div key={f.id} className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
                      <button
                        onClick={() => toggleDocExpand(f.id)}
                        className="w-full px-6 py-4 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-neutral-400" />
                          <div className="text-left">
                            <p className="font-medium text-neutral-900">{f.fileName}</p>
                            <p className="text-xs text-neutral-500">{cat.label}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-2xl font-bold ${getScoreColor(f.audit!.score)}`}>{f.audit!.score}</span>
                          {expandedDocs.has(f.id) ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </button>
                      {expandedDocs.has(f.id) && (
                        <div className="p-6 space-y-4">
                          {f.audit!.strengths?.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-green-700 mb-2">Strengths</h4>
                              <ul className="space-y-1">
                                {f.audit!.strengths.map((s, i) => (
                                  <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {f.audit!.weaknesses?.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-red-700 mb-2">Weaknesses</h4>
                              <ul className="space-y-1">
                                {f.audit!.weaknesses.map((w, i) => (
                                  <li key={i} className="text-sm text-red-800 flex items-start gap-2">
                                    <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{w}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {f.audit!.suggestions?.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-blue-700 mb-2">Suggestions</h4>
                              <ul className="space-y-1">
                                {f.audit!.suggestions.map((s, i) => (
                                  <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />{s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Package Audit */
              <div className="space-y-6">
                {/* Overall Score Card */}
                <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-neutral-900">Package Audit Results</h2>
                      <p className="text-neutral-500">{packageAudit.mechanism} Application</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-4xl font-bold ${getScoreColor(packageAudit.audit.overallScores.weighted_total)}`}>
                        {packageAudit.audit.overallScores.weighted_total}
                      </div>
                      <p className="text-sm text-neutral-500">Weighted Score</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-4">
                    {[
                      { key: 'structural', label: 'Structural', weight: '25%', icon: ClipboardList },
                      { key: 'scientific', label: 'Scientific', weight: '30%', icon: FileText },
                      { key: 'budget', label: 'Budget', weight: '15%', icon: DollarSign },
                      { key: 'commercialization', label: 'Commercial', weight: '20%', icon: Briefcase },
                      { key: 'consistency', label: 'Consistency', weight: '10%', icon: CheckCircle },
                    ].map(item => {
                      const score = packageAudit.audit.overallScores[item.key as keyof typeof packageAudit.audit.overallScores] as number
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

                {/* Reviewer Simulation */}
                <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
                  <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Reviewer Simulation
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-blue-900">Scientific Reviewer</h4>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          packageAudit.audit.reviewerSimulation.scientific.score <= 3 ? 'bg-green-100 text-green-800' :
                          packageAudit.audit.reviewerSimulation.scientific.score <= 5 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {packageAudit.audit.reviewerSimulation.scientific.score}/9 ({packageAudit.audit.reviewerSimulation.scientific.recommendedScore})
                        </span>
                      </div>
                      <p className="text-sm text-blue-800">{packageAudit.audit.reviewerSimulation.scientific.overallImpression}</p>
                    </div>

                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-purple-900">Commercialization Reviewer</h4>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          packageAudit.audit.reviewerSimulation.commercialization.score <= 3 ? 'bg-green-100 text-green-800' :
                          packageAudit.audit.reviewerSimulation.commercialization.score <= 5 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {packageAudit.audit.reviewerSimulation.commercialization.score}/9
                        </span>
                      </div>
                      <p className="text-sm text-purple-800">{packageAudit.audit.reviewerSimulation.commercialization.overallImpression}</p>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-900 mb-2">Budget Reviewer</h4>
                      <p className="text-sm text-green-800">{packageAudit.audit.reviewerSimulation.budget.overallImpression}</p>
                    </div>
                  </div>
                </div>

                {/* Suggestions */}
                {packageAudit.suggestions && (
                  <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
                    <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      AI Improvement Suggestions
                    </h3>
                    <div className="space-y-3">
                      {packageAudit.suggestions.prioritized_improvements.slice(0, 5).map((item, i) => (
                        <div key={i} className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                          <div className="flex items-start gap-3">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                              item.impact === 'high' ? 'bg-red-500' : item.impact === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                            }`}>{item.priority}</span>
                            <div className="flex-1">
                              <p className="font-medium text-neutral-800 text-sm">{item.area}: {item.issue}</p>
                              <p className="text-xs text-neutral-600 mt-1">{item.suggestion}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {!packageAudit.suggestions && (
                <button
                  onClick={generateSuggestions}
                  disabled={generatingSuggestions}
                  className="flex-1 px-6 py-3 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generatingSuggestions ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {generatingSuggestions ? 'Generating...' : 'Generate AI Suggestions'}
                </button>
              )}
              <button onClick={exportReport} className="flex-1 px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center gap-2">
                <Download className="w-5 h-5" />
                Download Report
              </button>
              <button onClick={resetAudit} className="flex-1 px-6 py-3 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-100 transition-colors">
                Start New Audit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
